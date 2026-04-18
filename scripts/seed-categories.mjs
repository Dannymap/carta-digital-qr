import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCWoAJnUVRVB9Lhej7gqrQbKxPDiYjhdp8',
  authDomain: 'restaurantsqr-eac86.firebaseapp.com',
  projectId: 'restaurantsqr-eac86',
  storageBucket: 'restaurantsqr-eac86.firebasestorage.app',
  messagingSenderId: '576684252174',
  appId: '1:576684252174:web:961dea85ff5de13757305f',
}

const CATEGORIES = [
  { label: 'Entrantes',    icon: '🥗', order: 1 },
  { label: 'Principales',  icon: '🍽️', order: 2 },
  { label: 'Pizzas',       icon: '🍕', order: 3 },
  { label: 'Hamburguesas', icon: '🍔', order: 4 },
  { label: 'Postres',      icon: '🍮', order: 5 },
  { label: 'Bebidas',      icon: '🥤', order: 6 },
]

const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)
const auth = getAuth(app)

await signInWithEmailAndPassword(auth, 'admin@mirestaurante.com', 'Admin1234!')

const existing = await getDocs(collection(db, 'categories'))
const existingLabels = existing.docs.map(d => d.data().label?.toLowerCase())

let added = 0
for (const cat of CATEGORIES) {
  if (!existingLabels.includes(cat.label.toLowerCase())) {
    await addDoc(collection(db, 'categories'), cat)
    console.log(`✅ ${cat.icon} ${cat.label}`)
    added++
  } else {
    console.log(`⏭️  Ya existe: ${cat.label}`)
  }
}
console.log(`\n🎉 ${added} categorías nuevas añadidas`)
process.exit(0)
