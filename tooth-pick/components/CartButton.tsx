'use client'

import { useCart } from '@/lib/contexts/CartContext'

export default function CartButton() {
  const { state, toggleCart } = useCart()

  if (state.totalItems === 0) return null

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 z-30 flex items-center space-x-2"
    >
      {/* Ícono del carrito */}
      <div className="relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6.5M7 13h10m0 0L19 19M7 13l-1.5 6.5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
        </svg>
        
        {/* Badge de cantidad */}
        {state.totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {state.totalItems > 99 ? '99+' : state.totalItems}
          </span>
        )}
      </div>

      {/* Texto en desktop */}
      <span className="hidden sm:block font-medium">
        {state.totalItems} {state.totalItems === 1 ? 'producto' : 'productos'}
      </span>
    </button>
  )
}
