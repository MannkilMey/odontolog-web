import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DashboardEquipoScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [metricas, setMetricas] = useState([])
  const [periodo, setPeriodo] = useState('mes_actual')

  useEffect(() => {
    loadData()
  }, [periodo])

  // Reemplazar la función loadData completa:
  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Verificar plan
      const { data: suscripcion, error: subError } = await supabase
        .from('suscripciones_usuarios')
        .select('plan:planes_suscripcion(permite_multi_perfil)')
        .eq('dentista_id', user.id)
        .single()

      // ✅ MANEJAR ERRORES
      if (subError) {
        console.error('Error al cargar suscripción:', subError)
        setIsEnterprise(false)
        setLoading(false)
        return
      }

      // ✅ VERIFICAR QUE EXISTA PLAN
      if (!suscripcion || !suscripcion.plan) {
        console.error('No se encontró plan de suscripción')
        setIsEnterprise(false)
        setLoading(false)
        return
      }

      if (!suscripcion.plan.permite_multi_perfil) {
        setIsEnterprise(false)
        setLoading(false)
        return
      }

      setIsEnterprise(true)

      // Cargar métricas de todos los perfiles
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles_clinica')
        .select(`
          *,
          dentista:dentistas(id, nombre, apellido, email)
        `)
        .eq('clinica_owner_id', user.id)
        .eq('activo', true)

      if (perfilesError) {
        console.error('Error al cargar perfiles:', perfilesError)
        // Continuar solo con el owner
      }

      // Cargar métricas para cada perfil + el owner
      const dentistas = [
        { dentista_id: user.id, nombre: 'Yo', isOwner: true },
        ...(perfilesData || []).map(p => ({
          dentista_id: p.dentista.id,
          nombre: `${p.dentista.nombre} ${p.dentista.apellido}`,
          rol: p.rol,
          isOwner: false
        }))
      ]

      const metricasPromises = dentistas.map(async (d) => {
        const { data: metrica, error: metricaError } = await supabase
          .from('metricas_por_perfil')
          .select('*')
          .eq('dentista_id', d.dentista_id)
          .single()

        if (metricaError) {
          console.error(`Error al cargar métrica para ${d.nombre}:`, metricaError)
          // Devolver datos por defecto
          return {
            ...d,
            total_pacientes: 0,
            ingresos_mes_actual: 0,
            gastos_mes_actual: 0,
            ingresos_totales: 0,
            gastos_totales: 0,
            balance_total: 0,
            citas_mes_actual: 0,
            procedimientos_mes_actual: 0,
            balance_mes: 0
          }
        }

        return {
          ...d,
          ...metrica,
          balance_mes: (metrica?.ingresos_mes_actual || 0) - (metrica?.gastos_mes_actual || 0)
        }
      })

      const metricasResueltas = await Promise.all(metricasPromises)
      setMetricas(metricasResueltas)

    } catch (error) {
      console.error('Error general:', error)
      alert('Error al cargar métricas del equipo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTotales = () => {
    return {
      pacientes: metricas.reduce((sum, m) => sum + (m.total_pacientes || 0), 0),
      ingresos: metricas.reduce((sum, m) => sum + (m.ingresos_mes_actual || 0), 0),
      gastos: metricas.reduce((sum, m) => sum + (m.gastos_mes_actual || 0), 0),
      balance: metricas.reduce((sum, m) => sum + (m.balance_mes || 0), 0),
      citas: metricas.reduce((sum, m) => sum + (m.citas_mes_actual || 0), 0),
      procedimientos: metricas.reduce((sum, m) => sum + (m.procedimientos_mes_actual || 0), 0)
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando dashboard...</div>
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
          <div style={styles.title}>📊 Dashboard del Equipo</div>
        </div>
        <div style={styles.content}>
          <div style={styles.upgradeCard}>
            <div style={styles.upgradeIcon}>⭐</div>
            <div style={styles.upgradeTitle}>Función Enterprise</div>
            <div style={styles.upgradeText}>
              Actualiza a Enterprise para ver métricas consolidadas de todo tu equipo
            </div>
            <button
              style={styles.upgradeButton}
              onClick={() => navigate('/suscripcion')}
            >
              Ver Planes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totales = getTotales()

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📊 Dashboard del Equipo</div>
          <div style={styles.subtitle}>{metricas.length} miembros activos</div>
        </div>
        <button
          onClick={() => navigate('/gestion-equipo')}
          style={styles.manageButton}
        >
          ⚙️ Gestionar
        </button>
      </div>

      <div style={styles.content}>
        {/* Filtro de período */}
        <div style={styles.periodoSelector}>
          <button
            style={{
              ...styles.periodoButton,
              ...(periodo === 'mes_actual' && styles.periodoButtonActive)
            }}
            onClick={() => setPeriodo('mes_actual')}
          >
            Este Mes
          </button>
        </div>

        {/* Resumen General */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📈 Resumen General del Equipo</div>
          <div style={styles.totalesGrid}>
            <div style={styles.totalCard}>
              <div style={styles.totalIcon}>👥</div>
              <div style={styles.totalValue}>{totales.pacientes}</div>
              <div style={styles.totalLabel}>Pacientes Totales</div>
            </div>
            
            <div style={styles.totalCard}>
              <div style={styles.totalIcon}>💰</div>
              <div style={styles.totalValue}>
                Gs. {totales.ingresos.toLocaleString('es-PY')}
              </div>
              <div style={styles.totalLabel}>Ingresos Este Mes</div>
            </div>
            
            <div style={styles.totalCard}>
              <div style={styles.totalIcon}>📉</div>
              <div style={styles.totalValue}>
                Gs. {totales.gastos.toLocaleString('es-PY')}
              </div>
              <div style={styles.totalLabel}>Gastos Este Mes</div>
            </div>
            
            <div style={{
              ...styles.totalCard,
              backgroundColor: totales.balance >= 0 ? '#ecfdf5' : '#fef2f2',
              borderColor: totales.balance >= 0 ? '#10b981' : '#ef4444'
            }}>
              <div style={styles.totalIcon}>
                {totales.balance >= 0 ? '✅' : '⚠️'}
              </div>
              <div style={{
                ...styles.totalValue,
                color: totales.balance >= 0 ? '#059669' : '#dc2626'
              }}>
                Gs. {totales.balance.toLocaleString('es-PY')}
              </div>
              <div style={styles.totalLabel}>Balance</div>
            </div>
          </div>

          <div style={styles.totalesGrid}>
            <div style={styles.totalCard}>
              <div style={styles.totalIcon}>📅</div>
              <div style={styles.totalValue}>{totales.citas}</div>
              <div style={styles.totalLabel}>Citas Este Mes</div>
            </div>
            
            <div style={styles.totalCard}>
              <div style={styles.totalIcon}>🦷</div>
              <div style={styles.totalValue}>{totales.procedimientos}</div>
              <div style={styles.totalLabel}>Procedimientos</div>
            </div>
          </div>
        </div>

        {/* Métricas por Miembro */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>👤 Métricas por Miembro</div>
          
          {metricas.map((metrica, idx) => (
            <div key={idx} style={styles.miembroCard}>
              <div style={styles.miembroHeader}>
                <div style={styles.miembroInfo}>
                  <div style={styles.miembroNombre}>
                    {metrica.nombre}
                    {metrica.isOwner && <span style={styles.ownerBadge}>👑 Dueño</span>}
                  </div>
                  {metrica.rol && (
                    <div style={styles.miembroRol}>
                      {metrica.rol === 'admin' && '⭐ Administrador'}
                      {metrica.rol === 'colaborador' && '👤 Colaborador'}
                      {metrica.rol === 'asistente' && '📋 Asistente'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/metricas-perfil/${metrica.dentista_id}`)}
                  style={styles.detailButton}
                >
                  Ver Detalle →
                </button>
              </div>

              <div style={styles.miembroMetricas}>
                <div style={styles.metricaItem}>
                  <div style={styles.metricaLabel}>Pacientes</div>
                  <div style={styles.metricaValue}>{metrica.total_pacientes || 0}</div>
                </div>
                
                <div style={styles.metricaItem}>
                  <div style={styles.metricaLabel}>Ingresos</div>
                  <div style={styles.metricaValue}>
                    Gs. {(metrica.ingresos_mes_actual || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                
                <div style={styles.metricaItem}>
                  <div style={styles.metricaLabel}>Gastos</div>
                  <div style={styles.metricaValue}>
                    Gs. {(metrica.gastos_mes_actual || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                
                <div style={styles.metricaItem}>
                  <div style={styles.metricaLabel}>Balance</div>
                  <div style={{
                    ...styles.metricaValue,
                    color: (metrica.balance_mes || 0) >= 0 ? '#059669' : '#dc2626'
                  }}>
                    Gs. {(metrica.balance_mes || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                
                <div style={styles.metricaItem}>
                  <div style={styles.metricaLabel}>Citas</div>
                  <div style={styles.metricaValue}>{metrica.citas_mes_actual || 0}</div>
                </div>
              </div>

              {/* Barra de contribución */}
              <div style={styles.contribucionBar}>
                <div style={styles.contribucionLabel}>
                  Contribución a ingresos totales
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${totales.ingresos > 0 ? ((metrica.ingresos_mes_actual || 0) / totales.ingresos * 100).toFixed(1) : 0}%`
                    }}
                  />
                </div>
                <div style={styles.contribucionPorcentaje}>
                  {totales.ingresos > 0 ? ((metrica.ingresos_mes_actual || 0) / totales.ingresos * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ranking */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🏆 Ranking del Mes</div>
          
          <div style={styles.rankingGrid}>
            {/* Top Ingresos */}
            <div style={styles.rankingCard}>
              <div style={styles.rankingTitle}>💰 Mayor Ingreso</div>
              {metricas
                .sort((a, b) => (b.ingresos_mes_actual || 0) - (a.ingresos_mes_actual || 0))
                .slice(0, 3)
                .map((m, idx) => (
                  <div key={idx} style={styles.rankingItem}>
                    <div style={styles.rankingPosition}>
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <div style={styles.rankingNombre}>{m.nombre}</div>
                    <div style={styles.rankingValor}>
                      Gs. {(m.ingresos_mes_actual || 0).toLocaleString('es-PY')}
                    </div>
                  </div>
                ))}
            </div>

            {/* Más Pacientes */}
            <div style={styles.rankingCard}>
              <div style={styles.rankingTitle}>👥 Más Pacientes</div>
              {metricas
                .sort((a, b) => (b.total_pacientes || 0) - (a.total_pacientes || 0))
                .slice(0, 3)
                .map((m, idx) => (
                  <div key={idx} style={styles.rankingItem}>
                    <div style={styles.rankingPosition}>
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <div style={styles.rankingNombre}>{m.nombre}</div>
                    <div style={styles.rankingValor}>{m.total_pacientes || 0}</div>
                  </div>
                ))}
            </div>

            {/* Más Productivo */}
            <div style={styles.rankingCard}>
              <div style={styles.rankingTitle}>🦷 Más Procedimientos</div>
              {metricas
                .sort((a, b) => (b.procedimientos_mes_actual || 0) - (a.procedimientos_mes_actual || 0))
                .slice(0, 3)
                .map((m, idx) => (
                  <div key={idx} style={styles.rankingItem}>
                    <div style={styles.rankingPosition}>
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <div style={styles.rankingNombre}>{m.nombre}</div>
                    <div style={styles.rankingValor}>{m.procedimientos_mes_actual || 0}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
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
  manageButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
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
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  periodoSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  periodoButton: {
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  periodoButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '24px',
  },
  totalesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  totalCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  totalIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  totalLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  miembroCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  miembroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  miembroInfo: {
    flex: 1,
  },
  miembroNombre: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ownerBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#f59e0b',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
  },
  miembroRol: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  detailButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  miembroMetricas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricaItem: {
    textAlign: 'center',
  },
  metricaLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  metricaValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  contribucionBar: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  contribucionLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  contribucionPorcentaje: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'right',
  },
  rankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  rankingCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  rankingTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
    textAlign: 'center',
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  rankingPosition: {
    fontSize: '24px',
    minWidth: '32px',
  },
  rankingNombre: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  rankingValor: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#3b82f6',
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