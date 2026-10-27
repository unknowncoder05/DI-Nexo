import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/api.interceptor';
@Component({selector:'app-account',imports:[ReactiveFormsModule],templateUrl:'./account.page.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AccountPage {
  auth=inject(AuthService);
  private user=this.auth.user()!;
  saving=signal(false);error=signal('');notice=signal('');
  form=inject(FormBuilder).nonNullable.group({
    full_name:[this.user.full_name,[Validators.required,Validators.minLength(2),Validators.maxLength(120)]],
    display_name:[this.user.display_name,[Validators.required,Validators.minLength(2),Validators.maxLength(60)]],
    phone:[this.user.phone,Validators.maxLength(30)],job_title:[this.user.job_title,Validators.maxLength(80)],sector:[this.user.sector,Validators.maxLength(60)],
    locale:[this.user.locale],timezone:[this.user.timezone],theme:[this.user.theme],notifications_enabled:[this.user.notifications_enabled]
  });
  async save() {
    this.form.markAllAsTouched();this.notice.set('');this.error.set('');
    if(this.form.invalid || this.saving())return;
    this.saving.set(true);
    try {await firstValueFrom(this.auth.updateProfile(this.form.getRawValue()));this.notice.set('Perfil actualizado.');}
    catch(e){this.error.set(errorMessage(e));}finally{this.saving.set(false);}
  }
}
