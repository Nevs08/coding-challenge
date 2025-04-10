import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import de from '@angular/common/locales/de';

registerLocaleData(de);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: LOCALE_ID, useValue: 'de' },
    provideAnimationsAsync(), 
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: {
              50: '{slate.50}',
              100: '{slate.100}',
              200: '{slate.200}',
              300: '{slate.300}',
              400: '{slate.400}',
              500: '{slate.500}',
              600: '{slate.600}',
              700: '{slate.700}',
              800: '{slate.800}',
              900: '{slate.900}',
              950: '{slate.950}'
            },
            colorScheme: {
              light: {
                primary: {
                  color: '{slate.950}',
                  inverseColor: '#ffffff',
                  hoverColor: '{slate.900}',
                  activeColor: '{slate.800}'
                },
                highlight: {
                  background: '{slate.950}',
                  focusBackground: '{slate.700}',
                  color: '#ffffff',
                  focusColor: '#ffffff'
                }
              }
            }
          }
        }),
        options: {
          darkModeSelector: false
        }
      }
    })
  ]
};
