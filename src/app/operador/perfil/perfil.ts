import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-operador-perfil',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class OperadorPerfil {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    identification: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {
    const u = session.user();
    if (u) {
      this.profileForm.reset({
        firstName: u.firstName,
        lastName: u.lastName,
        identification: u.identification,
        email: u.email
      });
    }
  }

  saveProfile() {
    this.error.set(null);
    this.success.set(null);
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    this.loading.set(true);
    this.inventoryApi
      .updateProfile(this.profileForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          this.session.setUser(user);
          this.success.set('Perfil actualizado');
        },
        error: (err: unknown) => this.error.set(this.toErrorMessage(err))
      });
  }

  changePassword() {
    this.error.set(null);
    this.success.set(null);
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    const raw = this.passwordForm.getRawValue();
    const payload = {
      currentPassword: raw.currentPassword.trim(),
      newPassword: raw.newPassword.trim()
    };
    const email = (this.session.user()?.email ?? this.profileForm.controls.email.value).trim();
    const oldRefreshToken = this.session.refreshToken();

    this.loading.set(true);
    this.inventoryApi
      .changePassword(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.authApi.login({ email, password: payload.newPassword }).subscribe({
            next: (auth) => {
              this.session.setAuth(auth);
              if (oldRefreshToken) {
                this.authApi.logout(oldRefreshToken).subscribe({ error: () => {} });
              }
              this.passwordForm.reset({ currentPassword: '', newPassword: '' });
              this.success.set('Contraseña actualizada');
            },
            error: () => {
              this.passwordForm.reset({ currentPassword: '', newPassword: '' });
              this.success.set(`Contraseña actualizada. Inicia sesión con ${email}`);
            }
          });
        },
        error: (err: unknown) => this.error.set(this.toErrorMessage(err))
      });
  }

  logout() {
    const refreshToken = this.session.refreshToken();
    this.session.clear();
    if (refreshToken) {
      this.authApi.logout(refreshToken).subscribe({ error: () => {} });
    }
    this.router.navigateByUrl('/login');
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiMessage = (err.error as any)?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) return apiMessage;
      if (err.status === 0) return 'No se pudo conectar al servidor';
      return `Error (código ${err.status})`;
    }
    return 'Error';
  }
}
