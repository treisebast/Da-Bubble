import { Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { ImprintComponent } from './shared/imprint/imprint.component';
import { PrivacypolicyComponent } from './shared/privacypolicy/privacypolicy.component';
import { MainSignInComponent } from './main-sign-in/main-sign-in.component';
import { SignInComponent } from './main-sign-in/sign-in/sign-in.component';
import { SignUpComponent } from './main-sign-in/sign-up/sign-up.component';
import { AvatarChoiceComponent } from './main-sign-in/avatar-choice/avatar-choice.component';
import { TestingComponent } from './testing/testing.component';
import { ResetPasswordComponent } from './main-sign-in/reset-password/reset-password.component';
import { ChangePasswordComponent } from './main-sign-in/change-password/change-password.component';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog.component';

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
            { path: "confirmation", component: ConfirmationDialogComponent }, // for testing
        ],
    },
    { path: "main", component: MainPageComponent },
    { path: "testing", component: TestingComponent},
    { path: "**", redirectTo: "" },
];
