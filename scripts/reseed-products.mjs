import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCWoAJnUVRVB9Lhej7gqrQbKxPDiYjhdp8',
  authDomain: 'restaurantsqr-eac86.firebaseapp.com',
  projectId: 'restaurantsqr-eac86',
  storageBucket: 'restaurantsqr-eac86.firebasestorage.app',
  messagingSenderId: '576684252174',
  appId: '1:576684252174:web:961dea85ff5de13757305f',
}

const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)
const auth = getAuth(app)

await signInWithEmailAndPassword(auth, 'admin@mirestaurante.com', 'Admin1234!')

// 1. Obtener IDs reales de categorías desde Firestore
const catSnap = await getDocs(collection(db, 'categories'))
const catMap = {}
catSnap.docs.forEach(d => {
  const label = d.data().label?.toLowerCase()
  catMap[label] = d.id
})
console.log('Categorías encontradas:', catMap)

// Mapa de slugs viejos → label de Firestore
const slugToLabel = {
  entrantes:    'entrantes',
  principales:  'principales',
  pizzas:       'pizzas',
  hamburguesas: 'hamburguesas',
  postres:      'postres',
  bebidas:      'bebidas',
}

const PRODUCTS = [
  { name: 'Ensalada César',       description: 'Lechuga romana, pollo, parmesano y picatostes',       price: 9.50,  category: 'entrantes',    active: true, order: 1 },
  { name: 'Croquetas caseras',    description: 'Croquetas de jamón ibérico (6 uds)',                   price: 7.90,  category: 'entrantes',    active: true, order: 2 },
  { name: 'Patatas bravas',       description: 'Con salsa brava y alioli',                             price: 5.50,  category: 'entrantes',    active: true, order: 3 },
  { name: 'Solomillo a la plancha', description: 'Con patatas y pimientos asados',                     price: 18.90, category: 'principales',  active: true, order: 1 },
  { name: 'Merluza al horno',     description: 'Con verduras de temporada',                            price: 16.50, category: 'principales',  active: true, order: 2 },
  { name: 'Pollo al ajillo',      description: 'Pollo de corral con salsa de ajillo',                  price: 13.90, category: 'principales',  active: true, order: 3 },
  { name: 'Margarita',            description: 'Tomate, mozzarella y albahaca fresca',                 price: 10.90, category: 'pizzas',        active: true, order: 1 },
  { name: 'Cuatro quesos',        description: 'Mozzarella, gorgonzola, emmental y parmesano',         price: 12.90, category: 'pizzas',        active: true, order: 2 },
  { name: 'Barbacoa',             description: 'Pollo, bacon, cebolla y salsa barbacoa',               price: 13.50, category: 'pizzas',        active: true, order: 3 },
  { name: 'Clásica',              description: 'Carne de ternera, lechuga, tomate y cheddar',          price: 10.90, category: 'hamburguesas',  active: true, order: 1 },
  { name: 'Crispy',               description: 'Pollo crujiente, coleslaw y salsa honey-mustard',      price: 11.50, category: 'hamburguesas',  active: true, order: 2 },
  { name: 'Tiramisú casero',      description: 'Receta tradicional italiana',                           price: 5.90,  category: 'postres',      active: true, order: 1 },
  { name: 'Tarta de queso',       description: 'Con coulis de frutos rojos',                           price: 5.50,  category: 'postres',      active: true, order: 2 },
  { name: 'Coulant de chocolate', description: 'Con helado de vainilla',                               price: 6.50,  category: 'postres',      active: true, order: 3 },
  { name: 'Agua mineral 50cl',    description: 'Con o sin gas',                                        price: 1.80,  category: 'bebidas',      active: true, order: 1 },
  { name: 'Refresco',             description: 'Cola, Fanta, Sprite',                                  price: 2.50,  category: 'bebidas',      active: true, order: 2 },
  { name: 'Cerveza',              description: 'Caña o botellín',                                      price: 2.80,  category: 'bebidas',      active: true, order: 3 },
  { name: 'Vino de la casa',      description: 'Tinto, blanco o rosado (copa)',                        price: 3.50,  category: 'bebidas',      active: true, order: 4 },
]

// 2. Borrar productos existentes
console.log('\n🗑️  Eliminando productos existentes...')
const prodSnap = await getDocs(collection(db, 'products'))
for (const d of prodSnap.docs) {
  await deleteDoc(doc(db, 'products', d.id))
  process.stdout.write('.')
}
console.log(` ${prodSnap.size} eliminados\n`)

// 3. Insertar con IDs correctos de categoría
console.log('📦 Cargando productos con categorías correctas...')
let ok = 0, skip = 0
for (const p of PRODUCTS) {
  const label = slugToLabel[p.category]
  const catId  = catMap[label]
  if (!catId) { console.log(`⚠️  Sin categoría para "${p.category}", saltando ${p.name}`); skip++; continue }
  await addDoc(collection(db, 'products'), { ...p, category: catId, createdAt: Date.now() })
  process.stdout.write('.')
  ok++
}
console.log(`\n\n✅ ${ok} productos cargados${skip ? `, ${skip} saltados` : ''}`)
process.exit(0)
