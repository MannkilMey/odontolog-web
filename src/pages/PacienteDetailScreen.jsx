import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generarPresupuestoPDF, generarReciboPDF } from '../utils/pdfGenerator'
import { enviarPresupuesto, enviarRecibo } from '../utils/emailService'
import EmailPreviewModal from '../components/EmailPreviewModal'

export default function PacienteDetailScreen() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [paciente, setPaciente] = useState(null)
  const [procedimientos, setProcedimientos] = useState([])
  const [proximasCitas, setProximasCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [presupuestos, setPresupuestos] = useState([])
  const [pagos, setPagos] = useState([])
  const [planesPago, setPlanesPago] = useState([])
  const [todasLasCitas, setTodasLasCitas] = useState([])
  const [modalEmail, setModalEmail] = useState({
    isOpen: false,
    emailData: null
  })

  useEffect(() => {
    // Intentar cargar desde location.state primero
    if (location.state?.paciente) {
      setPaciente(location.state.paciente)
      loadPacienteData(location.state.paciente.id)
    } else {
      // Si no hay state, cargar desde la base de datos
      loadPacienteFromDB()
    }
  }, [id, location.state])

  const loadPacienteFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error loading paciente:', error)
        alert('Error al cargar paciente')
        navigate('/clientes')
      } else {
        setPaciente(data)
        loadPacienteData(data.id)
      }
    } catch (error) {
      console.error('Error:', error)
      navigate('/clientes')
    }
  }

  const loadPacienteData = async (pacienteId) => {
    try {
      setLoading(true)
      
      // Cargar procedimientos del paciente
      const { data: procData, error: procError } = await supabase
        .from('procedimientos_dentales')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_procedimiento', { ascending: false })
        .limit(5)

      if (procError) {
        console.error('Error loading procedimientos:', procError)
      } else {
        setProcedimientos(procData || [])
      }

      // Cargar próximas citas
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select('*')
        .eq('paciente_id', pacienteId)
        .gte('fecha_cita', new Date().toISOString())
        .order('fecha_cita', { ascending: true })
        .limit(3)

      if (citasError) {
        console.error('Error loading citas:', citasError)
      } else {
        setProximasCitas(citasData || [])
      }

      const { data: todasCitasData, error: todasCitasError } = await supabase
        .from('citas')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_cita', { ascending: false })
        .limit(10)

      if (todasCitasError) {
        console.error('Error loading todas las citas:', todasCitasError)
      } else {
        setTodasLasCitas(todasCitasData || [])
      }

      // Cargar presupuestos
      const { data: presupuestosData, error: presupuestosError } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_emision', { ascending: false })
        .limit(5)

      if (presupuestosError) {
        console.error('Error loading presupuestos:', presupuestosError)
      } else {
        setPresupuestos(presupuestosData || [])
      }

      // Cargar pagos
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos_pacientes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_pago', { ascending: false })
        .limit(5)

      if (pagosError) {
        console.error('Error loading pagos:', pagosError)
      } else {
        setPagos(pagosData || [])
      }

      // Cargar planes de pago
      const { data: planesData, error: planesError } = await supabase
        .from('planes_pago')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (planesError) {
        console.error('Error loading planes:', planesError)
      } else {
        setPlanesPago(planesData || [])
      }

    } catch (error) {
      console.error('Error loading paciente data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'No especificado'
    const birth = new Date(fechaNacimiento)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString + 'T12:00:00').toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString + 'T12:00:00').toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const DataRow = ({ label, value }) => (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>{label}:</span>
      <span style={styles.dataValue}>{value || 'No especificado'}</span>
    </div>
  )

  const ActionButton = ({ title, icon, onClick, disabled = false }) => (
    <button 
      style={{
        ...styles.actionButton,
        ...(disabled && styles.actionButtonDisabled)
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <span style={styles.actionIcon}>{icon}</span>
      <span style={{
        ...styles.actionTitle,
        ...(disabled && styles.actionTitleDisabled)
      }}>
        {title}
      </span>
      <span style={{
        ...styles.actionArrow,
        ...(disabled && styles.actionArrowDisabled)
      }}>
        {disabled ? '🚧' : '→'}
      </span>
    </button>
  )

  const QuickStatCard = ({ title, value, subtitle, color = '#6b7280' }) => (
    <div style={styles.statCard}>
      <div style={{...styles.statIndicator, backgroundColor: color}} />
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
      {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
    </div>
  )

  // ============================================
  // 📄 FUNCIONES DE PRESUPUESTO
  // ============================================

  const descargarPresupuestoPDF = async (presupuesto) => {
    try {
      // Cargar items del presupuesto
      const { data: items, error } = await supabase
        .from('presupuesto_items')
        .select('*')
        .eq('presupuesto_id', presupuesto.id)
      
      if (error) throw error
      
      // Cargar configuración
      const { data: { user } } = await supabase.auth.getUser()
      const { data: config } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()
      
      // Generar PDF
      await generarPresupuestoPDF(presupuesto, items, paciente, config)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar PDF')
    }
  }

  const enviarPresupuestoPorWhatsApp = async (presupuesto) => {
  try {
    if (!paciente.telefono) {
      alert('⚠️ Este paciente no tiene teléfono registrado')
      return
    }

    // Cargar configuración de la clínica
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('⚠️ Error: No se pudo obtener el usuario')
      return
    }

    const { data: configData, error: configError } = await supabase
      .from('configuracion_clinica')
      .select('*')
      .eq('dentista_id', user.id)
      .single()

    // ✅ Usar la variable correcta
    const config = configData
    
    // Formatear número de teléfono
    let telefono = paciente.telefono.replace(/[^0-9]/g, '')
    if (!telefono.startsWith('595')) {
      telefono = '595' + telefono
    }

    // Construir mensaje
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'
    
    const mensaje = `Hola ${paciente.nombre},

Le envío el presupuesto ${presupuesto.numero_presupuesto}:

📋 *Detalles:*
- Fecha: ${formatDate(presupuesto.fecha_emision)}
${presupuesto.fecha_vencimiento ? `- Válido hasta: ${formatDate(presupuesto.fecha_vencimiento)}` : ''}
- Total: Gs. ${Number(presupuesto.total).toLocaleString('es-PY')}

Para más información, no dude en contactarnos.

Saludos,
*${nombreClinica}*
${config?.telefono ? `📞 ${config.telefono}` : ''}`

    // Abrir WhatsApp Web
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')

    console.log('✅ WhatsApp abierto con presupuesto')

  } catch (error) {
    console.error('Error completo:', error)
    alert('Error al abrir WhatsApp: ' + error.message)
  }
}

  const enviarPresupuestoPorEmail = async (presupuesto) => {
    try {
      if (!paciente.email) {
        alert('⚠️ Este paciente no tiene email registrado')
        return
      }

      // ✅ Cargar items del presupuesto
      const { data: items, error: itemsError } = await supabase
        .from('presupuesto_items')
        .select('*')
        .eq('presupuesto_id', presupuesto.id)

      if (itemsError) throw itemsError

      // Construir HTML del preview
      const itemsHTML = items?.map(item => 
        `<li style="margin-bottom: 8px;">${item.descripcion} (x${item.cantidad}): Gs. ${Number(item.subtotal).toLocaleString('es-PY')}</li>`
      ).join('') || ''

      const html = `
        <div style="padding: 20px;">
          <h3>Presupuesto: ${presupuesto.numero_presupuesto}</h3>
          <p><strong>Fecha:</strong> ${formatDate(presupuesto.fecha_emision)}</p>
          ${presupuesto.fecha_vencimiento ? `<p><strong>Válido hasta:</strong> ${formatDate(presupuesto.fecha_vencimiento)}</p>` : ''}
          
          <h4>Detalles:</h4>
          <ul>
            ${itemsHTML}
          </ul>
          
          <p style="font-size: 18px; font-weight: bold; color: #10b981;">
            Total: Gs. ${Number(presupuesto.total).toLocaleString('es-PY')}
          </p>
          
          ${presupuesto.notas ? `<p><em>${presupuesto.notas}</em></p>` : ''}
        </div>
      `

      // Mostrar modal de confirmación
      setModalEmail({
        isOpen: true,
        emailData: {
          tipo: 'email',
          tipoLabel: 'Presupuesto',
          destinatario: paciente.email,
          asunto: `Presupuesto ${presupuesto.numero_presupuesto}`,
          html: html,
          onConfirm: async () => {
            // ✅ Pasar los items (no null)
            await enviarPresupuesto(presupuesto, paciente, items)
            console.log('✅ Presupuesto enviado correctamente')
            loadPacienteData(paciente.id)
          }
        }
      })

    } catch (error) {
      console.error('Error:', error)
      alert('Error al preparar email: ' + error.message)
    }
  }

  const eliminarPresupuesto = async (presupuestoId, numeroPresupuesto) => {
    const confirmacion = window.confirm(
      `⚠️ ¿Estás seguro de eliminar el presupuesto ${numeroPresupuesto}?\n\nEsta acción no se puede deshacer.`
    )
    
    if (!confirmacion) return

    try {
      // Los items se eliminarán automáticamente por el CASCADE en la BD
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', presupuestoId)

      if (error) throw error

      alert('✅ Presupuesto eliminado correctamente')
      
      // Recargar datos
      loadPacienteData(paciente.id)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar presupuesto: ' + error.message)
    }
  }

  const cambiarEstadoPresupuesto = async (presupuesto) => {
    const estados = ['pendiente', 'aprobado', 'rechazado', 'vencido']
    const estadosLabels = {
      pendiente: '🟡 Pendiente',
      aprobado: '🟢 Aprobado',
      rechazado: '🔴 Rechazado',
      vencido: '⚫ Vencido'
    }

    // Crear opciones para el prompt
    let mensaje = `Selecciona el nuevo estado para el presupuesto ${presupuesto.numero_presupuesto}:\n\n`
    mensaje += `Estado actual: ${estadosLabels[presupuesto.estado]}\n\n`
    mensaje += `1 - ${estadosLabels.pendiente}\n`
    mensaje += `2 - ${estadosLabels.aprobado}\n`
    mensaje += `3 - ${estadosLabels.rechazado}\n`
    mensaje += `4 - ${estadosLabels.vencido}\n`

    const seleccion = prompt(mensaje, '2')
    
    if (!seleccion) return // Usuario canceló

    const indice = parseInt(seleccion) - 1
    if (indice < 0 || indice >= estados.length) {
      alert('⚠️ Opción inválida')
      return
    }

    const nuevoEstado = estados[indice]

    if (nuevoEstado === presupuesto.estado) {
      alert('ℹ️ El presupuesto ya tiene ese estado')
      return
    }

    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({ 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', presupuesto.id)

      if (error) throw error

      alert(`✅ Estado actualizado a: ${estadosLabels[nuevoEstado]}`)
      loadPacienteData(paciente.id)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar estado: ' + error.message)
    }
  }

  // ============================================
  // 💰 FUNCIONES DE PAGOS/RECIBOS
  // ============================================

  const descargarReciboPDF = async (pago) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: config } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()
      
      await generarReciboPDF(pago, paciente, config)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar PDF')
    }
  }

  const enviarReciboPorEmail = async (pago) => {
    try {
      if (!paciente.email) {
        alert('⚠️ Este paciente no tiene email registrado')
        return
      }

      // Construir HTML del preview para el modal
      const html = `
        <div style="padding: 20px;">
          <h3>🧾 Recibo de Pago: ${pago.numero_recibo}</h3>
          
          <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>📅 Fecha:</strong> ${formatDate(pago.fecha_pago)}</p>
            <p><strong>💳 Método:</strong> ${pago.metodo_pago}</p>
            <p><strong>📝 Concepto:</strong> ${pago.concepto}</p>
            
            <p style="font-size: 20px; font-weight: bold; color: #10b981; margin-top: 16px;">
              💰 Monto: Gs. ${Number(pago.monto).toLocaleString('es-PY')}
            </p>
          </div>
          
          ${pago.notas ? `<p style="color: #6b7280;"><em>Notas: ${pago.notas}</em></p>` : ''}
          
          <p style="margin-top: 20px; color: #059669;">✅ Gracias por su pago</p>
        </div>
      `

      // Mostrar modal de confirmación
      setModalEmail({
        isOpen: true,
        emailData: {
          tipo: 'email',
          tipoLabel: 'Recibo de Pago',
          destinatario: paciente.email,
          asunto: `Recibo de Pago ${pago.numero_recibo}`,
          html: html,
          onConfirm: async () => {
            // Llamar a la función de emailService
            await enviarRecibo(pago, paciente)
            console.log('✅ Recibo enviado correctamente por email')
            loadPacienteData(paciente.id)
          }
        }
      })

    } catch (error) {
      console.error('Error:', error)
      alert('Error al preparar email: ' + error.message)
    }
  }

  const enviarReciboPorWhatsApp = async (pago) => {
  try {
    if (!paciente.telefono) {
      alert('⚠️ Este paciente no tiene teléfono registrado')
      return
    }

    // Cargar configuración de la clínica
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('⚠️ Error: No se pudo obtener el usuario')
      return
    }

    const { data: configData, error: configError } = await supabase
      .from('configuracion_clinica')
      .select('*')
      .eq('dentista_id', user.id)
      .single()

    // ✅ Usar la variable correcta
    const config = configData

    // Formatear teléfono
    let telefono = paciente.telefono.replace(/[^0-9]/g, '')
    if (!telefono.startsWith('595')) {
      telefono = '595' + telefono
    }

    // Construir mensaje
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'
    
    const mensaje = `Hola ${paciente.nombre},

🧾 *RECIBO DE PAGO*

Le confirmamos la recepción de su pago:

*Recibo N°:* ${pago.numero_recibo}
📅 *Fecha:* ${formatDate(pago.fecha_pago)}
💰 *Monto:* Gs. ${Number(pago.monto).toLocaleString('es-PY')}
💳 *Método:* ${pago.metodo_pago}
📝 *Concepto:* ${pago.concepto}
${pago.notas ? `\n_Notas: ${pago.notas}_` : ''}

✅ Gracias por su pago.

Saludos,
*${nombreClinica}*
${config?.telefono ? `📞 ${config.telefono}` : ''}`

    // Abrir WhatsApp Web
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')

    console.log('✅ WhatsApp abierto con recibo')

  } catch (error) {
    console.error('Error completo:', error)
    alert('Error al abrir WhatsApp: ' + error.message)
  }
}
  const eliminarPago = async (pagoId, numeroRecibo) => {
    const confirmacion = window.confirm(
      `⚠️ ¿Estás seguro de eliminar el pago ${numeroRecibo}?\n\nEsta acción no se puede deshacer.`
    )
    
    if (!confirmacion) return

    try {
      const { error } = await supabase
        .from('pagos_pacientes')
        .delete()
        .eq('id', pagoId)

      if (error) throw error

      alert('✅ Pago eliminado correctamente')
      loadPacienteData(paciente.id)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar pago: ' + error.message)
    }
  }

  // ============================================
  // 🎨 RENDER
  // ============================================

  if (!paciente) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Cargando paciente...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/clientes')}
          style={styles.backButton}
        >
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>Información del Paciente</div>
          <div style={styles.subtitle}>Solo lectura</div>
        </div>
        <button 
          style={styles.editButton}
          onClick={() => navigate(`/editar-paciente/${paciente.id}`, { state: { paciente } })}
        >
          ✎ Editar
        </button>
      </div>

      <div style={styles.scrollView}>
        {/* Información Principal del Paciente */}
        <div style={styles.mainInfoCard}>
          <div style={styles.patientHeader}>
            <div style={styles.patientAvatar}>
              <span style={styles.patientInitials}>
                {paciente.nombre.charAt(0)}{paciente.apellido.charAt(0)}
              </span>
            </div>
            <div style={styles.patientMainInfo}>
              <div style={styles.patientName}>
                {paciente.nombre} {paciente.apellido}
              </div>
              <div style={styles.patientAge}>
                {calculateAge(paciente.fecha_nacimiento)} años • {paciente.genero}
              </div>
              <div style={styles.patientId}>ID: {paciente.id.slice(0, 8)}...</div>
            </div>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div style={styles.statsContainer}>
          <QuickStatCard 
            title="Procedimientos" 
            value={procedimientos.length} 
            subtitle="Total realizados"
            color="#10b981"
          />
          <QuickStatCard 
            title="Próximas Citas" 
            value={proximasCitas.length} 
            subtitle="Programadas"
            color="#3b82f6"
          />
          <QuickStatCard 
            title="Último Registro" 
            value={procedimientos.length > 0 ? 'Reciente' : 'Ninguno'} 
            subtitle={procedimientos.length > 0 ? formatDate(procedimientos[0]?.fecha_procedimiento) : ''}
            color="#f59e0b"
          />
        </div>

        {/* Datos Personales */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Datos Personales</div>
          <div style={styles.dataCard}>
            <DataRow label="Nombre Completo" value={`${paciente.nombre} ${paciente.apellido}`} />
            <DataRow label="Género" value={paciente.genero} />
            <DataRow 
              label="Fecha de Nacimiento" 
              value={formatDate(paciente.fecha_nacimiento)} 
            />
            <DataRow label="Edad" value={`${calculateAge(paciente.fecha_nacimiento)} años`} />
          </div>
        </div>

        {/* Información de Contacto */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Información de Contacto</div>
          <div style={styles.dataCard}>
            <DataRow label="Teléfono" value={paciente.telefono} />
            <DataRow label="Email" value={paciente.email} />
            <DataRow label="Dirección" value={paciente.direccion} />
          </div>
        </div>

        {/* Notas Generales */}
        {paciente.notas_generales && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Notas Clínicas</div>
            <div style={styles.notesCard}>
              <div style={styles.notesText}>{paciente.notas_generales}</div>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div style={styles.actionsSection}>
          <div style={styles.sectionTitle}>Acciones Disponibles</div>

          <ActionButton 
            title="Crear Presupuesto" 
            icon="📄" 
            onClick={() => {
              console.log('📄 Navegando a Presupuesto para:', paciente.nombre)
              navigate(`/presupuesto/${paciente.id}`)
            }}
            disabled={false}
          />
          <ActionButton 
            title="Registrar Pago" 
            icon="💰" 
            onClick={() => {
              console.log('💰 Navegando a Registrar Pago para:', paciente.nombre)
              navigate(`/registrar-pago/${paciente.id}`)
            }}
            disabled={false}
          />
          <ActionButton 
            title="Plan de Pago / Cuotas" 
            icon="📅" 
            onClick={() => {
              console.log('📅 Navegando a Plan de Pago para:', paciente.nombre)
              navigate(`/crear-plan-pago/${paciente.id}`)
            }}
            disabled={false}
          />
          <ActionButton   
            title="Ver Odontograma" 
            icon="🦷" 
            onClick={() => {
              console.log('🦷 Navegando a Odontograma para:', paciente.nombre)
              navigate(`/odontograma/${paciente.id}`, { state: { paciente } })
            }}
            disabled={false}
          />

          <ActionButton 
            title="Gestionar Citas" 
            icon="📅" 
            onClick={() => {
              console.log('📅 Navegando a crear cita para:', paciente.nombre)
              navigate('/crear-cita', { state: { pacienteId: paciente.id } })
            }}
            disabled={false}
          />
          <ActionButton 
            title="Ver Fotos y Archivos" 
            icon="📸" 
            onClick={() => {
              console.log('📁 Navegando a archivos para:', paciente.nombre)
              alert('Próximamente: Fotos y Archivos')
            }}
            disabled={true}
          />
          <ActionButton 
            title="Historial Completo" 
            icon="📋" 
            onClick={() => {
              console.log('📊 Navegando a timeline para:', paciente.nombre)
              navigate(`/timeline/${paciente.id}`, { state: { paciente } })
            }}
            disabled={false}
          />
        </div>

        {/* Últimos Procedimientos */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Últimos Procedimientos</div>
            {procedimientos.length > 0 && (
              <button style={styles.viewAllButton}>
                <span style={styles.viewAllText}>Ver todos</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>Cargando...</div>
            </div>
          ) : procedimientos.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📋</div>
              <div style={styles.emptyTitle}>Sin procedimientos</div>
              <div style={styles.emptySubtitle}>
                No hay procedimientos registrados para este paciente
              </div>
            </div>
          ) : (
            <div style={styles.procedimientosList}>
              {procedimientos.map((proc, index) => (
                <div key={index} style={styles.historialItem}>
                  <div style={styles.historialHeader}>
                    <div style={styles.historialFecha}>
                      {formatDate(proc.fecha_procedimiento)}
                    </div>
                  </div>
                  <div style={styles.historialProcedimiento}>
                    {proc.procedimiento || 'Procedimiento sin nombre'}
                  </div>
                  {proc.numero_diente && (
                    <div style={styles.historialDiente}>
                      Diente #{proc.numero_diente}
                    </div>
                  )}
                  {proc.descripcion && (
                    <div style={styles.historialDescripcion}>
                      {proc.descripcion}
                    </div>
                  )}
                  {proc.costo && (
                    <div style={styles.historialCosto}>
                      Gs. {Number(proc.costo).toLocaleString('es-PY')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas Citas */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Próximas Citas</div>
          
          {proximasCitas.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📅</div>
              <div style={styles.emptyTitle}>Sin citas programadas</div>
              <div style={styles.emptySubtitle}>
                No hay citas próximas para este paciente
              </div>
            </div>
          ) : (
            <div style={styles.citasList}>
              {proximasCitas.map((cita, index) => (
                <div key={index} style={styles.citaItem}>
                  <div style={styles.citaHeader}>
                    <div style={styles.citaFecha}>
                      {formatDateTime(cita.fecha_cita)}
                    </div>
                  </div>
                  <div style={styles.citaMotivo}>
                    {cita.motivo || 'Consulta general'}
                  </div>
                  {cita.notas && (
                    <div style={styles.citaNotas}>
                      {cita.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presupuestos */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>📄 Presupuestos</div>
            {presupuestos.length > 0 && (
              <button style={styles.viewAllButton} onClick={() => alert('Próximamente: Ver todos los presupuestos')}>
                <span style={styles.viewAllText}>Ver todos</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>Cargando...</div>
            </div>
          ) : presupuestos.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📄</div>
              <div style={styles.emptyTitle}>Sin presupuestos</div>
              <div style={styles.emptySubtitle}>
                No hay presupuestos registrados para este paciente
              </div>
              <button
                style={styles.emptyButton}
                onClick={() => navigate(`/presupuesto/${paciente.id}`)}
              >
                + Crear Presupuesto
              </button>
            </div>
          ) : (
            <div style={styles.presupuestosList}>
              {presupuestos.map((pres, index) => {
                const estadoColors = {
                  pendiente: '#f59e0b',
                  aprobado: '#10b981',
                  rechazado: '#ef4444',
                  vencido: '#6b7280'
                }
                
                return (
                  <div key={index} style={styles.presupuestoItem}>
                    <div style={styles.presupuestoHeader}>
                      <div style={styles.presupuestoNumero}>
                        {pres.numero_presupuesto}
                      </div>
                      <div style={{
                        ...styles.presupuestoEstado,
                        backgroundColor: estadoColors[pres.estado] || '#6b7280'
                      }}>
                        {pres.estado}
                      </div>
                    </div>
                    <div style={styles.presupuestoFecha}>
                      Emitido: {formatDate(pres.fecha_emision)}
                      {pres.fecha_vencimiento && ` • Válido hasta: ${formatDate(pres.fecha_vencimiento)}`}
                    </div>
                    <div style={styles.presupuestoTotal}>
                      Total: Gs. {Number(pres.total).toLocaleString('es-PY')}
                    </div>
                    {pres.notas && (
                      <div style={styles.presupuestoNotas}>
                        {pres.notas}
                      </div>
                    )}
                    
                    {/* Botones de Acción */}
                    <div style={styles.presupuestoActions}>
                      <button
                        style={styles.presupuestoActionButton}
                        onClick={() => descargarPresupuestoPDF(pres)}
                        title="Descargar PDF"
                      >
                        📄 PDF
                      </button>
                      <button
                        style={{...styles.presupuestoActionButton, backgroundColor: '#8b5cf6'}}
                        onClick={() => cambiarEstadoPresupuesto(pres)}
                        title="Cambiar estado"
                      >
                        🔄 Estado
                      </button>
                      <button
                        style={{...styles.presupuestoActionButton, backgroundColor: '#25D366'}}
                        onClick={() => enviarPresupuestoPorWhatsApp(pres)}
                        title="Enviar por WhatsApp"
                      >
                        📱 WhatsApp
                      </button>
                      <button
                        style={{...styles.presupuestoActionButton, backgroundColor: '#3b82f6'}}
                        onClick={() => enviarPresupuestoPorEmail(pres)}
                        title="Enviar por Email"
                      >
                        ✉️ Email
                      </button>
                      <button
                        style={{...styles.presupuestoActionButton, backgroundColor: '#ef4444'}}
                        onClick={() => eliminarPresupuesto(pres.id, pres.numero_presupuesto)}
                        title="Eliminar presupuesto"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagos Registrados */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>💰 Pagos Registrados</div>
            {pagos.length > 0 && (
              <button style={styles.viewAllButton} onClick={() => alert('Próximamente: Ver todos los pagos')}>
                <span style={styles.viewAllText}>Ver todos</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>Cargando...</div>
            </div>
          ) : pagos.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>💰</div>
              <div style={styles.emptyTitle}>Sin pagos registrados</div>
              <div style={styles.emptySubtitle}>
                No hay pagos registrados para este paciente
              </div>
              <button
                style={styles.emptyButton}
                onClick={() => navigate(`/registrar-pago/${paciente.id}`)}
              >
                + Registrar Pago
              </button>
            </div>
          ) : (
            <div style={styles.pagosList}>
              {pagos.map((pago, index) => {
                const metodoPagoIcons = {
                  efectivo: '💵',
                  transferencia: '🏦',
                  tarjeta: '💳',
                  cheque: '📝',
                  otro: '💰'
                }
                
                return (
                  <div key={index} style={styles.pagoItem}>
                    <div style={styles.pagoHeader}>
                      <div style={styles.pagoNumero}>
                        {pago.numero_recibo}
                      </div>
                      <div style={styles.pagoMetodo}>
                        {metodoPagoIcons[pago.metodo_pago] || '💰'} {pago.metodo_pago}
                      </div>
                    </div>
                    <div style={styles.pagoFecha}>
                      {formatDate(pago.fecha_pago)}
                    </div>
                    <div style={styles.pagoConcepto}>
                      {pago.concepto}
                    </div>
                    <div style={styles.pagoMonto}>
                      Gs. {Number(pago.monto).toLocaleString('es-PY')}
                    </div>
                    {pago.notas && (
                      <div style={styles.pagoNotas}>
                        {pago.notas}
                      </div>
                    )}
                    
                    {/* Botones de Acción */}
                    <div style={styles.pagoActions}>
                      <button
                        style={styles.pagoActionButton}
                        onClick={() => descargarReciboPDF(pago)}
                        title="Descargar Recibo PDF"
                      >
                        📄 PDF
                      </button>
                      <button
                        style={{...styles.pagoActionButton, backgroundColor: '#3b82f6'}}
                        onClick={() => enviarReciboPorEmail(pago)}
                        title="Enviar por Email"
                      >
                        ✉️ Email
                      </button>
                      <button
                        style={{...styles.pagoActionButton, backgroundColor: '#25D366'}}
                        onClick={() => enviarReciboPorWhatsApp(pago)}
                        title="Enviar por WhatsApp"
                      >
                        📱 WhatsApp
                      </button>
                      <button
                        style={{...styles.pagoActionButton, backgroundColor: '#ef4444'}}
                        onClick={() => eliminarPago(pago.id, pago.numero_recibo)}
                        title="Eliminar pago"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Planes de Pago */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>📅 Planes de Pago</div>
            {planesPago.length > 0 && (
              <button style={styles.viewAllButton} onClick={() => alert('Próximamente: Ver todos los planes')}>
                <span style={styles.viewAllText}>Ver todos</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>Cargando...</div>
            </div>
          ) : planesPago.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📅</div>
              <div style={styles.emptyTitle}>Sin planes de pago</div>
              <div style={styles.emptySubtitle}>
                No hay planes de pago registrados para este paciente
              </div>
              <button
                style={styles.emptyButton}
                onClick={() => navigate(`/crear-plan-pago/${paciente.id}`)}
              >
                + Crear Plan de Pago
              </button>
            </div>
          ) : (
            <div style={styles.planesList}>
              {planesPago.map((plan, index) => {
                const estadoColors = {
                  activo: '#10b981',
                  completado: '#3b82f6',
                  cancelado: '#ef4444'
                }
                
                const porcentajePagado = plan.monto_total > 0 
                  ? Math.round((plan.monto_pagado / plan.monto_total) * 100)
                  : 0
                
                return (
                  <div key={index} style={styles.planItem}>
                    <div style={styles.planHeader}>
                      <div style={styles.planNumero}>
                        {plan.numero_plan}
                      </div>
                      <div style={{
                        ...styles.planEstado,
                        backgroundColor: estadoColors[plan.estado] || '#6b7280'
                      }}>
                        {plan.estado}
                      </div>
                    </div>
                    
                    <div style={styles.planDescripcion}>
                      {plan.descripcion}
                    </div>
                    
                    <div style={styles.planDetalle}>
                      <span style={styles.planLabel}>Total:</span>
                      <span style={styles.planValue}>
                        Gs. {Number(plan.monto_total).toLocaleString('es-PY')}
                      </span>
                    </div>
                    
                    <div style={styles.planDetalle}>
                      <span style={styles.planLabel}>Cuotas:</span>
                      <span style={styles.planValue}>
                        {plan.cuotas_pagadas} / {plan.cantidad_cuotas} pagadas
                      </span>
                    </div>
                    
                    <div style={styles.planDetalle}>
                      <span style={styles.planLabel}>Cuota:</span>
                      <span style={styles.planValue}>
                        Gs. {Number(plan.monto_cuota).toLocaleString('es-PY')} {plan.frecuencia}
                      </span>
                    </div>
                    
                    <div style={styles.planDetalle}>
                      <span style={styles.planLabel}>Pagado:</span>
                      <span style={styles.planValueBold}>
                        Gs. {Number(plan.monto_pagado).toLocaleString('es-PY')}
                      </span>
                    </div>
                    
                    {/* Barra de Progreso */}
                    <div style={styles.progressContainer}>
                      <div style={styles.progressBar}>
                        <div 
                          style={{
                            ...styles.progressFill,
                            width: `${porcentajePagado}%`,
                            backgroundColor: estadoColors[plan.estado]
                          }}
                        />
                      </div>
                      <div style={styles.progressText}>{porcentajePagado}%</div>
                    </div>
                    
                    {/* Botones de Acción */}
                    <div style={styles.planActions}>
                      <button
                        style={styles.planActionButton}
                        onClick={() => navigate(`/plan-pago/${plan.id}`, { state: { paciente } })}
                      >
                        📋 Ver Cuotas
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Historial de Citas */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>📅 Historial de Citas</div>
            {todasLasCitas.length > 0 && (
              <button 
                style={styles.viewAllButton} 
                onClick={() => navigate('/calendario')}
              >
                <span style={styles.viewAllText}>Ver calendario</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>Cargando...</div>
            </div>
          ) : todasLasCitas.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📅</div>
              <div style={styles.emptyTitle}>Sin citas</div>
              <div style={styles.emptySubtitle}>
                No hay citas registradas para este paciente
              </div>
              <button
                style={styles.emptyButton}
                onClick={() => navigate('/crear-cita', { state: { pacienteId: paciente.id } })}
              >
                + Programar Cita
              </button>
            </div>
          ) : (
            <div style={styles.citasList}>
              {todasLasCitas.map((cita, index) => {
                const estadoColors = {
                  pendiente: '#f59e0b',
                  confirmada: '#3b82f6',
                  en_proceso: '#8b5cf6',
                  completada: '#10b981',
                  cancelada: '#ef4444',
                  no_asistio: '#6b7280'
                }
                
                const estadoLabels = {
                  pendiente: 'Pendiente',
                  confirmada: 'Confirmada',
                  en_proceso: 'En Proceso',
                  completada: 'Completada',
                  cancelada: 'Cancelada',
                  no_asistio: 'No Asistió'
                }
                
                return (
                  <div 
                    key={index} 
                    style={{
                      ...styles.citaItem,
                      borderLeftColor: estadoColors[cita.estado],
                      backgroundColor: '#f0f9ff',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/cita/${cita.id}`)}
                  >
                    <div style={styles.citaHeader}>
                      <div style={styles.citaFecha}>
                        📅 {formatDate(cita.fecha_cita)}
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#ffffff',
                        textTransform: 'capitalize',
                        backgroundColor: estadoColors[cita.estado]
                      }}>
                        {estadoLabels[cita.estado]}
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '8px'
                    }}>
                      🕐 {cita.hora_inicio?.slice(0,5)} - {cita.hora_fin?.slice(0,5)}
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
                )
              })}
            </div>
          )}
        </div>
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
    backgroundColor: '#f8fafc',
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
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
  },
  mainInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  patientHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '20px',
  },
  patientInitials: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  patientMainInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  patientAge: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  patientId: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    position: 'relative',
    overflow: 'hidden',
  },
  statIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '8px',
  },
  statTitle: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  section: {
    marginBottom: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  viewAllButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  viewAllText: {
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500',
  },
  dataCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
  },
  dataRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  dataLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  dataValue: {
    flex: 2,
    fontSize: '14px',
    color: '#1f2937',
  },
  notesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
    borderLeft: '3px solid #6b7280',
  },
  notesText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  actionsSection: {
    marginBottom: '16px',
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionButtonDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  actionIcon: {
    fontSize: '20px',
    marginRight: '12px',
  },
  actionTitle: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
  },
  actionTitleDisabled: {
    color: '#9ca3af',
  },
  actionArrow: {
    fontSize: '16px',
    color: '#9ca3af',
  },
  actionArrowDisabled: {
    color: '#d1d5db',
  },
  procedimientosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historialItem: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
    borderLeft: '3px solid #6b7280',
  },
  historialHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  historialFecha: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  historialProcedimiento: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: '2px',
  },
  historialDiente: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '2px',
  },
  historialDescripcion: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: '2px',
  },
  historialCosto: {
    fontSize: '12px',
    color: '#059669',
    fontWeight: '500',
  },
  citasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  citaItem: {
    backgroundColor: '#f0f9ff',
    padding: '12px',
    borderRadius: '8px',
    borderLeft: '3px solid #3b82f6',
  },
  citaHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  citaFecha: {
    fontSize: '12px',
    color: '#1e40af',
    fontWeight: '500',
  },
  citaMotivo: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: '2px',
  },
  citaNotas: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #e5e7eb',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '4px',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  emptyButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingCard: {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
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
  presupuestosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  presupuestoItem: {
    backgroundColor: '#fffbeb',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '3px solid #f59e0b',
  },
  presupuestoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  presupuestoNumero: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  presupuestoEstado: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  presupuestoFecha: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  presupuestoTotal: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#059669',
    marginTop: '8px',
  },
  presupuestoNotas: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #fef3c7',
  },
  presupuestoActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  presupuestoActionButton: {
    flex: 1,
    minWidth: '100px',
    padding: '8px 12px',
    backgroundColor: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  pagosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pagoItem: {
    backgroundColor: '#ecfdf5',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },
  pagoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  pagoNumero: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  pagoMetodo: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#059669',
    textTransform: 'capitalize',
  },
  pagoFecha: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  pagoConcepto: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  pagoMonto: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#059669',
    marginTop: '8px',
  },
  pagoNotas: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #d1fae5',
  },
  pagoActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  pagoActionButton: {
    flex: 1,
    minWidth: '90px',
    padding: '8px 12px',
    backgroundColor: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  planesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  planItem: {
    backgroundColor: '#f0fdfa',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  planNumero: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  planEstado: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  planDescripcion: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  planDetalle: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  planLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  planValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
  },
  planValueBold: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#059669',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '4px',
  },
  progressText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    minWidth: '40px',
    textAlign: 'right',
  },
  planActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  planActionButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}