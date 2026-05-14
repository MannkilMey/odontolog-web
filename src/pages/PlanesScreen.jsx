import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'

const DESCUENTO_ANUAL = 0.20

export default function PlanesScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [ciclo, setCiclo] = useState('mensual')

  const { userProfile, suscripcion, plan: planActual, refreshData } = useSuscripcion()

  const [compraModal, setCompraModal] = useState({ isOpen: false, plan: null })
  const [compraForm, setCompraForm] = useState({
    nombre_clinica: '',
    nombre_contacto: '',
    email: '',
    telefono: '',
    metodo_pago: 'transferencia',
    notas: ''
  })
  const [compraEnviada, setCompraEnviada] = useState(false)
  const [enviandoCompra, setEnviandoCompra] = useState(false)

  useEffect(() => {
    loadPlanes()
  }, [])

  useEffect(() => {
    if (userProfile) {
      setCompraForm(prev => ({
        ...prev,
        nombre_contacto: `${userProfile.nombre || ''} ${userProfile.apellido || ''}`.trim(),
        email: userProfile.email || '',
        nombre_clinica: userProfile.clinica || ''
      }))
    }
  }, [userProfile])

  const loadPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })
      if (error) throw error
      setPlanes(data || [])
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPrecio = (precioMensualUsd) => {
    if (!precioMensualUsd || precioMensualUsd === 0) return 0
    if (ciclo === 'anual') return Math.round(precioMensualUsd * (1 - DESCUENTO_ANUAL))
    return precioMensualUsd
  }

  const getPrecioTotal = (precioMensualUsd) => {
    if (!precioMensualUsd || precioMensualUsd === 0) return 0
    const mensual = getPrecio(precioMensualUsd)
    return ciclo === 'anual' ? mensual * 12 : mensual
  }

  const getAhorro = (precioMensualUsd) => {
    if (!precioMensualUsd || precioMensualUsd === 0) return 0
    return Math.round(precioMensualUsd * 12 * DESCUENTO_ANUAL)
  }

  const handleSeleccionarPlan = async (plan) => {
    if (!userProfile?.id) return

    if (planActual?.id === plan.id) {
      alert(t('plans.alreadyActive'))
      return
    }

    if (plan.codigo === 'free') {
      if (!window.confirm(t('plans.changeToFreeConfirm'))) return
      await cambiarPlan(plan)
      return
    }

    setCompraModal({ isOpen: true, plan })
    setCompraEnviada(false)
  }

  const cambiarPlan = async (nuevoPlan) => {
    try {
      setProcesando(true)
      const { error } = await supabase
        .from('suscripciones_usuarios')
        .update({ plan_id: nuevoPlan.id, updated_at: new Date().toISOString() })
        .eq('dentista_id', userProfile.id)
      if (error) throw error
      alert(t('plans.planChanged', { plan: nuevoPlan.nombre }))
      refreshData()
    } catch (error) {
      alert(t('errors.generic'))
    } finally {
      setProcesando(false)
    }
  }

  const enviarSolicitudCompra = async () => {
    if (!compraForm.nombre_contacto.trim() || !compraForm.email.trim()) {
      alert(t('planesScreen.formRequired'))
      return
    }

    setEnviandoCompra(true)
    const plan = compraModal.plan
    const precioMes = getPrecio(plan.precio_mensual_usd)
    const total = getPrecioTotal(plan.precio_mensual_usd)

    try {
      await supabase.from('intereses_planes').insert({
        dentista_id: userProfile.id,
        plan_id: plan.id,
        plan_nombre: plan.nombre,
        plan_precio: total,
        estado: 'pendiente',
        notas: `Ciclo: ${ciclo} | $${precioMes}/mes | Método: ${compraForm.metodo_pago} | Tel: ${compraForm.telefono} | Clínica: ${compraForm.nombre_clinica} | Email: ${compraForm.email}`
      })
      setCompraEnviada(true)
    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.sendError', { item: t('planesScreen.request') }))
    } finally {
      setEnviandoCompra(false)
    }
  }

  const PlanCard = ({ plan, esPlanActual }) => {
    const caracteristicas = Array.isArray(plan.caracteristicas)
      ? plan.caracteristicas
      : JSON.parse(plan.caracteristicas || '[]')

    const esGratuito   = plan.codigo === 'free'
    const esPro        = plan.codigo === 'pro'
    const esEnterprise = plan.codigo === 'enterprise'
    const precioMes    = getPrecio(plan.precio_mensual_usd)
    const ahorro       = getAhorro(plan.precio_mensual_usd)

    return (
      <div style={{
        ...styles.planCard,
        ...(esPlanActual && styles.planCardActual),
        ...(esPro && styles.planCardPro)
      }}>
        {esPlanActual && <div style={styles.badgeActual}>{t('plans.currentPlan')}</div>}
        {esPro && <div style={styles.badgePopular}>{t('plans.mostPopular')}</div>}

        <div style={styles.planHeader}>
          <div style={styles.planIcono}>
            {esGratuito && '🆓'}{esPro && '⭐'}{esEnterprise && '💎'}
          </div>
          <div style={styles.planNombre}>{plan.nombre}</div>
          <div style={styles.planDescripcion}>{plan.descripcion}</div>
        </div>

        <div style={styles.planPrecio}>
          {esGratuito ? (
            <>
              <div style={styles.precioNumero}>$0</div>
              <div style={styles.precioPeriodo}>{t('plans.freeForever')}</div>
            </>
          ) : (
            <>
              {ciclo === 'anual' && (
                <div style={styles.precioTachado}>${plan.precio_mensual_usd}/mes</div>
              )}
              <div style={styles.precioNumero}>${precioMes}</div>
              <div style={styles.precioPeriodo}>{t('plans.perMonth')}</div>
              {ciclo === 'anual' && (
                <div style={styles.precioAnual}>
                  {t('plans.billedAnnually', { total: getPrecioTotal(plan.precio_mensual_usd) })}
                </div>
              )}
              {ciclo === 'anual' && ahorro > 0 && (
                <div style={styles.ahorroTag}>
                  {t('plans.youSave', { amount: ahorro })}
                </div>
              )}
            </>
          )}
        </div>

        <div style={styles.caracteristicasList}>
          {caracteristicas.map((c, i) => (
            <div key={i} style={styles.caracteristicaItem}>
              <span style={styles.caracteristicaIcono}>✓</span>
              <span style={styles.caracteristicaTexto}>{c}</span>
            </div>
          ))}
        </div>

        <div style={styles.limitesContainer}>
          <div style={styles.limiteInfo}>
            👥 {plan.limite_pacientes
              ? t('plans.patientsLimit', { limit: plan.limite_pacientes })
              : t('plans.patientsUnlimited')}
          </div>
          {plan.limite_emails_mes !== null && plan.limite_emails_mes > 0 && (
            <div style={styles.limiteInfo}>
              📧 {t('plans.emailsPerMonth', { limit: plan.limite_emails_mes })}
            </div>
          )}
          {plan.limite_whatsapp_mes !== null && plan.limite_whatsapp_mes > 0 && (
            <div style={styles.limiteInfo}>
              💬 {t('plans.whatsappPerMonth', { limit: plan.limite_whatsapp_mes })}
            </div>
          )}
          {plan.codigo === 'free' && (
            <div style={styles.limiteInfo}>📨 {t('plans.noMessaging')}</div>
          )}
        </div>

        <button
          style={{
            ...styles.planButton,
            ...(esPlanActual && styles.planButtonActual),
            ...(esPro && !esPlanActual && styles.planButtonPro),
            ...(procesando && styles.planButtonDisabled)
          }}
          onClick={() => handleSeleccionarPlan(plan)}
          disabled={procesando || esPlanActual}
        >
          {esPlanActual
            ? `✓ ${t('plans.currentPlan')}`
            : esGratuito
              ? t('plans.selectPlan')
              : t('plans.contractNow')}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingText}>{t('planesScreen.loading')}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('planesScreen.title')}</div>
          <div style={styles.subtitle}>{t('plans.subtitle')}</div>
        </div>
        <button
          onClick={() => navigate('/historial-pagos')}
          style={styles.historialButton}
        >
          📋 {t('plans.myPayments')}
        </button>
      </div>

      <div style={styles.content}>
        {/* Plan actual */}
        {planActual && (
          <div style={styles.infoActual}>
            <div style={styles.infoActualTexto}>
              {t('plans.yourPlan', { plan: planActual.nombre })}
            </div>
            {suscripcion?.mensajes_usados_mes !== undefined && planActual.limite_mensajes_mes && (
              <div style={styles.infoUsage}>
                📨 {t('plans.messagesUsed', {
                  used: suscripcion.mensajes_usados_mes,
                  limit: planActual.limite_mensajes_mes
                })}
              </div>
            )}
          </div>
        )}

        {/* Selector ciclo */}
        <div style={styles.cicloContainer}>
          <button
            onClick={() => setCiclo('mensual')}
            style={{ ...styles.cicloBtn, ...(ciclo === 'mensual' ? styles.cicloBtnActivo : {}) }}
          >
            {t('common.monthly')}
          </button>
          <button
            onClick={() => setCiclo('anual')}
            style={{ ...styles.cicloBtn, ...(ciclo === 'anual' ? styles.cicloBtnActivo : {}) }}
          >
            {t('common.annual')}{' '}
            <span style={styles.cicloBadge}>
              {t('plans.discount', { percent: DESCUENTO_ANUAL * 100 })}
            </span>
          </button>
        </div>

        {/* Grid de planes */}
        <div style={styles.planesGrid}>
          {planes.map(plan => (
            <PlanCard key={plan.id} plan={plan} esPlanActual={planActual?.id === plan.id} />
          ))}
        </div>

        {/* Info adicional */}
        <div style={styles.infoAdicional}>
          <div style={styles.infoTitulo}>{t('plans.needHelp')}</div>
          <div style={styles.infoTexto}>WhatsApp: <strong>+595 994 747 485</strong></div>
          <div style={styles.infoTexto}>Email: <strong>soporte@odontolog.lat</strong></div>
        </div>

        {/* Garantía */}
        <div style={styles.garantia}>
          <div style={styles.garantiaTitulo}>{t('plans.guarantee')}</div>
          <div style={styles.garantiaTexto}>{t('plans.guaranteeText')}</div>
        </div>
      </div>

      {/* ═══ MODAL DE COMPRA ═══ */}
      {compraModal.isOpen && (
        <div
          style={styles.overlay}
          onClick={() => !enviandoCompra && setCompraModal({ isOpen: false, plan: null })}
        >
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {!compraEnviada ? (
              <>
                <h3 style={styles.modalTitle}>
                  🎉 {t('plans.contactForm.title', { plan: compraModal.plan?.nombre })}
                </h3>

                {/* Resumen del plan */}
                <div style={styles.planResumen}>
                  <div style={styles.planResumenRow}>
                    <span>{t('planesScreen.modalPlan')}</span>
                    <span style={{ fontWeight: '700' }}>{compraModal.plan?.nombre}</span>
                  </div>
                  <div style={styles.planResumenRow}>
                    <span>{t('common.price')}</span>
                    <span style={{ fontWeight: '700', color: '#1e40af' }}>
                      ${getPrecio(compraModal.plan?.precio_mensual_usd)} {t('plans.perMonth')}
                    </span>
                  </div>
                  {ciclo === 'anual' && (
                    <>
                      <div style={styles.planResumenRow}>
                        <span>{t('planesScreen.modalAnnualTotal')}</span>
                        <span>${getPrecioTotal(compraModal.plan?.precio_mensual_usd)} USD</span>
                      </div>
                      <div style={styles.planResumenRow}>
                        <span>{t('planesScreen.modalSaving')}</span>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>
                          ${getAhorro(compraModal.plan?.precio_mensual_usd)} {t('planesScreen.modalSavingYear')}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Formulario */}
                <div style={styles.formSection}>
                  <div style={styles.formTitle}>{t('planesScreen.formContact')}</div>

                  <label style={styles.formLabel}>{t('plans.contactForm.clinicName')}</label>
                  <input
                    type="text"
                    value={compraForm.nombre_clinica}
                    onChange={e => setCompraForm({ ...compraForm, nombre_clinica: e.target.value })}
                    placeholder={t('planesScreen.clinicPlaceholder')}
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>{t('plans.contactForm.contactName')} *</label>
                  <input
                    type="text"
                    value={compraForm.nombre_contacto}
                    onChange={e => setCompraForm({ ...compraForm, nombre_contacto: e.target.value })}
                    placeholder={t('planesScreen.contactPlaceholder')}
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>{t('common.email')} *</label>
                  <input
                    type="email"
                    value={compraForm.email}
                    onChange={e => setCompraForm({ ...compraForm, email: e.target.value })}
                    placeholder={t('planesScreen.emailPlaceholder')}
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>{t('plans.contactForm.phone')}</label>
                  <input
                    type="tel"
                    value={compraForm.telefono}
                    onChange={e => setCompraForm({ ...compraForm, telefono: e.target.value })}
                    placeholder={t('planesScreen.phonePlaceholder')}
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>{t('plans.contactForm.paymentMethod')}</label>
                  <select
                    value={compraForm.metodo_pago}
                    onChange={e => setCompraForm({ ...compraForm, metodo_pago: e.target.value })}
                    style={styles.formSelect}
                  >
                    <option value="transferencia">{t('plans.contactForm.transfer')}</option>
                    <option value="tarjeta">{t('plans.contactForm.card')}</option>
                    <option value="giro_tigo">{t('plans.contactForm.giroTigo')}</option>
                    <option value="paypal">{t('plans.contactForm.paypal')}</option>
                    <option value="otro">{t('plans.contactForm.other')}</option>
                  </select>

                  <label style={styles.formLabel}>{t('plans.contactForm.additionalNotes')}</label>
                  <textarea
                    value={compraForm.notas}
                    onChange={e => setCompraForm({ ...compraForm, notas: e.target.value })}
                    placeholder={t('planesScreen.notesPlaceholder')}
                    style={styles.formTextarea}
                    rows={3}
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    onClick={() => setCompraModal({ isOpen: false, plan: null })}
                    style={styles.cancelBtn}
                    disabled={enviandoCompra}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={enviarSolicitudCompra}
                    disabled={enviandoCompra}
                    style={styles.submitBtn}
                  >
                    {enviandoCompra ? t('common.sending') : t('plans.contactForm.submit')}
                  </button>
                </div>
              </>
            ) : (
              /* ═══ CONFIRMACIÓN ═══ */
              <div style={styles.confirmacion}>
                <div style={styles.confirmIcon}>✅</div>
                <h3 style={styles.confirmTitle}>{t('plans.contactForm.successTitle')}</h3>
                <p style={styles.confirmText}>
                  {t('plans.contactForm.successMessage', { plan: compraModal.plan?.nombre })}
                </p>
                <p style={styles.confirmText}>
                  {t('plans.contactForm.successContact')}
                </p>

                <div style={styles.confirmContacto}>
                  <div style={styles.confirmContactoTitle}>
                    {t('plans.contactForm.immediateResponse')}
                  </div>
                  <div style={styles.confirmContactoItem}>
                    📱 WhatsApp:{' '}
                    <a href="https://wa.me/595994747485" style={{ color: '#1e40af', fontWeight: '600' }}>
                      +595 994 747 485
                    </a>
                  </div>
                  <div style={styles.confirmContactoItem}>
                    📧 Email:{' '}
                    <a href="mailto:soporte@odontolog.lat" style={{ color: '#1e40af', fontWeight: '600' }}>
                      soporte@odontolog.lat
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCompraModal({ isOpen: false, plan: null })
                    navigate('/dashboard')
                  }}
                  style={styles.submitBtn}
                >
                  {t('plans.contactForm.backToDashboard')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          {t('common.footerBrand')} • {t('planesScreen.titlePlain')}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  loadingSpinner: { fontSize: '48px' },
  loadingText: { fontSize: '16px', color: '#6b7280' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' },
  backButton: { padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '16px', fontWeight: '500', cursor: 'pointer' },
  headerInfo: { flex: 1, textAlign: 'center' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e40af' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  historialButton: { padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  content: { flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto' },
  infoActual: { backgroundColor: '#eff6ff', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '2px solid #3b82f6' },
  infoActualTexto: { fontSize: '16px', color: '#1e40af', marginBottom: '8px' },
  infoUsage: { fontSize: '14px', color: '#6b7280' },
  cicloContainer: { display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '32px', backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '4px', maxWidth: '320px', margin: '0 auto 32px' },
  cicloBtn: { flex: 1, padding: '10px 20px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#6b7280', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  cicloBtnActivo: { backgroundColor: '#ffffff', color: '#1e40af', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cicloBadge: { padding: '2px 6px', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '4px', fontSize: '10px', fontWeight: '700' },
  planesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '48px' },
  planCard: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', border: '2px solid #e5e7eb', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  planCardActual: { border: '2px solid #10b981', backgroundColor: '#f0fdf4' },
  planCardPro: { border: '3px solid #3b82f6', transform: 'scale(1.03)', boxShadow: '0 10px 30px rgba(59,130,246,0.2)' },
  badgeActual: { position: 'absolute', top: '16px', right: '16px', padding: '6px 14px', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgePopular: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '8px 20px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '20px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(59,130,246,0.4)', whiteSpace: 'nowrap' },
  planHeader: { textAlign: 'center', marginBottom: '24px' },
  planIcono: { fontSize: '48px', marginBottom: '16px' },
  planNombre: { fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' },
  planDescripcion: { fontSize: '14px', color: '#6b7280', lineHeight: '1.5' },
  planPrecio: { textAlign: 'center', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' },
  precioTachado: { fontSize: '14px', color: '#9ca3af', textDecoration: 'line-through', marginBottom: '4px' },
  precioNumero: { fontSize: '40px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' },
  precioPeriodo: { fontSize: '14px', color: '#6b7280' },
  precioAnual: { fontSize: '13px', color: '#6b7280', marginTop: '8px' },
  ahorroTag: { display: 'inline-block', marginTop: '8px', padding: '4px 12px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: '1px solid #10b981' },
  caracteristicasList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  caracteristicaItem: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  caracteristicaIcono: { color: '#10b981', fontSize: '16px', fontWeight: '700', flexShrink: 0, marginTop: '1px' },
  caracteristicaTexto: { fontSize: '14px', color: '#374151', lineHeight: '1.5' },
  limitesContainer: { marginBottom: '24px' },
  limiteInfo: { textAlign: 'center', fontSize: '13px', color: '#6b7280', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '6px' },
  planButton: { width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  planButtonActual: { backgroundColor: '#10b981', cursor: 'not-allowed' },
  planButtonPro: { backgroundColor: '#2563eb', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' },
  planButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
  infoAdicional: { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px', textAlign: 'center' },
  infoTitulo: { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  infoTexto: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' },
  garantia: { backgroundColor: '#ecfdf5', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '2px solid #10b981', marginBottom: '24px' },
  garantiaTitulo: { fontSize: '18px', fontWeight: '700', color: '#059669', marginBottom: '8px' },
  garantiaTexto: { fontSize: '14px', color: '#047857' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  modal: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '22px', fontWeight: '700', color: '#1f2937', marginBottom: '20px', textAlign: 'center' },
  planResumen: { padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', marginBottom: '20px', border: '1px solid #bfdbfe' },
  planResumenRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', color: '#374151' },
  formSection: { marginBottom: '20px' },
  formTitle: { fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '14px' },
  formLabel: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px', marginTop: '12px' },
  formInput: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' },
  formSelect: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#ffffff', cursor: 'pointer' },
  formTextarea: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '14px', backgroundColor: '#1e40af', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: '#ffffff', cursor: 'pointer', width: '100%' },
  confirmacion: { textAlign: 'center', padding: '10px 0' },
  confirmIcon: { fontSize: '64px', marginBottom: '16px' },
  confirmTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  confirmText: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '8px' },
  confirmContacto: { margin: '24px 0', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px' },
  confirmContactoTitle: { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' },
  confirmContactoItem: { fontSize: '14px', color: '#6b7280', marginBottom: '6px' },
}