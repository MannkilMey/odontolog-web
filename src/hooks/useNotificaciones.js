import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ✅ HOOK ULTRA-OPTIMIZADO PARA PROVIDER ÚNICO
export function useNotificaciones(userId, isPremium = false) {
  console.log('🔔 useNotificaciones montado para userId:', userId, 'isPremium:', isPremium)

  // ✅ useRef PARA DATOS ESTABLES
  const dataRef = useRef({
    notificaciones: [],
    noLeidas: 0,
    totalCount: 0,
    loading: false,
    error: null,
    lastFetch: null,
    initialized: false,
    subscriptionActive: false
  })

  // ✅ useState MÍNIMO
  const [, forceUpdate] = useState({})
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  // ✅ CACHE CON TTL DE 5 MINUTOS
  const cacheRef = useRef(new Map())
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  // ✅ REF PARA SUBSCRIPTION CONTROL
  const subscriptionRef = useRef(null)
  const loadingRef = useRef(false)

  // ✅ FUNCIÓN SIMPLIFICADA CON DEBOUNCING
  const loadNotificaciones = useCallback(async (force = false) => {
    // ✅ EARLY RETURN SI NO HAY CONDICIONES
    if (!userId) {
      console.log('❌ Notificaciones: No hay userId')
      dataRef.current = {
        ...dataRef.current,
        notificaciones: [],
        noLeidas: 0,
        totalCount: 0,
        loading: false,
        error: null,
        initialized: true
      }
      triggerUpdate()
      return
    }

    if (!isPremium) {
      console.log('🚫 Notificaciones: Usuario no premium')
      dataRef.current = {
        ...dataRef.current,
        notificaciones: [],
        noLeidas: 0,
        totalCount: 0,
        loading: false,
        error: 'Funcionalidad premium requerida',
        initialized: true
      }
      triggerUpdate()
      return
    }

    // 🛡️ PREVENIR CARGA SIMULTÁNEA
    if (loadingRef.current && !force) {
      console.log('⚠️ Notificaciones: Ya hay una carga en progreso')
      return
    }

    // 📦 VERIFICAR CACHE FIRST (solo si no es forzado)
    const cacheKey = `notifications_${userId}`
    if (!force) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('📦 Notificaciones: Usando caché')
        dataRef.current = { 
          ...cached.data,
          initialized: true 
        }
        triggerUpdate()
        return
      }
    }

    console.log('🔄 Notificaciones: Cargando desde BD')
    loadingRef.current = true
    dataRef.current.loading = true
    dataRef.current.error = null
    triggerUpdate()

    try {
      // 🎯 QUERY SIMPLIFICADO - SIN JOINS PROBLEMÁTICOS
      const { data: notificaciones, error, count } = await supabase
        .from('notificaciones_clinica')
        .select(`
          id,
          tipo,
          titulo,
          mensaje,
          leida,
          leida_at,
          metadata,
          created_at,
          paciente_id,
          cita_id
        `, { count: 'exact' })
        .eq('dentista_id', userId)
        .order('created_at', { ascending: false })
        .limit(50) // Solo últimas 50

      if (error) {
        console.error('❌ Error cargando notificaciones:', error)
        dataRef.current = {
          ...dataRef.current,
          notificaciones: [],
          noLeidas: 0,
          totalCount: 0,
          loading: false,
          error: error.message,
          lastFetch: Date.now(),
          initialized: true
        }
        triggerUpdate()
        return
      }

      // ✅ PROCESAR DATOS SIN JOINS
      const notificacionesProcesadas = (notificaciones || []).map(notif => ({
        ...notif,
        // No intentar joins - solo usar datos básicos
        paciente_nombre: notif.metadata?.paciente_nombre || 'Paciente',
        cita_info: notif.metadata?.cita_info || null
      }))

      const noLeidas = notificacionesProcesadas.filter(n => !n.leida).length

      // 💾 ACTUALIZAR STATE
      dataRef.current = {
        notificaciones: notificacionesProcesadas,
        noLeidas: noLeidas,
        totalCount: count || 0,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        initialized: true,
        subscriptionActive: dataRef.current.subscriptionActive
      }

      // 📦 GUARDAR EN CACHE
      cacheRef.current.set(cacheKey, {
        data: { ...dataRef.current },
        timestamp: Date.now()
      })

      console.log(`✅ Notificaciones cargadas: ${notificaciones?.length || 0} total, ${noLeidas} no leídas`)
      triggerUpdate()

    } catch (error) {
      console.error('💥 Error inesperado cargando notificaciones:', error)
      dataRef.current.error = error.message
      dataRef.current.loading = false
      dataRef.current.initialized = true
      triggerUpdate()
    } finally {
      loadingRef.current = false
    }
  }, [userId, isPremium, triggerUpdate])

  // ✅ FUNCIÓN ELIMINAR NOTIFICACIÓN (FRONTEND)
  const eliminarNotificacion = useCallback(async (notificacionId) => {
    if (!userId || !isPremium) return

    try {
      console.log('🗑️ Eliminando notificación frontend:', notificacionId)

      // ✅ ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE (UX optimista)
      const updatedNotificaciones = dataRef.current.notificaciones.filter(
        notif => notif.id !== notificacionId
      )
      const newNoLeidas = updatedNotificaciones.filter(n => !n.leida).length

      dataRef.current.notificaciones = updatedNotificaciones
      dataRef.current.noLeidas = newNoLeidas
      dataRef.current.totalCount = Math.max(0, dataRef.current.totalCount - 1)

      // Limpiar cache
      cacheRef.current.delete(`notifications_${userId}`)
      
      triggerUpdate()
      console.log('✅ Notificación eliminada (frontend only)')

    } catch (error) {
      console.error('💥 Error eliminando notificación:', error)
    }
  }, [userId, isPremium, triggerUpdate])

  // ✅ FUNCIÓN PARA MARCAR COMO LEÍDA
  const marcarComoLeida = useCallback(async (notificacionId) => {
    if (!userId || !isPremium) return

    try {
      console.log('📖 Marcando notificación como leída:', notificacionId)

      const { error } = await supabase
        .from('notificaciones_clinica')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('id', notificacionId)
        .eq('dentista_id', userId)

      if (error) {
        console.error('❌ Error marcando como leída:', error)
        return
      }

      // ✅ ACTUALIZAR ESTADO LOCAL
      const updatedNotificaciones = dataRef.current.notificaciones.map(notif => 
        notif.id === notificacionId 
          ? { ...notif, leida: true, leida_at: new Date().toISOString() }
          : notif
      )

      const newNoLeidas = updatedNotificaciones.filter(n => !n.leida).length

      dataRef.current.notificaciones = updatedNotificaciones
      dataRef.current.noLeidas = newNoLeidas

      cacheRef.current.delete(`notifications_${userId}`)
      
      triggerUpdate()
      console.log('✅ Notificación marcada como leída')

    } catch (error) {
      console.error('💥 Error marcando notificación:', error)
    }
  }, [userId, isPremium, triggerUpdate])

  // ✅ FUNCIÓN PARA MARCAR TODAS COMO LEÍDAS
  const marcarTodasComoLeidas = useCallback(async () => {
    if (!userId || !isPremium) return

    try {
      console.log('📖 Marcando todas las notificaciones como leídas')

      const { error } = await supabase
        .from('notificaciones_clinica')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('dentista_id', userId)
        .eq('leida', false)

      if (error) {
        console.error('❌ Error marcando todas como leídas:', error)
        return
      }

      // ✅ ACTUALIZAR ESTADO LOCAL
      const updatedNotificaciones = dataRef.current.notificaciones.map(notif => ({
        ...notif,
        leida: true,
        leida_at: new Date().toISOString()
      }))

      dataRef.current.notificaciones = updatedNotificaciones
      dataRef.current.noLeidas = 0

      cacheRef.current.delete(`notifications_${userId}`)
      
      triggerUpdate()
      console.log('✅ Todas las notificaciones marcadas como leídas')

    } catch (error) {
      console.error('💥 Error marcando todas las notificaciones:', error)
    }
  }, [userId, isPremium, triggerUpdate])

  // ✅ FUNCIÓN REFRESH MANUAL
  const refreshNotificaciones = useCallback(() => {
    cacheRef.current.delete(`notifications_${userId}`)
    loadingRef.current = false
    loadNotificaciones(true)
  }, [userId, loadNotificaciones])

  // ✅ EFFECT PRINCIPAL - OPTIMIZADO PARA PROVIDER ÚNICO
  useEffect(() => {
    // Solo cargar si no está inicializado y hay condiciones
    if (!dataRef.current.initialized && userId && isPremium) {
      loadNotificaciones()
    } else if (!userId || !isPremium) {
      // Reset datos si no cumple condiciones
      dataRef.current = {
        notificaciones: [],
        noLeidas: 0,
        totalCount: 0,
        loading: false,
        error: !isPremium ? 'Funcionalidad premium requerida' : null,
        lastFetch: null,
        initialized: true,
        subscriptionActive: false
      }
      triggerUpdate()
    }
  }, [userId, isPremium, loadNotificaciones])

  // ✅ REALTIME SUBSCRIPTION OPTIMIZADA
  useEffect(() => {
    // Solo crear subscription si cumple condiciones y no existe
    if (!userId || !isPremium || dataRef.current.subscriptionActive) return

    console.log('🔄 Configurando subscription realtime para notificaciones')

    const subscription = supabase
      .channel(`notificaciones_realtime_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones_clinica',
          filter: `dentista_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Notificación realtime recibida:', payload.eventType)
          
          // Recargar después de 100ms (debounce)
          setTimeout(() => {
            if (dataRef.current.initialized) {
              refreshNotificaciones()
            }
          }, 100)
        }
      )
      .subscribe()

    // Marcar subscription como activa
    dataRef.current.subscriptionActive = true
    subscriptionRef.current = subscription

    return () => {
      console.log('🔄 Limpiando subscription realtime')
      subscription.unsubscribe()
      dataRef.current.subscriptionActive = false
      subscriptionRef.current = null
    }
  }, [userId, isPremium, refreshNotificaciones])

  // ✅ RETURN OPTIMIZADO
  return {
    // DATOS
    notificaciones: dataRef.current.notificaciones,
    noLeidas: dataRef.current.noLeidas,
    totalCount: dataRef.current.totalCount,
    
    // ESTADOS
    loading: dataRef.current.loading,
    error: dataRef.current.error,
    lastFetch: dataRef.current.lastFetch,
    initialized: dataRef.current.initialized,
    
    // FUNCIONES
    eliminarNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refreshNotificaciones,
    
    // METADATOS
    isPremium,
    isEnabled: isPremium
  }
}

export default useNotificaciones