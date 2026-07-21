import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard  {

  constructor(private auth: AuthService, private notification: NotificationService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean|UrlTree> | boolean {
    return this.auth.isAuthenticated$.pipe(
      tap(loggedIn => {
        if (!loggedIn) {
          this.auth.login(state.url); // redirect to guarded url
        }
      }),
      catchError(err => {
        // Auth0 falló al inicializar/validar. Se muestra un snackbar; el error queda visible en Network/consola.
        console.error('AuthGuard error', err);
        this.notification.showError('COMMON.ERROR_AUTH');
        return of(false);
      })
    );
  }

}
