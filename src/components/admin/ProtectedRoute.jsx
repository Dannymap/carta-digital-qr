import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../config/firebase'
import { getStaffMember } from '../../services/staff'

export function ProtectedRoute({ children }) {
  const [state, setState] = useState({ status: 'loading', role: null })
  const navigate = useNavigate()

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) { setState({ status: 'unauth', role: null }); return }
      const member = await getStaffMember(user.uid)
      const role = member?.role ?? 'admin'
      if (role === 'cocinero') { navigate('/cocina', { replace: true }); return }
      setState({ status: 'ok', role })
    })
  }, [])

  if (state.status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  )

  if (state.status === 'unauth') return <Navigate to="/admin/login" replace />

  // Pass role as prop to child (Admin)
  return typeof children === 'function'
    ? children(state.role)
    : <children.type {...children.props} role={state.role} />
}
