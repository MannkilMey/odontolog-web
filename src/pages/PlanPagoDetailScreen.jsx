import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { generarReciboPDF } from '../utils/pdfGenerator'
import { useMoneda } from '../hooks/useMoneda'

export default function PlanPagoDetailScreen() {
  const { id: planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  const [plan, setPlan] = useState(null)
  const [cuotas, setCuotas] = useState([])
  const [paciente, setPaciente] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReciboModal, setShowReciboModal] = useState(false)
  const [pagoRegistrado, setPagoRegistrado] = useState(null)
  const [cuotaPagada, setCuotaPagada] = useState(null)
  const [enviarPor, setEnviarPor] = useState({ email: true, whatsapp: false })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [planId])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: configData } = await supabase
        .from('configuracion_clinica').select('*')
        .eq('dentista_id', user.id).single()
      setConfig(configData)

      const { data: planData, error: planError } = await supabase
        .from('planes_pago').select('*').eq('id', planId).single()
      if (planError) throw planError
      setPlan(planData)

      if (location.state?.paciente) {
        setPaciente(location.state.paciente)
      } else {
        const { data: pacienteData } = await supabase
          .from('pacientes').select('*').eq('id', planData.paciente_id).single()
        setPaciente(pacienteData)
      }

      const { data: cuotasData, error: cuotasError } = await supabase
        .from('cuotas_plan_pago').select('*')
        .eq('plan_pago_id', planId).order('numero_cuota')
      if (cuotasError) throw cuotasError
      setCuotas(cuotasData || [])

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('planPagoDetail.titlePlain') }))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return t('planPagoDetail.notSpecified')
    return new Date(dateString + 'T12:00:00').toLocaleDateString(i18n.language, {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const getCuotaEstadoColor = (estado) => {
    const colors = {
      pendiente: '#f59e0b', pagada: '#10b981',
      vencida: '#ef4444',   cancelada: '#6b7280'
    }
    return colors[estado] || '#6b7280'
  }

  const registrarPagoCuota = async (cuota) => {
    if (cuota.estado === 'pagada') {
      alert(t('planPagoDetail.alreadyPaid'))
      return
    }

    const confirmar = window.confirm(
      t('planPagoDetail.confirmPay', {
        number: cuota.numero_cuota,
        amount: formatMoney(cuota.monto_cuota)
      })
    )
    if (!confirmar) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: configData } = await supabase
        .from('configuracion_clinica')
        .select('proximo_numero_recibo, prefijo_recibo')
        .eq('dentista_id', user.id).single()

      const numeroRecibo = `${configData.prefijo_recibo}-${String(configData.proximo_numero_recibo).padStart(6, '0')}`

      await supabase.from('configuracion_clinica')
        .update({ proximo_numero_recibo: configData.proximo_numero_recibo + 1 })
        .eq('dentista_id', user.id)

      const { data: pago, error: pagoError } = await supabase
        .from('pagos_pacientes')
        .insert({
          dentista_id: user.id,
          paciente_id: plan.paciente_id,
          numero_recibo: numeroRecibo,
          fecha_pago: new Date().toISOString().split('T')[0],
          monto: cuota.monto_cuota,
          metodo_pago: 'efectivo',
          concepto: `${plan.descripcion} - Cuota ${cuota.numero_cuota}/${plan.cantidad_cuotas}`,
          notas: `Pago de cuota - Plan ${plan.numero_plan}`,
          documento_generado: false,
          documento_enviado: false,
        })
        .select().single()

      if (pagoError) throw pagoError

      const { error: cuotaError } = await supabase
        .from('cuotas_plan_pago')
        .update({ estado: 'pagada', pago_id: pago.id, fecha_pago: new Date().toISOString().split('T')[0] })
        .eq('id', cuota.id)
      if (cuotaError) throw cuotaError

      const nuevasCuotasPagadas = plan.cuotas_pagadas + 1
      const nuevoMontoPagado    = plan.monto_pagado + cuota.monto_cuota
      const nuevoEstado         = nuevasCuotasPagadas === plan.cantidad_cuotas ? 'completado' : 'activo'

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

      await supabase.from('ingresos_clinica').insert({
        dentista_id: user.id,
        paciente_id: plan.paciente_id,
        categoria: 'pago_cuota',
        descripcion: `${plan.descripcion} - Cuota ${cuota.numero_cuota}`,
        monto: cuota.monto_cuota,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo',
        estado: 'recibido',
      })

      setPagoRegistrado(pago)
      setCuotaPagada({
        ...cuota,
        numero_cuota: cuota.numero_cuota,
        cuotas_totales: plan.cantidad_cuotas,
        cuotas_pagadas: nuevasCuotasPagadas,
        saldo_pendiente: plan.monto_total - nuevoMontoPagado
      })
      setShowReciboModal(true)

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.saveError', { item: t('planPagoDetail.receipt') }))
    }
  }

  const enviarReciboAutomatico = async () => {
    try {
      setSending(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (enviarPor.email && paciente.email) {
        await enviarReciboCuotaEmail(pagoRegistrado, paciente, config, user.id)
      }
      if (enviarPor.whatsapp && paciente.telefono) {
        await enviarReciboCuotaWhatsApp(pagoRegistrado, paciente, config, user.id)
      }

      const descargarPDF = window.confirm(t('planPagoDetail.confirmDownloadPDF'))
      if (descargarPDF) {
        await generarReciboPDF(pagoRegistrado, paciente, config, t, i18n.language)
      }

      setShowReciboModal(false)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.sendError', { item: t('planPagoDetail.receipt') }))
    } finally {
      setSending(false)
    }
  }

  const enviarReciboCuotaEmail = async (pago, paciente, config, dentistaId) => {
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

    const fechaPago = new Date(pago.fecha_pago + 'T12:00:00')
    const fechaFormateada = fechaPago.toLocaleDateString(i18n.language, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 20px;">🧾 ${t('planPagoDetail.emailReceiptTitle')}</p>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: #f0fdf4; padding: 12px 24px; border-radius: 8px; border: 2px solid #10b981;">
              <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: 600;">${t('planPagoDetail.emailReceiptNumber')}</p>
              <p style="margin: 4px 0 0 0; font-size: 24px; color: #059669; font-weight: 700;">${pago.numero_recibo}</p>
            </div>
          </div>
          <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">${t('planPagoDetail.emailReceivedFrom')}</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">
              ${paciente.nombre} ${paciente.apellido || ''}
            </p>
            ${paciente.documento ? `<p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">CI: ${paciente.documento}</p>` : ''}
          </div>
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 2px solid #3b82f6;">
            <p style="color: #1e40af; margin: 0; font-size: 16px; font-weight: 700;">
              📊 ${t('planPagoDetail.emailInstallmentCounter', { number: cuotaPagada.numero_cuota, total: cuotaPagada.cuotas_totales })}
            </p>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
              ${t('planPagoDetail.installmentsPaid', { paid: cuotaPagada.cuotas_pagadas, total: cuotaPagada.cuotas_totales })}
            </p>
          </div>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailInstallmentAmount')}</strong> ${formatMoney(pago.monto)}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPaymentDate')}</strong> ${fechaFormateada}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPaymentMethod')}</strong> ${pago.metodo_pago.charAt(0).toUpperCase() + pago.metodo_pago.slice(1)}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPlan')}</strong> ${plan.descripcion}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPendingBalance')}</strong> ${formatMoney(cuotaPagada.saldo_pendiente)}</p>
          </div>
          ${cuotaPagada.cuotas_pagadas === cuotaPagada.cuotas_totales ? `
            <div style="background: #d1fae5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #059669; margin: 0; font-size: 18px; font-weight: 700;">${t('planPagoDetail.planCompleted')}</p>
              <p style="color: #065f46; margin: 8px 0 0 0; font-size: 14px;">${t('planPagoDetail.planCompletedSub')}</p>
            </div>
          ` : ''}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>${nombreClinica}</strong><br>
              ${config?.direccion || ''}<br>
              ${config?.telefono ? `📱 ${config.telefono}` : ''}<br>
              ${config?.email ? `📧 ${config.email}` : ''}
            </p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">${t('planPagoDetail.emailPoweredBy')}</p>
          </div>
        </div>
      </div>
    `

    const resendResponse = await fetch(
      'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/enviar-recibo-email',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombreClinica,
          paciente: { nombre: paciente.nombre, apellido: paciente.apellido, email: paciente.email, documento: paciente.documento, id: paciente.id },
          pago: { numero_recibo: pago.numero_recibo, monto: pago.monto, fecha_pago: pago.fecha_pago, metodo_pago: pago.metodo_pago, concepto: pago.concepto, notas: pago.notas, id: pago.id },
          config: { simbolo_moneda: config.simbolo_moneda, direccion: config.direccion, telefono: config.telefono, email: config.email },
          html
        })
      }
    )

    const resendResult = await resendResponse.json()
    if (!resendResponse.ok) {
      console.error('Error de Resend:', resendResult)
      throw new Error('Error al enviar email')
    }

    await supabase.from('mensajes_enviados').insert({
      dentista_id: dentistaId,
      paciente_id: paciente.id,
      tipo: 'recibo_cuota',
      canal: 'email',
      destinatario: paciente.email,
      asunto: `🧾 ${t('planPagoDetail.emailReceiptTitle')} - Cuota ${cuotaPagada.numero_cuota}/${cuotaPagada.cuotas_totales} - ${pago.numero_recibo}`,
      mensaje: html.substring(0, 1000),
      estado: 'enviado',
      metadata: { pago_id: pago.id, numero_recibo: pago.numero_recibo, monto: pago.monto, cuota_numero: cuotaPagada.numero_cuota, cuotas_totales: cuotaPagada.cuotas_totales, plan_pago_id: plan.id, automatico: false },
      fecha_enviado: new Date().toISOString()
    })

    await incrementarContador(dentistaId)
  }

  const enviarReciboCuotaWhatsApp = async (pago, paciente, config, dentistaId) => {
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

    let telefono = paciente.telefono.replace(/[^0-9]/g, '')
    if (!telefono.startsWith('595')) telefono = '595' + telefono

    const fechaPago = new Date(pago.fecha_pago + 'T12:00:00')
    const fechaFormateada = fechaPago.toLocaleDateString(i18n.language, {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const mensaje = `Hola ${paciente.nombre},

${t('planPagoDetail.waReceiptTitle')}
${nombreClinica}

${t('planPagoDetail.waReceiptNumber', { number: pago.numero_recibo })}

📊 *${t('planPagoDetail.waInstallmentCounter', { number: cuotaPagada.numero_cuota, total: cuotaPagada.cuotas_totales })}*
${t('planPagoDetail.installmentsPaid', { paid: cuotaPagada.cuotas_pagadas, total: cuotaPagada.cuotas_totales })}

${t('planPagoDetail.waInstallmentAmount')} ${formatMoney(pago.monto)}
${t('planPagoDetail.waDate')} ${fechaFormateada}
${t('planPagoDetail.waMethod')} ${pago.metodo_pago.charAt(0).toUpperCase() + pago.metodo_pago.slice(1)}
${t('planPagoDetail.waPlan')} ${plan.descripcion}

${cuotaPagada.saldo_pendiente > 0
  ? `${t('planPagoDetail.waPendingBalance')} ${formatMoney(cuotaPagada.saldo_pendiente)}`
  : t('planPagoDetail.waCompleted')}

${t('planPagoDetail.waThanks')}

${config?.telefono ? `Tel: ${config.telefono}` : ''}`

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')

    await supabase.from('mensajes_enviados').insert({
      dentista_id: dentistaId,
      paciente_id: paciente.id,
      tipo: 'recibo_cuota',
      canal: 'whatsapp',
      destinatario: paciente.telefono,
      mensaje,
      estado: 'enviado',
      metadata: { pago_id: pago.id, numero_recibo: pago.numero_recibo, monto: pago.monto, cuota_numero: cuotaPagada.numero_cuota, cuotas_totales: cuotaPagada.cuotas_totales, plan_pago_id: plan.id, automatico: false },
      fecha_enviado: new Date().toISOString()
    })

    await incrementarContador(dentistaId)
  }

  const incrementarContador = async (dentistaId) => {
    try {
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios')
        .select('mensajes_usados_mes, ultimo_reset_contador')
        .eq('dentista_id', dentistaId).single()

      if (!suscripcion) return

      const hoy = new Date()
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
      const ultimoReset = suscripcion.ultimo_reset_contador?.split('T')[0]

      if (!ultimoReset || ultimoReset < primerDiaMes) {
        await supabase.from('suscripciones_usuarios')
          .update({ mensajes_usados_mes: 1, ultimo_reset_contador: new Date().toISOString() })
          .eq('dentista_id', dentistaId)
      } else {
        await supabase.from('suscripciones_usuarios')
          .update({ mensajes_usados_mes: (suscripcion.mensajes_usados_mes || 0) + 1 })
          .eq('dentista_id', dentistaId)
      }
    } catch (error) {
      console.error('Error incrementando contador:', error)
    }
  }

  const reimprimirRecibo = async (cuota) => {
    try {
      if (!cuota.pago_id) {
        alert(t('planPagoDetail.noReceiptAssociated'))
        return
      }
      const { data: pago, error: pagoError } = await supabase
        .from('pagos_pacientes').select('*').eq('id', cuota.pago_id).single()
      if (pagoError) throw pagoError
      await generarReciboPDF(pago, paciente, config, t, i18n.language)
    } catch (error) {
      console.error('Error:', error)
      alert(t('planPagoDetail.errorGeneratingReceipt'))
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>{t('common.loading')}</div>
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
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('planPagoDetail.title')}</div>
          <div style={styles.subtitle}>{plan.numero_plan}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Paciente */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('planPagoDetail.patientSection')}</div>
          <div style={styles.patientName}>{paciente?.nombre} {paciente?.apellido}</div>
        </div>

        {/* Resumen */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>{t('planPagoDetail.summaryTitle')}</div>

          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryDescription')}</span>
            <span style={styles.summaryValue}>{plan.descripcion}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryTotal')}</span>
            <span style={styles.summaryValueBold}>{formatMoney(plan.monto_total)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryInstallments')}</span>
            <span style={styles.summaryValue}>
              {t('planPagoDetail.installmentsPaid', { paid: plan.cuotas_pagadas, total: plan.cantidad_cuotas })}
            </span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryInstallmentValue')}</span>
            <span style={styles.summaryValue}>{formatMoney(plan.monto_cuota)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryFrequency')}</span>
            <span style={styles.summaryValue}>{plan.frecuencia}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryPaid')}</span>
            <span style={styles.summaryValueSuccess}>{formatMoney(plan.monto_pagado)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('planPagoDetail.summaryPending')}</span>
            <span style={styles.summaryValueDanger}>{formatMoney(plan.monto_total - plan.monto_pagado)}</span>
          </div>

          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${porcentajePagado}%` }} />
            </div>
            <div style={styles.progressText}>{porcentajePagado}%</div>
          </div>

          <div style={styles.estadoBadge}>
            {t('planPagoDetail.status', { estado: plan.estado.toUpperCase() })}
          </div>
        </div>

        {/* Cuotas */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            {t('planPagoDetail.installmentsTitle', { count: cuotas.length })}
          </div>
          <div style={styles.cuotasList}>
            {cuotas.map((cuota, index) => {
              const isVencida = cuota.estado === 'pendiente' &&
                new Date(cuota.fecha_vencimiento) < new Date()
              const estadoFinal = isVencida ? 'vencida' : cuota.estado

              return (
                <div
                  key={index}
                  style={{ ...styles.cuotaCard, borderLeftColor: getCuotaEstadoColor(estadoFinal) }}
                >
                  <div style={styles.cuotaHeader}>
                    <div style={styles.cuotaNumero}>
                      {t('planPagoDetail.installmentNumber', { number: cuota.numero_cuota })}
                    </div>
                    <div style={{ ...styles.cuotaEstado, backgroundColor: getCuotaEstadoColor(estadoFinal) }}>
                      {t('planPagoDetail.estadoCuota.' + estadoFinal, { defaultValue: estadoFinal })}
                    </div>
                  </div>

                  <div style={styles.cuotaDetalle}>
                    <span style={styles.cuotaLabel}>{t('planPagoDetail.amount')}</span>
                    <span style={styles.cuotaMonto}>{formatMoney(cuota.monto_cuota)}</span>
                  </div>
                  <div style={styles.cuotaDetalle}>
                    <span style={styles.cuotaLabel}>{t('planPagoDetail.dueDate')}</span>
                    <span style={styles.cuotaValue}>{formatDate(cuota.fecha_vencimiento)}</span>
                  </div>
                  {cuota.fecha_pago && (
                    <div style={styles.cuotaDetalle}>
                      <span style={styles.cuotaLabel}>{t('planPagoDetail.paymentDate')}</span>
                      <span style={{ ...styles.cuotaValue, color: '#10b981' }}>
                        {formatDate(cuota.fecha_pago)}
                      </span>
                    </div>
                  )}

                  {cuota.estado === 'pendiente' && (
                    <button style={styles.pagarButton} onClick={() => registrarPagoCuota(cuota)}>
                      {t('planPagoDetail.registerPayment')}
                    </button>
                  )}

                  {cuota.estado === 'pagada' && (
                    <>
                      <div style={styles.pagadaBadge}>{t('planPagoDetail.paidBadge')}</div>
                      <button
                        style={{ ...styles.pagarButton, backgroundColor: '#3b82f6', marginTop: '8px' }}
                        onClick={() => reimprimirRecibo(cuota)}
                      >
                        {t('planPagoDetail.reprintReceipt')}
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal de envío de recibo */}
      {showReciboModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{t('planPagoDetail.modalTitle')}</div>
              <div style={styles.modalSubtitle}>
                {t('planPagoDetail.modalSubtitle', {
                  number:  cuotaPagada?.numero_cuota,
                  total:   cuotaPagada?.cuotas_totales,
                  receipt: pagoRegistrado?.numero_recibo
                })}
              </div>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>{t('planPagoDetail.modalText')}</p>
              <p style={styles.modalQuestion}>{t('planPagoDetail.modalQuestion')}</p>

              <div style={styles.checkboxGroup}>
                <label style={{ ...styles.checkboxLabel, ...(!paciente.email && styles.checkboxLabelDisabled) }}>
                  <input
                    type="checkbox"
                    checked={enviarPor.email}
                    onChange={e => setEnviarPor({ ...enviarPor, email: e.target.checked })}
                    disabled={!paciente.email}
                  />
                  <span>
                    {t('planPagoDetail.channelEmail')}
                    {paciente.email
                      ? <span style={styles.checkboxEmail}> ({paciente.email})</span>
                      : <span style={styles.checkboxNoDisponible}> {t('planPagoDetail.notAvailable')}</span>
                    }
                  </span>
                </label>

                <label style={{ ...styles.checkboxLabel, ...(!paciente.telefono && styles.checkboxLabelDisabled) }}>
                  <input
                    type="checkbox"
                    checked={enviarPor.whatsapp}
                    onChange={e => setEnviarPor({ ...enviarPor, whatsapp: e.target.checked })}
                    disabled={!paciente.telefono}
                  />
                  <span>
                    {t('planPagoDetail.channelWhatsApp')}
                    {paciente.telefono
                      ? <span style={styles.checkboxEmail}> ({paciente.telefono})</span>
                      : <span style={styles.checkboxNoDisponible}> {t('planPagoDetail.notAvailable')}</span>
                    }
                  </span>
                </label>
              </div>

              <div style={styles.modalWarning}>
                💡 {enviarPor.email && enviarPor.whatsapp
                    ? t('planPagoDetail.warningBoth')
                    : enviarPor.email || enviarPor.whatsapp
                      ? t('planPagoDetail.warningOne')
                      : t('planPagoDetail.warningNone')}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => { setShowReciboModal(false); loadData() }}
                style={styles.modalButtonSecondary}
              >
                {t('planPagoDetail.skip')}
              </button>
              <button
                onClick={enviarReciboAutomatico}
                disabled={sending || (!enviarPor.email && !enviarPor.whatsapp)}
                style={{
                  ...styles.modalButtonPrimary,
                  ...((sending || (!enviarPor.email && !enviarPor.whatsapp)) && styles.modalButtonDisabled)
                }}
              >
                {sending ? t('common.sending') : t('planPagoDetail.sendReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>{t('common.poweredBy')}</div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  header: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' },
  backButton: { padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '16px', fontWeight: '500', cursor: 'pointer' },
  headerInfo: { flex: 1, textAlign: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e40af' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px', fontFamily: 'monospace' },
  content: { flex: 1, padding: '24px', maxWidth: '1000px', width: '100%', margin: '0 auto', overflowY: 'auto' },
  section: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '16px', border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  patientName: { fontSize: '20px', fontWeight: '600', color: '#1e40af' },
  summaryCard: { backgroundColor: '#eff6ff', border: '2px solid #dbeafe', borderRadius: '12px', padding: '24px', marginBottom: '16px' },
  summaryTitle: { fontSize: '18px', fontWeight: '700', color: '#1e40af', marginBottom: '20px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  summaryLabel: { fontSize: '14px', color: '#6b7280' },
  summaryValue: { fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  summaryValueBold: { fontSize: '16px', fontWeight: '700', color: '#1f2937' },
  summaryValueSuccess: { fontSize: '16px', fontWeight: '700', color: '#10b981' },
  summaryValueDanger: { fontSize: '16px', fontWeight: '700', color: '#ef4444' },
  progressContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', marginBottom: '16px' },
  progressBar: { flex: 1, height: '12px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease', borderRadius: '6px' },
  progressText: { fontSize: '14px', fontWeight: '700', color: '#1f2937', minWidth: '45px', textAlign: 'right' },
  estadoBadge: { textAlign: 'center', padding: '8px', backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '14px', color: '#6b7280' },
  cuotasList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  cuotaCard: { backgroundColor: '#ffffff', border: '2px solid #e5e7eb', borderLeft: '4px solid', borderRadius: '8px', padding: '16px' },
  cuotaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  cuotaNumero: { fontSize: '16px', fontWeight: '700', color: '#1f2937' },
  cuotaEstado: { padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: '#ffffff', textTransform: 'uppercase' },
  cuotaDetalle: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  cuotaLabel: { fontSize: '13px', color: '#6b7280' },
  cuotaMonto: { fontSize: '18px', fontWeight: '700', color: '#059669' },
  cuotaValue: { fontSize: '13px', fontWeight: '600', color: '#1f2937' },
  pagarButton: { width: '100%', padding: '10px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  pagadaBadge: { textAlign: 'center', padding: '8px', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#059669', marginTop: '8px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '550px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { padding: '24px 24px 16px 24px', borderBottom: '1px solid #e5e7eb' },
  modalTitle: { fontSize: '22px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' },
  modalSubtitle: { fontSize: '14px', color: '#6b7280', fontWeight: '500' },
  modalBody: { padding: '24px' },
  modalText: { fontSize: '16px', color: '#4b5563', marginBottom: '8px' },
  modalQuestion: { fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px', marginTop: '16px' },
  checkboxGroup: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: '#374151', cursor: 'pointer', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb', transition: 'all 0.2s' },
  checkboxLabelDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  checkboxEmail: { fontSize: '13px', color: '#6b7280', fontWeight: '400' },
  checkboxNoDisponible: { fontSize: '13px', color: '#ef4444', fontWeight: '500' },
  modalWarning: { marginTop: '20px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px', fontSize: '13px', color: '#92400e', fontWeight: '500' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  modalButtonSecondary: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer' },
  modalButtonPrimary: { padding: '10px 24px', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#ffffff', cursor: 'pointer' },
  modalButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}