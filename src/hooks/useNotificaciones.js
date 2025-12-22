import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    checkPlanAndLoadNotificaciones()
    
    // Suscribirse a cambios
    const channel = supabase
      .channel('notificaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones_clinica'
        },
        () => {
          loadNotificaciones()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const checkPlanAndLoadNotificaciones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // ✅ VERIFICAR PLAN
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios')
        .select('plan:planes_suscripcion(codigo)')
        .eq('dentista_id', user.id)
        .single()

      const esPremium = suscripcion?.plan?.codigo !== 'free'
      setIsPremium(esPremium)

      // Solo cargar notificaciones si es Premium
      if (esPremium) {
        await loadNotificaciones()
      } else {
        setLoading(false)
      }

    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const loadNotificaciones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notificaciones_clinica')
        .select(`
          *,
          paciente:pacientes(nombre, apellido),
          cita:citas(fecha_cita, hora_inicio)
        `)
        .eq('dentista_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotificaciones(data || [])
      setNoLeidas(data?.filter(n => !n.leida).length || 0)

    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const marcarComoLeida = async (notificacionId) => {
    try {
      const { error } = await supabase
        .from('notificaciones_clinica')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('id', notificacionId)

      if (error) throw error

      await loadNotificaciones()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const marcarTodasComoLeidas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('notificaciones_clinica')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('dentista_id', user.id)
        .eq('leida', false)

      if (error) throw error

      await loadNotificaciones()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const eliminarNotificacion = async (notificacionId) => {
    try {
      const { error } = await supabase
        .from('notificaciones_clinica')
        .delete()
        .eq('id', notificacionId)

      if (error) throw error

      await loadNotificaciones()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return {
    notificaciones,
    noLeidas,
    loading,
    isPremium,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    refresh: loadNotificaciones
  }
}