import { useState, useEffect, useRef } from 'react'
import { LogOut, Plus, Pencil, Trash2, Package, QrCode, ClipboardList, X, Check, Upload, Link, LayoutGrid, UtensilsCrossed, Banknote, CreditCard, ChefHat, Clock, CheckCircle, LayoutDashboard, ExternalLink, Infinity, Tag, Users2, History, Shield } from 'lucide-react'
import { Dashboard } from '../components/admin/Dashboard'
import { uploadImage } from '../services/storage'
import { auth } from '../config/firebase'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/products'
import { subscribeToPendingOrders, updateOrderStatus, subscribeToTableOrders, subscribeToTableAllOrders, createOrderByAdmin } from '../services/orders'
import { subscribeToCategories, addCategory, updateCategory, deleteCategory } from '../services/categories'
import { subscribeToTables, openTable, closeTable, createTable, deleteTable } from '../services/tables'
import { subscribeToStaff, createStaffMember, updateStaffMember, deleteStaffMember } from '../services/staff'
import { subscribeToDiscounts, addDiscount, updateDiscount, deleteDiscount } from '../services/discounts'
import { RESTAURANT } from '../config/restaurant'
import { QRCodeSVG } from 'qrcode.react'

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin'] },
  { id: 'tables',     label: 'Mesas',       icon: UtensilsCrossed, roles: ['admin','camarero'] },
  { id: 'products',   label: 'Productos',   icon: Package,         roles: ['admin'] },
  { id: 'categories', label: 'Categorías',  icon: LayoutGrid,      roles: ['admin'] },
  { id: 'orders',     label: 'Pedidos',     icon: ClipboardList,   roles: ['admin','camarero'] },
  { id: 'discounts',  label: 'Descuentos',  icon: Tag,             roles: ['admin'] },
  { id: 'staff',      label: 'Empleados',   icon: Users2,          roles: ['admin'] },
  { id: 'qr',         label: 'QR Mesas',   icon: QrCode,          roles: ['admin'] },
]

const EMPTY_FORM = { name: '', description: '', price: '', category: '', image: '', active: true, order: 0, stock: '', modifiers: [] }

export default function Admin({ role = 'admin' }) {
  const navigate = useNavigate()
  const defaultTab = role === 'camarero' ? 'tables' : 'dashboard'
  const [tab, setTab] = useState(defaultTab)

  // Staff & Discounts
  const [staff, setStaff] = useState([])
  const [discounts, setDiscounts] = useState([])

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
    const unsubCats      = subscribeToCategories(setCategories)
    const unsubTables    = subscribeToTables(setTables)
    const unsubStaff     = subscribeToStaff(setStaff)
    const unsubDiscounts = subscribeToDiscounts(setDiscounts)
    return () => { unsubCats(); unsubTables(); unsubStaff(); unsubDiscounts() }
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
    setForm({
      ...EMPTY_FORM,
      ...product,
      price: product.price?.toString() ?? '',
      stock: product.stock ?? '',
      modifiers: product.modifiers ?? [],
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.category || form.price === '') return
    setSaving(true)
    const data = {
      ...form,
      price: parseFloat(form.price),
      stock: form.stock === '' || form.stock === null ? null : Number(form.stock),
    }
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
          <div className="flex items-center gap-3">
            <a href="/cocina" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
              <ChefHat size={16} /> Cocina <ExternalLink size={12} />
            </a>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 min-w-max">
          {TABS.filter(t => t.roles.includes(role)).map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                      <th className="text-center px-4 py-3">Stock</th>
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
                              {typeof p.stock === 'number'
                                ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                                : <Infinity size={14} className="inline text-gray-300" />
                              }
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
        {tab === 'qr' && <QRTab categories={categories} />}

        {/* STAFF TAB */}
        {tab === 'staff' && (
          <StaffTab staff={staff} />
        )}

        {/* DISCOUNTS TAB */}
        {tab === 'discounts' && (
          <DiscountsTab
            discounts={discounts}
            onAdd={addDiscount}
            onUpdate={updateDiscount}
            onDelete={deleteDiscount}
          />
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Orden">
                  <input type="number" min="0" className="input" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                </Field>
                <Field label="Stock (vacío = ilimitado)">
                  <input type="number" min="0" className="input" value={form.stock} placeholder="∞" onChange={e => setForm(f => ({ ...f, stock: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} />
                </Field>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Producto activo (visible en la carta)</span>
              </label>

              {/* Modificadores */}
              <ModifiersEditor
                modifiers={form.modifiers ?? []}
                onChange={mods => setForm(f => ({ ...f, modifiers: mods }))}
              />
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
  const [expandedOrders, setExpandedOrders] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [historyOrders, setHistoryOrders] = useState([])

  useEffect(() => {
    if (!selectedTable) return
    const since = tables[selectedTable]?.openedAt ?? 0
    const unsub = subscribeToTableOrders(selectedTable, setTableOrders, since)
    return unsub
  }, [selectedTable, tables])

  useEffect(() => {
    if (!selectedTable || !showHistory) return
    const unsub = subscribeToTableAllOrders(selectedTable, setHistoryOrders)
    return unsub
  }, [selectedTable, showHistory])

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

            {/* Pedidos de la mesa — colapsables */}
            {tableOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">Sin pedidos en esta sesión</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {tableOrders.map((order, idx) => {
                  const st = {
                    pending:   { icon: Clock,        color: 'text-yellow-500', label: 'Pendiente',  bg: 'bg-yellow-50 border-yellow-100' },
                    preparing: { icon: ChefHat,      color: 'text-blue-500',   label: 'Preparando', bg: 'bg-blue-50 border-blue-100' },
                    delivered: { icon: CheckCircle,  color: 'text-green-500',  label: 'Entregado',  bg: 'bg-green-50 border-green-100' },
                  }[order.status] ?? { icon: Clock, color: 'text-gray-400', label: order.status, bg: 'bg-gray-50 border-gray-100' }
                  const Icon = st.icon
                  const expanded = expandedOrders[order.id]
                  const toggle = () => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))

                  return (
                    <div key={order.id} className={`rounded-xl border ${st.bg} overflow-hidden`}>
                      {/* Cabecera — siempre visible */}
                      <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:brightness-95 transition-all">
                        <Icon size={14} className={st.color} />
                        <span className="text-xs font-semibold text-gray-700 flex-1">
                          Pedido #{idx + 1}
                          {order.createdBy === 'admin' && <span className="ml-1.5 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-[10px]">Admin</span>}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{order.total?.toFixed(2)} {RESTAURANT.currency}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {/* Detalle — expandible */}
                      {expanded && (
                        <div className="px-3 pb-3 border-t border-white/60">
                          <ul className="text-xs text-gray-600 space-y-0.5 mt-2">
                            {order.items?.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{item.qty}× {item.name}</span>
                                <span>{(item.price * item.qty).toFixed(2)} {RESTAURANT.currency}</span>
                              </li>
                            ))}
                          </ul>
                          {order.status !== 'delivered' && (
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/60">
                              {order.status === 'pending' && (
                                <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded font-medium">Preparando</button>
                              )}
                              <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded font-medium">Entregado</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tableOrders.length > 0 && (
              <div className="mt-3 flex justify-between font-bold text-sm pt-3 border-t">
                <span>Total sesión · Mesa {selectedTable}</span>
                <span style={{ color: 'var(--color-primary)' }}>{tableTotal.toFixed(2)} {RESTAURANT.currency}</span>
              </div>
            )}

            {/* Historial completo */}
            <button
              onClick={() => setShowHistory(h => !h)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <History size={13} />
              {showHistory ? 'Ocultar historial completo' : 'Ver historial completo'}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial · Todos los pedidos</p>
                {historyOrders.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">Sin pedidos registrados</p>
                ) : (
                  (() => {
                    // Agrupar por día
                    const byDay = {}
                    historyOrders.forEach(o => {
                      const day = new Date(o.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                      if (!byDay[day]) byDay[day] = []
                      byDay[day].push(o)
                    })
                    return Object.entries(byDay).map(([day, dayOrders]) => {
                      const dayTotal = dayOrders.reduce((s, o) => s + (o.total ?? 0), 0)
                      return (
                        <div key={day}>
                          <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-600">{day}</span>
                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{dayTotal.toFixed(2)} {RESTAURANT.currency}</span>
                          </div>
                          {dayOrders.map(o => {
                            const statusColor = { pending: 'text-yellow-500', preparing: 'text-blue-500', delivered: 'text-green-500' }[o.status] ?? 'text-gray-400'
                            return (
                              <div key={o.id} className="pl-2 py-1 border-l-2 border-gray-100 ml-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className={`font-medium ${statusColor}`}>{o.status}</span>
                                  <span className="font-semibold text-gray-700">{o.total?.toFixed(2)} {RESTAURANT.currency}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">{o.items?.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })
                  })()
                )}
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

// ── MODIFIERS EDITOR ─────────────────────────────────────────────────────────
const EMPTY_MOD = { name: '', required: true, multiple: false, options: [] }

function ModifiersEditor({ modifiers, onChange }) {
  const [newOption, setNewOption] = useState({}) // groupIdx -> string

  function addGroup() {
    onChange([...modifiers, { ...EMPTY_MOD }])
  }

  function removeGroup(i) {
    onChange(modifiers.filter((_, idx) => idx !== i))
  }

  function updateGroup(i, key, val) {
    onChange(modifiers.map((g, idx) => idx === i ? { ...g, [key]: val } : g))
  }

  function addOption(i) {
    const opt = (newOption[i] ?? '').trim()
    if (!opt) return
    const g = modifiers[i]
    if (g.options.includes(opt)) return
    updateGroup(i, 'options', [...g.options, opt])
    setNewOption(prev => ({ ...prev, [i]: '' }))
  }

  function removeOption(i, opt) {
    updateGroup(i, 'options', modifiers[i].options.filter(o => o !== opt))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-500">Modificadores</label>
        <button type="button" onClick={addGroup}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg text-white font-semibold"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={12} /> Añadir grupo
        </button>
      </div>

      {modifiers.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
          Sin modificadores. Ej: "Punto", "Extras", "Tamaño"
        </p>
      )}

      <div className="space-y-3">
        {modifiers.map((g, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Nombre del grupo (ej: Punto)"
                value={g.name}
                onChange={e => updateGroup(i, 'name', e.target.value)}
              />
              <button type="button" onClick={() => removeGroup(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" checked={g.required} onChange={e => updateGroup(i, 'required', e.target.checked)} className="w-3.5 h-3.5" />
                Obligatorio
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" checked={g.multiple} onChange={e => updateGroup(i, 'multiple', e.target.checked)} className="w-3.5 h-3.5" />
                Selección múltiple
              </label>
            </div>
            {/* Options */}
            <div className="flex flex-wrap gap-1.5">
              {g.options.map(opt => (
                <span key={opt} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {opt}
                  <button type="button" onClick={() => removeOption(i, opt)} className="text-gray-400 hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs"
                placeholder="Nueva opción..."
                value={newOption[i] ?? ''}
                onChange={e => setNewOption(prev => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(i))}
              />
              <button type="button" onClick={() => addOption(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                +
              </button>
            </div>
          </div>
        ))}
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

// ── STAFF TAB ─────────────────────────────────────────────────────────────────
const ROLES = ['admin', 'camarero', 'cocinero']
const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', camarero: 'bg-blue-100 text-blue-700', cocinero: 'bg-orange-100 text-orange-700' }

function StaffTab({ staff }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'camarero' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) return
    setSaving(true); setError('')
    try {
      await createStaffMember(form.email, form.password, form.name, form.role)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'camarero' })
    } catch (e) {
      setError(e.message ?? 'Error al crear empleado')
    } finally { setSaving(false) }
  }

  async function handleRoleChange(id, role) {
    await updateStaffMember(id, { role })
  }

  async function handleDelete(id, name) {
    if (!confirm(`¿Eliminar acceso de ${name}? No podrá entrar al panel.`)) return
    await deleteStaffMember(id)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Empleados ({staff.length})</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Nuevo empleado
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={s.role}
                    onChange={e => handleRoleChange(s.id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">
                <Shield size={32} strokeWidth={1} className="mx-auto mb-2" />
                Sin empleados registrados
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">Roles disponibles:</p>
        <p>• <strong>admin</strong> — Acceso total al panel</p>
        <p>• <strong>camarero</strong> — Solo Mesas y Pedidos</p>
        <p>• <strong>cocinero</strong> — Redirige automáticamente a la pantalla de cocina</p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">Nuevo empleado</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Nombre *">
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" autoFocus />
              </Field>
              <Field label="Email *">
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="empleado@restaurante.com" />
              </Field>
              <Field label="Contraseña temporal *">
                <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Rol">
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {saving ? 'Creando...' : 'Crear acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── DISCOUNTS TAB ─────────────────────────────────────────────────────────────
const EMPTY_DISC = { code: '', type: 'percent', value: '', active: true, maxUses: '' }

function DiscountsTab({ discounts, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_DISC)
  const [saving, setSaving] = useState(false)

  function openCreate() { setEditing(null); setForm(EMPTY_DISC); setShowForm(true) }
  function openEdit(d) { setEditing(d.id); setForm({ code: d.code, type: d.type, value: d.value?.toString(), active: d.active, maxUses: d.maxUses?.toString() ?? '' }); setShowForm(true) }

  async function handleSave() {
    if (!form.code || !form.value) return
    setSaving(true)
    const data = { ...form, value: parseFloat(form.value), maxUses: form.maxUses ? parseInt(form.maxUses) : null }
    try {
      editing ? await onUpdate(editing, data) : await onAdd(data)
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function handleDelete(d) {
    if (!confirm(`¿Eliminar el descuento "${d.code}"?`)) return
    await onDelete(d.id)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Descuentos ({discounts.length})</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Nuevo descuento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-center px-4 py-3">Usos</th>
              <th className="text-center px-4 py-3">Activo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {discounts.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{d.code}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{d.type === 'percent' ? 'Porcentaje' : 'Importe fijo'}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {d.type === 'percent' ? `${d.value}%` : `${d.value} ${RESTAURANT.currency}`}
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {d.usedCount ?? 0}{d.maxUses ? `/${d.maxUses}` : ''}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onUpdate(d.id, { active: !d.active })}>
                    <span className={`inline-block w-2 h-2 rounded-full ${d.active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(d)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                <Tag size={32} strokeWidth={1} className="mx-auto mb-2" />
                Sin descuentos. Crea el primero.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{editing ? 'Editar descuento' : 'Nuevo descuento'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Código *">
                <input className="input uppercase" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: VERANO10" autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Importe fijo</option>
                  </select>
                </Field>
                <Field label={form.type === 'percent' ? 'Valor (%) *' : `Valor (${RESTAURANT.currency}) *`}>
                  <input type="number" min="0" step="0.01" className="input" value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" />
                </Field>
              </div>
              <Field label="Usos máximos (vacío = ilimitado)">
                <input type="number" min="1" className="input" value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="∞" />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Descuento activo</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.value}
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
