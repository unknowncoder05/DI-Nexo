import { DOCUMENT } from "@angular/common";
import { Injectable, inject, signal, effect, DestroyRef } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom, tap } from "rxjs";
import { User } from "./models";

/** Sesión verificada por el servidor. El JWT solo vive en una cookie HttpOnly. */
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private current = signal<User | null>(null);
  readonly user = this.current.asReadonly();
  private document = inject(DOCUMENT);
  constructor() {
    const media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const theme = this.user()?.theme || 'light'; this.document.documentElement.dataset['theme'] = theme === 'system' ? (media?.matches ? 'dark' : 'light') : theme; };
    effect(apply);
    media?.addEventListener('change', apply);
    inject(DestroyRef).onDestroy(() => media?.removeEventListener('change', apply));
  }
  updateProfile(changes: Partial<User>) { return this.http.patch<User>('/api/profile', changes).pipe(tap(user => this.current.set(user))); }
  formatDate(value: string | null): string {
    if(!value) return '—';
    return new Intl.DateTimeFormat(this.user()?.locale || 'es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: this.user()?.timezone || 'Europe/Madrid' }).format(new Date(value));
  }
  async restore(): Promise<void> {
    try {
      this.current.set(
        await firstValueFrom(this.http.get<User | null>("/api/auth/me")),
      );
    } catch {
      this.current.set(null);
    }
  }
  login(email: string, password: string) {
    return this.http
      .post<User>("/api/auth/login", { email, password })
      .pipe(tap((user) => this.current.set(user)));
  }
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post("/api/auth/logout", {}));
    this.expire();
  }
  expire(): void {
    this.current.set(null);
    void this.router.navigateByUrl("/login");
  }
}
