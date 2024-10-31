import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    take(1),
    map(user => !!user),
    map(isLoggedIn => {
      if (!isLoggedIn) {
        router.navigate(['/']);
      }
      return isLoggedIn;
    })
  );
};
