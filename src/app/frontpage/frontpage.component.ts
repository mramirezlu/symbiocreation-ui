import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Symbiocreation, Participant } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity';
import { FocusOn } from '@cloudinary/url-gen/qualifiers/focusOn';
import { MatDialog } from '@angular/material/dialog';
import { SymbiocreationDetailComponent } from '../symbiocreation-detail/symbiocreation-detail.component';
import moment from 'moment';

@Component({
    selector: 'app-frontpage',
    templateUrl: './frontpage.component.html',
    styleUrls: ['./frontpage.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FrontpageComponent implements OnInit {

    @ViewChild('cardsTrack') cardsTrack: ElementRef;

    symbiocreations: Symbiocreation[] = [];
    searchName: string = '';
    activeSort: string = 'ideas'; // 'ideas' (Destacados) | 'new' (Nuevos) | 'collaborators' (Más colaborados)
    loading = false;
    expanded = false;       // "Ver todos" → grilla vertical + paginador (en vez de redirigir a Explora)
    page = 0;
    total = 0;              // total para el paginador (respeta buscador + rango de fecha)
    readonly pageSize = 20;
    startDate: moment.Moment | null = null; // filtro fecha de creación desde
    endDate: moment.Moment | null = null;   // filtro fecha de creación hasta

    constructor(
        public auth: AuthService,
        public sharedService: SharedService,
        private symbioService: SymbiocreationService,
        private imageService: ImageService,
        public dialog: MatDialog,
        private router: Router,
    ) { }

    // Clic en el avatar de un participante → su perfil público (evita el enlace de la tarjeta a la simbio).
    goToProfile(p: Participant, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (p?.user?.id) this.router.navigate(['/perfil', p.user.id]);
    }

    ngOnInit(): void {
        this.loadSymbios();
    }

    // Trae la página del ranking de públicas según el orden activo (Destacados/Nuevos/Más colaborados),
    // respetando buscador y rango de fecha; actualiza también el total para el paginador.
    private loadSymbios(): void {
        const name = this.searchName?.trim() || undefined;
        const from = this.fromMillis();
        const to = this.toMillis();
        this.loading = true;
        this.symbioService.countPublicSymbiocreations(name, from, to).subscribe(count => this.total = count || 0);
        this.symbioService.getPublicRankedSymbiocreations(this.activeSort, name, this.pageSize, from, to, this.page)
            .subscribe({
                next: symbios => {
                    this.symbiocreations = symbios;
                    this.symbiocreations.forEach(s => {
                        s.participantsToDisplay = this.getParticipantsToDisplay(s.participants);
                        s.coverUrl = this.coverUrlFor(s);
                    });
                    this.loading = false;
                },
                error: () => { this.loading = false; },
            });
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

    // Portada de la tarjeta: URL de Cloudinary si la simbio tiene imgPublicId, o undefined (usa el fondo por defecto).
    private coverUrlFor(s: Symbiocreation): string | undefined {
        return s.imgPublicId
            ? this.imageService.getImage(s.imgPublicId).format('auto').quality('auto').resize(fill().width(600).height(360)).toURL()
            : undefined;
    }

    setSort(sort: string): void {
        if (this.activeSort === sort) return;
        this.activeSort = sort;
        this.page = 0;
        this.loadSymbios();
    }

    // Nueva búsqueda / cambio de filtro de fecha → primera página.
    search(): void {
        this.page = 0;
        this.loadSymbios();
    }

    onPage(event: any): void {
        this.page = event.pageIndex;
        this.loadSymbios();
    }

    // Iniciales del usuario logueado (para el círculo del header).
    getInitials(profile: any): string {
        const name = (profile?.name || '').trim();
        if (!name) return '';
        const parts = name.split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    }

    scrollCards(direction: number): void {
        const el = this.cardsTrack?.nativeElement;
        if (!el) return;
        el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: 'smooth' });
    }

    // "Conoce la metodología": por ahora hace scroll a la sección de features (la página de Metodología vendrá luego).
    scrollToFeatures(): void {
        document.getElementById('fp-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // FrontPage → Login → Intranet: tras el login redirige al panel (no de vuelta al frontpage).
    login(): void {
        this.auth.login('/dashboard/my-symbios');
    }

    openSymbioDetailDialog(s: Symbiocreation) {
        this.dialog.open(SymbiocreationDetailComponent, { width: '600px', data: { symbio: s } });
    }

    getTimeAgo(lastModified: number): string {
        moment.locale('es');
        return moment(lastModified).fromNow();
    }

    // Locale para el pipe `date` según el idioma activo ('es' registrado; 'en-US' es el default de Angular).
    get dateLocale(): string {
        return (localStorage.getItem('lang') || 'es') === 'es' ? 'es' : 'en-US';
    }

    // ===== Reutilizado del Explore: avatares de participantes a mostrar =====
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

    computeNMoreSpanWidth(totalLength: number, displayedLength: number): number {
        return totalLength - displayedLength > 0 ? 50 : 0;
    }

    getThumbnailFromUrl(url: string): CloudinaryImage {
        return this.imageService.getImage(url)
            .setDeliveryType('fetch')
            .format('auto')
            .resize(fill().width(90).height(90).gravity(focusOn(FocusOn.face())))
            .roundCorners(byRadius(50));
    }
}
