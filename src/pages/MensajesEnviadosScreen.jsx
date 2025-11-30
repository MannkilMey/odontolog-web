import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MensajesEnviadosScreen() {
  const navigate = useNavigate()
  
  const [mensajes, setMensajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    emails: 0,
    whatsapp: 0,
    esteMes: 0
  })
  
  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    canal: 'todos',
    busqueda: ''
  })
  
  // Paginación
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadData()
  }, [filtros, page])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Construir query base
      let query = supabase
        .from('mensajes_enviados')
        .select(`
          *,
          paciente:pacientes(nombre, apellido)
        `, { count: 'exact' })
        .eq('dentista_id', user.id)
        .order('fecha_enviado', { ascending: false })

      // Aplicar filtros
      if (filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo)
      }

      if (filtros.canal !== 'todos') {
        query = query.eq('canal', filtros.canal)
      }

      // Paginación
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data: mensajesData, error, count } = await query

      if (error) throw error

      setMensajes(mensajesData || [])

      // Cargar estadísticas
      await loadStats(user.id)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar mensajes')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (dentistaId) => {
    try {
      // Total de mensajes
      const { count: totalCount } = await supabase
        .from('mensajes_enviados')
        .select('*', { count: 'exact', head: true })
        .eq('dentista_id', dentistaId)

      // Emails
      const { count: emailsCount } = await supabase
        .from('mensajes_enviados')
        .select('*', { count: 'exact', head: true })
        .eq('dentista_id', dentistaId)
        .eq('canal', 'email')

      // WhatsApp
      const { count: whatsappCount } = await supabase
        .from('mensajes_enviados')
        .select('*', { count: 'exact', head: true })
        .eq('dentista_id', dentistaId)
        .eq('canal', 'whatsapp')

      // Este mes
      const primerDiaMes = new Date()
      primerDiaMes.setDate(1)
      primerDiaMes.setHours(0, 0, 0, 0)

      const { count: esteMesCount } = await supabase
        .from('mensajes_enviados')
        .select('*', { count: 'exact', head: true })
        .eq('dentista_id', dentistaId)
        .gte('fecha_enviado', primerDiaMes.toISOString())

      setStats({
        total: totalCount || 0,
        emails: emailsCount || 0,
        whatsapp: whatsappCount || 0,
        esteMes: esteMesCount || 0
      })

    } catch (error) {
      console.error('Error cargando stats:', error)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      recibo_pago: '🧾 Recibo de Pago',
      recibo_cuota: '📊 Recibo de Cuota',
      presupuesto: '📄 Presupuesto',
      recordatorio_cita: '🔔 Recordatorio de Cita',
      recordatorio_cuota: '💳 Recordatorio de Cuota'
    }
    return labels[tipo] || tipo
  }

  const getCanalIcon = (canal) => {
    return canal === 'email' ? '📧' : '📱'
  }

  const getEstadoColor = (estado) => {
    const colors = {
      enviado: '#10b981',
      fallido: '#ef4444',
      pendiente: '#f59e0b'
    }
    return colors[estado] || '#6b7280'
  }

  const buscarPorPaciente = async (texto) => {
    setFiltros({ ...filtros, busqueda: texto })
    
    if (!texto.trim()) {
      loadData()
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('mensajes_enviados')
        .select(`
          *,
          paciente:pacientes(nombre, apellido)
        `)
        .eq('dentista_id', user.id)
        .order('fecha_enviado', { ascending: false })

      // Buscar por nombre de paciente o destinatario
      const { data: mensajesData } = await query

      const filtrados = mensajesData?.filter(m => {
        const nombreCompleto = `${m.paciente?.nombre || ''} ${m.paciente?.apellido || ''}`.toLowerCase()
        const destinatario = (m.destinatario || '').toLowerCase()
        const busquedaLower = texto.toLowerCase()
        
        return nombreCompleto.includes(busquedaLower) || destinatario.includes(busquedaLower)
      })

      setMensajes(filtrados || [])

    } catch (error) {
      console.error('Error buscando:', error)
    }
  }

  const limpiarFiltros = () => {
    setFiltros({
      tipo: 'todos',
      canal: 'todos',
      busqueda: ''
    })
    setPage(1)
  }

  if (loading && mensajes.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando mensajes...</div>
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
          <div style={styles.title}>📬 Mensajes Enviados</div>
          <div style={styles.subtitle}>Historial de comunicaciones</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Enviados</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>📧</div>
            <div style={styles.statValue}>{stats.emails}</div>
            <div style={styles.statLabel}>Emails</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>📱</div>
            <div style={styles.statValue}>{stats.whatsapp}</div>
            <div style={styles.statLabel}>WhatsApp</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>📅</div>
            <div style={styles.statValue}>{stats.esteMes}</div>
            <div style={styles.statLabel}>Este Mes</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersTitle}>🔍 Filtros</div>
          
          <div style={styles.filtersGrid}>
            {/* Tipo de mensaje */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Tipo de Mensaje</label>
              <select
                style={styles.filterSelect}
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              >
                <option value="todos">Todos</option>
                <option value="recibo_pago">🧾 Recibos de Pago</option>
                <option value="recibo_cuota">📊 Recibos de Cuota</option>
                <option value="presupuesto">📄 Presupuestos</option>
                <option value="recordatorio_cita">🔔 Recordatorios de Cita</option>
                <option value="recordatorio_cuota">💳 Recordatorios de Cuota</option>
              </select>
            </div>

            {/* Canal */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Canal</label>
              <select
                style={styles.filterSelect}
                value={filtros.canal}
                onChange={(e) => setFiltros({ ...filtros, canal: e.target.value })}
              >
                <option value="todos">Todos</option>
                <option value="email">📧 Email</option>
                <option value="whatsapp">📱 WhatsApp</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Buscar Paciente</label>
              <input
                type="text"
                style={styles.filterInput}
                placeholder="Nombre o teléfono..."
                value={filtros.busqueda}
                onChange={(e) => buscarPorPaciente(e.target.value)}
              />
            </div>

            {/* Botón limpiar */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>&nbsp;</label>
              <button style={styles.clearButton} onClick={limpiarFiltros}>
                ✕ Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Mensajes */}
        <div style={styles.mensajesSection}>
          <div style={styles.mensajesHeader}>
            <div style={styles.mensajesTitle}>
              📋 Mensajes ({mensajes.length})
            </div>
          </div>

          {mensajes.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <div style={styles.emptyTitle}>No hay mensajes</div>
              <div style={styles.emptySubtitle}>
                No se encontraron mensajes con los filtros seleccionados
              </div>
            </div>
          ) : (
            <div style={styles.mensajesList}>
              {mensajes.map((mensaje, index) => (
                <div key={index} style={styles.mensajeCard}>
                  {/* Header del mensaje */}
                  <div style={styles.mensajeHeader}>
                    <div style={styles.mensajeTipo}>
                      {getTipoLabel(mensaje.tipo)}
                    </div>
                    <div style={styles.mensajeBadges}>
                      <span style={styles.canalBadge}>
                        {getCanalIcon(mensaje.canal)} {mensaje.canal}
                      </span>
                      <span style={{
                        ...styles.estadoBadge,
                        backgroundColor: getEstadoColor(mensaje.estado)
                      }}>
                        {mensaje.estado}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={styles.mensajeBody}>
                    <div style={styles.mensajeRow}>
                      <span style={styles.mensajeLabel}>👤 Paciente:</span>
                      <span style={styles.mensajeValue}>
                        {mensaje.paciente?.nombre} {mensaje.paciente?.apellido}
                      </span>
                    </div>

                    <div style={styles.mensajeRow}>
                      <span style={styles.mensajeLabel}>
                        {mensaje.canal === 'email' ? '📧 Email:' : '📱 Teléfono:'}
                      </span>
                      <span style={styles.mensajeValue}>
                        {mensaje.destinatario}
                      </span>
                    </div>

                    {mensaje.asunto && (
                      <div style={styles.mensajeRow}>
                        <span style={styles.mensajeLabel}>📋 Asunto:</span>
                        <span style={styles.mensajeValue}>
                          {mensaje.asunto}
                        </span>
                      </div>
                    )}

                    <div style={styles.mensajeRow}>
                      <span style={styles.mensajeLabel}>🕐 Fecha:</span>
                      <span style={styles.mensajeValue}>
                        {formatDateTime(mensaje.fecha_enviado)}
                      </span>
                    </div>

                    {/* Metadata */}
                    {mensaje.metadata && (
                      <div style={styles.metadata}>
                        {mensaje.metadata.numero_recibo && (
                          <span style={styles.metadataItem}>
                            🧾 {mensaje.metadata.numero_recibo}
                          </span>
                        )}
                        {mensaje.metadata.monto && (
                          <span style={styles.metadataItem}>
                            💰 Gs. {Number(mensaje.metadata.monto).toLocaleString()}
                          </span>
                        )}
                        {mensaje.metadata.cuota_numero && (
                          <span style={styles.metadataItem}>
                            📊 Cuota {mensaje.metadata.cuota_numero}/{mensaje.metadata.cuotas_totales}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        {mensajes.length > 0 && (
          <div style={styles.pagination}>
            <button
              style={{
                ...styles.paginationButton,
                ...(page === 1 && styles.paginationButtonDisabled)
              }}
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              ← Anterior
            </button>
            <span style={styles.paginationText}>Página {page}</span>
            <button
              style={{
                ...styles.paginationButton,
                ...(mensajes.length < itemsPerPage && styles.paginationButtonDisabled)
              }}
              onClick={() => setPage(page + 1)}
              disabled={mensajes.length < itemsPerPage}
            >
              Siguiente →
            </button>
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
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  filtersTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  filterSelect: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  filterInput: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
  },
  clearButton: {
    padding: '10px 12px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  mensajesSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  mensajesHeader: {
    marginBottom: '20px',
  },
  mensajesTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '8px',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  mensajesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  mensajeCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    transition: 'all 0.2s',
  },
  mensajeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  mensajeTipo: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  mensajeBadges: {
    display: 'flex',
    gap: '8px',
  },
  canalBadge: {
    padding: '4px 12px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  estadoBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  mensajeBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mensajeRow: {
    display: 'flex',
    gap: '8px',
  },
  mensajeLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    minWidth: '120px',
  },
  mensajeValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '400',
  },
  metadata: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  },
  metadataItem: {
    padding: '6px 12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
    padding: '20px',
  },
  paginationButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  paginationText: {
    fontSize: '14px',
    fontWeight: '600',
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