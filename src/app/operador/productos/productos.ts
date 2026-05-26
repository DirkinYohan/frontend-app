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
import type { Category, Product } from '../../core/models';

@Component({
  selector: 'app-operador-productos',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class OperadorProductos {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly galleryOpen = signal(false);
  readonly galleryTitle = signal<string>('');
  readonly galleryImageIds = signal<string[]>([]);
  readonly galleryIndex = signal(0);

  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    lowStockOnly: new FormControl(false, { nonNullable: true })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    readonly images: ProductImageService,
    private readonly router: Router
  ) {
    this.reloadCategories();
    this.reloadProducts();
  }

  reloadCategories() {
    this.inventoryApi.listCategories().subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.categories.set([])
    });
  }

  reloadProducts() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    const q = raw.q?.trim() ? raw.q.trim() : undefined;
    const categoryId = raw.categoryId ? raw.categoryId : undefined;
    const active = true;

    const request$ = raw.lowStockOnly
      ? this.inventoryApi.lowStockProducts()
      : this.inventoryApi.listProducts({ q, active, categoryId });

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.products.set(list),
        error: (err: unknown) => {
          this.products.set([]);
          this.error.set(this.toErrorMessage(err));
        }
      });
  }

  openGallery(p: Product, startImageId?: string | null) {
    if (!p.imageIds || p.imageIds.length === 0) return;
    this.galleryTitle.set(`${p.code} · ${p.name}`);
    this.galleryImageIds.set(p.imageIds);
    const idx = startImageId ? p.imageIds.indexOf(startImageId) : -1;
    this.galleryIndex.set(idx >= 0 ? idx : 0);
    this.galleryOpen.set(true);
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
    const next = (this.galleryIndex() - 1 + ids.length) % ids.length;
    this.galleryIndex.set(next);
  }

  nextImage() {
    const ids = this.galleryImageIds();
    if (ids.length === 0) return;
    const next = (this.galleryIndex() + 1) % ids.length;
    this.galleryIndex.set(next);
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
