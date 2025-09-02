'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Settings,
  ChevronRight,
  Shield,
  Calendar
} from 'lucide-react';

interface Organization {
  _id: string;
  name: string;
  description?: string;
  type: 'clinic' | 'distributor';
  ownerId: string;
  members: string[];
  isActive: boolean;
  createdAt: string;
  settings: {
    allowSelfRegistration: boolean;
    requireOwnerApproval: boolean;
    maxMembers: number;
  };
}

interface OrganizationsResponse {
  organizations: Organization[];
  total: number;
  hasMore: boolean;
}

export default function OrganizationsList() {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinic' | 'distributor'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (session) {
      loadOrganizations();
    }
  }, [session, searchTerm, typeFilter, page]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm
      });

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/organizations?${params}`);
      const data: OrganizationsResponse = await response.json();

      if (response.ok) {
        if (page === 1) {
          setOrganizations(data.organizations);
        } else {
          setOrganizations(prev => [...prev, ...data.organizations]);
        }
        setHasMore(data.hasMore);
      } else {
        console.error('Error loading organizations:', data.error);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const handleFilterChange = (filter: 'all' | 'clinic' | 'distributor') => {
    setTypeFilter(filter);
    setPage(1);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'clinic' ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return type === 'clinic' ? 'Clínica' : 'Distribuidor';
  };

  const getTypeBadgeColor = (type: string) => {
    return type === 'clinic' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-green-100 text-green-800 border-green-200';
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando sesión...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizaciones</h1>
            <p className="text-gray-600 mt-2">
              Gestiona las organizaciones y sus permisos
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="h-4 w-4" />
            Nueva Organización
          </button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar organizaciones..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                typeFilter === 'all' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => handleFilterChange('clinic')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                typeFilter === 'clinic' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clínicas
            </button>
            <button
              onClick={() => handleFilterChange('distributor')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                typeFilter === 'distributor' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Distribuidores
            </button>
          </div>
        </div>
      </div>

      {/* Lista de organizaciones */}
      {loading && page === 1 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <div
              key={org._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${getTypeBadgeColor(org.type)}`}>
                      {getTypeIcon(org.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadgeColor(org.type)}`}>
                        {getTypeLabel(org.type)}
                      </span>
                    </div>
                  </div>
                  
                  {org.description && (
                    <p className="text-gray-600 mb-3">{org.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{org.members.length} miembros</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Creado {formatDate(org.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>
                        {org.settings.requireOwnerApproval ? 'Aprobación requerida' : 'Registro libre'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Settings className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}

          {organizations.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron organizaciones
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda' 
                  : 'Crea tu primera organización para comenzar'
                }
              </p>
              {!searchTerm && (
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  <Plus className="h-4 w-4 inline mr-2" />
                  Nueva Organización
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
