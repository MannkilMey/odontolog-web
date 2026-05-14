import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { generarReciboPDF } from '../utils/pdfGenerator'
import { useMoneda } from '../hooks/useMoneda'

export default function RegistrarPagoScreen() {
  const { pacienteId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  const [paciente, setPaciente] = useState(null)
  const [config, setConfig] = useState(null)
  const [presupuestos, setPresupuestos] = useState([])
  const [procedimientos, setProcedimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showReciboModal, setShowReciboModal] = useState(false)
  const [pagoRegistrado, setPagoRegistrado] = useState(null)
  const [enviarPor, setEnviarPor] = useState({ email: true, whatsapp: false })

  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: '',
    metodo_pago: 'efectivo',
    concepto: '',
    notas: '',
    presupuesto_id: null,
    procedimiento_id: null,
  })

  useEffect(() => { loadData() }, [pacienteId])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: configData, error: configError } = await supabase
        .from('configuracion_clinica').select('*').eq('dentista_id', user.id).single()
      if (configError || !configData) {
        alert(t('presupuesto.noClinicConfig'))
        navigate('/configuracion')
        return
      }
      setConfig(configData)

      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes').select('*').eq('id', pacienteId).single()
      if (pacienteError) throw pacienteError
      setPaciente(pacienteData)

      const { data: presupuestosData, error: presupuestosError } = await supabase
        .from('presupuestos')
        .select('*, pagos:pagos_pacientes(monto)')
        .eq('paciente_id', pacienteId)
        .in('estado', ['pendiente', 'aprobado'])
        .order('fecha_emision', { ascending: false })
      if (!presupuestosError && presupuestosData) {
        setPresupuestos(presupuestosData.filter(pres => {
          const totalPagado = pres.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0
          return pres.total - totalPagado > 0
        }))
      }

      const { data: procedimientosData, error: procedimientosError } = await supabase
        .from('procedimientos_dentales').select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_procedimiento', { ascending: false })
      if (!procedimientosError) setProcedimientos(procedimientosData || [])

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('registrarPago.titlePlain') }))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const updateFormField = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }

      if (field === 'presupuesto_id' && value) {
        const presupuesto = presupuestos.find(p => p.id === value)
        if (presupuesto) {
          updated.monto = presupuesto.total.toString()
          updated.concepto = t('registrarPago.conceptBudget', { number: presupuesto.numero_presupuesto })
        }
      }

      if (field === 'procedimiento_id' && value) {
        const procedimiento = procedimientos.find(p => p.id === value)
        if (procedimiento) {
          updated.monto = procedimiento.costo?.toString() || ''
          updated.concepto = t('registrarPago.conceptProcedure', {
            nombre: procedimiento.procedimiento,
            diente: procedimiento.numero_diente
              ? ` - ${t('odontograma.toothNumber', { number: procedimiento.numero_diente })}`
              : ''
          })
        }
      }

      return updated
    })
  }

  const generateNumeroRecibo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: configData } = await supabase
        .from('configuracion_clinica')
        .select('proximo_numero_recibo, prefijo_recibo')
        .eq('dentista_id', user.id).single()
      if (configData) {
        const numeroRecibo = `${configData.prefijo_recibo}-${String(configData.proximo_numero_recibo).padStart(6, '0')}`
        await supabase.from('configuracion_clinica')
          .update({ proximo_numero_recibo: configData.proximo_numero_recibo + 1, updated_at: new Date().toISOString() })
          .eq('dentista_id', user.id)
        return numeroRecibo
      }
      return `REC-${Date.now()}`
    } catch (error) {
      console.error('Error generating numero recibo:', error)
      return `REC-${Date.now()}`
    }
  }

  const validateForm = () => {
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert(t('registrarPago.validationAmount'))
      return false
    }
    if (!formData.concepto.trim()) {
      alert(t('registrarPago.validationConcept'))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const numeroRecibo = await generateNumeroRecibo()

      const pagoData = {
        dentista_id: user.id, paciente_id: pacienteId,
        numero_recibo: numeroRecibo, fecha_pago: formData.fecha_pago,
        monto: parseFloat(formData.monto), metodo_pago: formData.metodo_pago,
        concepto: formData.concepto.trim(), notas: formData.notas.trim() || null,
        presupuesto_id: formData.presupuesto_id || null,
        procedimiento_id: formData.procedimiento_id || null,
        documento_generado: false, documento_enviado: false,
      }

      const { data: pago, error: pagoError } = await supabase
        .from('pagos_pacientes').insert(pagoData).select().single()
      if (pagoError) throw pagoError

      const ingresoData = {
        dentista_id: user.id, paciente_id: pacienteId,
        categoria: 'procedimiento', descripcion: formData.concepto,
        monto: parseFloat(formData.monto), fecha_ingreso: formData.fecha_pago,
        metodo_pago: formData.metodo_pago,
        procedimiento_id: formData.procedimiento_id || null,
        estado: 'recibido', notas: formData.notas.trim() || null,
      }
      const { error: ingresoError } = await supabase.from('ingresos_clinica').insert(ingresoData)
      if (ingresoError) console.error('Error registrando ingreso:', ingresoError)

      if (formData.presupuesto_id) {
        const { data: pagosPresupuesto } = await supabase
          .from('pagos_pacientes').select('monto').eq('presupuesto_id', formData.presupuesto_id)
        const totalPagado = pagosPresupuesto?.reduce((sum, p) => sum + p.monto, 0) || 0
        const { data: presupuestoData } = await supabase
          .from('presupuestos').select('total').eq('id', formData.presupuesto_id).single()
        if (presupuestoData && totalPagado >= presupuestoData.total) {
          await supabase.from('presupuestos')
            .update({ estado: 'aprobado', updated_at: new Date().toISOString() })
            .eq('id', formData.presupuesto_id)
        }
      }

      setPagoRegistrado(pago)
      setShowReciboModal(true)

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.saveError', { item: t('registrarPago.titlePlain') }))
    } finally {
      setSaving(false)
    }
  }

  const enviarReciboAutomatico = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (enviarPor.email && paciente.email)    await enviarReciboEmail(pagoRegistrado, paciente, config, user.id)
      if (enviarPor.whatsapp && paciente.telefono) await enviarReciboWhatsApp(pagoRegistrado, paciente, config, user.id)

      const descargarPDF = window.confirm(t('planPagoDetail.confirmDownloadPDF'))
      if (descargarPDF) await generarReciboPDF(pagoRegistrado, paciente, config)

      setShowReciboModal(false)
      navigate(`/paciente/${pacienteId}`)
    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.sendError', { item: t('planPagoDetail.receipt') }))
    } finally {
      setSaving(false)
    }
  }

  const enviarReciboEmail = async (pago, paciente, config, dentistaId) => {
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

    const fechaPago = new Date(pago.fecha_pago + 'T12:00:00')
    const fechaFormateada = fechaPago.toLocaleDateString(i18n.language, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🦷 ${nombreClinica}</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 20px;">🧾 ${t('registrarPago.emailReceiptTitle')}</p>
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
            <p style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">${paciente.nombre} ${paciente.apellido || ''}</p>
            ${paciente.documento ? `<p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">CI: ${paciente.documento}</p>` : ''}
          </div>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('registrarPago.emailAmount')}</strong> ${formatMoney(pago.monto)}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPaymentDate')}</strong> ${fechaFormateada}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('planPagoDetail.emailPaymentMethod')}</strong> ${pago.metodo_pago.charAt(0).toUpperCase() + pago.metodo_pago.slice(1)}</p>
            <p style="color: #065f46; margin: 5px 0;"><strong>${t('registrarPago.emailConcept')}</strong> ${pago.concepto}</p>
            ${pago.notas ? `<p style="color: #065f46; margin: 5px 0;"><strong>${t('registrarPago.emailNotes')}</strong> ${pago.notas}</p>` : ''}
          </div>
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
      </div>`

    const resendResponse = await fetch(
      'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/enviar-recibo-email',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
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
    if (!resendResponse.ok) { console.error('Error de Resend:', resendResult); throw new Error('Error al enviar email') }

    await supabase.from('mensajes_enviados').insert({
      dentista_id: dentistaId, paciente_id: paciente.id,
      tipo: 'recibo_pago', canal: 'email', destinatario: paciente.email,
      asunto: `🧾 ${t('registrarPago.emailReceiptTitle')} - ${pago.numero_recibo}`,
      mensaje: html.substring(0, 1000), estado: 'enviado',
      metadata: { pago_id: pago.id, numero_recibo: pago.numero_recibo, monto: pago.monto, automatico: false },
      fecha_enviado: new Date().toISOString()
    })
    await incrementarContador(dentistaId)
  }

  const enviarReciboWhatsApp = async (pago, paciente, config, dentistaId) => {
    const nombreClinica = config?.nombre_comercial || config?.razon_social || 'Clínica Dental'

    let telefono = paciente.telefono.replace(/[^0-9]/g, '')
    if (!telefono.startsWith('595')) telefono = '595' + telefono

    const fechaPago = new Date(pago.fecha_pago + 'T12:00:00')
    const fechaFormateada = fechaPago.toLocaleDateString(i18n.language, {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const mensaje = `Hola ${paciente.nombre},

${t('registrarPago.waReceiptTitle')}
${nombreClinica}

${t('planPagoDetail.waReceiptNumber', { number: pago.numero_recibo })}

${t('registrarPago.waAmount')} ${formatMoney(pago.monto)}
${t('planPagoDetail.waDate')} ${fechaFormateada}
${t('planPagoDetail.waMethod')} ${pago.metodo_pago.charAt(0).toUpperCase() + pago.metodo_pago.slice(1)}
${t('registrarPago.waConcept')} ${pago.concepto}

${t('planPagoDetail.waThanks')}

${config?.telefono ? `Tel: ${config.telefono}` : ''}`

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')

    await supabase.from('mensajes_enviados').insert({
      dentista_id: dentistaId, paciente_id: paciente.id,
      tipo: 'recibo_pago', canal: 'whatsapp', destinatario: paciente.telefono,
      mensaje, estado: 'enviado',
      metadata: { pago_id: pago.id, numero_recibo: pago.numero_recibo, monto: pago.monto, automatico: false },
      fecha_enviado: new Date().toISOString()
    })
    await incrementarContador(dentistaId)
  }

  const incrementarContador = async (dentistaId) => {
    try {
      const { data: suscripcion } = await supabase
        .from('suscripciones_usuarios').select('mensajes_usados_mes, ultimo_reset_contador')
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
    } catch (error) { console.error('Error incrementando contador:', error) }
  }

  const getMetodoPagoIcon = (metodo) => {
    const icons = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳', cheque: '📝', otro: '💰' }
    return icons[metodo] || '💰'
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/paciente/${pacienteId}`)} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('registrarPago.title')}</div>
          <div style={styles.subtitle}>{paciente?.nombre} {paciente?.apellido}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        <div style={styles.form}>
          {/* Información del Pago */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t('registrarPago.paymentInfo')}</div>

            <label style={styles.label}>{t('registrarPago.paymentDate')}</label>
            <input
              type="date" style={styles.input}
              value={formData.fecha_pago}
              onChange={e => updateFormField('fecha_pago', e.target.value)}
            />

            <label style={styles.label}>{t('registrarPago.amountLabel')}</label>
            <div style={styles.montoInput}>
              <span style={styles.montoSymbol}>{config.simbolo_moneda}</span>
              <input
                type="number" style={{ ...styles.input, ...styles.montoField }}
                placeholder="0" min="0" step="1000"
                value={formData.monto}
                onChange={e => updateFormField('monto', e.target.value)}
              />
            </div>

            <label style={styles.label}>{t('registrarPago.paymentMethod')}</label>
            <div style={styles.metodosGrid}>
              {['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'].map(metodo => (
                <button
                  key={metodo} type="button"
                  style={{ ...styles.metodoButton, ...(formData.metodo_pago === metodo && styles.metodoButtonActive) }}
                  onClick={() => updateFormField('metodo_pago', metodo)}
                >
                  <span style={styles.metodoIcon}>{getMetodoPagoIcon(metodo)}</span>
                  <span style={styles.metodoLabel}>
                    {t('gastos.methods.' + metodo, { defaultValue: metodo.charAt(0).toUpperCase() + metodo.slice(1) })}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Asociar Pago */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t('registrarPago.associateSection')}</div>

            {presupuestos.length > 0 && (
              <>
                <label style={styles.label}>{t('registrarPago.budgetLabel')}</label>
                <select
                  style={styles.select}
                  value={formData.presupuesto_id || ''}
                  onChange={e => {
                    const value = e.target.value || null
                    updateFormField('presupuesto_id', value)
                    if (value) updateFormField('procedimiento_id', null)
                  }}
                >
                  <option value="">{t('planPago.noBudget')}</option>
                  {presupuestos.map(pres => (
                    <option key={pres.id} value={pres.id}>
                      {pres.numero_presupuesto} - {formatMoney(pres.total)} ({pres.estado})
                    </option>
                  ))}
                </select>
              </>
            )}

            {procedimientos.length > 0 && (
              <>
                <label style={styles.label}>{t('registrarPago.procedureLabel')}</label>
                <select
                  style={styles.select}
                  value={formData.procedimiento_id || ''}
                  onChange={e => {
                    const value = e.target.value || null
                    updateFormField('procedimiento_id', value)
                    if (value) updateFormField('presupuesto_id', null)
                  }}
                >
                  <option value="">{t('registrarPago.noProcedure')}</option>
                  {procedimientos.map(proc => (
                    <option key={proc.id} value={proc.id}>
                      {proc.procedimiento}
                      {proc.numero_diente && ` - ${t('odontograma.toothNumber', { number: proc.numero_diente })}`}
                      {proc.costo && ` - ${formatMoney(proc.costo)}`}
                    </option>
                  ))}
                </select>
              </>
            )}

            {presupuestos.length === 0 && procedimientos.length === 0 && (
              <div style={styles.emptyMessage}>
                <div style={styles.emptyIcon}>📭</div>
                <div style={styles.emptyText}>{t('registrarPago.noPresupuestosNiProcs')}</div>
              </div>
            )}
          </div>

          {/* Detalles */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t('registrarPago.detailsSection')}</div>

            <label style={styles.label}>{t('registrarPago.conceptLabel')}</label>
            <input
              type="text" style={styles.input}
              placeholder={t('registrarPago.conceptPlaceholder')}
              value={formData.concepto}
              onChange={e => updateFormField('concepto', e.target.value)}
            />

            <label style={styles.label}>{t('registrarPago.notesLabel')}</label>
            <textarea
              style={{ ...styles.input, ...styles.textArea }}
              placeholder={t('registrarPago.notesPlaceholder')}
              value={formData.notas}
              onChange={e => updateFormField('notas', e.target.value)}
              rows={3}
            />
          </div>

          {/* Resumen */}
          {formData.monto && (
            <div style={styles.resumenCard}>
              <div style={styles.resumenTitle}>{t('registrarPago.summaryTitle')}</div>
              <div style={styles.resumenRow}>
                <span style={styles.resumenLabel}>{t('registrarPago.summaryDate')}</span>
                <span style={styles.resumenValue}>
                  {new Date(formData.fecha_pago + 'T12:00:00').toLocaleDateString(i18n.language, {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </span>
              </div>
              <div style={styles.resumenRow}>
                <span style={styles.resumenLabel}>{t('registrarPago.summaryMethod')}</span>
                <span style={styles.resumenValue}>
                  {getMetodoPagoIcon(formData.metodo_pago)}{' '}
                  {t('gastos.methods.' + formData.metodo_pago, { defaultValue: formData.metodo_pago.charAt(0).toUpperCase() + formData.metodo_pago.slice(1) })}
                </span>
              </div>
              <div style={styles.resumenRowTotal}>
                <span style={styles.resumenLabelTotal}>{t('registrarPago.summaryTotal')}</span>
                <span style={styles.resumenValueTotal}>{formatMoney(parseFloat(formData.monto))}</span>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={styles.actionsContainer}>
            <button onClick={() => navigate(`/paciente/${pacienteId}`)} style={styles.cancelButton}>
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...styles.saveButton, ...(saving && styles.saveButtonDisabled) }}
            >
              {saving ? t('registrarPago.registering') : t('registrarPago.saveButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showReciboModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{t('registrarPago.modalTitle')}</div>
              <div style={styles.modalSubtitle}>
                {t('registrarPago.modalSubtitle', { receipt: pagoRegistrado?.numero_recibo })}
              </div>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>{t('planPagoDetail.modalText')}</p>
              <p style={styles.modalQuestion}>{t('planPagoDetail.modalQuestion')}</p>

              <div style={styles.checkboxGroup}>
                <label style={{ ...styles.checkboxLabel, ...(!paciente.email && styles.checkboxLabelDisabled) }}>
                  <input
                    type="checkbox" checked={enviarPor.email}
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
                    type="checkbox" checked={enviarPor.whatsapp}
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
                onClick={() => { setShowReciboModal(false); navigate(`/paciente/${pacienteId}`) }}
                style={styles.modalButtonSecondary}
              >
                {t('planPagoDetail.skip')}
              </button>
              <button
                onClick={enviarReciboAutomatico}
                disabled={saving || (!enviarPor.email && !enviarPor.whatsapp)}
                style={{
                  ...styles.modalButtonPrimary,
                  ...((saving || (!enviarPor.email && !enviarPor.whatsapp)) && styles.modalButtonDisabled)
                }}
              >
                {saving ? t('common.sending') : t('planPagoDetail.sendReceipt')}
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
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  content: { flex: 1, padding: '24px', maxWidth: '800px', width: '100%', margin: '0 auto', overflowY: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  section: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', marginTop: '16px' },
  input: { width: '100%', padding: '12px 16px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 16px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#ffffff', cursor: 'pointer' },
  textArea: { minHeight: '80px', resize: 'vertical' },
  montoInput: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '4px 12px' },
  montoSymbol: { fontSize: '20px', fontWeight: 'bold', color: '#1e40af' },
  montoField: { border: 'none', backgroundColor: 'transparent', fontSize: '20px', fontWeight: '600', padding: '8px' },
  metodosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '8px' },
  metodoButton: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', backgroundColor: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  metodoButtonActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  metodoIcon: { fontSize: '28px', marginBottom: '8px' },
  metodoLabel: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  emptyMessage: { textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '14px', color: '#6b7280' },
  resumenCard: { backgroundColor: '#eff6ff', border: '2px solid #dbeafe', borderRadius: '12px', padding: '24px' },
  resumenTitle: { fontSize: '16px', fontWeight: '700', color: '#1e40af', marginBottom: '16px' },
  resumenRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  resumenLabel: { fontSize: '14px', color: '#6b7280' },
  resumenValue: { fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  resumenRowTotal: { display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #dbeafe' },
  resumenLabelTotal: { fontSize: '16px', fontWeight: '700', color: '#1f2937' },
  resumenValueTotal: { fontSize: '20px', fontWeight: '700', color: '#1e40af' },
  actionsContainer: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' },
  cancelButton: { padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontWeight: '600', color: '#6b7280', cursor: 'pointer' },
  saveButton: { padding: '12px 32px', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', color: '#ffffff', cursor: 'pointer' },
  saveButtonDisabled: { backgroundColor: '#94a3b8', cursor: 'not-allowed' },
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