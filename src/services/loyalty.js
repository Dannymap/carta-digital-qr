import { db } from '../config/firebase'
import {
  collection, doc, getDoc, setDoc, updateDoc,
  onSnapshot, increment, arrayUnion,
} from 'firebase/firestore'

const COL = 'loyalty'
const POINTS_PER_EURO = 1      // 1 punto por cada euro gastado
const POINTS_FOR_EURO = 100    // 100 puntos = 1€ de descuento

export const LOYALTY_CONFIG = { POINTS_PER_EURO, POINTS_FOR_EURO }

export function subscribeToLoyalty(callback) {
  return onSnapshot(collection(db, COL), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function getLoyaltyMember(phone) {
  const snap = await getDoc(doc(db, COL, phone))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function addLoyaltyPoints(phone, name, amount, orderId) {
  const pts = Math.floor(amount * POINTS_PER_EURO)
  const ref = doc(db, COL, phone)
  const snap = await getDoc(ref)
  const entry = { date: Date.now(), points: pts, orderId, amount }
  if (snap.exists()) {
    await updateDoc(ref, {
      points: increment(pts),
      totalSpent: increment(amount),
      lastActivity: Date.now(),
      history: arrayUnion(entry),
      ...(name ? { name } : {}),
    })
  } else {
    await setDoc(ref, {
      phone, name: name || '', points: pts,
      totalSpent: amount, lastActivity: Date.now(),
      createdAt: Date.now(), history: [entry],
    })
  }
  return pts
}

export async function redeemLoyaltyPoints(phone, points) {
  const discount = points / POINTS_FOR_EURO
  await updateDoc(doc(db, COL, phone), {
    points: increment(-points),
    history: arrayUnion({ date: Date.now(), points: -points, type: 'redeem', amount: -discount }),
  })
  return discount
}

export async function updateLoyaltyMember(phone, data) {
  return updateDoc(doc(db, COL, phone), data)
}
