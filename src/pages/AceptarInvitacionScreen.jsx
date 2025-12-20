import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AceptarInvitacionScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitacion, setInvitacion] = useState(null)
  const [ownerInfo, setOwnerInfo] = useState(null)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)

      // Verificar sesión
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!token) {
        setError('Token de invitación no válido')
        setLoading(false)
        return
      }

      // Buscar invitación
      const { data: invitData, error: invitError } = await supabase
        .from('invitaciones_clinica')
        .select(`
          *,
          owner:clinica_owner_id(nombre, apellido, email, clinica)
        `)
        .eq('token', token)
        .eq('estado', 'pendiente')
        .single()

      if (invitError || !invitData) {
        setError('Invitación no encontrada o ya ha sido utilizada')
        setLoading(false)
        return
      }

      // Verificar si no ha expirado
      const expiraEn = new Date(invitData.expira_en)
      if (expiraEn < new Date()) {
        setError('Esta invitación ha expirado')
        setLoading(false)
        return
      }

      // Verificar que el email coincida (si el usuario ya está logueado)
      if (user && user.email.toLowerCase() !== invitData.email_invitado.toLowerCase()) {
        setError(`Esta invitación es para ${invitData.email_invitado}. Por favor cierra sesión e inicia con ese email.`)
        setLoading(false)
        return
      }

      setInvitacion(invitData)

      // Cargar info del owner
      const { data: ownerData } = await supabase
        .from('dentistas')
        .select('nombre, apellido, email, clinica')
        .eq('id', invitData.clinica_owner_id)
        .single()

      setOwnerInfo(ownerData)

    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar la invitación')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      setAccepting(true)

      // Si no hay sesión, redirigir a login
      if (!user) {
        // Guardar token para después del login
        localStorage.setItem('pending_invitation_token', token)
        navigate('/login?redirect=accept-invitation')
        return
      }

      // Obtener ID del dentista actual
      const { data: dentistaData } = await supabase
        .from('dentistas')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!dentistaData) {
        alert('Error: No se encontró tu perfil de dentista')
        return
      }

      // Crear perfil en la clínica
      const { error: perfilError } = await supabase
        .from('perfiles_clinica')
        .insert({
          clinica_owner_id: invitacion.clinica_owner_id,
          dentista_id: dentistaData.id,
          rol: invitacion.rol,
          activo: true
        })

      if (perfilError) {
        console.error('Error:', perfilError)
        alert('Error al aceptar invitación: ' + perfilError.message)
        return
      }

      // Marcar invitación como aceptada
      await supabase
        .from('invitaciones_clinica')
        .update({ estado: 'aceptada' })
        .eq('id', invitacion.id)

      alert('✅ ¡Invitación aceptada! Ahora eres parte del equipo.')
      navigate('/dashboard')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al aceptar invitación')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('¿Estás seguro de rechazar esta invitación?')) return

    try {
      await supabase
        .from('invitaciones_clinica')
        .update({ estado: 'rechazada' })
        .eq('id', invitacion.id)

      alert('Invitación rechazada')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al rechazar invitación')
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>⏳</div>
          <div>Cargando invitación...</div>
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
          <div style={styles.errorText}>{error}</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backButton}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!invitacion) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>🔍</div>
          <div style={styles.errorTitle}>Invitación no encontrada</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backButton}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>📧</div>
        
        <div style={styles.title}>Invitación al Equipo</div>
        
        <div style={styles.inviteInfo}>
          <div style={styles.infoRow}>
            <div style={styles.infoLabel}>De:</div>
            <div style={styles.infoValue}>
              {ownerInfo?.nombre} {ownerInfo?.apellido}
            </div>
          </div>

          <div style={styles.infoRow}>
            <div style={styles.infoLabel}>Clínica:</div>
            <div style={styles.infoValue}>
              {ownerInfo?.clinica || 'Clínica Dental'}
            </div>
          </div>

          <div style={styles.infoRow}>
            <div style={styles.infoLabel}>Rol:</div>
            <div style={styles.infoValue}>
              {invitacion.rol === 'admin' && '⭐ Administrador'}
              {invitacion.rol === 'colaborador' && '👤 Colaborador'}
              {invitacion.rol === 'asistente' && '📋 Asistente'}
            </div>
          </div>

          {invitacion.mensaje_invitacion && (
            <div style={styles.messageBox}>
              <div style={styles.messageLabel}>Mensaje:</div>
              <div style={styles.messageText}>
                "{invitacion.mensaje_invitacion}"
              </div>
            </div>
          )}
        </div>

        <div style={styles.permissions}>
          <div style={styles.permissionsTitle}>Permisos incluidos:</div>
          <ul style={styles.permissionsList}>
            {invitacion.rol === 'admin' && (
              <>
                <li>✅ Gestionar pacientes y citas</li>
                <li>✅ Ver y registrar pagos</li>
                <li>✅ Crear presupuestos</li>
                <li>✅ Ver métricas del equipo</li>
              </>
            )}
            {invitacion.rol === 'colaborador' && (
              <>
                <li>✅ Ver y crear pacientes</li>
                <li>✅ Gestionar citas propias</li>
                <li>✅ Registrar procedimientos</li>
                <li>❌ No puede eliminar datos</li>
              </>
            )}
            {invitacion.rol === 'asistente' && (
              <>
                <li>✅ Ver pacientes y citas</li>
                <li>✅ Ver calendario</li>
                <li>❌ No puede editar información</li>
              </>
            )}
          </ul>
        </div>

        {!user && (
          <div style={styles.warningBox}>
            ⚠️ Debes iniciar sesión con <strong>{invitacion.email_invitado}</strong> para aceptar esta invitación
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={handleReject}
            style={styles.rejectButton}
            disabled={accepting}
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            style={styles.acceptButton}
            disabled={accepting}
          >
            {accepting ? 'Aceptando...' : '✅ Aceptar Invitación'}
          </button>
        </div>

        <div style={styles.expiryNote}>
          Esta invitación expira el {new Date(invitacion.expira_en).toLocaleDateString('es-ES')}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>OdontoLog - Sistema de Gestión Dental</div>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '600px',
    width: '100%',
    border: '2px solid #e5e7eb',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '32px',
  },
  inviteInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '12px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '600',
    minWidth: '80px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
  },
  messageBox: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  messageLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: '8px',
  },
  messageText: {
    fontSize: '14px',
    color: '#1f2937',
    fontStyle: 'italic',
    lineHeight: '1.6',
  },
  permissions: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  permissionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '12px',
  },
  permissionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '2px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#92400e',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  rejectButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'transparent',
    border: '2px solid #ef4444',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  acceptButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  expiryNote: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#6b7280',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: '16px',
  },
  errorText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
  },
}