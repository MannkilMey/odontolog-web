import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MetricasPerfilScreen() {
  const navigate = useNavigate()
  const { perfilId } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState(null)
  const [pacientesTop, setPacientesTop] = useState([])
  const [procedimientosTop, setProcedimientosTop] = useState([])
  const [periodo, setPeriodo] = useState('mes_actual')

  useEffect(() => {
    loadData()
  }, [perfilId, periodo])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar métricas generales
      const { data: metricasData, error: metricasError } = await supabase
        .from('metricas_por_perfil')
        .select('*')
        .eq('dentista_id', perfilId)
        .single()

      if (metricasError) throw metricasError
      setMetricas(metricasData)

      // Calcular fechas según período
      let fechaInicio, fechaFin
      const hoy = new Date()

      if (periodo === 'mes_actual') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fechaFin = hoy
      } else if (periodo === 'mes_anterior') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      } else { // ultimos_30
        fechaInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
        fechaFin = hoy
      }

      // Top 5 pacientes por ingresos
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos_pacientes')
        .select(`
          paciente_id,
          monto,
          paciente:pacientes(nombre, apellido)
        `)
        .eq('dentista_id', perfilId)
        .gte('fecha_pago', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_pago', fechaFin.toISOString().split('T')[0])

      if (pagosError) throw pagosError

      // Agrupar por paciente
      const pacientesMap = {}
      pagosData?.forEach(pago => {
        if (!pago.paciente) return
        const key = pago.paciente_id
        if (!pacientesMap[key]) {
          pacientesMap[key] = {
            nombre: `${pago.paciente.nombre} ${pago.paciente.apellido}`,
            total: 0
          }
        }
        pacientesMap[key].total += Number(pago.monto)
      })

      const topPacientes = Object.values(pacientesMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      setPacientesTop(topPacientes)

      // Top 5 procedimientos más realizados
      const { data: procsData, error: procsError } = await supabase
        .from('procedimientos_dentales')
        .select('nombre_procedimiento')
        .eq('dentista_id', perfilId)
        .gte('fecha_procedimiento', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_procedimiento', fechaFin.toISOString().split('T')[0])

      if (procsError) throw procsError

      // Contar procedimientos
      const procsMap = {}
      procsData?.forEach(proc => {
        const nombre = proc.nombre_procedimiento || 'Sin especificar'
        if (!procsMap[nombre]) {
          procsMap[nombre] = 0
        }
        procsMap[nombre]++
      })

      const topProcs = Object.entries(procsMap)
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setProcedimientosTop(topProcs)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando métricas...</div>
      </div>
    )
  }

  if (!metricas) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            ← Volver
          </button>
          <div style={styles.title}>❌ Perfil no encontrado</div>
        </div>
      </div>
    )
  }

  const balanceMes = (metricas.ingresos_mes_actual || 0) - (metricas.gastos_mes_actual || 0)
  const balanceTotal = metricas.balance_total || 0

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>
            📊 Métricas de {metricas.nombre} {metricas.apellido}
          </div>
          <div style={styles.subtitle}>{metricas.clinica || metricas.email}</div>
        </div>
        <div style={{ width: '80px' }} />
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
          <button
            style={{
              ...styles.periodoButton,
              ...(periodo === 'mes_anterior' && styles.periodoButtonActive)
            }}
            onClick={() => setPeriodo('mes_anterior')}
          >
            Mes Anterior
          </button>
          <button
            style={{
              ...styles.periodoButton,
              ...(periodo === 'ultimos_30' && styles.periodoButtonActive)
            }}
            onClick={() => setPeriodo('ultimos_30')}
          >
            Últimos 30 Días
          </button>
        </div>

        {/* Métricas Principales */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>👥</div>
            <div style={styles.metricValue}>{metricas.total_pacientes || 0}</div>
            <div style={styles.metricLabel}>Pacientes Totales</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>💰</div>
            <div style={styles.metricValue}>
              Gs. {(metricas.ingresos_mes_actual || 0).toLocaleString('es-PY')}
            </div>
            <div style={styles.metricLabel}>Ingresos Este Mes</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>📉</div>
            <div style={styles.metricValue}>
              Gs. {(metricas.gastos_mes_actual || 0).toLocaleString('es-PY')}
            </div>
            <div style={styles.metricLabel}>Gastos Este Mes</div>
          </div>

          <div style={{
            ...styles.metricCard,
            backgroundColor: balanceMes >= 0 ? '#ecfdf5' : '#fef2f2',
            borderColor: balanceMes >= 0 ? '#10b981' : '#ef4444'
          }}>
            <div style={styles.metricIcon}>
              {balanceMes >= 0 ? '✅' : '⚠️'}
            </div>
            <div style={{
              ...styles.metricValue,
              color: balanceMes >= 0 ? '#059669' : '#dc2626'
            }}>
              Gs. {balanceMes.toLocaleString('es-PY')}
            </div>
            <div style={styles.metricLabel}>Balance Este Mes</div>
          </div>
        </div>

        {/* Métricas Secundarias */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>📅</div>
            <div style={styles.metricValue}>{metricas.citas_mes_actual || 0}</div>
            <div style={styles.metricLabel}>Citas Este Mes</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>🦷</div>
            <div style={styles.metricValue}>{metricas.procedimientos_mes_actual || 0}</div>
            <div style={styles.metricLabel}>Procedimientos</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>💵</div>
            <div style={styles.metricValue}>
              Gs. {(metricas.ingresos_totales || 0).toLocaleString('es-PY')}
            </div>
            <div style={styles.metricLabel}>Ingresos Históricos</div>
          </div>

          <div style={{
            ...styles.metricCard,
            backgroundColor: balanceTotal >= 0 ? '#ecfdf5' : '#fef2f2',
            borderColor: balanceTotal >= 0 ? '#10b981' : '#ef4444'
          }}>
            <div style={styles.metricIcon}>📊</div>
            <div style={{
              ...styles.metricValue,
              color: balanceTotal >= 0 ? '#059669' : '#dc2626'
            }}>
              Gs. {balanceTotal.toLocaleString('es-PY')}
            </div>
            <div style={styles.metricLabel}>Balance Total</div>
          </div>
        </div>

        {/* Top Pacientes */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🏆 Top 5 Pacientes por Ingresos</div>
          {pacientesTop.length === 0 ? (
            <div style={styles.emptyState}>No hay datos en este período</div>
          ) : (
            <div style={styles.topList}>
              {pacientesTop.map((pac, idx) => (
                <div key={idx} style={styles.topItem}>
                  <div style={styles.topRank}>#{idx + 1}</div>
                  <div style={styles.topNombre}>{pac.nombre}</div>
                  <div style={styles.topValue}>
                    Gs. {pac.total.toLocaleString('es-PY')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Procedimientos */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🦷 Top 5 Procedimientos Más Realizados</div>
          {procedimientosTop.length === 0 ? (
            <div style={styles.emptyState}>No hay datos en este período</div>
          ) : (
            <div style={styles.topList}>
              {procedimientosTop.map((proc, idx) => (
                <div key={idx} style={styles.topItem}>
                  <div style={styles.topRank}>#{idx + 1}</div>
                  <div style={styles.topNombre}>{proc.nombre}</div>
                  <div style={styles.topValue}>{proc.count} veces</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de Rendimiento */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📈 Rendimiento</div>
          <div style={styles.performanceGrid}>
            <div style={styles.performanceCard}>
              <div style={styles.performanceLabel}>Promedio por Paciente</div>
              <div style={styles.performanceValue}>
                Gs. {metricas.total_pacientes > 0 
                  ? Math.round((metricas.ingresos_totales || 0) / metricas.total_pacientes).toLocaleString('es-PY')
                  : '0'}
              </div>
            </div>

            <div style={styles.performanceCard}>
              <div style={styles.performanceLabel}>Promedio por Procedimiento</div>
              <div style={styles.performanceValue}>
                Gs. {metricas.procedimientos_mes_actual > 0
                  ? Math.round((metricas.ingresos_mes_actual || 0) / metricas.procedimientos_mes_actual).toLocaleString('es-PY')
                  : '0'}
              </div>
            </div>

            <div style={styles.performanceCard}>
              <div style={styles.performanceLabel}>Tasa de Conversión</div>
              <div style={styles.performanceValue}>
                {metricas.citas_mes_actual > 0
                  ? Math.round((metricas.procedimientos_mes_actual / metricas.citas_mes_actual) * 100)
                  : 0}%
              </div>
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
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  periodoSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
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
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  metricIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#6b7280',
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
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '16px',
  },
  topList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  topItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  topRank: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#f59e0b',
    minWidth: '40px',
  },
  topNombre: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  topValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#3b82f6',
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  performanceCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  performanceLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  performanceValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
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