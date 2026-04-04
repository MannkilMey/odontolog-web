import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'

export function useLimitesPlan() {
  const { plan, limites, userProfile, isPremium } = useSuscripcion()
  const [limitInfo, setLimitInfo] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [loading, setLoading] = useState(false)

  const verificar = async (tipo) => {
    setLoading(true)
    try {
      const userId = userProfile?.id
      if (!userId) return { permitido: false, mensaje: 'No autenticado' }

      const planNombre = plan?.nombre || 'Gratuito'
      const planCodigo = plan?.codigo || 'free'
      let limite = null
      let usado = 0

      switch (tipo) {
        case 'pacientes': {
          limite = limites?.pacientes_limite ?? plan?.limite_pacientes ?? 20
          // Contar pacientes reales en la BD
          const { count } = await supabase
            .from('pacientes')
            .select('id', { count: 'exact', head: true })
            .eq('dentista_id', userId)
          usado = count || 0
          break
        }
        case 'emails': {
          limite = limites?.emails_limite ?? plan?.limite_emails_mes ?? 0
          usado = limites?.emails_usados ?? 0
          break
        }
        case 'whatsapp': {
          limite = limites?.whatsapp_limite ?? plan?.limite_whatsapp_mes ?? 0
          usado = limites?.whatsapp_usados ?? 0
          break
        }
        default:
          return { permitido: true }
      }

      // null o 0 en enterprise = ilimitado
      if (limite === null) {
        return { permitido: true, usado, limite: null, plan: planNombre, codigo: planCodigo }
      }

      const permitido = usado < limite
      const resultado = {
        permitido,
        usado,
        limite,
        restantes: Math.max(0, limite - usado),
        plan: planNombre,
        codigo: planCodigo,
        porcentajeUsado: limite > 0 ? Math.round((usado / limite) * 100) : 0,
        mensaje: !permitido
          ? `Has alcanzado el límite de ${limite} ${tipo} en el plan ${planNombre}.`
          : null
      }

      setLimitInfo(resultado)

      if (!permitido) {
        setShowUpgrade(true)
      }

      return resultado
    } catch (error) {
      console.error('Error verificando límite:', error)
      return { permitido: true } // Fail-safe: permitir en caso de error
    } finally {
      setLoading(false)
    }
  }

  return { verificar, limitInfo, showUpgrade, setShowUpgrade, loading }
}