import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generarReciboPDF } from '../utils/pdfGenerator'  // ← AGREGAR ESTA LÍNEA


export default function PlanPagoDetailScreen() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [plan, setPlan] = useState(null)
  const [cuotas, setCuotas] = useState([])
  const [paciente, setPaciente] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [planId])

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

      // Cargar plan de pago
      const { data: planData, error: planError } = await supabase
        .from('planes_pago')
        .select('*')
        .eq('id', planId)
        .single()

      if (planError) throw planError
      setPlan(planData)

      // Cargar paciente
      if (location.state?.paciente) {
        setPaciente(location.state.paciente)
      } else {
        const { data: pacienteData } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', planData.paciente_id)
          .single()
        setPaciente(pacienteData)
      }

      // Cargar cuotas
      const { data: cuotasData, error: cuotasError } = await supabase
        .from('cuotas_plan_pago')
        .select('*')
        .eq('plan_pago_id', planId)
        .order('numero_cuota')

      if (cuotasError) throw cuotasError
      setCuotas(cuotasData || [])

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar plan de pago')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatMoney = (value) => {
    return `${config?.simbolo_moneda || 'Gs.'} ${Number(value).toLocaleString('es-PY')}`
  }

  const getCuotaEstadoColor = (estado) => {
    const colors = {
      pendiente: '#f59e0b',
      pagada: '#10b981',
      vencida: '#ef4444',
      cancelada: '#6b7280'
    }
    return colors[estado] || '#6b7280'
  }

  const registrarPagoCuota = async (cuota) => {
  if (cuota.estado === 'pagada') {
    alert('Esta cuota ya está pagada')
    return
  }

  const confirmar = window.confirm(
    `¿Confirmar pago de la Cuota ${cuota.numero_cuota}?\n\nMonto: ${formatMoney(cuota.monto_cuota)}`
  )

  if (!confirmar) return

  try {
    // Registrar pago en pagos_pacientes
    const { data: { user } } = await supabase.auth.getUser()
    
    // Generar número de recibo
    const { data: configData } = await supabase
      .from('configuracion_clinica')
      .select('proximo_numero_recibo, prefijo_recibo')
      .eq('dentista_id', user.id)
      .single()

    const numeroRecibo = `${configData.prefijo_recibo}-${String(configData.proximo_numero_recibo).padStart(6, '0')}`

    // Incrementar contador
    await supabase
      .from('configuracion_clinica')
      .update({ proximo_numero_recibo: configData.proximo_numero_recibo + 1 })
      .eq('dentista_id', user.id)

    // Crear pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_pacientes')
      .insert({
        dentista_id: user.id,
        paciente_id: plan.paciente_id,
        numero_recibo: numeroRecibo,
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: cuota.monto_cuota,
        metodo_pago: 'efectivo', // Por defecto
        concepto: `${plan.descripcion} - Cuota ${cuota.numero_cuota}/${plan.cantidad_cuotas}`,
        notas: `Pago de cuota - Plan ${plan.numero_plan}`,
        documento_generado: false,
        documento_enviado: false,
      })
      .select()
      .single()

    if (pagoError) throw pagoError

    // Actualizar estado de la cuota
    const { error: cuotaError } = await supabase
      .from('cuotas_plan_pago')
      .update({
        estado: 'pagada',
        pago_id: pago.id,
        fecha_pago: new Date().toISOString().split('T')[0]
      })
      .eq('id', cuota.id)

    if (cuotaError) throw cuotaError

    // Actualizar plan de pago
    const nuevasCuotasPagadas = plan.cuotas_pagadas + 1
    const nuevoMontoPagado = plan.monto_pagado + cuota.monto_cuota
    const nuevoEstado = nuevasCuotasPagadas === plan.cantidad_cuotas ? 'completado' : 'activo'

    const { error: planError } = await supabase
      .from('planes_pago')
      .update({
        cuotas_pagadas: nuevasCuotasPagadas,
        monto_pagado: nuevoMontoPagado,
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id)

    if (planError) throw planError

    // Registrar ingreso
    await supabase
      .from('ingresos_clinica')
      .insert({
        dentista_id: user.id,
        paciente_id: plan.paciente_id,
        categoria: 'pago_cuota',
        descripcion: `${plan.descripcion} - Cuota ${cuota.numero_cuota}`,
        monto: cuota.monto_cuota,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo',
        estado: 'recibido',
      })

    // NUEVO: Preguntar si quiere descargar el recibo
    const descargarPDF = window.confirm(
      `✅ Cuota ${cuota.numero_cuota} pagada exitosamente\n\nRecibo: ${numeroRecibo}\n\n¿Deseas descargar el recibo en PDF ahora?`
    )

    if (descargarPDF) {
      // Importar la función en el inicio del archivo si no está
      const { generarReciboPDF } = await import('../utils/pdfGenerator')
      await generarReciboPDF(pago, paciente, config)
    } else {
      alert(`✅ Cuota ${cuota.numero_cuota} pagada exitosamente\n\nRecibo: ${numeroRecibo}`)
    }
    
    // Recargar datos
    loadData()

  } catch (error) {
    console.error('Error:', error)
    alert('Error al registrar pago: ' + error.message)
  }
}
const reimprimirRecibo = async (cuota) => {
  try {
    if (!cuota.pago_id) {
      alert('Esta cuota no tiene un recibo asociado')
      return
    }

    // Cargar el pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_pacientes')
      .select('*')
      .eq('id', cuota.pago_id)
      .single()

    if (pagoError) throw pagoError

    // Generar PDF
    await generarReciboPDF(pago, paciente, config)

  } catch (error) {
    console.error('Error:', error)
    alert('Error al generar recibo: ' + error.message)
  }
}

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando...</div>
      </div>
    )
  }

  const porcentajePagado = plan.monto_total > 0 
    ? Math.round((plan.monto_pagado / plan.monto_total) * 100)
    : 0

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/paciente/${plan.paciente_id}`)} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📅 Plan de Pago</div>
          <div style={styles.subtitle}>{plan.numero_plan}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info del Paciente */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>👤 Paciente</div>
          <div style={styles.patientName}>
            {paciente?.nombre} {paciente?.apellido}
          </div>
        </div>

        {/* Resumen del Plan */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>📊 Resumen del Plan</div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Descripción:</span>
            <span style={styles.summaryValue}>{plan.descripcion}</span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Monto Total:</span>
            <span style={styles.summaryValueBold}>{formatMoney(plan.monto_total)}</span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Cuotas:</span>
            <span style={styles.summaryValue}>
              {plan.cuotas_pagadas} / {plan.cantidad_cuotas} pagadas
            </span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Valor por cuota:</span>
            <span style={styles.summaryValue}>{formatMoney(plan.monto_cuota)}</span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Frecuencia:</span>
            <span style={styles.summaryValue}>{plan.frecuencia}</span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Monto Pagado:</span>
            <span style={styles.summaryValueSuccess}>{formatMoney(plan.monto_pagado)}</span>
          </div>
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Saldo Pendiente:</span>
            <span style={styles.summaryValueDanger}>
              {formatMoney(plan.monto_total - plan.monto_pagado)}
            </span>
          </div>

          {/* Barra de Progreso */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${porcentajePagado}%`
                }}
              />
            </div>
            <div style={styles.progressText}>{porcentajePagado}%</div>
          </div>

          <div style={styles.estadoBadge}>
            Estado: <strong>{plan.estado.toUpperCase()}</strong>
          </div>
        </div>

        {/* Lista de Cuotas */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📋 Cuotas ({cuotas.length})</div>
          
          <div style={styles.cuotasList}>
            {cuotas.map((cuota, index) => {
              const isVencida = cuota.estado === 'pendiente' && 
                new Date(cuota.fecha_vencimiento) < new Date()
              
              const estadoFinal = isVencida ? 'vencida' : cuota.estado

              return (
                <div 
                  key={index} 
                  style={{
                    ...styles.cuotaCard,
                    borderLeftColor: getCuotaEstadoColor(estadoFinal)
                  }}
                >
                  <div style={styles.cuotaHeader}>
                    <div style={styles.cuotaNumero}>
                      Cuota {cuota.numero_cuota}
                    </div>
                    <div style={{
                      ...styles.cuotaEstado,
                      backgroundColor: getCuotaEstadoColor(estadoFinal)
                    }}>
                      {estadoFinal}
                    </div>
                  </div>

                  <div style={styles.cuotaDetalle}>
                    <span style={styles.cuotaLabel}>Monto:</span>
                    <span style={styles.cuotaMonto}>{formatMoney(cuota.monto_cuota)}</span>
                  </div>

                  <div style={styles.cuotaDetalle}>
                    <span style={styles.cuotaLabel}>Vencimiento:</span>
                    <span style={styles.cuotaValue}>{formatDate(cuota.fecha_vencimiento)}</span>
                  </div>

                  {cuota.fecha_pago && (
                    <div style={styles.cuotaDetalle}>
                      <span style={styles.cuotaLabel}>Fecha de Pago:</span>
                      <span style={{...styles.cuotaValue, color: '#10b981'}}>
                        {formatDate(cuota.fecha_pago)}
                      </span>
                    </div>
                  )}

                  {cuota.estado === 'pendiente' && (
                    <button
                      style={styles.pagarButton}
                      onClick={() => registrarPagoCuota(cuota)}
                    >
                      💰 Registrar Pago
                    </button>
                  )}

                  {cuota.estado === 'pagada' && (
                    <>
                      <div style={styles.pagadaBadge}>
                        ✅ Pagada
                      </div>
                      <button
                        style={{...styles.pagarButton, backgroundColor: '#3b82f6', marginTop: '8px'}}
                        onClick={() => reimprimirRecibo(cuota)}
                      >
                        📄 Reimprimir Recibo
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
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
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
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
    marginBottom: '16px',
  },
  patientName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e40af',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #dbeafe',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryValueBold: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryValueSuccess: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#10b981',
  },
  summaryValueDanger: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ef4444',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
    marginBottom: '16px',
  },
  progressBar: {
    flex: 1,
    height: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
    borderRadius: '6px',
  },
  progressText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    minWidth: '45px',
    textAlign: 'right',
  },
  estadoBadge: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  cuotasList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  cuotaCard: {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '16px',
  },
  cuotaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cuotaNumero: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  cuotaEstado: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cuotaDetalle: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cuotaLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  cuotaMonto: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669',
  },
  cuotaValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
  },
  pagarButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  pagadaBadge: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#d1fae5',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#059669',
    marginTop: '8px',
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