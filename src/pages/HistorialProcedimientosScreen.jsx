import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HistorialProcedimientosScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [procedimientos, setProcedimientos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [config, setConfig] = useState(null)
  
  // Filtros
  const [filtroPaciente, setFiltroPaciente] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('todos') // todos, hoy, semana, mes, año
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

      // Cargar pacientes para filtros
      const { data: pacientesData } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido')
        .eq('dentista_id', user.id)
        .order('apellido')

      setPacientes(pacientesData || [])

      // Cargar procedimientos con información del paciente y catálogo
      const { data: procedimientosData, error } = await supabase
        .from('procedimientos_dentales')
        .select(`
          *,
          pacientes (
            id,
            nombre,
            apellido
          ),
          catalogo_procedimientos (
            nombre_procedimiento,
            categoria
          )
        `)
        .eq('dentista_id', user.id)
        .order('fecha_procedimiento', { ascending: false })

      if (error) throw error
      setProcedimientos(procedimientosData || [])

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
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Aplicar filtros
  const procedimientosFiltrados = procedimientos.filter(proc => {
    // Filtro por paciente
    if (filtroPaciente !== 'todos' && proc.paciente_id !== filtroPaciente) {
      return false
    }

    // Filtro por fecha
    if (filtroFecha !== 'todos') {
      const fechaProc = new Date(proc.fecha_procedimiento)
      const hoy = new Date()
      
      if (filtroFecha === 'hoy') {
        if (fechaProc.toDateString() !== hoy.toDateString()) return false
      } else if (filtroFecha === 'semana') {
        const semanaAtras = new Date(hoy)
        semanaAtras.setDate(hoy.getDate() - 7)
        if (fechaProc < semanaAtras) return false
      } else if (filtroFecha === 'mes') {
        if (fechaProc.getMonth() !== hoy.getMonth() || 
            fechaProc.getFullYear() !== hoy.getFullYear()) return false
      } else if (filtroFecha === 'año') {
        if (fechaProc.getFullYear() !== hoy.getFullYear()) return false
      }
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      const nombrePaciente = `${proc.pacientes?.nombre} ${proc.pacientes?.apellido}`.toLowerCase()
      const nombreProc = proc.catalogo_procedimientos?.nombre_procedimiento?.toLowerCase() || ''
      const notas = proc.descripcion?.toLowerCase() || ''
      
      if (!nombrePaciente.includes(termino) && 
          !nombreProc.includes(termino) && 
          !notas.includes(termino)) {
        return false
      }
    }

    return true
  })

  // Estadísticas
  const stats = {
    totalProcedimientos: procedimientosFiltrados.length,
    ingresoTotal: procedimientosFiltrados.reduce((sum, p) => sum + Number(p.precio_final || 0), 0),
    procedimientoMasComun: '',
    categorias: {}
  }

  // Contar procedimientos por tipo
  const contadores = {}
  procedimientosFiltrados.forEach(proc => {
    const nombre = proc.catalogo_procedimientos?.nombre_procedimiento || 'Sin categoría'
    contadores[nombre] = (contadores[nombre] || 0) + 1
    
    const categoria = proc.catalogo_procedimientos?.categoria || 'otros'
    stats.categorias[categoria] = (stats.categorias[categoria] || 0) + 1
  })

  if (Object.keys(contadores).length > 0) {
    stats.procedimientoMasComun = Object.keys(contadores).reduce((a, b) => 
      contadores[a] > contadores[b] ? a : b
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando historial...</div>
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
          <div style={styles.title}>🦷 Historial de Procedimientos</div>
          <div style={styles.subtitle}>
            {procedimientosFiltrados.length} de {procedimientos.length} procedimientos
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Procedimientos</div>
            <div style={styles.statValue}>{stats.totalProcedimientos}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Ingreso Generado</div>
            <div style={styles.statValue}>{formatMoney(stats.ingresoTotal)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Más Común</div>
            <div style={{...styles.statValue, fontSize: '16px'}}>
              {stats.procedimientoMasComun || 'N/A'}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtersSection}>
          {/* Búsqueda */}
          <input
            type="text"
            style={styles.searchInput}
            placeholder="🔍 Buscar por paciente, procedimiento o notas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div style={styles.filtersRow}>
            {/* Filtro por Paciente */}
            <select
              style={styles.filterSelect}
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
            >
              <option value="todos">👤 Todos los pacientes</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </select>

            {/* Filtro por Fecha */}
            <select
              style={styles.filterSelect}
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            >
              <option value="todos">📅 Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Este mes</option>
              <option value="año">Este año</option>
            </select>

            {/* Botón limpiar filtros */}
            {(filtroPaciente !== 'todos' || filtroFecha !== 'todos' || busqueda) && (
              <button
                style={styles.clearButton}
                onClick={() => {
                  setFiltroPaciente('todos')
                  setFiltroFecha('todos')
                  setBusqueda('')
                }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Procedimientos */}
        {procedimientosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🦷</div>
            <div style={styles.emptyText}>
              {procedimientos.length === 0 
                ? 'No hay procedimientos registrados'
                : 'No se encontraron procedimientos con los filtros seleccionados'
              }
            </div>
          </div>
        ) : (
          <div style={styles.procedimientosList}>
            {procedimientosFiltrados.map((proc, index) => (
              <div 
                key={index} 
                style={styles.procedimientoCard}
                onClick={() => navigate(`/paciente/${proc.paciente_id}`)}
              >
                <div style={styles.procHeader}>
                  <div style={styles.procFecha}>
                    📅 {formatDate(proc.fecha_procedimiento)}
                  </div>
                  <div style={styles.procPrecio}>
                    {formatMoney(proc.precio_final || 0)}
                  </div>
                </div>

                <div style={styles.procPaciente}>
                  👤 {proc.pacientes?.nombre} {proc.pacientes?.apellido}
                </div>

                <div style={styles.procNombre}>
                  {proc.catalogo_procedimientos?.nombre_procedimiento || 'Procedimiento sin categoría'}
                </div>

                {proc.diente && (
                  <div style={styles.procDiente}>
                    🦷 Diente #{proc.numero_diente}
                  </div>
                )}

                {proc.notas && (
                  <div style={styles.procNotas}>
                    {proc.descripcion}
                  </div>
                )}

                <div style={styles.procFooter}>
                  <div style={styles.procCategoria}>
                    {proc.catalogo_procedimientos?.categoria || 'general'}
                  </div>
                  <div style={styles.verMas}>Ver paciente →</div>
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
    maxWidth: '1400px',
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
    padding: '20px',
    border: '2px solid #dbeafe',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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
  procedimientosList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px',
  },
  procedimientoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #dbeafe',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  procHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  procFecha: {
    fontSize: '13px',
    color: '#6b7280',
  },
  procPrecio: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#10b981',
  },
  procPaciente: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '8px',
  },
  procNombre: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  procDiente: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  procNotas: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  procFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  procCategoria: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  verMas: {
    fontSize: '13px',
    color: '#3b82f6',
    fontWeight: '600',
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