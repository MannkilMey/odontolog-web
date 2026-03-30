import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function OnBoardingScreen({ session }) {
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clinicData, setClinicData] = useState({
    nombre_clinica: '',
    telefono: '',
    direccion: '',
    especialidad: 'general',
  })
  const [userProfile, setUserProfile] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    especialidad: 'general',
  })
  
  const navigate = useNavigate()
  const user = session?.user

  const totalSteps = 4

  // ✅ COMPLETAR ONBOARDING
  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 1. Actualizar perfil del dentista
      const { error: profileError } = await supabase
        .from('dentistas')
        .update({
          nombres: userProfile.nombres,
          apellidos: userProfile.apellidos,
          telefono: userProfile.telefono,
          especialidad: userProfile.especialidad,
          onboarding_completado: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Crear configuración de clínica
      const { error: clinicError } = await supabase
        .from('configuracion_clinica')
        .upsert({
          dentista_id: user.id,
          nombre_clinica: clinicData.nombre_clinica,
          telefono: clinicData.telefono,
          direccion: clinicData.direccion,
          especialidad: clinicData.especialidad,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (clinicError) throw clinicError

      console.log('✅ OnBoarding completado exitosamente')
      
      // 3. Redirigir al dashboard
      navigate('/dashboard', { replace: true })
      
    } catch (error) {
      console.error('❌ Error completando onboarding:', error)
      alert('Hubo un error al guardar la configuración. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, userProfile, clinicData, navigate])

  // ✅ MANEJAR SIGUIENTE PASO
  const handleNextStep = useCallback(async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    } else {
      await completeOnboarding()
    }
  }, [currentStep, totalSteps, completeOnboarding])

  // ✅ VALIDACIONES POR PASO
  const isStepValid = () => {
    switch (currentStep) {
      case 1: return true // Bienvenida
      case 2: return userProfile.nombres.length >= 2 && userProfile.apellidos.length >= 2
      case 3: return clinicData.nombre_clinica.length >= 3
      case 4: return true // Finalización
      default: return false
    }
  }

  // ✅ SALTAR ONBOARDING (Opcional)
  const skipOnboarding = useCallback(async () => {
    if (!user?.id) return

    if (window.confirm('¿Estás seguro que deseas omitir la configuración inicial? Podrás completarla más tarde en Configuración.')) {
      try {
        const { error } = await supabase
          .from('dentistas')
          .update({
            onboarding_completado: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (error) throw error
        
        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('Error saltando onboarding:', error)
      }
    }
  }, [user?.id, navigate])

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header con progreso */}
        <div style={styles.header}>
          <div style={styles.logo}>🦷 OdontoLog</div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${(currentStep / totalSteps) * 100}%`
                }}
              />
            </div>
            <div style={styles.stepText}>
              Paso {currentStep} de {totalSteps}
            </div>
          </div>
          <button 
            onClick={skipOnboarding}
            style={styles.skipButton}
          >
            Omitir
          </button>
        </div>

        {/* Contenido por paso */}
        <div style={styles.content}>
          
          {/* PASO 1: Bienvenida */}
          {currentStep === 1 && (
            <div style={styles.step}>
              <div style={styles.stepIcon}>🎉</div>
              <h2 style={styles.stepTitle}>¡Bienvenido a OdontoLog!</h2>
              <p style={styles.stepDescription}>
                Te ayudaremos a configurar tu clínica dental en solo unos minutos.
                Con OdontoLog podrás gestionar pacientes, citas, finanzas y mucho más.
              </p>
              <div style={styles.features}>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>👥</span>
                  <span>Gestión de pacientes</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>📅</span>
                  <span>Calendario de citas</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>💰</span>
                  <span>Control financiero</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>📊</span>
                  <span>Reportes y métricas</span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Información personal */}
          {currentStep === 2 && (
            <div style={styles.step}>
              <div style={styles.stepIcon}>👨‍⚕️</div>
              <h2 style={styles.stepTitle}>Información Personal</h2>
              <p style={styles.stepDescription}>
                Cuéntanos un poco sobre ti para personalizar tu experiencia.
              </p>
              <div style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nombres *</label>
                    <input
                      type="text"
                      value={userProfile.nombres}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, nombres: e.target.value }))}
                      placeholder="Ej: Juan Carlos"
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Apellidos *</label>
                    <input
                      type="text"
                      value={userProfile.apellidos}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, apellidos: e.target.value }))}
                      placeholder="Ej: García López"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    value={userProfile.telefono}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: +595 981 234567"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Especialidad</label>
                  <select
                    value={userProfile.especialidad}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, especialidad: e.target.value }))}
                    style={styles.select}
                  >
                    <option value="general">Odontología General</option>
                    <option value="ortodoncia">Ortodoncia</option>
                    <option value="endodoncia">Endodoncia</option>
                    <option value="periodoncia">Periodoncia</option>
                    <option value="cirugia">Cirugía Oral</option>
                    <option value="pediatrica">Odontopediatría</option>
                    <option value="protesis">Prótesis</option>
                    <option value="estetica">Estética Dental</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Información de la clínica */}
          {currentStep === 3 && (
            <div style={styles.step}>
              <div style={styles.stepIcon}>🏥</div>
              <h2 style={styles.stepTitle}>Información de tu Clínica</h2>
              <p style={styles.stepDescription}>
                Configura los datos básicos de tu clínica dental.
              </p>
              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre de la Clínica *</label>
                  <input
                    type="text"
                    value={clinicData.nombre_clinica}
                    onChange={(e) => setClinicData(prev => ({ ...prev, nombre_clinica: e.target.value }))}
                    placeholder="Ej: Clínica Dental Sonrisa"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono de la Clínica</label>
                  <input
                    type="tel"
                    value={clinicData.telefono}
                    onChange={(e) => setClinicData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: +595 21 123456"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dirección</label>
                  <textarea
                    value={clinicData.direccion}
                    onChange={(e) => setClinicData(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Ej: Av. España 123, Asunción"
                    style={styles.textarea}
                    rows="3"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Especialidad Principal</label>
                  <select
                    value={clinicData.especialidad}
                    onChange={(e) => setClinicData(prev => ({ ...prev, especialidad: e.target.value }))}
                    style={styles.select}
                  >
                    <option value="general">Odontología General</option>
                    <option value="ortodoncia">Ortodoncia</option>
                    <option value="endodoncia">Endodoncia</option>
                    <option value="periodoncia">Periodoncia</option>
                    <option value="cirugia">Cirugía Oral</option>
                    <option value="pediatrica">Odontopediatría</option>
                    <option value="protesis">Prótesis</option>
                    <option value="estetica">Estética Dental</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Finalización */}
          {currentStep === 4 && (
            <div style={styles.step}>
              <div style={styles.stepIcon}>🎊</div>
              <h2 style={styles.stepTitle}>¡Todo listo!</h2>
              <p style={styles.stepDescription}>
                Tu clínica está configurada. Ya puedes empezar a usar OdontoLog para gestionar tus pacientes y citas.
              </p>
              <div style={styles.summary}>
                <div style={styles.summaryCard}>
                  <h4 style={styles.summaryTitle}>👨‍⚕️ Tu Perfil</h4>
                  <p><strong>Nombre:</strong> {userProfile.nombres} {userProfile.apellidos}</p>
                  {userProfile.telefono && <p><strong>Teléfono:</strong> {userProfile.telefono}</p>}
                  <p><strong>Especialidad:</strong> {userProfile.especialidad}</p>
                </div>
                <div style={styles.summaryCard}>
                  <h4 style={styles.summaryTitle}>🏥 Tu Clínica</h4>
                  <p><strong>Nombre:</strong> {clinicData.nombre_clinica}</p>
                  {clinicData.telefono && <p><strong>Teléfono:</strong> {clinicData.telefono}</p>}
                  {clinicData.direccion && <p><strong>Dirección:</strong> {clinicData.direccion}</p>}
                </div>
              </div>
              <div style={styles.nextSteps}>
                <h4 style={styles.nextStepsTitle}>Próximos pasos recomendados:</h4>
                <ul style={styles.nextStepsList}>
                  <li>📋 Configurar catálogo de procedimientos</li>
                  <li>👥 Agregar tus primeros pacientes</li>
                  <li>📅 Configurar tu horario de trabajo</li>
                  <li>⭐ Considerar upgrading a Premium</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Botones de navegación */}
        <div style={styles.footer}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={styles.backButton}
              disabled={loading}
            >
              ← Anterior
            </button>
          )}
          
          <button
            onClick={handleNextStep}
            style={{
              ...styles.nextButton,
              ...(loading && styles.nextButtonLoading),
              ...(!isStepValid() && styles.nextButtonDisabled)
            }}
            disabled={loading || !isStepValid()}
          >
            {loading ? (
              <span>Guardando...</span>
            ) : currentStep === totalSteps ? (
              'Finalizar Configuración'
            ) : (
              'Siguiente →'
            )}
          </button>
        </div>
      </div>

      {/* Background decorativo */}
      <div style={styles.backgroundPattern}></div>
    </div>
  )
}

export default OnBoardingScreen

// ✅ ESTILOS PROFESIONALES
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    opacity: '0.05',
    zIndex: '0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: '1',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
  progressContainer: {
    flex: '1',
    maxWidth: '200px',
    margin: '0 20px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  stepText: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
  },
  skipButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  content: {
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
  },
  step: {
    width: '100%',
    textAlign: 'center',
  },
  stepIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  stepTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
  },
  stepDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '32px',
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#4b5563',
  },
  featureIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  form: {
    textAlign: 'left',
    maxWidth: '400px',
    margin: '0 auto',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  summary: {
    display: 'grid',
    gap: '16px',
    marginTop: '24px',
    textAlign: 'left',
  },
  summaryCard: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  nextSteps: {
    marginTop: '24px',
    textAlign: 'left',
  },
  nextStepsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  nextStepsList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  nextButton: {
    padding: '12px 32px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  nextButtonLoading: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
}