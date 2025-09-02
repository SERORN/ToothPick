# 📋 FASE 16: Sistema de Facturación Electrónica CFDI 4.0 - ToothPick

## 🎯 **Descripción General**

Implementación completa de un sistema de facturación electrónica conforme a CFDI 4.0 con integración a Facturama como PAC (Proveedor Autorizado de Certificación) para ToothPick. El sistema maneja automáticamente la facturación de suscripciones SaaS y tratamientos dentales con cumplimiento total del SAT.

## ⚡ **Características Principales**

### ✅ **Funcionalidades Implementadas**
- ✅ **Integración completa con Facturama PAC**
- ✅ **Facturación automática de suscripciones SaaS** 
- ✅ **Facturación de tratamientos dentales**
- ✅ **Cumplimiento CFDI 4.0 y SAT**
- ✅ **Gestión de UUID y Timbre Fiscal Digital**
- ✅ **Cancelación de facturas con motivos SAT**
- ✅ **Webhooks para sincronización en tiempo real**
- ✅ **Interface administrativa completa**
- ✅ **Facturación automática programada**
- ✅ **Generación de PDFs y XML**
- ✅ **Envío automático por email**
- ✅ **Respaldos y auditoría completa**

## 🏗️ **Arquitectura del Sistema**

### 📁 **Estructura de Archivos**
```
lib/
├── facturama.ts                    # Cliente de integración con Facturama
├── cfdiGenerator.ts                # Generador de CFDI por tipo de transacción
├── models/Invoice.ts               # Modelo de factura con estructura CFDI completa
└── services/
    ├── InvoicingService.ts         # Servicio principal de facturación
    └── AutoInvoicingService.ts     # Servicio de facturación automática

app/api/invoice/
├── route.ts                        # API general de gestión de facturas
├── [invoiceId]/route.ts           # API de factura específica
├── saas/route.ts                  # API de facturación SaaS
├── treatment/route.ts             # API de facturación de tratamientos
└── auto-process/route.ts          # API de procesamiento automático

app/api/webhook/
└── facturama/route.ts             # Webhook para eventos de Facturama

components/
└── InvoiceManager.tsx             # Componente de gestión de facturas

app/invoices/
└── page.tsx                       # Página de administración de facturas
```

### 🔧 **Tecnologías Utilizadas**
- **Next.js 15+** - Framework principal
- **TypeScript** - Tipado estático
- **MongoDB + Mongoose** - Base de datos
- **Facturama API** - PAC para timbrado CFDI
- **React + Tailwind CSS** - Interface de usuario
- **Axios** - Cliente HTTP
- **Date-fns** - Manejo de fechas
- **UUID** - Generación de identificadores únicos
- **Crypto-js** - Validación de webhooks

## 🚀 **Guía de Configuración**

### 1️⃣ **Instalación de Dependencias**
```bash
cd tooth-pick
pnpm add axios uuid date-fns crypto-js
pnpm add -D @types/uuid @types/crypto-js
```

### 2️⃣ **Configuración de Variables de Entorno**
Copiar `.env.invoicing.example` a `.env.local` y configurar:

```env
# Facturama Configuration
FACTURAMA_USERNAME=tu_usuario
FACTURAMA_PASSWORD=tu_password
FACTURAMA_SANDBOX=true
FACTURAMA_API_URL=https://apisandbox.facturama.mx
FACTURAMA_WEBHOOK_SECRET=tu_webhook_secret

# Company Information
COMPANY_RFC=ABC123456DEF
COMPANY_NAME=ToothPick México S.A. de C.V.
COMPANY_TAX_REGIME=601
COMPANY_POSTAL_CODE=01000

# Auto Invoicing
AUTO_INVOICING_TOKEN=tu_token_secreto
```

### 3️⃣ **Configuración de Webhooks en Facturama**
1. Acceder al portal de Facturama
2. Configurar webhook URL: `https://tu-dominio.com/api/webhook/facturama`
3. Eventos a escuchar:
   - `invoice.timbrado`
   - `invoice.cancelado`
   - `invoice.error`
   - `invoice.enviado`

### 4️⃣ **Configuración de Cron Jobs**
Para automatización completa, configurar:

```bash
# Facturación automática mensual (día 1 a las 6:00 AM)
0 6 1 * * curl -X POST -H "Authorization: Bearer ${AUTO_INVOICING_TOKEN}" ${NEXTAUTH_URL}/api/invoice/auto-process

# Verificación diaria (9:00 AM)
0 9 * * * curl -X POST -H "Authorization: Bearer ${AUTO_INVOICING_TOKEN}" ${NEXTAUTH_URL}/api/invoice/auto-process
```

## 📊 **Funcionalidades Detalladas**

### 🔄 **Facturación Automática de Suscripciones**
- **Programación**: Automática el día 1 de cada mes
- **Tipos soportados**: Free, Pro, Elite
- **Integración**: Completa con ClinicSubscription
- **Manejo de errores**: Retry automático y logging
- **Configuración fiscal**: Por clínica individual

```typescript
// Ejemplo de uso
const result = await AutoInvoicingService.processAutomaticInvoicing();
console.log(`Procesadas: ${result.successful}/${result.processed}`);
```

### 🦷 **Facturación de Tratamientos Dentales**
- **Códigos SAT**: 86121600 (Servicios de consultorios dentales)
- **Integración**: Con sistema de citas y tratamientos
- **Datos fiscales**: Del paciente o clínica
- **Productos**: Configurables por tratamiento

```typescript
// API para facturar tratamiento
POST /api/invoice/treatment
{
  "appointmentId": "appointment_id",
  "treatmentDetails": { /* detalles */ },
  "receiverData": { /* datos del receptor */ }
}
```

### 📝 **Gestión de Facturas**
- **Estados**: draft, active, cancelled, error, sent
- **Búsqueda y filtros**: Por estado, fecha, RFC, monto
- **Operaciones masivas**: Cancelación, reenvío, descarga
- **Auditoría completa**: Historial de cambios y eventos

### 🔐 **Cumplimiento SAT y Seguridad**
- **CFDI 4.0**: Estructura completa conforme al SAT
- **UUID**: Generación y validación automática
- **Timbre Fiscal Digital**: Integración con Facturama
- **Codes SAT**: 
  - SaaS: 81112500
  - Dental: 86121600
  - Marketplace: 43211500
  - ToothPay: 84111506

## 🎮 **APIs Disponibles**

### 📋 **Gestión General**
```typescript
GET    /api/invoice              # Listar facturas con filtros
POST   /api/invoice              # Crear factura manual
GET    /api/invoice/[id]         # Obtener factura específica
PUT    /api/invoice/[id]         # Actualizar factura
DELETE /api/invoice/[id]         # Cancelar factura
```

### 🔄 **Facturación Específica**
```typescript
POST   /api/invoice/saas         # Facturar suscripción SaaS
POST   /api/invoice/treatment    # Facturar tratamiento dental
POST   /api/invoice/auto-process # Ejecutar facturación automática
GET    /api/invoice/auto-process/stats # Estadísticas
```

### 🪝 **Webhooks**
```typescript
POST   /api/webhook/facturama    # Recibir eventos de Facturama
GET    /api/webhook/facturama/test # Probar webhook
```

## 🎨 **Interface de Usuario**

### 📊 **Dashboard de Facturas** (`/invoices`)
- **Vista general**: Estadísticas y métricas
- **Lista de facturas**: Con filtros avanzados
- **Operaciones**: Crear, ver, cancelar, reenviar
- **Búsqueda**: Por número, RFC, estado, fecha
- **Exportación**: PDF y Excel

### 🔧 **Componente InvoiceManager**
```typescript
// Características del componente
- Paginación inteligente
- Filtros en tiempo real
- Operaciones masivas
- Modales de confirmación
- Indicadores de estado
- Responsive design
```

## 📈 **Estadísticas y Métricas**

### 📊 **Métricas Disponibles**
- **Facturas emitidas**: Por período y estado
- **Ingresos facturados**: Total y por período
- **Tasa de éxito**: Facturación automática
- **Distribución por tipo**: SaaS vs Tratamientos
- **Clínicas activas**: Con facturación habilitada

```typescript
// Ejemplo de estadísticas
const stats = await AutoInvoicingService.getAutoInvoicingStats();
/*
{
  totalSubscriptions: 150,
  autoInvoicingEnabled: 120,
  invoicedThisMonth: 95,
  totalRevenue: 47500,
  averageRevenuePerInvoice: 500,
  successRate: "79.17%"
}
*/
```

## 🛠️ **Mantenimiento y Monitoreo**

### 📝 **Logs y Auditoría**
- **Eventos registrados**: Creación, timbrado, cancelación, errores
- **Formato JSON**: Para análisis automatizado
- **Niveles**: debug, info, warn, error
- **Retención**: Configurable por ambiente

### 🔍 **Troubleshooting Común**

#### ❌ **Error: "RFC no válido"**
```bash
Solución: Verificar formato RFC en datos del receptor
Formato: ABCD123456EFG para personas morales
         ABCD123456HGF para personas físicas
```

#### ❌ **Error: "Código postal no corresponde"**
```bash
Solución: Validar CP en catálogo SAT
El CP debe corresponder al estado/municipio
```

#### ❌ **Error: "Timbre fiscal no válido"**
```bash
Solución: Verificar conexión con Facturama
Revisar credenciales y ambiente (sandbox/prod)
```

### 🔄 **Respaldos y Recuperación**
- **Base de datos**: Respaldo diario automático
- **Archivos PDF/XML**: Almacenamiento seguro
- **Configuración**: Control de versiones
- **Logs**: Rotación automática

## 🧪 **Testing y Desarrollo**

### 🔬 **Ambiente de Pruebas**
```bash
# Configurar ambiente sandbox
FACTURAMA_SANDBOX=true
FACTURAMA_API_URL=https://apisandbox.facturama.mx

# RFC de prueba del SAT
COMPANY_RFC=EKU9003173C9
```

### ✅ **Checklist de Deployment**
- [ ] Variables de entorno configuradas
- [ ] RFC registrado en SAT
- [ ] Certificados instalados (si aplica)
- [ ] Webhooks configurados en Facturama
- [ ] Cron jobs programados
- [ ] Respaldos configurados
- [ ] Monitoreo activo

## 🚀 **Uso en Producción**

### 1️⃣ **Antes del Go-Live**
1. **Configurar ambiente de producción**
2. **Probar facturación con datos reales en sandbox**
3. **Configurar webhooks de producción**
4. **Establecer procesos de respaldo**
5. **Configurar monitoreo y alertas**

### 2️⃣ **Facturación Manual**
```typescript
// Crear factura desde admin
POST /api/invoice
{
  "type": "saas",
  "subscriptionId": "sub_id",
  "customData": { /* datos adicionales */ }
}
```

### 3️⃣ **Monitoreo Continuo**
- **Dashboard**: Métricas en tiempo real
- **Alertas**: Errores y fallos de facturación
- **Reportes**: Mensuales de cumplimiento SAT
- **Auditorías**: Revisión trimestral

## 🎯 **Roadmap Futuro**

### 🔜 **Mejoras Planificadas**
- [ ] **Facturación de marketplace** para productos B2B
- [ ] **Complementos de pago** para tratamientos diferidos
- [ ] **Facturas globales** por período
- [ ] **Integración con contabilidad** externa
- [ ] **Reportes SAT** automatizados
- [ ] **Multi-empresa** para franquicias

### 📊 **Optimizaciones**
- [ ] **Cache de consultas** frecuentes
- [ ] **Compresión de archivos** PDF/XML
- [ ] **CDN** para documentos fiscales
- [ ] **Analytics avanzados** de facturación

## 🤝 **Soporte y Documentación**

### 📚 **Recursos Adicionales**
- [Documentación oficial del SAT](https://www.sat.gob.mx/consultas/factura_electronica/)
- [API de Facturama](https://apisandbox.facturama.mx/docs)
- [Códigos SAT de productos](https://www.sat.gob.mx/consultas/factura_electronica/pagina_06)
- [Regímenes fiscales](https://www.sat.gob.mx/consultas/factura_electronica/pagina_05)

### 🆘 **Contacto de Soporte**
- **Email**: soporte@toothpick.mx
- **Slack**: #facturacion-cfdi
- **Documentación**: Wiki interno

---

## ✅ **Estado del Proyecto**

**FASE 16 - COMPLETADA ✅**

- ✅ **Integración Facturama**: Cliente configurado y funcional
- ✅ **Modelo de datos**: Invoice con estructura CFDI completa
- ✅ **Servicios core**: InvoicingService y AutoInvoicingService
- ✅ **APIs REST**: Endpoints completos para todas las operaciones
- ✅ **Interface UI**: InvoiceManager con funcionalidad completa
- ✅ **Webhooks**: Sincronización automática con Facturama
- ✅ **Automatización**: Facturación programada y cron jobs
- ✅ **Documentación**: Guías completas de configuración y uso

**🚀 Sistema listo para testing en sandbox y deployment a producción**

---

*Documentación generada automáticamente - FASE 16 ToothPick v1.0*
