import { useEffect, useState } from 'react'
import { X, Receipt, Banknote, CreditCard, Clock, ChefHat, CheckCircle } from 'lucide-react'
import { subscribeToTableOrders } from '../../services/orders'
import { requestBill } from '../../services/tables'
import { RESTAURANT } from '../../config/restaurant'

const STATUS_LABEL = {
  pending:   { label: 'Pendiente',  icon: Clock,        color: 'text-yellow-600 bg-yellow-50' },
  preparing: { label: 'Preparando', icon: ChefHat,      color: 'text-blue-600 bg-blue-50'    },
  delivered: { label: 'Entregado',  icon: CheckCircle,  color: 'text-green-600 bg-green-50'  },
}

export function MyOrders({ open, onClose, table, tableData }) {
  const [orders, setOrders] = useState([])
  const [requesting, setRequesting] = useState(false)
  const [payStep, setPayStep] = useState(false)

  useEffect(() => {
    if (!table) return
    const since = tableData?.openedAt ?? 0
    const unsub = subscribeToTableOrders(table, setOrders, since)
    return unsub
  }, [table])

  const total = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)
  const billRequested = tableData?.status === 'bill_requested'

  async function handleRequestBill(method) {
    setRequesting(true)
    try {
      await requestBill(table, method)
      setPayStep(false)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--color-secondary)' }}>
          <div className="flex items-center gap-2 text-white">
            <Receipt size={20} />
            <span className="font-bold">Mis pedidos · Mesa {table}</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={22} /></button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Receipt size={48} strokeWidth={1} />
              <p className="text-sm">Aún no has hecho ningún pedido</p>
            </div>
          ) : (
            orders.map(order => {
              const s = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending
              const Icon = s.icon
              return (
                <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${s.color}`}>
                      <Icon size={12} /> {s.label}
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {order.items?.map((item, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{item.qty}× {item.name}</span>
                        <span>{(item.price * item.qty).toFixed(2)} {RESTAURANT.currency}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-semibold text-sm">
                    <span>Subtotal</span>
                    <span style={{ color: 'var(--color-primary)' }}>{order.total?.toFixed(2)} {RESTAURANT.currency}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {orders.length > 0 && (
          <div className="p-4 border-t bg-white space-y-3">
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total consumido</span>
              <span style={{ color: 'var(--color-primary)' }}>{total.toFixed(2)} {RESTAURANT.currency}</span>
            </div>

            {billRequested ? (
              <div className="rounded-xl p-3 bg-green-50 border border-green-200 text-center">
                <p className="text-sm font-semibold text-green-700">✅ Cuenta solicitada</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Pago: {tableData?.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}
                </p>
                <p className="text-xs text-gray-400 mt-1">El personal se acercará enseguida</p>
              </div>
            ) : payStep ? (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600 font-medium">¿Cómo vas a pagar?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRequestBill('cash')}
                    disabled={requesting}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    <Banknote size={22} className="text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Efectivo</span>
                  </button>
                  <button
                    onClick={() => handleRequestBill('card')}
                    disabled={requesting}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <CreditCard size={22} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Tarjeta</span>
                  </button>
                </div>
                <button onClick={() => setPayStep(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">Cancelar</button>
              </div>
            ) : (
              <button
                onClick={() => setPayStep(true)}
                className="w-full py-3 rounded-xl text-white font-bold text-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Pedir la cuenta
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
