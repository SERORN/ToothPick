'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Send, Users, Eye, MousePointer, TrendingUp, Plus, Filter, Search } from 'lucide-react';

interface Campaign {
  _id: string;
  title: string;
  description: string;
  audience: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'sending';
  scheduledAt: string;
  sentAt?: string;
  metrics: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  };
  estimatedReach: number;
}

interface MarketingStats {
  totalCampaigns: number;
  sentCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del formulario de nueva campaña
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audience: 'all',
    channel: 'email',
    content: {
      subject: '',
      body: '',
      ctaText: '',
      ctaLink: '',
      imageUrl: ''
    },
    scheduledAt: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/marketing/campaigns?${params}`);
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.data.campaigns);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        loadCampaigns();
        resetForm();
        alert('Campaña creada exitosamente');
      } else {
        alert(data.error || 'Error al crear campaña');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error al crear campaña');
    }
  };

  const executeCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        loadCampaigns();
        alert('Campaña ejecutándose...');
      } else {
        alert(data.error || 'Error al ejecutar campaña');
      }
    } catch (error) {
      console.error('Error executing campaign:', error);
      alert('Error al ejecutar campaña');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      audience: 'all',
      channel: 'email',
      content: {
        subject: '',
        body: '',
        ctaText: '',
        ctaLink: '',
        imageUrl: ''
      },
      scheduledAt: new Date().toISOString().slice(0, 16)
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sending: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'notification':
        return <Send className="w-4 h-4" />;
      case 'sms':
        return <Users className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando campañas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Campañas</p>
                  <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                </div>
                <Send className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Enviadas</p>
                  <p className="text-2xl font-bold">{stats.totalSent}</p>
                </div>
                <Mail className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa Apertura</p>
                  <p className="text-2xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p>
                </div>
                <Eye className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa Clics</p>
                  <p className="text-2xl font-bold">{stats.avgClickRate.toFixed(1)}%</p>
                </div>
                <MousePointer className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Campañas de Marketing
            </CardTitle>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Campaña
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar campañas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="sending">Enviando</SelectItem>
                <SelectItem value="sent">Enviadas</SelectItem>
                <SelectItem value="failed">Fallidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de campañas */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay campañas</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'No se encontraron campañas con ese término' : 'Crea tu primera campaña de marketing'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    Crear Campaña
                  </Button>
                )}
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <Card key={campaign._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getChannelIcon(campaign.channel)}
                          <h3 className="text-lg font-semibold">{campaign.title}</h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-gray-600 mb-3">{campaign.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>Audiencia: {campaign.audience}</span>
                          <span>Canal: {campaign.channel}</span>
                          <span>Alcance: {campaign.estimatedReach} usuarios</span>
                          <span>
                            Programada: {new Date(campaign.scheduledAt).toLocaleDateString()}
                          </span>
                        </div>

                        {campaign.status === 'sent' && (
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <span className="text-green-600">
                              ✓ {campaign.metrics.totalSent} enviados
                            </span>
                            <span className="text-blue-600">
                              👁 {campaign.metrics.totalOpened} abiertos ({campaign.metrics.openRate}%)
                            </span>
                            <span className="text-purple-600">
                              🔗 {campaign.metrics.totalClicked} clics ({campaign.metrics.clickRate}%)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 lg:mt-0">
                        {campaign.status === 'pending' && (
                          <Button
                            onClick={() => executeCampaign(campaign._id)}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Enviar Ahora
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal crear campaña */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Nueva Campaña de Marketing</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ej: Promoción de limpieza dental"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descripción de la campaña..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Audiencia</label>
                    <Select value={formData.audience} onValueChange={(value) => setFormData({...formData, audience: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los pacientes</SelectItem>
                        <SelectItem value="active">Pacientes activos</SelectItem>
                        <SelectItem value="inactive">Pacientes inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Canal</label>
                    <Select value={formData.channel} onValueChange={(value) => setFormData({...formData, channel: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="notification">Notificación</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Asunto del Email</label>
                    <Input
                      value={formData.content.subject}
                      onChange={(e) => setFormData({
                        ...formData,
                        content: {...formData.content, subject: e.target.value}
                      })}
                      placeholder="Asunto del correo electrónico"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Contenido del Mensaje</label>
                  <Textarea
                    value={formData.content.body}
                    onChange={(e) => setFormData({
                      ...formData,
                      content: {...formData.content, body: e.target.value}
                    })}
                    placeholder="Contenido de la campaña... (Puedes usar {nombre} y {clinica} para personalizar)"
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Texto del Botón (Opcional)</label>
                    <Input
                      value={formData.content.ctaText}
                      onChange={(e) => setFormData({
                        ...formData,
                        content: {...formData.content, ctaText: e.target.value}
                      })}
                      placeholder="Ej: Reservar Cita"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Enlace del Botón (Opcional)</label>
                    <Input
                      value={formData.content.ctaLink}
                      onChange={(e) => setFormData({
                        ...formData,
                        content: {...formData.content, ctaLink: e.target.value}
                      })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">URL de Imagen (Opcional)</label>
                  <Input
                    value={formData.content.imageUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      content: {...formData.content, imageUrl: e.target.value}
                    })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fecha y Hora de Envío</label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={createCampaign}>
                  Crear Campaña
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
