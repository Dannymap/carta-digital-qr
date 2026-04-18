import { db } from '../config/firebase'
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, onSnapshot,
} from 'firebase/firestore'

const COL = 'orders'

export async function createOrder(order) {
  return addDoc(collection(db, COL), {
    ...order,
    status: 'pending',
    createdBy: 'customer',
    createdAt: Date.now(),
  })
}

export async function createOrderByAdmin(order) {
  return addDoc(collection(db, COL), {
    ...order,
    status: 'pending',
    createdBy: 'admin',
    createdAt: Date.now(),
  })
}

export async function updateOrderStatus(id, status) {
  return updateDoc(doc(db, COL, id), { status, updatedAt: Date.now() })
}

// since = tableData.openedAt para filtrar solo la sesión actual
export function subscribeToTableOrders(tableId, callback, since = 0) {
  const q = query(collection(db, COL), where('table', '==', tableId))
  return onSnapshot(q, snap => {
    callback(
      snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => (d.createdAt ?? 0) >= since)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    )
  })
}

export function subscribeToAllOrders(callback) {
  return onSnapshot(collection(db, COL), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeToPendingOrders(callback) {
  const q = query(collection(db, COL), where('status', 'in', ['pending', 'preparing']))
  return onSnapshot(q, snap => {
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    callback(docs)
  })
}
