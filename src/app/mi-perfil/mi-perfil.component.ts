import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { SymbiocreationDetailComponent } from '../symbiocreation-detail/symbiocreation-detail.component';
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
    ideasCount = 0;
    collaborationsCount = 0;
    symbiocreations: Symbiocreation[] = [];

    constructor(
        public sharedService: SharedService,
        private symbioService: SymbiocreationService,
        private analyticsService: AnalyticsService,
        private imageService: ImageService,
        public dialog: MatDialog,
    ) { }

    ngOnInit(): void {
        this.sharedService.appUser$.subscribe(appUser => {
            if (!appUser) return;
            this.appUser = appUser;

            // KPIs (solo los 2 primeros: ideas creadas y colaboraciones)
            this.analyticsService.getCountsSummaryUser(appUser.id).subscribe(counts => {
                this.ideasCount = counts.ideas || 0;
                this.collaborationsCount = counts.symbiocreations || 0;
            });

            // Mis Simbios (sin filtros)
            this.symbioService.getMySymbiocreations(appUser.id, 0).subscribe(symbios => {
                this.symbiocreations = symbios || [];
                this.symbiocreations.forEach(s => s.participantsToDisplay = this.getParticipantsToDisplay(s.participants));
            });
        });
    }

    get displayName(): string {
        if (!this.appUser) return '';
        return this.appUser.firstName || (this.appUser.name ? this.appUser.name.split(' ')[0] : '');
    }

    scrollCards(direction: number): void {
        const el = this.cardsTrack?.nativeElement;
        if (!el) return;
        el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: 'smooth' });
    }

    openSymbioDetailDialog(s: Symbiocreation) {
        this.dialog.open(SymbiocreationDetailComponent, { width: '600px', data: { symbio: s } });
    }

    getTimeAgo(lastModified: number): string {
        moment.locale('es');
        return moment(lastModified).fromNow();
    }

    get dateLocale(): string {
        return (localStorage.getItem('lang') || 'es') === 'es' ? 'es' : 'en-US';
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
