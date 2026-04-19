import { useRef } from 'react'
import { Printer } from 'lucide-react'

export function TicketPrint({ table, orders, tableData, config }) {
  const ref = useRef(null)

  const total = orders.reduce((s, o) => s + (o.total ?? 0), 0)
  const payMethod = tableData?.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'
  const now = new Date()

  function handlePrint() {
    const content = ref.current.innerHTML
    const win = window.open('', '_blank', 'width=400,height=700')
    win.document.write(`
      <html><head>
        <title>Ticket Mesa ${table}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 15px; }
          .sm { font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
          .total { font-size: 16px; font-weight: bold; }
          .mt { margin-top: 6px; }
          @media print { @page { margin: 0; size: 80mm auto; } }
        </style>
      </head><body>${content}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <>
      {/* Hidden ticket content for printing */}
      <div ref={ref} style={{ display: 'none' }}>
        <div className="center bold lg">{config?.name ?? 'Mi Restaurante'}</div>
        {config?.address && <div className="center sm">{config.address}</div>}
        {config?.phone && <div className="center sm">{config.phone}</div>}
        <div className="divider" />
        <div className="row">
          <span>Mesa {table}</span>
          <span>{now.toLocaleDateString('es-ES')} {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="divider" />

        {orders.map((o, oi) => (
          <div key={o.id}>
            {o.items?.map((item, i) => (
              <div key={i} className="row">
                <span>{item.qty}x {item.name}{item.modifiers && Object.keys(item.modifiers).length > 0 ? ` (${Object.values(item.modifiers).flat().join(', ')})` : ''}</span>
                <span>{(item.price * item.qty).toFixed(2)}{config?.currency ?? '€'}</span>
              </div>
            ))}
            {o.discount && (
              <div className="row sm">
                <span>Descuento ({o.discount.code})</span>
                <span>-{o.discount.amount.toFixed(2)}{config?.currency ?? '€'}</span>
              </div>
            )}
          </div>
        ))}

        <div className="divider" />
        <div className="row total mt">
          <span>TOTAL</span>
          <span>{total.toFixed(2)} {config?.currency ?? '€'}</span>
        </div>
        <div className="row sm mt">
          <span>Forma de pago</span>
          <span>{payMethod}</span>
        </div>
        <div className="divider" />
        <div className="center sm mt">¡Gracias por su visita!</div>
        {config?.vatNote && <div className="center sm">{config.vatNote}</div>}
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      >
        <Printer size={15} /> Imprimir ticket
      </button>
    </>
  )
}
