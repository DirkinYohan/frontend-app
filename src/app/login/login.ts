import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor(
    private readonly api: AuthApiService,
    private readonly session: SessionService,
    private readonly router: Router
  ) {}

  showError(name: 'email' | 'password') {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.api.login(this.form.getRawValue()).subscribe({
      next: (auth) => {
        this.session.setAuth(auth);
        this.router.navigateByUrl(auth.user.role === 'ADMINISTRADOR' ? '/admin' : '/operador');
      },
      error: () => {
        this.error.set('Credenciales inválidas');
        this.loading.set(false);
      }
    });
  }
}
