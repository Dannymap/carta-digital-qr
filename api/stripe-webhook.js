import Stripe from 'stripe'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { credential } from 'firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({ credential: credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}
const db = getFirestore()

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const table = session.metadata?.table
    if (table) {
      await db.collection('tables').doc(table).update({
        status: 'closed',
        paymentMethod: 'stripe',
        paidOnline: true,
        paidAt: Date.now(),
        openedAt: null,
        billRequestedAt: null,
      })
    }
  }

  res.status(200).json({ received: true })
}
