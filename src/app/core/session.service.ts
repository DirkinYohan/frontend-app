import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import type { AuthResponse, TokenResponse, User } from './models';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const USER_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly accessToken = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly user = signal<User | null>(null);

  readonly isAuthenticated = computed(() => isValidToken(this.accessToken()));

  constructor(private readonly storage: StorageService) {
    this.accessToken.set(normalizeStoredToken(this.storage.get(ACCESS_TOKEN_KEY)));
    this.refreshToken.set(normalizeStoredToken(this.storage.get(REFRESH_TOKEN_KEY)));

    const userRaw = this.storage.get(USER_KEY);
    if (userRaw) {
      try {
        this.user.set(JSON.parse(userRaw) as User);
      } catch {
        this.storage.remove(USER_KEY);
      }
    }
  }

  setAuth(auth: AuthResponse): void {
    this.accessToken.set(normalizeStoredToken(auth.accessToken));
    this.refreshToken.set(normalizeStoredToken(auth.refreshToken));
    this.user.set(auth.user);

    this.storage.set(ACCESS_TOKEN_KEY, auth.accessToken);
    this.storage.set(REFRESH_TOKEN_KEY, auth.refreshToken);
    this.storage.set(USER_KEY, JSON.stringify(auth.user));
  }

  setTokens(tokens: TokenResponse): void {
    this.accessToken.set(normalizeStoredToken(tokens.accessToken));
    this.refreshToken.set(normalizeStoredToken(tokens.refreshToken));
    this.storage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
    this.storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  setUser(user: User): void {
    this.user.set(user);
    this.storage.set(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.user.set(null);
    this.storage.remove(ACCESS_TOKEN_KEY);
    this.storage.remove(REFRESH_TOKEN_KEY);
    this.storage.remove(USER_KEY);
  }
}

function normalizeStoredToken(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return null;
  return trimmed;
}

function isValidToken(token: string | null): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (trimmed === 'null') return false;
  if (trimmed === 'undefined') return false;
  return true;
}
