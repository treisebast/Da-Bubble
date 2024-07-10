import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { routes } from './app.routes';
import { firebaseConfig } from './firebase.config';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getAnalytics, provideAnalytics, ScreenTrackingService } from '@angular/fire/analytics';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), provideFirebaseApp(() => initializeApp({"projectId":"dabubble-7412a","appId":"1:522018485270:web:c36608a9b37a84f0e27137","storageBucket":"dabubble-7412a.appspot.com","apiKey":"AIzaSyBPcnhnxoL7P8Uxe4Lx7MfIbG1upnGqQPQ","authDomain":"dabubble-7412a.firebaseapp.com","messagingSenderId":"522018485270"})), provideAnalytics(() => getAnalytics()), ScreenTrackingService, provideFirestore(() => getFirestore()), provideDatabase(() => getDatabase()), provideAnimationsAsync(), provideAnimationsAsync(),
  ]
};