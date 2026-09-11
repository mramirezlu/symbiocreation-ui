import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Symbiocreation, Participant, User } from '../models/symbioTypes';
import { SharedService } from '../services/shared.service';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { AnalyticsService } from '../services/analytics.service';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity';
import { FocusOn } from '@cloudinary/url-gen/qualifiers/focusOn';
import { UserService } from '../services/user.service';
import moment from 'moment';

@Component({
    selector: 'app-mi-perfil',
    templateUrl: './mi-perfil.component.html',
    styleUrls: ['./mi-perfil.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MiPerfilComponent implements OnInit {

    @ViewChild('cardsTrack') cardsTrack: ElementRef;

    appUser: User;
    score = 0;
    totalSymbiocreations = 0;
    totalIdeas = 0;
    totalGroupsAsAmbassador = 0;

    // Sección unificada "Explora Simbios": pestaña "Mis Simbios" (default) + ranking público.
    // 'mine' (Mis Simbios) | 'ideas' (Destacados) | 'new' (Nuevos) | 'collaborators' (Más colaborados)
    activeTab = 'mine';
    displayed: Symbiocreation[] = [];
    gridView = true;                 // "Mis Simbios": cuadrícula (cards) vs lista, como el Dashboard
    isModeratorList: boolean[] = []; // paralelo a displayed; lo usa la vista de lista
    loading = true;        // arranca cargando la pestaña "Mis Simbios"
    expanded = false;      // "Ver todos" → grilla vertical + paginador
    page = 0;
    publicTotal = 0;       // total del paginador para pestañas públicas (Mis Simbios usa totalSymbiocreations)
    searchName = '';       // buscador (solo pestañas públicas)
    startDate: moment.Moment | null = null; // filtro fecha desde (solo públicas)
    endDate: moment.Moment | null = null;   // filtro fecha hasta (solo públicas)

    get isMine(): boolean { return this.activeTab === 'mine'; }
    get pageSize(): number { return this.isMine ? 12 : 20; }
    get total(): number { return this.isMine ? this.totalSymbiocreations : this.publicTotal; }
    // La vista de lista solo aplica a "Mis Simbios" con la cuadrícula desactivada.
    get showList(): boolean { return this.isMine && !this.gridView; }

    constructor(
        public sharedService: SharedService,
        private symbioService: SymbiocreationService,
        private analyticsService: AnalyticsService,
        private imageService: ImageService,
        private userService: UserService,
        private router: Router,
    ) { }

    ngOnInit(): void {
        this.sharedService.appUser$.subscribe(appUser => {
            if (!appUser) return;
            this.appUser = appUser;
            this.gridView = appUser.isGridViewOn !== false; // default: cuadrícula (tarjetas)

            // KPIs: Puntaje, Total Simbiocreaciones, Total Ideas, Grupos como Embajador
            this.analyticsService.getCountsSummaryUser(appUser.id).subscribe(counts => {
                this.score = counts.score || 0;
                this.totalSymbiocreations = counts.symbiocreations || 0;
                this.totalIdeas = counts.ideas || 0;
                this.totalGroupsAsAmbassador = counts.groupsAsAmbassador || 0;
            });

            this.load(); // pestaña por defecto: "Mis Simbios"
        });
    }

    get displayName(): string {
        if (!this.appUser) return '';
        return this.appUser.firstName || (this.appUser.name ? this.appUser.name.split(' ')[0] : '');
    }

    // Carga la pestaña activa: "Mis Simbios" (propias, paginado por getMine) o ranking público (con buscador + fechas).
    load(): void {
        this.loading = true;

        if (this.isMine) {
            if (!this.appUser) { this.loading = false; return; }
            this.symbioService.getMySymbiocreations(this.appUser.id, this.page).subscribe({
                next: symbios => { this.setDisplayed(symbios); this.loading = false; },
                error: () => { this.loading = false; },
            });
            return;
        }

        const name = this.searchName?.trim() || undefined;
        const from = this.fromMillis();
        const to = this.toMillis();
        this.symbioService.countPublicSymbiocreations(name, from, to).subscribe(count => this.publicTotal = count || 0);
        this.symbioService.getPublicRankedSymbiocreations(this.activeTab, name, this.pageSize, from, to, this.page).subscribe({
            next: symbios => { this.setDisplayed(symbios); this.loading = false; },
            error: () => { this.loading = false; },
        });
    }

    private setDisplayed(symbios: Symbiocreation[]): void {
        this.displayed = symbios || [];
        this.displayed.forEach(s => {
            s.participantsToDisplay = this.getParticipantsToDisplay(s.participants);
            s.coverUrl = s.imgPublicId
                ? this.imageService.getImage(s.imgPublicId).format('auto').quality('auto').resize(fill().width(600).height(360)).toURL()
                : undefined;
        });
        // "Mis Simbios" puede mostrarse como lista (necesita saber en cuáles el usuario es moderador).
        this.isModeratorList = this.isMine ? this.buildIsModeratorList() : [];
    }

    // Marca, en paralelo a `displayed`, en qué simbios el usuario es moderador (para los badges/acciones de la lista).
    private buildIsModeratorList(): boolean[] {
        const email = this.appUser?.email;
        return this.displayed.map(s =>
            !!s.participants?.some(p => p.user?.email === email && p.isModerator));
    }

    // Toggle Cuadrícula/Lista (solo "Mis Simbios"); persiste la preferencia en el usuario, igual que el Dashboard.
    toggleViewMode(): void {
        this.gridView = !this.gridView;
        if (this.appUser) {
            this.appUser.isGridViewOn = this.gridView;
            this.userService.updateUser(this.appUser).subscribe();
        }
    }

    // Cambia de pestaña (vuelve a la primera página; el "Ver todos" expandido se conserva).
    setTab(tab: string): void {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.page = 0;
        this.load();
    }

    // Nueva búsqueda/filtro (solo pestañas públicas) → primera página.
    searchPublic(): void {
        this.page = 0;
        this.load();
    }

    onPage(event: any): void {
        this.page = event.pageIndex;
        this.load();
    }

    scrollCards(direction: number): void {
        const el = this.cardsTrack?.nativeElement;
        if (!el) return;
        el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: 'smooth' });
    }

    // Clic en el avatar de un participante → su perfil público (evita el enlace de la tarjeta a la simbio).
    goToProfile(p: Participant, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (p?.user?.id) this.router.navigate(['/perfil', p.user.id]);
    }

    // Filtro de fecha de creación como epoch millis (inicio/fin del día), o undefined si no está seteado.
    private fromMillis(): number | undefined {
        return this.startDate ? this.startDate.clone().startOf('day').valueOf() : undefined;
    }

    private toMillis(): number | undefined {
        return this.endDate ? this.endDate.clone().endOf('day').valueOf() : undefined;
    }

    // Limita la cantidad de caracteres para que las tarjetas no queden de distinto tamaño.
    truncate(text: string, max: number): string {
        if (!text) return '';
        return text.length > max ? text.substring(0, max).trim() + '…' : text;
    }

    getParticipantsToDisplay(participants: Participant[]): Participant[] {
        let selected: Participant[] = [];

        let i = 0;
        while (i < participants.length && selected.length < 5) {
            if (participants[i].isModerator && participants[i].user.pictureUrl) {
                participants[i].user.cloudinaryImage = this.getThumbnailFromUrl(participants[i].user.pictureUrl);
                selected.push(participants[i]);
            }
            i++;
        }

        i = 0;
        while (i < participants.length && selected.length < 5) {
            if (!participants[i].isModerator && participants[i].user.pictureUrl) {
                participants[i].user.cloudinaryImage = this.getThumbnailFromUrl(participants[i].user.pictureUrl);
                selected.push(participants[i]);
            }
            i++;
        }
        return selected;
    }

    getThumbnailFromUrl(url: string): CloudinaryImage {
        return this.imageService.getImage(url)
            .setDeliveryType('fetch')
            .format('auto')
            .resize(fill().width(90).height(90).gravity(focusOn(FocusOn.face())))
            .roundCorners(byRadius(50));
    }
}
