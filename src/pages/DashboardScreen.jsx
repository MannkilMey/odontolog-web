import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/useSuscripcion'
import CitasProximasPopup from '../components/CitasProximasPopup'
import ModalUpgrade from '../components/ModalUpgrade'
import { useActivityTracker } from '../hooks/useActivityTracker'
import { useNotificaciones } from '../hooks/useNotificaciones'

export default function DashboardScreen({ session }) {
  console.log('📊 DashboardScreen montado')
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    pendientes: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [modalUpgrade, setModalUpgrade] = useState({ isOpen: false, feature: null })
  const [planActual, setPlanActual] = useState(null)
  const { noLeidas } = useNotificaciones()
  const navigate = useNavigate()

  // Hook de suscripción
  const { plan, isPremium, isFree, tieneAcceso } = useSuscripcion(user?.id)
  // Tracking de actividad
  useActivityTracker(user?.id)
  
  useEffect(() => {
    console.log('Dashboard mounted, loading data...')
    getProfile()
    getStats()
    checkPlan()
  }, [])

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const getStats = async () => {
    try {
      const { data: pacientes, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id', { count: 'exact' })

      if (pacientesError) {
        console.error('Error fetching pacientes:', pacientesError)
      }

      setStats({
        totalPacientes: pacientes?.length || 0,
        citasHoy: 0,
        pendientes: 0
      })
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios')
        .select('plan:planes_suscripcion(*)')
        .eq('dentista_id', user.id)
        .single()
      
      setPlanActual(suscripcion?.plan)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const refreshData = () => {
    console.log('🔄 Manual refresh triggered')
    setLoading(true)
    getStats()
  }

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      console.log('🔴 LOGOUT CONFIRMED')
      await supabase.auth.signOut()
    }
  }

  // Handler para funciones restringidas
  const handleRestrictedFeature = (feature, route) => {
    if (!tieneAcceso(feature)) {
      setModalUpgrade({ isOpen: true, feature: feature })
      return
    }
    navigate(route)
  }

  const closeModal = () => {
    setModalUpgrade({ isOpen: false, feature: null })
  }

  return (
    <div style={styles.container}>
      <CitasProximasPopup />
      
      {/* Modal de Upgrade */}
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
            Bienvenido, Dr. {user?.email?.split('@')[0]}
            {plan && (
              <span style={{
                ...styles.planBadge,
                ...(isFree ? styles.planBadgeFree : isPremium ? styles.planBadgePremium : {})
              }}>
                {plan.nombre}
              </span>
            )}
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button 
            type="button"
            onClick={refreshData}
            style={{...styles.refreshButton, ...(loading && styles.refreshButtonDisabled)}}
            disabled={loading}
          >
            <span style={styles.refreshText}>{loading ? '↻' : '⟳'}</span>
          </button>
          
          {/* ✅ BOTÓN DE NOTIFICACIONES - SOLO PREMIUM */}
          {isPremium && (
            <button 
              type="button"
              onClick={() => navigate('/notificaciones')}
              style={styles.notificacionesButton}
            >
              🔔
              {noLeidas > 0 && (
                <span style={styles.badgeNotificaciones}>{noLeidas}</span>
              )}
            </button>
          )}

          <button 
            type="button"
            onClick={() => navigate('/configuracion')}
            style={styles.configButton}
          >
            ⚙️
          </button>
          <button 
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalPacientes}</div>
            <div style={styles.statLabel}>Pacientes Totales</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.citasHoy}</div>
            <div style={styles.statLabel}>Citas Hoy</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.pendientes}</div>
            <div style={styles.statLabel}>Pendientes</div>
          </div>
        </div>

        {/* ✅ NUEVO: Banner Premium para usuarios Free */}
        {isFree && (
          <div style={styles.premiumBanner}>
            <div style={styles.premiumBannerContent}>
              <div style={styles.premiumBannerIcon}>⭐</div>
              <div style={styles.premiumBannerText}>
                <div style={styles.premiumBannerTitle}>
                  ¡Potencia tu clínica con Premium!
                </div>
                <div style={styles.premiumBannerDescription}>
                  Automatiza recordatorios por WhatsApp, personaliza mensajes, gestiona reportes y más.
                </div>
              </div>
              <button
                onClick={() => navigate('/planes')}
                style={styles.premiumBannerButton}
              >
                Ver Planes →
              </button>
            </div>
            
            {/* Características destacadas */}
            <div style={styles.premiumFeatures}>
              <div style={styles.premiumFeature}>
                <div style={styles.featureIconSmall}>📱</div>
                <div style={styles.featureText}>WhatsApp automático</div>
              </div>
              <div style={styles.premiumFeature}>
                <div style={styles.featureIconSmall}>🤖</div>
                <div style={styles.featureText}>Recordatorios</div>
              </div>
              <div style={styles.premiumFeature}>
                <div style={styles.featureIconSmall}>📊</div>
                <div style={styles.featureText}>Reportes</div>
              </div>
              <div style={styles.premiumFeature}>
                <div style={styles.featureIconSmall}>📈</div>
                <div style={styles.featureText}>Métricas</div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ MEJORADO: Accesos Rápidos Premium */}
        {planActual && planActual.codigo !== 'free' && (
          <div style={styles.quickAccessSection}>
            <div style={styles.quickAccessHeader}>
              <div style={styles.sectionTitle}>⚡ Funciones Premium Activas</div>
              <div style={styles.planBadgeLarge}>
                {planActual.nombre}
              </div>
            </div>
            <div style={styles.quickAccessGrid}>
              {/* Configuración de Mensajes WhatsApp */}
              <button
                onClick={() => navigate('/configuracion-mensajes')}
                style={styles.quickAccessCard}
              >
                <div style={styles.quickAccessIcon}>📱</div>
                <div style={styles.quickAccessTitle}>Mensajes WhatsApp</div>
                <div style={styles.quickAccessDescription}>
                  Personalizar plantillas
                </div>
              </button>

              {/* Métricas de Mensajería */}
              <button
                onClick={() => navigate('/metricas-mensajeria')}
                style={styles.quickAccessCard}
              >
                <div style={styles.quickAccessIcon}>📊</div>
                <div style={styles.quickAccessTitle}>Métricas WhatsApp</div>
                <div style={styles.quickAccessDescription}>
                  Ver uso de mensajes
                </div>
              </button>

              {/* Gestión de Equipo - Solo Enterprise */}
              {planActual.permite_multi_perfil && (
                <>
                  <button
                    onClick={() => navigate('/gestion-equipo')}
                    style={styles.quickAccessCard}
                  >
                    <div style={styles.quickAccessIcon}>👥</div>
                    <div style={styles.quickAccessTitle}>Gestión de Equipo</div>
                    <div style={styles.quickAccessDescription}>
                      Administrar colaboradores
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard-equipo')}
                    style={styles.quickAccessCard}
                  >
                    <div style={styles.quickAccessIcon}>📈</div>
                    <div style={styles.quickAccessTitle}>Dashboard Equipo</div>
                    <div style={styles.quickAccessDescription}>
                      Métricas consolidadas
                    </div>
                  </button>
                </>
              )}

              {/* Configuración de Notificaciones */}
              <button
                onClick={() => navigate('/configuracion-notificaciones')}
                style={styles.quickAccessCard}
              >
                <div style={styles.quickAccessIcon}>🔔</div>
                <div style={styles.quickAccessTitle}>Notificaciones</div>
                <div style={styles.quickAccessDescription}>
                  Recordatorios automáticos
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Acciones Principales */}
        <div style={styles.mainActions}>
          <div style={styles.mainActionsTitle}>¿Qué deseas hacer?</div>
          
          <div style={styles.mainActionsGrid}>
            {/* ========== BOTONES GRATUITOS ========== */}
            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/clientes')}
            >
              <div style={styles.mainActionIcon}>👥</div>
              <div style={styles.mainActionTitle}>Pacientes</div>
              <div style={styles.mainActionSubtitle}>Ver y gestionar pacientes</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/agregar-paciente')}
            >
              <div style={styles.mainActionIcon}>➕</div>
              <div style={styles.mainActionTitle}>Nuevo Paciente</div>
              <div style={styles.mainActionSubtitle}>Registrar nuevo paciente</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/calendario')}
            >
              <div style={styles.mainActionIcon}>📅</div>
              <div style={styles.mainActionTitle}>Calendario</div>
              <div style={styles.mainActionSubtitle}>Gestionar citas</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/catalogo-procedimientos')}
            >
              <div style={styles.mainActionIcon}>📚</div>
              <div style={styles.mainActionTitle}>Catálogo</div>
              <div style={styles.mainActionSubtitle}>Gestionar procedimientos</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/gastos')}
            >
              <div style={styles.mainActionIcon}>💸</div>
              <div style={styles.mainActionTitle}>Gastos</div>
              <div style={styles.mainActionSubtitle}>Registrar egresos</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/cuentas-por-cobrar')}
            >
              <div style={styles.mainActionIcon}>💳</div>
              <div style={styles.mainActionTitle}>Cuentas por Cobrar</div>
              <div style={styles.mainActionSubtitle}>Control de cobranza</div>
            </button>

            {/* ========== BOTONES PREMIUM ========== */}
            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('historial_procedimientos', '/historial-procedimientos')}
            >
              <div style={styles.mainActionIcon}>🦷</div>
              <div style={styles.mainActionTitle}>
                Historial
                {!tieneAcceso('historial_procedimientos') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Procedimientos realizados</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('historial_financiero', '/historial-financiero')}
            >
              <div style={styles.mainActionIcon}>💰</div>
              <div style={styles.mainActionTitle}>
                Historial $
                {!tieneAcceso('historial_financiero') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Ingresos y gastos</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('mensajes', '/mensajes-enviados')}
            >
              <div style={styles.mainActionIcon}>📬</div>
              <div style={styles.mainActionTitle}>
                Mensajes
                {!tieneAcceso('mensajes') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Historial de comunicaciones</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('recordatorios', '/recordatorios')}
            >
              <div style={styles.mainActionIcon}>🔔</div>
              <div style={styles.mainActionTitle}>
                Recordatorios
                {!tieneAcceso('recordatorios') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Cuotas automáticas</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('reportes', '/reportes')}
            >
              <div style={styles.mainActionIcon}>📈</div>
              <div style={styles.mainActionTitle}>
                Reportes
                {!tieneAcceso('reportes') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Ver análisis</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('metricas', '/metricas')}
            >
              <div style={styles.mainActionIcon}>📊</div>
              <div style={styles.mainActionTitle}>
                Métricas
                {!tieneAcceso('metricas') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Estadísticas y análisis</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('backups', '/backups')}
            >
              <div style={styles.mainActionIcon}>💾</div>
              <div style={styles.mainActionTitle}>
                Backups
                {!tieneAcceso('backups') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Respaldo de datos</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => handleRestrictedFeature('exportar', '/exportar')}
            >
              <div style={styles.mainActionIcon}>📩</div>
              <div style={styles.mainActionTitle}>
                Exportar
                {!tieneAcceso('exportar') && (
                  <span style={styles.premiumBadge}>PRO</span>
                )}
              </div>
              <div style={styles.mainActionSubtitle}>Datos a Excel</div>
            </button>

            {/* BOTÓN DE PLANES */}
            <button 
              type="button"
              style={{...styles.mainActionCard, ...styles.planesCard}}
              onClick={() => navigate('/planes')}
            >
              <div style={styles.mainActionIcon}>⭐</div>
              <div style={styles.mainActionTitle}>Planes</div>
              <div style={styles.mainActionSubtitle}>
                {isFree ? 'Mejora tu plan' : 'Gestionar suscripción'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {lastUpdated && (
          <div style={styles.lastUpdatedText}>
            Última actualización: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
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
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  planBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planBadgeFree: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  planBadgePremium: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  headerButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
  },
  refreshButton: {
    padding: '8px 12px',
    backgroundColor: '#10b981',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificacionesButton: {
    padding: '8px 12px',
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    border: 'none',
    color: '#ffffff',
    fontSize: '18px',
    cursor: 'pointer',
    position: 'relative',
  },
  badgeNotificaciones: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    border: '2px solid #ffffff',
  },
  configButton: {
    padding: '8px 12px',
    backgroundColor: '#6b7280',
    borderRadius: '8px',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    cursor: 'pointer',
  },
  refreshButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  refreshText: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    borderRadius: '8px',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e5e7eb',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  premiumBanner: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  premiumBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  premiumBannerIcon: {
    fontSize: '48px',
  },
  premiumBannerText: {
    flex: 1,
    minWidth: '200px',
  },
  premiumBannerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
  },
  premiumBannerDescription: {
    fontSize: '15px',
    color: '#e0e7ff',
    lineHeight: '1.5',
  },
  premiumBannerButton: {
    padding: '14px 28px',
    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    color: '#5b21b6',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    whiteSpace: 'nowrap',
  },
  premiumFeatures: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  premiumFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
  },
  featureIconSmall: {
    fontSize: '24px',
  },
  featureText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  quickAccessSection: {
    marginBottom: '32px',
  },
  quickAccessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
  },
  planBadgeLarge: {
    padding: '8px 16px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    border: '2px solid #3b82f6',
  },
  quickAccessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  quickAccessCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  quickAccessIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  quickAccessTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },
  quickAccessDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  mainActions: {
    marginTop: '20px',
  },
  mainActionsTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '24px',
  },
  mainActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  mainActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    position: 'relative',
  },
  mainActionIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  mainActionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  mainActionSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  premiumBadge: {
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  planesCard: {
    border: '2px solid #3b82f6',
    backgroundColor: '#eff6ff',
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  lastUpdatedText: {
    fontSize: '10px',
    color: '#9ca3af',
    marginBottom: '4px',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
}