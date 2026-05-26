import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_BASE_URL } from './api';
import type { AuthResponse, TokenResponse, User } from './models';

export interface RegisterAdminPayload {
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateOperatorPayload {
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  password: string;
}

export interface UpdateOperatorPayload {
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  password?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = API_BASE_URL;
  private readonly skipAuthHeaders = new HttpHeaders({ 'X-Skip-Auth': 'true' });

  constructor(private readonly http: HttpClient) {}

  registerAdmin(payload: RegisterAdminPayload) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/register`, payload, {
      headers: this.skipAuthHeaders
    });
  }

  login(payload: LoginPayload) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, payload, {
      headers: this.skipAuthHeaders
    });
  }

  refresh(refreshToken: string) {
    return this.http.post<TokenResponse>(
      `${this.baseUrl}/api/auth/refresh`,
      { refreshToken },
      { headers: this.skipAuthHeaders }
    );
  }

  logout(refreshToken: string) {
    return this.http.post<void>(`${this.baseUrl}/api/auth/logout`, { refreshToken }, { headers: this.skipAuthHeaders });
  }

  me() {
    return this.http.get<User>(`${this.baseUrl}/api/me`);
  }

  createOperator(payload: CreateOperatorPayload) {
    return this.http.post<User>(`${this.baseUrl}/api/users/operators`, payload);
  }

  listOperators() {
    return this.http.get<User[]>(`${this.baseUrl}/api/users/operators`);
  }

  updateOperator(operatorId: string, payload: UpdateOperatorPayload) {
    return this.http.put<User>(`${this.baseUrl}/api/users/operators/${operatorId}`, payload);
  }

  setOperatorActive(operatorId: string, value: boolean) {
    return this.http.post<User>(`${this.baseUrl}/api/users/operators/${operatorId}/active`, null, {
      params: { value: String(value) }
    });
  }

  deleteOperator(operatorId: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/users/operators/${operatorId}`);
  }
}
