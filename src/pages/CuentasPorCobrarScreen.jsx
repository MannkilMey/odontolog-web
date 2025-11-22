import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CuentasPorCobrarScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [cuentas, setCuentas] = useState([])
  const [filtro, setFiltro] = useState('todos') // 'todos', 'con_deuda', 'al_dia'
  const [busqueda, setBusqueda] = useState('')

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

      // Cargar todos los pacientes
      const { data: pacientes, error: pacientesError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('dentista_id', user.id)
        .order('apellido')

      if (pacientesError) throw pacientesError

      // Para cada paciente, calcular su balance
      const cuentasData = await Promise.all(
        pacientes.map(async (paciente) => {
          // Sumar todos los presupuestos aprobados
          const { data: presupuestos } = await supabase
            .from('presupuestos')
            .select('total, estado, fecha_emision, numero_presupuesto')
            .eq('paciente_id', paciente.id)
            .eq('estado', 'aprobado')

          const totalPresupuestos = presupuestos?.reduce(
            (sum, p) => sum + Number(p.total), 0
          ) || 0

          // Sumar todos los pagos
          const { data: pagos } = await supabase
            .from('pagos_pacientes')
            .select('monto, fecha_pago')
            .eq('paciente_id', paciente.id)

          const totalPagos = pagos?.reduce(
            (sum, p) => sum + Number(p.monto), 0
          ) || 0

          // Calcular saldo
          const saldo = totalPresupuestos - totalPagos

          // Última actividad
          const ultimoPago = pagos?.[pagos.length - 1]
          const ultimoPresupuesto = presupuestos?.[presupuestos.length - 1]
          
          let ultimaActividad = null
          if (ultimoPago && ultimoPresupuesto) {
            ultimaActividad = new Date(ultimoPago.fecha_pago) > new Date(ultimoPresupuesto.fecha_emision) 
              ? ultimoPago.fecha_pago 
              : ultimoPresupuesto.fecha_emision
          } else if (ultimoPago) {
            ultimaActividad = ultimoPago.fecha_pago
          } else if (ultimoPresupuesto) {
            ultimaActividad = ultimoPresupuesto.fecha_emision
          }

          return {
            ...paciente,
            totalPresupuestos,
            totalPagos,
            saldo,
            cantidadPresupuestos: presupuestos?.length || 0,
            cantidadPagos: pagos?.length || 0,
            ultimaActividad
          }
        })
      )

      setCuentas(cuentasData)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (value) => {
    return `${config?.simbolo_moneda || 'Gs.'} ${Number(value).toLocaleString('es-PY')}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin actividad'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSaldoColor = (saldo) => {
    if (saldo > 0) return '#ef4444' // Rojo - debe
    if (saldo < 0) return '#10b981' // Verde - saldo a favor
    return '#6b7280' // Gris - al día
  }

  const getSaldoTexto = (saldo) => {
    if (saldo > 0) return 'Debe'
    if (saldo < 0) return 'A favor'
    return 'Al día'
  }

  // Filtrar cuentas
  const cuentasFiltradas = cuentas.filter(cuenta => {
    // Filtro por estado
    if (filtro === 'con_deuda' && cuenta.saldo <= 0) return false
    if (filtro === 'al_dia' && cuenta.saldo > 0) return false

    // Filtro por búsqueda
    if (busqueda) {
      const searchTerm = busqueda.toLowerCase()
      const nombreCompleto = `${cuenta.nombre} ${cuenta.apellido}`.toLowerCase()
      return nombreCompleto.includes(searchTerm)
    }

    return true
  })

  // Estadísticas generales
  const stats = {
    totalCuentas: cuentas.length,
    conDeuda: cuentas.filter(c => c.saldo > 0).length,
    alDia: cuentas.filter(c => c.saldo <= 0).length,
    totalAdeudado: cuentas.reduce((sum, c) => sum + (c.saldo > 0 ? c.saldo : 0), 0),
    totalPresupuestos: cuentas.reduce((sum, c) => sum + c.totalPresupuestos, 0),
    totalCobrado: cuentas.reduce((sum, c) => sum + c.totalPagos, 0),
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando cuentas...</div>
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
          <div style={styles.title}>💳 Cuentas por Cobrar</div>
          <div style={styles.subtitle}>{cuentas.length} pacientes</div>
        </div>
        <button onClick={loadData} style={styles.refreshButton}>
          ⟳
        </button>
      </div>

      <div style={styles.content}>
        {/* Estadísticas Generales */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalCuentas}</div>
            <div style={styles.statLabel}>Total Pacientes</div>
          </div>
          <div style={{...styles.statCard, ...styles.statCardDanger}}>
            <div style={styles.statNumber}>{stats.conDeuda}</div>
            <div style={styles.statLabel}>Con Deuda</div>
          </div>
          <div style={{...styles.statCard, ...styles.statCardSuccess}}>
            <div style={styles.statNumber}>{stats.alDia}</div>
            <div style={styles.statLabel}>Al Día</div>
          </div>
          <div style={{...styles.statCard, ...styles.statCardWarning}}>
            <div style={styles.statNumber}>{formatMoney(stats.totalAdeudado)}</div>
            <div style={styles.statLabel}>Total Adeudado</div>
          </div>
        </div>

        {/* Resumen Financiero */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>📊 Resumen Financiero</div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Total Presupuestos Aprobados:</span>
            <span style={styles.summaryValue}>{formatMoney(stats.totalPresupuestos)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Total Cobrado:</span>
            <span style={{...styles.summaryValue, color: '#10b981'}}>{formatMoney(stats.totalCobrado)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Tasa de Cobranza:</span>
            <span style={styles.summaryValue}>
              {stats.totalPresupuestos > 0 
                ? `${Math.round((stats.totalCobrado / stats.totalPresupuestos) * 100)}%`
                : '0%'
              }
            </span>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div style={styles.filtersContainer}>
          <div style={styles.filterButtons}>
            <button
              style={{
                ...styles.filterButton,
                ...(filtro === 'todos' && styles.filterButtonActive)
              }}
              onClick={() => setFiltro('todos')}
            >
              Todos ({cuentas.length})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filtro === 'con_deuda' && styles.filterButtonActive)
              }}
              onClick={() => setFiltro('con_deuda')}
            >
              Con Deuda ({stats.conDeuda})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filtro === 'al_dia' && styles.filterButtonActive)
              }}
              onClick={() => setFiltro('al_dia')}
            >
              Al Día ({stats.alDia})
            </button>
          </div>

          <input
            type="text"
            style={styles.searchInput}
            placeholder="🔍 Buscar paciente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Lista de Cuentas */}
        {cuentasFiltradas.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💳</div>
            <div style={styles.emptyText}>
              {busqueda 
                ? 'No se encontraron pacientes con ese nombre'
                : 'No hay pacientes en esta categoría'
              }
            </div>
          </div>
        ) : (
          <div style={styles.cuentasList}>
            {cuentasFiltradas.map((cuenta) => (
              <div 
                key={cuenta.id} 
                style={styles.cuentaCard}
                onClick={() => navigate(`/paciente/${cuenta.id}`)}
              >
                <div style={styles.cuentaHeader}>
                  <div style={styles.cuentaAvatar}>
                    {cuenta.nombre.charAt(0)}{cuenta.apellido.charAt(0)}
                  </div>
                  <div style={styles.cuentaInfo}>
                    <div style={styles.cuentaNombre}>
                      {cuenta.nombre} {cuenta.apellido}
                    </div>
                    <div style={styles.cuentaActividad}>
                      Última actividad: {formatDate(cuenta.ultimaActividad)}
                    </div>
                  </div>
                  <div style={{
                    ...styles.cuentaSaldoBadge,
                    backgroundColor: getSaldoColor(cuenta.saldo)
                  }}>
                    {getSaldoTexto(cuenta.saldo)}
                  </div>
                </div>

                <div style={styles.cuentaDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Presupuestos:</span>
                    <span style={styles.detailValue}>
                      {cuenta.cantidadPresupuestos} • {formatMoney(cuenta.totalPresupuestos)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Pagos:</span>
                    <span style={styles.detailValue}>
                      {cuenta.cantidadPagos} • {formatMoney(cuenta.totalPagos)}
                    </span>
                  </div>
                  <div style={{...styles.detailRow, ...styles.detailRowTotal}}>
                    <span style={styles.detailLabelBold}>Saldo:</span>
                    <span style={{
                      ...styles.detailValueBold,
                      color: getSaldoColor(cuenta.saldo)
                    }}>
                      {formatMoney(Math.abs(cuenta.saldo))}
                      {cuenta.saldo < 0 && ' (a favor del paciente)'}
                    </span>
                  </div>
                </div>

                <div style={styles.cuentaFooter}>
                  <button
                    style={styles.viewButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/paciente/${cuenta.id}`)
                    }}
                  >
                    Ver Detalle →
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
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
  },
  statCardDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  statCardSuccess: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  statCardWarning: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #dbeafe',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flex: 1,
  },
  filterButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
    color: '#ffffff',
  },
  searchInput: {
    padding: '10px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    minWidth: '250px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  cuentasList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },
  cuentaCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cuentaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  cuentaAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  cuentaInfo: {
    flex: 1,
  },
  cuentaNombre: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  cuentaActividad: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  cuentaSaldoBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cuentaDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  detailRowTotal: {
    paddingTop: '8px',
    borderTop: '2px solid #e5e7eb',
    marginTop: '4px',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
  },
  detailLabelBold: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
  },
  detailValueBold: {
    fontSize: '16px',
    fontWeight: '700',
  },
  cuentaFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
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