import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ConfiguracionNotificacionesScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    // Recordatorios
    recordatorios_activos: true,
    recordatorios_dias_anticipacion: 1,
    recordatorios_hora_envio: '09:00',
    recordatorios_canales: ['email', 'whatsapp'],
    
    // Confirmaciones
    confirmaciones_activas: true,
    confirmaciones_canales: ['email'],
    
    // Recibos
    recibos_automaticos: false,
    recibos_canales: ['email'],
    
    // Presupuestos
    presupuestos_recordatorio_activo: false,
    presupuestos_dias_recordatorio: 7
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('configuracion_notificaciones')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error:', error)
      }

      if (data) {
        setConfig(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('configuracion_notificaciones')
        .upsert({
          dentista_id: user.id,
          ...config
        })

      if (error) throw error

      alert('✅ Configuración guardada correctamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  const toggleCanal = (tipo, canal) => {
    const key = `${tipo}_canales`
    const canales = config[key] || []
    
    if (canales.includes(canal)) {
      setConfig({
        ...config,
        [key]: canales.filter(c => c !== canal)
      })
    } else {
      setConfig({
        ...config,
        [key]: [...canales, canal]
      })
    }
  }

  // ============================================
  // COMPONENTE SWITCH REUTILIZABLE
  // ============================================
  const Switch = ({ checked, onChange }) => {
    return (
      <label style={styles.switchContainer}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ display: 'none' }}
        />
        <div 
          style={{
            ...styles.switchTrack,
            backgroundColor: checked ? '#10b981' : '#cbd5e1'
          }}
        >
          <div 
            style={{
              ...styles.switchThumb,
              transform: checked ? 'translateX(26px)' : 'translateX(0)',
            }}
          />
        </div>
      </label>
    )
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>⚙️ Configuración de Notificaciones</div>
          <div style={styles.subtitle}>Personaliza cómo y cuándo enviar mensajes</div>
        </div>
      </div>

      <div style={styles.scrollView}>
        {/* RECORDATORIOS DE CITAS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>🔔 Recordatorios de Citas</div>
            <Switch
              checked={config.recordatorios_activos}
              onChange={(e) => setConfig({ ...config, recordatorios_activos: e.target.checked })}
            />
          </div>

          {config.recordatorios_activos && (
            <div style={styles.sectionContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Enviar recordatorio con anticipación de:</label>
                <select
                  style={styles.select}
                  value={config.recordatorios_dias_anticipacion}
                  onChange={(e) => setConfig({ ...config, recordatorios_dias_anticipacion: parseInt(e.target.value) })}
                >
                  <option value="1">1 día antes</option>
                  <option value="2">2 días antes</option>
                  <option value="3">3 días antes</option>
                  <option value="7">1 semana antes</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Hora de envío:</label>
                <input
                  type="time"
                  style={styles.input}
                  value={config.recordatorios_hora_envio}
                  onChange={(e) => setConfig({ ...config, recordatorios_hora_envio: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Canales de envío:</label>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.recordatorios_canales?.includes('email')}
                      onChange={() => toggleCanal('recordatorios', 'email')}
                    />
                    📧 Email
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.recordatorios_canales?.includes('whatsapp')}
                      onChange={() => toggleCanal('recordatorios', 'whatsapp')}
                    />
                    📱 WhatsApp
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONFIRMACIONES DE CITAS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>✅ Confirmaciones de Citas</div>
            <Switch
              checked={config.confirmaciones_activas}
              onChange={(e) => setConfig({ ...config, confirmaciones_activas: e.target.checked })}
            />
          </div>

          {config.confirmaciones_activas && (
            <div style={styles.sectionContent}>
              <p style={styles.description}>
                Enviar confirmación automáticamente al crear una nueva cita
              </p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Canales de envío:</label>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.confirmaciones_canales?.includes('email')}
                      onChange={() => toggleCanal('confirmaciones', 'email')}
                    />
                    📧 Email
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.confirmaciones_canales?.includes('whatsapp')}
                      onChange={() => toggleCanal('confirmaciones', 'whatsapp')}
                    />
                    📱 WhatsApp
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECIBOS AUTOMÁTICOS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>🧾 Recibos de Pago</div>
            <Switch
              checked={config.recibos_automaticos}
              onChange={(e) => setConfig({ ...config, recibos_automaticos: e.target.checked })}
            />
          </div>

          {config.recibos_automaticos && (
            <div style={styles.sectionContent}>
              <p style={styles.description}>
                Enviar recibo automáticamente al registrar un pago
              </p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Canales de envío:</label>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.recibos_canales?.includes('email')}
                      onChange={() => toggleCanal('recibos', 'email')}
                    />
                    📧 Email
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.recibos_canales?.includes('whatsapp')}
                      onChange={() => toggleCanal('recibos', 'whatsapp')}
                    />
                    📱 WhatsApp
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECORDATORIOS DE PRESUPUESTOS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>📄 Recordatorios de Presupuestos</div>
            <Switch
              checked={config.presupuestos_recordatorio_activo}
              onChange={(e) => setConfig({ ...config, presupuestos_recordatorio_activo: e.target.checked })}
            />
          </div>

          {config.presupuestos_recordatorio_activo && (
            <div style={styles.sectionContent}>
              <p style={styles.description}>
                Recordar a los pacientes sobre presupuestos pendientes
              </p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Frecuencia de recordatorio:</label>
                <select
                  style={styles.select}
                  value={config.presupuestos_dias_recordatorio}
                  onChange={(e) => setConfig({ ...config, presupuestos_dias_recordatorio: parseInt(e.target.value) })}
                >
                  <option value="3">Cada 3 días</option>
                  <option value="7">Cada semana</option>
                  <option value="14">Cada 2 semanas</option>
                  <option value="30">Cada mes</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            ...(saving && styles.saveButtonDisabled)
          }}
        >
          {saving ? 'Guardando...' : '💾 Guardar Configuración'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    gap: '16px',
  },
  backButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px',
  },
  scrollView: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionContent: {
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  // ✅ ESTILOS DEL SWITCH
  switchContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px',
    cursor: 'pointer',
  },
  switchTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '24px',
    transition: 'background-color 0.3s ease',
  },
  switchThumb: {
    position: 'absolute',
    height: '18px',
    width: '18px',
    left: '3px',
    bottom: '3px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.3s ease',
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '24px',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
}