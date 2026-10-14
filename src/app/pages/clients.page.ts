import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { AsyncValidatorFn, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, firstValueFrom, map, of, switchMap, timer } from 'rxjs';
import { IonButton, IonSpinner } from '@ionic/angular/standalone';
import { DataService } from '../core/data.service';
import { AuthService } from '../core/auth.service';
import { Client } from '../core/models';
import { errorMessage } from '../core/api.interceptor';
import { DataTableComponent, TableColumn, TableRow } from '../shared/data-table.component';
@Component({ selector: 'app-clients', imports: [ReactiveFormsModule, IonButton, IonSpinner, DataTableComponent], templateUrl: './clients.page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class ClientsPage {
  private data = inject(DataService); auth = inject(AuthService);
  clients = signal<Client[]>([]); loading = signal(true); saving = signal(false); showForm = signal(false); error = signal(''); notice = signal('');
  columns: TableColumn[] = [{ key: 'name', label: 'Cliente' }, { key: 'email', label: 'Correo electrónico' }, { key: 'sector', label: 'Sector' }];
  rows = computed<TableRow[]>(() => this.clients().map(c => ({ ...c })));
  /** Angular cancela la validación anterior al cambiar el valor. */
  private uniqueEmail: AsyncValidatorFn = control => timer(300).pipe(switchMap(() => this.data.emailAvailable(String(control.value))), map(result => result.available ? null : { emailTaken: true }), catchError(() => of({ unavailable: true })));
  form = inject(FormBuilder).nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]], email: ['', { validators: [Validators.required, Validators.email, Validators.maxLength(254)], asyncValidators: [this.uniqueEmail], updateOn: 'blur' }], sector: ['Servicios', [Validators.required, Validators.maxLength(60)]] });
  constructor() { const cdr = inject(ChangeDetectorRef); this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => cdr.markForCheck()); void this.load(); }
  async load() { this.loading.set(true); this.error.set(''); try { this.clients.set(await firstValueFrom(this.data.clients())); } catch(e) { this.error.set(errorMessage(e)); } finally { this.loading.set(false); } }
  async save() { this.form.markAllAsTouched(); if(this.form.invalid || this.form.pending || this.saving()) return; this.saving.set(true); this.error.set(''); try { const client = await firstValueFrom(this.data.addClient(this.form.getRawValue())); this.clients.update(items => [client, ...items]); this.form.reset(); this.showForm.set(false); this.notice.set('Cliente creado correctamente.'); } catch(e) { this.error.set(errorMessage(e)); } finally { this.saving.set(false); } }
}
