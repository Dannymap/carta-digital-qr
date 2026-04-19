import { useEffect, useState, useRef } from 'react'
import { ChefHat, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { subscribeToPendingOrders, updateOrderStatus } from '../services/orders'
import { RESTAURANT } from '../config/restaurant'

function elapsed(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  return m < 1 ? '<1m' : `${m}m`
}

export default function Cocina() {
  const [orders, setOrders] = useState([])
  const audioCtx = useRef(null)
  const prevIds = useRef(new Set())

  useEffect(() => {
    const unsub = subscribeToPendingOrders(newOrders => {
      const newIds = new Set(newOrders.map(o => o.id))
      const hasNew = newOrders.some(o => !prevIds.current.has(o.id))
      if (hasNew && prevIds.current.size > 0) playBeep()
      prevIds.current = newIds
      setOrders(newOrders)
    })
    return unsub
  }, [])

  // Refrescar tiempo cada 30s para que el contador de minutos se actualice
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  function playBeep() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx.current
      const notes = [523, 659, 784]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.35)
        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.35)
      })
    } catch {}
  }

  const pending   = orders.filter(o => o.status === 'pending')
  const preparing = orders.filter(o => o.status === 'preparing')

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <div className="flex items-center gap-3">
          <ChefHat size={28} />
          <div>
            <p className="font-bold text-lg leading-none">{RESTAURANT.name}</p>
            <p className="text-sm text-white/70">Pantalla de cocina</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-full font-semibold">
            <Clock size={14} /> {pending.length} pendientes
          </span>
          <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full font-semibold">
            <ChefHat size={14} /> {preparing.length} preparando
          </span>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
        {orders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
            <CheckCircle size={56} strokeWidth={1} />
            <p className="text-xl font-semibold">Sin pedidos pendientes</p>
            <p className="text-sm">Todo al día 🎉</p>
          </div>
        )}

        {/* Pendientes primero, luego preparando */}
        {[...pending, ...preparing].map(order => {
          const isPending = order.status === 'pending'
          const mins = Math.floor((Date.now() - order.createdAt) / 60000)
          const isOld = mins >= 15

          return (
            <div
              key={order.id}
              className={`rounded-2xl border-2 flex flex-col ${
                isPending
                  ? 'bg-yellow-950/40 border-yellow-500/50'
                  : 'bg-blue-950/40 border-blue-500/50'
              } ${isOld ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900' : ''}`}
            >
              {/* Card header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${
                isPending ? 'bg-yellow-500/20' : 'bg-blue-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {isPending
                    ? <Clock size={18} className="text-yellow-400" />
                    : <ChefHat size={18} className="text-blue-400" />
                  }
                  <span className="font-bold text-lg">Mesa {order.table}</span>
                  {order.createdBy === 'admin' && (
                    <span className="text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className={`font-mono font-bold ${isOld ? 'text-red-400' : 'text-gray-300'}`}>
                    {elapsed(order.createdAt)}
                  </span>
                  {isOld && <AlertCircle size={16} className="text-red-400 animate-pulse" />}
                </div>
              </div>

              {/* Items */}
              <ul className="flex-1 px-4 py-3 space-y-2">
                {order.items?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xl font-black leading-none mt-0.5" style={{ color: isPending ? '#fbbf24' : '#60a5fa' }}>
                      {item.qty}×
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-base leading-snug">{item.name}</p>
                      {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                        <ul className="mt-0.5 space-y-0.5">
                          {Object.entries(item.modifiers).map(([group, val]) => (
                            <li key={group} className="text-xs text-gray-400">
                              <span className="text-gray-500">{group}:</span>{' '}
                              <span className="text-yellow-300 font-medium">{Array.isArray(val) ? val.join(', ') : val}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                {isPending && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-colors"
                  >
                    En preparación
                  </button>
                )}
                <button
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-sm transition-colors"
                >
                  ✓ Listo
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
