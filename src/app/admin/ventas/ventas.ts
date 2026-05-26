import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { SessionService } from '../../core/session.service';
import type { Sale, User } from '../../core/models';

@Component({
  selector: 'app-admin-ventas',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class AdminVentas {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sales = signal<Sale[]>([]);
  readonly operators = signal<User[]>([]);

  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    operatorId: new FormControl('', { nonNullable: true })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {
    this.loadOperators();
    this.reload();
  }

  loadOperators() {
    this.authApi.listOperators().subscribe({
      next: (list) => this.operators.set(list),
      error: () => this.operators.set([])
    });
  }

  reload() {
    this.error.set(null);
    this.loading.set(true);
    const raw = this.filters.getRawValue();

    const from = raw.from ? new Date(raw.from).toISOString() : undefined;
    const to = raw.to ? new Date(raw.to).toISOString() : undefined;
    const operatorId = raw.operatorId ? raw.operatorId : undefined;
    const q = raw.q?.trim() ? raw.q.trim() : undefined;

    this.inventoryApi
      .listSales({ q, from, to, operatorId, limit: 200 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.sales.set(list),
        error: (err: unknown) => {
          this.sales.set([]);
          this.error.set(this.toErrorMessage(err));
        }
      });
  }

  totalAmount() {
    return this.sales().reduce((sum, s) => sum + Number(s.total), 0);
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
