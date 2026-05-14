import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { procesarConfirmacionLink } from '../utils/confirmacionLinks'

export default function CancelacionExitosaScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    procesarCancelacion()
  }, [token])

  const procesarCancelacion = async () => {
    try {
      setLoading(true)
      
      const result = await procesarConfirmacionLink(token, 'cancelar')
      
      if (result.success) {
        setResultado(result)

        // Detectar idioma de la clínica del Dr que envió la cita
        if (result.datos_cita?.dentista_id) {
          const { data: config } = await supabase
            .from('configuracion_clinica')
            .select('idioma')
            .eq('dentista_id', result.datos_cita.dentista_id)
            .maybeSingle()
          
          if (config?.idioma) {
            i18n.changeLanguage(config.idioma)
          }
        }
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('Error:', error)
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner}>⏳</div>
          <div style={styles.loadingText}>{t('cancel.processing')}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <div style={styles.errorTitle}>{t('common.error')}</div>
          <div style={styles.errorMessage}>{error}</div>
          <button 
            style={styles.button}
            onClick={() => navigate('/')}
          >
            {t('cancel.goHome')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.cancelCard}>
        <div style={styles.cancelIcon}>❌</div>
        <div style={styles.cancelTitle}>{t('cancel.title')}</div>
        <div style={styles.cancelMessage}>
          {t('cancel.message')}
        </div>
        
        {resultado?.datos_cita && (
          <div style={styles.citaInfo}>
            <div style={styles.citaInfoTitle}>{t('cancel.cancelledAppointment')}</div>
            <div style={styles.citaInfoItem}>
              📅 <strong>{t('emailTemplates.reminderDate')}:</strong> {new Date(resultado.datos_cita.fecha_cita).toLocaleDateString(i18n.language)}
            </div>
            <div style={styles.citaInfoItem}>
              🕐 <strong>{t('emailTemplates.reminderTime')}:</strong> {resultado.datos_cita.hora_inicio}
            </div>
            <div style={styles.citaInfoItem}>
              📋 <strong>{t('emailTemplates.reminderReason')}:</strong> {resultado.datos_cita.motivo}
            </div>
          </div>
        )}

        <div style={styles.contactInfo}>
          <div style={styles.contactTitle}>{t('cancel.needReschedule')}</div>
          <div style={styles.contactMessage}>
            {t('cancel.rescheduleMessage')}
          </div>
        </div>

        <button 
          style={styles.button}
          onClick={() => navigate('/')}
        >
          {t('cancel.finish')}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    maxWidth: '400px',
    width: '100%'
  },
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  loadingText: {
    fontSize: '18px',
    color: '#6b7280',
    fontWeight: '500'
  },
  cancelCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #fca5a5',
    maxWidth: '500px',
    width: '100%'
  },
  cancelIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  cancelTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: '16px'
  },
  cancelMessage: {
    fontSize: '18px',
    color: '#374151',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  citaInfo: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #fecaca',
    textAlign: 'left'
  },
  citaInfoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: '12px'
  },
  citaInfoItem: {
    fontSize: '15px',
    color: '#dc2626',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  contactInfo: {
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    border: '1px solid #fed7aa'
  },
  contactTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '8px'
  },
  contactMessage: {
    fontSize: '14px',
    color: '#a16207',
    lineHeight: '1.5'
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #fca5a5',
    maxWidth: '400px',
    width: '100%'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: '16px'
  },
  errorMessage: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '32px',
    lineHeight: '1.6'
  },
  button: {
    padding: '12px 32px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
}