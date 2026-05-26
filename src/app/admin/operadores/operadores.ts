import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth-api.service';
import { SessionService } from '../../core/session.service';
import type { User } from '../../core/models';

@Component({
  selector: 'app-admin-operadores',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './operadores.html',
  styleUrl: './operadores.css'
})
export class AdminOperadores {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly operators = signal<User[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    identification: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  constructor(
    private readonly api: AuthApiService,
    readonly session: SessionService,
    private readonly router: Router
  ) {
    this.reload();
  }

  showError(name: keyof AdminOperadores['form']['controls']) {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  reload() {
    this.error.set(null);
    this.api.listOperators().subscribe({
      next: (list) => this.operators.set(list),
      error: (err: unknown) => {
        this.operators.set([]);
        this.error.set(this.toErrorMessage(err));
      }
    });
  }

  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const editingId = this.editingId();
    const raw = this.form.getRawValue();
    this.loading.set(true);
    if (!editingId) {
      this.api.createOperator(raw).subscribe({
        next: () => {
          this.resetForm();
          this.loading.set(false);
          this.reload();
        },
        error: (err: unknown) => {
          this.error.set(this.toErrorMessage(err));
          this.loading.set(false);
        }
      });
      return;
    }

    this.api
      .updateOperator(editingId, {
        firstName: raw.firstName,
        lastName: raw.lastName,
        identification: raw.identification,
        email: raw.email,
        password: raw.password.trim() ? raw.password : null
      })
      .subscribe({
        next: () => {
          this.resetForm();
          this.loading.set(false);
          this.reload();
        },
        error: (err: unknown) => {
          this.error.set(this.toErrorMessage(err));
          this.loading.set(false);
        }
      });
  }

  startEdit(op: User) {
    this.editingId.set(op.id);
    this.form.reset({
      firstName: op.firstName,
      lastName: op.lastName,
      identification: op.identification,
      email: op.email,
      password: ''
    });
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
  }

  cancelEdit() {
    this.resetForm();
  }

  toggleActive(op: User) {
    this.error.set(null);
    this.api.setOperatorActive(op.id, !op.active).subscribe({
      next: (updated) => {
        this.operators.set(this.operators().map((x) => (x.id === updated.id ? updated : x)));
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  remove(op: User) {
    this.error.set(null);
    this.api.deleteOperator(op.id).subscribe({
      next: () => {
        this.operators.set(this.operators().filter((x) => x.id !== op.id));
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  private resetForm() {
    this.editingId.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      identification: '',
      email: '',
      password: ''
    });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
  }

  logout() {
    const refreshToken = this.session.refreshToken();
    this.session.clear();
    if (refreshToken) {
      this.api.logout(refreshToken).subscribe({ error: () => {} });
    }
    this.router.navigateByUrl('/login');
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiMessage = (err.error as any)?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) return apiMessage;
      if (err.status === 0) return 'No se pudo conectar al servidor';
      return `Error al actualizar (HTTP ${err.status})`;
    }
    return 'Error al actualizar';
  }
}
