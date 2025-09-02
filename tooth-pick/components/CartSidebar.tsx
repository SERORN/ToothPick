'use client'

import { useCart } from '@/lib/contexts/CartContext'
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CartSidebar() {
  const { state, removeFromCart, updateQuantity, toggleCart, clearCart } = useCart()
  const router = useRouter()

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const handleCheckout = () => {
    toggleCart()
    router.push('/distributor/checkout')
  }

  if (!state.isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={toggleCart}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Carrito de Compras</h2>
          </div>
          <button
            onClick={toggleCart}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tu carrito está vacío</h3>
              <p className="text-gray-600 mb-6">Agrega productos desde el catálogo para comenzar.</p>
              <button
                onClick={() => {
                  toggleCart()
                  router.push('/distributor/dashboard/catalog')
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {state.items.map((item) => (
                <div key={item.productId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex space-x-4">
                    {/* Imagen */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0MkMzNy41MjI4IDQyIDQyIDM3LjUyMjggNDIgMzJDNDIgMjYuNDc3MiAzNy41MjI4IDIyIDMyIDIyQzI2LjQ3NzIgMjIgMjIgMjYuNDc3MiAyMiAzMkMyMiAzNy41MjI4IDI2LjQ3NzIgNDIgMzIgNDJaIiBmaWxsPSIjRTVFN0VCIi8+Cjwvc3ZnPgo='
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.brand}</p>
                      <p className="text-xs text-blue-600">por {item.provider.name}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatPrice(item.price, item.currency)}
                      </p>
                    </div>

                    {/* Eliminar */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <span className="px-3 py-1 bg-white border rounded-lg min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-semibold">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Stock disponible */}
                  <div className="mt-2 text-xs text-gray-500">
                    {item.stock} unidades disponibles
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="border-t bg-white p-6 space-y-4">
            {/* Resumen */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total de productos:</span>
                <span>{state.totalItems} {state.totalItems === 1 ? 'producto' : 'productos'}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatPrice(state.totalAmount, 'MXN')}</span>
              </div>
            </div>

            {/* Botones */}
            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Proceder al Checkout
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    toggleCart()
                    router.push('/distributor/dashboard/catalog')
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  Seguir Comprando
                </button>
                
                <button
                  onClick={clearCart}
                  className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition text-sm"
                >
                  Vaciar Carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
