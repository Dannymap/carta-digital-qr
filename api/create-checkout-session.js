import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { items, table, currency = 'eur', successUrl, cancelUrl } = req.body

  try {
    const lineItems = items.map(item => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          ...(item.modifiers && Object.keys(item.modifiers).length > 0
            ? { description: Object.entries(item.modifiers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ') }
            : {}),
        },
        unit_amount: Math.round(item.price * 100), // cents
      },
      quantity: item.qty,
    }))

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { table: String(table) },
    })

    res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
