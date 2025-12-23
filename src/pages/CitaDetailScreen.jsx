import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { enviarRecordatorioCita, enviarConfirmacionCita } from '../utils/emailService'
import EmailPreviewModal from '../components/EmailPreviewModal'
import { enviarWhatsAppTwilio, verificarLimiteWhatsApp } from '../utils/twilioService'

export default function CitaDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [cita, setCita] = useState(null)
  const [paciente, setPaciente] = useState(null)
  const [dentistaInfo, setDentistaInfo] = useState(null)
  const [isPremium, setIsPremium] = useState(false) // ✅ NUEVO
  const [modalEmail, setModalEmail] = useState({
    isOpen: false,
    emailData: null
  })

  useEffect(() => {
    loadCita()
    loadDentistaInfo()
    checkPlan() // ✅ NUEVO
  }, [id])

  // ✅ NUEVA FUNCIÓN: Verificar plan del usuario
  const checkPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios')
        .select('plan:planes_suscripcion(codigo)')
        .eq('dentista_id', user.id)
        .single()

      const esPremium = suscripcion?.plan?.codigo !== 'free'
      setIsPremium(esPremium)
      console.log('👤 Usuario es Premium:', esPremium)
    } catch (error) {
      console.error('Error verificando plan:', error)
    }
  }

  const loadDentistaInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: dentista } = await supabase
        .from('dentistas')
        .select('nombre, apellido, clinica')
        .eq('id', user.id)
        .single()

      const { data: config } = await supabase
        .from('configuracion_clinica')
        .select('nombre_remitente_whatsapp, template_recordatorio_cita')
        .eq('dentista_id', user.id)
        .single()

      setDentistaInfo({
        ...dentista,
        nombreRemitente: config?.nombre_remitente_whatsapp || dentista?.nombre || 'OdontoLog',
        template: config?.template_recordatorio_cita
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadCita = async () => {
    try {
      setLoading(true)

      const { data: citaData, error: citaError } = await supabase
        .from('citas')
        .select(`
          *,
          pacientes (
            id,
            nombre,
            apellido,
            telefono,
            email
          )
        `)
        .eq('id', id)
        .single()

      if (citaError) throw citaError
      
      setCita(citaData)
      setPaciente(citaData.pacientes)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar cita')
      navigate('/calendario')
    } finally {
      setLoading(false)
    }
  }

  const cambiarEstado = async () => {
    const estados = ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio']
    const estadosLabels = {
      pendiente: '🟡 Pendiente',
      confirmada: '🔵 Confirmada',
      en_proceso: '🟣 En Proceso',
      completada: '🟢 Completada',
      cancelada: '🔴 Cancelada',
      no_asistio: '⚫ No Asistió'
    }

    let mensaje = `Selecciona el nuevo estado para la cita:\n\nEstado actual: ${estadosLabels[cita.estado]}\n\n`
    estados.forEach((estado, idx) => {
      mensaje += `${idx + 1} - ${estadosLabels[estado]}\n`
    })

    const seleccion = prompt(mensaje, '2')
    if (!seleccion) return

    const indice = parseInt(seleccion) - 1
    if (indice < 0 || indice >= estados.length) {
      alert('⚠️ Opción inválida')
      return
    }

    const nuevoEstado = estados[indice]

    if (nuevoEstado === cita.estado) {
      alert('ℹ️ La cita ya tiene ese estado')
      return
    }

    try {
      const { error } = await supabase
        .from('citas')
        .update({ 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert(`✅ Estado actualizado a: ${estadosLabels[nuevoEstado]}`)
      loadCita()

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar estado: ' + error.message)
    }
  }

  const eliminarCita = async () => {
    const confirmar = window.confirm(
      '⚠️ ¿Estás seguro de eliminar esta cita?\n\nEsta acción no se puede deshacer.'
    )
    
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Cita eliminada correctamente')
      navigate('/calendario')

    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar cita: ' + error.message)
    }
  }

  // ✅ FUNCIÓN PARA REEMPLAZAR VARIABLES EN TEMPLATE
  const reemplazarVariables = (template, vars) => {
    let resultado = template
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      resultado = resultado.replace(regex, value || '')
    })
    return resultado
  }

  // ✅ CORREGIDO: Enviar WhatsApp con verificación Premium
  const enviarRecordatorioWhatsApp = async () => {
    try {
      // ✅ VERIFICAR SI ES PREMIUM
      if (!isPremium) {
        const confirmar = window.confirm(
          '⭐ Función Premium\n\n' +
          'El envío de WhatsApp está disponible solo para usuarios Premium y Enterprise.\n\n' +
          '¿Deseas ver los planes disponibles?'
        )
        if (confirmar) {
          navigate('/planes')
        }
        return
      }

      if (!paciente || !paciente.telefono) {
        alert('⚠️ Este paciente no tiene teléfono registrado')
        return
      }

      console.log('📱 Iniciando envío de WhatsApp...')

      const limite = await verificarLimiteWhatsApp()
      console.log('📊 Verificación de límite:', limite)

      if (!limite.permitido) {
        alert(`❌ ${limite.mensaje}`)
        return
      }

      // ✅ CORREGIR FECHA - Agregar hora para evitar timezone issues
      const fechaCita = new Date(cita.fecha_cita + 'T12:00:00')
      const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      console.log('📅 Fecha original:', cita.fecha_cita)
      console.log('📅 Fecha formateada:', fechaFormateada)

      // ✅ PREPARAR VARIABLES
      const templateVars = {
        paciente: paciente.nombre,
        fecha: fechaFormateada,
        hora: cita.hora_inicio.slice(0,5),
        clinica: dentistaInfo?.clinica || 'Nuestra Clínica',
        doctor: dentistaInfo?.nombreRemitente || 'OdontoLog'
      }

      // ✅ USAR TEMPLATE O MENSAJE DEFAULT
      let mensaje = ''
      if (dentistaInfo?.template) {
        mensaje = reemplazarVariables(dentistaInfo.template, templateVars)
      } else {
        mensaje = `Hola ${paciente.nombre},

🔔 *Recordatorio de Cita*

📅 Fecha: ${fechaFormateada}
🕐 Hora: ${cita.hora_inicio.slice(0,5)}
📋 Motivo: ${cita.motivo || 'Consulta general'}

Por favor confirme su asistencia.

Responde:
✅ SÍ para confirmar
❌ NO para cancelar
📅 REPROGRAMAR para cambiar fecha

Saludos,
${dentistaInfo?.nombreRemitente || 'Equipo OdontoLog'}`
      }

      console.log('📝 Mensaje preparado:', mensaje)
      console.log('📞 Teléfono destino:', paciente.telefono)

      const resultado = await enviarWhatsAppTwilio({
        to: paciente.telefono,
        mensaje,
        pacienteId: paciente.id,
        tipo: 'recordatorio_cita'
      })

      console.log('✅ Resultado del envío:', resultado)

      alert(`✅ Recordatorio enviado por WhatsApp\n\nMensajes usados: ${resultado.usado}/${resultado.limite}`)

    } catch (error) {
      console.error('❌ Error completo:', error)
      console.error('❌ Detalles del error:', error.message)
      alert('❌ Error al enviar WhatsApp: ' + error.message)
    }
  }

  // ✅ CORREGIDO: Enviar Email con fecha correcta
  const enviarRecordatorioEmail = async () => {
    try {
      if (!paciente || !paciente.email) {
        alert('⚠️ Este paciente no tiene email registrado')
        return
      }

      // ✅ CORREGIR FECHA
      const fechaCita = new Date(cita.fecha_cita + 'T12:00:00')
      const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔔 Recordatorio de Cita</h1>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">¡No olvide su cita!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hola <strong>${paciente.nombre}</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Este es un recordatorio de su cita dental:
            </p>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 5px 0;">
                <strong>📅 Fecha:</strong> ${fechaFormateada}
              </p>
              <p style="color: #92400e; margin: 5px 0;">
                <strong>🕐 Hora:</strong> ${cita.hora_inicio.slice(0,5)}
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
                <strong>${dentistaInfo?.nombreRemitente || 'Equipo OdontoLog'}</strong>
              </p>
            </div>
          </div>
        </div>
      `

      setModalEmail({
        isOpen: true,
        emailData: {
          tipo: 'email',
          tipoLabel: 'Recordatorio de Cita',
          destinatario: paciente.email,
          asunto: `🔔 Recordatorio: Cita ${fechaFormateada} a las ${cita.hora_inicio.slice(0,5)}`,
          html: html,
          onConfirm: async () => {
            await enviarRecordatorioCita(cita, paciente)
            loadCita()
          }
        }
      })

    } catch (error) {
      console.error('Error:', error)
      alert('Error al preparar recordatorio: ' + error.message)
    }
  }

  // ✅ CORREGIDO: Función formatDate
  const formatDate = (dateString) => {
    // Agregar hora para evitar problemas de timezone
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    return timeString.slice(0, 5)
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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando cita...</div>
      </div>
    )
  }

  if (!cita) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cita no encontrada</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/calendario')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📅 Detalle de Cita</div>
          <div style={styles.subtitle}>
            {formatDate(cita.fecha_cita)}
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Estado de la Cita */}
        <div style={styles.estadoCard}>
          <div style={styles.estadoLabel}>Estado Actual</div>
          <div style={{
            ...styles.estadoBadge,
            backgroundColor: getEstadoColor(cita.estado)
          }}>
            {getEstadoLabel(cita.estado)}
          </div>
          
          {/* ✅ MOSTRAR SI FUE CONFIRMADA POR WHATSAPP */}
          {cita.confirmada_por_whatsapp && (
            <div style={styles.confirmadaWhatsApp}>
              ✅ Confirmada por WhatsApp
            </div>
          )}
        </div>

        {/* Información de la Cita */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>⏰ Información de la Cita</div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Fecha:</span>
            <span style={styles.infoValue}>{formatDate(cita.fecha_cita)}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Horario:</span>
            <span style={styles.infoValue}>
              {formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)}
            </span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Motivo:</span>
            <span style={styles.infoValue}>{cita.motivo}</span>
          </div>

          {cita.tratamiento_planificado && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Tratamiento:</span>
              <span style={styles.infoValue}>{cita.tratamiento_planificado}</span>
            </div>
          )}

          {cita.notas && (
            <div style={styles.notasBox}>
              <div style={styles.notasLabel}>Notas:</div>
              <div style={styles.notasTexto}>{cita.notas}</div>
            </div>
          )}
        </div>

        {/* Información del Paciente */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>👤 Información del Paciente</div>
          
          <div style={styles.pacienteCard} onClick={() => navigate(`/paciente/${paciente.id}`)}>
            <div style={styles.pacienteAvatar}>
              {paciente.nombre.charAt(0)}{paciente.apellido.charAt(0)}
            </div>
            <div style={styles.pacienteInfo}>
              <div style={styles.pacienteNombre}>
                {paciente.nombre} {paciente.apellido}
              </div>
              {paciente.telefono && (
                <div style={styles.pacienteContacto}>
                  📱 {paciente.telefono}
                </div>
              )}
              {paciente.email && (
                <div style={styles.pacienteContacto}>
                  ✉️ {paciente.email}
                </div>
              )}
            </div>
            <div style={styles.verMas}>→</div>
          </div>
        </div>

        {/* Botones de Recordatorio */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📬 Enviar Recordatorio</div>
          
          <div style={styles.recordatorioButtons}>
            <button
              style={{...styles.actionButton, backgroundColor: '#3b82f6'}}
              onClick={enviarRecordatorioEmail}
            >
              📧 Recordatorio por Email
            </button>

            {/* ✅ BOTÓN WHATSAPP CON INDICADOR PREMIUM */}
            <button
              style={{
                ...styles.actionButton, 
                backgroundColor: isPremium ? '#25D366' : '#9ca3af'
              }}
              onClick={enviarRecordatorioWhatsApp}
            >
              📱 Recordatorio por WhatsApp {!isPremium && '⭐'}
            </button>
            
            {!isPremium && (
              <div style={styles.premiumHint}>
                ⭐ Esta función está disponible solo para usuarios Premium
              </div>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={styles.actionsSection}>
          <button
            style={styles.actionButton}
            onClick={cambiarEstado}
          >
            🔄 Cambiar Estado
          </button>

          <button
            style={{...styles.actionButton, backgroundColor: '#ef4444'}}
            onClick={eliminarCita}
          >
            🗑️ Eliminar Cita
          </button>
        </div>

        {/* Modal de Email */}
        <EmailPreviewModal
          isOpen={modalEmail.isOpen}
          onClose={() => setModalEmail({ isOpen: false, emailData: null })}
          onConfirm={modalEmail.emailData?.onConfirm}
          emailData={modalEmail.emailData || {}}
        />
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
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  estadoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  estadoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  estadoBadge: {
    display: 'inline-block',
    padding: '8px 24px',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  confirmadaWhatsApp: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#10b981',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    flex: '0 0 140px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontSize: '14px',
    color: '#1f2937',
  },
  notasBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '3px solid #3b82f6',
  },
  notasLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  notasTexto: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
  },
  pacienteCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pacienteAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  pacienteInfo: {
    flex: 1,
  },
  pacienteNombre: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  pacienteContacto: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  verMas: {
    fontSize: '24px',
    color: '#9ca3af',
  },
  recordatorioButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  premiumHint: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '4px',
  },
  actionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionButton: {
    padding: '14px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
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