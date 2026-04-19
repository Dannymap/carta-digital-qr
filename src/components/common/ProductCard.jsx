import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { RESTAURANT } from '../../config/restaurant'

export function ProductCard({ product }) {
  const { add, items } = useCart()
  const [showMods, setShowMods] = useState(false)
  const [selected, setSelected] = useState({})

  const hasModifiers = product.modifiers?.length > 0
  const outOfStock = typeof product.stock === 'number' && product.stock <= 0
  const disabled = !product.active || outOfStock

  const cartCount = items
    .filter(i => i.id === product.id)
    .reduce((s, i) => s + i.qty, 0)

  function handleAdd() {
    if (disabled) return
    if (hasModifiers) {
      setSelected({})
      setShowMods(true)
    } else {
      add(product)
    }
  }

  function toggleOption(groupName, option, multiple) {
    setSelected(prev => {
      if (multiple) {
        const cur = prev[groupName] ?? []
        const next = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option]
        return { ...prev, [groupName]: next }
      }
      return { ...prev, [groupName]: option }
    })
  }

  function canConfirm() {
    return product.modifiers.every(g => {
      if (!g.required) return true
      const val = selected[g.name]
      if (g.multiple) return Array.isArray(val) && val.length > 0
      return !!val
    })
  }

  function confirmMods() {
    add(product, selected)
    setShowMods(false)
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Image */}
        <div className="relative bg-gray-100 aspect-video">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🍽️</div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">Agotado</span>
            </div>
          )}
          {!outOfStock && !product.active && (
            <span className="absolute top-2 left-2 bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full">No disponible</span>
          )}
          {typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5 && (
            <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Últimas {product.stock}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1 gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
              {product.price?.toFixed(2)} {RESTAURANT.currency}
            </span>
            <button
              onClick={handleAdd}
              disabled={disabled}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={14} />
              {cartCount > 0 ? `(${cartCount})` : hasModifiers ? 'Elegir' : 'Añadir'}
            </button>
          </div>
        </div>
      </div>

      {/* Modifier modal */}
      {showMods && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Personaliza tu pedido</p>
              </div>
              <button onClick={() => setShowMods(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {product.modifiers.map(group => (
                <div key={group.name}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-bold text-gray-800">{group.name}</p>
                    {group.required
                      ? <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Obligatorio</span>
                      : <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Opcional</span>
                    }
                    {group.multiple && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Varios</span>}
                  </div>
                  <div className="space-y-1.5">
                    {group.options.map(opt => {
                      const cur = selected[group.name]
                      const active = group.multiple
                        ? (Array.isArray(cur) && cur.includes(opt))
                        : cur === opt
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleOption(group.name, opt, group.multiple)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {opt}
                          {active && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={confirmMods}
                disabled={!canConfirm()}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Añadir al pedido · {product.price?.toFixed(2)} {RESTAURANT.currency}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
