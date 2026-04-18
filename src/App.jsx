import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import { ProtectedRoute } from './components/admin/ProtectedRoute'
import Menu from './pages/Menu'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import { RESTAURANT } from './config/restaurant'

function ApplyTheme() {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', RESTAURANT.colors.primary)
    root.style.setProperty('--color-secondary', RESTAURANT.colors.secondary)
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ApplyTheme />
      <CartProvider>
        <Routes>
          {/* Cliente: escanea QR → /mesa/3 */}
          <Route path="/mesa/:mesa" element={<Menu />} />

          {/* Ruta raíz → redirige a mesa 1 como demo */}
          <Route path="/" element={<Navigate to="/mesa/1" replace />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  )
}
