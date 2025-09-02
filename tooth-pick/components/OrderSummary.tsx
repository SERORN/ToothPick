'use client';

import { calculatePlatformFee, getFeePercentageString, calculateSellerAmount } from '@/lib/config/fees';

interface OrderSummaryProps {
  subtotal: number;
  currency?: string;
  orderType?: 'b2b' | 'b2c';
  showBreakdown?: boolean;
  className?: string;
}

export default function OrderSummary({ 
  subtotal, 
  currency = 'MXN', 
  orderType = 'b2b',
  showBreakdown = true,
  className = ''
}: OrderSummaryProps) {
  const platformFee = calculatePlatformFee(subtotal, orderType);
  const total = subtotal + platformFee;
  const sellerAmount = calculateSellerAmount(subtotal, orderType);
  const feePercentage = getFeePercentageString(orderType);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getOrderTypeLabel = () => {
    return orderType === 'b2c' ? 'Cliente Final → Distribuidor' : 'Distribuidor → Proveedor';
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        💰 Resumen de Orden
      </h3>
      
      {showBreakdown && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            📊 Tipo: <span className="font-medium">{getOrderTypeLabel()}</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-700">
          <span>Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {/* Comisión ToothPick */}
        <div className="flex justify-between text-blue-600">
          <span>Comisión ToothPick ({feePercentage}):</span>
          <span className="font-medium">+{formatCurrency(platformFee)}</span>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-200 my-2"></div>

        {/* Total */}
        <div className="flex justify-between text-lg font-bold text-gray-900">
          <span>Total a Pagar:</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {/* Breakdown adicional para proveedores */}
        {showBreakdown && orderType === 'b2b' && (
          <div className="mt-4 p-3 bg-green-50 rounded-md">
            <p className="text-green-800 text-sm font-medium mb-1">
              💵 Desglose para Proveedor:
            </p>
            <div className="flex justify-between text-green-700 text-sm">
              <span>Recibes (después de comisión):</span>
              <span className="font-medium">{formatCurrency(sellerAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600 text-xs mt-1">
              <span>ToothPick retiene:</span>
              <span>{formatCurrency(platformFee)}</span>
            </div>
          </div>
        )}

        {/* Breakdown para B2C (futuro) */}
        {showBreakdown && orderType === 'b2c' && (
          <div className="mt-4 p-3 bg-purple-50 rounded-md">
            <p className="text-purple-800 text-sm font-medium mb-1">
              🛒 Compra B2C (Cliente Final):
            </p>
            <div className="flex justify-between text-purple-700 text-sm">
              <span>Distribuidor recibe:</span>
              <span className="font-medium">{formatCurrency(sellerAmount)}</span>
            </div>
            <div className="flex justify-between text-purple-600 text-xs mt-1">
              <span>Comisión plataforma:</span>
              <span>{formatCurrency(platformFee)} ({feePercentage})</span>
            </div>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="mt-4 p-2 bg-blue-50 rounded-md">
        <p className="text-blue-700 text-xs">
          ℹ️ Las comisiones se procesan automáticamente via Stripe Connect.
          {orderType === 'b2b' && ' El proveedor recibe el pago directamente en su cuenta bancaria.'}
          {orderType === 'b2c' && ' El distribuidor recibe el pago directamente en su cuenta bancaria.'}
        </p>
      </div>
    </div>
  );
}
