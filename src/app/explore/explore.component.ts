import { Component, OnInit, ViewChild } from '@angular/core';
import { Symbiocreation, Participant } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { SymbiocreationDetailComponent } from '../symbiocreation-detail/symbiocreation-detail.component';
import * as moment from 'moment';
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
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;

  symbiocreations: Symbiocreation[] = [];
  filter: string = 'all';
  totalCount: number;
  searchName: string = '';

  constructor(
    private symbioService: SymbiocreationService,
    private sharedService: SharedService,
    public dialog: MatDialog,
    private imageService: ImageService,
  ) { }

  ngOnInit(): void {
    this.sharedService.nextIsLoading(true);
    this.symbioService.countPublicSymbiocreations()
      .subscribe(count => this.totalCount = count);
    this.symbioService.getAllPublicSymbiocreations(0)
      .subscribe(
        symbios => {
          this.sharedService.nextIsLoading(false);
          this.symbiocreations = symbios;
          this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
        }
      );
  }

  filterChanged() {
    this.symbiocreations = [];
    this.paginator.firstPage();
    const name = this.sanitizeSearchName() || undefined;

    switch(this.filter) {
      case "upcoming": {
        this.sharedService.nextIsLoading(true);
        this.symbioService.countUpcomingPublicSymbiocreations(name)
          .subscribe(count => this.totalCount = count);
        this.symbioService.getUpcomingPublicSymbiocreations(0, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      case "past": {
        this.sharedService.nextIsLoading(true);
        this.symbioService.countPastPublicSymbiocreations(name)
          .subscribe(count => this.totalCount = count);
        this.symbioService.getPastPublicSymbiocreations(0, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      case "all": {
        this.sharedService.nextIsLoading(true);
        this.symbioService.countPublicSymbiocreations(name)
          .subscribe(count => this.totalCount = count);
        this.symbioService.getAllPublicSymbiocreations(0, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      default: {
        console.log("Invalid choice");
        break;
     }
    }
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

  private sanitizeSearchName(): string {
    if (!this.searchName) return '';
    return this.searchName.trim().substring(0, 50).replace(/[<>]/g, '');
  }

  search(): void {
    this.paginator.firstPage();
    this.filterChanged();
  }

  onPageFired(event) {
    const name = this.sanitizeSearchName() || undefined;

    switch(this.filter) {
      case "upcoming": {
        this.sharedService.nextIsLoading(true);
        this.symbiocreations = [];
        this.symbioService.getUpcomingPublicSymbiocreations(event.pageIndex, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      case "past": {
        this.sharedService.nextIsLoading(true);
        this.symbiocreations = [];
        this.symbioService.getPastPublicSymbiocreations(event.pageIndex, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      case "all": {
        this.sharedService.nextIsLoading(true);
        this.symbiocreations = [];
        this.symbioService.getAllPublicSymbiocreations(event.pageIndex, name)
          .subscribe(
            symbios => {
              this.sharedService.nextIsLoading(false);
              this.symbiocreations = symbios;
              this.symbiocreations.forEach(symbio => symbio.participantsToDisplay = this.getParticipantsToDisplay(symbio.participants));
            }
          );
        break;
      }
      default: {
        console.log("Invalid choice");
        break;
     }
    }
  }

}
