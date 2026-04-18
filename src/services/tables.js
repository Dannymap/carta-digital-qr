import { db } from '../config/firebase'
import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocs,
} from 'firebase/firestore'

const COL = 'tables'

export function subscribeToTables(callback) {
  return onSnapshot(collection(db, COL), snap => {
    const tables = {}
    snap.docs.forEach(d => { tables[d.id] = { id: d.id, ...d.data() } })
    callback(tables)
  })
}

export function subscribeToTable(tableId, callback) {
  return onSnapshot(doc(db, COL, tableId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function createTable(tableId) {
  await setDoc(doc(db, COL, tableId), {
    number: tableId,
    status: 'closed',
    paymentMethod: null,
    openedAt: null,
    billRequestedAt: null,
    createdAt: Date.now(),
  })
}

export async function openTable(tableId) {
  await updateDoc(doc(db, COL, tableId), {
    status: 'open',
    paymentMethod: null,
    openedAt: Date.now(),
    billRequestedAt: null,
  })
}

export async function closeTable(tableId) {
  await updateDoc(doc(db, COL, tableId), {
    status: 'closed',
    paymentMethod: null,
    openedAt: null,
    billRequestedAt: null,
  })
}

export async function deleteTable(tableId) {
  await deleteDoc(doc(db, COL, tableId))
}

export async function requestBill(tableId, paymentMethod) {
  await updateDoc(doc(db, COL, tableId), {
    status: 'bill_requested',
    paymentMethod,
    billRequestedAt: Date.now(),
  })
}
