import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function makeKey(productId, modifiers = {}) {
  const sorted = Object.keys(modifiers).sort().reduce((acc, k) => {
    acc[k] = modifiers[k]; return acc
  }, {})
  const suffix = Object.keys(sorted).length ? '_' + JSON.stringify(sorted) : ''
  return productId + suffix
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const modifiers = action.modifiers ?? {}
      const cartKey = makeKey(action.product.id, modifiers)
      const existing = state.items.find(i => i.cartKey === cartKey)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.product, qty: 1, cartKey, modifiers }],
      }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.cartKey !== action.cartKey) }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.cartKey === action.cartKey ? { ...i, qty: Math.max(1, action.qty) } : i
        ),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const add = (product, modifiers = {}) => dispatch({ type: 'ADD', product, modifiers })
  const remove = cartKey => dispatch({ type: 'REMOVE', cartKey })
  const updateQty = (cartKey, qty) => dispatch({ type: 'UPDATE_QTY', cartKey, qty })
  const clear = () => dispatch({ type: 'CLEAR' })

  const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = state.items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items: state.items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
