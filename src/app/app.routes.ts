import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import('./main-sign-in/main-sign-in.component').then(m => m.MainSignInComponent),
    children: [
      { path: "", loadComponent: () => import('./main-sign-in/sign-in/sign-in.component').then(m => m.SignInComponent) },
      { path: "signup", loadComponent: () => import('./main-sign-in/sign-up/sign-up.component').then(m => m.SignUpComponent) },
      { path: "avatar", loadComponent: () => import('./main-sign-in/avatar-choice/avatar-choice.component').then(m => m.AvatarChoiceComponent) },
      { path: "reset-password", loadComponent: () => import('./main-sign-in/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
      { path: "change-password", loadComponent: () => import('./main-sign-in/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
      { path: "imprint", loadComponent: () => import('./shared/imprint/imprint.component').then(m => m.ImprintComponent) },
      { path: "privacy", loadComponent: () => import('./shared/privacypolicy/privacypolicy.component').then(m => m.PrivacypolicyComponent) },
      { path: "confirmation", loadComponent: () => import('./shared/confirmation-dialog/confirmation-dialog.component').then(m => m.ConfirmationDialogComponent) },
    ],
  },
  { path: "main", loadComponent: () => import('./main-page/main-page.component').then(m => m.MainPageComponent) },
  { path: "**", redirectTo: "" },
];
