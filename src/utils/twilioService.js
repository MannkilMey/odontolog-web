import { supabase } from '../lib/supabase'

/**
 * Enviar WhatsApp vía Twilio
 * @param {Object} params
 * @param {string} params.to - Teléfono del destinatario (+595...)
 * @param {string} params.mensaje - Contenido del mensaje
 * @param {string} params.pacienteId - ID del paciente (opcional)
 * @param {string} params.tipo - Tipo de mensaje (opcional)
 * @returns {Promise<Object>}
 */
export const enviarWhatsAppTwilio = async ({ to, mensaje, pacienteId, tipo }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    const response = await fetch(
      'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/enviar-whatsapp-twilio',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          mensaje,
          dentistaId: user.id,
          pacienteId,
          tipo
        })
      }
    )

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al enviar WhatsApp')
    }

    return {
      success: true,
      sid: data.sid,
      usado: data.usado,
      limite: data.limite
    }

  } catch (error) {
    console.error('Error en enviarWhatsAppTwilio:', error)
    throw error
  }
}

/**
 * Verificar límite de WhatsApp antes de enviar
 * @returns {Promise<Object>}
 */
export const verificarLimiteWhatsApp = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { permitido: false, mensaje: 'No autenticado' }
    }

    const { data: suscripcion, error } = await supabase
      .from('suscripciones_usuarios')
      .select(`
        *,
        plan:planes_suscripcion(
          codigo,
          nombre,
          limite_whatsapp_mes
        )
      `)
      .eq('dentista_id', user.id)
      .single()

    if (error || !suscripcion) {
      return { permitido: false, mensaje: 'Sin suscripción activa' }
    }

    // Plan Free no permite WhatsApp
    if (suscripcion.plan.codigo === 'free') {
      return {
        permitido: false,
        mensaje: 'El plan Gratuito no incluye WhatsApp.\nActualiza a Pro o Enterprise para enviar mensajes.',
        planActual: suscripcion.plan.nombre
      }
    }

    const limite = suscripcion.plan.limite_whatsapp_mes
    const usado = suscripcion.whatsapp_usados_mes || 0

    // Verificar límite
    if (limite !== null && usado >= limite) {
      return {
        permitido: false,
        mensaje: `Has alcanzado el límite de ${limite} WhatsApp/mes.\nUsados: ${usado}\n\nActualiza tu plan para enviar más mensajes.`,
        usado,
        limite,
        planActual: suscripcion.plan.nombre
      }
    }

    return {
      permitido: true,
      usado,
      limite,
      restantes: limite ? limite - usado : 'Ilimitados',
      planActual: suscripcion.plan.nombre
    }

  } catch (error) {
    console.error('Error verificando límite:', error)
    return { permitido: true } // Fail-safe
  }
}