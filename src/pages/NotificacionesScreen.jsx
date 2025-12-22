import { useNavigate } from 'react-router-dom'
import { useNotificaciones } from '../hooks/useNotificaciones'

export default function NotificacionesScreen() {
  const navigate = useNavigate()
  const { 
    notificaciones, 
    noLeidas, 
    loading, 
    marcarComoLeida, 
    marcarTodasComoLeidas,
    eliminarNotificacion 
  } = useNotificaciones()

  const handleNotificacionClick = async (notificacion) => {
    // Marcar como leída
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id)
    }

    // Navegar a la cita si existe
    if (notificacion.cita_id) {
      navigate(`/cita/${notificacion.cita_id}`)
    }
  }

  const getIconoTipo = (tipo) => {
    const iconos = {
      cita_confirmada: '✅',
      cita_cancelada: '❌',
      cita_reprogramar: '📅',
      mensaje_recibido: '💬'
    }
    return iconos[tipo] || '🔔'
  }

  const getColorTipo = (tipo) => {
    const colores = {
      cita_confirmada: '#10b981',
      cita_cancelada: '#ef4444',
      cita_reprogramar: '#f59e0b',
      mensaje_recibido: '#3b82f6'
    }
    return colores[tipo] || '#6b7280'
  }

  const formatearFecha = (fecha) => {
    const ahora = new Date()
    const notifFecha = new Date(fecha)
    const diffMs = ahora - notifFecha
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias === 1) return 'Ayer'
    if (diffDias < 7) return `Hace ${diffDias} días`
    
    return notifFecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando notificaciones...</div>
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
          <div style={styles.title}>🔔 Notificaciones</div>
          <div style={styles.subtitle}>
            {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al día'}
          </div>
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasComoLeidas}
            style={styles.marcarTodoButton}
          >
            ✓ Marcar todo
          </button>
        )}
      </div>

      <div style={styles.content}>
        {notificaciones.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔔</div>
            <div style={styles.emptyTitle}>No hay notificaciones</div>
            <div style={styles.emptyText}>
              Cuando los pacientes confirmen o cancelen citas vía WhatsApp, verás las notificaciones aquí.
            </div>
          </div>
        ) : (
          <div style={styles.notificacionesList}>
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                style={{
                  ...styles.notificacionCard,
                  ...(notif.leida ? {} : styles.notificacionNoLeida)
                }}
                onClick={() => handleNotificacionClick(notif)}
              >
                <div style={styles.notificacionHeader}>
                  <div style={styles.notificacionIcono}>
                    <div 
                      style={{
                        ...styles.iconoCirculo,
                        backgroundColor: getColorTipo(notif.tipo)
                      }}
                    >
                      {getIconoTipo(notif.tipo)}
                    </div>
                  </div>
                  
                  <div style={styles.notificacionContent}>
                    <div style={styles.notificacionTitulo}>
                      {notif.titulo}
                      {!notif.leida && (
                        <span style={styles.badgeNoLeida}>NUEVO</span>
                      )}
                    </div>
                    <div style={styles.notificacionMensaje}>
                      {notif.mensaje}
                    </div>
                    <div style={styles.notificacionFecha}>
                      {formatearFecha(notif.created_at)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('¿Eliminar esta notificación?')) {
                        eliminarNotificacion(notif.id)
                      }
                    }}
                    style={styles.deleteButton}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
  marcarTodoButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.6',
    maxWidth: '500px',
    margin: '0 auto',
  },
  notificacionesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificacionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  notificacionNoLeida: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  notificacionHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  notificacionIcono: {
    flexShrink: 0,
  },
  iconoCirculo: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  notificacionContent: {
    flex: 1,
  },
  notificacionTitulo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badgeNoLeida: {
    padding: '2px 8px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
  },
  notificacionMensaje: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '8px',
  },
  notificacionFecha: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '20px',
    cursor: 'pointer',
    lineHeight: 1,
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