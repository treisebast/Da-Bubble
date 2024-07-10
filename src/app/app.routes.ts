import { Routes } from '@angular/router';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { FrontPageComponent } from './front-page/front-page.component';

export const routes: Routes = [
    {path: "", component: FrontPageComponent},
    {path: "", component: MainPageComponent},
];
