import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { enviarRecordatorioCita, enviarConfirmacionCita } from '../utils/emailService'
import EmailPreviewModal from '../components/EmailPreviewModal'

export default function CalendarioScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [vistaActual, setVistaActual] = useState('dia') // 'dia', 'semana', 'mes'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date())
  const [modalEmail, setModalEmail] = useState({
    isOpen: false,
    emailData: null
  })

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
            telefono,
            email
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

  const enviarRecordatorioEmail = async (cita) => {
    try {
      if (!cita.pacientes || !cita.pacientes.email) {
        alert('⚠️ Este paciente no tiene email registrado')
        return
      }

      // Cargar config de la clínica
      const { data: { user } } = await supabase.auth.getUser()
      const { data: config } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

      const fechaCita = new Date(cita.fecha_cita)
      const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
            <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 20px;">🔔 Recordatorio de Cita</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">¡No olvide su cita!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hola <strong>${cita.pacientes.nombre}</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Este es un recordatorio de su cita dental:
            </p>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 5px 0;">
                <strong>📅 Fecha:</strong> ${fechaFormateada}
              </p>
              <p style="color: #92400e; margin: 5px 0;">
                <strong>🕐 Hora:</strong> ${formatTime(cita.hora_inicio)}
              </p>
              <p style="color: #92400e; margin: 5px 0;">
                <strong>📋 Motivo:</strong> ${cita.motivo || 'Consulta general'}
              </p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Por favor confirme su asistencia o avísenos si necesita reprogramar.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                ¡Lo esperamos!<br>
                <strong>${nombreClinica}</strong>
                ${config?.telefono ? `<br>📱 ${config.telefono}` : ''}
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Powered by <strong>OdontoLog</strong> - Software de Gestión Dental
              </p>
            </div>
          </div>
        </div>
      `

      const paciente = {
        id: cita.paciente_id,
        nombre: cita.pacientes.nombre,
        apellido: cita.pacientes.apellido,
        email: cita.pacientes.email
      }

      setModalEmail({
        isOpen: true,
        emailData: {
          tipo: 'email',
          tipoLabel: 'Recordatorio de Cita',
          destinatario: paciente.email,
          asunto: `🔔 Recordatorio: Cita en ${nombreClinica}`,
          html: html,
          onConfirm: async () => {
            await enviarRecordatorioCita(cita, paciente)
            loadData()
          }
        }
      })

    } catch (error) {
      console.error('Error:', error)
      alert('Error al preparar recordatorio: ' + error.message)
    }
  }

  const enviarRecordatorioWhatsApp = async (cita) => {
    try {
      if (!cita.pacientes || !cita.pacientes.telefono) {
        alert('⚠️ Este paciente no tiene teléfono registrado')
        return
      }

      // Cargar config de la clínica
      const { data: { user } } = await supabase.auth.getUser()
      const { data: config } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

      let telefono = cita.pacientes.telefono.replace(/[^0-9]/g, '')
      if (!telefono.startsWith('595')) {
        telefono = '595' + telefono
      }

      const fechaCita = new Date(cita.fecha_cita)
      const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      const mensaje = `Hola ${cita.pacientes.nombre},

🔔 *Recordatorio de Cita*
${nombreClinica}

📅 Fecha: ${fechaFormateada}
🕐 Hora: ${formatTime(cita.hora_inicio)}
📋 Motivo: ${cita.motivo || 'Consulta general'}

Por favor confirme su asistencia o avísenos si necesita reprogramar.

${config?.telefono ? `Tel: ${config.telefono}` : ''}

¡Lo esperamos!`

      const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      window.open(url, '_blank')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al abrir WhatsApp')
    }
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
            enviarRecordatorioEmail={enviarRecordatorioEmail}
            enviarRecordatorioWhatsApp={enviarRecordatorioWhatsApp}
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

      {/* Modal de Confirmación de Email */}
      <EmailPreviewModal
        isOpen={modalEmail.isOpen}
        onClose={() => setModalEmail({ isOpen: false, emailData: null })}
        onConfirm={modalEmail.emailData?.onConfirm}
        emailData={modalEmail.emailData || {}}
      />

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>Diseñado por MCorp</div>
      </div>
    </div>
  )
}

// Componente Vista Día
function VistaDia({ citas, fecha, navigate, formatTime, getEstadoColor, getEstadoLabel, enviarRecordatorioEmail, enviarRecordatorioWhatsApp }) {
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

          <div 
            style={styles.citaPaciente}
            onClick={() => navigate(`/cita/${cita.id}`)}
          >
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

          {/* Botones de Recordatorio */}
          <div style={styles.citaActions}>
            <button
              style={{...styles.citaActionButton, backgroundColor: '#3b82f6'}}
              onClick={(e) => {
                e.stopPropagation()
                enviarRecordatorioEmail(cita)
              }}
              title="Enviar recordatorio por Email"
            >
              📧 Email
            </button>
            <button
              style={{...styles.citaActionButton, backgroundColor: '#25D366'}}
              onClick={(e) => {
                e.stopPropagation()
                enviarRecordatorioWhatsApp(cita)
              }}
              title="Enviar recordatorio por WhatsApp"
            >
              📱 WhatsApp
            </button>
            <button
              style={{...styles.citaActionButton, backgroundColor: '#6b7280'}}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/cita/${cita.id}`)
              }}
              title="Ver detalles"
            >
              📋 Detalles
            </button>
          </div>
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
    cursor: 'pointer',
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
  citaActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  citaActionButton: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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