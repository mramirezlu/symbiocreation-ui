import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Symbiocreation, Participant, User } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { UserService } from '../services/user.service';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity';
import { FocusOn } from '@cloudinary/url-gen/qualifiers/focusOn';

@Component({
    selector: 'app-public-profile',
    templateUrl: './public-profile.component.html',
    styleUrls: ['./public-profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PublicProfileComponent implements OnInit {

    @ViewChild('cardsTrack') cardsTrack: ElementRef;

    userId: string;
    user: User;
    headerAvatar: CloudinaryImage;
    symbios: Symbiocreation[] = [];
    total = 0;
    page = 0;
    pageSize = 12;
    loading = true;
    expanded = false; // "Ver todos" → grilla vertical + paginador

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private userService: UserService,
        private symbioService: SymbiocreationService,
        private imageService: ImageService,
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('userId');
            if (!id) return;
            this.userId = id;
            this.page = 0;
            this.load();
        });
    }

    private load(): void {
        this.userService.getUserPublic(this.userId).subscribe(u => {
            this.user = u;
            this.headerAvatar = u?.pictureUrl ? this.getAvatar(u.pictureUrl, 200) : null;
        });
        this.symbioService.countPublicSymbiosOfUser(this.userId).subscribe(c => this.total = c || 0);
        this.loadSymbios();
    }

    private loadSymbios(): void {
        this.loading = true;
        this.symbioService.getPublicSymbiosOfUser(this.userId, this.page).subscribe({
            next: symbios => {
                this.symbios = symbios || [];
                this.symbios.forEach(s => {
                    s.participantsToDisplay = this.getParticipantsToDisplay(s.participants);
                    s.coverUrl = s.imgPublicId
                        ? this.imageService.getImage(s.imgPublicId).format('auto').quality('auto').resize(fill().width(600).height(360)).toURL()
                        : undefined;
                });
                this.loading = false;
            },
            error: () => { this.loading = false; },
        });
    }

    get displayName(): string {
        if (!this.user) return '';
        const full = [this.user.firstName, this.user.lastName].filter(Boolean).join(' ').trim();
        return full || this.user.name || '';
    }

    onPage(event: any): void {
        this.page = event.pageIndex;
        this.loadSymbios();
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
        return this.getAvatar(url, 90);
    }

    private getAvatar(url: string, size: number): CloudinaryImage {
        return this.imageService.getImage(url)
            .setDeliveryType('fetch')
            .format('auto')
            .resize(fill().width(size).height(size).gravity(focusOn(FocusOn.face())))
            .roundCorners(byRadius(size));
    }
}
