import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Symbiocreation, Participant } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { SymbiocreationDetailComponent } from '../symbiocreation-detail/symbiocreation-detail.component';
import moment from 'moment';
import { SharedService } from '../services/shared.service';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity';
import { FocusOn } from '@cloudinary/url-gen/qualifiers/focusOn';

@Component({
    selector: 'app-explore',
    templateUrl: './explore.component.html',
    styleUrls: ['./explore.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ExploreComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;

  symbiocreations: Symbiocreation[] = [];
  totalCount: number;
  searchName: string = '';
  startDate: moment.Moment | null = null; // filtro: fecha de creación desde
  endDate: moment.Moment | null = null;   // filtro: fecha de creación hasta

  constructor(
    private symbioService: SymbiocreationService,
    private sharedService: SharedService,
    public dialog: MatDialog,
    private imageService: ImageService,
    private router: Router,
  ) { }

  // Clic en el avatar de un participante → su perfil público (evita el enlace de la tarjeta a la simbio).
  goToProfile(p: Participant, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (p?.user?.id) this.router.navigate(['/perfil', p.user.id]);
  }

  ngOnInit(): void {
    this.refresh();
  }

  // Nueva búsqueda / carga inicial: conteo + primera página de simbiocreaciones públicas.
  private refresh(): void {
    const name = this.sanitizeSearchName() || undefined;
    this.symbioService.countPublicSymbiocreations(name, this.fromMillis(), this.toMillis())
      .subscribe(count => this.totalCount = count);
    this.loadPage(0);
  }

  // Carga una página concreta de la lista de simbiocreaciones públicas (orden por fecha de creación desc en el backend).
  private loadPage(pageIndex: number): void {
    const name = this.sanitizeSearchName() || undefined;
    this.sharedService.nextIsLoading(true);
    this.symbiocreations = [];

    this.symbioService.getAllPublicSymbiocreations(pageIndex, name, this.fromMillis(), this.toMillis())
      .subscribe(
        symbios => {
          this.sharedService.nextIsLoading(false);
          this.symbiocreations = symbios;
          this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
        }
      );
  }

  // Filtro de fecha de creación como epoch millis (inicio/fin del día), o undefined si no está seteado.
  private fromMillis(): number | undefined {
    return this.startDate ? this.startDate.clone().startOf('day').valueOf() : undefined;
  }

  private toMillis(): number | undefined {
    return this.endDate ? this.endDate.clone().endOf('day').valueOf() : undefined;
  }

  openSymbioDetailDialog(s: Symbiocreation) {
    const dialogRef = this.dialog.open(SymbiocreationDetailComponent, {
      width: '600px',
      data: {
        symbio: s,
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  getParticipantsToDisplay(participants: Participant[]): Participant[] {
    let selected: Participant[] = [];

    // include moderators w picture
    let i = 0;

    while (i < participants.length && selected.length < 5) {
      if (participants[i].isModerator && participants[i].user.pictureUrl) {
        participants[i].user.cloudinaryImage = this.getThumbnailFromUrl(participants[i].user.pictureUrl);
        selected.push(participants[i]);
      }
      i++;
    }

    i = 0;
    // fill 5 spots w/ participants
    while (i < participants.length && selected.length < 5) {
      if (!participants[i].isModerator && participants[i].user.pictureUrl) {
        participants[i].user.cloudinaryImage = this.getThumbnailFromUrl(participants[i].user.pictureUrl);
        selected.push(participants[i]);
      }
      i++;
    }
    return selected;
  }

  computeNMoreSpanWidth(totalLength: number, diplayedLength: number): number {
    return totalLength - diplayedLength > 0 ? 50 : 0;
  }

  getThumbnailFromUrl(url: string): CloudinaryImage {
    return this.imageService.getImage(url)
              .setDeliveryType('fetch')
              .format('auto')
              .resize(fill().width(90).height(90).gravity(focusOn(FocusOn.face())))
              .roundCorners(byRadius(50));
  }

  getTimeAgo(lastModified: number): string {
    moment.locale('es');
    return moment(lastModified).fromNow();
  }

  // Limita la cantidad de caracteres para uniformar el tamaño de las tarjetas (igual que Mi Perfil/Frontpage).
  truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? text.substring(0, max).trim() + '…' : text;
  }

  private sanitizeSearchName(): string {
    if (!this.searchName) return '';
    return this.searchName.trim().substring(0, 50).replace(/[<>]/g, '');
  }

  search(): void {
    this.paginator.firstPage();
    this.refresh();
  }

  onPageFired(event) {
    this.loadPage(event.pageIndex);
  }

}
