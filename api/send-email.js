// api/send-email.js
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY  // ← CAMBIO AQUÍ

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      destinatario, 
      asunto, 
      html, 
      tipo, 
      pacienteId, 
      metadata,
      dentistaId 
    } = req.body

    // Validar datos
    if (!destinatario || !asunto || !html || !dentistaId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    // Crear cliente de Supabase con SERVICE ROLE (bypasea RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Registrar en base de datos
    const { data: registro, error: dbError } = await supabase
      .from('mensajes_enviados')
      .insert({
        dentista_id: dentistaId,
        paciente_id: pacienteId,
        tipo: tipo,
        canal: 'email',
        destinatario: destinatario,
        asunto: asunto,
        mensaje: html.substring(0, 1000),
        estado: 'pendiente',
        metadata: metadata,
        costo_unitario: 0,
        fecha_programado: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB Error:', dbError)
      return res.status(500).json({ 
        error: 'Error al registrar en base de datos',
        details: dbError.message 
      })
    }

    // 2. Enviar con Resend
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

    // 3. Actualizar estado
    if (response.ok) {
      await supabase
        .from('mensajes_enviados')
        .update({
          estado: 'enviado',
          fecha_enviado: new Date().toISOString()
        })
        .eq('id', registro.id)

      return res.status(200).json({ 
        success: true, 
        messageId: result.id,
        registroId: registro.id
      })
    } else {
      await supabase
        .from('mensajes_enviados')
        .update({
          estado: 'fallido',
          error_mensaje: result.message || 'Error desconocido'
        })
        .eq('id', registro.id)

      return res.status(500).json({ 
        error: result.message || 'Error al enviar email' 
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    })
  }
}