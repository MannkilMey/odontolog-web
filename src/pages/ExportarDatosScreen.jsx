import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'

export default function ExportarDatosScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  
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
      alert(t('export.selectAtLeastOne'))
      return
    }

    // Validar fechas
    if (!fechaInicio || !fechaFin) {
       alert(t('export.selectDateRange'))
      return
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      alert(t('export.invalidDateRange'))
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
            [t('patients.firstName')]: p.nombre || '',
            [t('patients.lastName')]: p.apellido || '',
            [t('common.phone')]: p.telefono || '',
            [t('common.email')]: p.email || '',
            [t('common.address')]: p.direccion || '',
            [t('export.registrationDate')]: p.created_at ? new Date(p.created_at).toLocaleDateString(i18n.language) : '',
            [t('export.lastAppointment')]: p.ultima_cita?.fecha_cita ? new Date(p.ultima_cita.fecha_cita).toLocaleDateString(i18n.language) : t('export.noAppointments'),
            [t('common.notes')]: p.notas || ''
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('patients.title'))
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
            [t('common.date')]: c.fecha_cita ? new Date(c.fecha_cita).toLocaleDateString(i18n.language) : '',
            [t('crearCita.startTime')]: c.hora_inicio || '',
            [t('crearCita.endTime')]: c.hora_fin || '',
            [t('appointments.patient')]: c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido}` : '',
            [t('common.phone')]: c.paciente?.telefono || '',
            [t('appointments.reason')]: c.motivo || '',
            [t('common.status')]: c.estado || '',
            [t('export.amount')]: c.monto || 0,
            [t('common.notes')]: c.notas || ''
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('nav.appointments'))
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
            [t('common.date')]: p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString(i18n.language) : '',
            [t('export.receiptNumber')]: p.numero_recibo || '',
            [t('appointments.patient')]: p.paciente ? `${p.paciente.nombre} ${p.paciente.apellido}` : '',
            [t('export.concept')]: p.concepto || '',
            [t('export.budget')]: p.presupuesto?.numero_presupuesto || 'N/A',
            [t('export.amount')]: p.monto || 0,
            [t('export.method')]: p.metodo_pago || '',
            [t('common.notes')]: p.notas || ''
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('billing.payments'))
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
              [t('export.budgetNumber')]: pre.numero_presupuesto || '',
              [t('export.issueDate')]: pre.fecha_emision ? new Date(pre.fecha_emision).toLocaleDateString(i18n.language) : '',
              [t('appointments.patient')]: pre.paciente ? `${pre.paciente.nombre} ${pre.paciente.apellido}` : '',
              [t('export.treatments')]: pre.tratamientos?.map(t => t.nombre).join(', ') || '',
              ['Total']: pre.total || 0,
              [t('export.paid')]: totalPagado,
              [t('cuentas.balance')]: saldoPendiente,
              [t('common.status')]: pre.estado || '',
              [t('export.validity')]: pre.dias_validez ? `${pre.dias_validez} ${t('common.days')}` : '',
              [t('common.notes')]: pre.notas || ''
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('billing.budgets'))
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
              [t('planPago.startDate')]: plan.fecha_inicio ? new Date(plan.fecha_inicio).toLocaleDateString(i18n.language) : '',
              [t('appointments.patient')]: plan.paciente ? `${plan.paciente.nombre} ${plan.paciente.apellido}` : '',
              [t('export.concept')]: plan.concepto || '',
              [t('planPago.totalAmount')]: plan.monto_total || 0,
              [t('export.installmentAmount')]: plan.monto_cuota || 0,
              [t('planPago.installmentCount')]: plan.cantidad_cuotas || 0,
              [t('export.paidInstallments')]: cuotasPagadas,
              [t('planPago.frequency')]: plan.frecuencia || '',
              [t('export.amountPaid')]: plan.monto_pagado || 0,
              [t('export.pendingBalance')]: saldoPendiente,
              [t('common.status')]: plan.estado || '',
              [t('common.notes')]: plan.notas || ''
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('planPago.title'))
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
            [t('export.code')]: t.codigo || '',
            [t('common.name')]: t.nombre || '',
            [t('common.description')]: t.descripcion || '',
            [t('export.price')]: t.precio || 0,
            [t('export.durationMin')]: t.duracion_minutos || '',
            [t('catalog.category')]: t.categoria || '',
            [t('common.active')]: t.activo ? t('common.yes') : t('common.no')
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

          XLSX.utils.book_append_sheet(workbook, worksheet, t('export.treatments'))
          totalRegistros += tratamientos.length
          console.log(`✅ ${tratamientos.length} tratamientos exportados`)
        }
      }

      // ============================================
      // GENERAR Y DESCARGAR ARCHIVO
      // ============================================

      if (totalRegistros === 0) {
        alert(t('export.noData'))
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
      alert(`✅ ${t('export.completed')}\n\n📊 ${t('export.totalRecords')}: ${totalRegistros}\n📁 ${t('export.file')}: ${filename}`)

    } catch (error) {
      console.error('Error exportando:', error)
      alert(`❌ ${t('errors.generic')}:\n` + error.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
         {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📊 {t('export.title')}</div>
          <div style={styles.subtitle}>{t('export.subtitle')}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>ℹ️</div>
          <div style={styles.infoContent}>
            <div style={styles.infoTitle}>{t('export.howItWorks')}</div>
            <div style={styles.infoText}>
              {t('export.howItWorksDesc')}
            </div>
            <div style={styles.infoText}>
                <strong>💡 {t('export.tip')}:</strong> {t('export.tipDesc')}
            </div>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div style={styles.fechasCard}>
          <div style={styles.fechasTitle}>📅 {t('export.dateRange')}</div>
          <div style={styles.fechasGrid}>
            <div style={styles.fechaGroup}>
              <label style={styles.fechaLabel}>{t('planPago.startDate')}:</label>
              <input
                type="date"
                style={styles.fechaInput}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div style={styles.fechaGroup}>
              <label style={styles.fechaLabel}>{t('export.endDate')}:</label>
              <input
                type="date"
                style={styles.fechaInput}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <div style={styles.fechasInfo}>
            ℹ️ {t('export.dateInfo')}
          </div>
        </div>

        {/* Selección de Tablas */}
        <div style={styles.tablasCard}>
          <div style={styles.tablasHeader}>
            <div style={styles.tablasTitle}>📋{t('export.selectTables')}</div>
            <div style={styles.tablasButtons}>
              <button style={styles.selectAllButton} onClick={seleccionarTodo}>
                ✓ {t('common.all')}
              </button>
              <button style={styles.selectNoneButton} onClick={deseleccionarTodo}>
                ✕ {t('common.none')}
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
              <div style={styles.opcionLabel}>{t('patients.title')}</div>
              <div style={styles.opcionDesc}>{t('export.patientsDesc')}</div>
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
              <div style={styles.opcionLabel}>{t('nav.appointments')}</div>
              <div style={styles.opcionDesc}>{t('export.appointmentsDesc')}</div>
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
              <div style={styles.opcionLabel}>{t('billing.payments')}</div>
              <div style={styles.opcionDesc}>{t('export.paymentsDesc')}</div>
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
              <div style={styles.opcionLabel}>{t('billing.budgets')}</div>
              <div style={styles.opcionDesc}>{t('export.budgetsDesc')}</div>
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
              <div style={styles.opcionLabel}>{t('planPago.title')}</div>
              <div style={styles.opcionDesc}>{t('export.paymentPlansDesc')}</div>
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
              <div style={styles.opcionLabel}>{t('export.treatments')}</div>
              <div style={styles.opcionDesc}>{t('export.treatmentsDesc')}</div>
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
                {t('export.exporting')}
              </>
            ) : (
              <>
                📥 {t('export.exportToExcel')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>{t('common.poweredBy')}</div>
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