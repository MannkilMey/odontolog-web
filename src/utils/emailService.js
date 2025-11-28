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
    // Obtener dentista actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    // ✅ NUEVO: Verificar límite ANTES de enviar
    const limiteCheck = await verificarLimiteMensajes()
    if (!limiteCheck.permitido) {
      throw new Error(limiteCheck.mensaje)
    }

    // Llamar a la serverless function
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario,
        asunto,
        html,
        tipo,
        pacienteId,
        metadata,
        dentistaId: user.id
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Error al enviar email')
    }

    // ✅ NUEVO: Incrementar contador después de envío exitoso
    await incrementarContadorMensajes()

    return result

  } catch (error) {
    console.error('Error en enviarEmail:', error)
    throw error
  }
}

/**
 * Enviar presupuesto por email
 */
/**
 * Enviar presupuesto por email
 */
export const enviarPresupuesto = async (presupuesto, paciente, items) => {
  try {
    // Obtener configuración de la clínica
    const { data: { user } } = await supabase.auth.getUser()
    const config = await obtenerConfigClinica(user.id)

    const nombreClinica = config.nombre_comercial || config.razon_social || 'Clínica Dental'
    const contactoInfo = [
      config.telefono ? `📱 ${config.telefono}` : '',
      config.email_facturacion ? `📧 ${config.email_facturacion}` : '',
      config.direccion ? `📍 ${config.direccion}` : ''
    ].filter(Boolean).join(' • ')

    // ✅ Construir HTML de items
    const itemsHTML = items?.map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.descripcion}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.cantidad}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">Gs. ${Number(item.precio_unitario || 0).toLocaleString('es-PY')}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">Gs. ${Number(item.subtotal || 0).toLocaleString('es-PY')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #9ca3af;">No hay items</td></tr>'

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
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">
              📋 Presupuesto N°: ${presupuesto.numero_presupuesto}
            </p>
            <p style="color: #1e40af; margin: 5px 0; font-size: 14px;">
              📅 Fecha de emisión: ${new Date(presupuesto.fecha_emision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            ${presupuesto.fecha_vencimiento ? `
              <p style="color: #1e40af; margin: 5px 0; font-size: 14px;">
                ⏰ Válido hasta: ${new Date(presupuesto.fecha_vencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            ` : ''}
          </div>
          
          <h3 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Detalle del Presupuesto:</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px 8px; text-align: left; color: #374151; font-weight: 600; border-bottom: 2px solid #d1d5db;">Descripción</th>
                <th style="padding: 12px 8px; text-align: center; color: #374151; font-weight: 600; border-bottom: 2px solid #d1d5db;">Cant.</th>
                <th style="padding: 12px 8px; text-align: right; color: #374151; font-weight: 600; border-bottom: 2px solid #d1d5db;">Precio Unit.</th>
                <th style="padding: 12px 8px; text-align: right; color: #374151; font-weight: 600; border-bottom: 2px solid #d1d5db;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="font-size: 24px; font-weight: bold; color: #1e40af; margin: 0;">
              💰 Total: Gs. ${Number(presupuesto.total || 0).toLocaleString('es-PY')}
            </p>
          </div>
          
          ${presupuesto.notas ? `
            <div style="background: #fffbeb; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>📝 Notas:</strong> ${presupuesto.notas}</p>
            </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
            Este presupuesto es una estimación. Los precios pueden variar según el diagnóstico final. Si tiene alguna pregunta, no dude en contactarnos.
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
        numero_presupuesto: presupuesto.numero_presupuesto,
        monto: presupuesto.total
      }
    })
  } catch (error) {
    console.error('Error en enviarPresupuesto:', error)
    throw error
  }
}

/**
 * Enviar recibo por email
 */
export const enviarRecibo = async (pago, paciente, pdfUrl) => {
  try {
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
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">🧾 Recibo de Pago</p>
        </div>
        
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Comprobante de Pago</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Estimado/a <strong>${paciente.nombre} ${paciente.apellido}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Gracias por su pago. A continuación encontrará los detalles de su recibo:
          </p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">
              📋 Detalles del Pago:
            </p>
            <p style="color: #065f46; margin: 8px 0; font-size: 15px;">
              <strong>🧾 Recibo N°:</strong> ${pago.numero_recibo}
            </p>
            <p style="color: #065f46; margin: 8px 0; font-size: 15px;">
              <strong>📅 Fecha:</strong> ${new Date(pago.fecha_pago).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style="color: #065f46; margin: 8px 0; font-size: 15px;">
              <strong>💳 Método:</strong> ${pago.metodo_pago}
            </p>
            <p style="color: #065f46; margin: 8px 0; font-size: 15px;">
              <strong>📝 Concepto:</strong> ${pago.concepto}
            </p>
            ${pago.notas ? `
              <p style="color: #065f46; margin: 8px 0; font-size: 14px; font-style: italic;">
                <strong>Notas:</strong> ${pago.notas}
              </p>
            ` : ''}
          </div>
          
          <div style="text-align: right; margin-top: 30px; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
              💰 Monto: Gs. ${Number(pago.monto || 0).toLocaleString('es-PY')}
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
            Conserve este recibo para sus registros. ✅ Gracias por su pago.
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
        numero_recibo: pago.numero_recibo,
        monto: pago.monto
      }
    })
  } catch (error) {
    console.error('Error en enviarRecibo:', error)
    throw error
  }
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