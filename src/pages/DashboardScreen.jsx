import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'
import LimitesMenualesCard from '../components/LimitesMenualesCard'
import CitasProximasPopup from '../components/CitasProximasPopup'
import ModalUpgrade from '../components/ModalUpgrade'
import ToastNotification from '../components/ToastNotification'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'
import { useMoneda } from '../hooks/useMoneda'


// ═══════════════════════════════════════════════════════════
// CAMBIOS EN DASHBOARD:
// 
// 1. ELIMINADO: import useNotificaciones (ahora viene del Context)
// 2. ELIMINADO: shouldInitializeHooks flag (ya no es necesario)
// 3. AHORA: notificaciones, noLeidas, eliminarNotificacion vienen
//    del mismo useSuscripcion() — sin hook separado que se remonte
// 4. getStats usa useCallback para evitar recrearse cada render
// ═══════════════════════════════════════════════════════════

export default function DashboardScreen({ session }) {
  const { t } = useTranslation()
  const { formatMoney } = useMoneda()

  
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    cuentasPendientes: 0,
    ingresosMes: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [modalUpgrade, setModalUpgrade] = useState({ isOpen: false, feature: null })
  
  const navigate = useNavigate()

  // ✅ TODO viene del Context - incluyendo notificaciones
  const { 
    plan, 
    isPremium, 
    isFree, 
    isAdmin,
    userProfile,
    needsOnboarding,
    loading: suscripcionLoading,
    error: suscripcionError,
    // ✅ Notificaciones del Context (FIX B)
    notificaciones,
    noLeidas,
    eliminarNotificacion: eliminarNotificacionContext,
  } = useSuscripcion()
  
  // ✅ VERIFICACIÓN ADMIN - REDIRECT AUTOMÁTICO
  useEffect(() => {
    if (isAdmin && userProfile?.email === 'president@odontolog.lat') {
      navigate('/admin', { replace: true })
    }
  }, [isAdmin, userProfile?.email, navigate])

  // ✅ VERIFICACIÓN ONBOARDING - REDIRECT AUTOMÁTICO
  useEffect(() => {
    if (needsOnboarding && !suscripcionLoading && userProfile?.id) {
      navigate('/onboarding', { replace: true })
    }
  }, [needsOnboarding, suscripcionLoading, userProfile?.id, navigate])

  // ✅ CARGAR STATS - useCallback para estabilidad
  const getStats = useCallback(async () => {
    if (!userProfile?.id) return
    
    try {
      setStatsLoading(true)

      const [pacientesResult, citasResult, pagosResult, ingresosResult] = await Promise.allSettled([
        supabase
          .from('pacientes')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id),
        
        supabase
          .from('citas')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id)
          .eq('fecha_cita', new Date().toISOString().split('T')[0]),
        
        supabase
          .from('pagos_pacientes')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id),
          
        supabase
          .from('ingresos_clinica')
          .select('monto')
          .eq('dentista_id', userProfile.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ])

      setStats({
        totalPacientes: pacientesResult.status === 'fulfilled' ? 
          (pacientesResult.value.count || 0) : 0,
        citasHoy: citasResult.status === 'fulfilled' ? 
          (citasResult.value.count || 0) : 0,
        cuentasPendientes: pagosResult.status === 'fulfilled' ? 
          (pagosResult.value.count || 0) : 0,
        ingresosMes: ingresosResult.status === 'fulfilled' ? 
          (ingresosResult.value.data?.reduce((sum, ing) => sum + (ing.monto || 0), 0) || 0) : 0
      })
      setLastUpdated(new Date())
      
    } catch (error) {
      console.error('❌ Error loading stats:', error)
      setStats({ totalPacientes: 0, citasHoy: 0, cuentasPendientes: 0, ingresosMes: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [userProfile?.id])

  // ✅ CARGAR STATS CUANDO userProfile ESTÁ LISTO
  useEffect(() => {
    if (userProfile?.id && !suscripcionLoading) {
      getStats()
    }
  }, [userProfile?.id, suscripcionLoading, getStats])

  const refreshData = () => {
    if (userProfile?.id) getStats()
  }

  const handleLogout = async () => {
    if (window.confirm(t('auth.logoutConfirm'))) {
      await supabase.auth.signOut()
    }
  }

  const tieneAcceso = (feature) => {
    const accesos = {
      'historial_procedimientos': isPremium,
      'historial_financiero': isPremium,
      'mensajes': isPremium,
      'recordatorios': isPremium,
      'reportes': isPremium,
      'metricas': isPremium,
      'exportar': isPremium,
      'backups': isPremium,
      'notificaciones': isPremium,
      'api_access': plan?.codigo === 'enterprise',
      'multiples_usuarios': plan?.codigo === 'enterprise',
      'gestion_equipo': plan?.codigo === 'enterprise',
      'dashboard_equipo': plan?.codigo === 'enterprise',
      'pacientes': true,
      'calendario': true,
      'gastos': true,
      'cuentas_cobrar': true,
      'catalogo': true,
      'odontograma': true,
      'presupuestos': true,
      'configuracion': true,
      'planes': true,
    }
    return accesos[feature] || false
  }

  const handleRestrictedFeature = (feature, route) => {
    if (!tieneAcceso(feature)) {
      setModalUpgrade({ isOpen: true, feature })
      return
    }
    navigate(route)
  }

  const closeModal = () => setModalUpgrade({ isOpen: false, feature: null })

  // ✅ Wrapper para eliminar notificación (del Context)
  const eliminarNotificacion = async (notificacionId) => {
    try {
      await eliminarNotificacionContext(notificacionId)
    } catch (error) {
      console.error('❌ Error eliminando notificación:', error)
    }
  }

  // ⏳ LOADING SUSCRIPCIÓN
  if (suscripcionLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingTitle}>{t('common.loading')}</div>
        <div style={styles.loadingSubtitle}>{t('dashboard.verifyingSubscription')}</div>
      </div>
    )
  }

  // ❌ ERROR SUSCRIPCIÓN
  if (suscripcionError) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorTitle}>{t('dashboard.subscriptionError')}</div>
        <div style={styles.errorMessage}>{suscripcionError}</div>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          🔄 {t('common.refresh')}
        </button>
      </div>
    )
  }

  // ⏳ LOADING userProfile
  if (!userProfile?.id) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingTitle}>{t('dashboard.loadingProfile')}</div>
        <div style={styles.loadingSubtitle}>{t('dashboard.preparingDashboard')}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <CitasProximasPopup />
      
      <ModalUpgrade 
        isOpen={modalUpgrade.isOpen}
        onClose={closeModal}
        featureName={modalUpgrade.feature}
      />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>🦷 OdontoLog</div>
          <div style={styles.headerSubtitle}>
            {t('dashboard.welcome', { name: userProfile?.nombre || userProfile?.email?.split('@')[0] })}
            {plan && (
              <span style={{
                ...styles.planBadge,
                ...(isFree ? styles.planBadgeFree : isPremium ? styles.planBadgePremium : {})
              }}>
                {plan.nombre}
              </span>
            )}
          </div>
          {userProfile?.clinica && (
            <div style={styles.clinicaName}>📍 {userProfile.clinica}</div>
          )}
        </div>
        <div style={styles.headerButtons}>
          <button 
            type="button"
            onClick={refreshData}
            style={{...styles.refreshButton, ...(statsLoading && styles.refreshButtonDisabled)}}
            disabled={statsLoading}
            title="Actualizar datos"
          >
            <span style={styles.refreshText}>{statsLoading ? '↻' : '⟳'}</span>
          </button>
          
          {isPremium && (
            <button 
              type="button"
              onClick={() => navigate('/notificaciones')}
              style={{
                ...styles.notificacionesButton,
                ...(noLeidas > 0 && styles.notificacionesButtonWithBadge)
              }}
              title={`${noLeidas || 0} notificaciones no leídas`}
            >
              🔔
              {noLeidas > 0 && (
                <span style={styles.badgeNotificaciones}>
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </button>
          )}
          
           <LanguageSelector compact showCurrency />

          <button 
            type="button"
            onClick={() => navigate('/configuracion')}
            style={styles.configButton}
            title="Configuración"
          >
            ⚙️
          </button>
          <button 
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
          {t('auth.logout')}
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {isPremium && plan && (
          <LimitesMenualesCard userProfile={userProfile} plan={plan} />
        )}

        {/* ✅ Notificaciones ahora vienen del Context */}
        {isPremium && notificaciones && notificaciones.length > 0 && (
          <div style={styles.notificacionesCard}>
            <div style={styles.notificacionesCardHeader}>
              <div style={styles.notificacionesCardTitle}>
                🔔 {t('notifications.title')}
                {noLeidas > 0 && (
                  <span style={styles.notificacionesBadge}>{noLeidas}</span>
                )}
              </div>
              <button
                onClick={() => navigate('/notificaciones')}
                style={styles.verTodasButton}
              >
                {t('common.viewMore')} →
              </button>
            </div>
            <div style={styles.notificacionesCardContent}>
              {notificaciones.slice(0, 3).map((notif) => (
                <div key={notif.id} style={styles.notificacionItem}>
                  <div style={styles.notificacionTexto}>
                    <div style={styles.notificacionMensaje}>{notif.mensaje}</div>
                    <div style={styles.notificacionFecha}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarNotificacion(notif.id)}
                    style={styles.eliminarButton}
                    title="Eliminar notificación"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statNumber}>{statsLoading ? '...' : stats.totalPacientes}</div>
            <div style={styles.statLabel}>{t('dashboard.totalPatients')}</div>
            <button style={styles.statButton} onClick={() => navigate('/clientes')} disabled={statsLoading}>{t('common.viewMore')}</button>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📅</div>
            <div style={styles.statNumber}>{statsLoading ? '...' : stats.citasHoy}</div>
            <div style={styles.statLabel}>{t('dashboard.todayAppointments')}</div>
            <button style={styles.statButton} onClick={() => navigate('/calendario')} disabled={statsLoading}>{t('dashboard.viewCalendar')}</button>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💳</div>
            <div style={styles.statNumber}>{statsLoading ? '...' : stats.cuentasPendientes}</div>
            <div style={styles.statLabel}>{t('billing.payments')}</div>
            <button style={styles.statButton} onClick={() => navigate('/cuentas-por-cobrar')} disabled={statsLoading}>{t('common.viewMore')}</button>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💵</div>
            <div style={styles.statNumber}>{statsLoading ? '...' : formatMoney(stats.ingresosMes)}</div>
            <div style={styles.statLabel}>{t('dashboard.monthlyRevenue')}</div>
            <button style={styles.statButton} onClick={() => handleRestrictedFeature('reportes', '/reportes')} disabled={statsLoading}>{t('common.viewMore')}</button>
          </div>
        </div>

        {/* Banner Premium */}
        {isFree && (
          <div style={styles.premiumBanner}>
            <div style={styles.premiumBannerContent}>
              <div style={styles.premiumBannerIcon}>⭐</div>
              <div style={styles.premiumBannerText}>
                <div style={styles.premiumBannerTitle}>{t('dashboard.upgradeBannerTitle')}</div>
                <div style={styles.premiumBannerDescription}>
                  {t('dashboard.upgradeBannerDesc')}
                </div>
              </div>
              <button onClick={() => navigate('/planes')} style={styles.premiumBannerButton}>
                {t('dashboard.upgradeNow')} →
              </button>
            </div>
            <div style={styles.premiumFeatures}>
              <div style={styles.premiumFeature}><div style={styles.featureIconSmall}>📊</div><div style={styles.featureText}>{t('dashboard.reports')}</div></div>
              <div style={styles.premiumFeature}><div style={styles.featureIconSmall}>🔔</div><div style={styles.featureText}>{t('notifications.title')}</div></div>
              <div style={styles.premiumFeature}><div style={styles.featureIconSmall}>📈</div><div style={styles.featureText}>{t('dashboard.metrics')}</div></div>
              <div style={styles.premiumFeature}><div style={styles.featureIconSmall}>💾</div><div style={styles.featureText}>{t('dashboard.backups')}</div></div>
            </div>
          </div>
        )}

        {/* Accesos Rápidos Premium */}
        {plan && plan.codigo !== 'free' && (
          <div style={styles.quickAccessSection}>
            <div style={styles.quickAccessHeader}>
              <div style={styles.sectionTitle}>⚡ {t('dashboard.quickAccessPremium')}</div>
              <div style={styles.planBadgeLarge}>{plan.nombre}</div>
            </div>
            <div style={styles.quickAccessGrid}>
              <button onClick={() => navigate('/notificaciones')} style={styles.quickAccessCard}>
                <div style={styles.quickAccessIcon}>🔔</div>
                <div style={styles.quickAccessTitle}>{t('notifications.title')}</div>
                <div style={styles.quickAccessDescription}>{t('dashboard.notificationCenter')}</div>
              </button>
              <button onClick={() => navigate('/configuracion-notificaciones')} style={styles.quickAccessCard}>
                <div style={styles.quickAccessIcon}>⚙️</div>
                <div style={styles.quickAccessTitle}>{t('dashboard.notificationConfig')}</div>
                <div style={styles.quickAccessDescription}>{t('dashboard.autoReminders')}</div>
              </button>
              {plan?.codigo === 'enterprise' && (
                <>
                  <button onClick={() => navigate('/gestion-equipo')} style={styles.quickAccessCard}>
                    <div style={styles.quickAccessIcon}>👥</div>
                    <div style={styles.quickAccessTitle}>{t('dashboard.teamManagement')}</div>
                    <div style={styles.quickAccessDescription}>{t('dashboard.manageCollaborators')}</div>
                  </button>
                  <button onClick={() => navigate('/dashboard-equipo')} style={styles.quickAccessCard}>
                    <div style={styles.quickAccessIcon}>📈</div>
                    <div style={styles.quickAccessTitle}>{t('dashboard.teamDashboard')}</div>
                    <div style={styles.quickAccessDescription}>{t('dashboard.consolidatedMetrics')}</div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Acciones Principales */}
        <div style={styles.mainActions}>
          <div style={styles.mainActionsTitle}>{t('dashboard.quickActions')}</div>
          <div style={styles.mainActionsGrid}>
            {/* FUNCIONES GRATUITAS */}
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/clientes')}>
              <div style={styles.mainActionIcon}>👥</div>
              <div style={styles.mainActionTitle}>{t('dashboard.managePatients')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.managePatientsDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/agregar-paciente')}>
              <div style={styles.mainActionIcon}>➕</div>
              <div style={styles.mainActionTitle}>{t('dashboard.newPatient')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.newPatientDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/calendario')}>
              <div style={styles.mainActionIcon}>📅</div>
              <div style={styles.mainActionTitle}>{t('appointments.title')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.calendarDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/catalogo-procedimientos')}>
              <div style={styles.mainActionIcon}>📚</div>
              <div style={styles.mainActionTitle}>{t('dashboard.procedures')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.proceduresDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/gastos')}>
              <div style={styles.mainActionIcon}>💸</div>
              <div style={styles.mainActionTitle}>{t('dashboard.expenses')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.expensesDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/cuentas-por-cobrar')}>
              <div style={styles.mainActionIcon}>💳</div>
             <div style={styles.mainActionTitle}>{t('dashboard.receivables')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.receivablesDesc')}</div>
            </button>

            {/* FUNCIONES PREMIUM */}
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('historial_procedimientos', '/historial-procedimientos')}>
              <div style={styles.mainActionIcon}>🦷</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.clinicalHistory')}
                {!tieneAcceso('historial_procedimientos') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.clinicalHistoryDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('historial_financiero', '/historial-financiero')}>
              <div style={styles.mainActionIcon}>💰</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.financialHistory')}
                {!tieneAcceso('historial_financiero') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.financialHistoryDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('mensajes', '/mensajes-enviados')}>
              <div style={styles.mainActionIcon}>📬</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.messagesReminders')}
                {!tieneAcceso('mensajes') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.messagesDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('recordatorios', '/recordatorios')}>
              <div style={styles.mainActionIcon}>🔔</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.autoRemindersTitle')}
                {!tieneAcceso('recordatorios') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.autoRemindersDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('reportes', '/reportes')}>
              <div style={styles.mainActionIcon}>📈</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.reportsAnalysis')}
                {!tieneAcceso('reportes') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.reportsDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('metricas', '/metricas')}>
              <div style={styles.mainActionIcon}>📊</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.advancedMetrics')}
                {!tieneAcceso('metricas') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.metricsDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('backups', '/backups')}>
              <div style={styles.mainActionIcon}>💾</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.backupsExport')}
                {!tieneAcceso('backups') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.backupsDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => handleRestrictedFeature('exportar', '/exportar')}>
              <div style={styles.mainActionIcon}>📤</div>
              <div style={styles.mainActionTitle}>
                {t('dashboard.exportData')}
                {!tieneAcceso('exportar') && <span style={styles.premiumBadge}>PRO</span>}
              </div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.exportDesc')}</div>
            </button>

            {/* FUNCIONES ADICIONALES */}
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/planes-pago')}>
              <div style={styles.mainActionIcon}>💳</div>
              <div style={styles.mainActionTitle}>{t('dashboard.paymentPlans')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.paymentPlansDesc')}</div>
            </button>
            <button type="button" style={styles.mainActionCard} onClick={() => navigate('/historial-pagos')}>
              <div style={styles.mainActionIcon}>💰</div>
              <div style={styles.mainActionTitle}>{t('dashboard.paymentHistory')}</div>
              <div style={styles.mainActionSubtitle}>{t('dashboard.paymentHistoryDesc')}</div>
            </button>
            <button type="button" style={{...styles.mainActionCard, ...styles.planesCard}} onClick={() => navigate('/planes')}>
              <div style={styles.mainActionIcon}>⭐</div>
              <div style={styles.mainActionTitle}>
                {isPremium ?  t('dashboard.managePlan') : t('dashboard.upgradePremium')}
              </div>
              <div style={styles.mainActionSubtitle}>
                {isPremium ? `Plan ${plan?.nombre} - $${plan?.precio_mensual_usd}/${t('common.month')}` : t('dashboard.unlockAll')}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          OdontoLog - {t('dashboard.footerCloud')} | Plan {plan?.nombre || 'Cargando...'}
        </div>
        <div style={styles.footerVersion}> {t('common.poweredBy')}</div>
      </div>
      
      <ToastNotification />
    </div>
  )
}

// ✅ ESTILOS (sin cambios)
const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: '16px' },
  loadingSpinner: { fontSize: '48px', animation: 'rotate 2s linear infinite' },
  loadingTitle: { fontSize: '20px', fontWeight: '700', color: '#3b82f6' },
  loadingSubtitle: { fontSize: '14px', color: '#6b7280' },
  errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: '16px' },
  errorIcon: { fontSize: '64px' },
  errorTitle: { fontSize: '24px', fontWeight: '700', color: '#ef4444' },
  errorMessage: { fontSize: '16px', color: '#6b7280', textAlign: 'center', maxWidth: '400px' },
  retryButton: { padding: '12px 24px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  header: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  headerTitle: { fontSize: '28px', fontWeight: 'bold', color: '#1e40af' },
  headerSubtitle: { fontSize: '14px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' },
  clinicaName: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  planBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  planBadgeFree: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  planBadgePremium: { backgroundColor: '#dbeafe', color: '#1e40af' },
  headerButtons: { display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' },
  refreshButton: { padding: '8px 12px', backgroundColor: '#10b981', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  notificacionesButton: { padding: '8px 12px', backgroundColor: '#3b82f6', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '18px', cursor: 'pointer', position: 'relative' },
  notificacionesButtonWithBadge: { backgroundColor: '#3b82f6' },
  badgeNotificaciones: { position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ffffff', color: '#ef4444', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', border: '2px solid #ef4444' },
  configButton: { padding: '8px 12px', backgroundColor: '#6b7280', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' },
  refreshButtonDisabled: { backgroundColor: '#94a3b8', cursor: 'not-allowed' },
  refreshText: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' },
  logoutButton: { padding: '8px 16px', backgroundColor: '#ef4444', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  content: { flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' },
  notificacionesCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '2px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
  notificacionesCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  notificacionesCardTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' },
  notificacionesBadge: { padding: '4px 8px', backgroundColor: '#ef4444', color: '#ffffff', borderRadius: '50%', fontSize: '12px', fontWeight: '700', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  verTodasButton: { padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  notificacionesCardContent: { display: 'flex', flexDirection: 'column', gap: '12px' },
  notificacionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  notificacionTexto: { flex: 1 },
  notificacionMensaje: { fontSize: '14px', color: '#374151', marginBottom: '4px' },
  notificacionFecha: { fontSize: '11px', color: '#9ca3af' },
  eliminarButton: { padding: '4px 8px', backgroundColor: '#fecaca', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginLeft: '12px' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  statCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', border: '2px solid #e5e7eb' },
  statIcon: { fontSize: '32px', marginBottom: '12px' },
  statNumber: { fontSize: '36px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' },
  statLabel: { fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '12px' },
  statButton: { padding: '6px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  premiumBanner: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)' },
  premiumBannerContent: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
  premiumBannerIcon: { fontSize: '48px' },
  premiumBannerText: { flex: 1, minWidth: '200px' },
  premiumBannerTitle: { fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' },
  premiumBannerDescription: { fontSize: '15px', color: '#e0e7ff', lineHeight: '1.5' },
  premiumBannerButton: { padding: '14px 28px', backgroundColor: '#ffffff', border: 'none', borderRadius: '10px', color: '#5b21b6', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap' },
  premiumFeatures: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' },
  premiumFeature: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' },
  featureIconSmall: { fontSize: '20px' },
  featureText: { fontSize: '13px', fontWeight: '600', color: '#ffffff' },
  quickAccessSection: { marginBottom: '32px' },
  quickAccessHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#1f2937' },
  planBadgeLarge: { padding: '8px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '8px', fontSize: '14px', fontWeight: '700', border: '2px solid #3b82f6' },
  quickAccessGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  quickAccessCard: { padding: '20px', backgroundColor: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
  quickAccessIcon: { fontSize: '32px', marginBottom: '12px' },
  quickAccessTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' },
  quickAccessDescription: { fontSize: '13px', color: '#6b7280' },
  mainActions: { marginTop: '20px' },
  mainActionsTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' },
  mainActionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' },
  mainActionCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '2px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', position: 'relative' },
  mainActionIcon: { fontSize: '48px', marginBottom: '16px' },
  mainActionTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  mainActionSubtitle: { fontSize: '13px', color: '#6b7280', lineHeight: '1.4' },
  premiumBadge: { padding: '3px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  planesCard: { border: '2px solid #3b82f6', backgroundColor: '#eff6ff' },
  footer: { textAlign: 'center', padding: '24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' },
  lastUpdatedText: { fontSize: '10px', color: '#9ca3af', marginBottom: '4px' },
  footerText: { fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' },
  footerVersion: { fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' },
}