import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useActivityTracker(userId) {
  useEffect(() => {
    if (!userId) return

    // Actualizar actividad al montar
    updateActivity(userId)

    // Actualizar cada 5 minutos
    const interval = setInterval(() => {
      updateActivity(userId)
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [userId])
}

async function updateActivity(userId) {
  try {
    await supabase
      .from('usuarios_actividad')
      .upsert({
        dentista_id: userId,
        ultima_actividad: new Date().toISOString()
      }, {
        onConflict: 'dentista_id'
      })
  } catch (error) {
    console.error('Error updating activity:', error)
  }
}