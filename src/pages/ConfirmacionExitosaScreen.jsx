import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { procesarConfirmacionLink } from '../utils/confirmacionLinks'

export default function ConfirmacionExitosaScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    procesarConfirmacion()
  }, [token])

  const procesarConfirmacion = async () => {
  try {
    console.log('🚀 INICIANDO procesarConfirmacion con token:', token) // 🆕 NUEVO LOG
    setLoading(true)
    
    console.log('🔄 Llamando procesarConfirmacionLink...') // 🆕 NUEVO LOG
    const result = await procesarConfirmacionLink(token, 'confirmar')
    
    console.log('📋 Resultado completo:', result) // 🆕 NUEVO LOG
    
    if (result.success) {
      console.log('✅ Success = true, seteando resultado') // 🆕 NUEVO LOG
      setResultado(result)
    } else {
      console.log('❌ Success = false, seteando error:', result.message) // 🆕 NUEVO LOG
      setError(result.message)
    }
  } catch (error) {
    console.error('💥 CATCH Error al confirmar cita:', error) // 🆕 MEJORADO
    setError('Error al procesar confirmación')
  } finally {
    console.log('🏁 Finalizando, setting loading = false') // 🆕 NUEVO LOG
    setLoading(false)
  }
}

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner}>⏳</div>
          <div style={styles.loadingText}>Procesando confirmación...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <div style={styles.errorTitle}>Error</div>
          <div style={styles.errorMessage}>{error}</div>
          <button 
            style={styles.button}
            onClick={() => navigate('/')}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <div style={styles.successIcon}>✅</div>
        <div style={styles.successTitle}>¡Cita Confirmada!</div>
        <div style={styles.successMessage}>
          Su cita ha sido confirmada exitosamente.
        </div>
        
        {resultado?.datos_cita && (
          <div style={styles.citaInfo}>
            <div style={styles.citaInfoTitle}>Detalles de su cita:</div>
            <div style={styles.citaInfoItem}>
              📅 <strong>Fecha:</strong> {new Date(resultado.datos_cita.fecha_cita).toLocaleDateString('es-ES')}
            </div>
            <div style={styles.citaInfoItem}>
              🕐 <strong>Hora:</strong> {resultado.datos_cita.hora_inicio}
            </div>
            <div style={styles.citaInfoItem}>
              📋 <strong>Motivo:</strong> {resultado.datos_cita.motivo}
            </div>
          </div>
        )}

        <div style={styles.thankYou}>
          Gracias por confirmar su asistencia. Lo esperamos en el consultorio.
        </div>

        <button 
          style={styles.button}
          onClick={() => navigate('/')}
        >
          Finalizar
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
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    maxWidth: '500px',
    width: '100%'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  successTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '16px'
  },
  successMessage: {
    fontSize: '18px',
    color: '#374151',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  citaInfo: {
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #d1fae5',
    textAlign: 'left'
  },
  citaInfoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '12px'
  },
  citaInfoItem: {
    fontSize: '15px',
    color: '#047857',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  thankYou: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px',
    fontStyle: 'italic'
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
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
}