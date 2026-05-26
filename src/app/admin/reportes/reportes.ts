import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { ProductImageService } from '../../core/product-image.service';
import { SessionService } from '../../core/session.service';
import type { Report, ReportDailyPoint, User } from '../../core/models';

@Component({
  selector: 'app-admin-reportes',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class AdminReportes {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly report = signal<Report | null>(null);
  readonly operators = signal<User[]>([]);

  readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    operatorId: new FormControl('', { nonNullable: true })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    readonly images: ProductImageService,
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

    this.inventoryApi
      .report({ from, to, operatorId })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.report.set(r),
        error: (err: unknown) => {
          this.report.set(null);
          this.error.set(this.toErrorMessage(err));
        }
      });
  }

  maxDailyTotal(): number {
    const r = this.report();
    if (!r) return 0;
    return Math.max(0, ...r.dailySales.map((p) => Number(p.total)));
  }

  dailyHeightPercent(total: string): number {
    const max = this.maxDailyTotal();
    if (!max) return 0;
    const value = Number(total);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  }

  dailyPoints() {
    const r = this.report();
    if (!r) return [];
    return r.dailySales;
  }

  operatorLabel(p: ReportDailyPoint): string {
    if (typeof p.operatorName === 'string' && p.operatorName.trim().length > 0) return p.operatorName;
    const selected = this.filters.controls.operatorId.value;
    if (selected) {
      const op = this.operators().find((o) => o.id === selected);
      if (op) return `${op.firstName} ${op.lastName}`.trim();
    }
    return 'Varios';
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
