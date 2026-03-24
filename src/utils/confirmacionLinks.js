import { supabase } from '../lib/supabase'
import { nanoid } from 'nanoid'

// Función para generar links de confirmación/cancelación
export const generarLinksConfirmacion = async (citaId, expiraEnHoras = 48) => {
  try {
    const baseToken = nanoid(32) // Token base de 32 caracteres
    const expiresAt = new Date(Date.now() + (expiraEnHoras * 60 * 60 * 1000))
    
    // Crear ambos links (confirmar y cancelar) en una sola transacción
    const { data, error } = await supabase
      .from('confirmacion_links')
      .insert([
        {
          cita_id: citaId,
          token: `conf_${baseToken}`,
          accion: 'confirmar',
          expires_at: expiresAt.toISOString()
        },
        {
          cita_id: citaId,
          token: `canc_${baseToken}`, 
          accion: 'cancelar',
          expires_at: expiresAt.toISOString()
        }
      ])
      .select('token, accion')
    
    if (error) {
      throw new Error(`Error creando links: ${error.message}`)
    }
    
    // Organizar los tokens por acción
    const confirmarToken = data.find(item => item.accion === 'confirmar')?.token
    const cancelarToken = data.find(item => item.accion === 'cancelar')?.token
    
    return {
      confirmarUrl: `https://odontolog.lat/confirm/${confirmarToken}`,
      cancelarUrl: `https://odontolog.lat/cancel/${cancelarToken}`,
      expiresAt: expiresAt,
      success: true
    }
    
  } catch (error) {
    console.error('Error en generarLinksConfirmacion:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Función para procesar confirmación/cancelación
export const procesarConfirmacionLink = async (token, accion) => {
  try {
    const { data, error } = await supabase
      .rpc('validar_y_procesar_link_confirmacion', {
        token_input: token,
        accion_esperada: accion
      })
    
    if (error) {
      throw new Error(`Error en procesamiento: ${error.message}`)
    }
    
    // La función SQL retorna un array con un objeto
    const resultado = data[0]
    
    if (!resultado) {
      return {
        success: false,
        mensaje: 'No se pudo procesar la solicitud'
      }
    }
    
    return {
      success: resultado.exito,
      mensaje: resultado.mensaje,
      citaId: resultado.cita_id,
      datosCita: resultado.datos_cita
    }
    
  } catch (error) {
    console.error('Error en procesarConfirmacionLink:', error)
    return {
      success: false,
      mensaje: 'Error interno del servidor'
    }
  }
}