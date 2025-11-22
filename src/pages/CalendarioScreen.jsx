import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CalendarioScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [vistaActual, setVistaActual] = useState('dia') // 'dia', 'semana', 'mes'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [fechaSeleccionada, vistaActual])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar pacientes para el dropdown
      const { data: pacientesData } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido')
        .eq('dentista_id', user.id)
        .order('apellido')

      setPacientes(pacientesData || [])

      // Calcular rango de fechas según la vista
      const { fechaInicio, fechaFin } = getRangoFechas()

      // Cargar citas del rango
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select(`
          *,
          pacientes (
            nombre,
            apellido,
            telefono
          )
        `)
        .eq('dentista_id', user.id)
        .gte('fecha_cita', fechaInicio)
        .lte('fecha_cita', fechaFin)
        .order('fecha_cita')
        .order('hora_inicio')

      if (citasError) throw citasError
      setCitas(citasData || [])

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  const getRangoFechas = () => {
    const fecha = new Date(fechaSeleccionada)
    let fechaInicio, fechaFin

    if (vistaActual === 'dia') {
      fechaInicio = formatDate(fecha)
      fechaFin = formatDate(fecha)
    } else if (vistaActual === 'semana') {
      // Inicio de semana (domingo)
      const inicioSemana = new Date(fecha)
      inicioSemana.setDate(fecha.getDate() - fecha.getDay())
      
      // Fin de semana (sábado)
      const finSemana = new Date(inicioSemana)
      finSemana.setDate(inicioSemana.getDate() + 6)
      
      fechaInicio = formatDate(inicioSemana)
      fechaFin = formatDate(finSemana)
    } else { // mes
      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
      
      fechaInicio = formatDate(inicioMes)
      fechaFin = formatDate(finMes)
    }

    return { fechaInicio, fechaFin }
  }

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDateDisplay = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    return timeString.slice(0, 5) // "HH:MM:SS" -> "HH:MM"
  }

  const cambiarFecha = (direccion) => {
    const nuevaFecha = new Date(fechaSeleccionada)
    
    if (vistaActual === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() + direccion)
    } else if (vistaActual === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7))
    } else { // mes
      nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion)
    }
    
    setFechaSeleccionada(nuevaFecha)
  }

  const irHoy = () => {
    setFechaSeleccionada(new Date())
  }

  const getEstadoColor = (estado) => {
    const colores = {
      pendiente: '#f59e0b',
      confirmada: '#3b82f6',
      en_proceso: '#8b5cf6',
      completada: '#10b981',
      cancelada: '#ef4444',
      no_asistio: '#6b7280'
    }
    return colores[estado] || '#6b7280'
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      en_proceso: 'En Proceso',
      completada: 'Completada',
      cancelada: 'Cancelada',
      no_asistio: 'No Asistió'
    }
    return labels[estado] || estado
  }

  // Agrupar citas por fecha (para vista de semana/mes)
  const citasPorFecha = citas.reduce((acc, cita) => {
    const fecha = cita.fecha_cita
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(cita)
    return acc
  }, {})

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando calendario...</div>
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
          <div style={styles.title}>📅 Calendario de Citas</div>
          <div style={styles.subtitle}>{citas.length} citas programadas</div>
        </div>
        <button 
          onClick={() => navigate('/crear-cita')} 
          style={styles.addButton}
        >
          + Nueva Cita
        </button>
      </div>

      <div style={styles.content}>
        {/* Controles del Calendario */}
        <div style={styles.controls}>
          {/* Selector de Vista */}
          <div style={styles.viewSelector}>
            <button
              style={{
                ...styles.viewButton,
                ...(vistaActual === 'dia' && styles.viewButtonActive)
              }}
              onClick={() => setVistaActual('dia')}
            >
              Día
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(vistaActual === 'semana' && styles.viewButtonActive)
              }}
              onClick={() => setVistaActual('semana')}
            >
              Semana
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(vistaActual === 'mes' && styles.viewButtonActive)
              }}
              onClick={() => setVistaActual('mes')}
            >
              Mes
            </button>
          </div>

          {/* Navegación de Fechas */}
          <div style={styles.dateNavigation}>
            <button style={styles.navButton} onClick={() => cambiarFecha(-1)}>
              ←
            </button>
            <button style={styles.todayButton} onClick={irHoy}>
              Hoy
            </button>
            <button style={styles.navButton} onClick={() => cambiarFecha(1)}>
              →
            </button>
          </div>
        </div>

        {/* Título de Fecha */}
        <div style={styles.dateTitle}>
          {vistaActual === 'dia' && formatDateDisplay(formatDate(fechaSeleccionada))}
          {vistaActual === 'semana' && `Semana del ${formatDate(fechaSeleccionada)}`}
          {vistaActual === 'mes' && new Date(fechaSeleccionada).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </div>

        {/* Vista del Calendario */}
        {vistaActual === 'dia' && (
          <VistaDia 
            citas={citas} 
            fecha={formatDate(fechaSeleccionada)}
            navigate={navigate}
            formatTime={formatTime}
            getEstadoColor={getEstadoColor}
            getEstadoLabel={getEstadoLabel}
          />
        )}

        {vistaActual === 'semana' && (
          <VistaSemana 
            citasPorFecha={citasPorFecha}
            fechaSeleccionada={fechaSeleccionada}
            navigate={navigate}
            formatTime={formatTime}
            getEstadoColor={getEstadoColor}
          />
        )}

        {vistaActual === 'mes' && (
          <VistaMes 
            citasPorFecha={citasPorFecha}
            fechaSeleccionada={fechaSeleccionada}
            navigate={navigate}
            getEstadoColor={getEstadoColor}
          />
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>Diseñado por MCorp</div>
      </div>
    </div>
  )
}

// Componente Vista Día
function VistaDia({ citas, fecha, navigate, formatTime, getEstadoColor, getEstadoLabel }) {
  const citasDelDia = citas.filter(c => c.fecha_cita === fecha)

  if (citasDelDia.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📅</div>
        <div style={styles.emptyText}>No hay citas programadas para este día</div>
        <button 
          style={styles.emptyButton}
          onClick={() => navigate('/crear-cita')}
        >
          + Programar Cita
        </button>
      </div>
    )
  }

  return (
    <div style={styles.citasList}>
      {citasDelDia.map((cita, index) => (
        <div 
          key={index} 
          style={{
            ...styles.citaCard,
            borderLeftColor: getEstadoColor(cita.estado)
          }}
          onClick={() => navigate(`/cita/${cita.id}`)}
        >
          <div style={styles.citaHeader}>
            <div style={styles.citaTime}>
              {formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)}
            </div>
            <div style={{
              ...styles.citaEstado,
              backgroundColor: getEstadoColor(cita.estado)
            }}>
              {getEstadoLabel(cita.estado)}
            </div>
          </div>

          <div style={styles.citaPaciente}>
            {cita.pacientes?.nombre} {cita.pacientes?.apellido}
          </div>

          <div style={styles.citaMotivo}>
            {cita.motivo}
          </div>

          {cita.notas && (
            <div style={styles.citaNotas}>
              {cita.notas}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Componente Vista Semana
function VistaSemana({ citasPorFecha, fechaSeleccionada, navigate, formatTime, getEstadoColor }) {
  const inicioSemana = new Date(fechaSeleccionada)
  inicioSemana.setDate(fechaSeleccionada.getDate() - fechaSeleccionada.getDay())
  
  const diasSemana = []
  for (let i = 0; i < 7; i++) {
    const dia = new Date(inicioSemana)
    dia.setDate(inicioSemana.getDate() + i)
    diasSemana.push(dia)
  }

  return (
    <div style={styles.semanaGrid}>
      {diasSemana.map((dia, index) => {
        const fechaStr = dia.toISOString().split('T')[0]
        const citasDelDia = citasPorFecha[fechaStr] || []
        const esHoy = fechaStr === new Date().toISOString().split('T')[0]

        return (
          <div key={index} style={styles.diaCard}>
            <div style={{
              ...styles.diaHeader,
              ...(esHoy && styles.diaHeaderHoy)
            }}>
              <div style={styles.diaNombre}>
                {dia.toLocaleDateString('es-ES', { weekday: 'short' })}
              </div>
              <div style={styles.diaNumero}>{dia.getDate()}</div>
            </div>

            <div style={styles.citasMini}>
              {citasDelDia.length === 0 ? (
                <div style={styles.noCitas}>Sin citas</div>
              ) : (
                citasDelDia.map((cita, idx) => (
                  <div 
                    key={idx}
                    style={{
                      ...styles.citaMini,
                      borderLeftColor: getEstadoColor(cita.estado)
                    }}
                    onClick={() => navigate(`/cita/${cita.id}`)}
                  >
                    <div style={styles.citaMiniTime}>
                      {formatTime(cita.hora_inicio)}
                    </div>
                    <div style={styles.citaMiniPaciente}>
                      {cita.pacientes?.apellido}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Componente Vista Mes
function VistaMes({ citasPorFecha, fechaSeleccionada, navigate, getEstadoColor }) {
  const primerDia = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1)
  const ultimoDia = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth() + 1, 0)
  
  const diasMes = []
  const primerDiaSemana = primerDia.getDay()
  
  // Días del mes anterior para completar la primera semana
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    const dia = new Date(primerDia)
    dia.setDate(dia.getDate() - i - 1)
    diasMes.push({ fecha: dia, esMesActual: false })
  }
  
  // Días del mes actual
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    const dia = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), i)
    diasMes.push({ fecha: dia, esMesActual: true })
  }
  
  // Días del mes siguiente para completar la última semana
  const diasRestantes = 7 - (diasMes.length % 7)
  if (diasRestantes < 7) {
    for (let i = 1; i <= diasRestantes; i++) {
      const dia = new Date(ultimoDia)
      dia.setDate(dia.getDate() + i)
      diasMes.push({ fecha: dia, esMesActual: false })
    }
  }

  return (
    <div style={styles.mesContainer}>
      {/* Encabezados de días */}
      <div style={styles.mesGrid}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
          <div key={idx} style={styles.mesDiaHeader}>{dia}</div>
        ))}
        
        {/* Días del mes */}
        {diasMes.map((dia, index) => {
          const fechaStr = dia.fecha.toISOString().split('T')[0]
          const citasDelDia = citasPorFecha[fechaStr] || []
          const esHoy = fechaStr === new Date().toISOString().split('T')[0]

          return (
            <div 
              key={index}
              style={{
                ...styles.mesDiaCard,
                ...(dia.esMesActual ? {} : styles.mesDiaInactivo),
                ...(esHoy && styles.mesDiaHoy)
              }}
            >
              <div style={styles.mesDiaNumero}>
                {dia.fecha.getDate()}
              </div>
              
              {citasDelDia.length > 0 && (
                <div style={styles.mesCitasIndicador}>
                  {citasDelDia.slice(0, 3).map((cita, idx) => (
                    <div 
                      key={idx}
                      style={{
                        ...styles.mesCitaDot,
                        backgroundColor: getEstadoColor(cita.estado)
                      }}
                      title={`${cita.pacientes?.apellido} - ${cita.motivo}`}
                    />
                  ))}
                  {citasDelDia.length > 3 && (
                    <span style={styles.mesCitasExtra}>+{citasDelDia.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
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
    overflowY: 'auto',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  viewSelector: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#ffffff',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewButtonActive: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
  },
  dateNavigation: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  navButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  todayButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dateTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '24px',
    textAlign: 'center',
    textTransform: 'capitalize',
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
    marginBottom: '24px',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  citasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  citaCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  citaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  citaTime: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  citaEstado: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  citaPaciente: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '8px',
  },
  citaMotivo: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  citaNotas: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  semanaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '12px',
  },
  diaCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  diaHeader: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #e5e7eb',
  },
  diaHeaderHoy: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
  },
  diaNombre: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  diaNumero: {
    fontSize: '20px',
    fontWeight: '700',
  },
  citasMini: {
    padding: '8px',
  },
  noCitas: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
    padding: '20px 8px',
  },
  citaMini: {
    backgroundColor: '#f9fafb',
    padding: '8px',
    marginBottom: '4px',
    borderRadius: '6px',
    borderLeft: '3px solid',
    cursor: 'pointer',
  },
  citaMiniTime: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
  },
  citaMiniPaciente: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1f2937',
  },
  mesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  mesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  mesDiaHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    padding: '8px',
    textTransform: 'uppercase',
  },
  mesDiaCard: {
    minHeight: '80px',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    position: 'relative',
  },
  mesDiaInactivo: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  mesDiaHoy: {
    backgroundColor: '#eff6ff',
    borderColor: '#1e40af',
    borderWidth: '2px',
  },
  mesDiaNumero: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  mesCitasIndicador: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  mesCitaDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  mesCitasExtra: {
    fontSize: '10px',
    color: '#6b7280',
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