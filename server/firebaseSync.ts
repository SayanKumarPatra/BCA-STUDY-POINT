/**
 * Server-side Firebase Realtime Database Sync
 * Synchronizes orders, students, products, banners, packages, offers, and siteSettings
 * directly to https://bcastudypoint-cdfdf-default-rtdb.firebaseio.com
 */

const RTDB_BASE_URL = 'https://bcastudypoint-cdfdf-default-rtdb.firebaseio.com';

async function safeRtdbFetch(endpoint: string, method: string = 'GET', data?: any) {
  try {
    const url = `${RTDB_BASE_URL}/${endpoint}.json`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data !== undefined ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn(`[Firebase RTDB] ${method} ${endpoint} failed with status: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[Firebase RTDB Sync Error] ${method} ${endpoint}:`, err?.message || err);
    return null;
  }
}

export const firebaseSync = {
  /**
   * Sync all products into Firebase Realtime Database
   */
  async syncProducts(products: any[]) {
    const productsMap: Record<string, any> = {};
    for (const p of products) {
      productsMap[p.id] = p;
    }
    return safeRtdbFetch('products', 'PUT', productsMap);
  },

  /**
   * Sync or update a single product
   */
  async syncSingleProduct(product: any) {
    if (!product?.id) return;
    return safeRtdbFetch(`products/${product.id}`, 'PUT', {
      ...product,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a product from RTDB
   */
  async deleteProduct(productId: string) {
    if (!productId) return;
    return safeRtdbFetch(`products/${productId}`, 'DELETE');
  },

  /**
   * Sync banners into Firebase Realtime Database
   */
  async syncBanners(banners: any[]) {
    const bannersMap: Record<string, any> = {};
    for (const b of banners) {
      bannersMap[b.id] = b;
    }
    return safeRtdbFetch('banners', 'PUT', bannersMap);
  },

  /**
   * Fetch banners from Firebase RTDB
   */
  async fetchBanners(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('banners', 'GET');
  },

  /**
   * Sync packages into Firebase Realtime Database
   */
  async syncPackages(packages: any[]) {
    const map: Record<string, any> = {};
    for (const pkg of packages) {
      map[pkg.id] = pkg;
    }
    return safeRtdbFetch('packages', 'PUT', map);
  },

  /**
   * Fetch packages from Firebase RTDB
   */
  async fetchPackages(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('packages', 'GET');
  },

  /**
   * Sync promotional offers into Firebase Realtime Database
   */
  async syncOffers(offers: any[]) {
    const map: Record<string, any> = {};
    for (const o of offers) {
      map[o.id] = o;
    }
    return safeRtdbFetch('offers', 'PUT', map);
  },

  /**
   * Fetch offers from Firebase RTDB
   */
  async fetchOffers(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('offers', 'GET');
  },

  /**
   * Sync website settings & effective package pricing
   */
  async syncSiteSettings(settings: any) {
    return safeRtdbFetch('siteSettings', 'PUT', settings);
  },

  /**
   * Fetch website settings from Firebase RTDB
   */
  async fetchSiteSettings(): Promise<any | null> {
    return safeRtdbFetch('siteSettings', 'GET');
  },

  /**
   * Sync effective package pricing snapshot to RTDB so frontend listeners see live server-validated pricing
   */
  async syncEffectivePricing(effectivePricing: any) {
    return safeRtdbFetch('packagePricing', 'PUT', effectivePricing);
  },

  /**
   * Sync or update a single order
   */
  async syncOrder(order: any) {
    if (!order?.orderId) return;
    return safeRtdbFetch(`orders/${order.orderId}`, 'PUT', {
      ...order,
      syncedAt: new Date().toISOString(),
    });
  },

  /**
   * Sync a student record
   */
  async syncStudent(student: any) {
    if (!student?.id) return;
    return safeRtdbFetch(`students/${student.id}`, 'PATCH', {
      ...student,
      syncedAt: new Date().toISOString(),
    });
  },

  /**
   * Fetch all students currently saved in Firebase Realtime Database
   */
  async fetchStudents(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('students', 'GET');
  },

  /**
   * Update order status (approved or rejected)
   */
  async updateOrderStatus(orderId: string, status: string, additionalData?: any) {
    return safeRtdbFetch(`orders/${orderId}`, 'PATCH', {
      paymentStatus: status,
      updatedAt: new Date().toISOString(),
      ...(additionalData || {}),
    });
  },

  /**
   * Fetch all orders currently saved in Firebase Realtime Database
   */
  async fetchOrders(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('orders', 'GET');
  },

  /**
   * Fetch all products currently saved in Firebase Realtime Database
   */
  async fetchProducts(): Promise<Record<string, any> | null> {
    return safeRtdbFetch('products', 'GET');
  },

  /**
   * Delete order from Firebase Realtime Database
   */
  async deleteOrder(orderId: string) {
    if (!orderId) return;
    return safeRtdbFetch(`orders/${orderId}`, 'DELETE');
  },

  /**
   * Delete student profile from Firebase Realtime Database
   */
  async deleteStudent(studentId: string) {
    if (!studentId) return;
    return safeRtdbFetch(`students/${studentId}`, 'DELETE');
  },

  /**
   * Sync active device session status for single-device enforcement
   */
  async syncActiveDevice(studentId: string, deviceData: any) {
    if (!studentId) return;
    return safeRtdbFetch(`students/${studentId}/activeDevice`, 'PUT', {
      ...deviceData,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Clear active device session upon student logout
   */
  async clearActiveDevice(studentId: string) {
    if (!studentId) return;
    return safeRtdbFetch(`students/${studentId}/activeDevice`, 'DELETE');
  },
};
