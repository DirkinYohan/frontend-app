import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { ProductImageService } from '../../core/product-image.service';
import { SessionService } from '../../core/session.service';
import type { Product, SaleCreatePayload } from '../../core/models';

type CartItem = { product: Product; quantity: number };

@Component({
  selector: 'app-operador-ventas',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class OperadorVentas {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly cart = signal<Record<string, CartItem>>({});
  readonly galleryOpen = signal(false);
  readonly galleryTitle = signal<string>('');
  readonly galleryImageIds = signal<string[]>([]);
  readonly galleryIndex = signal(0);
  readonly galleryLoading = signal(false);

  readonly query = new FormControl('', { nonNullable: true });
  readonly paymentMethod = new FormControl<SaleCreatePayload['paymentMethod']>('CASH', { nonNullable: true });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    readonly images: ProductImageService,
    private readonly router: Router
  ) {
    this.reloadProducts('');
    this.query.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe((q) => this.reloadProducts(q));
  }

  reloadProducts(q: string) {
    this.error.set(null);
    this.inventoryApi.listProducts({ q, active: true }).subscribe({
      next: (list) => this.products.set(list),
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  addToCart(p: Product) {
    this.success.set(null);
    const current = { ...this.cart() };
    const existing = current[p.id];
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > p.stockCurrent) {
      this.error.set('Stock insuficiente');
      return;
    }
    current[p.id] = { product: p, quantity: nextQuantity };
    this.cart.set(current);
  }

  setQuantity(productId: string, value: string) {
    const qty = Number(value);
    const current = { ...this.cart() };
    const item = current[productId];
    if (!item) return;
    if (!Number.isFinite(qty) || qty <= 0) {
      delete current[productId];
      this.cart.set(current);
      return;
    }
    if (qty > item.product.stockCurrent) {
      this.error.set('Stock insuficiente');
      return;
    }
    current[productId] = { ...item, quantity: qty };
    this.cart.set(current);
  }

  removeFromCart(productId: string) {
    const current = { ...this.cart() };
    delete current[productId];
    this.cart.set(current);
  }

  confirm() {
    this.error.set(null);
    this.success.set(null);
    const items = Object.values(this.cart()).map((x) => ({ productId: x.product.id, quantity: x.quantity }));
    if (items.length === 0) {
      this.error.set('Agrega productos al carrito');
      return;
    }

    this.loading.set(true);
    this.inventoryApi
      .createSale({ paymentMethod: this.paymentMethod.value, items })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (sale) => {
          this.cart.set({});
          this.success.set(`Venta registrada: ${sale.saleNumber}`);
          this.reloadProducts(this.query.value);
        },
        error: (err: unknown) => this.error.set(this.toErrorMessage(err))
      });
  }

  openProductGallery(p: Product, startImageId?: string | null) {
    if (!p) return;
    this.galleryTitle.set(`${p.code} · ${p.name}`);
    this.galleryLoading.set(true);
    this.inventoryApi
      .listProductImageIds(p.id)
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

  cartItems() {
    return Object.values(this.cart());
  }

  cartTotal() {
    return this.cartItems().reduce((sum, x) => sum + Number(x.product.salePrice) * x.quantity, 0);
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
