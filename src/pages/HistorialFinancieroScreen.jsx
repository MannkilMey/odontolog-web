import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HistorialFinancieroScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [movimientos, setMovimientos] = useState([])
  const [config, setConfig] = useState(null)
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos') // todos, ingresos, gastos
  const [filtroFecha, setFiltroFecha] = useState('mes') // hoy, semana, mes, año, personalizado
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar configuración
      const { data: configData } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      setConfig(configData)

      // Cargar ingresos (pagos de pacientes)
      const { data: pagosData } = await supabase
        .from('pagos_pacientes')
        .select(`
          *,
          pacientes (
            nombre,
            apellido
          )
        `)
        .eq('dentista_id', user.id)

      // Cargar gastos
      const { data: gastosData } = await supabase
        .from('gastos_clinica')
        .select('*')
        .eq('dentista_id', user.id)

      // Combinar todo en un solo array de movimientos
      const ingresos = (pagosData || []).map(pago => ({
        id: pago.id,
        fecha: pago.fecha_pago,
        tipo: 'ingreso',
        concepto: pago.concepto,
        monto: Number(pago.monto),
        categoria: 'pago_paciente',
        paciente: pago.pacientes ? `${pago.pacientes.nombre} ${pago.pacientes.apellido}` : 'N/A',
        metodo_pago: pago.metodo_pago,
        numero_comprobante: pago.numero_recibo,
        notas: pago.notas,
        detalles: pago
      }))

      const gastos = (gastosData || []).map(gasto => ({
        id: gasto.id,
        fecha: gasto.fecha_gasto,
        tipo: 'gasto',
        concepto: gasto.concepto,
        monto: Number(gasto.monto),
        categoria: gasto.categoria,
        proveedor: gasto.proveedor,
        metodo_pago: gasto.metodo_pago,
        numero_comprobante: gasto.numero_factura,
        notas: gasto.notas,
        detalles: gasto
      }))

      // Combinar y ordenar por fecha (más reciente primero)
      const todosMovimientos = [...ingresos, ...gastos].sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
      )

      setMovimientos(todosMovimientos)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar datos financieros')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (value) => {
    return `${config?.simbolo_moneda || 'Gs.'} ${Number(value).toLocaleString('es-PY')}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Aplicar filtros
  const movimientosFiltrados = movimientos.filter(mov => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) {
      return false
    }

    // Filtro por fecha
    const fechaMov = new Date(mov.fecha)
    const hoy = new Date()

    if (filtroFecha === 'hoy') {
      if (fechaMov.toDateString() !== hoy.toDateString()) return false
    } else if (filtroFecha === 'semana') {
      const semanaAtras = new Date(hoy)
      semanaAtras.setDate(hoy.getDate() - 7)
      if (fechaMov < semanaAtras) return false
    } else if (filtroFecha === 'mes') {
      if (fechaMov.getMonth() !== hoy.getMonth() || 
          fechaMov.getFullYear() !== hoy.getFullYear()) return false
    } else if (filtroFecha === 'año') {
      if (fechaMov.getFullYear() !== hoy.getFullYear()) return false
    } else if (filtroFecha === 'personalizado') {
      if (fechaInicio && fechaMov < new Date(fechaInicio)) return false
      if (fechaFin && fechaMov > new Date(fechaFin)) return false
    }

    return true
  })

  // Calcular estadísticas
  const stats = {
    totalIngresos: movimientosFiltrados
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0),
    totalGastos: movimientosFiltrados
      .filter(m => m.tipo === 'gasto')
      .reduce((sum, m) => sum + m.monto, 0),
    balance: 0,
    cantidadIngresos: movimientosFiltrados.filter(m => m.tipo === 'ingreso').length,
    cantidadGastos: movimientosFiltrados.filter(m => m.tipo === 'gasto').length
  }

  stats.balance = stats.totalIngresos - stats.totalGastos

  // Agrupar por fecha para el timeline
  const movimientosPorFecha = {}
  movimientosFiltrados.forEach(mov => {
    const fecha = mov.fecha
    if (!movimientosPorFecha[fecha]) {
      movimientosPorFecha[fecha] = []
    }
    movimientosPorFecha[fecha].push(mov)
  })

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando historial financiero...</div>
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
          <div style={styles.title}>💰 Historial Financiero</div>
          <div style={styles.subtitle}>
            {movimientosFiltrados.length} movimientos
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Estadísticas principales */}
        <div style={styles.statsContainer}>
          <div style={{...styles.statCard, borderColor: '#d1fae5'}}>
            <div style={styles.statLabel}>Ingresos</div>
            <div style={{...styles.statValue, color: '#10b981'}}>
              {formatMoney(stats.totalIngresos)}
            </div>
            <div style={styles.statSubtext}>
              {stats.cantidadIngresos} transacciones
            </div>
          </div>

          <div style={{...styles.statCard, borderColor: '#fee2e2'}}>
            <div style={styles.statLabel}>Gastos</div>
            <div style={{...styles.statValue, color: '#ef4444'}}>
              {formatMoney(stats.totalGastos)}
            </div>
            <div style={styles.statSubtext}>
              {stats.cantidadGastos} transacciones
            </div>
          </div>

          <div style={{
            ...styles.statCard,
            borderColor: stats.balance >= 0 ? '#d1fae5' : '#fee2e2',
            backgroundColor: stats.balance >= 0 ? '#f0fdf4' : '#fef2f2'
          }}>
            <div style={styles.statLabel}>Balance</div>
            <div style={{
              ...styles.statValue,
              color: stats.balance >= 0 ? '#10b981' : '#ef4444'
            }}>
              {formatMoney(stats.balance)}
            </div>
            <div style={styles.statSubtext}>
              {stats.balance >= 0 ? 'Positivo' : 'Negativo'}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtersSection}>
          <div style={styles.filtersRow}>
            {/* Filtro por tipo */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Tipo</label>
              <select
                style={styles.filterSelect}
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">📊 Todos</option>
                <option value="ingreso">💚 Ingresos</option>
                <option value="gasto">❤️ Gastos</option>
              </select>
            </div>

            {/* Filtro por período */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Período</label>
              <select
                style={styles.filterSelect}
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Última semana</option>
                <option value="mes">Este mes</option>
                <option value="año">Este año</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {/* Fechas personalizadas */}
            {filtroFecha === 'personalizado' && (
              <>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Desde</label>
                  <input
                    type="date"
                    style={styles.filterInput}
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Hasta</label>
                  <input
                    type="date"
                    style={styles.filterInput}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeline de movimientos */}
        {movimientosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💰</div>
            <div style={styles.emptyText}>
              No hay movimientos financieros en el período seleccionado
            </div>
          </div>
        ) : (
          <div style={styles.timeline}>
            {Object.keys(movimientosPorFecha).map((fecha, idx) => (
              <div key={idx} style={styles.timelineDay}>
                {/* Fecha del día */}
                <div style={styles.timelineDayHeader}>
                  <div style={styles.timelineDayDate}>
                    📅 {formatDate(fecha)}
                  </div>
                  <div style={styles.timelineDayBalance}>
                    {(() => {
                      const movsDia = movimientosPorFecha[fecha]
                      const ingresosDia = movsDia.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
                      const gastosDia = movsDia.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
                      const balanceDia = ingresosDia - gastosDia
                      return (
                        <span style={{ color: balanceDia >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatMoney(balanceDia)}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Movimientos del día */}
                <div style={styles.timelineMovimientos}>
                  {movimientosPorFecha[fecha].map((mov, movIdx) => (
                    <div 
                      key={movIdx}
                      style={{
                        ...styles.movimientoCard,
                        borderLeftColor: mov.tipo === 'ingreso' ? '#10b981' : '#ef4444'
                      }}
                    >
                      <div style={styles.movHeader}>
                        <div style={styles.movTipo}>
                          {mov.tipo === 'ingreso' ? '⬇️' : '⬆️'} 
                          <span style={{ marginLeft: '8px' }}>
                            {mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </div>
                        <div style={{
                          ...styles.movMonto,
                          color: mov.tipo === 'ingreso' ? '#10b981' : '#ef4444'
                        }}>
                          {mov.tipo === 'ingreso' ? '+' : '-'} {formatMoney(mov.monto)}
                        </div>
                      </div>

                      <div style={styles.movConcepto}>
                        {mov.concepto}
                      </div>

                      <div style={styles.movDetails}>
                        {mov.tipo === 'ingreso' && mov.paciente && (
                          <div style={styles.movDetail}>
                            👤 {mov.paciente}
                          </div>
                        )}
                        {mov.tipo === 'gasto' && mov.proveedor && (
                          <div style={styles.movDetail}>
                            🏪 {mov.proveedor}
                          </div>
                        )}
                        {mov.numero_comprobante && (
                          <div style={styles.movDetail}>
                            🧾 {mov.numero_comprobante}
                          </div>
                        )}
                        {mov.metodo_pago && (
                          <div style={styles.movDetail}>
                            💳 {mov.metodo_pago}
                          </div>
                        )}
                      </div>

                      {mov.notas && (
                        <div style={styles.movNotas}>
                          {mov.notas}
                        </div>
                      )}

                      <div style={styles.movCategoria}>
                        {mov.categoria.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
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
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  filtersRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    flex: '1',
    minWidth: '200px',
  },
  filterLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  filterSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  filterInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  timelineDay: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  timelineDayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  timelineDayDate: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  timelineDayBalance: {
    fontSize: '18px',
    fontWeight: '700',
  },
  timelineMovimientos: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movimientoCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '4px solid',
  },
  movHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  movTipo: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  movMonto: {
    fontSize: '20px',
    fontWeight: '700',
  },
  movConcepto: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  movDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '8px',
  },
  movDetail: {
    fontSize: '13px',
    color: '#6b7280',
  },
  movNotas: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb',
  },
  movCategoria: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginTop: '8px',
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