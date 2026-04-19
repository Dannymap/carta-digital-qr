import { useState } from 'react'
import { X, Trash2, Minus, Plus, ShoppingBag, Tag, CheckCircle } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { RESTAURANT } from '../../config/restaurant'
import { createOrder } from '../../services/orders'
import { decrementStock } from '../../services/products'
import { validateDiscountCode, useDiscountCode } from '../../services/discounts'

export function CartDrawer({ open, onClose, table }) {
  const { items, remove, updateQty, clear, total, count } = useCart()
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  // Discount
  const [codeInput, setCodeInput] = useState('')
  const [discount, setDiscount] = useState(null) // { id, code, type, value }
  const [codeError, setCodeError] = useState('')
  const [validating, setValidating] = useState(false)

  const discountAmount = discount
    ? discount.type === 'percent'
      ? total * (discount.value / 100)
      : Math.min(discount.value, total)
    : 0
  const finalTotal = Math.max(0, total - discountAmount)

  async function handleValidateCode() {
    if (!codeInput.trim()) return
    setValidating(true)
    setCodeError('')
    try {
      const result = await validateDiscountCode(codeInput)
      if (!result) { setCodeError('Código no válido o expirado'); setDiscount(null) }
      else { setDiscount(result); setCodeInput('') }
    } finally { setValidating(false) }
  }

  async function handleOrder() {
    if (!items.length) return
    setSending(true)
    try {
      await createOrder({
        table,
        items: items.map(i => ({
          id: i.id, name: i.name, price: i.price, qty: i.qty,
          ...(i.modifiers && Object.keys(i.modifiers).length > 0 ? { modifiers: i.modifiers } : {}),
        })),
        total: finalTotal,
        subtotal: total,
        ...(discount ? { discount: { code: discount.code, type: discount.type, value: discount.value, amount: discountAmount } } : {}),
      })
      if (discount) await useDiscountCode(discount.id)
      await decrementStock(items)
      clear()
      setDiscount(null)
      setDone(true)
      setTimeout(() => { setDone(false); onClose() }, 2500)
    } catch {
      alert('Error al enviar el pedido. Inténtalo de nuevo.')
    } finally { setSending(false) }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--color-secondary)' }}>
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag size={20} />
            <span className="font-bold">Tu pedido · Mesa {table}</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={22} /></button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {done ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-green-600">
              <div className="text-5xl">✅</div>
              <p className="font-semibold text-lg">¡Pedido enviado!</p>
              <p className="text-sm text-gray-500">El personal lo recibirá enseguida</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.cartKey} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                    <div className="mt-0.5">
                      {Object.entries(item.modifiers).map(([g, v]) => (
                        <p key={g} className="text-xs text-gray-500">
                          {g}: <span className="font-medium text-gray-700">{Array.isArray(v) ? v.join(', ') : v}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{item.price?.toFixed(2)} {RESTAURANT.currency} / ud.</p>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <button onClick={() => item.qty === 1 ? remove(item.cartKey) : updateQty(item.cartKey, item.qty - 1)}
                    className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(item.cartKey, item.qty + 1)}
                    className="w-6 h-6 rounded-full text-white flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1 mt-0.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                    {(item.price * item.qty).toFixed(2)} {RESTAURANT.currency}
                  </span>
                  <button onClick={() => remove(item.cartKey)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!done && items.length > 0 && (
          <div className="p-4 border-t bg-white space-y-3">
            {/* Discount code */}
            {discount ? (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-bold text-green-700">{discount.code}</span>
                  <span className="text-green-600 ml-1">
                    -{discount.type === 'percent' ? `${discount.value}%` : `${discount.value} ${RESTAURANT.currency}`}
                  </span>
                </div>
                <button onClick={() => setDiscount(null)} className="text-gray-400 hover:text-red-400"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                  <Tag size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    className="flex-1 text-sm outline-none placeholder:text-gray-400"
                    placeholder="Código de descuento"
                    value={codeInput}
                    onChange={e => { setCodeInput(e.target.value); setCodeError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleValidateCode()}
                  />
                </div>
                <button
                  onClick={handleValidateCode}
                  disabled={validating || !codeInput.trim()}
                  className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {validating ? '...' : 'OK'}
                </button>
              </div>
            )}
            {codeError && <p className="text-xs text-red-500 -mt-1">{codeError}</p>}

            {/* Totals */}
            {discount && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{total.toFixed(2)} {RESTAURANT.currency}</span>
              </div>
            )}
            {discount && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Descuento ({discount.code})</span>
                <span>-{discountAmount.toFixed(2)} {RESTAURANT.currency}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>{finalTotal.toFixed(2)} {RESTAURANT.currency}</span>
            </div>

            <button
              onClick={handleOrder}
              disabled={sending}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {sending ? 'Enviando...' : 'Confirmar pedido'}
            </button>
            <p className="text-center text-xs text-gray-400">Mesa {table} · El personal recibirá tu pedido</p>
          </div>
        )}
      </div>
    </>
  )
}
