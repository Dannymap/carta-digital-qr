import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingBag, Users, Receipt, Clock, ChefHat, CheckCircle, AlertCircle } from 'lucide-react'
import { subscribeToAllOrders } from '../../services/orders'
import { RESTAURANT } from '../../config/restaurant'

function startOfDay() {
  const d = new Date(); d.setHours(0,0,0,0); return d.getTime()
}
function startOfWeek() {
  const d = new Date(); d.setHours(0,0,0,0)
  d.setDate(d.getDate() - d.getDay()); return d.getTime()
}

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week',  label: 'Esta semana' },
  { id: 'all',   label: 'Total' },
]

export function Dashboard({ tables }) {
  const [orders, setOrders] = useState([])
  const [period, setPeriod] = useState('today')

  useEffect(() => {
    return subscribeToAllOrders(setOrders)
  }, [])

  const today     = startOfDay()
  const weekStart = startOfWeek()

  const filteredOrders = period === 'today'
    ? orders.filter(o => o.createdAt >= today)
    : period === 'week'
    ? orders.filter(o => o.createdAt >= weekStart)
    : orders

  const revenue   = filteredOrders.reduce((s, o) => s + (o.total ?? 0), 0)
  const avgTicket = filteredOrders.length ? revenue / filteredOrders.length : 0

  // Para el subtítulo de ingresos siempre mostramos semana y total
  const revenueWeek  = orders.filter(o => o.createdAt >= weekStart).reduce((s, o) => s + (o.total ?? 0), 0)
  const revenueAll   = orders.reduce((s, o) => s + (o.total ?? 0), 0)

  // Pedidos pendientes ahora mismo (siempre en tiempo real, sin filtro de período)
  const pendingNow   = orders.filter(o => o.status === 'pending').length
  const preparingNow = orders.filter(o => o.status === 'preparing').length

  // Top productos en el período seleccionado
  const productCount = {}
  filteredOrders.forEach(o => o.items?.forEach(item => {
    productCount[item.name] = (productCount[item.name] ?? 0) + item.qty
  }))
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Ingresos por hora del período
  const revenueByHour = {}
  filteredOrders.forEach(o => {
    const h = new Date(o.createdAt).getHours()
    revenueByHour[h] = (revenueByHour[h] ?? 0) + (o.total ?? 0)
  })
  const activeHours = Object.keys(revenueByHour).map(Number).sort((a,b)=>a-b)
  const maxHourRevenue = Math.max(...Object.values(revenueByHour), 1)

  // Estado de mesas
  const openTables    = Object.values(tables).filter(t => t.status === 'open').length
  const billReqTables = Object.values(tables).filter(t => t.status === 'bill_requested').length

  const periodLabel = PERIODS.find(p => p.id === period)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Dashboard</h2>
        {/* Selector de período */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === p.id ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp} color="bg-green-500"
          label={`Ingresos · ${periodLabel}`}
          value={`${revenue.toFixed(2)} ${RESTAURANT.currency}`}
          sub={period === 'today'
            ? `Semana: ${revenueWeek.toFixed(2)} ${RESTAURANT.currency}`
            : `Total acumulado: ${revenueAll.toFixed(2)} ${RESTAURANT.currency}`}
        />
        <KpiCard
          icon={ShoppingBag} color="bg-blue-500"
          label={`Pedidos · ${periodLabel}`}
          value={filteredOrders.length}
          sub={`Ticket medio: ${avgTicket.toFixed(2)} ${RESTAURANT.currency}`}
        />
        <KpiCard
          icon={Users} color="bg-purple-500"
          label="Mesas ocupadas"
          value={openTables + billReqTables}
          sub={billReqTables > 0 ? `${billReqTables} esperando cuenta` : 'Sin cuentas pendientes'}
          alert={billReqTables > 0}
        />
        <KpiCard
          icon={Receipt} color="bg-orange-500"
          label="En cocina ahora"
          value={pendingNow + preparingNow}
          sub={`${pendingNow} pendientes · ${preparingNow} preparando`}
          alert={pendingNow > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingresos por hora */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Ingresos por hora · {periodLabel}</h3>
          {activeHours.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin pedidos en este período</div>
          ) : (
            <div className="space-y-2">
              {activeHours.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {String(h).padStart(2,'0')}:00
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 transition-all"
                      style={{
                        width: `${(revenueByHour[h] / maxHourRevenue) * 100}%`,
                        backgroundColor: 'var(--color-primary)',
                        minWidth: '2rem'
                      }}
                    >
                      <span className="text-white text-[10px] font-semibold whitespace-nowrap">
                        {revenueByHour[h].toFixed(0)} {RESTAURANT.currency}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Productos más pedidos · {periodLabel}</h3>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin datos en este período</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map(([name, qty], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                    style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--color-secondary)' }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{name}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{qty} ud.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado pedidos en tiempo real */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Pedidos activos ahora</h3>
          {pendingNow === 0 && preparingNow === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay pedidos activos</div>
          ) : (
            <div className="space-y-2">
              {orders
                .filter(o => o.status === 'pending' || o.status === 'preparing')
                .sort((a,b) => a.createdAt - b.createdAt)
                .map(o => {
                  const isOld = Date.now() - o.createdAt > 15 * 60 * 1000
                  return (
                    <div key={o.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isOld ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                      {o.status === 'pending'
                        ? <Clock size={15} className="text-yellow-500 flex-shrink-0" />
                        : <ChefHat size={15} className="text-blue-500 flex-shrink-0" />
                      }
                      <span className="text-sm font-medium text-gray-700">Mesa {o.table}</span>
                      <span className="text-xs text-gray-400 flex-1 truncate">
                        {o.items?.map(i => `${i.qty}× ${i.name}`).join(', ')}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {Math.round((Date.now() - o.createdAt) / 60000)}m
                        {isOld && <AlertCircle size={12} className="inline ml-1 text-red-400" />}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Cuentas pendientes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Cuentas solicitadas</h3>
          {billReqTables === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle size={32} strokeWidth={1} className="mx-auto mb-2" />
              Sin cuentas pendientes
            </div>
          ) : (
            <div className="space-y-2">
              {Object.values(tables)
                .filter(t => t.status === 'bill_requested')
                .map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <span className="text-2xl">{t.paymentMethod === 'cash' ? '💵' : '💳'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Mesa {t.number}</p>
                      <p className="text-xs text-gray-500">
                        {t.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'} ·{' '}
                        {t.billRequestedAt ? `hace ${Math.round((Date.now()-t.billRequestedAt)/60000)}m` : ''}
                      </p>
                    </div>
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">Pendiente</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, color, label, value, sub, alert }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${alert ? 'border-orange-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
