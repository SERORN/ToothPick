// Cargar variables de entorno para tests
require('dotenv').config({ path: '.env.test' });

// Polyfills necesarios para Node.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
