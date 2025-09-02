// 🎯 FASE 30: Página Principal del Dashboard de Analytics
// ✅ Dashboard completo de analytics y reportes con todos los componentes

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  // En producción, estos valores vendrían de la sesión del usuario
  const organizationId = 'org-1'; // Mock organization ID
  const userRole = 'admin' as const; // Mock user role

  return (
    <AnalyticsDashboard 
      organizationId={organizationId}
      userRole={userRole}
    />
  );
}
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'currencies' | 'customers' | 'geographic'>('overview');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  const [currency, setCurrency] = useState('USD');
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Configurar fechas por defecto (últimos 30 días)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setDateRange({
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
  }, []);

  // Función para exportar reportes
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      
      // En producción, esto llamaría a un endpoint de exportación
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular export
      
      // Aquí se generaría y descargaría el archivo
      console.log(`Exportando reporte en formato ${format.toUpperCase()}`);
      
      // Crear y descargar archivo mock
      const blob = new Blob([`Reporte de Analytics - ${new Date().toISOString()}`], 
        { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exportando reporte:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    setLastUpdate(new Date());
    // En producción, esto dispararía la recarga de datos en todos los componentes
  };

  // Configuración de tabs según rol del usuario
  const availableTabs = [
    { 
      id: 'overview', 
      label: 'Resumen General', 
      icon: BarChart3,
      roles: ['admin', 'manager', 'viewer']
    },
    { 
      id: 'payments', 
      label: 'Métodos de Pago', 
      icon: DollarSign,
      roles: ['admin', 'manager']
    },
    { 
      id: 'currencies', 
      label: 'Monedas', 
      icon: Globe,
      roles: ['admin', 'manager']
    },
    { 
      id: 'customers', 
      label: 'Clientes', 
      icon: Users,
      roles: ['admin', 'manager', 'viewer']
    },
    { 
      id: 'geographic', 
      label: 'Geografía', 
      icon: Globe,
      roles: ['admin', 'manager']
    }
  ].filter(tab => tab.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del Dashboard */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Analytics</h1>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                FASE 30
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Selector de moneda */}
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="COP">COP</option>
                <option value="CAD">CAD</option>
              </select>

              {/* Botón de refresh */}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* Menú de exportación */}
              {userRole !== 'viewer' && (
                <div className="relative group">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isExporting ? 'Exportando...' : 'Exportar'}
                    </span>
                  </button>
                  
                  {!isExporting && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExport('pdf')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FileText className="w-4 h-4" />
                          Exportar como PDF
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FileText className="w-4 h-4" />
                          Exportar como CSV
                        </button>
                        <button
                          onClick={() => handleExport('excel')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FileText className="w-4 h-4" />
                          Exportar como Excel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros de fecha */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Filtros de Período
              </h2>
              <p className="text-gray-600">Selecciona el rango de fechas para el análisis</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Desde:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Hasta:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="text-xs text-gray-500">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 p-1">
              {availableTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenido del tab activo */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <AnalyticsOverview 
              organizationId={organizationId}
              defaultCurrency={currency}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentChart 
              organizationId={organizationId}
              currency={currency}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'currencies' && (
            <CurrencyBreakdown 
              organizationId={organizationId}
              baseCurrency={currency}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerAnalytics 
              organizationId={organizationId}
              currency={currency}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'geographic' && (
            <GeographicAnalytics 
              organizationId={organizationId}
              currency={currency}
              dateRange={dateRange}
            />
          )}
        </div>

        {/* Footer con información del sistema */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>© 2024 Tooth Pick Analytics</span>
              <span>•</span>
              <span>FASE 30: Dashboard Completo</span>
              <span>•</span>
              <span>Rol: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span>Última sincronización: {lastUpdate.toLocaleString()}</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sistema activo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
