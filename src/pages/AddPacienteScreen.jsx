import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AddPacienteScreen() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    genero: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    direccion: '',
    notas_generales: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const updateField = (field, value) => {
    // Auto-formatear fecha mientras se escribe
    if (field === 'fecha_nacimiento') {
      value = formatDateInput(value)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatDateInput = (value) => {
    if (!value) return ''
    
    // Remover todos los caracteres no numéricos
    const numbers = value.replace(/[^\d]/g, '')
    
    // Limitar a 8 dígitos
    if (numbers.length > 8) {
      return formatDateInput(numbers.slice(0, 8))
    }
    
    // Formatear automáticamente con barras
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2)
    } else {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4) + '/' + numbers.slice(4)
    }
  }

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido')
      return false
    }
    if (!formData.apellido.trim()) {
      alert('El apellido es requerido')
      return false
    }
    if (formData.email && !formData.email.includes('@')) {
      alert('El email debe tener un formato válido')
      return false
    }
    
    // Validar formato de fecha si se proporciona
    if (formData.fecha_nacimiento && !isValidDate(formData.fecha_nacimiento)) {
      alert('La fecha debe tener el formato DD/MM/AAAA')
      return false
    }
    
    return true
  }

  const isValidDate = (dateString) => {
    if (!dateString) return true // Empty is valid
    
    // Verificar formato DD/MM/YYYY
    const regex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!regex.test(dateString)) return false
    
    const parts = dateString.split('/')
    if (parts.length !== 3) return false
    
    const [day, month, year] = parts
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Verificar que la fecha sea válida
    return date.getFullYear() == parseInt(year) && 
           date.getMonth() == parseInt(month) - 1 && 
           date.getDate() == parseInt(day)
  }

  const formatDateForDatabase = (dateString) => {
    if (!dateString || !isValidDate(dateString)) return null
    
    // Convertir DD/MM/YYYY a YYYY-MM-DD
    const [day, month, year] = dateString.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleSave = async () => {
    console.log('🟢 SAVE BUTTON CLICKED')
    if (!validateForm()) return

    setLoading(true)

    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('No se pudo obtener la información del usuario')
        return
      }

      // Preparar datos para insertar
      const pacienteData = {
        dentista_id: user.id,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        genero: formData.genero || null,
        fecha_nacimiento: formatDateForDatabase(formData.fecha_nacimiento),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null,
        notas_generales: formData.notas_generales.trim() || null,
      }

      console.log('🟢 Datos a enviar:', pacienteData)

      // Insertar en Supabase
      const { data, error } = await supabase
        .from('pacientes')
        .insert([pacienteData])
        .select()

      if (error) {
        console.error('🔴 Error saving paciente:', error)
        let errorMessage = 'No se pudo guardar el paciente'
        
        if (error.code === '22008') {
          errorMessage = 'Error en el formato de fecha. Use DD/MM/AAAA'
        } else if (error.code === '23505') {
          errorMessage = 'Ya existe un paciente con esos datos'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        alert(errorMessage)
      } else {
        console.log('🟢 Paciente guardado exitosamente:', data)
        
        // Navegar al dashboard
        navigate('/dashboard')
        
        // Mostrar mensaje de éxito
        setTimeout(() => {
          alert('¡Paciente agregado correctamente!')
        }, 500)
      }
    } catch (error) {
      console.error('🔴 Error general:', error)
      alert('Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    console.log('🔴 CANCEL BUTTON CLICKED')
    
    // Navigate immediately without alert if no data
    if (!hasFormData()) {
      console.log('🔴 No form data, navigating immediately')
      navigate('/dashboard')
      return
    }
    
    if (window.confirm('¿Estás seguro? Se perderán los datos ingresados.')) {
      console.log('🔴 CANCEL CONFIRMED')
      navigate('/dashboard')
    }
  }

  const hasFormData = () => {
    return formData.nombre.trim() || 
           formData.apellido.trim() || 
           formData.telefono.trim() || 
           formData.email.trim() || 
           formData.direccion.trim() || 
           formData.notas_generales.trim()
  }

  const GenderButton = ({ gender, label }) => (
    <button
      type="button"
      style={{
        ...styles.genderButton,
        ...(formData.genero === gender && styles.genderButtonActive)
      }}
      onClick={() => updateField('genero', gender)}
    >
      <span style={{
        ...styles.genderButtonText,
        ...(formData.genero === gender && styles.genderButtonTextActive)
      }}>
        {label}
      </span>
    </button>
  )

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={handleCancel}
          style={styles.cancelButton}
        >
          Cancelar
        </button>
        <div style={styles.headerTitle}>Nuevo Paciente</div>
        <button 
          onClick={handleSave}
          style={{...styles.saveButton, ...(loading && styles.saveButtonDisabled)}}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div style={styles.form}>
        {/* Información Personal */}
        <div style={styles.sectionTitle}>Información Personal</div>
        
        <div style={styles.row}>
          <div style={styles.halfWidth}>
            <label style={styles.label}>Nombre *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              placeholder="Ej: Juan"
            />
          </div>
          
          <div style={styles.halfWidth}>
            <label style={styles.label}>Apellido *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.apellido}
              onChange={(e) => updateField('apellido', e.target.value)}
              placeholder="Ej: Pérez"
            />
          </div>
        </div>

        <label style={styles.label}>Género</label>
        <div style={styles.genderContainer}>
          <GenderButton gender="masculino" label="Masculino" />
          <GenderButton gender="femenino" label="Femenino" />
          <GenderButton gender="otro" label="Otro" />
        </div>

        <label style={styles.label}>Fecha de Nacimiento</label>
        <input
          type="text"
          style={styles.input}
          value={formData.fecha_nacimiento}
          onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
          placeholder="DD/MM/AAAA (ej: 17/05/1995)"
          maxLength={10}
        />
        {formData.fecha_nacimiento && !isValidDate(formData.fecha_nacimiento) && (
          <div style={styles.errorText}>Formato incorrecto. Use DD/MM/AAAA</div>
        )}

        {/* Información de Contacto */}
        <div style={styles.sectionTitle}>Información de Contacto</div>

        <label style={styles.label}>Teléfono</label>
        <input
          type="tel"
          style={styles.input}
          value={formData.telefono}
          onChange={(e) => updateField('telefono', e.target.value)}
          placeholder="Ej: +595 21 123456"
        />

        <label style={styles.label}>Email</label>
        <input
          type="email"
          style={styles.input}
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="Ej: juan.perez@email.com"
        />

        <label style={styles.label}>Dirección</label>
        <textarea
          style={{...styles.input, ...styles.textArea}}
          value={formData.direccion}
          onChange={(e) => updateField('direccion', e.target.value)}
          placeholder="Ej: Av. España 123, Ciudad del Este"
          rows={3}
        />

        {/* Notas Adicionales */}
        <div style={styles.sectionTitle}>Notas Adicionales</div>

        <label style={styles.label}>Observaciones</label>
        <textarea
          style={{...styles.input, ...styles.textArea}}
          value={formData.notas_generales}
          onChange={(e) => updateField('notas_generales', e.target.value)}
          placeholder="Notas médicas, alergias, observaciones especiales..."
          rows={4}
        />

        <div style={styles.spacer} />
      </div>

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
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  cancelButton: {
    padding: '8px 16px',
    minWidth: '80px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ef4444',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e40af',
  },
  saveButton: {
    backgroundColor: '#1e40af',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '100px',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  form: {
    flex: 1,
    padding: '24px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: '24px',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    marginBottom: '16px',
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '16px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  textArea: {
    minHeight: '80px',
    maxHeight: '120px',
    resize: 'vertical',
  },
  genderContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    marginBottom: '16px',
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  genderButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  genderButtonText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
  },
  genderButtonTextActive: {
    color: '#ffffff',
  },
  spacer: {
    height: '40px',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '-12px',
    marginBottom: '12px',
    marginLeft: '4px',
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
}