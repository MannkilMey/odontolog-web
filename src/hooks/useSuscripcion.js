import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSuscripcion(userId) {
  const [loading, setLoading] = useState(true)
  const [suscripcion, setSuscripcion] = useState(null)
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    if (userId) {
      loadSuscripcion()
    }
  }, [userId])

  const loadSuscripcion = async () => {
    try {
      setLoading(true)

      // Obtener suscripción activa del usuario con información del plan
      const { data, error } = await supabase
        .from('suscripciones_usuarios')
        .select(`
          *,
          plan:plan_id (*)
        `)
        .eq('dentista_id', userId)
        .eq('estado', 'activa')
        .single()

      if (error) {
        console.error('Error loading subscription:', error)
        // Si no tiene suscripción, asignar plan FREE
        await asignarPlanFree(userId)
        await loadSuscripcion() // Recargar
        return
      }

      setSuscripcion(data)
      setPlan(data.plan)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const asignarPlanFree = async (dentista_id) => {
    try {
      // Obtener plan FREE
      const { data: planFree } = await supabase
        .from('planes_suscripcion')
        .select('id')
        .eq('codigo', 'free')
        .single()

      if (!planFree) return

      // Crear suscripción FREE
      await supabase
        .from('suscripciones_usuarios')
        .insert({
          dentista_id: dentista_id,
          plan_id: planFree.id,
          estado: 'activa'
        })
    } catch (error) {
      console.error('Error asignando plan free:', error)
    }
  }

  const refresh = () => {
    loadSuscripcion()
  }

  // Helpers de verificación
  const isFree = plan?.codigo === 'free'
  const isPro = plan?.codigo === 'pro'
  const isEnterprise = plan?.codigo === 'enterprise'
  const isPremium = isPro || isEnterprise

  // Verificar si tiene acceso a una función
  const tieneAcceso = (feature) => {
    const accesos = {
      'exportar': isPremium,
      'backups': isPremium,
      'odontograma': true, // Todos tienen acceso
      'reportes': true,
      'mensajes_basicos': true,
      'mensajes_ilimitados': isPremium,
      'pacientes_ilimitados': isPremium,
      'soporte_prioritario': isPremium,
      'api_access': isEnterprise,
      'multiples_usuarios': isEnterprise,
    }

    return accesos[feature] || false
  }

  return {
    loading,
    suscripcion,
    plan,
    isFree,
    isPro,
    isEnterprise,
    isPremium,
    tieneAcceso,
    refresh,
  }
}