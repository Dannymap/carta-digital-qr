import { db } from '../config/firebase'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, orderBy, query } from 'firebase/firestore'

const COL = 'categories'

export function subscribeToCategories(callback) {
  return onSnapshot(query(collection(db, COL)), snap => {
    const cats = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(cats)
  })
}

export async function getCategories() {
  const snap = await getDocs(collection(db, COL))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function addCategory(data) {
  return addDoc(collection(db, COL), data)
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, COL, id), data)
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, COL, id))
}
