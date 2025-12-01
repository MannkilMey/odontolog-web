import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export default function ExportarDatosScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)
  
  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  
  // Opciones de exportación
  const [opcionesExport, setOpcionesExport] = useState({
    pacientes: true,
    citas: true,
    pagos: true,
    presupuestos: true,
    planesPago: true,
    tratamientos: false,
  })

  useEffect(() => {
    // Establecer fechas por defecto: mes actual
    const hoy = new Date()
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    
    setFechaInicio(primerDia.toISOString().split('T')[0])
    setFechaFin(ultimoDia.toISOString().split('T')[0])
  }, [])

  const toggleOpcion = (key) => {
    setOpcionesExport(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const seleccionarTodo = () => {
    setOpcionesExport({
      pacientes: true,
      citas: true,
      pagos: true,
      presupuestos: true,
      planesPago: true,
      tratamientos: true,
    })
  }

  const deseleccionarTodo = () => {
    setOpcionesExport({
      pacientes: false,
      citas: false,
      pagos: false,
      presupuestos: false,
      planesPago: false,
      tratamientos: false,
    })
  }

  const exportarAExcel = async () => {
    // Validar que al menos una opción esté seleccionada
    const algunaSeleccionada = Object.values(opcionesExport).some(v => v)
    if (!algunaSeleccionada) {
      alert('⚠️ Selecciona al menos una tabla para exportar')
      return
    }

    // Validar fechas
    if (!fechaInicio || !fechaFin) {
      alert('⚠️ Selecciona el rango de fechas')
      return
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      alert('⚠️ La fecha de inicio no puede ser mayor que la fecha de fin')
      return
    }

    try {
      setExportando(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Crear un nuevo libro de Excel
      const workbook = XLSX.utils.book_new()
      let totalRegistros = 0

      // ============================================
      // 1. PACIENTES
      // ============================================
      if (opcionesExport.pacientes) {
        console.log('📥 Exportando pacientes...')
        
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select(`
            *,
            ultima_cita:citas(fecha_cita)
          `)
          .eq('dentista_id', user.id)
          .order('created_at', { ascending: false })

        if (pacientes && pacientes.length > 0) {
          const datosPacientes = pacientes.map((p, index) => ({
            'Nº': index + 1,
            'Nombre': p.nombre || '',
            'Apellido': p.apellido || '',
            'Teléfono': p.telefono || '',
            'Email': p.email || '',
            'Dirección': p.direccion || '',
            'Fecha Registro': p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES') : '',
            'Última Cita': p.ultima_cita?.fecha_cita ? new Date(p.ultima_cita.fecha_cita).toLocaleDateString('es-ES') : 'Sin citas',
            'Notas': p.notas || ''
          }))

          const worksheet = XLSX.utils.json_to_sheet(datosPacientes)
          
          // Ajustar ancho de columnas
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 20 }, // Nombre
            { wch: 20 }, // Apellido
            { wch: 15 }, // Teléfono
            { wch: 25 }, // Email
            { wch: 30 }, // Dirección
            { wch: 15 }, // Fecha Registro
            { wch: 15 }, // Última Cita
            { wch: 40 }, // Notas
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes')
          totalRegistros += pacientes.length
          console.log(`✅ ${pacientes.length} pacientes exportados`)
        }
      }

      // ============================================
      // 2. CITAS
      // ============================================
      if (opcionesExport.citas) {
        console.log('📥 Exportando citas...')
        
        const { data: citas } = await supabase
          .from('citas')
          .select(`
            *,
            paciente:pacientes(nombre, apellido, telefono)
          `)
          .eq('dentista_id', user.id)
          .gte('fecha_cita', fechaInicio)
          .lte('fecha_cita', fechaFin)
          .order('fecha_cita', { ascending: false })

        if (citas && citas.length > 0) {
          const datosCitas = citas.map((c, index) => ({
            'Nº': index + 1,
            'Fecha': c.fecha_cita ? new Date(c.fecha_cita).toLocaleDateString('es-ES') : '',
            'Hora Inicio': c.hora_inicio || '',
            'Hora Fin': c.hora_fin || '',
            'Paciente': c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido}` : '',
            'Teléfono': c.paciente?.telefono || '',
            'Motivo': c.motivo || '',
            'Estado': c.estado || '',
            'Monto': c.monto || 0,
            'Notas': c.notas || ''
          }))

          const worksheet = XLSX.utils.json_to_sheet(datosCitas)
          
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 12 }, // Fecha
            { wch: 10 }, // Hora Inicio
            { wch: 10 }, // Hora Fin
            { wch: 25 }, // Paciente
            { wch: 15 }, // Teléfono
            { wch: 30 }, // Motivo
            { wch: 12 }, // Estado
            { wch: 12 }, // Monto
            { wch: 40 }, // Notas
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Citas')
          totalRegistros += citas.length
          console.log(`✅ ${citas.length} citas exportadas`)
        }
      }

      // ============================================
      // 3. PAGOS
      // ============================================
      if (opcionesExport.pagos) {
        console.log('📥 Exportando pagos...')
        
        const { data: pagos } = await supabase
          .from('pagos_pacientes')
          .select(`
            *,
            paciente:pacientes(nombre, apellido),
            presupuesto:presupuestos(numero_presupuesto)
          `)
          .eq('dentista_id', user.id)
          .gte('fecha_pago', fechaInicio)
          .lte('fecha_pago', fechaFin)
          .order('fecha_pago', { ascending: false })

        if (pagos && pagos.length > 0) {
          const datosPagos = pagos.map((p, index) => ({
            'Nº': index + 1,
            'Fecha': p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-ES') : '',
            'N° Recibo': p.numero_recibo || '',
            'Paciente': p.paciente ? `${p.paciente.nombre} ${p.paciente.apellido}` : '',
            'Concepto': p.concepto || '',
            'Presupuesto': p.presupuesto?.numero_presupuesto || 'N/A',
            'Monto': p.monto || 0,
            'Método': p.metodo_pago || '',
            'Notas': p.notas || ''
          }))

          const worksheet = XLSX.utils.json_to_sheet(datosPagos)
          
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 12 }, // Fecha
            { wch: 15 }, // N° Recibo
            { wch: 25 }, // Paciente
            { wch: 30 }, // Concepto
            { wch: 15 }, // Presupuesto
            { wch: 15 }, // Monto
            { wch: 12 }, // Método
            { wch: 40 }, // Notas
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')
          totalRegistros += pagos.length
          console.log(`✅ ${pagos.length} pagos exportados`)
        }
      }

      // ============================================
      // 4. PRESUPUESTOS
      // ============================================
      if (opcionesExport.presupuestos) {
        console.log('📥 Exportando presupuestos...')
        
        const { data: presupuestos } = await supabase
          .from('presupuestos')
          .select(`
            *,
            paciente:pacientes(nombre, apellido),
            pagos:pagos_pacientes(monto)
          `)
          .eq('dentista_id', user.id)
          .gte('fecha_emision', fechaInicio)
          .lte('fecha_emision', fechaFin)
          .order('fecha_emision', { ascending: false })

        if (presupuestos && presupuestos.length > 0) {
          const datosPresupuestos = presupuestos.map((pre, index) => {
            const totalPagado = pre.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0
            const saldoPendiente = pre.total - totalPagado

            return {
              'Nº': index + 1,
              'N° Presupuesto': pre.numero_presupuesto || '',
              'Fecha Emisión': pre.fecha_emision ? new Date(pre.fecha_emision).toLocaleDateString('es-ES') : '',
              'Paciente': pre.paciente ? `${pre.paciente.nombre} ${pre.paciente.apellido}` : '',
              'Tratamientos': pre.tratamientos?.map(t => t.nombre).join(', ') || '',
              'Total': pre.total || 0,
              'Pagado': totalPagado,
              'Saldo': saldoPendiente,
              'Estado': pre.estado || '',
              'Validez': pre.dias_validez ? `${pre.dias_validez} días` : '',
              'Notas': pre.notas || ''
            }
          })

          const worksheet = XLSX.utils.json_to_sheet(datosPresupuestos)
          
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 18 }, // N° Presupuesto
            { wch: 15 }, // Fecha
            { wch: 25 }, // Paciente
            { wch: 40 }, // Tratamientos
            { wch: 12 }, // Total
            { wch: 12 }, // Pagado
            { wch: 12 }, // Saldo
            { wch: 12 }, // Estado
            { wch: 12 }, // Validez
            { wch: 40 }, // Notas
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuestos')
          totalRegistros += presupuestos.length
          console.log(`✅ ${presupuestos.length} presupuestos exportados`)
        }
      }

      // ============================================
      // 5. PLANES DE PAGO
      // ============================================
      if (opcionesExport.planesPago) {
        console.log('📥 Exportando planes de pago...')
        
        const { data: planes } = await supabase
          .from('planes_pago')
          .select(`
            *,
            paciente:pacientes(nombre, apellido)
          `)
          .eq('dentista_id', user.id)
          .gte('fecha_inicio', fechaInicio)
          .lte('fecha_inicio', fechaFin)
          .order('fecha_inicio', { ascending: false })

        if (planes && planes.length > 0) {
          const datosPlanes = planes.map((plan, index) => {
            const cuotasPagadas = Math.floor(plan.monto_pagado / plan.monto_cuota)
            const saldoPendiente = plan.monto_total - plan.monto_pagado

            return {
              'Nº': index + 1,
              'Fecha Inicio': plan.fecha_inicio ? new Date(plan.fecha_inicio).toLocaleDateString('es-ES') : '',
              'Paciente': plan.paciente ? `${plan.paciente.nombre} ${plan.paciente.apellido}` : '',
              'Concepto': plan.concepto || '',
              'Monto Total': plan.monto_total || 0,
              'Monto Cuota': plan.monto_cuota || 0,
              'Cantidad Cuotas': plan.cantidad_cuotas || 0,
              'Cuotas Pagadas': cuotasPagadas,
              'Frecuencia': plan.frecuencia || '',
              'Monto Pagado': plan.monto_pagado || 0,
              'Saldo Pendiente': saldoPendiente,
              'Estado': plan.estado || '',
              'Notas': plan.notas || ''
            }
          })

          const worksheet = XLSX.utils.json_to_sheet(datosPlanes)
          
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 15 }, // Fecha Inicio
            { wch: 25 }, // Paciente
            { wch: 30 }, // Concepto
            { wch: 15 }, // Monto Total
            { wch: 15 }, // Monto Cuota
            { wch: 15 }, // Cantidad Cuotas
            { wch: 15 }, // Cuotas Pagadas
            { wch: 12 }, // Frecuencia
            { wch: 15 }, // Monto Pagado
            { wch: 15 }, // Saldo Pendiente
            { wch: 12 }, // Estado
            { wch: 40 }, // Notas
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Planes de Pago')
          totalRegistros += planes.length
          console.log(`✅ ${planes.length} planes exportados`)
        }
      }

      // ============================================
      // 6. TRATAMIENTOS
      // ============================================
      if (opcionesExport.tratamientos) {
        console.log('📥 Exportando tratamientos...')
        
        const { data: tratamientos } = await supabase
          .from('tratamientos')
          .select('*')
          .eq('dentista_id', user.id)
          .order('nombre')

        if (tratamientos && tratamientos.length > 0) {
          const datosTratamientos = tratamientos.map((t, index) => ({
            'Nº': index + 1,
            'Código': t.codigo || '',
            'Nombre': t.nombre || '',
            'Descripción': t.descripcion || '',
            'Precio': t.precio || 0,
            'Duración (min)': t.duracion_minutos || '',
            'Categoría': t.categoria || '',
            'Activo': t.activo ? 'Sí' : 'No'
          }))

          const worksheet = XLSX.utils.json_to_sheet(datosTratamientos)
          
          worksheet['!cols'] = [
            { wch: 5 },  // Nº
            { wch: 12 }, // Código
            { wch: 30 }, // Nombre
            { wch: 40 }, // Descripción
            { wch: 12 }, // Precio
            { wch: 15 }, // Duración
            { wch: 15 }, // Categoría
            { wch: 10 }, // Activo
          ]

          XLSX.utils.book_append_sheet(workbook, worksheet, 'Tratamientos')
          totalRegistros += tratamientos.length
          console.log(`✅ ${tratamientos.length} tratamientos exportados`)
        }
      }

      // ============================================
      // GENERAR Y DESCARGAR ARCHIVO
      // ============================================

      if (totalRegistros === 0) {
        alert('⚠️ No hay datos para exportar en el rango de fechas seleccionado')
        return
      }

      // Crear el archivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Crear nombre del archivo
      const fecha = new Date().toISOString().split('T')[0]
      const filename = `OdontoLog_Exportacion_${fecha}.xlsx`
      
      // Descargar
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log(`✅ Archivo exportado: ${filename}`)
      alert(`✅ Exportación completada!\n\n📊 Total registros: ${totalRegistros}\n📁 Archivo: ${filename}`)

    } catch (error) {
      console.error('Error exportando:', error)
      alert('❌ Error al exportar datos:\n' + error.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📊 Exportar Datos</div>
          <div style={styles.subtitle}>Descarga tus datos en Excel</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>ℹ️</div>
          <div style={styles.infoContent}>
            <div style={styles.infoTitle}>¿Cómo funciona la exportación?</div>
            <div style={styles.infoText}>
              Selecciona las tablas que deseas exportar y el rango de fechas. El sistema generará un archivo Excel (.xlsx) con múltiples hojas, una por cada tabla seleccionada.
            </div>
            <div style={styles.infoText}>
              <strong>💡 Consejo:</strong> El archivo se puede abrir con Excel, Google Sheets o LibreOffice.
            </div>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div style={styles.fechasCard}>
          <div style={styles.fechasTitle}>📅 Rango de Fechas</div>
          <div style={styles.fechasGrid}>
            <div style={styles.fechaGroup}>
              <label style={styles.fechaLabel}>Fecha Inicio:</label>
              <input
                type="date"
                style={styles.fechaInput}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div style={styles.fechaGroup}>
              <label style={styles.fechaLabel}>Fecha Fin:</label>
              <input
                type="date"
                style={styles.fechaInput}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <div style={styles.fechasInfo}>
            ℹ️ Las fechas se aplican a: <strong>citas, pagos, presupuestos y planes de pago</strong>. Los pacientes y tratamientos se exportan completos.
          </div>
        </div>

        {/* Selección de Tablas */}
        <div style={styles.tablasCard}>
          <div style={styles.tablasHeader}>
            <div style={styles.tablasTitle}>📋 Seleccionar Tablas</div>
            <div style={styles.tablasButtons}>
              <button style={styles.selectAllButton} onClick={seleccionarTodo}>
                ✓ Todas
              </button>
              <button style={styles.selectNoneButton} onClick={deseleccionarTodo}>
                ✕ Ninguna
              </button>
            </div>
          </div>

          <div style={styles.opcionesGrid}>
            {/* Pacientes */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.pacientes && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('pacientes')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.pacientes ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>👥</div>
              <div style={styles.opcionLabel}>Pacientes</div>
              <div style={styles.opcionDesc}>Lista completa con contactos</div>
            </div>

            {/* Citas */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.citas && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('citas')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.citas ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>📅</div>
              <div style={styles.opcionLabel}>Citas</div>
              <div style={styles.opcionDesc}>Agenda y estado de citas</div>
            </div>

            {/* Pagos */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.pagos && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('pagos')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.pagos ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>💰</div>
              <div style={styles.opcionLabel}>Pagos</div>
              <div style={styles.opcionDesc}>Historial de ingresos</div>
            </div>

            {/* Presupuestos */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.presupuestos && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('presupuestos')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.presupuestos ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>📄</div>
              <div style={styles.opcionLabel}>Presupuestos</div>
              <div style={styles.opcionDesc}>Estado y saldo de presupuestos</div>
            </div>

            {/* Planes de Pago */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.planesPago && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('planesPago')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.planesPago ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>💳</div>
              <div style={styles.opcionLabel}>Planes de Pago</div>
              <div style={styles.opcionDesc}>Cuotas y cobranza</div>
            </div>

            {/* Tratamientos */}
            <div
              style={{
                ...styles.opcionCard,
                ...(opcionesExport.tratamientos && styles.opcionCardActive)
              }}
              onClick={() => toggleOpcion('tratamientos')}
            >
              <div style={styles.opcionCheckbox}>
                {opcionesExport.tratamientos ? '✓' : ''}
              </div>
              <div style={styles.opcionIcon}>🦷</div>
              <div style={styles.opcionLabel}>Tratamientos</div>
              <div style={styles.opcionDesc}>Catálogo de servicios</div>
            </div>
          </div>
        </div>

        {/* Botón Exportar */}
        <div style={styles.exportSection}>
          <button
            style={{
              ...styles.exportButton,
              ...(exportando && styles.exportButtonDisabled)
            }}
            onClick={exportarAExcel}
            disabled={exportando}
          >
            {exportando ? (
              <>
                <span style={styles.spinner}>⏳</span>
                Exportando...
              </>
            ) : (
              <>
                📥 Exportar a Excel
              </>
            )}
          </button>
        </div>
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
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    gap: '20px',
  },
  infoIcon: {
    fontSize: '40px',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '12px',
  },
  infoText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '8px',
  },
  fechasCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  fechasTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  fechasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '16px',
  },
  fechaGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  fechaLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  fechaInput: {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
  },
  fechasInfo: {
    fontSize: '13px',
    color: '#6b7280',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  tablasCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  tablasHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  tablasTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  tablasButtons: {
    display: 'flex',
    gap: '8px',
  },
  selectAllButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  selectNoneButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  opcionesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  opcionCard: {
    position: 'relative',
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  opcionCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  opcionCheckbox: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
  },
  opcionIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  opcionLabel: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  opcionDesc: {
    fontSize: '13px',
    color: '#6b7280',
  },
  exportSection: {
    display: 'flex',
    justifyContent: 'center',
  },
  exportButton: {
    padding: '16px 48px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
  },
  exportButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
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