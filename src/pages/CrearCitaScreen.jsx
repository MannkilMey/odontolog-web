import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CrearCitaScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pacientes, setPacientes] = useState([])
  
  const [formData, setFormData] = useState({
    paciente_id: location.state?.pacienteId || '',
    fecha_cita: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '10:00',
    motivo: '',
    tratamiento_planificado: '',
    notas: '',
    estado: 'pendiente'
  })

  const [citasExistentes, setCitasExistentes] = useState([])

  useEffect(() => {
    loadPacientes()
  }, [])

  useEffect(() => {
    if (formData.fecha_cita) {
      loadCitasDelDia()
    }
  }, [formData.fecha_cita])

  const loadPacientes = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: pacientesData, error } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, telefono')
        .eq('dentista_id', user.id)
        .order('apellido')

      if (error) throw error
      setPacientes(pacientesData || [])

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar pacientes')
    } finally {
      setLoading(false)
    }
  }

  const loadCitasDelDia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: citasData, error } = await supabase
        .from('citas')
        .select('hora_inicio, hora_fin, pacientes(nombre, apellido)')
        .eq('dentista_id', user.id)
        .eq('fecha_cita', formData.fecha_cita)
        .order('hora_inicio')

      if (error) throw error
      setCitasExistentes(citasData || [])

    } catch (error) {
      console.error('Error loading citas:', error)
    }
  }

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.paciente_id) {
      alert('Debes seleccionar un paciente')
      return false
    }

    if (!formData.fecha_cita) {
      alert('La fecha es requerida')
      return false
    }

    if (!formData.hora_inicio || !formData.hora_fin) {
      alert('Las horas son requeridas')
      return false
    }

    if (formData.hora_fin <= formData.hora_inicio) {
      alert('La hora de fin debe ser posterior a la hora de inicio')
      return false
    }

    if (!formData.motivo.trim()) {
      alert('El motivo de la cita es requerido')
      return false
    }

    // Validar superposición de horarios
    const horaInicioNueva = formData.hora_inicio
    const horaFinNueva = formData.hora_fin

    const haySuperposicion = citasExistentes.some(cita => {
      const horaInicio = cita.hora_inicio
      const horaFin = cita.hora_fin

      // Verificar superposición
      return (
        (horaInicioNueva >= horaInicio && horaInicioNueva < horaFin) ||
        (horaFinNueva > horaInicio && horaFinNueva <= horaFin) ||
        (horaInicioNueva <= horaInicio && horaFinNueva >= horaFin)
      )
    })

    if (haySuperposicion) {
      const confirmar = window.confirm(
        '⚠️ Ya existe una cita en ese horario.\n\n¿Deseas programarla de todas formas?'
      )
      if (!confirmar) return false
    }

    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const citaData = {
        dentista_id: user.id,
        paciente_id: formData.paciente_id,
        fecha_cita: formData.fecha_cita,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        motivo: formData.motivo.trim(),
        tratamiento_planificado: formData.tratamiento_planificado.trim() || null,
        notas: formData.notas.trim() || null,
        estado: formData.estado
      }

      const { error } = await supabase
        .from('citas')
        .insert(citaData)

      if (error) throw error

      alert('✅ Cita programada exitosamente')
      navigate('/calendario')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar cita: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const horariosDisponibles = () => {
    const horarios = []
    for (let h = 7; h <= 19; h++) {
      horarios.push(`${String(h).padStart(2, '0')}:00`)
      horarios.push(`${String(h).padStart(2, '0')}:30`)
    }
    return horarios
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando...</div>
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
          <div style={styles.title}>📅 Nueva Cita</div>
          <div style={styles.subtitle}>Programar una cita</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        <div style={styles.form}>
          {/* Información de la Cita */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Información de la Cita</div>

            <label style={styles.label}>Paciente *</label>
            <select
              style={styles.select}
              value={formData.paciente_id}
              onChange={(e) => updateFormField('paciente_id', e.target.value)}
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre} {p.telefono ? `(${p.telefono})` : ''}
                </option>
              ))}
            </select>

            <label style={styles.label}>Fecha de la Cita *</label>
            <input
              type="date"
              style={styles.input}
              value={formData.fecha_cita}
              onChange={(e) => updateFormField('fecha_cita', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Hora de Inicio *</label>
                <select
                  style={styles.select}
                  value={formData.hora_inicio}
                  onChange={(e) => updateFormField('hora_inicio', e.target.value)}
                >
                  {horariosDisponibles().map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hora de Fin *</label>
                <select
                  style={styles.select}
                  value={formData.hora_fin}
                  onChange={(e) => updateFormField('hora_fin', e.target.value)}
                >
                  {horariosDisponibles().map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={styles.label}>Motivo de la Cita *</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Ej: Limpieza dental, Control general, Tratamiento de conducto"
              value={formData.motivo}
              onChange={(e) => updateFormField('motivo', e.target.value)}
            />

            <label style={styles.label}>Tratamiento Planificado (opcional)</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Descripción del tratamiento a realizar"
              value={formData.tratamiento_planificado}
              onChange={(e) => updateFormField('tratamiento_planificado', e.target.value)}
            />

            <label style={styles.label}>Notas Adicionales (opcional)</label>
            <textarea
              style={{...styles.input, ...styles.textArea}}
              placeholder="Notas o recordatorios sobre esta cita..."
              value={formData.notas}
              onChange={(e) => updateFormField('notas', e.target.value)}
              rows={3}
            />

            <label style={styles.label}>Estado de la Cita</label>
            <select
              style={styles.select}
              value={formData.estado}
              onChange={(e) => updateFormField('estado', e.target.value)}
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
            </select>
          </div>

          {/* Citas Existentes del Día */}
          {citasExistentes.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                📋 Citas programadas para {formData.fecha_cita}
              </div>
              <div style={styles.citasExistentes}>
                {citasExistentes.map((cita, idx) => (
                  <div key={idx} style={styles.citaExistenteItem}>
                    <span style={styles.citaHora}>
                      {cita.hora_inicio.slice(0,5)} - {cita.hora_fin.slice(0,5)}
                    </span>
                    <span style={styles.citaPacienteNombre}>
                      {cita.pacientes?.nombre} {cita.pacientes?.apellido}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div style={styles.actionsContainer}>
            <button
              onClick={() => navigate(-1)}
              style={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...styles.saveButton,
                ...(saving && styles.saveButtonDisabled)
              }}
            >
              {saving ? 'Guardando...' : '💾 Programar Cita'}
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
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
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
    minHeight: '80px',
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
  },
  citasExistentes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  citaExistenteItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  citaHora: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  citaPacienteNombre: {
    fontSize: '14px',
    color: '#6b7280',
  },
  actionsContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
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
    backgroundColor: '#10b981',
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
}