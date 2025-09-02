// 🎯 FASE 31: Comparador de Planes de Suscripción
// ✅ Componente para mostrar y comparar planes disponibles

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Star, Zap, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';

interface Plan {
  _id: string;
  name: { [key: string]: string };
  description: { [key: string]: string };
  tier: 'basic' | 'plus' | 'premium';
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  features: {
    maxUsers: number | null;
    maxOrders: number | null;
    maxProducts: number | null;
    features: string[];
  };
  allowedRoles: string[];
  isPopular?: boolean;
}

interface PlanComparisonProps {
  userRole: string;
  currency: string;
  organizationId: string;
  onSelectPlan: (planId: string, billingCycle: 'monthly' | 'annually') => void;
  currentPlanId?: string;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({
  userRole,
  currency,
  organizationId,
  onSelectPlan,
  currentPlanId
}) => {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [userRole, currency]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/subscriptions/plans?role=${userRole}&currency=${currency}`
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar planes');
      }
      
      const data = await response.json();
      setPlans(data.data.plans);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'basic':
        return <Shield className="w-6 h-6" />;
      case 'plus':
        return <Zap className="w-6 h-6" />;
      case 'premium':
        return <Crown className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'basic':
        return 'border-blue-200 bg-blue-50';
      case 'plus':
        return 'border-purple-200 bg-purple-50';
      case 'premium':
        return 'border-gold-200 bg-gradient-to-br from-yellow-50 to-orange-50';
      default:
        return 'border-gray-200';
    }
  };

  const getFeatureList = (features: string[]): { [key: string]: string } => {
    const featureMap: { [key: string]: string } = {
      'basic_catalog': 'Catálogo básico',
      'basic_orders': 'Gestión de pedidos básica',
      'basic_profile': 'Perfil básico',
      'advanced_catalog': 'Catálogo avanzado',
      'inventory_management': 'Gestión de inventario',
      'analytics_basic': 'Analíticas básicas',
      'analytics_advanced': 'Analíticas avanzadas',
      'team_management': 'Gestión de equipo',
      'custom_branding': 'Marca personalizada',
      'api_access': 'Acceso a API',
      'priority_support': 'Soporte prioritario',
      'white_label': 'Marca blanca',
      'custom_integrations': 'Integraciones personalizadas',
      'dedicated_manager': 'Gerente dedicado'
    };

    return features.reduce((acc, feature) => {
      if (featureMap[feature]) {
        acc[feature] = featureMap[feature];
      }
      return acc;
    }, {} as { [key: string]: string });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchPlans} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Elige el Plan Perfecto
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Selecciona el plan que mejor se adapte a las necesidades de tu organización
        </p>
        
        {/* Toggle Anual/Mensual */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className={!isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            Mensual
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-green-600"
          />
          <span className={isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            Anual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2">
              Hasta 20% descuento
            </Badge>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const isCurrentPlan = currentPlanId === plan._id;
          const isPopular = plan.tier === 'plus';
          
          return (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Más Popular
                  </Badge>
                </div>
              )}
              
              <Card className={`h-full ${getTierColor(plan.tier)} ${
                isPopular ? 'ring-2 ring-purple-500 scale-105' : ''
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}>
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      plan.tier === 'basic' ? 'bg-blue-100 text-blue-600' :
                      plan.tier === 'plus' ? 'bg-purple-100 text-purple-600' :
                      'bg-gradient-to-br from-yellow-100 to-orange-100 text-orange-600'
                    }`}>
                      {getTierIcon(plan.tier)}
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl mb-2">
                    {plan.name[session?.user?.preferredLanguage || 'es'] || plan.name.en}
                  </CardTitle>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description[session?.user?.preferredLanguage || 'es'] || plan.description.en}
                  </p>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-gray-900">
                      {formatPrice(price)}
                    </div>
                    <div className="text-gray-500 text-sm">
                      por {isAnnual ? 'año' : 'mes'}
                    </div>
                    {isAnnual && plan.annualSavings > 0 && (
                      <div className="text-green-600 text-sm font-medium mt-1">
                        Ahorras {plan.annualSavings}%
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Límites */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usuarios</span>
                      <span className="font-medium">
                        {plan.features.maxUsers ? plan.features.maxUsers : 'Ilimitados'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pedidos/mes</span>
                      <span className="font-medium">
                        {plan.features.maxOrders ? plan.features.maxOrders : 'Ilimitados'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Productos</span>
                      <span className="font-medium">
                        {plan.features.maxProducts ? plan.features.maxProducts : 'Ilimitados'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {Object.entries(getFeatureList(plan.features.features)).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => onSelectPlan(plan._id, isAnnual ? 'annually' : 'monthly')}
                    disabled={isCurrentPlan}
                    className={`w-full ${
                      isPopular ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' :
                      isCurrentPlan ? 'bg-green-600 hover:bg-green-700' : ''
                    }`}
                    variant={isCurrentPlan ? 'default' : isPopular ? 'default' : 'outline'}
                  >
                    {isCurrentPlan ? 'Plan Actual' : 'Seleccionar Plan'}
                  </Button>
                  
                  {isCurrentPlan && (
                    <p className="text-center text-sm text-green-600 mt-2">
                      Este es tu plan actual
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Features Comparison Table */}
      <div className="mt-16">
        <h3 className="text-2xl font-bold text-center mb-8">
          Comparación Detallada de Características
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Característica</th>
                {plans.map(plan => (
                  <th key={plan._id} className="text-center p-4 font-medium">
                    {plan.name[session?.user?.preferredLanguage || 'es'] || plan.name.en}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Límites */}
              <tr className="border-b">
                <td className="p-4 font-medium">Usuarios máximos</td>
                {plans.map(plan => (
                  <td key={plan._id} className="text-center p-4">
                    {plan.features.maxUsers || '∞'}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium">Pedidos por mes</td>
                {plans.map(plan => (
                  <td key={plan._id} className="text-center p-4">
                    {plan.features.maxOrders || '∞'}
                  </td>
                ))}
              </tr>
              
              {/* Features */}
              {['basic_catalog', 'inventory_management', 'analytics_basic', 'analytics_advanced', 'team_management', 'api_access', 'priority_support'].map(feature => (
                <tr key={feature} className="border-b">
                  <td className="p-4">{getFeatureList([feature])[feature] || feature}</td>
                  {plans.map(plan => (
                    <td key={plan._id} className="text-center p-4">
                      {plan.features.features.includes(feature) ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanComparison;
