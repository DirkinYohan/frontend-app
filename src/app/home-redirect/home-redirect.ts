import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-home-redirect',
  templateUrl: './home-redirect.html',
  styleUrl: './home-redirect.css'
})
export class HomeRedirect {
  constructor(
    private readonly session: SessionService,
    private readonly api: AuthApiService,
    private readonly router: Router
  ) {
    this.bootstrap();
  }

  private bootstrap() {
    if (!this.session.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const role = this.session.user()?.role;
    if (role) {
      this.router.navigateByUrl(role === 'ADMINISTRADOR' ? '/admin' : '/operador');
      return;
    }

    this.api.me().subscribe({
      next: (user) => {
        this.session.setUser(user);
        this.router.navigateByUrl(user.role === 'ADMINISTRADOR' ? '/admin' : '/operador');
      },
      error: () => {
        this.session.clear();
        this.router.navigateByUrl('/login');
      }
    });
  }
}

