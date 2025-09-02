import { NextRequest, NextResponse } from 'next/server';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function POST(request: NextRequest) {
  try {
    // Crear algunos artículos de ejemplo para demostrar el sistema
    const sampleArticles = [
      {
        title: 'Cómo agendar una cita con tu dentista',
        content: `# Cómo agendar una cita con tu dentista

## Pasos para agendar tu cita

1. **Inicia sesión en tu cuenta**
   - Ve a la página de inicio de sesión
   - Ingresa tu email y contraseña
   - Haz clic en "Iniciar Sesión"

2. **Busca tu dentista**
   - Utiliza el buscador en la página principal
   - Filtra por ubicación, especialidad o nombre
   - Revisa las reseñas y calificaciones

3. **Selecciona fecha y hora**
   - Consulta la disponibilidad del dentista
   - Elige el horario que mejor te convenga
   - Confirma los detalles de la cita

## Consejos importantes

> **Recuerda:** Llega 15 minutos antes de tu cita para completar cualquier documentación necesaria.

### Documentos que debes traer:
- Identificación oficial
- Comprobante de seguro (si aplica)
- Historial médico relevante
- Lista de medicamentos actuales

## ¿Necesitas cancelar o reprogramar?

Si necesitas cambiar tu cita, puedes hacerlo desde tu panel de usuario hasta 24 horas antes de la fecha programada.

Para más ayuda, contacta a nuestro equipo de soporte.`,
        excerpt: 'Aprende cómo agendar citas dentales fácilmente en ToothPick. Guía paso a paso para pacientes.',
        role: 'patient',
        category: 'Citas y Agenda',
        tags: ['citas', 'agendar', 'dentista', 'paciente'],
        isFeatured: true,
        isPublished: true,
        seoTitle: 'Cómo agendar cita con dentista - Guía ToothPick',
        seoDescription: 'Guía completa para agendar citas dentales en ToothPick. Proceso simple y rápido para pacientes.'
      },
      {
        title: 'Configuración inicial de tu clínica dental',
        content: `# Configuración inicial de tu clínica dental

## Bienvenido a ToothPick

Esta guía te ayudará a configurar tu clínica dental en ToothPick para comenzar a recibir pacientes.

## Paso 1: Completar tu perfil

### Información básica
- Nombre de la clínica
- Dirección completa
- Teléfono de contacto
- Email profesional
- Horarios de atención

### Servicios y especialidades
- Lista de tratamientos que ofreces
- Precios de consultas
- Especialidades médicas
- Certificaciones profesionales

## Paso 2: Configurar agenda

\`\`\`
1. Define tus horarios disponibles
2. Establece duración de citas por tipo
3. Configura días de descanso
4. Activa notificaciones automáticas
\`\`\`

## Paso 3: Gestión de pacientes

### Sistema de citas
- Aprobación automática o manual
- Tiempo de anticipación mínimo
- Política de cancelaciones
- Recordatorios automáticos

### Historial médico
- Formularios de intake
- Notas de consulta
- Plan de tratamiento
- Seguimiento post-consulta

## Herramientas disponibles

- **Dashboard de analíticas**: Métricas de tu práctica
- **Sistema de facturación**: Integrado con CFDI 4.0
- **Marketing automático**: Campañas para pacientes
- **Marketplace**: Vende productos y tratamientos

¿Necesitas ayuda? Nuestro equipo de soporte está disponible 24/7.`,
        excerpt: 'Guía completa para dentistas sobre cómo configurar su clínica en ToothPick y comenzar a recibir pacientes.',
        role: 'dentist',
        category: 'Configuración',
        tags: ['configuración', 'clínica', 'dentista', 'inicio'],
        isFeatured: true,
        isPublished: true,
        seoTitle: 'Configurar clínica dental en ToothPick - Guía para dentistas',
        seoDescription: 'Aprende a configurar tu clínica dental en ToothPick. Guía completa para dentistas nuevos.'
      },
      {
        title: 'Gestión de inventario para distribuidores',
        content: `# Gestión de inventario para distribuidores

## Panel de control del distribuidor

Como distribuidor en ToothPick, tienes acceso a herramientas avanzadas para gestionar tu inventario y ventas.

## Funciones principales

### 1. Catálogo de productos
- Agregar nuevos productos
- Actualizar precios y disponibilidad
- Gestionar imágenes y descripciones
- Configurar descuentos por volumen

### 2. Control de stock
- Alertas de stock bajo
- Historial de movimientos
- Predicción de demanda
- Reabastecimiento automático

### 3. Gestión de órdenes
- Procesamiento de pedidos
- Seguimiento de envíos
- Facturación automática
- Gestión de devoluciones

## Reportes y análisis

> Los reportes te ayudan a tomar decisiones informadas sobre tu inventario y estrategia de ventas.

### Métricas importantes:
- Productos más vendidos
- Tendencias estacionales
- Márgenes de ganancia
- Satisfacción del cliente

## Integración con clínicas

- Catálogos personalizados por cliente
- Precios especiales por volumen
- Entrega directa a clínicas
- Facturación B2B automatizada

## Soporte técnico

Para resolver cualquier duda sobre la gestión de inventario, contacta a nuestro equipo especializado en distribuidores.`,
        excerpt: 'Herramientas y funciones para distribuidores en ToothPick. Gestiona inventario, órdenes y reportes.',
        role: 'distributor',
        category: 'Inventario',
        tags: ['inventario', 'distribuidor', 'productos', 'gestión'],
        isFeatured: false,
        isPublished: true,
        seoTitle: 'Gestión de inventario distribuidores - ToothPick',
        seoDescription: 'Herramientas completas para distribuidores en ToothPick. Gestiona inventario y ventas eficientemente.'
      }
    ];

    const results = [];

    for (const articleData of sampleArticles) {
      try {
        const article = await KnowledgeBaseService.createArticle(
          articleData,
          'admin' // ID del administrador
        );
        results.push(article);
      } catch (error) {
        console.error('Error creando artículo:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se crearon ${results.length} artículos de ejemplo`,
      articles: results
    });

  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      { error: 'Error creando artículos de ejemplo' },
      { status: 500 }
    );
  }
}
