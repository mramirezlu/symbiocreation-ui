import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SharedService } from '../services/shared.service';

// Menú superior compartido de la intranet (Mi Perfil / Mis SymbioGames / Stats Generales),
// con la línea gráfica de Mi Perfil. Se usa en mi-perfil, my-onedots y stats-overview.
@Component({
    selector: 'app-intranet-menu',
    templateUrl: './intranet-menu.component.html',
    styleUrls: ['./intranet-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class IntranetMenuComponent {
    constructor(public sharedService: SharedService) { }
}
