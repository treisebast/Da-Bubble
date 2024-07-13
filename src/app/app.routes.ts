import { Routes } from '@angular/router';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { ImprintComponent } from './shared/imprint/imprint.component';
import { PrivacypolicyComponent } from './shared/privacypolicy/privacypolicy.component';
import { MainSignInComponent } from './pages/main-sign-in/main-sign-in.component';
import { SignInComponent } from './pages/main-sign-in/sign-in/sign-in.component';
import { SignUpComponent } from './pages/main-sign-in/sign-up/sign-up.component';
import { AvatarChoiceComponent } from './pages/main-sign-in/avatar-choice/avatar-choice.component';
import { TestingComponent } from './testing/testing.component';
import { ResetPasswordComponent } from './pages/main-sign-in/reset-password/reset-password.component';
import { ChangePasswordComponent } from './pages/main-sign-in/change-password/change-password.component';

export const routes: Routes = [
    {
        path: "",
        component: MainSignInComponent,
        children: [
            { path: "", component: SignInComponent }, // default child route
            { path: "signup", component: SignUpComponent },
            { path: "avatar", component: AvatarChoiceComponent },
            { path: "reset-password", component: ResetPasswordComponent },
            { path: "change-password", component: ChangePasswordComponent },
            { path: "imprint", component: ImprintComponent },
            { path: "privacy", component: PrivacypolicyComponent },
        ],
    },
    { path: "main", component: MainPageComponent },
    { path: "testing", component: TestingComponent},
    { path: "**", redirectTo: "" },
];
