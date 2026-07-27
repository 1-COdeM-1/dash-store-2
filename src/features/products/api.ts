import type { Product, ProductFilters, ProductInsert, ProductListResult, ProductUpdate } from '@/types/product';
import { deleteFromR2, deleteR2Folder, parseR2KeyFromUrl, uploadToR2 } from '@/lib/r2';
import imageCompression from 'browser-image-compression';

export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
  const { page = 1, pageSize = 10 } = filters;
  
  // TODO: Implement fetching products from Cloudflare Worker
  console.log('Fetching products with filters:', filters);

  return {
    data: [],
    count: 0,
    page,
    pageSize,
    totalPages: 1,
  };
}

export async function fetchProductById(id: number): Promise<Product> {
  // TODO: Implement fetching product by id from Cloudflare Worker
  console.log('Fetching product by id:', id);
  return {} as Product; 
}

export async function fetchCategories(): Promise<{ en: string; ar: string }[]> {
  // TODO: Implement fetching categories from Cloudflare Worker
  return [];
}

export async function fetchOverviewStats() {
  // TODO: Implement fetching overview stats from Cloudflare Worker
  return {
    total: 0,
    inStock: 0,
    outOfStock: 0,
    featured: 0,
    avgRating: 0,
    totalReviews: 0,
    byCategory: [],
    recent: [],
  };
}

export async function duplicateProduct(product: Product): Promise<Product> {
  // TODO: Implement duplicating product
  console.log('Duplicating product:', product);
  return product;
}

export async function createProduct(payload: ProductInsert): Promise<Product> {
  // TODO: Implement creating product via Cloudflare Worker
  console.log('Creating product:', payload);
  return { ...payload, id: Date.now(), createdAt: new Date().toISOString() } as Product;
}

export async function updateProduct(id: number, payload: ProductUpdate): Promise<Product> {
  // TODO: Implement updating product via Cloudflare Worker
  console.log('Updating product:', id, payload);
  return { id, ...payload } as Product;
}

export async function deleteProduct(id: number): Promise<void> {
  // TODO: Implement deleting product via Cloudflare Worker
  console.log('Deleting product:', id);
  await deleteProductFolder(String(id));
}

/**
 * Delete every R2 object inside products/{folderName}/ via the Worker proxy.
 * Uses a single DELETE /delete-folder/:productId call (bulk delete on the Worker).
 */
export async function deleteProductFolder(folderName: string): Promise<void> {
  await deleteR2Folder(folderName);
}

/**
 * Download each image URL and re-upload it to R2 under products/{destFolder}/.
 * Returns the new public Worker URLs.
 */
export async function copyImagesToFolder(
  sourceUrls: string[],
  destFolder: string,
): Promise<string[]> {
  const results: string[] = [];
  for (const url of sourceUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
      const file = new File([blob], `${crypto.randomUUID()}.${safeExt}`, { type: blob.type });
      const newUrl = await uploadProductImage(file, destFolder);
      results.push(newUrl);
    } catch {
      // Skip images that fail to copy
    }
  }
  return results;
}

/**
 * Compress and upload a product image to R2 via the Worker proxy.
 * Returns the public Worker URL (e.g. https://<worker>/products/<productId>/<uuid>.<ext>).
 */
export async function uploadProductImage(file: File, productKey: string): Promise<string> {
  let fileToUpload = file;
  try {
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
      initialQuality: 0.8,
    };
    fileToUpload = await imageCompression(file, options);
  } catch (error) {
    console.error('Error compressing image:', error);
    // Proceed with original file if compression fails
  }

  const rawExt = fileToUpload.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;

  return uploadToR2(fileToUpload, productKey, filename);
}

/**
 * Delete one or more product images from R2 by their public Worker URLs.
 * Silently skips any URL that cannot be parsed as an R2 key.
 */
export async function deleteImagesFromStorage(urls: string[]): Promise<void> {
  const keys = urls.map(parseR2KeyFromUrl).filter((k): k is string => Boolean(k));

  await Promise.allSettled(keys.map((key) => deleteFromR2(key)));
}
