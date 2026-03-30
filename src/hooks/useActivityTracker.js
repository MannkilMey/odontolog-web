import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// 🚀 CACHÉ PARA EVITAR UPDATES REDUNDANTES
const lastActivityMap = new Map()
const MIN_UPDATE_INTERVAL = 2 * 60 * 1000 // 2 minutos mínimo entre updates

export function useActivityTracker(userId) {
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const isMountedRef = useRef(true)
  const lastUserIdRef = useRef(null)

  // ✅ FUNCIÓN OPTIMIZADA PARA ACTUALIZAR ACTIVIDAD
  const updateActivity = useCallback(async (targetUserId, force = false) => {
    if (!targetUserId || !isMountedRef.current) return

    try {
      const now = Date.now()
      const lastUpdate = lastActivityMap.get(targetUserId) || 0
      
      // ⚡ EVITAR UPDATES DEMASIADO FRECUENTES
      if (!force && (now - lastUpdate) < MIN_UPDATE_INTERVAL) {
        console.log('⏭️ Saltando update de actividad (muy reciente)')
        return
      }

      console.log('🔄 Actualizando actividad del usuario')

      const { error } = await supabase
        .from('usuarios_actividad')
        .upsert({
          dentista_id: targetUserId,
          ultima_actividad: new Date().toISOString()
        }, {
          onConflict: 'dentista_id'
        })

      if (error) {
        console.error('💥 Error updating activity:', error)
        return
      }

      // 🚀 GUARDAR TIMESTAMP DEL ÚLTIMO UPDATE
      lastActivityMap.set(targetUserId, now)
      console.log('✅ Actividad actualizada correctamente')

    } catch (err) {
      console.error('💥 Error en updateActivity:', err)
    }
  }, [])

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS DE VISIBILIDAD
  const handleVisibilityChange = useCallback((targetUserId) => {
    if (!targetUserId || !isMountedRef.current) return

    if (document.visibilityState === 'visible') {
      console.log('👁️ Ventana visible - actualizando actividad')
      updateActivity(targetUserId, false)
      
      // Reiniciar interval si está visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' && isMountedRef.current) {
          updateActivity(targetUserId, false)
        }
      }, 5 * 60 * 1000) // 5 minutos
      
    } else {
      console.log('🙈 Ventana oculta - pausando tracking')
      
      // Limpiar interval cuando no está visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [updateActivity])

  // ✅ FUNCIÓN PARA SETUP COMPLETO
  const setupActivityTracking = useCallback((targetUserId) => {
    if (!targetUserId) return

    console.log('🎯 Iniciando tracking de actividad para:', targetUserId)

    // ⚡ DEBOUNCING - esperar antes de first update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return

      // 🚀 PRIMERA ACTUALIZACIÓN (forzada)
      updateActivity(targetUserId, true)

      // 👁️ SETUP VISIBILITY LISTENER
      const visibilityHandler = () => handleVisibilityChange(targetUserId)
      document.addEventListener('visibilitychange', visibilityHandler)

      // 🕐 SETUP INTERVAL SOLO SI LA VENTANA ESTÁ VISIBLE
      if (document.visibilityState === 'visible') {
        intervalRef.current = setInterval(() => {
          if (document.visibilityState === 'visible' && isMountedRef.current) {
            updateActivity(targetUserId, false)
          }
        }, 5 * 60 * 1000) // 5 minutos
      }

      // 🧹 CLEANUP FUNCTION
      return () => {
        document.removeEventListener('visibilitychange', visibilityHandler)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 500) // 500ms de debounce

  }, [updateActivity, handleVisibilityChange])

  // ✅ EFFECT PRINCIPAL OPTIMIZADO
  useEffect(() => {
    // Solo proceder si userId cambió realmente
    if (!userId || lastUserIdRef.current === userId) {
      return
    }

    lastUserIdRef.current = userId

    // 🧹 LIMPIAR RECURSOS ANTERIORES
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 🚀 SETUP NUEVO TRACKING
    const cleanup = setupActivityTracking(userId)

    // ✅ CLEANUP FUNCTION
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [userId, setupActivityTracking])

  // ✅ CLEANUP AL DESMONTAR COMPONENTE
  useEffect(() => {
    return () => {
      console.log('🧹 Desmontando ActivityTracker')
      isMountedRef.current = false
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      // Limpiar visibility listener global si existe
      // (normalmente se limpia en el cleanup del effect anterior)
    }
  }, [])

  // ✅ FUNCIÓN MANUAL PARA FORZAR UPDATE (útil para testing)
  const forceUpdate = useCallback(() => {
    if (userId) {
      updateActivity(userId, true)
    }
  }, [userId, updateActivity])

  return {
    forceUpdate, // Función opcional para forzar update manual
  }
}

// 🧹 FUNCIÓN UTILITARIA PARA LIMPIAR CACHÉ
export const limpiarCacheActivity = () => {
  lastActivityMap.clear()
}

// 📊 FUNCIÓN UTILITARIA PARA VER ESTADO DEL CACHÉ (desarrollo)
export const getActivityCacheStatus = () => {
  return Array.from(lastActivityMap.entries()).map(([userId, timestamp]) => ({
    userId,
    lastUpdate: new Date(timestamp).toISOString(),
    minutesAgo: Math.floor((Date.now() - timestamp) / (60 * 1000))
  }))
}