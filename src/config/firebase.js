import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCWoAJnUVRVB9Lhej7gqrQbKxPDiYjhdp8',
  authDomain: 'restaurantsqr-eac86.firebaseapp.com',
  projectId: 'restaurantsqr-eac86',
  storageBucket: 'restaurantsqr-eac86.firebasestorage.app',
  messagingSenderId: '576684252174',
  appId: '1:576684252174:web:961dea85ff5de13757305f',
  measurementId: 'G-5CGHMK11RV',
}

const app = initializeApp(firebaseConfig)
// App secundaria para crear usuarios sin cerrar sesión del admin actual
const secondaryApp = initializeApp(firebaseConfig, 'secondary')

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const secondaryAuth = getAuth(secondaryApp)
