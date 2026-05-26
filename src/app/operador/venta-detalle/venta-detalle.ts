import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { ProductImageService } from '../../core/product-image.service';
import { SessionService } from '../../core/session.service';
import type { Sale } from '../../core/models';

@Component({
  selector: 'app-operador-venta-detalle',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './venta-detalle.html',
  styleUrl: './venta-detalle.css'
})
export class OperadorVentaDetalle {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sale = signal<Sale | null>(null);
  readonly galleryOpen = signal(false);
  readonly galleryTitle = signal<string>('');
  readonly galleryImageIds = signal<string[]>([]);
  readonly galleryIndex = signal(0);
  readonly galleryLoading = signal(false);

  constructor(
    readonly session: SessionService,
    private readonly route: ActivatedRoute,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    readonly images: ProductImageService,
    private readonly router: Router
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.error.set(null);
    this.inventoryApi
      .getSale(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (s) => this.sale.set(s),
        error: (err: unknown) => {
          this.sale.set(null);
          this.error.set(this.toErrorMessage(err));
        }
      });
  }

  openProductGallery(productId: string, title: string, startImageId?: string | null) {
    this.galleryTitle.set(title);
    this.galleryLoading.set(true);
    this.inventoryApi
      .listProductImageIds(productId)
      .pipe(finalize(() => this.galleryLoading.set(false)))
      .subscribe({
        next: (ids) => {
          this.galleryImageIds.set(ids);
          const idx = startImageId ? ids.indexOf(startImageId) : -1;
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
