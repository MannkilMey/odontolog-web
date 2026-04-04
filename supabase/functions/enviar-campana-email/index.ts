import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ⚠️ CAMBIAR SI TU DOMINIO ES DIFERENTE
const FROM_EMAIL = 'OdontoLog <noreply@odontolog.lat>'
const TRACKING_BASE_URL = `${SUPABASE_URL}/functions/v1`

// Generar tracking ID único
function generateTrackingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return `trk_${id}_${Date.now()}`
}

// Inyectar pixel de tracking al final del HTML
function inyectarPixel(html: string, trackingId: string): string {
  const pixelUrl = `${TRACKING_BASE_URL}/tracking-pixel?tid=${trackingId}`
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`
  
  // Insertar antes de </body> o </div> final, o al final
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`)
  }
  return html + pixelTag
}

// Reescribir todos los links para pasar por tracking-click
function reescribirLinks(html: string, trackingId: string): string {
  // Regex para encontrar href="..."
  const linkRegex = /href="(https?:\/\/[^"]+)"/g
  
  return html.replace(linkRegex, (match, url) => {
    // No reescribir el pixel de tracking ni links de unsubscribe
    if (url.includes('tracking-pixel') || url.includes('unsubscribe')) {
      return match
    }
    const encodedUrl = encodeURIComponent(url)
    const trackedUrl = `${TRACKING_BASE_URL}/tracking-click?tid=${trackingId}&url=${encodedUrl}`
    return `href="${trackedUrl}"`
  })
}

// Template HTML de marketing por defecto
function getDefaultTemplate(nombreClinica: string, registroUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🦷 OdontoLog</h1>
        <p style="color: #dbeafe; margin: 12px 0 0; font-size: 16px;">Software de gestión dental en la nube</p>
      </div>
      
      <div style="padding: 40px 30px;">
        <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
          Estimado/a <strong>${nombreClinica}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Le escribimos porque creemos que OdontoLog puede ayudar a optimizar la gestión de su clínica dental.
        </p>
        
        <h2 style="color: #1e40af; font-size: 20px; margin: 28px 0 16px;">¿Qué puede hacer OdontoLog por su clínica?</h2>
        
        <table style="width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 12px 16px; background: #eff6ff; border-radius: 8px; margin-bottom: 8px;">
              <strong style="color: #1e40af;">👥 Gestión de pacientes</strong>
              <p style="color: #4b5563; margin: 4px 0 0; font-size: 14px;">Historial clínico completo y odontograma digital interactivo</p>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px;">
              <strong style="color: #065f46;">📅 Calendario inteligente</strong>
              <p style="color: #4b5563; margin: 4px 0 0; font-size: 14px;">Citas con recordatorios automáticos por email y WhatsApp</p>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fffbeb; border-radius: 8px;">
              <strong style="color: #92400e;">💰 Control financiero</strong>
              <p style="color: #4b5563; margin: 4px 0 0; font-size: 14px;">Presupuestos, pagos, planes de cuotas y reportes automáticos</p>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fdf2f8; border-radius: 8px;">
              <strong style="color: #9d174d;">📊 Reportes y métricas</strong>
              <p style="color: #4b5563; margin: 4px 0 0; font-size: 14px;">Visualice el rendimiento de su clínica en tiempo real</p>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${registroUrl}" style="display: inline-block; padding: 16px 40px; background: #1e40af; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 18px; font-weight: 700;">
            Comenzar gratis →
          </a>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 12px;">Sin tarjeta de crédito. Configuración en 2 minutos.</p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si tiene alguna consulta, simplemente responda a este email y le responderemos a la brevedad.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Saludos cordiales,<br>
            <strong>El equipo de OdontoLog</strong>
          </p>
        </div>
      </div>

      <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          OdontoLog - Software de gestión dental | odontolog.lat
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0;">
          Si no desea recibir más emails, <a href="https://odontolog.lat/unsubscribe" style="color: #9ca3af;">click aquí</a>.
        </p>
      </div>
    </div>
  `
}

serve(async (req: Request) => {
  // CORS
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
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurada' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      prospect_ids,           // Array de UUIDs de prospects a contactar
      campana_id = null,      // UUID de la campaña (opcional)
      asunto = '🦷 Optimice la gestión de su clínica dental con OdontoLog',
      html_custom = null,     // HTML personalizado (opcional, si no usa el default)
      registro_url = 'https://odontolog.lat/registro',
      max_por_lote = 50,      // Máximo emails por ejecución
      delay_ms = 200,         // Delay entre emails (rate limiting)
    } = body

    if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'prospect_ids es requerido (array de UUIDs)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Limitar lote
    const idsLote = prospect_ids.slice(0, max_por_lote)

    // Cargar datos de prospects
    const { data: prospects, error: prospError } = await supabase
      .from('prospects')
      .select('id, email, nombre_completo, nombre_clinica, pais, ciudad')
      .in('id', idsLote)

    if (prospError || !prospects) {
      return new Response(
        JSON.stringify({ error: 'Error cargando prospects', detail: prospError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Filtrar prospects con email válido (no temporales)
    const prospectesValidos = prospects.filter(p => 
      p.email && 
      !p.email.includes('sin-email.temp') && 
      p.email.includes('@')
    )

    let enviados = 0
    let errores = 0
    let sinEmail = prospects.length - prospectesValidos.length
    const detalles: any[] = []

    for (const prospect of prospectesValidos) {
      try {
        // Generar tracking ID único para este envío
        const trackingId = generateTrackingId()
        
        // Nombre para personalizar
        const nombre = prospect.nombre_clinica || prospect.nombre_completo || 'Estimado/a'

        // Generar HTML (custom o default)
        let htmlBase = html_custom || getDefaultTemplate(nombre, registro_url)
        
        // Reemplazar variables en HTML custom
        if (html_custom) {
          htmlBase = htmlBase
            .replace(/\{\{nombre\}\}/g, nombre)
            .replace(/\{\{clinica\}\}/g, prospect.nombre_clinica || '')
            .replace(/\{\{ciudad\}\}/g, prospect.ciudad || '')
            .replace(/\{\{pais\}\}/g, prospect.pais || '')
            .replace(/\{\{registro_url\}\}/g, registro_url)
        }

        // Reescribir links para tracking
        let htmlTracked = reescribirLinks(htmlBase, trackingId)
        
        // Inyectar pixel de apertura
        htmlTracked = inyectarPixel(htmlTracked, trackingId)

        // Enviar email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [prospect.email],
            subject: asunto.replace('{{nombre}}', nombre),
            html: htmlTracked,
            reply_to: 'contacto@odontolog.lat',
          })
        })

        const resendResult = await resendResponse.json()

        if (!resendResponse.ok) {
          throw new Error(resendResult.message || 'Error de Resend')
        }

        // Registrar envío en tracking_marketing
        await supabase.from('tracking_marketing').insert({
          prospect_id: prospect.id,
          campana_id: campana_id,
          canal: 'email',
          evento: 'enviado',
          email_destino: prospect.email,
          asunto: asunto.replace('{{nombre}}', nombre),
          tracking_id: trackingId,
          fecha_evento: new Date().toISOString(),
        })

        // Actualizar estado del prospect
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
          email: prospect.email,
          nombre: nombre,
          tracking_id: trackingId,
          status: 'enviado',
          resend_id: resendResult.id
        })

        // Rate limiting
        if (delay_ms > 0) {
          await new Promise(r => setTimeout(r, delay_ms))
        }

      } catch (error) {
        errores++
        detalles.push({
          prospect_id: prospect.id,
          email: prospect.email,
          status: 'error',
          error: error.message
        })
      }
    }

    const resumen = {
      ok: true,
      resumen: {
        total_prospects: prospects.length,
        sin_email_valido: sinEmail,
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