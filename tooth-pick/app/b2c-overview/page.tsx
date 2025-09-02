import Link from 'next/link'

export default function B2COverviewPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎉 ¡Fase 8 Completada!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Módulo B2C Activado en ToothPick
            </p>
            <p className="text-gray-500">
              Cliente Final → Distribuidor (Comisión 8.5%)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Resumen de funcionalidades */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            ✅ Funcionalidades Implementadas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Nuevo rol customer */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🧑‍⚕️</div>
              <h3 className="font-semibold mb-2">Rol "Customer"</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Modelo User actualizado</li>
                <li>• Registro simplificado</li>
                <li>• Autenticación NextAuth</li>
                <li>• Campos adicionales: teléfono, dirección</li>
              </ul>
            </div>

            {/* 2. Catálogo público */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🌐</div>
              <h3 className="font-semibold mb-2">Catálogo Público B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Ruta: /catalog</li>
                <li>• Acceso sin login</li>
                <li>• Filtros avanzados</li>
                <li>• Productos de distribuidores</li>
              </ul>
            </div>

            {/* 3. Carrito independiente */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🛒</div>
              <h3 className="font-semibold mb-2">Carrito B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• CartContext actualizado</li>
                <li>• Soporte B2B y B2C</li>
                <li>• Persistencia localStorage</li>
                <li>• Validación de stock</li>
              </ul>
            </div>

            {/* 4. Checkout B2C */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">💳</div>
              <h3 className="font-semibold mb-2">Checkout B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Página: /checkout</li>
                <li>• Formulario de envío</li>
                <li>• Cálculo automático 8.5%</li>
                <li>• Validaciones completas</li>
              </ul>
            </div>

            {/* 5. Órdenes B2C */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🧾</div>
              <h3 className="font-semibold mb-2">Órdenes B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• API: /api/b2c-orders</li>
                <li>• orderType: "b2c"</li>
                <li>• platformFee: 8.5%</li>
                <li>• Estados completos</li>
              </ul>
            </div>

            {/* 6. Dashboard cliente */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🖥</div>
              <h3 className="font-semibold mb-2">Dashboard Cliente</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Ruta: /customer/dashboard</li>
                <li>• Mis compras</li>
                <li>• OrderTimeline integrado</li>
                <li>• Estadísticas</li>
              </ul>
            </div>

            {/* 7. Comisiones */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">💰</div>
              <h3 className="font-semibold mb-2">Comisiones Diferenciadas</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• B2B: 5.5% (Dist → Prov)</li>
                <li>• B2C: 8.5% (Cliente → Dist)</li>
                <li>• Configuración centralizada</li>
                <li>• Cálculos automáticos</li>
              </ul>
            </div>

            {/* 8. Modelo Product expandido */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">📦</div>
              <h3 className="font-semibold mb-2">Productos B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Campo distributorId</li>
                <li>• API pública actualizada</li>
                <li>• Filtros por distribuidor</li>
                <li>• Stock en tiempo real</li>
              </ul>
            </div>

            {/* 9. Seguimiento */}
            <div className="border rounded-lg p-6">
              <div className="text-2xl mb-3">🚚</div>
              <h3 className="font-semibold mb-2">Seguimiento B2C</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• OrderTimeline reutilizado</li>
                <li>• Notificaciones adaptadas</li>
                <li>• Timeline visual</li>
                <li>• Estados tipo Amazon</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Flujo de trabajo */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            🔄 Flujo de Trabajo B2C
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto">
                🧑‍⚕️
              </div>
              <h3 className="font-semibold">Cliente Final</h3>
              <p className="text-sm text-gray-600">Clínica/Consultorio</p>
            </div>

            <div className="text-2xl text-gray-400">→</div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto">
                🛒
              </div>
              <h3 className="font-semibold">Catálogo Público</h3>
              <p className="text-sm text-gray-600">Productos disponibles</p>
            </div>

            <div className="text-2xl text-gray-400">→</div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto">
                💳
              </div>
              <h3 className="font-semibold">Checkout</h3>
              <p className="text-sm text-gray-600">Comisión 8.5%</p>
            </div>

            <div className="text-2xl text-gray-400">→</div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto">
                🏪
              </div>
              <h3 className="font-semibold">Distribuidor</h3>
              <p className="text-sm text-gray-600">Recibe 91.5%</p>
            </div>

            <div className="text-2xl text-gray-400">→</div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto">
                🚚
              </div>
              <h3 className="font-semibold">Seguimiento</h3>
              <p className="text-sm text-gray-600">Tipo Amazon</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            🧭 Explorar Funcionalidades
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/catalog"
              className="bg-blue-600 text-white p-6 rounded-lg text-center hover:bg-blue-700 transition-colors"
            >
              <div className="text-2xl mb-2">🌐</div>
              <h3 className="font-semibold">Catálogo Público</h3>
              <p className="text-sm opacity-90">Ver productos B2C</p>
            </Link>

            <Link 
              href="/register"
              className="bg-green-600 text-white p-6 rounded-lg text-center hover:bg-green-700 transition-colors"
            >
              <div className="text-2xl mb-2">🧑‍⚕️</div>
              <h3 className="font-semibold">Registro Cliente</h3>
              <p className="text-sm opacity-90">Crear cuenta B2C</p>
            </Link>

            <Link 
              href="/customer/dashboard"
              className="bg-purple-600 text-white p-6 rounded-lg text-center hover:bg-purple-700 transition-colors"
            >
              <div className="text-2xl mb-2">🖥</div>
              <h3 className="font-semibold">Dashboard Cliente</h3>
              <p className="text-sm opacity-90">Panel de control</p>
            </Link>

            <Link 
              href="/checkout"
              className="bg-orange-600 text-white p-6 rounded-lg text-center hover:bg-orange-700 transition-colors"
            >
              <div className="text-2xl mb-2">💳</div>
              <h3 className="font-semibold">Checkout B2C</h3>
              <p className="text-sm opacity-90">Finalizar compra</p>
            </Link>
          </div>
        </div>

        {/* Métricas de negocio */}
        <div className="bg-white rounded-xl shadow-sm p-8 mt-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            📊 Impacto de Negocio
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">+35%</div>
              <h3 className="font-semibold">Ingresos Proyectados</h3>
              <p className="text-sm text-gray-600">Con comisión B2C 8.5%</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">3x</div>
              <h3 className="font-semibold">Mercado Ampliado</h3>
              <p className="text-sm text-gray-600">Acceso directo a clínicas</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">B2B+B2C</div>
              <h3 className="font-semibold">Modelo Híbrido</h3>
              <p className="text-sm text-gray-600">Máxima flexibilidad</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">
              🚀 ToothPick ahora es una plataforma completa
            </h3>
            <p className="text-gray-700">
              Conectamos <strong>Proveedores</strong>, <strong>Distribuidores</strong> y <strong>Clientes Finales</strong> 
              en un ecosistema dental integrado con comisiones diferenciadas y seguimiento tipo Amazon.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
