import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { User } from './models';

/** Sesión verificada por el servidor. El JWT solo vive en una cookie HttpOnly. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private current = signal<User | null>(null);
  readonly user = this.current.asReadonly();
  async restore(): Promise<void> {
    try { this.current.set(await firstValueFrom(this.http.get<User>('/api/auth/me'))); }
    catch { this.current.set(null); }
  }
  login(email: string, password: string) {
    return this.http.post<User>('/api/auth/login', { email, password }).pipe(tap(user => this.current.set(user)));
  }
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.expire();
  }
  expire(): void { this.current.set(null); void this.router.navigateByUrl('/login'); }
}
