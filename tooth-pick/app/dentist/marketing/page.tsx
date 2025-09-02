'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CampaignManager from '@/components/CampaignManager';
import PromoManager from '@/components/PromoManager';

interface MarketingOverview {
  campaigns: {
    totalCampaigns: number;
    sentCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
  };
  promotions: {
    totalPromos: number;
    activePromos: number;
    totalViews: number;
    totalClicks: number;
    totalConversions: number;
    avgCTR: number;
  };
  totalReach: number;
  overallEngagement: {
    emailEngagement: number;
    promoEngagement: number;
    totalConversions: number;
  };
}

export default function MarketingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'promotions'>('overview');
  const [overview, setOverview] = useState<MarketingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user?.role !== 'dentist') {
      router.push('/');
      return;
    }

    checkAccess();
    loadOverview();
  }, [session, status]);

  const checkAccess = async () => {
    try {
      // Verificar si tiene plan Pro o Elite haciendo una llamada de prueba
      const response = await fetch('/api/marketing/campaigns?limit=1');
      
      if (response.status === 403) {
        setHasAccess(false);
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };

  const loadOverview = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas generales
      const [campaignsRes, promosRes] = await Promise.all([
        fetch('/api/marketing/campaigns?limit=1'),
        fetch('/api/marketing/highlights?includeInactive=true')
      ]);

      if (campaignsRes.ok && promosRes.ok) {
        const campaignsData = await campaignsRes.json();
        const promosData = await promosRes.json();

        if (campaignsData.success && promosData.success) {
          // Simular overview completo (en una implementación real vendría de una API específica)
          const mockOverview: MarketingOverview = {
            campaigns: campaignsData.data.stats || {
              totalCampaigns: 0,
              sentCampaigns: 0,
              totalSent: 0,
              totalOpened: 0,
              totalClicked: 0,
              avgOpenRate: 0,
              avgClickRate: 0
            },
            promotions: {
              totalPromos: promosData.data.promotions.length,
              activePromos: promosData.data.promotions.filter((p: any) => p.isActive && new Date(p.visibleUntil) > new Date()).length,
              totalViews: promosData.data.promotions.reduce((sum: number, p: any) => sum + p.metrics.views, 0),
              totalClicks: promosData.data.promotions.reduce((sum: number, p: any) => sum + p.metrics.clicks, 0),
              totalConversions: promosData.data.promotions.reduce((sum: number, p: any) => sum + p.metrics.conversions, 0),
              avgCTR: promosData.data.promotions.length > 0 ? 
                promosData.data.promotions.reduce((sum: number, p: any) => sum + p.metrics.ctr, 0) / promosData.data.promotions.length : 0
            },
            totalReach: 0,
            overallEngagement: {
              emailEngagement: 0,
              promoEngagement: 0,
              totalConversions: 0
            }
          };

          mockOverview.totalReach = mockOverview.campaigns.totalSent + mockOverview.promotions.totalViews;
          mockOverview.overallEngagement = {
            emailEngagement: mockOverview.campaigns.avgOpenRate,
            promoEngagement: mockOverview.promotions.avgCTR,
            totalConversions: mockOverview.promotions.totalConversions
          };

          setOverview(mockOverview);
        }
      }
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Funcionalidad Premium
          </h1>
          <p className="text-gray-600 mb-6">
            El módulo de marketing está disponible para clínicas con plan <strong>Pro</strong> o <strong>Elite</strong>.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/subscription')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
            >
              Actualizar Plan
            </button>
            <button
              onClick={() => router.push('/dentist/dashboard')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium"
            >
              Volver al Dashboard
            </button>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Funcionalidades incluidas:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Campañas de email marketing</li>
              <li>• Promociones destacadas</li>
              <li>• Segmentación de pacientes</li>
              <li>• Métricas de rendimiento</li>
              <li>• Notificaciones automáticas</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Centro de Marketing</h1>
              <p className="text-gray-600">Gestiona tus campañas y promociones</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Plan: <span className="font-medium text-blue-600">Pro/Elite</span>
              </span>
              <button
                onClick={() => router.push('/dentist/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Volver al Dashboard
              </button>
            </div>
          </div>

          {/* Navegación de tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Resumen', icon: '📊' },
                { id: 'campaigns', label: 'Campañas', icon: '📧' },
                { id: 'promotions', label: 'Promociones', icon: '🎯' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : overview ? (
              <>
                {/* Métricas principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Alcance Total</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.totalReach.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">👥</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Campañas Enviadas</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.campaigns.sentCampaigns}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📧</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Promociones Activas</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.promotions.activePromos}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🎯</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Conversiones</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.overallEngagement.totalConversions}</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráficos de rendimiento */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Rendimiento de Campañas</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tasa de Apertura</span>
                        <span className="font-medium">{overview.campaigns.avgOpenRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(overview.campaigns.avgOpenRate, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tasa de Clics</span>
                        <span className="font-medium">{overview.campaigns.avgClickRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(overview.campaigns.avgClickRate * 4, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Rendimiento de Promociones</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">CTR Promedio</span>
                        <span className="font-medium">{overview.promotions.avgCTR.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(overview.promotions.avgCTR * 2, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total de Vistas</span>
                        <span className="font-medium">{overview.promotions.totalViews.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('campaigns')}
                      className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📧</span>
                        <div>
                          <h4 className="font-medium">Nueva Campaña</h4>
                          <p className="text-sm text-gray-600">Crear campaña de email</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('promotions')}
                      className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎯</span>
                        <div>
                          <h4 className="font-medium">Nueva Promoción</h4>
                          <p className="text-sm text-gray-600">Crear promoción destacada</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => window.open('/patient/dashboard', '_blank')}
                      className="p-4 border border-green-200 rounded-lg hover:bg-green-50 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👁</span>
                        <div>
                          <h4 className="font-medium">Vista Paciente</h4>
                          <p className="text-sm text-gray-600">Ver como paciente</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Error cargando datos</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && <CampaignManager />}
        {activeTab === 'promotions' && <PromoManager />}
      </div>
    </div>
  );
}
