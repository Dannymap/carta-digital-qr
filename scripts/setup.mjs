/**
 * Script de setup inicial — ejecutar UNA vez:
 *   node scripts/setup.mjs
 *
 * Crea el usuario admin y carga productos de ejemplo en Firestore.
 * Requiere que en Firebase Console tengas habilitado:
 *   - Firestore Database
 *   - Authentication > Email/Contraseña
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCWoAJnUVRVB9Lhej7gqrQbKxPDiYjhdp8',
  authDomain: 'restaurantsqr-eac86.firebaseapp.com',
  projectId: 'restaurantsqr-eac86',
  storageBucket: 'restaurantsqr-eac86.firebasestorage.app',
  messagingSenderId: '576684252174',
  appId: '1:576684252174:web:961dea85ff5de13757305f',
}

// ── CONFIGURA AQUÍ TU ADMIN ──────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@mirestaurante.com'
const ADMIN_PASSWORD = 'Admin1234!'
// ────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  // Entrantes
  { name: 'Ensalada César', description: 'Lechuga romana, pollo, parmesano y picatostes', price: 9.50,  category: 'entrantes',   active: true, order: 1 },
  { name: 'Croquetas caseras', description: 'Croquetas de jamón ibérico (6 uds)', price: 7.90,  category: 'entrantes',   active: true, order: 2 },
  { name: 'Patatas bravas',   description: 'Con salsa brava y alioli',                price: 5.50,  category: 'entrantes',   active: true, order: 3 },

  // Principales
  { name: 'Solomillo a la plancha', description: 'Con patatas y pimientos asados',        price: 18.90, category: 'principales', active: true, order: 1 },
  { name: 'Merluza al horno',       description: 'Con verduras de temporada',             price: 16.50, category: 'principales', active: true, order: 2 },
  { name: 'Pollo al ajillo',        description: 'Pollo de corral con salsa de ajillo',   price: 13.90, category: 'principales', active: true, order: 3 },

  // Pizzas
  { name: 'Margarita',    description: 'Tomate, mozzarella y albahaca fresca',            price: 10.90, category: 'pizzas',      active: true, order: 1 },
  { name: 'Cuatro quesos', description: 'Mozzarella, gorgonzola, emmental y parmesano',  price: 12.90, category: 'pizzas',      active: true, order: 2 },
  { name: 'Barbacoa',     description: 'Pollo, bacon, cebolla y salsa barbacoa',          price: 13.50, category: 'pizzas',      active: true, order: 3 },

  // Hamburguesas
  { name: 'Clásica',     description: 'Carne de ternera, lechuga, tomate y cheddar',     price: 10.90, category: 'hamburguesas', active: true, order: 1 },
  { name: 'Crispy',      description: 'Pollo crujiente, coleslaw y salsa honey-mustard', price: 11.50, category: 'hamburguesas', active: true, order: 2 },

  // Postres
  { name: 'Tiramisú casero', description: 'Receta tradicional italiana',                 price: 5.90,  category: 'postres',     active: true, order: 1 },
  { name: 'Tarta de queso',  description: 'Con coulis de frutos rojos',                  price: 5.50,  category: 'postres',     active: true, order: 2 },
  { name: 'Coulant de chocolate', description: 'Con helado de vainilla',                 price: 6.50,  category: 'postres',     active: true, order: 3 },

  // Bebidas
  { name: 'Agua mineral 50cl', description: 'Con o sin gas',      price: 1.80, category: 'bebidas', active: true, order: 1 },
  { name: 'Refresco',          description: 'Cola, Fanta, Sprite', price: 2.50, category: 'bebidas', active: true, order: 2 },
  { name: 'Cerveza',           description: 'Caña o botellín',     price: 2.80, category: 'bebidas', active: true, order: 3 },
  { name: 'Vino de la casa',   description: 'Tinto, blanco o rosado (copa)', price: 3.50, category: 'bebidas', active: true, order: 4 },
]

async function main() {
  console.log('🚀 Iniciando setup...\n')
  const app  = initializeApp(firebaseConfig)
  const db   = getFirestore(app)
  const auth = getAuth(app)

  // 1. Crear usuario admin
  console.log(`👤 Creando usuario admin: ${ADMIN_EMAIL}`)
  try {
    await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log(`   ✅ Usuario creado — email: ${ADMIN_EMAIL} | pass: ${ADMIN_PASSWORD}\n`)
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log('   ℹ️  El usuario ya existe, continuando...\n')
    } else {
      console.error('   ❌ Error al crear usuario:', e.message)
      console.log('   → Asegúrate de tener Email/Contraseña habilitado en Firebase Auth\n')
    }
  }

  // 2. Autenticar para tener permisos de escritura
  console.log('🔑 Autenticando...')
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log('   ✅ Autenticado\n')
  } catch (e) {
    console.error('   ❌ Error al autenticar:', e.message)
    process.exit(1)
  }

  // 3. Comprobar si ya hay productos
  const existing = await getDocs(collection(db, 'products'))
  if (existing.size > 0) {
    console.log(`ℹ️  Ya hay ${existing.size} productos en Firestore. Saltando seed.\n`)
  } else {
    // 3. Cargar productos
    console.log(`📦 Cargando ${PRODUCTS.length} productos de ejemplo...`)
    for (const product of PRODUCTS) {
      await addDoc(collection(db, 'products'), { ...product, createdAt: Date.now() })
      process.stdout.write('.')
    }
    console.log(`\n   ✅ ${PRODUCTS.length} productos cargados\n`)
  }

  console.log('🎉 Setup completado!\n')
  console.log('──────────────────────────────────────')
  console.log('  Panel admin: http://localhost:5173/admin/login')
  console.log(`  Email:       ${ADMIN_EMAIL}`)
  console.log(`  Contraseña:  ${ADMIN_PASSWORD}`)
  console.log('──────────────────────────────────────\n')
  process.exit(0)
}

main().catch(e => {
  console.error('Error fatal:', e.message)
  process.exit(1)
})
