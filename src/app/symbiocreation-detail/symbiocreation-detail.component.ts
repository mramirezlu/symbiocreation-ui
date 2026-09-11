import { Component, OnInit, Inject, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Symbiocreation } from '../models/symbioTypes';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { ImageService } from '../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fill } from '@cloudinary/url-gen/actions/resize';

import moment from 'moment-timezone';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { Router } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { map, startWith, concatMap } from 'rxjs/operators';

@Component({
    selector: 'app-symbiocreation-detail',
    templateUrl: './symbiocreation-detail.component.html',
    styleUrls: ['./symbiocreation-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SymbiocreationDetailComponent implements OnInit {

  editPlace: boolean;
  editDate: boolean;
  editTime: boolean;
  editDesc: boolean;
  editInfoUrl: boolean;
  editTags: boolean;
  editExtraUrls: boolean;
  editSDGs: boolean;

  eventDate: moment.Moment;
  eventTime: any;

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

  // Captura del canvas como portada (preview + confirmar)
  capturing = false;
  savingCover = false;
  previewSrc: string | null = null;
  private previewBlob: Blob | null = null;

  constructor(
    public dialogRef: MatDialogRef<SymbiocreationDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private symbioService: SymbiocreationService,
    private router: Router,
    private imageService: ImageService,
    private _snackBar: MatSnackBar,
  ) {
    this.filteredSDGs = this.sdgCtrl.valueChanges.pipe(
      startWith(null),
      map((sdg: string | null) => sdg ? this._filter(sdg) : this.allSDGs.slice()));
  }

  ngOnInit(): void {
    this.eventTime = '12:00';
  }

  // Portada actual para mostrar en el popup: la imagen de la simbio si existe, con la default como respaldo
  // (misma lógica que las tarjetas; también cae a la default si la portada no carga).
  get coverBg(): string {
    const def = 'url(/assets/images/Symbio_background4.jpg)';
    if (this.data.symbio?.imgPublicId) {
      const url = this.imageService.getImage(this.data.symbio.imgPublicId)
        .format('auto').quality('auto').resize(fill().width(600).height(300)).toURL();
      return `url(${url}), ${def}`;
    }
    return def;
  }

  editSymbiocreationInfo(symbio: Symbiocreation) {
    this.dialogRef.close();
    this.router.navigateByUrl(`/edit/${symbio.id}`);
  }

  // Captura el SVG del grafo (tal como se ve ahora) y genera un PNG para previsualizar.
  captureCover(): void {
    const svg = document.querySelector('app-graph svg') as SVGSVGElement | null;
    if (!svg) {
      this._snackBar.open('No se encontró el canvas para capturar.', 'ok', { duration: 3000 });
      return;
    }
    this.capturing = true;

    const rect = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    // Clon con tamaño explícito para que rasterice al tamaño visible.
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));

    const img = new Image();
    img.onload = () => {
      const scale = 2; // más nitidez
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // el SVG es transparente; damos fondo blanco a la portada
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob(blob => {
        this.previewBlob = blob;
        this.previewSrc = canvas.toDataURL('image/png');
        this.capturing = false;
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      this.capturing = false;
      this._snackBar.open('No se pudo generar la captura.', 'ok', { duration: 3000 });
    };
    img.src = svgUrl;
  }

  cancelCapture(): void {
    this.previewSrc = null;
    this.previewBlob = null;
  }

  // Sube la captura a Cloudinary y la guarda como portada de la simbiocreación.
  useAsCover(): void {
    if (!this.previewBlob) return;
    this.savingCover = true;

    const file = new File([this.previewBlob], `cover-${this.data.symbio.id}.png`, { type: 'image/png' });
    this.imageService.uploadImage(file).pipe(
      concatMap((res: any) => {
        this.data.symbio.imgPublicId = res.public_id;
        return this.symbioService.updateSymbiocreationInfo(this.data.symbio);
      })
    ).subscribe({
      next: () => {
        this.savingCover = false;
        this.previewSrc = null;
        this.previewBlob = null;
        this._snackBar.open('Portada actualizada.', 'ok', { duration: 2500 });
      },
      error: () => {
        this.savingCover = false;
        this._snackBar.open('No se pudo guardar la portada.', 'ok', { duration: 3000 });
      },
    });
  }

  saveGeneral() {
    this.symbioService.updateSymbiocreationInfo(this.data.symbio).subscribe();
    this.editPlace = false;
    this.editDesc = false;
    this.editInfoUrl = false;
    this.editTags = false;
    this.editExtraUrls = false;
    this.editSDGs = false;
  }

  saveDate() {
    let newDateTime = this.eventDate.toDate();
    newDateTime.setUTCHours((new Date(this.data.symbio.dateTime)).getUTCHours());
    newDateTime.setUTCMinutes((new Date(this.data.symbio.dateTime)).getUTCMinutes());

    this.data.symbio.dateTime = newDateTime;

    this.symbioService.updateSymbiocreationInfo(this.data.symbio).subscribe();
    this.editDate = false;
  }

  saveTime() {
    let newDateTime = new Date(this.data.symbio.dateTime);
    newDateTime.setUTCHours(this.eventTime.split(":")[0]);
    newDateTime.setUTCMinutes(this.eventTime.split(":")[1]);

    this.data.symbio.dateTime = newDateTime;

    this.symbioService.updateSymbiocreationInfo(this.data.symbio).subscribe();
    this.editTime = false;
  }

  addTag(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.data.symbio.tags.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    const index = this.data.symbio.tags.indexOf(tag);

    if (index >= 0) {
      this.data.symbio.tags.splice(index, 1);
    }
  }

  addExtraUrl(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.data.symbio.extraUrls.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeExtraUrl(url: string): void {
    const index = this.data.symbio.extraUrls.indexOf(url);

    if (index >= 0) {
      this.data.symbio.extraUrls.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.data.symbio.sdgs.push(event.option.viewValue);
    this.sdgInput.nativeElement.value = '';
    this.sdgCtrl.setValue(null);
  }

  removeSDG(sdg: string): void {
    const index = this.data.symbio.sdgs.indexOf(sdg);

    if (index >= 0) {
      this.data.symbio.sdgs.splice(index, 1);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allSDGs.filter(sdg => sdg.toLowerCase().indexOf(filterValue) >= 0);
  }

}
