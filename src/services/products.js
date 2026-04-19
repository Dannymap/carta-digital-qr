import { db } from '../config/firebase'
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, increment,
} from 'firebase/firestore'

const COL = 'products'

export async function getProductsByCategory(categoryId) {
  const q = query(collection(db, COL), where('category', '==', categoryId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getAllProducts() {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addProduct(data) {
  return addDoc(collection(db, COL), { ...data, active: true, createdAt: Date.now() })
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, COL, id), data)
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, COL, id))
}

export async function decrementStock(items) {
  await Promise.all(
    items
      .filter(i => i.id)
      .map(i => updateDoc(doc(db, COL, i.id), { stock: increment(-i.qty) }))
  )
}
