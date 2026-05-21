import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSuscripcion } from '../hooks/SuscripcionContext'

export default function NotificacionesScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  
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

  const eliminarNotificacion = async (notificacionId) => {
    await marcarComoLeida(notificacionId)
  }

  const getIconoTipo = (tipo) => {
    const iconos = {
      cita_confirmada:   '✅',
      cita_cancelada:    '❌',
      cita_reprogramar:  '📅',
      cita_recordatorio: '⏰',
      mensaje_recibido:  '💬',
      pago_recibido:     '💰',
      pago_vencido:      '⚠️'
    }
    return iconos[tipo] || '🔔'
  }

  const getColorTipo = (tipo) => {
    const colores = {
      cita_confirmada:   '#10b981',
      cita_cancelada:    '#ef4444',
      cita_reprogramar:  '#f59e0b',
      cita_recordatorio: '#3b82f6',
      mensaje_recibido:  '#8b5cf6',
      pago_recibido:     '#10b981',
      pago_vencido:      '#ef4444'
    }
    return colores[tipo] || '#6b7280'
  }

  // ✅ Traducir título según tipo
  const getTituloTraducido = (notif) => {
    const claves = {
      cita_confirmada:   'notificaciones.tipoCitaConfirmada',
      cita_cancelada:    'notificaciones.tipoCitaCancelada',
      cita_reprogramar:  'notificaciones.tipoCitaReprogramar',
      cita_recordatorio: 'notificaciones.tipoCitaRecordatorio',
      mensaje_recibido:  'notificaciones.tipoMensajeRecibido',
      pago_recibido:     'notificaciones.tipoPagoRecibido',
      pago_vencido:      'notificaciones.tipoPagoVencido',
    }
    return claves[notif.tipo] ? t(claves[notif.tipo]) : notif.titulo
  }

  // ✅ Traducir mensaje según tipo
  const getMensajeTraducido = (notif) => {
    const claves = {
      cita_confirmada:   'notificaciones.msgCitaConfirmada',
      cita_cancelada:    'notificaciones.msgCitaCancelada',
      cita_reprogramar:  'notificaciones.msgCitaReprogramar',
      cita_recordatorio: 'notificaciones.msgCitaRecordatorio',
      mensaje_recibido:  'notificaciones.msgMensajeRecibido',
      pago_recibido:     'notificaciones.msgPagoRecibido',
      pago_vencido:      'notificaciones.msgPagoVencido',
    }
    return claves[notif.tipo] ? t(claves[notif.tipo]) : notif.mensaje
  }

  const formatearFecha = (fecha) => {
    const ahora = new Date()
    const notifFecha = new Date(fecha)
    const diffMs = ahora - notifFecha
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMins < 1)  return t('notificaciones.timeJustNow')
    if (diffMins < 60) return t('notificaciones.timeMinutes', { count: diffMins })
    if (diffHoras < 24) return t('notificaciones.timeHours', { count: diffHoras })
    if (diffDias === 1) return t('common.yesterday')
    if (diffDias < 7)  return t('notificaciones.timeDays', { count: diffDias })

    return notifFecha.toLocaleDateString(i18n.language, {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (suscripcionLoading || notifLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingText}>{t('notificaciones.loading')}</div>
      </div>
    )
  }

  // ─── Sin usuario ───────────────────────────────────────────────────────────
  if (!userProfile?.id) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorTitle}>{t('notificaciones.userNotFound')}</div>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          {t('notificaciones.backToDashboard')}
        </button>
      </div>
    )
  }

  // ─── Sin premium ──────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            {t('common.back')}
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.title}>{t('notificaciones.title')}</div>
            <div style={styles.subtitle}>{t('notifications.premiumRequired')}</div>
          </div>
          <div style={{ width: '80px' }} />
        </div>
        <div style={styles.premiumRequired}>
          <div style={styles.premiumIcon}>⭐</div>
          <div style={styles.premiumTitle}>{t('notificaciones.premiumTitle')}</div>
          <div style={styles.premiumText}>{t('notificaciones.premiumText')}</div>
          <button onClick={() => navigate('/planes')} style={styles.upgradeButton}>
            {t('notificaciones.viewPlans')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (notifError) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            {t('common.back')}
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.title}>{t('notificaciones.title')}</div>
            <div style={styles.subtitle}>{t('errors.networkError')}</div>
          </div>
          <div style={{ width: '80px' }} />
        </div>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorTitle}>
            {t('errors.loadError', { item: t('nav.notifications') })}
          </div>
          <div style={styles.errorText}>{notifError}</div>
          <button onClick={refreshNotificaciones} style={styles.retryButton}>
            🔄 {t('notificaciones.retry')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('notificaciones.title')}</div>
          <div style={styles.subtitle}>
            {noLeidas > 0
              ? t('notificaciones.subtitleUnread', { unread: noLeidas, total: notificaciones.length })
              : t('notificaciones.subtitleAllRead', { total: notificaciones.length })}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={refreshNotificaciones}
            style={styles.refreshButton}
            title={t('common.refresh')}
          >
            🔄
          </button>
          {noLeidas > 0 && (
            <button
              onClick={marcarTodasComoLeidas}
              style={styles.marcarTodoButton}
              title={t('notifications.markAllRead')}
            >
              ✓ {t('notificaciones.markAll')}
            </button>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {notificaciones.length === 0 ? (
          /* Empty state */
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔔</div>
            <div style={styles.emptyTitle}>{t('notifications.noNotifications')}</div>
            <div style={styles.emptyText}>{t('notificaciones.emptyText')}</div>
            <div style={styles.emptyActions}>
              <button
                onClick={() => navigate('/configuracion-notificaciones')}
                style={styles.configButton}
              >
                ⚙️ {t('notificaciones.configNotifications')}
              </button>
            </div>
          </div>
        ) : (
          /* Lista */
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
                  {/* Ícono */}
                  <div style={styles.notificacionIcono}>
                    <div style={{
                      ...styles.iconoCirculo,
                      backgroundColor: getColorTipo(notif.tipo)
                    }}>
                      {getIconoTipo(notif.tipo)}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={styles.notificacionContent}>
                    <div style={styles.notificacionTitulo}>
                      {getTituloTraducido(notif)}
                      {!notif.leida && (
                        <span style={styles.badgeNoLeida}>
                          {t('common.new').toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* ✅ Mensaje traducido */}
                    <div style={styles.notificacionMensaje}>
                      {getMensajeTraducido(notif)}
                    </div>
                    <div style={styles.notificacionMeta}>
                      <span style={styles.notificacionFecha}>
                        {formatearFecha(notif.created_at)}
                      </span>
                      {notif.paciente_nombre && (
                        <span style={styles.pacienteName}>
                          👤 {notif.paciente_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={styles.notificacionActions}>
                    {!notif.leida && (
                      <button
                        onClick={e => { e.stopPropagation(); marcarComoLeida(notif.id) }}
                        style={styles.markReadButton}
                        title={t('notificaciones.markRead')}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); eliminarNotificacion(notif.id) }}
                      style={styles.deleteButton}
                      title={t('notificaciones.markRead')}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                {notif.metadata && (
                  <div style={styles.notificacionMetadata}>
                    {Object.entries(notif.metadata).map(([key, value]) => (
                      <span key={key} style={styles.metadataItem}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerInfo}>
          {t('notificaciones.footerInfo', { count: notificaciones.length })}
        </div>
        <div style={styles.footerText}>
          {t('common.footerBrand')} • {t('common.poweredBy')}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: '#f8fafc' },
  loadingSpinner: { fontSize: '48px' },
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
  header: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
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
  notificacionCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  notificacionNoLeida: { backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: '2px', boxShadow: '0 4px 8px rgba(59,130,246,0.15)' },
  notificacionHeader: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  notificacionIcono: { flexShrink: 0 },
  iconoCirculo: { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ffffff', fontWeight: 'bold' },
  notificacionContent: { flex: 1, minWidth: 0 },
  notificacionTitulo: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  badgeNoLeida: { padding: '2px 8px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '4px', fontSize: '10px', fontWeight: '700' },
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