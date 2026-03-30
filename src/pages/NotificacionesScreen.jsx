import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuscripcion } from '../hooks/SuscripcionContext'

export default function NotificacionesScreen() {
  const navigate = useNavigate()
  
  const { 
    userProfile, 
    isPremium, 
    loading: suscripcionLoading,
    notificaciones,
    noLeidas,
    notifLoading,
    notifError,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refreshNotificaciones,
  } = useSuscripcion()

  const handleNotificacionClick = async (notificacion) => {
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id)
    }
    if (notificacion.cita_id) {
      navigate(`/cita/${notificacion.cita_id}`)
    }
  }

  // ✅ Solo marca como leída en BD — no borra nada
  // El contador noLeidas se actualiza automáticamente en el Context
  const eliminarNotificacion = async (notificacionId) => {
    await marcarComoLeida(notificacionId)
  }

  const getIconoTipo = (tipo) => {
    const iconos = {
      cita_confirmada: '✅',
      cita_cancelada: '❌',
      cita_reprogramar: '📅',
      cita_recordatorio: '⏰',
      mensaje_recibido: '💬',
      pago_recibido: '💰',
      pago_vencido: '⚠️'
    }
    return iconos[tipo] || '🔔'
  }

  const getColorTipo = (tipo) => {
    const colores = {
      cita_confirmada: '#10b981',
      cita_cancelada: '#ef4444',
      cita_reprogramar: '#f59e0b',
      cita_recordatorio: '#3b82f6',
      mensaje_recibido: '#8b5cf6',
      pago_recibido: '#10b981',
      pago_vencido: '#ef4444'
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

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias === 1) return 'Ayer'
    if (diffDias < 7) return `Hace ${diffDias} días`
    
    return notifFecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (suscripcionLoading || notifLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingText}>Cargando notificaciones...</div>
      </div>
    )
  }

  if (!userProfile?.id) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorTitle}>Error: Usuario no encontrado</div>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Volver al Dashboard
        </button>
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Volver</button>
          <div style={styles.headerInfo}>
            <div style={styles.title}>🔔 Notificaciones</div>
            <div style={styles.subtitle}>Funcionalidad Premium</div>
          </div>
        </div>
        <div style={styles.premiumRequired}>
          <div style={styles.premiumIcon}>⭐</div>
          <div style={styles.premiumTitle}>Actualiza a Premium</div>
          <div style={styles.premiumText}>
            Las notificaciones automáticas son una funcionalidad exclusiva para usuarios Premium.
            Actualiza tu plan para recibir alertas de citas, mensajes y recordatorios.
          </div>
          <button onClick={() => navigate('/planes')} style={styles.upgradeButton}>
            Ver Planes Premium
          </button>
        </div>
      </div>
    )
  }

  if (notifError) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Volver</button>
          <div style={styles.headerInfo}>
            <div style={styles.title}>🔔 Notificaciones</div>
            <div style={styles.subtitle}>Error de conexión</div>
          </div>
        </div>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorTitle}>Error cargando notificaciones</div>
          <div style={styles.errorText}>{notifError}</div>
          <button onClick={refreshNotificaciones} style={styles.retryButton}>🔄 Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Volver</button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>🔔 Notificaciones</div>
          <div style={styles.subtitle}>
            {noLeidas > 0 
              ? `${noLeidas} sin leer de ${notificaciones.length} total` 
              : `${notificaciones.length} notificaciones - Todo al día`}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={refreshNotificaciones} style={styles.refreshButton} title="Actualizar">🔄</button>
          {noLeidas > 0 && (
            <button onClick={marcarTodasComoLeidas} style={styles.marcarTodoButton} title="Marcar todas como leídas">
              ✓ Marcar todo
            </button>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {notificaciones.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔔</div>
            <div style={styles.emptyTitle}>No hay notificaciones</div>
            <div style={styles.emptyText}>
              Cuando los pacientes confirmen o cancelen citas, recibas mensajes o se venzan pagos, 
              verás las notificaciones aquí.
            </div>
            <div style={styles.emptyActions}>
              <button onClick={() => navigate('/configuracion-notificaciones')} style={styles.configButton}>
                ⚙️ Configurar Notificaciones
              </button>
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
                    <div style={{ ...styles.iconoCirculo, backgroundColor: getColorTipo(notif.tipo) }}>
                      {getIconoTipo(notif.tipo)}
                    </div>
                  </div>
                  
                  <div style={styles.notificacionContent}>
                    <div style={styles.notificacionTitulo}>
                      {notif.titulo}
                      {!notif.leida && <span style={styles.badgeNoLeida}>NUEVO</span>}
                    </div>
                    <div style={styles.notificacionMensaje}>{notif.mensaje}</div>
                    <div style={styles.notificacionMeta}>
                      <span style={styles.notificacionFecha}>{formatearFecha(notif.created_at)}</span>
                      {notif.paciente_nombre && (
                        <span style={styles.pacienteName}>👤 {notif.paciente_nombre}</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.notificacionActions}>
                    {!notif.leida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); marcarComoLeida(notif.id) }}
                        style={styles.markReadButton}
                        title="Marcar como leída"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarNotificacion(notif.id) }}
                      style={styles.deleteButton}
                      title="Marcar como leída"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {notif.metadata && (
                  <div style={styles.notificacionMetadata}>
                    {Object.entries(notif.metadata).map(([key, value]) => (
                      <span key={key} style={styles.metadataItem}>{key}: {value}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerInfo}>Premium activo • {notificaciones.length} notificaciones cargadas</div>
        <div style={styles.footerText}>OdontoLog • Diseñado por MCorp</div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: '#f8fafc' },
  loadingSpinner: { fontSize: '48px', animation: 'rotate 2s linear infinite' },
  loadingText: { fontSize: '16px', color: '#6b7280', fontWeight: '500' },
  errorIcon: { fontSize: '64px' },
  errorTitle: { fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' },
  errorContainer: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px' },
  errorText: { fontSize: '14px', color: '#6b7280', textAlign: 'center', maxWidth: '400px' },
  retryButton: { padding: '12px 24px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  premiumRequired: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px' },
  premiumIcon: { fontSize: '80px' },
  premiumTitle: { fontSize: '28px', fontWeight: '700', color: '#1f2937' },
  premiumText: { fontSize: '16px', color: '#6b7280', textAlign: 'center', maxWidth: '500px', lineHeight: '1.6' },
  upgradeButton: { padding: '16px 32px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' },
  header: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  backButton: { padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '16px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px' },
  headerInfo: { flex: 1, textAlign: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e40af' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  headerActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  refreshButton: { padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontSize: '16px', cursor: 'pointer' },
  marcarTodoButton: { padding: '8px 16px', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  content: { flex: 1, padding: '24px', maxWidth: '900px', width: '100%', margin: '0 auto', overflowY: 'auto' },
  emptyState: { textAlign: 'center', padding: '80px 20px' },
  emptyIcon: { fontSize: '80px', marginBottom: '24px' },
  emptyTitle: { fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  emptyText: { fontSize: '16px', color: '#6b7280', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 32px' },
  emptyActions: { display: 'flex', justifyContent: 'center', gap: '16px' },
  configButton: { padding: '12px 24px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  notificacionesList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  notificacionCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
  notificacionNoLeida: { backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: '2px', boxShadow: '0 4px 8px rgba(59, 130, 246, 0.15)' },
  notificacionHeader: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  notificacionIcono: { flexShrink: 0 },
  iconoCirculo: { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ffffff', fontWeight: 'bold' },
  notificacionContent: { flex: 1, minWidth: 0 },
  notificacionTitulo: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  badgeNoLeida: { padding: '2px 8px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' },
  notificacionMensaje: { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: '12px' },
  notificacionMeta: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' },
  notificacionFecha: { fontSize: '13px', color: '#9ca3af' },
  pacienteName: { fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' },
  notificacionActions: { display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 },
  markReadButton: { padding: '6px 10px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' },
  deleteButton: { padding: '6px 10px', backgroundColor: 'transparent', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#9ca3af', fontSize: '16px', cursor: 'pointer', lineHeight: 1 },
  notificacionMetadata: { marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' },
  metadataItem: { fontSize: '11px', color: '#6b7280', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' },
  footer: { textAlign: 'center', padding: '20px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerInfo: { fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '4px' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}