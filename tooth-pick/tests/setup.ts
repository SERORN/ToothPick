// 🧪 FASE 28.2: Setup de Testing Environment
// ✅ Configuración global para todas las pruebas

import '@testing-library/jest-dom';
import React from 'react';
import { fetch, Request, Response } from 'undici';
import { server } from './mocks/server';

// Polyfills globales
global.fetch = fetch as any;
global.Request = Request as any;
global.Response = Response as any;

// Variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/toothpick-test';
process.env.FACTURAMA_API_URL = 'https://apisandbox.facturama.mx';
process.env.FACTURAMA_USERNAME = 'test-username';
process.env.FACTURAMA_PASSWORD = 'test-password';

// Mock global de fetch
global.fetch = jest.fn();

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/test',
    query: {},
    asPath: '/test',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Mock de next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'dentista',
        organizacionId: 'test-org-id',
        preferredLanguage: 'es',
        preferredCurrency: 'MXN',
      },
      expires: '2025-12-31',
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock de react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock de framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      return React.createElement('div', props, children);
    },
    span: ({ children, ...props }: any) => {
      return React.createElement('span', props, children);
    },
    button: ({ children, ...props }: any) => {
      return React.createElement('button', props, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Setup y teardown del MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Console warnings para development
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
        args[0].includes('ReactDOM.render') ||
        args[0].includes('act('))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Aumentar timeout para pruebas de integración
jest.setTimeout(30000);
