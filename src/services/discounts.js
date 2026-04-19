import { db } from '../config/firebase'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, getDocs, increment,
} from 'firebase/firestore'

const COL = 'discounts'

export function subscribeToDiscounts(callback) {
  return onSnapshot(collection(db, COL), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addDiscount(data) {
  return addDoc(collection(db, COL), { ...data, code: data.code.toUpperCase(), usedCount: 0, createdAt: Date.now() })
}

export async function updateDiscount(id, data) {
  return updateDoc(doc(db, COL, id), data)
}

export async function deleteDiscount(id) {
  return deleteDoc(doc(db, COL, id))
}

export async function validateDiscountCode(code) {
  const q = query(
    collection(db, COL),
    where('code', '==', code.toUpperCase().trim()),
    where('active', '==', true),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const disc = { id: snap.docs[0].id, ...snap.docs[0].data() }
  if (disc.maxUses && disc.usedCount >= disc.maxUses) return null
  return disc
}

export async function useDiscountCode(id) {
  return updateDoc(doc(db, COL, id), { usedCount: increment(1) })
}
