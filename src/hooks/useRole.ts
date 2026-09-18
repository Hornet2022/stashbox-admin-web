import { useAuthStore } from '../store/auth'
import type { AdminRole } from '../types'

export function useRole(): AdminRole | null {
  const role = useAuthStore((s) => s.role)
  return (role as AdminRole | null) ?? null
}

export function hasPermission(role: AdminRole | null, required: AdminRole[]): boolean {
  if (!role) return false
  if (role === 'admin') return required.includes('super_admin')
  return required.includes(role)
}
