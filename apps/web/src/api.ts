export interface Product { id: number; name: string; description: string; category: string; priceCents: number; stock: number; imagePath: string }
export interface CartItem { productId: number; name: string; priceCents: number; quantity: number; stock: number; imagePath: string }
export interface Cart { items: CartItem[]; totalCents: number }
export interface User { id: number; email: string; name: string }
export interface Order { id: number; totalCents: number; status: string; createdAt: string; items?: { productId: number; name: string; priceCents: number; quantity: number }[] }

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('shop_token');
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') localStorage.removeItem('shop_token');
    throw new ApiError(response.status, body.error?.message || '请求失败，请稍后再试');
  }
  return body as T;
}

export const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
