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

/**
 * Servicio encargado de las peticiones HTTP relacionadas con la autenticación y gestión de usuarios.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = API_BASE_URL;
  // Encabezado especial para indicar al interceptor que no adjunte el token JWT en estas peticiones
  private readonly skipAuthHeaders = new HttpHeaders({ 'X-Skip-Auth': 'true' });

  constructor(private readonly http: HttpClient) {}

  /**
   * Registra un nuevo administrador y su tienda.
   */
  registerAdmin(payload: RegisterAdminPayload) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/register`, payload, {
      headers: this.skipAuthHeaders
    });
  }

  /**
   * Inicia sesión con correo y contraseña.
   */
  login(payload: LoginPayload) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, payload, {
      headers: this.skipAuthHeaders
    });
  }

  /**
   * Renueva el token de acceso usando un refresh token.
   */
  refresh(refreshToken: string) {
    return this.http.post<TokenResponse>(
      `${this.baseUrl}/api/auth/refresh`,
      { refreshToken },
      { headers: this.skipAuthHeaders }
    );
  }

  /**
   * Cierra la sesión del usuario.
   */
  logout(refreshToken: string) {
    return this.http.post<void>(`${this.baseUrl}/api/auth/logout`, { refreshToken }, { headers: this.skipAuthHeaders });
  }

  /**
   * Obtiene la información del perfil del usuario actual.
   */
  me() {
    return this.http.get<User>(`${this.baseUrl}/api/me`);
  }

  /**
   * Crea un nuevo usuario operador (solo administradores).
   */
  createOperator(payload: CreateOperatorPayload) {
    return this.http.post<User>(`${this.baseUrl}/api/users/operators`, payload);
  }

  /**
   * Lista todos los operadores de la tienda.
   */
  listOperators() {
    return this.http.get<User[]>(`${this.baseUrl}/api/users/operators`);
  }

  /**
   * Actualiza los datos de un operador.
   */
  updateOperator(operatorId: string, payload: UpdateOperatorPayload) {
    return this.http.put<User>(`${this.baseUrl}/api/users/operators/${operatorId}`, payload);
  }

  /**
   * Activa o desactiva la cuenta de un operador.
   */
  setOperatorActive(operatorId: string, value: boolean) {
    return this.http.post<User>(`${this.baseUrl}/api/users/operators/${operatorId}/active`, null, {
      params: { value: String(value) }
    });
  }

  /**
   * Elimina un operador del sistema.
   */
  deleteOperator(operatorId: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/users/operators/${operatorId}`);
  }
}
