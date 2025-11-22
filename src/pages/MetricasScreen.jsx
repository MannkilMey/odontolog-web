import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MetricasScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('mes_actual')
  const [estadisticas, setEstadisticas] = useState({
    resumenGeneral: {
      totalPacientes: 0,
      citasCompletadas: 0,
      citasCanceladas: 0,
      procedimientosRealizados: 0
    },
    financiero: {
      totalIngresos: 0,
      totalGastos: 0,
      utilidad: 0,
      ticketPromedio: 0
    },
    comparativa: {
      pacientesNuevos: { actual: 0, anterior: 0 },
      ingresos: { actual: 0, anterior: 0 },
      citas: { actual: 0, anterior: 0 }
    },
    topProcedimientos: [],
    metodosPago: [],
    citasPorEstado: {}
  })

  useEffect(() => {
    loadMetricas()
  }, [selectedPeriod])

  const getPeriodoDates = (period) => {
    const hoy = new Date()
    let inicio, fin, inicioAnterior, finAnterior

    switch (period) {
      case 'mes_actual':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        finAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
        break
      case 'trimestre':
        const quarter = Math.floor(hoy.getMonth() / 3)
        inicio = new Date(hoy.getFullYear(), quarter * 3, 1)
        fin = new Date(hoy.getFullYear(), (quarter + 1) * 3, 0)
        inicioAnterior = new Date(hoy.getFullYear(), (quarter - 1) * 3, 1)
        finAnterior = new Date(hoy.getFullYear(), quarter * 3, 0)
        break
      case 'año':
        inicio = new Date(hoy.getFullYear(), 0, 1)
        fin = new Date(hoy.getFullYear(), 11, 31)
        inicioAnterior = new Date(hoy.getFullYear() - 1, 0, 1)
        finAnterior = new Date(hoy.getFullYear() - 1, 11, 31)
        break
      default:
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        finAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0],
      inicioAnterior: inicioAnterior.toISOString().split('T')[0],
      finAnterior: finAnterior.toISOString().split('T')[0]
    }
  }

  const loadMetricas = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const fechas = getPeriodoDates(selectedPeriod)
      
      // Cargar todas las métricas en paralelo
      const [
        resumenGeneral,
        datosFinancieros,
        comparativaData,
        topProcedimientos,
        metodosPago,
        estadoCitas
      ] = await Promise.all([
        loadResumenGeneral(user.id, fechas),
        loadDatosFinancieros(user.id, fechas),
        loadComparativa(user.id, fechas),
        loadTopProcedimientos(user.id, fechas),
        loadMetodosPago(user.id, fechas),
        loadEstadoCitas(user.id, fechas)
      ])

      setEstadisticas({
        resumenGeneral,
        financiero: datosFinancieros,
        comparativa: comparativaData,
        topProcedimientos,
        metodosPago,
        citasPorEstado: estadoCitas
      })

    } catch (error) {
      console.error('Error loading métricas:', error)
      alert('No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }

  const loadResumenGeneral = async (dentistaId, fechas) => {
    const [pacientes, citas, procedimientos] = await Promise.all([
      supabase
        .from('pacientes')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId),
      
      supabase
        .from('citas')
        .select('estado')
        .eq('dentista_id', dentistaId)
        .gte('fecha_cita', `${fechas.inicio}T00:00:00`)
        .lte('fecha_cita', `${fechas.fin}T23:59:59`),
      
      supabase
        .from('procedimientos_dentales')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId)
        .gte('fecha_procedimiento', fechas.inicio)
        .lte('fecha_procedimiento', fechas.fin)
    ])

    const citasCompletadas = citas.data?.filter(c => c.estado === 'completada').length || 0
    const citasCanceladas = citas.data?.filter(c => c.estado === 'cancelada').length || 0

    return {
      totalPacientes: pacientes.data?.length || 0,
      citasCompletadas,
      citasCanceladas,
      procedimientosRealizados: procedimientos.data?.length || 0
    }
  }

  const loadDatosFinancieros = async (dentistaId, fechas) => {
    const [ingresos, gastos] = await Promise.all([
      supabase
        .from('ingresos_clinica')
        .select('monto')
        .eq('dentista_id', dentistaId)
        .gte('fecha_ingreso', fechas.inicio)
        .lte('fecha_ingreso', fechas.fin),
      
      supabase
        .from('gastos_clinica')
        .select('monto')
        .eq('dentista_id', dentistaId)
        .gte('fecha_gasto', fechas.inicio)
        .lte('fecha_gasto', fechas.fin)
    ])

    const totalIngresos = ingresos.data?.reduce((sum, ing) => sum + Number(ing.monto), 0) || 0
    const totalGastos = gastos.data?.reduce((sum, gas) => sum + Number(gas.monto), 0) || 0
    const utilidad = totalIngresos - totalGastos
    const ticketPromedio = ingresos.data?.length > 0 ? totalIngresos / ingresos.data.length : 0

    return {
      totalIngresos,
      totalGastos,
      utilidad,
      ticketPromedio
    }
  }

  const loadComparativa = async (dentistaId, fechas) => {
    const [pacientesActual, pacientesAnterior, ingresosActual, ingresosAnterior, citasActual, citasAnterior] = await Promise.all([
      supabase
        .from('pacientes')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId)
        .gte('created_at', `${fechas.inicio}T00:00:00`)
        .lte('created_at', `${fechas.fin}T23:59:59`),
      
      supabase
        .from('pacientes')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId)
        .gte('created_at', `${fechas.inicioAnterior}T00:00:00`)
        .lte('created_at', `${fechas.finAnterior}T23:59:59`),
      
      supabase
        .from('ingresos_clinica')
        .select('monto')
        .eq('dentista_id', dentistaId)
        .gte('fecha_ingreso', fechas.inicio)
        .lte('fecha_ingreso', fechas.fin),
      
      supabase
        .from('ingresos_clinica')
        .select('monto')
        .eq('dentista_id', dentistaId)
        .gte('fecha_ingreso', fechas.inicioAnterior)
        .lte('fecha_ingreso', fechas.finAnterior),
      
      supabase
        .from('citas')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId)
        .eq('estado', 'completada')
        .gte('fecha_cita', `${fechas.inicio}T00:00:00`)
        .lte('fecha_cita', `${fechas.fin}T23:59:59`),
      
      supabase
        .from('citas')
        .select('id', { count: 'exact' })
        .eq('dentista_id', dentistaId)
        .eq('estado', 'completada')
        .gte('fecha_cita', `${fechas.inicioAnterior}T00:00:00`)
        .lte('fecha_cita', `${fechas.finAnterior}T23:59:59`)
    ])

    return {
      pacientesNuevos: {
        actual: pacientesActual.data?.length || 0,
        anterior: pacientesAnterior.data?.length || 0
      },
      ingresos: {
        actual: ingresosActual.data?.reduce((sum, ing) => sum + Number(ing.monto), 0) || 0,
        anterior: ingresosAnterior.data?.reduce((sum, ing) => sum + Number(ing.monto), 0) || 0
      },
      citas: {
        actual: citasActual.data?.length || 0,
        anterior: citasAnterior.data?.length || 0
      }
    }
  }

  const loadTopProcedimientos = async (dentistaId, fechas) => {
    const { data } = await supabase
      .from('procedimientos_dentales')
      .select('procedimiento, costo')
      .eq('dentista_id', dentistaId)
      .gte('fecha_procedimiento', fechas.inicio)
      .lte('fecha_procedimiento', fechas.fin)

    if (!data) return []

    const procedimientos = {}
    data.forEach(proc => {
      const nombre = proc.procedimiento
      if (!procedimientos[nombre]) {
        procedimientos[nombre] = { count: 0, total: 0 }
      }
      procedimientos[nombre].count++
      procedimientos[nombre].total += Number(proc.costo || 0)
    })

    return Object.entries(procedimientos)
      .map(([nombre, data]) => ({
        nombre,
        cantidad: data.count,
        total: data.total
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }

  const loadMetodosPago = async (dentistaId, fechas) => {
    const { data } = await supabase
      .from('ingresos_clinica')
      .select('metodo_pago, monto')
      .eq('dentista_id', dentistaId)
      .gte('fecha_ingreso', fechas.inicio)
      .lte('fecha_ingreso', fechas.fin)

    if (!data) return []

    const metodos = {}
    data.forEach(ing => {
      const metodo = ing.metodo_pago || 'sin_especificar'
      if (!metodos[metodo]) {
        metodos[metodo] = 0
      }
      metodos[metodo] += Number(ing.monto)
    })

    return Object.entries(metodos)
      .map(([metodo, total]) => ({ metodo, total }))
      .sort((a, b) => b.total - a.total)
  }

  const loadEstadoCitas = async (dentistaId, fechas) => {
    const { data } = await supabase
      .from('citas')
      .select('estado')
      .eq('dentista_id', dentistaId)
      .gte('fecha_cita', `${fechas.inicio}T00:00:00`)
      .lte('fecha_cita', `${fechas.fin}T23:59:59`)

    if (!data) return {}

    const estados = {}
    data.forEach(cita => {
      const estado = cita.estado || 'sin_estado'
      estados[estado] = (estados[estado] || 0) + 1
    })

    return estados
  }

  const formatMoney = (value) => {
    return `Gs. ${Number(value).toLocaleString('es-PY')}`
  }

  const calculateChange = (actual, anterior) => {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

  const StatCard = ({ title, value, icon, subtitle, color = '#1e40af' }) => (
    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <div style={styles.statIcon}>{icon}</div>
        <div style={styles.statInfo}>
          <div style={styles.statTitle}>{title}</div>
          <div style={{...styles.statValue, color}}>{value}</div>
          {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
        </div>
      </div>
    </div>
  )

  const ComparativaCard = ({ title, actual, anterior, icon }) => {
    const change = calculateChange(actual, anterior)
    const isPositive = change >= 0

    return (
      <div style={styles.comparativaCard}>
        <div style={styles.comparativaIcon}>{icon}</div>
        <div style={styles.comparativaInfo}>
          <div style={styles.comparativaTitle}>{title}</div>
          <div style={styles.comparativaValue}>{actual}</div>
          <div style={styles.comparativaChange}>
            <span style={{
              ...styles.changeIndicator,
              backgroundColor: isPositive ? '#10b981' : '#ef4444'
            }}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            <span style={styles.comparativaAnterior}>vs {anterior} anterior</span>
          </div>
        </div>
      </div>
    )
  }

  const ChartBar = ({ label, value, maxValue, color }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

    return (
      <div style={styles.chartBarContainer}>
        <div style={styles.chartBarLabel}>{label}</div>
        <div style={styles.chartBarWrapper}>
          <div 
            style={{
              ...styles.chartBar,
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
          <div style={styles.chartBarValue}>
            {formatMoney(value)}
          </div>
        </div>
      </div>
    )
  }

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'mes_actual': return 'Mes Actual'
      case 'trimestre': return 'Trimestre'
      case 'año': return 'Año'
      default: return 'Mes Actual'
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Cargando métricas...</div>
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
          <div style={styles.title}>📊 Métricas y Análisis</div>
          <div style={styles.subtitle}>{getPeriodLabel()}</div>
        </div>
        <button onClick={loadMetricas} style={styles.refreshButton}>
          ⟳
        </button>
      </div>

      {/* Selector de Período */}
      <div style={styles.periodSelector}>
        <button
          style={{
            ...styles.periodButton,
            ...(selectedPeriod === 'mes_actual' && styles.periodButtonActive)
          }}
          onClick={() => setSelectedPeriod('mes_actual')}
        >
          Mes
        </button>
        <button
          style={{
            ...styles.periodButton,
            ...(selectedPeriod === 'trimestre' && styles.periodButtonActive)
          }}
          onClick={() => setSelectedPeriod('trimestre')}
        >
          Trimestre
        </button>
        <button
          style={{
            ...styles.periodButton,
            ...(selectedPeriod === 'año' && styles.periodButtonActive)
          }}
          onClick={() => setSelectedPeriod('año')}
        >
          Año
        </button>
      </div>

      <div style={styles.content}>
        {/* Resumen Financiero */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>💰 Resumen Financiero</div>
          <div style={styles.statsGrid}>
            <StatCard
              title="Total Ingresos"
              value={formatMoney(estadisticas.financiero.totalIngresos)}
              icon="💵"
              color="#10b981"
            />
            <StatCard
              title="Total Gastos"
              value={formatMoney(estadisticas.financiero.totalGastos)}
              icon="💸"
              color="#ef4444"
            />
            <StatCard
              title="Utilidad Neta"
              value={formatMoney(estadisticas.financiero.utilidad)}
              icon="📈"
              color={estadisticas.financiero.utilidad >= 0 ? '#10b981' : '#ef4444'}
            />
            <StatCard
              title="Ticket Promedio"
              value={formatMoney(estadisticas.financiero.ticketPromedio)}
              icon="🎫"
              color="#3b82f6"
            />
          </div>
        </div>

        {/* Resumen General */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📋 Resumen General</div>
          <div style={styles.statsGrid}>
            <StatCard
              title="Total Pacientes"
              value={estadisticas.resumenGeneral.totalPacientes}
              icon="👥"
            />
            <StatCard
              title="Citas Completadas"
              value={estadisticas.resumenGeneral.citasCompletadas}
              icon="✅"
              color="#10b981"
            />
            <StatCard
              title="Procedimientos"
              value={estadisticas.resumenGeneral.procedimientosRealizados}
              icon="🦷"
              color="#3b82f6"
            />
            <StatCard
              title="Citas Canceladas"
              value={estadisticas.resumenGeneral.citasCanceladas}
              icon="❌"
              color="#ef4444"
            />
          </div>
        </div>

        {/* Comparativa con Período Anterior */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📊 Comparativa</div>
          <div style={styles.comparativaGrid}>
            <ComparativaCard
              title="Pacientes Nuevos"
              actual={estadisticas.comparativa.pacientesNuevos.actual}
              anterior={estadisticas.comparativa.pacientesNuevos.anterior}
              icon="👥"
            />
            <ComparativaCard
              title="Ingresos"
              actual={formatMoney(estadisticas.comparativa.ingresos.actual)}
              anterior={formatMoney(estadisticas.comparativa.ingresos.anterior)}
              icon="💰"
            />
            <ComparativaCard
              title="Citas Completadas"
              actual={estadisticas.comparativa.citas.actual}
              anterior={estadisticas.comparativa.citas.anterior}
              icon="📅"
            />
          </div>
        </div>

        {/* Top Procedimientos */}
        {estadisticas.topProcedimientos.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🏆 Top Procedimientos</div>
            <div style={styles.chartContainer}>
              {estadisticas.topProcedimientos.map((proc, index) => (
                <ChartBar
                  key={index}
                  label={`${proc.nombre} (${proc.cantidad})`}
                  value={proc.total}
                  maxValue={estadisticas.topProcedimientos[0]?.total || 1}
                  color={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Métodos de Pago */}
        {estadisticas.metodosPago.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>💳 Métodos de Pago</div>
            <div style={styles.chartContainer}>
              {estadisticas.metodosPago.map((metodo, index) => (
                <ChartBar
                  key={index}
                  label={metodo.metodo.charAt(0).toUpperCase() + metodo.metodo.slice(1)}
                  value={metodo.total}
                  maxValue={estadisticas.metodosPago[0]?.total || 1}
                  color={['#059669', '#3b82f6', '#f59e0b', '#8b5cf6'][index]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Estados de Citas */}
        {Object.keys(estadisticas.citasPorEstado).length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📅 Estados de Citas</div>
            <div style={styles.statsGrid}>
              {Object.entries(estadisticas.citasPorEstado).map(([estado, cantidad]) => {
                const estadosConfig = {
                  programada: { icon: '📅', color: '#3b82f6' },
                  confirmada: { icon: '✅', color: '#10b981' },
                  completada: { icon: '✔️', color: '#059669' },
                  cancelada: { icon: '❌', color: '#ef4444' }
                }
                
                const config = estadosConfig[estado] || { icon: '📋', color: '#6b7280' }
                
                return (
                  <StatCard
                    key={estado}
                    title={estado.charAt(0).toUpperCase() + estado.slice(1)}
                    value={cantidad}
                    icon={config.icon}
                    color={config.color}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          Métricas actualizadas: {new Date().toLocaleString('es-ES')}
        </div>
        <div style={styles.footerBrand}>Diseñado por MCorp</div>
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
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
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
    padding: '8px 12px',
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
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px',
  },
  refreshButton: {
    padding: '8px 12px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  periodSelector: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: '12px 16px',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid #e5e7eb',
  },
  periodButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  statIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '2px',
  },
  statSubtitle: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  comparativaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  comparativaCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  comparativaIcon: {
    fontSize: '32px',
  },
  comparativaInfo: {
    flex: 1,
  },
  comparativaTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  comparativaValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  comparativaChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  changeIndicator: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
  },
  comparativaAnterior: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  chartBarContainer: {
    marginBottom: '16px',
  },
  chartBarLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  chartBarWrapper: {
    position: 'relative',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
  },
  chartBar: {
    height: '100%',
    borderRadius: '8px',
    minWidth: '8px',
    transition: 'width 0.3s ease',
  },
  chartBarValue: {
    position: 'absolute',
    right: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1f2937',
  },
  footer: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '4px',
  },
  footerBrand: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
}