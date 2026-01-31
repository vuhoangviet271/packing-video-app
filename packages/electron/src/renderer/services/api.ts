import axios from 'axios';

const API_BASE_URL = localStorage.getItem('apiUrl') || 'https://pack.spotless.vn';

export const api = axios.create({
  baseURL: API_BASE_URL + '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

export const orderApi = {
  getByShippingCode: (code: string) => api.get('/orders/' + encodeURIComponent(code)),
};

export const videoApi = {
  create: (data: any) => api.post('/videos', data),
  list: (params: any) => api.get('/videos', { params }),
  search: (q: string) => api.get('/videos/search', { params: { q } }),
  exportCsv: (params: any) => api.get('/videos/export', { params, responseType: 'blob' }),
  checkDuplicate: (shippingCode: string, type: string) =>
    api.get('/videos', { params: { shippingCode, type, limit: 1 } }),
};

export const productApi = {
  list: (params?: any) => api.get('/products', { params }),
  getByBarcode: (barcode: string) => api.get('/products/by-barcode/' + encodeURIComponent(barcode)),
  create: (data: any) => api.post('/products', data),
  createCombo: (data: any) => api.post('/products/combo', data),
  update: (id: string, data: any) => api.put('/products/' + id, data),
  delete: (id: string) => api.delete('/products/' + id),
};

export const inventoryApi = {
  packingComplete: (data: any) => api.post('/inventory/packing-complete', data),
  returnComplete: (data: any) => api.post('/inventory/return-complete', data),
  manualAdjust: (data: any) => api.post('/inventory/manual-adjust', data),
};

export const dashboardApi = {
  today: () => api.get('/dashboard/today'),
};
