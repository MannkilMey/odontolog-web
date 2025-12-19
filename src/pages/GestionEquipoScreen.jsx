import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function GestionEquipoScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [perfiles, setPerfiles] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [maxPerfiles, setMaxPerfiles] = useState(1)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    rol: 'colaborador',
    mensaje: ''
  })

  useEffect(() => {
    checkPlanAndLoadData()
  }, [])

  const checkPlanAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Verificar plan
      const { data: suscripcion, error: subError } = await supabase
        .from('suscripciones_usuarios')
        .select(`
          *,
          plan:planes_suscripcion(
            codigo,
            nombre,
            max_perfiles,
            permite_multi_perfil
          )
        `)
        .eq('dentista_id', user.id)
        .single()

      if (subError) throw subError

      const planData = suscripcion.plan
      setIsEnterprise(planData.permite_multi_perfil)
      setMaxPerfiles(planData.max_perfiles)

      if (!planData.permite_multi_perfil) {
        setLoading(false)
        return
      }

      // Cargar perfiles
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles_clinica')
        .select(`
          *,
          dentista:dentistas(id, nombre, apellido, email, telefono)
        `)
        .eq('clinica_owner_id', user.id)
        .order('created_at', { ascending: false })

      if (perfilesError) throw perfilesError
      setPerfiles(perfilesData || [])

      // Cargar invitaciones pendientes
      const { data: invitData, error: invitError } = await supabase
        .from('invitaciones_clinica')
        .select('*')
        .eq('clinica_owner_id', user.id)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })

      if (invitError) throw invitError
      setInvitaciones(invitData || [])

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      alert('El email es requerido')
      return
    }

    // Verificar límite
    if (perfiles.length >= maxPerfiles - 1) {
      alert(`Has alcanzado el límite de ${maxPerfiles} perfiles para tu plan`)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Generar token único
      const token = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15)

      const { error } = await supabase
        .from('invitaciones_clinica')
        .insert({
          clinica_owner_id: user.id,
          email_invitado: inviteForm.email.trim().toLowerCase(),
          rol: inviteForm.rol,
          token: token,
          mensaje_invitacion: inviteForm.mensaje.trim() || null,
          estado: 'pendiente'
        })

      if (error) throw error

      alert('✅ Invitación enviada correctamente')
      setShowInviteModal(false)
      setInviteForm({ email: '', rol: 'colaborador', mensaje: '' })
      checkPlanAndLoadData()

    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar invitación: ' + error.message)
    }
  }

  const handleCancelInvitation = async (invitacionId) => {
    if (!confirm('¿Cancelar esta invitación?')) return

    try {
      const { error } = await supabase
        .from('invitaciones_clinica')
        .delete()
        .eq('id', invitacionId)

      if (error) throw error

      alert('Invitación cancelada')
      checkPlanAndLoadData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cancelar invitación')
    }
  }

  const handleRemovePerfil = async (perfilId) => {
    if (!confirm('¿Remover este colaborador del equipo?')) return

    try {
      const { error } = await supabase
        .from('perfiles_clinica')
        .delete()
        .eq('id', perfilId)

      if (error) throw error

      alert('Colaborador removido')
      checkPlanAndLoadData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al remover colaborador')
    }
  }

  const handleToggleActivo = async (perfilId, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('perfiles_clinica')
        .update({ activo: nuevoEstado })
        .eq('id', perfilId)

      if (error) throw error

      checkPlanAndLoadData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar estado')
    }
  }

  const getRolLabel = (rol) => {
    const labels = {
      owner: '👑 Dueño',
      admin: '⭐ Administrador',
      colaborador: '👤 Colaborador',
      asistente: '📋 Asistente'
    }
    return labels[rol] || rol
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando...</div>
      </div>
    )
  }

  if (!isEnterprise) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            ← Volver
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.title}>👥 Gestión de Equipo</div>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.upgradeCard}>
            <div style={styles.upgradeIcon}>⭐</div>
            <div style={styles.upgradeContent}>
              <div style={styles.upgradeTitle}>Función Enterprise</div>
              <div style={styles.upgradeText}>
                La gestión de equipo multi-perfil está disponible solo en el plan Enterprise.
                Con este plan podrás:
              </div>
              <ul style={styles.featureList}>
                <li>👥 Agregar hasta 4 dentistas en tu clínica</li>
                <li>📊 Ver métricas individuales por colaborador</li>
                <li>🔐 Asignar roles y permisos personalizados</li>
                <li>💼 Gestión centralizada de pacientes</li>
                <li>📱 500 WhatsApp/mes compartidos</li>
              </ul>
              <button
                style={styles.upgradeButton}
                onClick={() => navigate('/suscripcion')}
              >
                Actualizar a Enterprise
              </button>
            </div>
          </div>
        </div>
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
          <div style={styles.title}>👥 Gestión de Equipo</div>
          <div style={styles.subtitle}>
            {perfiles.length + 1} / {maxPerfiles} perfiles usados
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={perfiles.length >= maxPerfiles - 1}
          style={{
            ...styles.inviteButton,
            ...(perfiles.length >= maxPerfiles - 1 && styles.inviteButtonDisabled)
          }}
        >
          + Invitar
        </button>
      </div>

      <div style={styles.content}>
        {/* Invitaciones Pendientes */}
        {invitaciones.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📧 Invitaciones Pendientes</div>
            {invitaciones.map(inv => (
              <div key={inv.id} style={styles.invitacionCard}>
                <div style={styles.invitacionInfo}>
                  <div style={styles.invitacionEmail}>{inv.email_invitado}</div>
                  <div style={styles.invitacionRol}>{getRolLabel(inv.rol)}</div>
                  <div style={styles.invitacionFecha}>
                    Enviada: {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvitation(inv.id)}
                  style={styles.cancelButton}
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Equipo Actual */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>👥 Equipo Actual</div>
          
          {perfiles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <div style={styles.emptyText}>Aún no has invitado colaboradores</div>
              <button
                onClick={() => setShowInviteModal(true)}
                style={styles.emptyButton}
              >
                Enviar primera invitación
              </button>
            </div>
          ) : (
            perfiles.map(perfil => (
              <div key={perfil.id} style={styles.perfilCard}>
                <div style={styles.perfilHeader}>
                  <div style={styles.perfilInfo}>
                    <div style={styles.perfilNombre}>
                      {perfil.dentista?.nombre} {perfil.dentista?.apellido}
                    </div>
                    <div style={styles.perfilEmail}>{perfil.dentista?.email}</div>
                  </div>
                  <div style={styles.perfilRol}>{getRolLabel(perfil.rol)}</div>
                </div>
                
                <div style={styles.perfilActions}>
                  <label style={styles.switchLabel}>
                    <input
                      type="checkbox"
                      checked={perfil.activo}
                      onChange={(e) => handleToggleActivo(perfil.id, e.target.checked)}
                    />
                    {perfil.activo ? 'Activo' : 'Inactivo'}
                  </label>
                  
                  <button
                    onClick={() => navigate(`/metricas-perfil/${perfil.dentista_id}`)}
                    style={styles.viewMetricsButton}
                  >
                    📊 Ver Métricas
                  </button>
                  
                  <button
                    onClick={() => handleRemovePerfil(perfil.id)}
                    style={styles.removeButton}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botón Ver Dashboard del Equipo */}
        <button
          onClick={() => navigate('/dashboard-equipo')}
          style={styles.teamDashboardButton}
        >
          📊 Ver Dashboard del Equipo Completo
        </button>
      </div>

      {/* Modal de Invitación */}
      {showInviteModal && (
        <div style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📧 Invitar Colaborador</div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              <label style={styles.label}>Email del colaborador *</label>
              <input
                type="email"
                style={styles.input}
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="colaborador@email.com"
              />

              <label style={styles.label}>Rol</label>
              <select
                style={styles.select}
                value={inviteForm.rol}
                onChange={(e) => setInviteForm({ ...inviteForm, rol: e.target.value })}
              >
                <option value="colaborador">👤 Colaborador</option>
                <option value="admin">⭐ Administrador</option>
                <option value="asistente">📋 Asistente</option>
              </select>

              <div style={styles.rolDescription}>
                {inviteForm.rol === 'colaborador' && '• Puede ver, crear y editar pacientes y citas'}
                {inviteForm.rol === 'admin' && '• Control total excepto gestión de equipo'}
                {inviteForm.rol === 'asistente' && '• Solo puede ver información, sin editar'}
              </div>

              <label style={styles.label}>Mensaje personalizado (opcional)</label>
              <textarea
                style={styles.textarea}
                value={inviteForm.mensaje}
                onChange={(e) => setInviteForm({ ...inviteForm, mensaje: e.target.value })}
                placeholder="Ej: ¡Bienvenido al equipo!"
                rows={3}
              />

              <button
                onClick={handleInvite}
                style={styles.submitButton}
              >
                Enviar Invitación
              </button>
            </div>
          </div>
        </div>
      )}

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
  inviteButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inviteButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
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
  upgradeContent: {
    maxWidth: '600px',
    margin: '0 auto',
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
    lineHeight: '1.6',
  },
  featureList: {
    textAlign: 'left',
    fontSize: '16px',
    color: '#1f2937',
    lineHeight: '2',
    marginBottom: '32px',
    listStyle: 'none',
    padding: 0,
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
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  invitacionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '12px',
    border: '1px solid #fbbf24',
  },
  invitacionInfo: {
    flex: 1,
  },
  invitacionEmail: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  invitacionRol: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  invitacionFecha: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  perfilCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  perfilHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  perfilInfo: {
    flex: 1,
  },
  perfilNombre: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },
  perfilEmail: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  perfilRol: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3b82f6',
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
  },
  perfilActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  switchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
  },
  viewMetricsButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  teamDashboardButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  modalContent: {
    padding: '24px',
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
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  rolDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '24px',
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