import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    identification: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  constructor(
    private readonly api: AuthApiService,
    private readonly session: SessionService,
    private readonly router: Router
  ) {}

  showError(name: keyof Register['form']['controls']) {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.api.registerAdmin(this.form.getRawValue()).subscribe({
      next: (auth) => {
        this.session.setAuth(auth);
        this.router.navigateByUrl('/admin');
      },
      error: () => {
        this.error.set('No se pudo registrar. Verifica el correo.');
        this.loading.set(false);
      }
    });
  }
}
