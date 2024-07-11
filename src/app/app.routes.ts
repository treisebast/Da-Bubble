import { Routes } from '@angular/router';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { ImprintComponent } from './shared/imprint/imprint.component';
import { PrivacypolicyComponent } from './shared/privacypolicy/privacypolicy.component';
import { MainSignInComponent } from './pages/main-sign-in/main-sign-in.component';
import { SignInComponent } from './pages/main-sign-in/sign-in/sign-in.component';
import { SignUpComponent } from './pages/main-sign-in/sign-up/sign-up.component';

export const routes: Routes = [
    {
        path: "",
        component: MainSignInComponent,
        children: [
            { path: "", component: SignInComponent }, // default child route
            { path: "signup", component: SignUpComponent },
            { path: "imprint", component: ImprintComponent },
            { path: "privacy", component: PrivacypolicyComponent },
        ],
    },
    { path: "main", component: MainPageComponent },
    { path: "**", redirectTo: "" },
];
