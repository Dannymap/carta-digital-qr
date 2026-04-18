import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Receipt } from 'lucide-react'
import { RESTAURANT } from '../config/restaurant'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { ProductCard } from '../components/common/ProductCard'
import { CartDrawer } from '../components/common/CartDrawer'
import { MyOrders } from '../components/common/MyOrders'
import { Spinner } from '../components/common/Spinner'
import { getCategories } from '../services/categories'
import { subscribeToTable } from '../services/tables'

export default function Menu() {
  const { mesa } = useParams()
  const table = mesa ?? '?'

  const [categories, setCategories] = useState(RESTAURANT.categories)
  const [activeCategory, setActiveCategory] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [tableData, setTableData] = useState(undefined) // undefined=cargando, null=no existe

  const { products, loading, error } = useProducts(activeCategory)
  const { count } = useCart()
  const activeCat = categories.find(c => c.id === activeCategory)

  useEffect(() => {
    getCategories().then(cats => {
      if (cats.length > 0) {
        setCategories(cats)
        setActiveCategory(cats[0].id)
      } else {
        setActiveCategory(RESTAURANT.categories[0]?.id ?? '')
      }
    })
  }, [])

  useEffect(() => {
    const unsub = subscribeToTable(table, setTableData)
    return unsub
  }, [table])

  const tableEnabled = tableData?.status === 'open' || tableData?.status === 'bill_requested'

  // Pantalla de mesa cerrada
  if (tableData === null || (tableData && tableData.status === 'closed')) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-800">Mesa {table} no disponible</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          Esta mesa no está habilitada para realizar pedidos. Por favor, avisa al personal para que la activen.
        </p>
      </div>
    )
  }

  // Cargando estado de mesa
  if (tableData === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-30 text-white shadow-md" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {RESTAURANT.logo
              ? <img src={RESTAURANT.logo} alt={RESTAURANT.name} className="h-8 object-contain" />
              : <span className="text-xl">{RESTAURANT.logoIcon}</span>
            }
            <span className="font-bold text-base">{RESTAURANT.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">Mesa {table}</span>

            <button
              onClick={() => setOrdersOpen(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
            >
              <Receipt size={15} />
              Mis pedidos
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
            >
              <ShoppingBag size={15} />
              Pedir
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Aviso cuenta solicitada */}
      {tableData?.status === 'bill_requested' && (
        <div className="bg-green-500 text-white text-center text-sm py-2 font-medium">
          ✅ Cuenta solicitada · Pago: {tableData.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'} · El personal se acercará enseguida
        </div>
      )}

      {/* Category tabs */}
      <div className="sticky top-14 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === cat.id ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeCat && (
          <h2 className="text-lg font-bold text-gray-800 mb-4">{activeCat.icon} {activeCat.label}</h2>
        )}

        {loading && <Spinner />}

        {error && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">⚠️</p>
            <p>No se pudieron cargar los productos</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p>No hay productos en esta categoría</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t mt-8">
        <p>{RESTAURANT.vatNote} · {RESTAURANT.allergenNote}</p>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} table={table} />
      <MyOrders open={ordersOpen} onClose={() => setOrdersOpen(false)} table={table} tableData={tableData} />
    </div>
  )
}
