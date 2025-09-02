'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { toast } from 'react-hot-toast'

// Tipos para el carrito
interface CartItem {
  productId: string
  name: string
  brand: string
  price: number
  currency: string
  image?: string
  quantity: number
  maxStock: number
  
  // 🏭 Para B2B (distribuidor comprando a proveedor)
  provider?: {
    id: string
    name: string
  }
  
  // 🏪 Para B2C (cliente comprando a distribuidor)
  distributorId?: string
  distributorName?: string
}

interface CartState {
  items: CartItem[]
  totalItems: number
  totalAmount: number
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  isOpen: false
}

// Reducer del carrito
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.items.find(item => item.productId === action.payload.productId)
      
      let newItems: CartItem[]
      
      if (existingItem) {
        // Si el producto ya existe, incrementar cantidad
        if (existingItem.quantity >= existingItem.maxStock) {
          toast.error('No hay suficiente stock disponible')
          return state
        }
        
        newItems = state.items.map(item =>
          item.productId === action.payload.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // Agregar nuevo producto
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }
      
      const totalItems = newItems.reduce((total, item) => total + item.quantity, 0)
      const totalAmount = newItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      }
    }
    
    case 'REMOVE_FROM_CART': {
      const newItems = state.items.filter(item => item.productId !== action.payload)
      const totalItems = newItems.reduce((total, item) => total + item.quantity, 0)
      const totalAmount = newItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      }
    }
    
    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload
      
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_FROM_CART', payload: productId })
      }
      
      const item = state.items.find(item => item.productId === productId)
      if (item && quantity > item.maxStock) {
        toast.error('No hay suficiente stock disponible')
        return state
      }
      
      const newItems = state.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
      
      const totalItems = newItems.reduce((total, item) => total + item.quantity, 0)
      const totalAmount = newItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      }
    }
    
    case 'CLEAR_CART': {
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalAmount: 0
      }
    }
    
    case 'TOGGLE_CART': {
      return {
        ...state,
        isOpen: !state.isOpen
      }
    }
    
    case 'LOAD_CART': {
      const totalItems = action.payload.reduce((total, item) => total + item.quantity, 0)
      const totalAmount = action.payload.reduce((total, item) => total + (item.price * item.quantity), 0)
      
      return {
        ...state,
        items: action.payload,
        totalItems,
        totalAmount
      }
    }
    
    default:
      return state
  }
}

// Context
const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addToCart: (product: any) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
} | null>(null)

// Provider
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    const savedCart = localStorage.getItem('tooth-pick-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: parsedCart })
      } catch (error) {
        console.error('Error cargando carrito:', error)
      }
    }
  }, [])

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('tooth-pick-cart', JSON.stringify(state.items))
  }, [state.items])

  const addToCart = (product: any) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId: product._id || product.productId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        currency: product.currency,
        image: product.images?.[0] || product.image,
        maxStock: product.stock || product.maxStock,
        
        // 🏭 B2B: provider info
        provider: product.provider,
        
        // 🏪 B2C: distributor info
        distributorId: product.distributorId,
        distributorName: product.distributorName
      }
    })
    toast.success(`${product.name} agregado al carrito`)
  }

  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId })
    toast.success('Producto eliminado del carrito')
  }

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
    toast.success('Carrito vaciado')
  }

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' })
  }

  return (
    <CartContext.Provider value={{
      state,
      dispatch,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      toggleCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

// Hook personalizado
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe ser usado dentro de CartProvider')
  }
  return context
}
