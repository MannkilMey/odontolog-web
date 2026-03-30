import { createContext, useContext, useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════
// FIX A: useMemo en contextValue
// FIX B: Notificaciones DENTRO del Provider (sobrevive navegación)
// FIX E: useState simple en vez de dataRef + forceUpdate
//
// ANTES: contextValue se recreaba cada render → cascada de re-renders
//        useNotificaciones vivía en Dashboard → se reinicializaba al navegar
//        dataRef + forceUpdate → estados inconsistentes
//
// AHORA: contextValue memoizado, notificaciones centralizadas,
//        estado manejado con useState normal
// ═══════════════════════════════════════════════════════════

const SuscripcionContext = createContext(null)

// Estado inicial reutilizable
const INITIAL_STATE = {
  suscripcion: null,
  plan: null,
  isPremium: false,
  isFree: true,
  isAdmin: false,
  userProfile: null,
  needsOnboarding: false,
  limites: {
    mensajes_usados: 0,
    mensajes_limite: 0,
    whatsapp_usados: 0,
    whatsapp_limite: 0,
    emails_usados: 0,
    emails_limite: 0,
    pacientes_limite: 0
  },
  loading: true,
  error: null,
  lastFetch: null,
}

// Estado inicial de notificaciones
const INITIAL_NOTIF_STATE = {
  notificaciones: [],
  noLeidas: 0,
  totalCount: 0,
  loading: false,
  error: null,
  lastFetch: null,
}

export function SuscripcionProvider({ children, userId }) {
  // ✅ useState NORMAL - React optimiza batching automáticamente
  const [state, setState] = useState(INITIAL_STATE)
  const [notifState, setNotifState] = useState(INITIAL_NOTIF_STATE)
  
  // ✅ Refs para control de flujo (NO para datos de UI)
  const loadingRef = useRef(false)
  const notifLoadingRef = useRef(false)
  const notifSubscriptionRef = useRef(null)
  const prevUserIdRef = useRef(null)
  const cacheRef = useRef(new Map())
  
  const CACHE_TTL = 15 * 60 * 1000 // 15 min para suscripción
  const NOTIF_CACHE_TTL = 5 * 60 * 1000 // 5 min para notificaciones

  // ═══════════════════════════════════════════════════════════
  // CARGA DE DATOS DE SUSCRIPCIÓN
  // ═══════════════════════════════════════════════════════════
  const loadCompleteUserData = useCallback(async (forceRefresh = false) => {
    if (!userId) return
    if (loadingRef.current) return

    // Verificar cache
    const cacheKey = `user_${userId}`
    if (!forceRefresh) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        setState(cached.data)
        return
      }
    }

    loadingRef.current = true
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data: userData, error: userError } = await supabase
        .from('dentistas')
        .select(`
          *,
          suscripciones_usuarios!inner (
            id, estado, fecha_inicio, fecha_fin,
            mensajes_usados_mes, whatsapp_usados_mes, emails_usados_mes,
            ultimo_reset_contador,
            planes_suscripcion!suscripciones_usuarios_plan_id_fkey (
              id, codigo, nombre, descripcion,
              limite_mensajes_mes, limite_pacientes,
              limite_whatsapp_mes, limite_emails_mes,
              precio_mensual_usd, caracteristicas,
              permite_multi_perfil, max_perfiles
            )
          )
        `)
        .eq('id', userId)
        .eq('suscripciones_usuarios.estado', 'activa')
        .single()

      if (userError) {
        if (userError.code === 'PGRST116') {
          await createFreePlanForUser(userId)
          loadingRef.current = false
          setTimeout(() => loadCompleteUserData(true), 2000)
          return
        }
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: userError.message,
        }))
        loadingRef.current = false
        return
      }
      
   
      const suscripcionRaw = userData.suscripciones_usuarios
      const suscripcion = Array.isArray(suscripcionRaw) ? suscripcionRaw[0] : suscripcionRaw
      const planRaw = suscripcion?.planes_suscripcion
      const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw
      const isAdmin = userData.email === 'president@odontolog.lat'
      const isPremium = !!plan && plan.codigo !== 'free' && plan.codigo !== 'gratis'

      const newState = {
        suscripcion,
        plan,
        isPremium,
        isFree: !isPremium,
        isAdmin,
        userProfile: {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          apellido: userData.apellido,
          clinica: userData.clinica,
          onboarding_completado: userData.onboarding_completado,
          fecha_onboarding: userData.fecha_onboarding
        },
        needsOnboarding: !userData.onboarding_completado,
        limites: {
          mensajes_usados: suscripcion?.mensajes_usados_mes || 0,
          mensajes_limite: plan?.limite_mensajes_mes || 0,
          whatsapp_usados: suscripcion?.whatsapp_usados_mes || 0,
          whatsapp_limite: plan?.limite_whatsapp_mes || 0,
          emails_usados: suscripcion?.emails_usados_mes || 0,
          emails_limite: plan?.limite_emails_mes || 0,
          pacientes_limite: plan?.limite_pacientes || 0
        },
        loading: false,
        error: null,
        lastFetch: Date.now(),
      }

      // Guardar en cache
      cacheRef.current.set(cacheKey, { data: newState, timestamp: Date.now() })
      
      setState(newState)

    } catch (error) {
      console.error('💥 Context: Error inesperado:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    } finally {
      loadingRef.current = false
    }
  }, [userId])

  // ═══════════════════════════════════════════════════════════
  // FIX B: NOTIFICACIONES DENTRO DEL PROVIDER
  // Sobreviven navegación entre páginas, sin remontajes
  // ═══════════════════════════════════════════════════════════
  const loadNotificaciones = useCallback(async (force = false) => {
    if (!userId || !state.isPremium) {
      setNotifState({
        ...INITIAL_NOTIF_STATE,
        error: !state.isPremium ? 'Funcionalidad premium requerida' : null,
      })
      return
    }

    if (notifLoadingRef.current && !force) return

    // Cache check
    const cacheKey = `notif_${userId}`
    if (!force) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < NOTIF_CACHE_TTL) {
        setNotifState(cached.data)
        return
      }
    }

    notifLoadingRef.current = true
    setNotifState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data: notificaciones, error, count } = await supabase
        .from('notificaciones_clinica')
        .select(`
          id, tipo, titulo, mensaje, leida, leida_at,
          metadata, created_at, paciente_id, cita_id
        `, { count: 'exact' })
        .eq('dentista_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        setNotifState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
          lastFetch: Date.now(),
        }))
        return
      }

      const procesadas = (notificaciones || []).map(n => ({
        ...n,
        paciente_nombre: n.metadata?.paciente_nombre || 'Paciente',
        cita_info: n.metadata?.cita_info || null
      }))

      const noLeidas = procesadas.filter(n => !n.leida).length
      
      const newNotifState = {
        notificaciones: procesadas,
        noLeidas,
        totalCount: count || 0,
        loading: false,
        error: null,
        lastFetch: Date.now(),
      }

      cacheRef.current.set(cacheKey, { data: newNotifState, timestamp: Date.now() })
      setNotifState(newNotifState)

    } catch (error) {
      console.error('💥 Notificaciones error:', error)
      setNotifState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    } finally {
      notifLoadingRef.current = false
    }
  }, [userId, state.isPremium])

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════
  const eliminarNotificacion = useCallback((notificacionId) => {
    setNotifState(prev => {
      const updated = prev.notificaciones.filter(n => n.id !== notificacionId)
      return {
        ...prev,
        notificaciones: updated,
        noLeidas: updated.filter(n => !n.leida).length,
        totalCount: Math.max(0, prev.totalCount - 1),
      }
    })
    cacheRef.current.delete(`notif_${userId}`)
  }, [userId])

  const marcarComoLeida = useCallback(async (notificacionId) => {
    if (!userId || !state.isPremium) return

    const { error } = await supabase
      .from('notificaciones_clinica')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('id', notificacionId)
      .eq('dentista_id', userId)

    if (!error) {
      setNotifState(prev => {
        const updated = prev.notificaciones.map(n =>
          n.id === notificacionId ? { ...n, leida: true, leida_at: new Date().toISOString() } : n
        )
        return {
          ...prev,
          notificaciones: updated,
          noLeidas: updated.filter(n => !n.leida).length,
        }
      })
      cacheRef.current.delete(`notif_${userId}`)
    }
  }, [userId, state.isPremium])

  const marcarTodasComoLeidas = useCallback(async () => {
    if (!userId || !state.isPremium) return

    const { error } = await supabase
      .from('notificaciones_clinica')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('dentista_id', userId)
      .eq('leida', false)

    if (!error) {
      setNotifState(prev => ({
        ...prev,
        notificaciones: prev.notificaciones.map(n => ({
          ...n, leida: true, leida_at: new Date().toISOString()
        })),
        noLeidas: 0,
      }))
      cacheRef.current.delete(`notif_${userId}`)
    }
  }, [userId, state.isPremium])

  const refreshNotificaciones = useCallback(() => {
    cacheRef.current.delete(`notif_${userId}`)
    notifLoadingRef.current = false
    loadNotificaciones(true)
  }, [userId, loadNotificaciones])

  // Funciones de suscripción
  const refreshData = useCallback(() => {
    cacheRef.current.delete(`user_${userId}`)
    loadingRef.current = false
    loadCompleteUserData(true)
  }, [userId, loadCompleteUserData])

  const completeOnboarding = useCallback(async () => {
    if (!userId) return
    const { error } = await supabase
      .from('dentistas')
      .update({ onboarding_completado: true, fecha_onboarding: new Date().toISOString() })
      .eq('id', userId)

    if (!error) {
      setState(prev => ({
        ...prev,
        needsOnboarding: false,
        userProfile: prev.userProfile ? {
          ...prev.userProfile,
          onboarding_completado: true,
          fecha_onboarding: new Date().toISOString()
        } : null
      }))
      cacheRef.current.delete(`user_${userId}`)
    }
  }, [userId])

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════

  // Effect principal: cargar datos cuando userId cambia
  useEffect(() => {
    if (!userId) {
      // Reset completo si no hay usuario
      if (prevUserIdRef.current !== null) {
        setState(INITIAL_STATE)
        setNotifState(INITIAL_NOTIF_STATE)
        cacheRef.current.clear()
      }
      prevUserIdRef.current = null
      return
    }

    // Solo cargar si el userId cambió
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId
      loadCompleteUserData()
    }
  }, [userId, loadCompleteUserData])

  // Effect: cargar notificaciones cuando isPremium se confirma
  useEffect(() => {
    if (userId && state.isPremium && !state.loading) {
      loadNotificaciones()
    }
  }, [userId, state.isPremium, state.loading, loadNotificaciones])

  // Effect: Realtime subscription para notificaciones
  useEffect(() => {
    if (!userId || !state.isPremium) return

    // Limpiar subscription anterior si existe
    if (notifSubscriptionRef.current) {
      notifSubscriptionRef.current.unsubscribe()
      notifSubscriptionRef.current = null
    }

    
    let debounceTimer = null
    const subscription = supabase
      .channel(`notif_rt_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notificaciones_clinica',
        filter: `dentista_id=eq.${userId}`
      }, () => {
        // Debounce de 500ms para evitar múltiples recargas
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => refreshNotificaciones(), 500)
      })
      .subscribe()

    notifSubscriptionRef.current = subscription

    return () => {
      clearTimeout(debounceTimer)
      subscription.unsubscribe()
      notifSubscriptionRef.current = null
    }
  }, [userId, state.isPremium, refreshNotificaciones])

  // Helper para crear plan FREE
  const createFreePlanForUser = async (uid) => {
    try {
      const { data: freePlan } = await supabase
        .from('planes_suscripcion')
        .select('id')
        .eq('codigo', 'free')
        .single()

      if (freePlan) {
        await supabase.from('suscripciones_usuarios').insert({
          dentista_id: uid,
          plan_id: freePlan.id,
          estado: 'activa'
        })
      }
    } catch (error) {
      console.error('❌ Error creando plan FREE:', error)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FIX A: contextValue MEMOIZADO
  //
  // ANTES: Objeto nuevo cada render → todos los consumidores re-renderizan
  // AHORA: Solo cambia cuando state o notifState realmente cambian
  //        React compara por referencia → sin re-renders innecesarios
  // ═══════════════════════════════════════════════════════════
  const contextValue = useMemo(() => ({
    // Suscripción
    suscripcion: state.suscripcion,
    plan: state.plan,
    isPremium: state.isPremium,
    isFree: state.isFree,
    isAdmin: state.isAdmin,
    
    // Usuario
    userProfile: state.userProfile,
    needsOnboarding: state.needsOnboarding,
    
    // Límites
    limites: state.limites,
    
    // Estados suscripción
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,

    // Notificaciones (FIX B - centralizadas)
    notificaciones: notifState.notificaciones,
    noLeidas: notifState.noLeidas,
    notifTotalCount: notifState.totalCount,
    notifLoading: notifState.loading,
    notifError: notifState.error,

    // Funciones
    refreshData,
    completeOnboarding,
    eliminarNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refreshNotificaciones,
  }), [
    state, 
    notifState, 
    refreshData, 
    completeOnboarding,
    eliminarNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refreshNotificaciones,
  ])

  return (
    <SuscripcionContext.Provider value={contextValue}>
      {children}
    </SuscripcionContext.Provider>
  )
}

export function useSuscripcion() {
  const context = useContext(SuscripcionContext)
  if (!context) {
    throw new Error('useSuscripcion debe ser usado dentro de SuscripcionProvider')
  }
  return context
}

export { SuscripcionContext }
export default SuscripcionProvider