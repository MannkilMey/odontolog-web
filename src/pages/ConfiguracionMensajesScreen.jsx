import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ConfiguracionMensajesScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [config, setConfig] = useState({
    nombre_remitente_whatsapp: 'OdontoLog',
    template_recordatorio_cita: '',
    template_presupuesto: '',
    template_recibo: '',
    template_cuota_vencida: ''
  })

  const [preview, setPreview] = useState({
    tipo: 'recordatorio_cita',
    texto: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Verificar plan
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios')
        .select('plan:planes_suscripcion(codigo)')
        .eq('dentista_id', user.id)
        .single()

      if (suscripcion?.plan?.codigo === 'free') {
        setIsPremium(false)
        setLoading(false)
        return
      }

      setIsPremium(true)

      // Cargar configuración
      const { data: configData, error } = await supabase
        .from('configuracion_clinica')
        .select('nombre_remitente_whatsapp, template_recordatorio_cita, template_presupuesto, template_recibo, template_cuota_vencida')
        .eq('dentista_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (configData) {
        setConfig({
          nombre_remitente_whatsapp: configData.nombre_remitente_whatsapp || 'OdontoLog',
          template_recordatorio_cita: configData.template_recordatorio_cita || '',
          template_presupuesto: configData.template_presupuesto || '',
          template_recibo: configData.template_recibo || '',
          template_cuota_vencida: configData.template_cuota_vencida || ''
        })
      }

      updatePreview('recordatorio_cita', configData?.template_recordatorio_cita || '')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const updatePreview = (tipo, template) => {
    let texto = template || config[`template_${tipo}`] || ''
    
    // Reemplazar variables con ejemplos
    const ejemplos = {
      '{paciente}': 'Juan Pérez',
      '{fecha}': '25/12/2024',
      '{hora}': '10:00',
      '{clinica}': 'Clínica Dental López',
      '{doctor}': 'Dr. María González',
      '{monto}': '500.000',
      '{numero_recibo}': '001',
      '{fecha_vencimiento}': '20/12/2024'
    }

    Object.entries(ejemplos).forEach(([variable, valor]) => {
      texto = texto.replace(new RegExp(variable, 'g'), valor)
    })

    setPreview({ tipo, texto })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('configuracion_clinica')
        .update({
          nombre_remitente_whatsapp: config.nombre_remitente_whatsapp,
          template_recordatorio_cita: config.template_recordatorio_cita,
          template_presupuesto: config.template_presupuesto,
          template_recibo: config.template_recibo,
          template_cuota_vencida: config.template_cuota_vencida
        })
        .eq('dentista_id', user.id)

      if (error) throw error

      alert('✅ Configuración guardada correctamente')
      
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const resetTemplate = (tipo) => {
    const defaults = {
      recordatorio_cita: `¡Hola {paciente}! 👋

Recordatorio de tu cita:
📅 Fecha: {fecha}
🕒 Hora: {hora}
🏥 Clínica: {clinica}

Por favor confirma tu asistencia.

Saludos,
{doctor}`,
      presupuesto: `¡Hola {paciente}! 👋

Tu presupuesto está listo:
💰 Total: Gs. {monto}

Puedes revisarlo en detalle accediendo a tu cuenta.

¿Tienes alguna pregunta? ¡Estamos para ayudarte!

Saludos,
{doctor}`,
      recibo: `¡Hola {paciente}! 👋

Confirmamos tu pago:
💵 Monto: Gs. {monto}
📅 Fecha: {fecha}
🧾 Recibo: #{numero_recibo}

¡Gracias por tu pago!

Saludos,
{doctor}`,
      cuota_vencida: `¡Hola {paciente}! 👋

Te recordamos que tienes una cuota pendiente:
💰 Monto: Gs. {monto}
📅 Venció el: {fecha_vencimiento}

Por favor, regulariza tu situación a la brevedad.

Para consultas, estamos a tu disposición.

Saludos,
{doctor}`
    }

    setConfig({
      ...config,
      [`template_${tipo}`]: defaults[tipo]
    })
    updatePreview(tipo, defaults[tipo])
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando configuración...</div>
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/configuracion')} style={styles.backButton}>
            ← Volver
          </button>
          <div style={styles.title}>📱 Configuración de Mensajes</div>
        </div>

        <div style={styles.content}>
          <div style={styles.upgradeCard}>
            <div style={styles.upgradeIcon}>⭐</div>
            <div style={styles.upgradeTitle}>Función Premium</div>
            <div style={styles.upgradeText}>
              La personalización de mensajes WhatsApp está disponible en planes Pro y Enterprise.
            </div>
            <button
              style={styles.upgradeButton}
              onClick={() => navigate('/planes')}
            >
              Ver Planes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/configuracion')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📱 Configuración de Mensajes WhatsApp</div>
          <div style={styles.subtitle}>Personaliza tus comunicaciones</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            ...(saving && styles.saveButtonDisabled)
          }}
        >
          {saving ? 'Guardando...' : '💾 Guardar'}
        </button>
      </div>

      <div style={styles.content}>
        {/* Nombre del Remitente */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>👤 Nombre del Remitente</div>
          <div style={styles.sectionDescription}>
            Este nombre aparecerá como remitente en los mensajes de WhatsApp
          </div>
          <input
            type="text"
            style={styles.input}
            value={config.nombre_remitente_whatsapp}
            onChange={(e) => setConfig({ ...config, nombre_remitente_whatsapp: e.target.value })}
            placeholder="Ej: Clínica Dental López"
            maxLength={50}
          />
          <div style={styles.hint}>Máximo 50 caracteres</div>
        </div>

        {/* Templates */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📝 Plantillas de Mensajes</div>
          
          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(preview.tipo === 'recordatorio_cita' && styles.tabActive)
              }}
              onClick={() => updatePreview('recordatorio_cita', config.template_recordatorio_cita)}
            >
              📅 Recordatorio de Cita
            </button>
            <button
              style={{
                ...styles.tab,
                ...(preview.tipo === 'presupuesto' && styles.tabActive)
              }}
              onClick={() => updatePreview('presupuesto', config.template_presupuesto)}
            >
              💰 Presupuesto
            </button>
            <button
              style={{
                ...styles.tab,
                ...(preview.tipo === 'recibo' && styles.tabActive)
              }}
              onClick={() => updatePreview('recibo', config.template_recibo)}
            >
              🧾 Recibo
            </button>
            <button
              style={{
                ...styles.tab,
                ...(preview.tipo === 'cuota_vencida' && styles.tabActive)
              }}
              onClick={() => updatePreview('cuota_vencida', config.template_cuota_vencida)}
            >
              ⏰ Cuota Vencida
            </button>
          </div>

          {/* Editor y Preview */}
          <div style={styles.editorContainer}>
            {/* Editor */}
            <div style={styles.editorPanel}>
              <div style={styles.panelHeader}>
                <div style={styles.panelTitle}>✏️ Editar Plantilla</div>
                <button
                  onClick={() => resetTemplate(preview.tipo)}
                  style={styles.resetButton}
                >
                  ↺ Restablecer
                </button>
              </div>
              
              <textarea
                style={styles.textarea}
                value={config[`template_${preview.tipo}`]}
                onChange={(e) => {
                  setConfig({ ...config, [`template_${preview.tipo}`]: e.target.value })
                  updatePreview(preview.tipo, e.target.value)
                }}
                placeholder="Escribe tu plantilla aquí..."
                rows={15}
              />

              <div style={styles.variablesBox}>
                <div style={styles.variablesTitle}>Variables disponibles:</div>
                <div style={styles.variablesList}>
                  {preview.tipo === 'recordatorio_cita' && (
                    <>
                      <span style={styles.variable}>{'{paciente}'}</span>
                      <span style={styles.variable}>{'{fecha}'}</span>
                      <span style={styles.variable}>{'{hora}'}</span>
                      <span style={styles.variable}>{'{clinica}'}</span>
                      <span style={styles.variable}>{'{doctor}'}</span>
                    </>
                  )}
                  {preview.tipo === 'presupuesto' && (
                    <>
                      <span style={styles.variable}>{'{paciente}'}</span>
                      <span style={styles.variable}>{'{monto}'}</span>
                      <span style={styles.variable}>{'{doctor}'}</span>
                    </>
                  )}
                  {preview.tipo === 'recibo' && (
                    <>
                      <span style={styles.variable}>{'{paciente}'}</span>
                      <span style={styles.variable}>{'{monto}'}</span>
                      <span style={styles.variable}>{'{fecha}'}</span>
                      <span style={styles.variable}>{'{numero_recibo}'}</span>
                      <span style={styles.variable}>{'{doctor}'}</span>
                    </>
                  )}
                  {preview.tipo === 'cuota_vencida' && (
                    <>
                      <span style={styles.variable}>{'{paciente}'}</span>
                      <span style={styles.variable}>{'{monto}'}</span>
                      <span style={styles.variable}>{'{fecha_vencimiento}'}</span>
                      <span style={styles.variable}>{'{doctor}'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={styles.previewPanel}>
              <div style={styles.panelHeader}>
                <div style={styles.panelTitle}>👁️ Vista Previa</div>
              </div>
              
              <div style={styles.phonePreview}>
                <div style={styles.phoneHeader}>
                  <div style={styles.phoneAvatar}>
                    {config.nombre_remitente_whatsapp.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.phoneContact}>
                    {config.nombre_remitente_whatsapp}
                  </div>
                </div>
                
                <div style={styles.messageBubble}>
                  <div style={styles.messageText}>
                    {preview.texto || 'Escribe una plantilla para ver la vista previa...'}
                  </div>
                  <div style={styles.messageTime}>10:30</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>Diseñado por MCorp</div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  headerInfo: {
    flex: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1e40af',
  },
  editorContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  editorPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  previewPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  resetButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'monospace',
    lineHeight: '1.6',
  },
  variablesBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  variablesTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  variablesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  variable: {
    padding: '4px 10px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#3b82f6',
    cursor: 'pointer',
  },
  phonePreview: {
    backgroundColor: '#075e54',
    borderRadius: '12px',
    padding: '16px',
    minHeight: '400px',
  },
  phoneHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '16px',
  },
  phoneAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#25d366',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
  },
  phoneContact: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
  },
  messageBubble: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px 16px',
    maxWidth: '85%',
    position: 'relative',
  },
  messageText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    marginBottom: '4px',
  },
  messageTime: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'right',
  },
  upgradeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '16px',
    padding: '40px',
    border: '2px solid #3b82f6',
    textAlign: 'center',
  },
  upgradeIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  upgradeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '16px',
  },
  upgradeText: {
    fontSize: '16px',
    color: '#475569',
    marginBottom: '24px',
  },
  upgradeButton: {
    padding: '14px 32px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
}