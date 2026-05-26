import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { ProductImageService } from '../../core/product-image.service';
import { SessionService } from '../../core/session.service';
import type { Category, Product } from '../../core/models';

@Component({
  selector: 'app-admin-productos',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class AdminProductos {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly selectedFiles = signal<File[]>([]);
  readonly selectedPreviewUrls = signal<string[]>([]);
  readonly galleryOpen = signal(false);
  readonly galleryTitle = signal<string>('');
  readonly galleryMode = signal<'existing' | 'selected'>('existing');
  readonly galleryImageIds = signal<string[]>([]);
  readonly galleryPreviewUrls = signal<string[]>([]);
  readonly galleryIndex = signal(0);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(140)] }),
    code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    purchasePrice: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    salePrice: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    initialStock: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    stockMinimum: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    description: new FormControl('', { nonNullable: true })
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
    this.inventoryApi
      .listCategories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cats) => {
          this.categories.set(cats);
          if (!this.form.controls.categoryId.value && cats.length > 0) {
            this.form.controls.categoryId.setValue(cats[0].id);
          }
          this.reloadProducts();
        },
        error: (err: unknown) => this.error.set(this.toErrorMessage(err))
      });
  }

  reloadProducts() {
    this.inventoryApi.listProducts({ active: true }).subscribe({
      next: (list) => this.products.set(list),
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const editingId = this.editingId();
    const editingProduct = editingId ? this.editingProduct() : null;
    const previousStock = editingProduct?.stockCurrent ?? null;
    const raw = this.form.getRawValue();
    const files = this.selectedFiles();
    this.loading.set(true);

    const payload = {
      name: raw.name.trim(),
      code: raw.code.trim(),
      categoryId: raw.categoryId,
      purchasePrice: String(raw.purchasePrice).trim(),
      salePrice: String(raw.salePrice).trim(),
      initialStock: raw.initialStock,
      stockMinimum: raw.stockMinimum,
      description: raw.description || null
    };

    const request$ = !editingId
      ? this.inventoryApi.createProduct(payload)
      : this.inventoryApi.updateProduct(editingId, payload).pipe(
          switchMap((product) => {
            if (previousStock === null || raw.initialStock === previousStock) return of(product);
            return this.inventoryApi
              .updateProductStock(product.id, { newStock: raw.initialStock, observation: 'Ajuste desde edición' })
              .pipe(map(() => product));
          })
        );

    request$
      .pipe(
        switchMap((product) =>
          files.length > 0 ? this.inventoryApi.uploadProductImages(product.id, files).pipe(map(() => product)) : of(product)
        ),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.clearSelectedFiles();
          this.resetForm();
          this.reloadProducts();
        },
        error: (err: unknown) => this.error.set(this.toErrorMessage(err))
      });
  }

  startEdit(p: Product) {
    this.editingId.set(p.id);
    this.clearSelectedFiles();
    this.form.reset({
      name: p.name,
      code: p.code,
      categoryId: p.categoryId,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      initialStock: p.stockCurrent,
      stockMinimum: p.stockMinimum,
      description: p.description ?? ''
    });
  }

  cancelEdit() {
    this.resetForm();
  }

  remove(p: Product) {
    this.error.set(null);
    this.inventoryApi.deleteProduct(p.id).subscribe({
      next: () => {
        this.products.set(this.products().filter((x) => x.id !== p.id));
        if (this.editingId() === p.id) this.resetForm();
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  private resetForm() {
    this.editingId.set(null);
    this.clearSelectedFiles();
    this.form.reset({
      name: '',
      code: '',
      categoryId: this.categories()[0]?.id ?? '',
      purchasePrice: '',
      salePrice: '',
      initialStock: 0,
      stockMinimum: 0,
      description: ''
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const list = input.files ? Array.from(input.files) : [];
    const merged = [...this.selectedFiles(), ...list];
    const unique: File[] = [];
    const seen = new Set<string>();
    for (const f of merged) {
      const key = `${f.name}::${f.size}::${f.lastModified}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(f);
    }
    this.selectedFiles.set(unique);
    this.syncSelectedPreviews(unique);
    input.value = '';
  }

  openExistingGallery(p: Product, startImageId?: string | null) {
    if (!p.imageIds || p.imageIds.length === 0) return;
    this.galleryMode.set('existing');
    this.galleryTitle.set(`${p.code} · ${p.name}`);
    this.galleryImageIds.set(p.imageIds);
    const idx = startImageId ? p.imageIds.indexOf(startImageId) : -1;
    this.galleryIndex.set(idx >= 0 ? idx : 0);
    this.galleryOpen.set(true);
  }

  openSelectedGallery(startIndex = 0) {
    const urls = this.selectedPreviewUrls();
    if (urls.length === 0) return;
    this.galleryMode.set('selected');
    this.galleryTitle.set('Imágenes seleccionadas');
    this.galleryPreviewUrls.set(urls);
    const safe = Math.max(0, Math.min(startIndex, urls.length - 1));
    this.galleryIndex.set(safe);
    this.galleryOpen.set(true);
  }

  closeGallery() {
    this.galleryOpen.set(false);
    this.galleryTitle.set('');
    this.galleryImageIds.set([]);
    this.galleryPreviewUrls.set([]);
    this.galleryIndex.set(0);
  }

  isSelectedMode() {
    return this.galleryMode() === 'selected';
  }

  prevImage() {
    const ids = this.isSelectedMode() ? this.galleryPreviewUrls() : this.galleryImageIds();
    if (ids.length === 0) return;
    this.galleryIndex.set((this.galleryIndex() - 1 + ids.length) % ids.length);
  }

  nextImage() {
    const ids = this.isSelectedMode() ? this.galleryPreviewUrls() : this.galleryImageIds();
    if (ids.length === 0) return;
    this.galleryIndex.set((this.galleryIndex() + 1) % ids.length);
  }

  setImageIndex(i: number) {
    const ids = this.isSelectedMode() ? this.galleryPreviewUrls() : this.galleryImageIds();
    if (i < 0 || i >= ids.length) return;
    this.galleryIndex.set(i);
  }

  private clearSelectedFiles() {
    const urls = this.selectedPreviewUrls();
    for (const u of urls) URL.revokeObjectURL(u);
    this.selectedFiles.set([]);
    this.selectedPreviewUrls.set([]);
  }

  private syncSelectedPreviews(files: File[]) {
    const prev = this.selectedPreviewUrls();
    for (const u of prev) URL.revokeObjectURL(u);
    this.selectedPreviewUrls.set(files.map((f) => URL.createObjectURL(f)));
  }

  editingProduct(): Product | null {
    const id = this.editingId();
    if (!id) return null;
    return this.products().find((p) => p.id === id) ?? null;
  }

  deleteImage(productId: string, imageId: string) {
    this.error.set(null);
    this.inventoryApi.deleteProductImage(productId, imageId).subscribe({
      next: () => {
        this.products.set(
          this.products().map((p) => (p.id === productId ? { ...p, imageIds: p.imageIds.filter((x) => x !== imageId) } : p))
        );
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  toggleActive(p: Product) {
    this.inventoryApi.setProductActive(p.id, !p.active).subscribe({
      next: (updated) => {
        this.products.set(this.products().map((x) => (x.id === updated.id ? updated : x)));
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  updateStock(p: Product, newStockValue: string) {
    const newStock = Number(newStockValue);
    if (!Number.isFinite(newStock) || newStock < 0) {
      this.error.set('Stock inválido');
      return;
    }
    this.inventoryApi.updateProductStock(p.id, { newStock }).subscribe({
      next: (updated) => {
        this.products.set(this.products().map((x) => (x.id === updated.id ? updated : x)));
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
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
