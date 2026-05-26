import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { InventoryApiService } from '../../core/inventory-api.service';
import { SessionService } from '../../core/session.service';
import type { Category } from '../../core/models';

@Component({
  selector: 'app-admin-categorias',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})
export class AdminCategorias {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });

  constructor(
    readonly session: SessionService,
    private readonly inventoryApi: InventoryApiService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {
    this.reload();
  }

  reload() {
    this.error.set(null);
    this.inventoryApi.listCategories().subscribe({
      next: (list) => this.categories.set(list),
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  onSubmit() {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const editingId = this.editingId();
    const raw = this.form.getRawValue();
    this.loading.set(true);
    const request$ = editingId
      ? this.inventoryApi.updateCategory(editingId, { name: raw.name, description: raw.description || null })
      : this.inventoryApi.createCategory({ name: raw.name, description: raw.description || null });

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
      error: (err: unknown) => this.error.set(this.toErrorMessage(err))
    });
  }

  startEdit(category: Category) {
    this.editingId.set(category.id);
    this.form.reset({ name: category.name, description: category.description ?? '' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '' });
  }

  remove(category: Category) {
    this.error.set(null);
    this.inventoryApi.deleteCategory(category.id).subscribe({
      next: () => {
        if (this.editingId() === category.id) this.cancelEdit();
        this.reload();
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
