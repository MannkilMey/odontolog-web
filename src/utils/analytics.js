import { supabase } from '../lib/supabase'

/**
 * Registrar ingreso de sesión
 */
export const registrarIngreso = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Detectar información del dispositivo
    const userAgent = navigator.userAgent
    const dispositivo = /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 
                       /Tablet|iPad/i.test(userAgent) ? 'tablet' : 'desktop'
    
    const navegador = userAgent.includes('Chrome') ? 'Chrome' :
                     userAgent.includes('Firefox') ? 'Firefox' :
                     userAgent.includes('Safari') ? 'Safari' : 'Otro'

    // Insertar sesión
    const { data, error } = await supabase
      .from('sesiones_usuarios')
      .insert({
        dentista_id: user.id,
        user_agent: userAgent,
        dispositivo: dispositivo,
        navegador: navegador,
        sistema_operativo: navigator.platform
      })
      .select()
      .single()

    if (error) {
      console.error('Error registrando sesión:', error)
      return null
    }

    // Guardar ID de sesión en localStorage para actualizar al salir
    localStorage.setItem('session_id', data.id)
    localStorage.setItem('session_start', new Date().toISOString())

    return data.id
  } catch (error) {
    console.error('Error en registrarIngreso:', error)
    return null
  }
}

/**
 * Registrar salida de sesión
 */
export const registrarSalida = async () => {
  try {
    const sessionId = localStorage.getItem('session_id')
    const sessionStart = localStorage.getItem('session_start')
    
    if (!sessionId || !sessionStart) return

    const inicio = new Date(sessionStart)
    const fin = new Date()
    const duracionMinutos = Math.round((fin - inicio) / 1000 / 60)

    await supabase
      .from('sesiones_usuarios')
      .update({
        fecha_salida: fin.toISOString(),
        duracion_minutos: duracionMinutos
      })
      .eq('id', sessionId)

    // Limpiar localStorage
    localStorage.removeItem('session_id')
    localStorage.removeItem('session_start')

  } catch (error) {
    console.error('Error en registrarSalida:', error)
  }
}

/**
 * Incrementar contador de uso mensual
 */
export const incrementarContadorMensajes = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener suscripción actual
    const { data: suscripcion } = await supabase
      .from('suscripciones_usuarios')
      .select('*')
      .eq('dentista_id', user.id)
      .single()

    if (!suscripcion) return

    // Verificar si necesitamos resetear el contador (nuevo mes)
    const hoy = new Date()
    const ultimoReset = new Date(suscripcion.ultimo_reset_contador)
    
    if (hoy.getMonth() !== ultimoReset.getMonth() || 
        hoy.getFullYear() !== ultimoReset.getFullYear()) {
      // Resetear contador
      await supabase
        .from('suscripciones_usuarios')
        .update({
          mensajes_usados_mes: 1,
          ultimo_reset_contador: hoy.toISOString().split('T')[0]
        })
        .eq('dentista_id', user.id)
    } else {
      // Incrementar contador
      await supabase
        .from('suscripciones_usuarios')
        .update({
          mensajes_usados_mes: suscripcion.mensajes_usados_mes + 1
        })
        .eq('dentista_id', user.id)
    }

  } catch (error) {
    console.error('Error incrementando contador:', error)
  }
}

/**
 * Verificar si el usuario puede enviar más mensajes
 */
export const verificarLimiteMensajes = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { permitido: false, mensaje: 'No autenticado' }

    const { data: suscripcion } = await supabase
      .from('suscripciones_usuarios')
      .select('*, plan:planes_suscripcion(*)')
      .eq('dentista_id', user.id)
      .single()

    if (!suscripcion) {
      return { permitido: false, mensaje: 'Sin suscripción' }
    }

    const limite = suscripcion.plan.limite_mensajes_mes

    // Si es ilimitado
    if (limite === null) {
      return { permitido: true, ilimitado: true }
    }

    // Verificar si alcanzó el límite
    if (suscripcion.mensajes_usados_mes >= limite) {
      return {
        permitido: false,
        mensaje: `Has alcanzado el límite de ${limite} mensajes/mes.\nActualiza tu plan para enviar más mensajes.`,
        usados: suscripcion.mensajes_usados_mes,
        limite: limite
      }
    }

    return {
      permitido: true,
      usados: suscripcion.mensajes_usados_mes,
      limite: limite,
      restantes: limite - suscripcion.mensajes_usados_mes
    }

  } catch (error) {
    console.error('Error verificando límite:', error)
    return { permitido: true } // En caso de error, permitir (fail-safe)
  }
}

/**
 * Obtener métricas de uso del usuario actual
 */
export const obtenerMetricasUsuario = async (diasAtras = 30) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras)

    const { data: metricas } = await supabase
      .from('metricas_uso_diario')
      .select('*')
      .eq('dentista_id', user.id)
      .gte('fecha', fechaInicio.toISOString().split('T')[0])
      .order('fecha', { ascending: true })

    const { data: sesiones } = await supabase
      .from('sesiones_usuarios')
      .select('*')
      .eq('dentista_id', user.id)
      .gte('fecha_ingreso', fechaInicio.toISOString())
      .order('fecha_ingreso', { ascending: false })

    return {
      metricas: metricas || [],
      sesiones: sesiones || [],
      totalIngresos: sesiones?.length || 0,
      ultimoIngreso: sesiones?.[0]?.fecha_ingreso || null
    }

  } catch (error) {
    console.error('Error obteniendo métricas:', error)
    return null
  }
}