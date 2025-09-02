import axios from 'axios';

// Configuración del cliente Facturama
export const facturamaClient = axios.create({
  baseURL: process.env.FACTURAMA_URL || 'https://api.facturama.mx',
  auth: {
    username: process.env.FACTURAMA_API_USERNAME!,
    password: process.env.FACTURAMA_API_PASSWORD!,
  },
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// Interceptor para logs de desarrollo
facturamaClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Facturama Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data ? JSON.stringify(config.data, null, 2) : 'No data'
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ Facturama Request Error:', error);
    return Promise.reject(error);
  }
);

facturamaClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Facturama Response:', {
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ Facturama Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Configuración para sandbox (desarrollo)
export const useSandbox = process.env.NODE_ENV === 'development';

// URLs base según el entorno
export const FACTURAMA_CONFIG = {
  production: {
    baseURL: 'https://api.facturama.mx',
    name: 'Producción'
  },
  sandbox: {
    baseURL: 'https://apisandbox.facturama.mx',
    name: 'Sandbox'
  }
};

// Helper para verificar conexión con Facturama
export const testFacturamaConnection = async (): Promise<boolean> => {
  try {
    const response = await facturamaClient.get('/api-lite/cfdi33/products');
    return response.status === 200;
  } catch (error) {
    console.error('Error testing Facturama connection:', error);
    return false;
  }
};

export default facturamaClient;
