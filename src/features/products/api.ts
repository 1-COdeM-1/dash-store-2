import type { Product, ProductFilters, ProductInsert, ProductListResult, ProductUpdate } from '@/types/product';
import imageCompression from 'browser-image-compression';
import { useAuthStore } from '../auth/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function getAuthHeaders() {
  const token = useAuthStore.getState().session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    price: row.price,
    discount: row.discount,
    category: row.category,
    categoryAr: row.category_ar,
    featured: row.featured === 1,
    whatsNumber: row.whats_number,
    rating: row.rating,
    reviews: row.reviews,
    inStock: row.in_stock === 1,
    tags: row.tags || [],
    images: row.images || [],
  };
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
  const { page = 1, pageSize = 10, search, category } = filters;
  
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) query.append('search', search);
  if (category) query.append('category', category);

  const res = await fetch(`${API_URL}/api/products?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  const data = await res.json();
  
  return {
    ...data,
    data: data.data.map(mapProduct)
  };
}

export async function fetchProductById(id: number): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  const data = await res.json();
  return mapProduct(data);
}

export async function fetchCategories(): Promise<{ en: string; ar: string }[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  const data = await res.json();
  return data.map((c: any) => ({ en: c.name_en, ar: c.name_ar }));
}

export async function fetchOverviewStats() {
  // We can derive this from the full product list for now (or build an endpoint later)
  const res = await fetch(`${API_URL}/api/products?pageSize=1000`);
  const data: ProductListResult = await res.json();
  const products = data.data;

  const inStock = products.filter((p) => p.inStock).length;
  const featured = products.filter((p) => p.featured).length;
  const avgRating = products.length === 0 ? 0 : Math.round((products.reduce((sum, p) => sum + p.rating, 0) / products.length) * 10) / 10;
  const totalReviews = products.reduce((sum, p) => sum + p.reviews, 0);

  const byCategory = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const recent = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return {
    total: products.length,
    inStock,
    outOfStock: products.length - inStock,
    featured,
    avgRating,
    totalReviews,
    byCategory,
    recent,
  };
}

export async function duplicateProduct(product: Product): Promise<Product> {
  // Create the new DB record first (no images yet) to get a real ID
  const newProduct = await createProduct({
    title: product.title,
    titleAr: product.titleAr,
    description: product.description,
    descriptionAr: product.descriptionAr,
    price: product.price,
    discount: product.discount,
    category: product.category,
    categoryAr: product.categoryAr,
    featured: product.featured,
    whatsNumber: product.whatsNumber,
    rating: product.rating,
    reviews: product.reviews,
    inStock: product.inStock,
    tags: product.tags,
    images: [],
  });

  // Physically copy each image into the new product's own folder
  const copiedUrls: string[] = [];
  for (const url of product.images) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
      const file = new File([blob], `image.${ext}`, { type: blob.type });
      const newUrl = await uploadProductImage(file, String(newProduct.id));
      copiedUrls.push(newUrl);
    } catch {
      // If a single image copy fails, skip it
    }
  }

  // Update the new product record with the copied image URLs
  if (copiedUrls.length > 0) {
    return updateProduct(newProduct.id, { images: copiedUrls });
  }
  return newProduct;
}

export async function createProduct(payload: ProductInsert): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: payload.title,
      title_ar: payload.titleAr,
      description: payload.description,
      description_ar: payload.descriptionAr,
      price: payload.price,
      discount: payload.discount,
      category: payload.category,
      category_ar: payload.categoryAr,
      featured: payload.featured,
      whats_number: payload.whatsNumber,
      rating: payload.rating,
      reviews: payload.reviews,
      in_stock: payload.inStock,
      tags: payload.tags,
      images: payload.images
    }),
  });
  if (!res.ok) throw new Error('Failed to create product');
  const data = await res.json();
  return mapProduct(data);
}

export async function updateProduct(id: number, payload: ProductUpdate): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: payload.title,
      title_ar: payload.titleAr,
      description: payload.description,
      description_ar: payload.descriptionAr,
      price: payload.price,
      discount: payload.discount,
      category: payload.category,
      category_ar: payload.categoryAr,
      featured: payload.featured,
      whats_number: payload.whatsNumber,
      rating: payload.rating,
      reviews: payload.reviews,
      in_stock: payload.inStock,
      tags: payload.tags,
      images: payload.images
    }),
  });
  if (!res.ok) throw new Error('Failed to update product');
  const data = await res.json();
  return mapProduct(data);
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete product');
}

export async function deleteProductFolder(_folderName: string): Promise<void> {
  // Not strictly needed anymore, our backend image delete handles specific keys
}

export async function copyImagesToFolder(
  sourceUrls: string[],
  _destFolder: string,
): Promise<string[]> {
  // In a real scenario we'd do a server-side copy via the API
  return sourceUrls;
}

export async function uploadProductImage(file: File, productKey: string): Promise<string> {
  let fileToUpload = file;
  try {
    fileToUpload = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 1000 });
  } catch (error) {
    console.error('Error compressing image:', error);
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('productKey', productKey);

  const token = useAuthStore.getState().session?.access_token;

  const res = await fetch(`${API_URL}/api/images/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });

  if (!res.ok) throw new Error('Failed to upload image');
  const data = await res.json();
  return data.url;
}

/**
 * Delete individual image files from R2 by their public URLs.
 * Used when editing a product and swapping one image for another.
 */
export async function deleteImagesFromStorage(urls: string[]): Promise<void> {
  for (const url of urls) {
    // Extract R2 key from the public URL, e.g.
    // https://pub-xxx.r2.dev/products/42/uuid.jpg -> products/42/uuid.jpg
    const key = url.split('/').slice(3).join('/');
    if (!key) continue;

    await fetch(`${API_URL}/api/images/delete`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ key }),
    });
  }
}

/**
 * Delete the entire R2 folder for a product: products/{productId}/
 * Used when a product is permanently deleted.
 */
export async function deleteFolderFromStorage(productId: number): Promise<void> {
  await fetch(`${API_URL}/api/images/delete-folder`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ productId }),
  });
}
