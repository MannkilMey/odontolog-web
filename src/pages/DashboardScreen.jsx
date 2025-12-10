import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/useSuscripcion'
import CitasProximasPopup from '../components/CitasProximasPopup'
import ModalUpgrade from '../components/ModalUpgrade'

export default function DashboardScreen({ session }) {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    pendientes: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [modalUpgrade, setModalUpgrade] = useState({ isOpen: false, feature: null })
  const navigate = useNavigate()

  // Hook de suscripción
  const { plan, isPremium, isFree, tieneAcceso } = useSuscripcion(user?.id)

  useEffect(() => {
    console.log('Dashboard mounted, loading data...')
    getProfile()
    getStats()
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

        {/* Acciones Principales */}
        <div style={styles.mainActions}>
          <div style={styles.mainActionsTitle}>¿Qué deseas hacer?</div>
          
          <div style={styles.mainActionsGrid}>
            {/* Botones sin restricción */}
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
          
            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/historial-procedimientos')}
            >
              <div style={styles.mainActionIcon}>🦷</div>
              <div style={styles.mainActionTitle}>Historial</div>
              <div style={styles.mainActionSubtitle}>Procedimientos realizados</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/historial-financiero')}
            >
              <div style={styles.mainActionIcon}>💰</div>
              <div style={styles.mainActionTitle}>Historial $</div>
              <div style={styles.mainActionSubtitle}>Ingresos y gastos</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/mensajes-enviados')}
            >
              <div style={styles.mainActionIcon}>📬</div>
              <div style={styles.mainActionTitle}>Mensajes</div>
              <div style={styles.mainActionSubtitle}>Historial de comunicaciones</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/recordatorios')}
            >
              <div style={styles.mainActionIcon}>🔔</div>
              <div style={styles.mainActionTitle}>Recordatorios</div>
              <div style={styles.mainActionSubtitle}>Cuotas automáticas</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/reportes')}
            >
              <div style={styles.mainActionIcon}>📈</div>
              <div style={styles.mainActionTitle}>Reportes</div>
              <div style={styles.mainActionSubtitle}>Ver análisis</div>
            </button>

            <button 
              type="button"
              style={styles.mainActionCard}
              onClick={() => navigate('/metricas')}
            >
              <div style={styles.mainActionIcon}>📊</div>
              <div style={styles.mainActionTitle}>Métricas</div>
              <div style={styles.mainActionSubtitle}>Estadísticas y análisis</div>
            </button>

            {/* BOTONES PREMIUM CON RESTRICCIÓN */}
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

            {/* NUEVO: Botón de Planes */}
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
    marginBottom: '40px',
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