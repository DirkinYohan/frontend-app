import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from './api';
import type {
  Category,
  Dashboard,
  MovimientoInventario,
  Product,
  Report,
  Sale,
  SaleCreatePayload
} from './models';
import type { User } from './models';

export interface ProductsQuery {
  q?: string;
  active?: boolean;
  categoryId?: string;
}

export interface ProductUpsertPayload {
  name: string;
  code: string;
  description?: string | null;
  purchasePrice: string | number;
  salePrice: string | number;
  initialStock: number;
  stockMinimum: number;
  categoryId: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly baseUrl = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  dashboard() {
    return this.http.get<Dashboard>(`${this.baseUrl}/api/dashboard`);
  }

  listCategories(q?: string) {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Category[]>(`${this.baseUrl}/api/categories`, { params });
  }

  createCategory(payload: { name: string; description?: string | null }) {
    return this.http.post<Category>(`${this.baseUrl}/api/categories`, payload);
  }

  updateCategory(categoryId: string, payload: { name: string; description?: string | null }) {
    return this.http.put<Category>(`${this.baseUrl}/api/categories/${categoryId}`, payload);
  }

  deleteCategory(categoryId: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/categories/${categoryId}`);
  }

  listProducts(query: ProductsQuery = {}) {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (typeof query.active === 'boolean') params = params.set('active', String(query.active));
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    return this.http.get<Product[]>(`${this.baseUrl}/api/products`, { params });
  }

  lowStockProducts(limit = 10) {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Product[]>(`${this.baseUrl}/api/products/low-stock`, { params });
  }

  getProduct(productId: string) {
    return this.http.get<Product>(`${this.baseUrl}/api/products/${productId}`);
  }

  createProduct(payload: ProductUpsertPayload) {
    return this.http.post<Product>(`${this.baseUrl}/api/products`, payload);
  }

  updateProduct(productId: string, payload: ProductUpsertPayload) {
    return this.http.put<Product>(`${this.baseUrl}/api/products/${productId}`, payload);
  }

  deleteProduct(productId: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/products/${productId}`);
  }

  setProductActive(productId: string, value: boolean) {
    const params = new HttpParams().set('value', String(value));
    return this.http.post<Product>(`${this.baseUrl}/api/products/${productId}/active`, null, { params });
  }

  updateProductStock(productId: string, payload: { newStock: number; observation?: string | null }) {
    return this.http.post<Product>(`${this.baseUrl}/api/products/${productId}/stock`, payload);
  }

  createSale(payload: SaleCreatePayload) {
    return this.http.post<Sale>(`${this.baseUrl}/api/sales`, payload);
  }

  listSales(paramsIn: { mine?: boolean; q?: string; from?: string; to?: string; operatorId?: string; limit?: number } = {}) {
    let params = new HttpParams();
    if (typeof paramsIn.mine === 'boolean') params = params.set('mine', String(paramsIn.mine));
    if (paramsIn.q) params = params.set('q', paramsIn.q);
    if (paramsIn.from) params = params.set('from', paramsIn.from);
    if (paramsIn.to) params = params.set('to', paramsIn.to);
    if (paramsIn.operatorId) params = params.set('operatorId', paramsIn.operatorId);
    if (typeof paramsIn.limit === 'number') params = params.set('limit', String(paramsIn.limit));
    return this.http.get<Sale[]>(`${this.baseUrl}/api/sales`, { params });
  }

  getSale(saleId: string) {
    return this.http.get<Sale>(`${this.baseUrl}/api/sales/${saleId}`);
  }

  uploadProductImages(productId: string, files: File[]) {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return this.http.post<string[]>(`${this.baseUrl}/api/products/${productId}/images`, form);
  }

  listProductImageIds(productId: string) {
    return this.http.get<string[]>(`${this.baseUrl}/api/products/${productId}/images`);
  }

  deleteProductImage(productId: string, imageId: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/products/${productId}/images/${imageId}`);
  }

  getProductImage(imageId: string) {
    return this.http.get(`${this.baseUrl}/api/products/images/${imageId}`, { responseType: 'blob' });
  }

  listMovements(paramsIn: { from?: string; to?: string; limit?: number } = {}) {
    let params = new HttpParams();
    if (paramsIn.from) params = params.set('from', paramsIn.from);
    if (paramsIn.to) params = params.set('to', paramsIn.to);
    if (typeof paramsIn.limit === 'number') params = params.set('limit', String(paramsIn.limit));
    return this.http.get<MovimientoInventario[]>(`${this.baseUrl}/api/inventory/movements`, { params });
  }

  report(paramsIn: { from?: string; to?: string; operatorId?: string } = {}) {
    let params = new HttpParams();
    if (paramsIn.from) params = params.set('from', paramsIn.from);
    if (paramsIn.to) params = params.set('to', paramsIn.to);
    if (paramsIn.operatorId) params = params.set('operatorId', paramsIn.operatorId);
    return this.http.get<Report>(`${this.baseUrl}/api/reports`, { params });
  }

  updateProfile(payload: { firstName: string; lastName: string; identification: string; email: string }) {
    return this.http.put<User>(`${this.baseUrl}/api/profile`, payload);
  }

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post<void>(`${this.baseUrl}/api/profile/password`, payload);
  }
}
