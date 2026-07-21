import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {

    // Para no mostrar snackbars duplicados cuando una misma falla dispara varias suscripciones.
    private lastKey = '';
    private lastAt = 0;

    constructor(
        private snackBar: MatSnackBar,
        private translate: TranslateService,
    ) {}

    // Muestra un snackbar de error por 10s. El error crudo sigue visible en la pestaña Network
    // (siempre) y en la consola (el llamador debe hacer `console.error(err)`), para poder depurarlo luego.
    showError(messageKey: string = 'COMMON.ERROR_GENERIC'): void {
        const now = Date.now();
        if (messageKey === this.lastKey && now - this.lastAt < 1500) {
            return; // se ignora el duplicado inmediato de la misma cascada de error
        }
        this.lastKey = messageKey;
        this.lastAt = now;

        this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('COMMON.OK'), {
            duration: 10000,
        });
    }
}
