import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Registra el locale español para que el pipe `date` pueda formatear fechas en español (en-US ya viene por defecto).
registerLocaleData(localeEs, 'es');

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));
