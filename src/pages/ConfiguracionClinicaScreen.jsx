import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ConfiguracionClinicaScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasConfig, setHasConfig] = useState(false)
  const [formData, setFormData] = useState({
    razon_social: '',
    nombre_comercial: '',
    ruc: '',
    tipo_documento_fiscal: 'ruc',
    direccion_fiscal: '',
    telefono: '',
    email_facturacion: '',
    pais: 'PY',
    moneda: 'PYG',
    simbolo_moneda: 'Gs.',
    idioma: 'es',
    color_primario: '#1E40AF',
  })

  useEffect(() => {
    checkConfiguration()
  }, [])

  const checkConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      if (data) {
        setHasConfig(true)
        setFormData({
          razon_social: data.razon_social || '',
          nombre_comercial: data.nombre_comercial || '',
          ruc: data.ruc || '',
          tipo_documento_fiscal: data.tipo_documento_fiscal || 'ruc',
          direccion_fiscal: data.direccion_fiscal || '',
          telefono: data.telefono || '',
          email_facturacion: data.email_facturacion || '',
          pais: data.pais || 'PY',
          moneda: data.moneda || 'PYG',
          simbolo_moneda: data.simbolo_moneda || 'Gs.',
          idioma: data.idioma || 'es',
          color_primario: data.color_primario || '#1E40AF',
        })
      }
    } catch (error) {
      console.error('Error checking configuration:', error)
    } finally {
      setChecking(false)
    }
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.razon_social.trim()) {
      alert('La razón social es requerida')
      return false
    }
    if (!formData.pais) {
      alert('Debe seleccionar un país')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const configData = {
        dentista_id: user.id,
        razon_social: formData.razon_social.trim(),
        nombre_comercial: formData.nombre_comercial.trim() || null,
        ruc: formData.ruc.trim() || null,
        tipo_documento_fiscal: formData.tipo_documento_fiscal,
        direccion_fiscal: formData.direccion_fiscal.trim() || null,
        telefono: formData.telefono.trim() || null,
        email_facturacion: formData.email_facturacion.trim() || null,
        pais: formData.pais,
        moneda: formData.moneda,
        simbolo_moneda: formData.simbolo_moneda,
        idioma: formData.idioma,
        color_primario: formData.color_primario,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('configuracion_clinica')
        .upsert(configData, {
          onConflict: 'dentista_id'
        })

      if (error) throw error

      alert('✅ Configuración guardada correctamente')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar configuración: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={styles.loadingContainer}>
        <div>Verificando configuración...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>
            {hasConfig ? '⚙️ Configuración de Clínica' : '🏥 Configuración Inicial'}
          </div>
          <div style={styles.subtitle}>
            {hasConfig ? 'Actualizar información' : 'Configura los datos de tu clínica'}
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {!hasConfig && (
          <div style={styles.welcomeCard}>
            <div style={styles.welcomeIcon}>👋</div>
            <div style={styles.welcomeTitle}>¡Bienvenido a OdontoLog!</div>
            <div style={styles.welcomeText}>
              Para comenzar a generar presupuestos y recibos, necesitamos algunos datos de tu clínica.
              Esta información aparecerá en todos tus documentos.
            </div>
          </div>
        )}

        <div style={styles.form}>
          {/* Datos Básicos */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📋 Datos Básicos</div>
            
            <label style={styles.label}>Razón Social / Nombre Completo *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.razon_social}
              onChange={(e) => updateField('razon_social', e.target.value)}
              placeholder="Ej: Clínica Dental Salud Oral S.R.L."
            />

            <label style={styles.label}>Nombre Comercial (opcional)</label>
            <input
              type="text"
              style={styles.input}
              value={formData.nombre_comercial}
              onChange={(e) => updateField('nombre_comercial', e.target.value)}
              placeholder="Ej: Dental Salud"
            />

            <div style={styles.row}>
              <div style={styles.halfWidth}>
                <label style={styles.label}>Tipo de Documento</label>
                <select
                  style={styles.select}
                  value={formData.tipo_documento_fiscal}
                  onChange={(e) => updateField('tipo_documento_fiscal', e.target.value)}
                >
                  <option value="ruc">RUC</option>
                  <option value="ci">Cédula de Identidad</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}>Número de Documento</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.ruc}
                  onChange={(e) => updateField('ruc', e.target.value)}
                  placeholder="Ej: 80012345-6"
                />
              </div>
            </div>
          </div>

          {/* Datos de Contacto */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📞 Datos de Contacto</div>

            <label style={styles.label}>Dirección Fiscal</label>
            <textarea
              style={{...styles.input, ...styles.textArea}}
              value={formData.direccion_fiscal}
              onChange={(e) => updateField('direccion_fiscal', e.target.value)}
              placeholder="Ej: Av. España 1234, Ciudad del Este"
              rows={2}
            />

            <div style={styles.row}>
              <div style={styles.halfWidth}>
                <label style={styles.label}>Teléfono</label>
                <input
                  type="tel"
                  style={styles.input}
                  value={formData.telefono}
                  onChange={(e) => updateField('telefono', e.target.value)}
                  placeholder="Ej: +595 61 123456"
                />
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}>Email de Facturación</label>
                <input
                  type="email"
                  style={styles.input}
                  value={formData.email_facturacion}
                  onChange={(e) => updateField('email_facturacion', e.target.value)}
                  placeholder="facturacion@miclinica.com"
                />
              </div>
            </div>
          </div>

          {/* Configuración Regional */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🌎 Configuración Regional</div>

            <div style={styles.row}>
              <div style={styles.halfWidth}>
                <label style={styles.label}>País *</label>
                <select
                  style={styles.select}
                  value={formData.pais}
                  onChange={(e) => {
                    const pais = e.target.value
                    updateField('pais', pais)
                    
                    // Auto-actualizar moneda según país
                    const monedas = {
                      'PY': { moneda: 'PYG', simbolo: 'Gs.' },
                      'AR': { moneda: 'ARS', simbolo: '$' },
                      'BR': { moneda: 'BRL', simbolo: 'R$' },
                      'US': { moneda: 'USD', simbolo: '$' },
                      'UY': { moneda: 'UYU', simbolo: '$U' },
                      'CL': { moneda: 'CLP', simbolo: '$' },
                    }
                    
                    if (monedas[pais]) {
                      updateField('moneda', monedas[pais].moneda)
                      updateField('simbolo_moneda', monedas[pais].simbolo)
                    }
                  }}
                >
                  <option value="PY">🇵🇾 Paraguay</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="BR">🇧🇷 Brasil</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                  <option value="UY">🇺🇾 Uruguay</option>
                  <option value="CL">🇨🇱 Chile</option>
                </select>
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}>Moneda</label>
                <div style={styles.monedaDisplay}>
                  <span style={styles.monedaSymbol}>{formData.simbolo_moneda}</span>
                  <span style={styles.monedaCode}>{formData.moneda}</span>
                </div>
              </div>
            </div>

            <label style={styles.label}>Idioma</label>
            <select
              style={styles.select}
              value={formData.idioma}
              onChange={(e) => updateField('idioma', e.target.value)}
            >
              <option value="es">Español</option>
              <option value="pt">Português</option>
              <option value="en">English</option>
            </select>
          </div>
          {/* Configuración de Mensajes WhatsApp - Solo Premium */}
            {planActual && planActual.codigo !== 'free' ? (
              <button
                onClick={() => navigate('/configuracion-mensajes')}
                style={styles.configCard}
              >
                <div style={styles.configIcon}>📱</div>
                <div style={styles.configInfo}>
                  <div style={styles.configTitle}>
                    Mensajes WhatsApp
                    <span style={styles.premiumBadge}>⭐ Premium</span>
                  </div>
                  <div style={styles.configDescription}>
                    Personalizar plantillas y nombre del remitente
                  </div>
                </div>
                <div style={styles.configArrow}>→</div>
              </button>
            ) : (
              <div style={{...styles.configCard, ...styles.configCardDisabled}}>
                <div style={styles.configIcon}>📱</div>
                <div style={styles.configInfo}>
                  <div style={styles.configTitle}>
                    Mensajes WhatsApp
                    <span style={styles.premiumBadgeLocked}>🔒 Premium</span>
                  </div>
                  <div style={styles.configDescription}>
                    Personaliza tus comunicaciones con plantillas profesionales
                  </div>
                </div>
                <button
                  onClick={() => navigate('/planes')}
                  style={styles.upgradeSmallButton}
                >
                  Ver Premium
                </button>
              </div>
            )}

          {/* Personalización */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🎨 Personalización</div>

            <label style={styles.label}>Color Primario</label>
            <div style={styles.colorPicker}>
              <input
                type="color"
                style={styles.colorInput}
                value={formData.color_primario}
                onChange={(e) => updateField('color_primario', e.target.value)}
              />
              <span style={styles.colorValue}>{formData.color_primario}</span>
              <span style={styles.colorHelp}>Este color aparecerá en tus documentos</span>
            </div>
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>⚙️ Configuraciones Adicionales</div>
            
            <div style={styles.configGrid}>
              <button
                onClick={() => navigate('/configuracion-notificaciones')}
                style={styles.configCard}
              >
                <div style={styles.configIcon}>🔔</div>
                <div style={styles.configInfo}>
                  <div style={styles.configTitle}>Notificaciones</div>
                  <div style={styles.configDescription}>
                    Configurar recordatorios automáticos y envío de mensajes
                  </div>
                </div>
                <div style={styles.configArrow}>→</div>
              </button>

              <button
                onClick={() => navigate('/catalogo-procedimientos')}
                style={styles.configCard}
              >
                <div style={styles.configIcon}>📋</div>
                <div style={styles.configInfo}>
                  <div style={styles.configTitle}>Catálogo de Procedimientos</div>
                  <div style={styles.configDescription}>
                    Gestionar tratamientos y precios
                  </div>
                </div>
                <div style={styles.configArrow}>→</div>
              </button>
            </div>
          </div>

          <div style={styles.actionsContainer}>
            <button
              onClick={() => navigate('/dashboard')}
              style={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                ...styles.saveButton,
                ...(loading && styles.saveButtonDisabled)
              }}
            >
              {loading ? 'Guardando...' : hasConfig ? '💾 Guardar Cambios' : '🚀 Guardar y Continuar'}
            </button>
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
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  welcomeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    border: '2px solid #dbeafe',
    textAlign: 'center',
  },
  welcomeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '12px',
  },
  welcomeText: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e5e7eb',
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '32px',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
    marginTop: '16px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  textArea: {
    minHeight: '60px',
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
  },
  halfWidth: {
    flex: 1,
  },
  monedaDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginTop: '8px',
  },
  monedaSymbol: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
  monedaCode: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },
  colorPicker: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  colorHelp: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  actionsContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #f3f4f6',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
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
  configGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  configCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%',
  },
  configIcon: {
    fontSize: '32px',
    minWidth: '40px',
    textAlign: 'center',
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  configDescription: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  configArrow: {
    fontSize: '20px',
    color: '#9ca3af',
    minWidth: '24px',
  },
  sectionSubtitle: {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '16px',
  marginTop: '-8px',
},

}