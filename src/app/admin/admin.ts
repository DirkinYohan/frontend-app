import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { InventoryApiService } from '../core/inventory-api.service';
import type { Dashboard } from '../core/models';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dashboard = signal<Dashboard | null>(null);

  constructor(
    readonly session: SessionService,
    private readonly api: AuthApiService,
    private readonly inventoryApi: InventoryApiService,
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
        next: (data) => {
          this.dashboard.set(data);
          this.lastUpdated.set(new Date());
        },
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
