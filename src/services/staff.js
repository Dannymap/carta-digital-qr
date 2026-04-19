import { db, secondaryAuth } from '../config/firebase'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore'

const COL = 'staff'

export async function createStaffMember(email, password, name, role) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  const uid = cred.user.uid
  await signOut(secondaryAuth)
  await setDoc(doc(db, COL, uid), { email, name, role, createdAt: Date.now() })
  return uid
}

export async function getStaffMember(uid) {
  const snap = await getDoc(doc(db, COL, uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeToStaff(callback) {
  return onSnapshot(collection(db, COL), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function updateStaffMember(uid, data) {
  return updateDoc(doc(db, COL, uid), data)
}

export async function deleteStaffMember(uid) {
  return deleteDoc(doc(db, COL, uid))
}
