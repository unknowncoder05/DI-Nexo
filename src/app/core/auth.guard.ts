import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
/** Los guards mejoran navegación; la API aplica de nuevo todos los permisos. */
export const authGuard: CanActivateFn = () => inject(AuthService).user() ? true : inject(Router).createUrlTree(['/login']);
export const adminGuard: CanActivateFn = () => inject(AuthService).user()?.role === 'admin' ? true : inject(Router).createUrlTree(['/projects']);
