// 🧪 FASE 28.2: Global Setup para Jest
// ✅ Configuración inicial antes de todas las pruebas

export default async function globalSetup() {
  // Configurar variables de entorno para testing
  if (!process.env.NODE_ENV) {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: false });
  }
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/toothpick-test';
  process.env.FACTURAMA_API_URL = 'https://apisandbox.facturama.mx';
  process.env.FACTURAMA_USERNAME = 'test-username';
  process.env.FACTURAMA_PASSWORD = 'test-password';

  console.log('🧪 Jest Global Setup: Environment configured for testing');
}
