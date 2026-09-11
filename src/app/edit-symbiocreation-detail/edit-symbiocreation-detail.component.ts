import { Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Symbiocreation } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { UntypedFormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith, concatMap, tap } from 'rxjs/operators';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';

@Component({
    selector: 'app-edit-symbiocreation-detail',
    templateUrl: './edit-symbiocreation-detail.component.html',
    styleUrls: ['./edit-symbiocreation-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EditSymbiocreationDetailComponent implements OnInit {

  symbio: Symbiocreation;
  isPrivate: boolean;

  eventDate: moment.Moment;
  eventTime: any;
  eventTz: any;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  sdgCtrl = new UntypedFormControl();
  filteredSDGs: Observable<string[]>;
  allSDGs: string[] = ['1 Fin de la pobreza', '2 Hambre cero', '3 Salud y bienestar', 
    '4 Educación de calidad', '5 Igualdad de género', '6 Agua limpia y saneamiento', 
    '7 Energía asequible y no contaminante', '8 Trabajo decente y crecimiento económico', '9 Industria, innovación e infraestructura',
    '10 Reducción de las desigualdades', '11 Ciudades y comunidades sostenibles', '12 Producción y consumos responsables',
    '13 Acción por el clima', '14 Vida submarina', '15 Vida de ecosistemas terrestres',
    '16 Paz, justicia e instituciones sólidas', '17 Alianzas para lograr los objetivos'];

  @ViewChild('sdgInput') sdgInput: ElementRef<HTMLInputElement>;

  selectedImg: ImageSnippet | null = null; // nueva portada elegida (aún sin subir)
  coverImage: CloudinaryImage | null = null; // portada ya guardada (para preview)

  constructor(
    private route: ActivatedRoute,
    public location: Location,
    private symbioService: SymbiocreationService,
    private _snackBar: MatSnackBar,
    private imageService: ImageService
  ) {
    this.filteredSDGs = this.sdgCtrl.valueChanges.pipe(
      startWith(null),
      map((sdg: string | null) => sdg ? this._filter(sdg) : this.allSDGs.slice()));
  }

  ngOnInit(): void {
    const idSymbio = this.route.snapshot.paramMap.get('id');

    this.symbioService.getSymbiocreation(idSymbio).subscribe(
      symbio => {
        this.symbio = symbio;

        if (symbio.dateTime) {
          this.eventDate = moment(symbio.dateTime).tz('UTC');

          if (symbio.hasStartTime) {
            this.eventTime = moment(symbio.dateTime).tz('UTC').format('HH:mm');
            this.eventTz = symbio.timeZone.slice(0, -9);
          }
        }

        if (symbio.imgPublicId) {
          this.coverImage = this.imageService.getImage(symbio.imgPublicId).format('auto').quality('auto');
        }

        this.isPrivate = symbio.visibility === 'private' ? true : false;
      }
    );

  }

  onSubmit() {
    this.symbio.visibility = this.isPrivate ? 'private' : 'public';

    if (this.eventDate) {
      this.symbio.dateTime = this.eventDate.toDate();
      
      if (this.symbio.hasStartTime) {
        // dateTime object: UTC + timezone string
        this.symbio.dateTime.setUTCHours(this.eventTime.split(':')[0]);
        this.symbio.dateTime.setUTCMinutes(this.eventTime.split(':')[1]);

        this.symbio.timeZone = this.eventTz.name;
      }
    }

    // Sube la nueva portada a Cloudinary (si se eligió) y luego guarda con su imgPublicId.
    const uploadCover$ = this.selectedImg
      ? this.imageService.uploadImage(this.selectedImg.file).pipe(tap((res: any) => this.symbio.imgPublicId = res.public_id))
      : of(null);

    uploadCover$.pipe(
      concatMap(() => this.symbioService.updateSymbiocreationInfo(this.symbio))
    ).subscribe(
      res =>  {
        this._snackBar.open('Se actualizó la simbiocreación.', 'ok', {
          duration: 2000,
        });
        this.location.back();
      }
    );

  }

  // Portada: lee el archivo elegido y lo deja listo para subir (preview con dataURL).
  processCoverFile(imageInput: any): void {
    const file: File = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.selectedImg = new ImageSnippet(event.target.result, file);
      this.coverImage = null; // se reemplaza la portada guardada por la nueva
    };
    reader.readAsDataURL(file);
  }

  removeCover(): void {
    this.selectedImg = null;
    this.coverImage = null;
    this.symbio.imgPublicId = undefined; // se omite en el PUT → backend lo pone null → portada quitada
  }

  addTag(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.symbio.tags.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    const index = this.symbio.tags.indexOf(tag);

    if (index >= 0) {
      this.symbio.tags.splice(index, 1);
    }
  }

  addExtraUrl(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.symbio.extraUrls.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeExtraUrl(url: string): void {
    const index = this.symbio.extraUrls.indexOf(url);

    if (index >= 0) {
      this.symbio.extraUrls.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.symbio.sdgs.push(event.option.viewValue);
    this.sdgInput.nativeElement.value = '';
    this.sdgCtrl.setValue(null);
  }

  removeSDG(sdg: string): void {
    const index = this.symbio.sdgs.indexOf(sdg);

    if (index >= 0) {
      this.symbio.sdgs.splice(index, 1);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allSDGs.filter(sdg => sdg.toLowerCase().indexOf(filterValue) >= 0);
  }

}

class ImageSnippet {
  constructor(public src: string, public file: File) {}
}
