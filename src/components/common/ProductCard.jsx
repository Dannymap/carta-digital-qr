import { Plus } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { RESTAURANT } from '../../config/restaurant'

export function ProductCard({ product }) {
  const { add, items } = useCart()
  const inCart = items.find(i => i.id === product.id)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative bg-gray-100 aspect-video">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
            🍽️
          </div>
        )}
        {!product.active && (
          <span className="absolute top-2 left-2 bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full">
            No disponible
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
            {product.price?.toFixed(2)} {RESTAURANT.currency}
          </span>

          <button
            onClick={() => add(product)}
            disabled={!product.active}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={14} />
            {inCart ? `(${inCart.qty})` : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
  )
}
