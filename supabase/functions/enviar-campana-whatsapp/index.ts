

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CONTENT_SID = 'HX4ccb0839a8a8b00bbeefe3cb21852929'
const TRACKING_BASE_URL = `${SUPABASE_URL}/functions/v1`

function generateTrackingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return `wa_${id}_${Date.now()}`
}

function formatWhatsAppNumber(telefono: string, pais: string): string | null {
  if (!telefono) return null

  // Limpiar caracteres no numéricos
  let num = telefono.replace(/[^0-9+]/g, '')

  // Si ya tiene formato internacional
  if (num.startsWith('+')) {
    return `whatsapp:${num}`
  }

  // Agregar código de país según el país
  const codigos: Record<string, string> = {
    'Paraguay': '595',
    'Argentina': '54',
    'Uruguay': '598',
    'Chile': '56',
    'Bolivia': '591',
    'Brasil': '55',
  }

  const codigo = codigos[pais]
  if (!codigo) return null

  // Quitar 0 inicial si existe
  if (num.startsWith('0')) {
    num = num.substring(1)
  }

  return `whatsapp:+${codigo}${num}`
}

async function enviarWhatsApp(
  to: string,
  nombre: string,
  registroUrl: string
): Promise<{ success: boolean; sid?: string; error?: string }> {

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const contentVariables = JSON.stringify({
    "1": nombre,
    "2": registroUrl
  })

  const params = new URLSearchParams()
  params.append('From', TWILIO_WHATSAPP_FROM)
  params.append('To', to)
  params.append('ContentSid', CONTENT_SID)
  params.append('ContentVariables', contentVariables)

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  })

  const result = await response.json()

  if (!response.ok || result.error_code) {
    return {
      success: false,
      error: result.message || result.error_message || `Error ${response.status}`
    }
  }

  return { success: true, sid: result.sid }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Validar config
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return new Response(
        JSON.stringify({ error: 'Credenciales de Twilio no configuradas' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      prospect_ids,
      campana_id = null,
      registro_url = 'https://odontolog.lat/registro',
      max_por_lote = 30,
      delay_ms = 1000,  // WhatsApp necesita más delay que email
    } = body

    if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'prospect_ids es requerido (array de UUIDs)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const idsLote = prospect_ids.slice(0, max_por_lote)

    // Cargar prospects
    const { data: prospects, error: prospError } = await supabase
      .from('prospects')
      .select('id, email, nombre_completo, nombre_clinica, telefono, pais, ciudad')
      .in('id', idsLote)

    if (prospError || !prospects) {
      return new Response(
        JSON.stringify({ error: 'Error cargando prospects', detail: prospError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Filtrar prospects con teléfono válido
    const prospectosValidos = prospects.filter(p => p.telefono && p.telefono.trim() !== '')

    let enviados = 0
    let errores = 0
    let sinTelefono = prospects.length - prospectosValidos.length
    const detalles: any[] = []

    for (const prospect of prospectosValidos) {
      try {
        const trackingId = generateTrackingId()
        const nombre = prospect.nombre_clinica || prospect.nombre_completo || 'Estimado/a'

        // Formatear número
        const whatsappTo = formatWhatsAppNumber(prospect.telefono, prospect.pais)

        if (!whatsappTo) {
          detalles.push({
            prospect_id: prospect.id,
            telefono: prospect.telefono,
            status: 'error',
            error: 'No se pudo formatear el número de WhatsApp'
          })
          errores++
          continue
        }

        // URL de registro con tracking
        const trackedRegistroUrl = `${TRACKING_BASE_URL}/tracking-click?tid=${trackingId}&url=${encodeURIComponent(registro_url + '?ref=wa_' + trackingId)}`

        // Enviar WhatsApp
        const result = await enviarWhatsApp(whatsappTo, nombre, trackedRegistroUrl)

        if (!result.success) {
          detalles.push({
            prospect_id: prospect.id,
            telefono: prospect.telefono,
            whatsapp_to: whatsappTo,
            status: 'error',
            error: result.error
          })
          errores++
          continue
        }

        // Registrar en tracking_marketing
        await supabase.from('tracking_marketing').insert({
          prospect_id: prospect.id,
          campana_id: campana_id,
          canal: 'whatsapp',
          evento: 'enviado',
          telefono_destino: prospect.telefono,
          tracking_id: trackingId,
          fecha_evento: new Date().toISOString(),
        })

        // Actualizar prospect
        await supabase
          .from('prospects')
          .update({
            estado: 'contactado',
            fecha_ultimo_contacto: new Date().toISOString(),
            intentos_contacto: (prospect as any).intentos_contacto ? (prospect as any).intentos_contacto + 1 : 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', prospect.id)

        enviados++
        detalles.push({
          prospect_id: prospect.id,
          telefono: prospect.telefono,
          whatsapp_to: whatsappTo,
          nombre,
          tracking_id: trackingId,
          status: 'enviado',
          twilio_sid: result.sid
        })

        // Rate limiting (WhatsApp es más estricto)
        if (delay_ms > 0) {
          await new Promise(r => setTimeout(r, delay_ms))
        }

      } catch (error) {
        errores++
        detalles.push({
          prospect_id: prospect.id,
          telefono: prospect.telefono,
          status: 'error',
          error: error.message
        })
      }
    }

    const resumen = {
      ok: true,
      resumen: {
        total_prospects: prospects.length,
        sin_telefono: sinTelefono,
        enviados,
        errores,
        campana_id,
      },
      detalles,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(resumen, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})