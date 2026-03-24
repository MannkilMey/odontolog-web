import { supabase } from '../lib/supabase'

// ✅ CONTENT TEMPLATE SIDs (tus templates aprobados)
const TEMPLATES = {
  recordatorio_cita: 'HXfb9b72d5f8e1ef9582ef2fcd8e8dff39',
  recordatorio_cuota: 'HX5tfOf5cd8dd5d123dcce7e48746e2594',
  recordatorio_cita_con_links: 'HX6e1a422f37450fec0bf20a10c40ddaa2', // 🆕 NUEVO
}

/**
 * Enviar WhatsApp usando Content Template de Twilio
 */
export const enviarWhatsAppTemplate = async ({ 
  to, 
  tipo, 
  variables, 
  pacienteId 
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // 🆕 Obtener el access token del usuario
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa')
    }

    // Obtener Content SID según el tipo
    const contentSid = TEMPLATES[tipo]
    
    if (!contentSid) {
      throw new Error(`Template no encontrado para tipo: ${tipo}`)
    }

    console.log('📋 Enviando con template:', tipo)
    console.log('📝 Content SID:', contentSid)
    console.log('📝 Variables:', variables)

    const response = await fetch(
      'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/enviar-whatsapp-twilio',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`, // 🆕 Usar access token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          dentistaId: user.id,
          pacienteId,
          tipo,
          contentSid,
          contentVariables: variables
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
    console.error('Error en enviarWhatsAppTemplate:', error)
    throw error
  }
}

/**
 * Enviar WhatsApp simple (sin template) - Para mensajes con links
 */
export const enviarWhatsAppSimple = async ({ to, mensaje, pacienteId, tipo }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // 🆕 Obtener el access token del usuario
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa')
    }

    console.log('💬 Enviando mensaje simple')
    console.log('🔑 Token a enviar:', session.access_token.substring(0, 50) + '...')
    console.log('👤 Usuario ID:', user.id)

    const response = await fetch(
      'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/enviar-whatsapp-twilio',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`, // 🆕 Usar access token
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
    console.error('Error en enviarWhatsAppSimple:', error)
    throw error
  }
}

/**
 * LEGACY: Mantener por compatibilidad (redirige a enviarWhatsAppSimple)
 */
export const enviarWhatsAppTwilio = enviarWhatsAppSimple

/**
 * Verificar límite de WhatsApp antes de enviar
 */
export const verificarLimiteWhatsApp = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { permitido: false, mensaje: 'No autenticado' }
    }

    // Obtener suscripción
    const { data: suscripcion, error: errorSub } = await supabase
      .from('suscripciones_usuarios')
      .select('whatsapp_usados_mes, plan_id')
      .eq('dentista_id', user.id)
      .single()

    if (errorSub || !suscripcion) {
      return { permitido: false, mensaje: 'Sin suscripción activa' }
    }

    // Obtener plan
    const { data: plan, error: errorPlan } = await supabase
      .from('planes_suscripcion')
      .select('codigo, nombre, limite_whatsapp_mes')
      .eq('id', suscripcion.plan_id)
      .single()

    if (errorPlan || !plan) {
      return { permitido: false, mensaje: 'Error al verificar plan' }
    }

    // Plan Free no permite WhatsApp
    if (plan.codigo === 'free') {
      return {
        permitido: false,
        mensaje: 'El plan Gratuito no incluye WhatsApp.\nActualiza a Pro o Enterprise para enviar mensajes.',
        planActual: plan.nombre
      }
    }

    const limite = plan.limite_whatsapp_mes
    const usado = suscripcion.whatsapp_usados_mes || 0

    console.log('📊 Límite WhatsApp:', { limite, usado, plan: plan.nombre })

    // Verificar límite
    if (limite !== null && usado >= limite) {
      return {
        permitido: false,
        mensaje: `Has alcanzado el límite de ${limite} WhatsApp/mes.\nUsados: ${usado}\n\nActualiza tu plan para enviar más mensajes.`,
        usado,
        limite,
        planActual: plan.nombre
      }
    }

    return {
      permitido: true,
      usado,
      limite,
      restantes: limite ? limite - usado : 'Ilimitados',
      planActual: plan.nombre
    }

  } catch (error) {
    console.error('Error verificando límite:', error)
    return { permitido: true } // Fail-safe
  }
}