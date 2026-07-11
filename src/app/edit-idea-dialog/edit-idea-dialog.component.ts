import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { Idea } from '../models/symbioTypes';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ImageService } from '../services/image.service';
import { CameraCaptureDialogComponent } from '../camera-capture-dialog/camera-capture-dialog.component';
import { Observable, forkJoin } from 'rxjs';
import { SymbiocreationService } from '../services/symbiocreation.service';

import { v4 as uuidv4 } from 'uuid';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-edit-idea-dialog',
    templateUrl: './edit-idea-dialog.component.html',
    styleUrls: ['./edit-idea-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EditIdeaDialogComponent implements OnInit {

  idea: Idea = {};
  selectedImgs: ImageSnippet[];
  isLoadingImageGeneration = false;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
    public dialogRef: MatDialogRef<EditIdeaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialog: MatDialog,
    private imageService: ImageService,
    private symbioService: SymbiocreationService,
    private _snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {
    if (this.data.idea) {
      this.idea = this.data.idea;

      const cloudinaryImages = this.idea.imgPublicIds?.map(publicId => this.imageService.getImage(publicId).format('auto').quality('auto'));
      this.idea.cloudinaryImages = cloudinaryImages;
    }
  }

  ngOnInit(): void {
    this.selectedImgs = [];
  }

  onOkClick(okButton: any) {
    // upload img to cloudinary
    okButton.disabled = true;
    okButton._elementRef.nativeElement.innerText = 'Cargando...';
    let observables: Observable<any>[] = [];

    // new images to be uploaded
    for (let img of this.selectedImgs) {
      observables.push(this.imageService.uploadImage(img.file));
    } 

    if (observables.length === 0) {
      this.dialogRef.close(this.idea);
      return;
    }

    forkJoin(observables).subscribe(
      res => {
        if (!this.idea.imgPublicIds) {
          this.idea.imgPublicIds = [];
        }

        for (let item of res) {
          this.idea.imgPublicIds.push(item.public_id);
        }
      },
      err => {
        console.log('error');
        console.error(err);
      },
      () => {
        console.log('complete');
        this.dialogRef.close(this.idea);
      }
    );
  }

  openCamera() {
    const dialogRef = this.dialog.open(CameraCaptureDialogComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    });

    dialogRef.afterClosed().subscribe(imgSnippet => {
      if (imgSnippet) {
        //console.log('Capture received!');
        //console.log(img);
        this.selectedImgs.push(imgSnippet);
      }
    });
  }

  generateImageWithLlm() {
    if (!this.idea.title?.trim().length || !this.idea.description?.trim().length) {
      this._snackBar.open(this.translate.instant('IDEA.AI_IMAGE_MISSING_FIELDS'), 'ok', {
        duration: 3000,
      });
      return;
    }

    this.isLoadingImageGeneration = true; // deshabilita el botón vía [disabled] y muestra el spinner

    this.symbioService.getImageForIdeaFromLlm(this.idea.title, this.idea.description)
      .subscribe({
        next: imgBlob => {
          const imgFileName = `img-generated-${uuidv4()}.png`;
          const imgUrl = URL.createObjectURL(imgBlob);
          const file = new File([imgBlob], imgFileName, { type: imgBlob.type });

          this.selectedImgs.push(new ImageSnippet(imgUrl, file));
          this.isLoadingImageGeneration = false;
        },
        error: err => {
          // I1: sin esto el botón quedaba deshabilitado y el spinner giraba para siempre.
          this.isLoadingImageGeneration = false;
          this._snackBar.open(this.imageErrorMessage(err), 'ok', {
            duration: 5000,
          });
        },
      });
  }

  // I2: mensaje según el estado HTTP que devuelve el backend.
  private imageErrorMessage(err: any): string {
    let key = 'IDEA.AI_IMAGE_ERROR'; // genérico (502 u otros)
    if (err?.status === 503) {
      key = 'IDEA.AI_IMAGE_ERROR_QUOTA';
    } else if (err?.status === 422) {
      key = 'IDEA.AI_IMAGE_ERROR_POLICY';
    }
    return this.translate.instant(key);
  }
  
  processFile(imageInput: any) {
    const file: File = imageInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (event: any) => {
      const newImgSnippet = new ImageSnippet(event.target.result, file);
      this.selectedImgs.push(newImgSnippet);
    };

    reader.readAsDataURL(file);
  }

  deletePublicId(index: number) {
    this.idea.imgPublicIds.splice(index, 1);
    this.idea.cloudinaryImages.splice(index, 1);
  }

  deleteSelectedImg(img: ImageSnippet) {
    const index = this.selectedImgs.indexOf(img);
    this.selectedImgs.splice(index, 1);
  }

  addExternalUrl(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    if (!this.idea.externalUrls) {
      this.idea.externalUrls = [];
    }

    // Add the new url
    if ((value || '').trim()) {
      this.idea.externalUrls.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeExternalUrl(url: string): void {
    const index = this.idea.externalUrls.indexOf(url);

    if (index >= 0) {
      this.idea.externalUrls.splice(index, 1);
    }
  }
}

class ImageSnippet {
  constructor(public src: string, public file: File) {}
}