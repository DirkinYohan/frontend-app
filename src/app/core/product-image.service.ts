import { Injectable } from '@angular/core';
import { map, of, shareReplay } from 'rxjs';
import type { Observable } from 'rxjs';
import { InventoryApiService } from './inventory-api.service';

@Injectable({ providedIn: 'root' })
export class ProductImageService {
  private readonly cache = new Map<string, Observable<string>>();

  constructor(private readonly api: InventoryApiService) {}

  url(imageId: string | null | undefined): Observable<string | null> {
    if (!imageId) return of(null);

    const existing = this.cache.get(imageId);
    if (existing) return existing;

    const obs = this.api.getProductImage(imageId).pipe(
      map((blob) => URL.createObjectURL(blob)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cache.set(imageId, obs);
    return obs;
  }
}
