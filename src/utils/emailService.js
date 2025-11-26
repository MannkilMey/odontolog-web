import { supabase } from '../lib/supabase'

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY

/**
 * Obtener configuración de la clínica del dentista actual
 */
const obtenerConfigClinica = async (dentistaId) => {
  try {
    const { data, error } = await supabase
      .from('configuracion_clinica')
      .select('*')
      .eq('dentista_id', dentistaId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error cargando config:', error)
    }

    return data || {
      nombre_comercial: 'Clínica Dental',
      razon_social: '',
      telefono: '',
      email_facturacion: '',
      direccion: '',
      ciudad: '',
      pais: ''
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      nombre_comercial: 'Clínica Dental',
      razon_social: '',
      telefono: '',
      email_facturacion: '',
      direccion: '',
      ciudad: '',
      pais: ''
    }
  }
}

/**
 * Función principal para enviar emails y registrar en DB
 */
export const enviarEmail = async ({
  destinatario,
  asunto,
  html,
  tipo,
  pacienteId = null,
  metadata = {}
}) => {
  try {
    // 1. Obtener dentista actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    // 2. Registrar intento en DB (estado: pendiente)
    const { data: registro, error: dbError } = await supabase
      .from('mensajes_enviados')
      .insert({
        dentista_id: user.id,
        paciente_id: pacienteId,
        tipo: tipo,
        canal: 'email',
        destinatario: destinatario,
        asunto: asunto,
        mensaje: html.substring(0, 1000), // Solo primeros 1000 chars
        estado: 'pendiente',
        metadata: metadata,
        costo_unitario: 0, // Gratis hasta 3000/mes con Resend
        fecha_programado: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 3. Enviar email con Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'OdontoLog <no-reply@odontolog.lat>',
        to: [destinatario],
        subject: asunto,
        html: html
      })
    })

    const result = await response.json()

    // 4. Actualizar estado en DB
    if (response.ok) {
      await supabase
        .from('mensajes_enviados')
        .update({
          estado: 'enviado',
          fecha_enviado: new Date().toISOString()
        })
        .eq('id', registro.id)

      return { success: true, messageId: result.id, registroId: registro.id }
    } else {
      // Error al enviar
      await supabase
        .from('mensajes_enviados')
        .update({
          estado: 'fallido',
          error_mensaje: result.message || 'Error desconocido'
        })
        .eq('id', registro.id)

      throw new Error(result.message || 'Error al enviar email')
    }

  } catch (error) {
    console.error('Error en enviarEmail:', error)
    throw error
  }
}

/**
 * Enviar presupuesto por email
 */
export const enviarPresupuesto = async (presupuesto, paciente, pdfUrl) => {
  // Obtener configuración de la clínica
  const { data: { user } } = await supabase.auth.getUser()
  const config = await obtenerConfigClinica(user.id)

  const nombreClinica = config.nombre_comercial || config.razon_social || 'Clínica Dental'
  const contactoInfo = [
    config.telefono ? `📱 ${config.telefono}` : '',
    config.email_facturacion ? `📧 ${config.email_facturacion}` : '',
    config.direccion ? `📍 ${config.direccion}` : ''
  ].filter(Boolean).join(' • ')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
        ${contactoInfo ? `<p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 13px;">${contactoInfo}</p>` : ''}
      </div>
      
      <div style="padding: 40px 30px; background: white;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Presupuesto de Tratamiento</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Estimado/a <strong>${paciente.nombre} ${paciente.apellido}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Adjunto encontrará el presupuesto detallado de su tratamiento dental.
        </p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0;">
            Resumen del Presupuesto:
          </p>
          <p style="color: #1e40af; font-size: 18px; margin: 0;">
            <strong>Total: ${presupuesto.monto_total}</strong>
          </p>
        </div>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Si tiene alguna pregunta, no dude en contactarnos.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Saludos cordiales,<br>
            <strong>${nombreClinica}</strong>
            ${config.telefono ? `<br>📱 ${config.telefono}` : ''}
            ${config.email_facturacion ? `<br>📧 ${config.email_facturacion}` : ''}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Powered by <strong>OdontoLog</strong> - Software de Gestión Dental
          </p>
        </div>
      </div>
    </div>
  `

  return await enviarEmail({
    destinatario: paciente.email,
    asunto: `Presupuesto de Tratamiento - ${nombreClinica}`,
    html: html,
    tipo: 'presupuesto',
    pacienteId: paciente.id,
    metadata: {
      presupuesto_id: presupuesto.id,
      monto: presupuesto.monto_total
    }
  })
}

/**
 * Enviar recibo por email
 */
export const enviarRecibo = async (pago, paciente, pdfUrl) => {
  const { data: { user } } = await supabase.auth.getUser()
  const config = await obtenerConfigClinica(user.id)

  const nombreClinica = config.nombre_comercial || config.razon_social || 'Clínica Dental'
  const contactoInfo = [
    config.telefono ? `📱 ${config.telefono}` : '',
    config.email_facturacion ? `📧 ${config.email_facturacion}` : ''
  ].filter(Boolean).join(' • ')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
        ${contactoInfo ? `<p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 13px;">${contactoInfo}</p>` : ''}
        <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">Recibo de Pago</p>
      </div>
      
      <div style="padding: 40px 30px; background: white;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Comprobante de Pago</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Estimado/a <strong>${paciente.nombre} ${paciente.apellido}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Gracias por su pago. Adjunto encontrará su recibo.
        </p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="color: #065f46; font-weight: bold; margin: 0 0 10px 0;">
            Detalles del Pago:
          </p>
          <p style="color: #065f46; margin: 5px 0;">
            <strong>Monto:</strong> ${pago.monto}
          </p>
          <p style="color: #065f46; margin: 5px 0;">
            <strong>Método:</strong> ${pago.metodo_pago}
          </p>
          <p style="color: #065f46; margin: 5px 0;">
            <strong>Fecha:</strong> ${new Date(pago.fecha_pago).toLocaleDateString('es-ES')}
          </p>
        </div>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Conserve este recibo para sus registros.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Saludos cordiales,<br>
            <strong>${nombreClinica}</strong>
            ${config.telefono ? `<br>📱 ${config.telefono}` : ''}
            ${config.email_facturacion ? `<br>📧 ${config.email_facturacion}` : ''}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Powered by <strong>OdontoLog</strong> - Software de Gestión Dental
          </p>
        </div>
      </div>
    </div>
  `

  return await enviarEmail({
    destinatario: paciente.email,
    asunto: `Recibo de Pago - ${nombreClinica}`,
    html: html,
    tipo: 'recibo',
    pacienteId: paciente.id,
    metadata: {
      pago_id: pago.id,
      monto: pago.monto
    }
  })
}

/**
 * Enviar confirmación de cita
 */
export const enviarConfirmacionCita = async (cita, paciente) => {
  const { data: { user } } = await supabase.auth.getUser()
  const config = await obtenerConfigClinica(user.id)

  const nombreClinica = config.nombre_comercial || config.razon_social || 'Clínica Dental'
  const contactoInfo = [
    config.telefono ? `📱 ${config.telefono}` : '',
    config.direccion ? `📍 ${config.direccion}` : ''
  ].filter(Boolean).join(' • ')

  const fechaCita = new Date(cita.fecha_cita)
  const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
        ${contactoInfo ? `<p style="color: #ede9fe; margin: 10px 0 0 0; font-size: 13px;">${contactoInfo}</p>` : ''}
        <p style="color: #ede9fe; margin: 10px 0 0 0; font-size: 20px;">📅 Cita Confirmada</p>
      </div>
      
      <div style="padding: 40px 30px; background: white;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Su cita ha sido confirmada</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Estimado/a <strong>${paciente.nombre} ${paciente.apellido}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Confirmamos su cita dental con los siguientes detalles:
        </p>
        
        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
          <p style="color: #5b21b6; margin: 5px 0;">
            <strong>📅 Fecha:</strong> ${fechaFormateada}
          </p>
          <p style="color: #5b21b6; margin: 5px 0;">
            <strong>🕐 Hora:</strong> ${cita.hora_inicio}
          </p>
          <p style="color: #5b21b6; margin: 5px 0;">
            <strong>📋 Motivo:</strong> ${cita.motivo || 'Consulta general'}
          </p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⚠️ <strong>Importante:</strong> Por favor llegue 10 minutos antes de su cita.
          </p>
        </div>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Si necesita reprogramar o cancelar, contáctenos con anticipación.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            ¡Nos vemos pronto!<br>
            <strong>${nombreClinica}</strong>
            ${config.telefono ? `<br>📱 ${config.telefono}` : ''}
            ${config.email_facturacion ? `<br>📧 ${config.email_facturacion}` : ''}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Powered by <strong>OdontoLog</strong> - Software de Gestión Dental
          </p>
        </div>
      </div>
    </div>
  `

  return await enviarEmail({
    destinatario: paciente.email,
    asunto: `Confirmación de Cita - ${nombreClinica}`,
    html: html,
    tipo: 'confirmacion_cita',
    pacienteId: paciente.id,
    metadata: {
      cita_id: cita.id,
      fecha: cita.fecha_cita,
      hora: cita.hora_inicio
    }
  })
}

/**
 * Enviar recordatorio de cita
 */
export const enviarRecordatorioCita = async (cita, paciente) => {
  const { data: { user } } = await supabase.auth.getUser()
  const config = await obtenerConfigClinica(user.id)

  const nombreClinica = config.nombre_comercial || config.razon_social || 'Clínica Dental'

  const fechaCita = new Date(cita.fecha_cita)
  const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
        <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 20px;">🔔 Recordatorio de Cita</p>
      </div>
      
      <div style="padding: 40px 30px; background: white;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">¡No olvide su cita!</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Hola <strong>${paciente.nombre}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Este es un recordatorio de su cita dental:
        </p>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 5px 0;">
            <strong>📅 Fecha:</strong> ${fechaFormateada}
          </p>
          <p style="color: #92400e; margin: 5px 0;">
            <strong>🕐 Hora:</strong> ${cita.hora_inicio}
          </p>
          <p style="color: #92400e; margin: 5px 0;">
            <strong>📋 Motivo:</strong> ${cita.motivo || 'Consulta general'}
          </p>
        </div>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Por favor confirme su asistencia o avísenos si necesita reprogramar.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            ¡Lo esperamos!<br>
            <strong>${nombreClinica}</strong>
            ${config.telefono ? `<br>📱 ${config.telefono}` : ''}
            ${config.email_facturacion ? `<br>📧 ${config.email_facturacion}` : ''}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Powered by <strong>OdontoLog</strong> - Software de Gestión Dental
          </p>
        </div>
      </div>
    </div>
  `

  return await enviarEmail({
    destinatario: paciente.email,
    asunto: `🔔 Recordatorio: Cita en ${nombreClinica}`,
    html: html,
    tipo: 'recordatorio_cita',
    pacienteId: paciente.id,
    metadata: {
      cita_id: cita.id,
      fecha: cita.fecha_cita,
      hora: cita.hora_inicio
    }
  })
}

/**
 * Obtener estadísticas de mensajes del usuario actual
 */
export const obtenerEstadisticasMensajes = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    // Total por tipo
    const { data: porTipo } = await supabase
      .from('mensajes_enviados')
      .select('tipo, estado')
      .eq('dentista_id', user.id)

    // Total este mes
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { data: esteMes } = await supabase
      .from('mensajes_enviados')
      .select('*')
      .eq('dentista_id', user.id)
      .gte('fecha_enviado', inicioMes.toISOString())

    // Agrupar datos
    const stats = {
      totalEnviados: porTipo?.filter(m => m.estado === 'enviado').length || 0,
      totalFallidos: porTipo?.filter(m => m.estado === 'fallido').length || 0,
      esteMes: esteMes?.length || 0,
      porTipo: {}
    }

    // Contar por tipo
    porTipo?.forEach(m => {
      if (!stats.porTipo[m.tipo]) {
        stats.porTipo[m.tipo] = { enviados: 0, fallidos: 0 }
      }
      if (m.estado === 'enviado') {
        stats.porTipo[m.tipo].enviados++
      } else if (m.estado === 'fallido') {
        stats.porTipo[m.tipo].fallidos++
      }
    })

    return stats
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    throw error
  }
}