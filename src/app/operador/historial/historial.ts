import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { ProductImageService } from '../../core/product-image.service';
import { SessionService } from '../../core/session.service';
import type { Sale } from '../../core/models';

@Component({
  selector: 'app-operador-historial',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class OperadorHistorial {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sales = signal<Sale[]>([]);
  readonly galleryOpen = signal(false);
  readonly galleryTitle = signal<string>('');
  readonly galleryImageIds = signal<string[]>([]);
  readonly galleryIndex = signal(0);
  readonly galleryLoading = signal(false);

  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    readonly images: ProductImageService,
    private readonly router: Router
  ) {
    this.reload();
  }

  reload() {
    this.error.set(null);
    this.loading.set(true);
    const raw = this.filters.getRawValue();
    const q = raw.q?.trim() ? raw.q.trim() : undefined;
    const from = raw.from ? new Date(raw.from).toISOString() : undefined;
    const to = raw.to ? new Date(raw.to).toISOString() : undefined;

    this.inventoryApi
      .listSales({ q, from, to, limit: 200 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.sales.set(list),
        error: (err: unknown) => {
          this.sales.set([]);
          this.error.set(this.toErrorMessage(err));
        }
      });
  }

  totalSold() {
    return this.sales().reduce((sum, s) => sum + Number(s.total), 0);
  }

  openDetail(saleId: string) {
    this.router.navigate(['/operador/historial', saleId]);
  }

  thumbId(sale: Sale): string | null {
    for (const item of sale.items ?? []) {
      if (item.productPrimaryImageId) return item.productPrimaryImageId;
    }
    return null;
  }

  thumbProductId(sale: Sale): string | null {
    for (const item of sale.items ?? []) {
      if (item.productPrimaryImageId) return item.productId;
    }
    return sale.items?.[0]?.productId ?? null;
  }

  openGalleryForSale(sale: Sale) {
    const productId = this.thumbProductId(sale);
    if (!productId) return;
    this.galleryTitle.set(`Venta ${sale.saleNumber}`);
    this.galleryLoading.set(true);
    this.inventoryApi
      .listProductImageIds(productId)
      .pipe(finalize(() => this.galleryLoading.set(false)))
      .subscribe({
        next: (ids) => {
          this.galleryImageIds.set(ids);
          const start = this.thumbId(sale);
          const idx = start ? ids.indexOf(start) : -1;
          this.galleryIndex.set(idx >= 0 ? idx : 0);
          this.galleryOpen.set(true);
        },
        error: () => {
          this.galleryImageIds.set([]);
          this.galleryOpen.set(false);
        }
      });
  }

  closeGallery() {
    this.galleryOpen.set(false);
    this.galleryTitle.set('');
    this.galleryImageIds.set([]);
    this.galleryIndex.set(0);
  }

  prevImage() {
    const ids = this.galleryImageIds();
    if (ids.length === 0) return;
    this.galleryIndex.set((this.galleryIndex() - 1 + ids.length) % ids.length);
  }

  nextImage() {
    const ids = this.galleryImageIds();
    if (ids.length === 0) return;
    this.galleryIndex.set((this.galleryIndex() + 1) % ids.length);
  }

  setImageIndex(i: number) {
    const ids = this.galleryImageIds();
    if (i < 0 || i >= ids.length) return;
    this.galleryIndex.set(i);
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
