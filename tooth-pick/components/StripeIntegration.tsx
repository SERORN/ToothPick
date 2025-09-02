'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface StripeStatus {
  hasStripeAccount: boolean;
  onboardingCompleted: boolean;
  stripeAccountId?: string;
}

export default function StripeIntegration() {
  const { data: session } = useSession();
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'provider') {
      fetchStripeStatus();
    }
  }, [session]);

  const fetchStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/onboarding-link');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStripeAccount = async () => {
    if (!businessName.trim()) {
      alert('Por favor ingresa el nombre de tu negocio');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/stripe/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName })
      });

      const data = await response.json();

      if (response.ok) {
        // Después de crear la cuenta, generar link de onboarding
        await generateOnboardingLink();
      } else {
        alert(data.error || 'Error creando cuenta Stripe');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creando cuenta Stripe');
    } finally {
      setCreating(false);
    }
  };

  const generateOnboardingLink = async () => {
    try {
      const response = await fetch('/api/stripe/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/provider/dashboard`,
          refreshUrl: `${window.location.origin}/provider/dashboard`
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirigir al onboarding de Stripe
        window.location.href = data.onboardingUrl;
      } else {
        alert(data.error || 'Error generando link de onboarding');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error generando link de onboarding');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'provider') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        💳 Configuración de Pagos
      </h3>

      {!stripeStatus?.hasStripeAccount ? (
        // No tiene cuenta Stripe
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
            <span className="text-yellow-800 font-medium">
              Configuración Pendiente
            </span>
          </div>
          <p className="text-yellow-700 text-sm mb-4">
            Para recibir pagos directamente necesitas configurar tu cuenta de Stripe Connect.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de tu negocio
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Dental Supplies México"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={createStripeAccount}
              disabled={creating || !businessName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creando cuenta...' : 'Configurar Pagos'}
            </button>
          </div>
        </div>
      ) : !stripeStatus?.onboardingCompleted ? (
        // Tiene cuenta pero no completó onboarding
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
            <span className="text-orange-800 font-medium">
              Configuración Incompleta
            </span>
          </div>
          <p className="text-orange-700 text-sm mb-4">
            Tu cuenta Stripe está creada pero necesitas completar la configuración.
          </p>
          
          <button
            onClick={generateOnboardingLink}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
          >
            Completar Configuración
          </button>
        </div>
      ) : (
        // Todo configurado
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
            <span className="text-green-800 font-medium">
              ✅ Pagos Configurados
            </span>
          </div>
          <p className="text-green-700 text-sm">
            Tu cuenta está configurada correctamente. Puedes recibir pagos directamente cuando los distribuidores compren tus productos.
          </p>
          
          <div className="mt-4 p-3 bg-green-100 rounded-md">
            <p className="text-green-800 text-sm">
              <span className="font-medium">Comisión ToothPick:</span> 5.5% por transacción B2B
            </p>
            <p className="text-green-800 text-sm">
              <span className="font-medium">Recibes:</span> 94.5% del valor de cada venta
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="text-blue-800 font-medium mb-2">¿Cómo funciona?</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Los distribuidores pagan con tarjeta de crédito/débito</li>
          <li>• ToothPick retiene automáticamente el 5.5% de comisión (B2B)</li>
          <li>• Recibes el 94.5% directamente en tu cuenta bancaria</li>
          <li>• Transferencias automáticas según tu configuración Stripe</li>
        </ul>
      </div>
    </div>
  );
}
