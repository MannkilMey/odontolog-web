import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setUser(user)

      // Verificar si el email es el admin
      const isAdminUser = user.email === 'president@odontolog.lat'
      setIsAdmin(isAdminUser)
      
    } catch (error) {
      console.error('Error checking admin:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  return { isAdmin, loading, user }
}