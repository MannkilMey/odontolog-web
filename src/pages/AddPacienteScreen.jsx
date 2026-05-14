import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLimitesPlan } from '../hooks/useLimitesPlan'
import UpgradeModal from '../components/UpgradeModal'
import { useTranslation } from 'react-i18next'

export default function AddPacienteScreen() {
  const { t } = useTranslation()

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

  // ✅ LÍMITE DE PACIENTES
  const { verificar, limitInfo, showUpgrade, setShowUpgrade } = useLimitesPlan()
  const [limiteWarning, setLimiteWarning] = useState(null)

  // Verificar límite al cargar la pantalla
  useEffect(() => {
    const checkLimite = async () => {
      const result = await verificar('pacientes')
      if (result && !result.permitido) {
        // Límite alcanzado — mostrar modal inmediatamente
        setLimiteWarning(result)
      } else if (result && result.limite && result.porcentajeUsado >= 80) {
        // Cerca del límite — mostrar warning sutil
        setLimiteWarning(result)
      }
    }
    checkLimite()
  }, [])

  const updateField = (field, value) => {
    if (field === 'fecha_nacimiento') {
      value = formatDateInput(value)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatDateInput = (value) => {
    if (!value) return ''
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length > 8) {
      return formatDateInput(numbers.slice(0, 8))
    }
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
      alert(t('errors.requiredField', { field: t('patients.firstName') }))
      return false
    }
    if (!formData.apellido.trim()) {
      alert(t('errors.requiredField', { field: t('patients.lastName') }))
      return false
    }
    if (formData.email && !formData.email.includes('@')) {
      alert(t('errors.invalidEmail'))
      return false
    }
    if (formData.fecha_nacimiento && !isValidDate(formData.fecha_nacimiento)) {
      alert(t('errors.invalidDate'))
      return false
    }
    return true
  }

  const isValidDate = (dateString) => {
    if (!dateString) return true
    const regex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!regex.test(dateString)) return false
    const parts = dateString.split('/')
    if (parts.length !== 3) return false
    const [day, month, year] = parts
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.getFullYear() == parseInt(year) && 
           date.getMonth() == parseInt(month) - 1 && 
           date.getDate() == parseInt(day)
  }

  const formatDateForDatabase = (dateString) => {
    if (!dateString || !isValidDate(dateString)) return null
    const [day, month, year] = dateString.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleSave = async () => {
    if (!validateForm()) return

    // ✅ VERIFICAR LÍMITE ANTES DE GUARDAR
    const limiteCheck = await verificar('pacientes')
    if (!limiteCheck.permitido) {
      setShowUpgrade(true)
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert(t('errors.notAuthenticated'))
        return
      }

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

      const { data, error } = await supabase
        .from('pacientes')
        .insert([pacienteData])
        .select()

      if (error) {
        console.error('Error saving paciente:', error)
        let errorMessage = 'No se pudo guardar el paciente'
        if (error.code === '22008') {
          errorMessage = 'Error en el formato de fecha. Use DD/MM/AAAA'
        } else if (error.code === '23505') {
          errorMessage = 'Ya existe un paciente con esos datos'
        } else if (error.message) {
          errorMessage = error.message
        }
        alert(t('errors.generic'))
      } else {
        navigate('/dashboard')
        setTimeout(() => {
         alert(t('patients.patientAdded'))
        }, 500)
      }
    } catch (error) {
      console.error('Error general:', error)
      alert('Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!hasFormData()) {
      navigate('/dashboard')
      return
    }
    if (window.confirm(t('patients.unsavedChanges'))) {
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
        <button onClick={handleCancel} style={styles.cancelButton}>
            {t('common.cancel')}
        </button>
        <div style={styles.headerTitle}>{t('patients.addPatient')}</div>
        <button 
          onClick={handleSave}
          style={{...styles.saveButton, ...(loading && styles.saveButtonDisabled)}}
          disabled={loading}
        >
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {/* ✅ WARNING BANNER cuando está cerca del límite */}
      {limiteWarning && limiteWarning.limite && (
        <div style={{
          ...styles.warningBanner,
          backgroundColor: limiteWarning.permitido ? '#fffbeb' : '#fef2f2',
          borderColor: limiteWarning.permitido ? '#f59e0b' : '#ef4444',
        }}>
          <span style={{
            color: limiteWarning.permitido ? '#92400e' : '#991b1b',
            fontSize: '14px',
          }}>
            {limiteWarning.permitido
              ? `⚠️ ${t('limits.patientsWarning', { used: limiteWarning.usado, limit: limiteWarning.limite, percent: limiteWarning.porcentajeUsado })}`
              : `🚫 ${t('limits.patientsBlocked', { used: limiteWarning.usado, limit: limiteWarning.limite })}`
            }
            <button
              onClick={() => navigate('/planes')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1e40af',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
              }}
            >
             {t('limits.viewPlans')}
            </button>
          </span>
        </div>
      )}

      <div style={styles.form}>
        {/* Información Personal */}
        <div style={styles.sectionTitle}>{t('patients.personalInfo')}</div>
        
        <div style={styles.row}>
          <div style={styles.halfWidth}>
            <label style={styles.label}>{t('patients.firstName')}*</label>
            <input
              type="text"
              style={styles.input}
              value={formData.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              placeholder={t('patients.firstNamePlaceholder')}
            />
          </div>
          
          <div style={styles.halfWidth}>
            <label style={styles.label}>{t('patients.lastName')} *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.apellido}
              onChange={(e) => updateField('apellido', e.target.value)}
              placeholder={t('patients.lastNamePlaceholder')}
            />
          </div>
        </div>

        <label style={styles.label}>{t('patients.gender')}</label>
        <div style={styles.genderContainer}>
          <GenderButton gender="masculino" label={t('patients.male')} />
          <GenderButton gender="femenino" label={t('patients.female')} />
          <GenderButton gender="otro" label={t('patients.other')} />
        </div>

        <label style={styles.label}>{t('patients.birthDate')}</label>
        <input
          type="text"
          style={styles.input}
          value={formData.fecha_nacimiento}
          onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
          placeholder={t('patients.birthDatePlaceholder')}
          maxLength={10}
        />
        {formData.fecha_nacimiento && !isValidDate(formData.fecha_nacimiento) && (
          <div style={styles.errorText}>{t('patients.birthDateError')}</div>
        )}

        {/* Información de Contacto */}
        <div style={styles.sectionTitle}>{t('patients.contactInfo')}</div>

        <label style={styles.label}>{t('common.phone')}</label>
        <input
          type="tel"
          style={styles.input}
          value={formData.telefono}
          onChange={(e) => updateField('telefono', e.target.value)}
          placeholder={t('patients.phonePlaceholder')}
        />

        <label style={styles.label}>{t('common.email')}</label>
        <input
          type="email"
          style={styles.input}
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder={t('patients.emailPlaceholder')}
        />

        <label style={styles.label}>{t('common.address')}</label>
        <textarea
          style={{...styles.input, ...styles.textArea}}
          value={formData.direccion}
          onChange={(e) => updateField('direccion', e.target.value)}
          placeholder={t('patients.addressPlaceholder')}
          rows={3}
        />

        {/* Notas Adicionales */}
        <div style={styles.sectionTitle}>{t('patients.additionalNotes')}</div>

        <label style={styles.label}>{t('patients.observations')}</label>
        <textarea
          style={{...styles.input, ...styles.textArea}}
          value={formData.notas_generales}
          onChange={(e) => updateField('notas_generales', e.target.value)}
          placeholder={t('patients.observationsPlaceholder')}
          rows={4}
        />

        <div style={styles.spacer} />
      </div>

      <div style={styles.footer}>
        <div style={styles.footerText}>{t('common.poweredBy')}</div>
      </div>

      {/* ✅ MODAL DE UPGRADE */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        tipo="pacientes"
        usado={limitInfo?.usado || 0}
        limite={limitInfo?.limite || 0}
        planActual={limitInfo?.plan || 'Gratuito'}
      />
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
  warningBanner: {
    padding: '12px 24px',
    borderBottom: '2px solid',
    textAlign: 'center',
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