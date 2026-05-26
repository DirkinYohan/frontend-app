import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthApiService } from '../core/auth-api.service';
import { InventoryApiService } from '../core/inventory-api.service';
import { SessionService } from '../core/session.service';
import type { Dashboard } from '../core/models';

@Component({
  selector: 'app-operador',
  imports: [CommonModule, RouterLink],
  templateUrl: './operador.html',
  styleUrl: './operador.css'
})
export class Operador {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<Dashboard | null>(null);

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {
    this.reload();
  }

  reload() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.inventoryApi
      .dashboard()
      .pipe(
        timeout(8000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data) => this.dashboard.set(data),
        error: (err: unknown) => {
          this.dashboard.set(null);
          this.error.set(this.toErrorMessage(err));
        }
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
