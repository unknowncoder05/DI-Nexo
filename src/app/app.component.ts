import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonApp } from '@ionic/angular';
import { AuthService } from './core/auth.service';
import { errorMessage } from './core/api.interceptor';
@Component({ selector: 'app-root', imports: [IonApp, RouterOutlet, RouterLink, RouterLinkActive], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<ion-app><a class="skip-link" href="#main">Saltar al contenido</a>
@if (auth.user()) {
<div class="workspace" [class.menu-open]="menuOpen()"><aside class="sidebar"><a routerLink="/" class="brand" aria-label="Nexo, inicio"><span class="brand-mark">n</span> nexo<span class="brand-dot">.</span></a><div class="workspace-tag">ESPACIO DE TRABAJO <span>DEMO</span></div>
<nav aria-label="Navegación principal">@if(auth.user()?.role === 'admin'){<a routerLink="/dashboard" routerLinkActive="selected" ariaCurrentWhenActive="page"><span aria-hidden="true">◫</span> Resumen</a>}<a routerLink="/projects" routerLinkActive="selected" ariaCurrentWhenActive="page"><span aria-hidden="true">▤</span> Proyectos</a><a routerLink="/clients" routerLinkActive="selected" ariaCurrentWhenActive="page"><span aria-hidden="true">◎</span> Clientes</a><a routerLink="/help" routerLinkActive="selected" ariaCurrentWhenActive="page"><span aria-hidden="true">ⓘ</span> Ayuda</a></nav>
<div class="sidebar-note"><span class="status-dot"></span> Un lugar para avanzar.<p>Tu equipo, tus proyectos.<br>Todo conectado.</p></div><div class="profile"><span class="avatar">{{ auth.user()?.role === 'admin' ? 'AD' : 'EQ' }}</span><div><strong>{{ auth.user()?.name }}</strong><small>{{ auth.user()?.role === 'admin' ? 'Administrador' : 'Usuario estándar' }}</small></div></div><button class="logout" (click)="logout()">Cerrar sesión ↗</button></aside>
<div class="workspace-body"><header class="topbar"><button class="menu-toggle" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Mostrar navegación">☰</button><span>Workspace <span class="breadcrumb">/ Nexo Studio</span></span><span class="topbar-tag">DATOS DE DEMOSTRACIÓN</span></header><main id="main" tabindex="-1">@if(message()){<p class="error" role="alert">{{message()}}</p>}<router-outlet /></main><footer>Nexo Studio <span>Gestión de proyectos · Actividad 1</span></footer></div></div>
} @else {<main id="main" tabindex="-1" class="login-main"><router-outlet /></main>}
</ion-app>` })
export class AppComponent {
  auth = inject(AuthService); menuOpen = signal(false); message = signal('');
  constructor() { inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => { if(event instanceof NavigationEnd) { this.menuOpen.set(false); setTimeout(() => document.querySelector<HTMLElement>('h1')?.focus(), 0); } }); }
  async logout() { try { await this.auth.logout(); } catch(e) { this.message.set(errorMessage(e)); } }
}
