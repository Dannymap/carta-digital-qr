import { useState, useEffect, useRef } from 'react'
import { LogOut, Plus, Pencil, Trash2, Package, QrCode, ClipboardList, X, Check, Upload, Link, LayoutGrid, UtensilsCrossed, Banknote, CreditCard, ChefHat, Clock, CheckCircle, LayoutDashboard } from 'lucide-react'
import { Dashboard } from '../components/admin/Dashboard'
import { uploadImage } from '../services/storage'
import { auth } from '../config/firebase'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/products'
import { subscribeToPendingOrders, updateOrderStatus, subscribeToTableOrders, createOrderByAdmin } from '../services/orders'
import { subscribeToCategories, addCategory, updateCategory, deleteCategory } from '../services/categories'
import { subscribeToTables, openTable, closeTable, createTable, deleteTable } from '../services/tables'
import { RESTAURANT } from '../config/restaurant'
import { QRCodeSVG } from 'qrcode.react'

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'tables',     label: 'Mesas',       icon: UtensilsCrossed },
  { id: 'products',   label: 'Productos',   icon: Package },
  { id: 'categories', label: 'Categorías',  icon: LayoutGrid },
  { id: 'orders',     label: 'Pedidos',     icon: ClipboardList },
  { id: 'qr',         label: 'QR Mesas',   icon: QrCode },
]

const EMPTY_FORM = { name: '', description: '', price: '', category: '', image: '', active: true, order: 0 }

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')

  // Products
  const [products, setProducts] = useState([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Categories
  const [categories, setCategories] = useState([])

  // Tables
  const [tables, setTables] = useState({})

  // Orders
  const [orders, setOrders] = useState([])
  const prevOrderCount = useRef(0)
  const initialized = useRef(false)

  // Product filter
  const [filterCat, setFilterCat] = useState('all')

  useEffect(() => {
    loadProducts()
    const unsubCats   = subscribeToCategories(setCategories)
    const unsubTables = subscribeToTables(setTables)
    return () => { unsubCats(); unsubTables() }
  }, [])

  useEffect(() => {
    const unsub = subscribeToPendingOrders(newOrders => {
      if (initialized.current && newOrders.length > prevOrderCount.current) {
        playNotificationSound()
      }
      prevOrderCount.current = newOrders.length
      initialized.current = true
      setOrders(newOrders)
    })
    return unsub
  }, [])

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const notes = [523, 659, 784]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3)
        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.3)
      })
    } catch {}
  }

  async function loadProducts() {
    setLoadingProds(true)
    const data = await getAllProducts()
    data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setProducts(data)
    setLoadingProds(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(product) {
    setEditing(product.id)
    setForm({ ...EMPTY_FORM, ...product, price: product.price?.toString() ?? '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.category || form.price === '') return
    setSaving(true)
    const data = { ...form, price: parseFloat(form.price) }
    try {
      if (editing) {
        await updateProduct(editing, data)
      } else {
        await addProduct(data)
      }
      setShowForm(false)
      loadProducts()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await deleteProduct(id)
    loadProducts()
  }

  async function handleOrderStatus(id, status) {
    await updateOrderStatus(id, status)
  }

  function handleLogout() {
    signOut(auth).then(() => navigate('/admin/login'))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="text-white shadow" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold">{RESTAURANT.name} · Admin</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {t.label}
                {t.id === 'orders' && orders.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {orders.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Productos ({products.length})</h2>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={16} /> Añadir producto
              </button>
            </div>

            {/* Filtro por categoría */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
              <button
                onClick={() => setFilterCat('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={filterCat === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                Todas
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterCat(c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === c.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={filterCat === c.id ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {loadingProds ? (
              <div className="text-center py-10 text-gray-400">Cargando...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Producto</th>
                      <th className="text-left px-4 py-3">Categoría</th>
                      <th className="text-right px-4 py-3">Precio</th>
                      <th className="text-center px-4 py-3">Activo</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products
                      .filter(p => filterCat === 'all' || p.category === filterCat)
                      .map(p => {
                        const cat = categories.find(c => c.id === p.category)
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{p.name}</div>
                              {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {cat ? `${cat.icon} ${cat.label}` : <span className="text-gray-300 italic">Sin categoría</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-primary)' }}>
                              {p.price?.toFixed(2)} {RESTAURANT.currency}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block w-2 h-2 rounded-full ${p.active ? 'bg-green-400' : 'bg-gray-300'}`} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
                                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    {products.filter(p => filterCat === 'all' || p.category === filterCat).length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-gray-400">Sin productos. Añade el primero.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Pedidos pendientes</h2>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList size={40} strokeWidth={1} className="mx-auto mb-3" />
                <p>No hay pedidos pendientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-900">Mesa {order.table}</span>
                        <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status === 'pending' ? 'Pendiente' : 'Preparando'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                      {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{item.qty}x {item.name}</span>
                          <span>{(item.price * item.qty).toFixed(2)} {RESTAURANT.currency}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                        Total: {order.total?.toFixed(2)} {RESTAURANT.currency}
                      </span>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleOrderStatus(order.id, 'preparing')}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white font-semibold"
                          >
                            <Check size={13} /> Preparando
                          </button>
                        )}
                        <button
                          onClick={() => handleOrderStatus(order.id, 'delivered')}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white font-semibold"
                        >
                          <Check size={13} /> Entregado
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && <Dashboard tables={tables} />}

        {/* TABLES TAB */}
        {tab === 'tables' && (
          <TablesTab
            tables={tables}
            categories={categories}
            allProducts={products}
            onOpen={openTable}
            onClose={closeTable}
          />
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}

        {/* QR TAB */}
        {tab === 'qr' && (
          <QRTab categories={categories} />
        )}
      </main>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Nombre *">
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del producto" />
              </Field>
              <Field label="Descripción">
                <textarea className="input resize-none h-20" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Precio *">
                  <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </Field>
                <Field label="Categoría *">
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <ImageField
                value={form.image}
                onChange={val => setForm(f => ({ ...f, image: val }))}
              />
              <Field label="Orden">
                <input type="number" min="0" className="input" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Producto activo (visible en la carta)</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.category || form.price === ''}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageField({ value, onChange }) {
  const [mode, setMode] = useState(null) // null | 'upload' | 'url'
  const [draft, setDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef(null)

  function requestChange() {
    if (value && !confirm('¿Seguro que quieres cambiar la imagen actual?')) return
    setDraft('')
    setMode(null)
  }

  function handleRemove() {
    if (!confirm('¿Seguro que quieres eliminar la imagen del producto?')) return
    onChange('')
    setMode(null)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const url = await uploadImage(file, setProgress)
      onChange(url)
      setMode(null)
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function handleConfirmUrl() {
    if (!draft.trim()) return
    onChange(draft.trim())
    setMode(null)
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">Imagen</label>

      {/* Preview */}
      {value && mode === null && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img
            src={value}
            alt="preview"
            className="w-14 h-14 object-cover rounded-lg border border-gray-200 bg-white flex-shrink-0"
            onError={e => { e.target.style.opacity = '0.3' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{value}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={requestChange}
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600 font-medium hover:bg-blue-200">
              Cambiar
            </button>
            <button type="button" onClick={handleRemove}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-500 font-medium hover:bg-red-200">
              Quitar
            </button>
          </div>
        </div>
      )}

      {/* Sin imagen — elegir método */}
      {!value && mode === null && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMode('upload'); setTimeout(() => fileRef.current?.click(), 50) }}
            className="flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Upload size={20} />
            <span className="text-xs font-medium">Subir archivo</span>
            <span className="text-[10px] text-gray-300">JPG, PNG, WEBP</span>
          </button>
          <button type="button" onClick={() => setMode('url')}
            className="flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Link size={20} />
            <span className="text-xs font-medium">Pegar URL</span>
            <span className="text-[10px] text-gray-300">https:// o /images/</span>
          </button>
        </div>
      )}

      {/* Input file oculto */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Subiendo */}
      {uploading && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Subiendo imagen... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary)' }} />
          </div>
        </div>
      )}

      {/* Modo URL */}
      {mode === 'url' && !uploading && (
        <div className="space-y-2">
          <input
            autoFocus
            className="input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="/images/nombre.jpg  o  https://..."
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode(null)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmUrl} disabled={!draft.trim()}
              className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Modo upload — seleccionar de nuevo si cancela */}
      {mode === 'upload' && !uploading && (
        <div className="flex gap-2">
          <button type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <Upload size={14} /> Seleccionar archivo
          </button>
          <button type="button" onClick={() => setMode(null)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

// ── TABLES TAB ────────────────────────────────────────────────────────────────

const TABLE_STATUS = {
  open:            { label: 'Abierta',          color: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
  bill_requested:  { label: 'Cuenta solicitada', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  closed:          { label: 'Cerrada',           color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-300' },
}

function TablesTab({ tables, categories, allProducts, onOpen, onClose }) {
  // Fuente de verdad: Firestore. Ordenadas numéricamente.
  const tableList = Object.values(tables).sort((a, b) => Number(a.number) - Number(b.number))
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrders, setTableOrders] = useState([])
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!selectedTable) return
    const since = tables[selectedTable]?.openedAt ?? 0
    const unsub = subscribeToTableOrders(selectedTable, setTableOrders, since)
    return unsub
  }, [selectedTable, tables])

  const selectedTableData = selectedTable ? tables[selectedTable] : null
  const tableTotal = tableOrders.reduce((s, o) => s + (o.total ?? 0), 0)

  async function handleCreateTable() {
    const nextNum = tableList.length
      ? String(Math.max(...tableList.map(t => Number(t.number))) + 1)
      : '1'
    setCreating(true)
    await createTable(nextNum)
    setSelectedTable(nextNum)
    setCreating(false)
  }

  async function handleDeleteTable(tableId) {
    if (!confirm(`¿Eliminar Mesa ${tableId} permanentemente? Se eliminará también su QR.`)) return
    if (selectedTable === tableId) setSelectedTable(null)
    await deleteTable(tableId)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: grid de mesas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Mesas ({tableList.length})</h2>
          <button
            onClick={handleCreateTable}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={15} /> {creating ? 'Creando...' : 'Nueva mesa'}
          </button>
        </div>

        {tableList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
            <UtensilsCrossed size={32} strokeWidth={1} className="mx-auto mb-2" />
            No hay mesas. Crea la primera.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tableList.map(t => {
              const st     = TABLE_STATUS[t.status] ?? TABLE_STATUS.closed
              const active = selectedTable === t.number
              return (
                <div key={t.id} className="relative group">
                  <button
                    onClick={() => setSelectedTable(t.number)}
                    className={`w-full flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      active ? 'border-[var(--color-primary)] shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${st.dot}`} />
                    <span className="text-2xl">🪑</span>
                    <span className="font-bold text-sm text-gray-800">Mesa {t.number}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    {t.status === 'bill_requested' && (
                      <span className="text-[10px]">{t.paymentMethod === 'cash' ? '💵' : '💳'}</span>
                    )}
                  </button>
                  {/* Botón eliminar — aparece al hover */}
                  <button
                    onClick={() => handleDeleteTable(t.number)}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex shadow-sm"
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: detalle de mesa seleccionada */}
      <div>
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-16">
            <UtensilsCrossed size={40} strokeWidth={1} />
            <p className="text-sm">Selecciona una mesa</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mesa {selectedTable}</h2>
              <div className="flex gap-2">
                {!selectedTableData || selectedTableData.status === 'closed' ? (
                  <button
                    onClick={() => onOpen(selectedTable)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold bg-green-500 hover:bg-green-600"
                  >
                    <Check size={14} /> Habilitar
                  </button>
                ) : (
                  <button
                    onClick={() => { if (confirm(`¿Cerrar mesa ${selectedTable}?`)) onClose(selectedTable) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold bg-gray-500 hover:bg-gray-600"
                  >
                    <X size={14} /> Cerrar
                  </button>
                )}
                {selectedTableData?.status !== 'closed' && (
                  <button
                    onClick={() => setShowAddOrder(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={14} /> Añadir orden
                  </button>
                )}
              </div>
            </div>

            {/* Info cuenta solicitada */}
            {selectedTableData?.status === 'bill_requested' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
                <span className="text-2xl">{selectedTableData.paymentMethod === 'cash' ? '💵' : '💳'}</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Cuenta solicitada</p>
                  <p className="text-xs text-yellow-600">Pago: {selectedTableData.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
                </div>
              </div>
            )}

            {/* Pedidos de la mesa */}
            {tableOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">Sin pedidos en esta sesión</div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {tableOrders.map(order => {
                  const st = { pending: { icon: Clock, color: 'text-yellow-500' }, preparing: { icon: ChefHat, color: 'text-blue-500' }, delivered: { icon: CheckCircle, color: 'text-green-500' } }[order.status] ?? { icon: Clock, color: 'text-gray-400' }
                  const Icon = st.icon
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Icon size={13} className={st.color} />
                          <span className="capitalize">{order.status}</span>
                          {order.createdBy === 'admin' && <span className="bg-purple-100 text-purple-600 px-1.5 rounded-full">Admin</span>}
                        </div>
                        <div className="flex gap-1">
                          {order.status === 'pending' && <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded font-medium">Preparando</button>}
                          {order.status !== 'delivered' && <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded font-medium">Entregado</button>}
                        </div>
                      </div>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {order.items?.map((item, i) => <li key={i} className="flex justify-between"><span>{item.qty}× {item.name}</span><span>{(item.price * item.qty).toFixed(2)} {RESTAURANT.currency}</span></li>)}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {tableOrders.length > 0 && (
              <div className="mt-3 flex justify-between font-bold text-sm pt-3 border-t">
                <span>Total mesa</span>
                <span style={{ color: 'var(--color-primary)' }}>{tableTotal.toFixed(2)} {RESTAURANT.currency}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal añadir orden */}
      {showAddOrder && (
        <AddOrderModal
          table={selectedTable}
          categories={categories}
          allProducts={allProducts}
          onClose={() => setShowAddOrder(false)}
        />
      )}
    </div>
  )
}

function AddOrderModal({ table, categories, allProducts, onClose }) {
  const [selectedCat, setSelectedCat] = useState(categories[0]?.id ?? '')
  const [cart, setCart] = useState([])
  const [saving, setSaving] = useState(false)

  const catProducts = allProducts.filter(p => p.category === selectedCat && p.active !== false)
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  function addItem(product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  function removeItem(id) { setCart(prev => prev.filter(i => i.id !== id)) }

  async function handleSend() {
    if (!cart.length) return
    setSaving(true)
    try {
      await createOrderByAdmin({
        table,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 col-span-2">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900">Añadir orden · Mesa {table}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 border-b">
          {categories.map(c => (
            <button key={c.id} onClick={() => setSelectedCat(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCat === c.id ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={selectedCat === c.id ? { backgroundColor: 'var(--color-primary)' } : {}}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
          {catProducts.map(p => {
            const inCart = cart.find(i => i.id === p.id)
            return (
              <button key={p.id} onClick={() => addItem(p)}
                className="text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-[var(--color-primary)] hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-gray-800 leading-snug">{p.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{p.price?.toFixed(2)} {RESTAURANT.currency}</span>
                  {inCart && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded-full font-medium">{inCart.qty}</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Cart summary */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-2">
            {cart.map(i => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{i.qty}× {i.name}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-primary)' }}>{(i.price * i.qty).toFixed(2)} {RESTAURANT.currency}</span>
                  <button onClick={() => removeItem(i.id)} className="text-gray-300 hover:text-red-400"><X size={13} /></button>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>{total.toFixed(2)} {RESTAURANT.currency}</span>
            </div>
            <button onClick={handleSend} disabled={saving}
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              {saving ? 'Enviando...' : 'Confirmar orden'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── CATEGORIES TAB ────────────────────────────────────────────────────────────
const EMOJI_LIST = ['🍕','🍔','🥗','🍽️','🍗','🐟','🥩','🍜','🥘','🍣','🥪','🍮','🧁','🍰','🥤','🍷','🍺','☕','🧃','🌮','🥙','🍱']
const EMPTY_CAT = { label: '', icon: '🍽️', order: 0 }

function CategoriesTab({ categories, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_CAT)
  const [saving, setSaving] = useState(false)

  function openCreate() { setEditing(null); setForm(EMPTY_CAT); setShowForm(true) }
  function openEdit(cat) { setEditing(cat.id); setForm({ label: cat.label, icon: cat.icon, order: cat.order ?? 0 }); setShowForm(true) }

  async function handleSave() {
    if (!form.label.trim()) return
    setSaving(true)
    try {
      editing ? await onUpdate(editing, form) : await onAdd(form)
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function handleDelete(cat) {
    if (!confirm(`¿Eliminar la categoría "${cat.label}"? Los productos de esta categoría quedarán sin categoría.`)) return
    await onDelete(cat.id)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Categorías ({categories.length})</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Icono</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-right px-4 py-3">Orden</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-2xl">{cat.icon}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{cat.label}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{cat.id}</td>
                <td className="px-4 py-3 text-right text-gray-400">{cat.order ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Sin categorías. Crea la primera.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Nombre *">
                <input className="input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Pizzas, Entrantes..." autoFocus />
              </Field>
              <Field label="Icono">
                <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {EMOJI_LIST.map(e => (
                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, icon: e }))}
                      className={`text-xl p-1 rounded-lg transition-colors ${form.icon === e ? 'bg-gray-200 ring-2 ring-offset-1' : 'hover:bg-gray-100'}`}
                      style={form.icon === e ? { '--tw-ring-color': 'var(--color-primary)' } : {}}>
                      {e}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Seleccionado: <span className="text-lg">{form.icon}</span></p>
              </Field>
              <Field label="Orden (menor = primero)">
                <input type="number" min="0" className="input" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </Field>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.label.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function QRTab({ categories: _c }) {
  const baseUrl = window.location.origin
  const [firestoreTables, setFirestoreTables] = useState({})

  useEffect(() => {
    return subscribeToTables(setFirestoreTables)
  }, [])

  const tableList = Object.values(firestoreTables)
    .sort((a, b) => Number(a.number) - Number(b.number))

  function downloadQR(tableNum) {
    const svg = document.getElementById(`qr-mesa-${tableNum}`)
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QR_Mesa_${tableNum}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">QR por mesa</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Cada QR apunta a <code className="bg-gray-100 px-1 rounded">{baseUrl}/mesa/:numero</code> · Para crear o eliminar mesas ve a la pestaña <strong>Mesas</strong>
      </p>

      {tableList.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No hay mesas creadas. Ve a la pestaña Mesas para crearlas.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tableList.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center gap-3">
              <p className="font-bold text-gray-700 text-sm">Mesa {t.number}</p>
              <QRCodeSVG
                id={`qr-mesa-${t.number}`}
                value={`${baseUrl}/mesa/${t.number}`}
                size={120}
                fgColor="var(--color-secondary)"
                level="M"
              />
              <button
                onClick={() => downloadQR(t.number)}
                className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold w-full text-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Descargar SVG
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
