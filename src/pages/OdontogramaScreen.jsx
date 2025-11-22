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
  const [loading, setLoading] = useState(true)
  const [selectedDiente, setSelectedDiente] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

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

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEstadoDiente = async (numero, nuevoEstado, observaciones = '') => {
    try {
      const estadoData = {
        paciente_id: paciente.id,
        numero_diente: numero,
        estado: nuevoEstado,
        color_estado: estadosConfig[nuevoEstado].color,
        observaciones,
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

      setEstadosDientes(prev => ({
        ...prev,
        [numero]: data
      }))

      console.log('✅ Estado actualizado:', data)
      setModalVisible(false)
      setSelectedDiente(null)
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

    for (let i = 1; i <= 32; i++) {
      const estado = estadosDientes[i]?.estado || 'sano'
      if (stats.hasOwnProperty(estado)) {
        stats[estado]++
      } else {
        stats.otros++
      }
    }

    // Contar sanos (los que no tienen registro)
    stats.sano += 32 - Object.keys(estadosDientes).length

    return stats
  }

  const DienteComponent = ({ numero }) => {
    const estado = estadosDientes[numero]
    const config = estadosConfig[estado?.estado || 'sano']
    const hasProcedimientos = procedimientos.some(p => p.numero_diente === numero)
    
    return (
      <div
        style={{
          ...styles.dienteContainer,
          ...(hasProcedimientos && styles.dienteConProcedimientos)
        }}
        onClick={() => {
          setSelectedDiente(numero)
          setModalVisible(true)
        }}
      >
        <div
          style={{
            ...styles.diente,
            backgroundColor: config.color,
            borderColor: config.border,
          }}
        >
          <div style={styles.dienteNumero}>{numero}</div>
          {hasProcedimientos && (
            <div style={styles.procedimientoIndicador}>●</div>
          )}
        </div>
        <div style={styles.estadoLabel}>{config.emoji}</div>
      </div>
    )
  }

  const EstadoButton = ({ estado, config }) => (
    <button
      style={styles.estadoButton}
      onClick={() => {
        if (selectedDiente) {
          updateEstadoDiente(selectedDiente, estado)
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
        <div style={{ width: '80px' }} />
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

              <div style={styles.modalSectionTitle}>Seleccionar nuevo estado:</div>
              
              <div style={styles.estadosGrid}>
                {Object.entries(estadosConfig).map(([estado, config]) => (
                  <EstadoButton key={estado} estado={estado} config={config} />
                ))}
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
    transition: 'transform 0.2s',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
    borderLeft: '3px solid #3b82f6',
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
    maxWidth: '600px',
    maxHeight: '80vh',
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