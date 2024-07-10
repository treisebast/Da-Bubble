import { Routes } from '@angular/router';
import { FrontPageComponent } from './front-page/front-page.component';
import { MainContentComponent } from './main-content/main-content.component';

export const routes: Routes = [
    { path: '', component: FrontPageComponent},
    { path: '', component: MainContentComponent}
];
