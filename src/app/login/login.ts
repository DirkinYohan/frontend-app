import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';

/**
 * Componente para el inicio de sesión de usuarios.
 */
@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Señales para manejar el estado de carga y errores
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Formulario reactivo con validaciones para correo y contraseña
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor(
    private readonly api: AuthApiService,
    private readonly session: SessionService,
    private readonly router: Router
  ) {}

  /**
   * Determina si se debe mostrar un error de validación para un campo.
   */
  showError(name: 'email' | 'password') {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  /**
   * Maneja el envío del formulario de inicio de sesión.
   */
  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.api.login(this.form.getRawValue()).subscribe({
      next: (auth) => {
        // Guardar información de sesión y redirigir según el rol del usuario
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
