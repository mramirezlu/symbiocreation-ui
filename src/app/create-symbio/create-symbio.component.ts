import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { UntypedFormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { Router } from '@angular/router';
import { Symbiocreation, Participant } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { concatMap } from 'rxjs/operators';
import { UserService } from '../services/user.service';

import * as moment from 'moment-timezone';
import { TZone } from 'moment-timezone-picker';

@Component({
  selector: 'app-create-symbio',
  templateUrl: './create-symbio.component.html',
  styleUrls: ['./create-symbio.component.scss']
})
export class CreateSymbioComponent implements OnInit {

  model: Symbiocreation;
  isPrivate: boolean;
  
  eventDate: moment.Moment;
  eventTime: any;
  eventTz: TZone;

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

  detailsOpened: boolean;

  constructor(
    private symbioService: SymbiocreationService,
    private userService: UserService,
    private auth: AuthService,
    private router: Router,
    public location: Location,
    private _snackBar: MatSnackBar
    ) {
      this.filteredSDGs = this.sdgCtrl.valueChanges.pipe(
        startWith(null),
        map((sdg: string | null) => sdg ? this._filter(sdg) : this.allSDGs.slice()));
    }

  ngOnInit(): void {
    this.model = { name: '', hasStartTime: false, enabled: true, participants: [], tags: [], extraUrls:[], sdgs: [] };
    this.isPrivate = false;

    this.eventTime = '12:00';

    this.detailsOpened = false;
  }

  onSubmit(): void {
    this.model.participants = [];
    this.model.graph = [];
    this.model.visibility = this.isPrivate ? 'private' : 'public';

    if (this.eventDate) {
      this.model.dateTime = this.eventDate.toDate();
      
      if (this.model.hasStartTime) {
        // dateTime object: UTC + timezone string
        this.model.dateTime.setUTCHours(this.eventTime.split(':')[0]);
        this.model.dateTime.setUTCMinutes(this.eventTime.split(':')[1]);

        this.model.timeZone = this.eventTz?.name || moment.tz.guess();
      }
    }
    
    // add creator as participant w role 'moderator'
    this.auth.userProfile$.pipe(
      concatMap(user => this.userService.getUserByEmail(user.email)),
      concatMap(u => {
        this.model.participants.push({u_id: u.id, user: u, isModerator: true} as Participant); // participant
        return this.symbioService.createSymbiocreation(this.model); // node is created in backend
      })
    ).subscribe(res => {
      this._snackBar.open('Se creó la simbiocreación.', 'ok', {
        duration: 2000,
      });
      this.router.navigate(['/symbiocreation', res.id]);
    });
  }

  addTag(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.model.tags.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    const index = this.model.tags.indexOf(tag);

    if (index >= 0) {
      this.model.tags.splice(index, 1);
    }
  }

  addExtraUrl(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.model.extraUrls.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeExtraUrl(url: string): void {
    const index = this.model.extraUrls.indexOf(url);

    if (index >= 0) {
      this.model.extraUrls.splice(index, 1);
    }
  }

  /*addSDG(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.model.sdgs.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }*/

  removeSDG(sdg: string): void {
    const index = this.model.sdgs.indexOf(sdg);

    if (index >= 0) {
      this.model.sdgs.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.model.sdgs.push(event.option.viewValue);
    this.sdgInput.nativeElement.value = '';
    this.sdgCtrl.setValue(null);
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allSDGs.filter(sdg => sdg.toLowerCase().indexOf(filterValue) >= 0);
  }

}
