// ── CONFIGURACIÓN DEL RESTAURANTE ──────────────────────────────────────────
// Edita este archivo para personalizar la app para cada restaurante.

export const RESTAURANT = {
  name: 'Mi Restaurante',
  tagline: 'Cocina artesanal desde 1990',
  logo: null,           // ruta a imagen, ej: '/logo.png'  o null para usar icono
  logoIcon: '🍽️',      // emoji fallback cuando no hay logo
  phone: '+34 600 000 000',
  address: 'Calle Principal 1, Ciudad',
  currency: '€',
  vatNote: 'Precios sin IVA incluido',
  allergenNote: 'Informamos de alérgenos bajo petición',
  totalTables: 10,       // número de mesas para generar QRs

  // ── COLORES ──────────────────────────────────────────────────────────────
  // Cambia estos valores para adaptar los colores de la app
  colors: {
    primary: '#e63946',    // color principal (botones, tabs activos, precios)
    secondary: '#1d3557',  // color secundario (navbar, footer)
    primaryText: '#ffffff', // texto sobre color primario
  },

  // ── CATEGORÍAS ───────────────────────────────────────────────────────────
  categories: [
    { id: 'entrantes',  label: 'Entrantes',   icon: '🥗' },
    { id: 'principales', label: 'Principales', icon: '🍽️' },
    { id: 'pizzas',     label: 'Pizzas',       icon: '🍕' },
    { id: 'hamburguesas', label: 'Hamburguesas', icon: '🍔' },
    { id: 'postres',    label: 'Postres',      icon: '🍮' },
    { id: 'bebidas',    label: 'Bebidas',      icon: '🥤' },
  ],
}
