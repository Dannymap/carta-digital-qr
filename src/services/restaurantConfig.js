import { db } from '../config/firebase'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { RESTAURANT } from '../config/restaurant'

const REF = () => doc(db, 'restaurantConfig', 'main')

export function subscribeToConfig(callback) {
  return onSnapshot(REF(), snap => {
    callback(snap.exists() ? { ...RESTAURANT, ...snap.data() } : RESTAURANT)
  })
}

export async function getConfig() {
  const snap = await getDoc(REF())
  return snap.exists() ? { ...RESTAURANT, ...snap.data() } : RESTAURANT
}

export async function saveConfig(data) {
  await setDoc(REF(), data, { merge: true })
}
