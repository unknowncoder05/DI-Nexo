import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IonButton, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/api.interceptor';
@Component({ selector: 'app-login', imports: [ReactiveFormsModule, IonButton, IonSpinner], templateUrl: './login.page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class LoginPage {
  private auth = inject(AuthService); private router = inject(Router);
  busy = signal(false); error = signal('');
  form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  async submit() {
    this.form.markAllAsTouched(); if (this.form.invalid || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { const { email, password } = this.form.getRawValue(); const user = await firstValueFrom(this.auth.login(email, password)); await this.router.navigateByUrl(user.role === 'admin' ? '/dashboard' : '/projects'); }
    catch (e) { this.error.set(errorMessage(e)); } finally { this.busy.set(false); }
  }
}
