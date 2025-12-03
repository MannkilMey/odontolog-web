import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OdontogramaScreen() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [paciente, setPaciente] = useState(null)
  const [estadosDientes, setEstadosDientes] = useState({})
  const [procedimientos, setProcedimientos] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDiente, setSelectedDiente] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [historialVisible, setHistorialVisible] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [hoveredDiente, setHoveredDiente] = useState(null)

  // Array de todos los números de dientes válidos
  const todosDientes = [
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48
  ]

  // Configuración de estados con colores mejorados
  const estadosConfig = {
    sano: { 
      color: '#FFFFFF', 
      nombre: 'Sano', 
      border: '#E5E7EB',
      emoji: '⚪'
    },
    cariado: { 
      color: '#DC2626', 
      nombre: 'Cariado', 
      border: '#991B1B',
      emoji: '🔴'
    },
    obturado: { 
      color: '#2563EB', 
      nombre: 'Obturado', 
      border: '#1E40AF',
      emoji: '🔵'
    },
    corona: { 
      color: '#F59E0B', 
      nombre: 'Corona', 
      border: '#D97706',
      emoji: '🟡'
    },
    ausente: { 
      color: '#6B7280', 
      nombre: 'Ausente', 
      border: '#4B5563',
      emoji: '⚫'
    },
    implante: { 
      color: '#10B981', 
      nombre: 'Implante', 
      border: '#059669',
      emoji: '🟢'
    },
    endodoncia: { 
      color: '#92400E', 
      nombre: 'Endodoncia', 
      border: '#78350F',
      emoji: '🟤'
    },
    fracturado: { 
      color: '#EF4444', 
      nombre: 'Fracturado', 
      border: '#DC2626',
      emoji: '🔶'
    },
    por_extraer: { 
      color: '#F97316', 
      nombre: 'Por Extraer', 
      border: '#EA580C',
      emoji: '🟠'
    },
    blanqueado: {
      color: '#F3F4F6',
      nombre: 'Blanqueado',
      border: '#D1D5DB',
      emoji: '⬜'
    },
    con_brackets: {
      color: '#7C3AED',
      nombre: 'Con Brackets',
      border: '#6D28D9',
      emoji: '🟣'
    },
    con_retenedor: {
      color: '#8B5CF6',
      nombre: 'Con Retenedor',
      border: '#7C3AED',
      emoji: '🟪'
    },
    sellador: {
      color: '#06B6D4',
      nombre: 'Sellador',
      border: '#0891B2',
      emoji: '🔷'
    }
  }

  useEffect(() => {
    if (location.state?.paciente) {
      setPaciente(location.state.paciente)
      loadOdontogramaData(location.state.paciente.id)
    } else {
      loadPacienteFromDB()
    }
  }, [id])

  const loadPacienteFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setPaciente(data)
      loadOdontogramaData(data.id)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar paciente')
      navigate('/clientes')
    }
  }

  const loadOdontogramaData = async (pacienteId) => {
    try {
      setLoading(true)

      // Cargar estados de dientes
      const { data: estados, error: estadosError } = await supabase
        .from('estados_dientes')
        .select('*')
        .eq('paciente_id', pacienteId)

      if (estadosError) {
        console.error('Error loading estados dientes:', estadosError)
      } else {
        const estadosMap = {}
        estados?.forEach(estado => {
          estadosMap[estado.numero_diente] = estado
        })
        setEstadosDientes(estadosMap)
      }

      // Cargar procedimientos
      const { data: procData, error: procError } = await supabase
        .from('procedimientos_dentales')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_procedimiento', { ascending: false })

      if (procError) {
        console.error('Error loading procedimientos:', procError)
      } else {
        setProcedimientos(procData || [])
      }

      // Cargar historial
      const { data: histData, error: histError } = await supabase
        .from('historial_estados_dientes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_cambio', { ascending: false })

      if (histError) {
        console.error('Error loading historial:', histError)
      } else {
        setHistorial(histData || [])
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEstadoDiente = async (numero, nuevoEstado, obs = '') => {
    try {
      // Obtener estado anterior
      const estadoAnterior = estadosDientes[numero]?.estado || 'sano'

      // Actualizar estado actual
      const estadoData = {
        paciente_id: paciente.id,
        numero_diente: numero,
        estado: nuevoEstado,
        color_estado: estadosConfig[nuevoEstado].color,
        observaciones: obs,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('estados_dientes')
        .upsert(estadoData, {
          onConflict: 'paciente_id,numero_diente'
        })
        .select()
        .single()

      if (error) throw error

      // Guardar en historial
      const historialData = {
        paciente_id: paciente.id,
        numero_diente: numero,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        observaciones: obs,
        fecha_cambio: new Date().toISOString()
      }

      const { error: histError } = await supabase
        .from('historial_estados_dientes')
        .insert(historialData)

      if (histError) {
        console.error('Error guardando historial:', histError)
      }

      // Actualizar estados locales
      setEstadosDientes(prev => ({
        ...prev,
        [numero]: data
      }))

      // Recargar historial
      await loadOdontogramaData(paciente.id)

      console.log('✅ Estado actualizado:', data)
      setModalVisible(false)
      setSelectedDiente(null)
      setObservaciones('')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar estado del diente')
    }
  }

  const getEstadoStats = () => {
    const stats = {
      sano: 0,
      cariado: 0,
      obturado: 0,
      ausente: 0,
      otros: 0
    }

    // Iterar sobre TODOS los 32 dientes válidos
    todosDientes.forEach(numero => {
      const estado = estadosDientes[numero]?.estado || 'sano'
      if (stats.hasOwnProperty(estado)) {
        stats[estado]++
      } else {
        stats.otros++
      }
    })

    return stats
  }

  const getHistorialDiente = (numero) => {
    return historial.filter(h => h.numero_diente === numero)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const DienteComponent = ({ numero }) => {
    const estado = estadosDientes[numero]
    const config = estadosConfig[estado?.estado || 'sano']
    const hasProcedimientos = procedimientos.some(p => p.numero_diente === numero)
    const historialDiente = getHistorialDiente(numero)
    const isHovered = hoveredDiente === numero
    
    return (
      <div
        style={{
          ...styles.dienteContainer,
          ...(hasProcedimientos && styles.dienteConProcedimientos),
          position: 'relative'
        }}
        onClick={() => {
          setSelectedDiente(numero)
          setModalVisible(true)
          setObservaciones(estado?.observaciones || '')
        }}
        onMouseEnter={() => setHoveredDiente(numero)}
        onMouseLeave={() => setHoveredDiente(null)}
      >
        <div
          style={{
            ...styles.diente,
            backgroundColor: config.color,
            borderColor: config.border,
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={styles.dienteNumero}>{numero}</div>
          {hasProcedimientos && (
            <div style={styles.procedimientoIndicador}>●</div>
          )}
        </div>
        <div style={styles.estadoLabel}>{config.emoji}</div>

        {/* Tooltip */}
        {isHovered && (
          <div style={styles.tooltip}>
            <div style={styles.tooltipTitle}>Diente #{numero}</div>
            <div style={styles.tooltipRow}>
              <span style={styles.tooltipLabel}>Estado:</span>
              <span style={styles.tooltipValue}>{config.emoji} {config.nombre}</span>
            </div>
            {estado?.updated_at && (
              <div style={styles.tooltipRow}>
                <span style={styles.tooltipLabel}>Actualizado:</span>
                <span style={styles.tooltipValue}>
                  {new Date(estado.updated_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
            {historialDiente.length > 0 && (
              <div style={styles.tooltipRow}>
                <span style={styles.tooltipLabel}>Cambios:</span>
                <span style={styles.tooltipValue}>{historialDiente.length}</span>
              </div>
            )}
            {estado?.observaciones && (
              <div style={styles.tooltipObs}>
                📝 {estado.observaciones}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const EstadoButton = ({ estado, config }) => (
    <button
      style={styles.estadoButton}
      onClick={() => {
        if (selectedDiente) {
          updateEstadoDiente(selectedDiente, estado, observaciones)
        }
      }}
    >
      <div style={styles.estadoButtonEmoji}>{config.emoji}</div>
      <div style={styles.estadoButtonText}>{config.nombre}</div>
      <div 
        style={{
          ...styles.estadoButtonColor,
          backgroundColor: config.color,
          borderColor: config.border
        }}
      />
    </button>
  )

  if (!paciente) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando...</div>
      </div>
    )
  }

  const stats = getEstadoStats()
  const historialDienteSeleccionado = selectedDiente ? getHistorialDiente(selectedDiente) : []

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/paciente/${paciente.id}`)} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>🦷 Odontograma</div>
          <div style={styles.subtitle}>{paciente.nombre} {paciente.apellido}</div>
        </div>
        <button 
          style={styles.historialButton}
          onClick={() => setHistorialVisible(!historialVisible)}
        >
          📋 Historial
        </button>
      </div>

      <div style={styles.content}>
        {/* Resumen de estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>⚪</div>
            <div style={styles.statNumber}>{stats.sano}</div>
            <div style={styles.statLabel}>Sanos</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>🔴</div>
            <div style={styles.statNumber}>{stats.cariado}</div>
            <div style={styles.statLabel}>Cariados</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>🔵</div>
            <div style={styles.statNumber}>{stats.obturado}</div>
            <div style={styles.statLabel}>Obturados</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>⚫</div>
            <div style={styles.statNumber}>{stats.ausente}</div>
            <div style={styles.statLabel}>Ausentes</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>📊</div>
            <div style={styles.statNumber}>{stats.otros}</div>
            <div style={styles.statLabel}>Otros</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statEmoji}>🦷</div>
            <div style={styles.statNumber}>32</div>
            <div style={styles.statLabel}>Total</div>
          </div>
        </div>

        {/* Odontograma */}
        <div style={styles.odontogramaContainer}>
          {/* Arcada Superior */}
          <div style={styles.arcadaSection}>
            <div style={styles.arcadaTitle}>═══════════ ARCADA SUPERIOR ═══════════</div>
            
            <div style={styles.arcadaRow}>
              {/* Superior Derecha (18-11) */}
              <div style={styles.cuadrante}>
                <div style={styles.cuadranteLabel}>DERECHA</div>
                <div style={styles.dientesRow}>
                  {[18, 17, 16, 15, 14, 13, 12, 11].map(num => (
                    <DienteComponent key={num} numero={num} />
                  ))}
                </div>
              </div>

              <div style={styles.separator}>│</div>

              {/* Superior Izquierda (21-28) */}
              <div style={styles.cuadrante}>
                <div style={styles.cuadranteLabel}>IZQUIERDA</div>
                <div style={styles.dientesRow}>
                  {[21, 22, 23, 24, 25, 26, 27, 28].map(num => (
                    <DienteComponent key={num} numero={num} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.arcadaDivider}>
            ─────────────────────────────────────────
          </div>

          {/* Arcada Inferior */}
          <div style={styles.arcadaSection}>
            <div style={styles.arcadaTitle}>═══════════ ARCADA INFERIOR ═══════════</div>
            
            <div style={styles.arcadaRow}>
              {/* Inferior Derecha (48-41) */}
              <div style={styles.cuadrante}>
                <div style={styles.cuadranteLabel}>DERECHA</div>
                <div style={styles.dientesRow}>
                  {[48, 47, 46, 45, 44, 43, 42, 41].map(num => (
                    <DienteComponent key={num} numero={num} />
                  ))}
                </div>
              </div>

              <div style={styles.separator}>│</div>

              {/* Inferior Izquierda (31-38) */}
              <div style={styles.cuadrante}>
                <div style={styles.cuadranteLabel}>IZQUIERDA</div>
                <div style={styles.dientesRow}>
                  {[31, 32, 33, 34, 35, 36, 37, 38].map(num => (
                    <DienteComponent key={num} numero={num} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda de estados */}
        <div style={styles.leyendaContainer}>
          <div style={styles.leyendaTitle}>🎨 Leyenda de Estados</div>
          <div style={styles.leyendaGrid}>
            {Object.entries(estadosConfig).map(([key, config]) => (
              <div key={key} style={styles.leyendaItem}>
                <span style={styles.leyendaEmoji}>{config.emoji}</span>
                <span style={styles.leyendaNombre}>{config.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historial General (Panel Desplegable) */}
        {historialVisible && historial.length > 0 && (
          <div style={styles.historialGeneralSection}>
            <div style={styles.historialGeneralTitle}>
              📋 Historial Completo de Cambios ({historial.length})
            </div>
            <div style={styles.historialGeneralList}>
              {historial.slice(0, 20).map((item, index) => (
                <div key={index} style={styles.historialGeneralItem}>
                  <div style={styles.historialGeneralHeader}>
                    <span style={styles.historialGeneralDiente}>
                      🦷 Diente #{item.numero_diente}
                    </span>
                    <span style={styles.historialGeneralFecha}>
                      {formatDateTime(item.fecha_cambio)}
                    </span>
                  </div>
                  <div style={styles.historialGeneralCambio}>
                    {estadosConfig[item.estado_anterior]?.emoji || '⚪'} {estadosConfig[item.estado_anterior]?.nombre || 'Sano'}
                    {' → '}
                    {estadosConfig[item.estado_nuevo]?.emoji} {estadosConfig[item.estado_nuevo]?.nombre}
                  </div>
                  {item.observaciones && (
                    <div style={styles.historialGeneralObs}>
                      📝 {item.observaciones}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimos procedimientos */}
        {procedimientos.length > 0 && (
          <div style={styles.procedimientosSection}>
            <div style={styles.procedimientosTitle}>
              📋 Últimos Procedimientos ({procedimientos.length})
            </div>
            <div style={styles.procedimientosList}>
              {procedimientos.slice(0, 5).map((proc, index) => (
                <div key={index} style={styles.procedimientoItem}>
                  <div style={styles.procedimientoHeader}>
                    <span style={styles.procedimientoNombre}>
                      {proc.procedimiento}
                    </span>
                    <span style={styles.procedimientoFecha}>
                      {new Date(proc.fecha_procedimiento).toLocaleDateString()}
                    </span>
                  </div>
                  {proc.numero_diente && (
                    <div style={styles.procedimientoDiente}>
                      🦷 Diente #{proc.numero_diente}
                    </div>
                  )}
                  {proc.costo && (
                    <div style={styles.procedimientoCosto}>
                      Gs. {Number(proc.costo).toLocaleString('es-PY')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal para cambiar estado */}
      {modalVisible && (
        <div style={styles.modalOverlay} onClick={() => setModalVisible(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                🦷 Diente #{selectedDiente}
              </div>
              <button
                style={styles.modalClose}
                onClick={() => setModalVisible(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalSubtitle}>
                Estado actual: {estadosConfig[estadosDientes[selectedDiente]?.estado || 'sano'].emoji} {estadosConfig[estadosDientes[selectedDiente]?.estado || 'sano'].nombre}
              </div>

              {/* Historial del diente */}
              {historialDienteSeleccionado.length > 0 && (
                <div style={styles.historialDienteSection}>
                  <div style={styles.historialDienteTitle}>
                    📜 Historial de Cambios ({historialDienteSeleccionado.length})
                  </div>
                  <div style={styles.historialDienteList}>
                    {historialDienteSeleccionado.slice(0, 3).map((item, index) => (
                      <div key={index} style={styles.historialDienteItem}>
                        <div style={styles.historialDienteCambio}>
                          {estadosConfig[item.estado_anterior]?.emoji || '⚪'} {estadosConfig[item.estado_anterior]?.nombre || 'Sano'}
                          {' → '}
                          {estadosConfig[item.estado_nuevo]?.emoji} {estadosConfig[item.estado_nuevo]?.nombre}
                        </div>
                        <div style={styles.historialDienteFecha}>
                          {formatDateTime(item.fecha_cambio)}
                        </div>
                        {item.observaciones && (
                          <div style={styles.historialDienteObs}>
                            📝 {item.observaciones}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.modalSectionTitle}>Seleccionar nuevo estado:</div>
              
              <div style={styles.estadosGrid}>
                {Object.entries(estadosConfig).map(([estado, config]) => (
                  <EstadoButton key={estado} estado={estado} config={config} />
                ))}
              </div>

              {/* Campo de observaciones */}
              <div style={styles.observacionesSection}>
                <label style={styles.observacionesLabel}>
                  📝 Observaciones (opcional):
                </label>
                <textarea
                  style={styles.observacionesTextarea}
                  placeholder="Ej: Obturación con resina compuesta, sin complicaciones..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
  historialButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
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
    overflowY: 'auto',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statEmoji: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  odontogramaContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '24px',
    border: '2px solid #e5e7eb',
  },
  arcadaSection: {
    marginBottom: '24px',
  },
  arcadaTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: '24px',
    letterSpacing: '2px',
  },
  arcadaRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  cuadrante: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cuadranteLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  dientesRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
  },
  separator: {
    fontSize: '32px',
    color: '#d1d5db',
    fontWeight: '100',
  },
  arcadaDivider: {
    textAlign: 'center',
    color: '#d1d5db',
    margin: '24px 0',
    fontSize: '14px',
  },
  dienteContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
  },
  dienteConProcedimientos: {
    position: 'relative',
  },
  diente: {
    width: '50px',
    height: '60px',
    borderRadius: '8px 8px 4px 4px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.2s',
  },
  dienteNumero: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#374151',
  },
  procedimientoIndicador: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    color: '#ef4444',
    fontSize: '8px',
  },
  estadoLabel: {
    fontSize: '16px',
    marginTop: '4px',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '12px',
    width: '200px',
    zIndex: 1000,
    marginBottom: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  tooltipTitle: {
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '8px',
    borderBottom: '1px solid #374151',
    paddingBottom: '4px',
  },
  tooltipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  tooltipLabel: {
    color: '#9ca3af',
  },
  tooltipValue: {
    fontWeight: '600',
  },
  tooltipObs: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #374151',
    fontSize: '11px',
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  leyendaContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  leyendaTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  leyendaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  leyendaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  leyendaEmoji: {
    fontSize: '20px',
  },
  leyendaNombre: {
    fontSize: '14px',
    color: '#374151',
  },
  historialGeneralSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '2px solid #3b82f6',
  },
  historialGeneralTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '16px',
  },
  historialGeneralList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  historialGeneralItem: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '3px solid #3b82f6',
  },
  historialGeneralHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  historialGeneralDiente: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  historialGeneralFecha: {
    fontSize: '12px',
    color: '#6b7280',
  },
  historialGeneralCambio: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '4px',
  },
  historialGeneralObs: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb',
  },
  procedimientosSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  procedimientosTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  procedimientosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  procedimientoItem: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },
  procedimientoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  procedimientoNombre: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  procedimientoFecha: {
    fontSize: '12px',
    color: '#6b7280',
  },
  procedimientoDiente: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  procedimientoCosto: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalBody: {
    padding: '24px',
  },
  modalSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  historialDienteSection: {
    backgroundColor: '#eff6ff',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
  },
  historialDienteTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '12px',
  },
  historialDienteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historialDienteItem: {
    backgroundColor: '#ffffff',
    padding: '12px',
    borderRadius: '6px',
    borderLeft: '2px solid #3b82f6',
  },
  historialDienteCambio: {
    fontSize: '13px',
    color: '#374151',
    marginBottom: '4px',
    fontWeight: '500',
  },
  historialDienteFecha: {
    fontSize: '11px',
    color: '#6b7280',
  },
  historialDienteObs: {
    fontSize: '11px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #e5e7eb',
  },
  modalSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
  },
  estadosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  estadoButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  estadoButtonEmoji: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  estadoButtonText: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginBottom: '8px',
  },
  estadoButtonColor: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    border: '1px solid',
  },
  observacionesSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  observacionesLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'block',
    marginBottom: '8px',
  },
  observacionesTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
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