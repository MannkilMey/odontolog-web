import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'

const DESCUENTO_ANUAL = 0.20

export default function PlanesScreen() {
  const navigate = useNavigate()
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [ciclo, setCiclo] = useState('mensual')

  const { userProfile, suscripcion, plan: planActual, refreshData } = useSuscripcion()

  // ═══ MODAL DE COMPRA ═══
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

  // Pre-llenar form con datos del usuario
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
      alert('Ya tienes este plan activo')
      return
    }

    if (plan.codigo === 'free') {
      if (!window.confirm('¿Estás seguro que deseas cambiar al plan gratuito? Perderás las funciones premium.')) return
      await cambiarPlan(plan)
      return
    }

    // Abrir modal de compra
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
      alert(`Plan cambiado a ${nuevoPlan.nombre}`)
      refreshData()
    } catch (error) {
      alert('Error al cambiar de plan')
    } finally {
      setProcesando(false)
    }
  }

 const enviarSolicitudCompra = async () => {
    if (!compraForm.nombre_contacto.trim() || !compraForm.email.trim()) {
      alert('Por favor completá tu nombre y email')
      return
    }

    setEnviandoCompra(true)
    const plan = compraModal.plan
    const precioMes = getPrecio(plan.precio_mensual_usd)
    const total = getPrecioTotal(plan.precio_mensual_usd)

    try {
      // Registrar interés en la BD
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
      alert('Error al enviar la solicitud. Intentá de nuevo.')
    } finally {
      setEnviandoCompra(false)
    }
  }

  const PlanCard = ({ plan, esPlanActual }) => {
    const caracteristicas = Array.isArray(plan.caracteristicas)
      ? plan.caracteristicas
      : JSON.parse(plan.caracteristicas || '[]')

    const esGratuito = plan.codigo === 'free'
    const esPro = plan.codigo === 'pro'
    const esEnterprise = plan.codigo === 'enterprise'
    const precioMes = getPrecio(plan.precio_mensual_usd)
    const ahorro = getAhorro(plan.precio_mensual_usd)

    return (
      <div style={{
        ...styles.planCard,
        ...(esPlanActual && styles.planCardActual),
        ...(esPro && styles.planCardPro)
      }}>
        {esPlanActual && <div style={styles.badgeActual}>Plan Actual</div>}
        {esPro && <div style={styles.badgePopular}>Más Popular</div>}

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
              <div style={styles.precioPeriodo}>Gratis para siempre</div>
            </>
          ) : (
            <>
              {ciclo === 'anual' && <div style={styles.precioTachado}>${plan.precio_mensual_usd}/mes</div>}
              <div style={styles.precioNumero}>${precioMes}</div>
              <div style={styles.precioPeriodo}>USD / mes</div>
              {ciclo === 'anual' && <div style={styles.precioAnual}>Facturado ${getPrecioTotal(plan.precio_mensual_usd)}/año</div>}
              {ciclo === 'anual' && ahorro > 0 && <div style={styles.ahorroTag}>Ahorrás ${ahorro}/año</div>}
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
            👥 {plan.limite_pacientes ? `Hasta ${plan.limite_pacientes} pacientes` : 'Pacientes ilimitados'}
          </div>
          {plan.limite_emails_mes !== null && plan.limite_emails_mes > 0 && (
            <div style={styles.limiteInfo}>📧 {plan.limite_emails_mes} emails/mes</div>
          )}
          {plan.limite_whatsapp_mes !== null && plan.limite_whatsapp_mes > 0 && (
            <div style={styles.limiteInfo}>💬 {plan.limite_whatsapp_mes} WhatsApp/mes</div>
          )}
          {plan.codigo === 'free' && (
            <div style={styles.limiteInfo}>📨 Sin envío de mensajes</div>
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
          {esPlanActual ? '✓ Plan Actual' : esGratuito ? 'Seleccionar Plan' : 'Contratar Ahora'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingText}>Cargando planes...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Volver</button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>⭐ Planes y Precios</div>
          <div style={styles.subtitle}>Elige el plan perfecto para tu clínica</div>
        </div>
        <button onClick={() => navigate('/historial-pagos')} style={styles.historialButton}>📋 Mis pagos</button>
      </div>

      <div style={styles.content}>
        {planActual && (
          <div style={styles.infoActual}>
            <div style={styles.infoActualTexto}>Tu plan actual: <strong>{planActual.nombre}</strong></div>
            {suscripcion?.mensajes_usados_mes !== undefined && planActual.limite_mensajes_mes && (
              <div style={styles.infoUsage}>📨 Mensajes usados: {suscripcion.mensajes_usados_mes} / {planActual.limite_mensajes_mes}</div>
            )}
          </div>
        )}

        <div style={styles.cicloContainer}>
          <button onClick={() => setCiclo('mensual')} style={{...styles.cicloBtn, ...(ciclo === 'mensual' ? styles.cicloBtnActivo : {})}}>Mensual</button>
          <button onClick={() => setCiclo('anual')} style={{...styles.cicloBtn, ...(ciclo === 'anual' ? styles.cicloBtnActivo : {})}}>
            Anual <span style={styles.cicloBadge}>-{DESCUENTO_ANUAL * 100}%</span>
          </button>
        </div>

        <div style={styles.planesGrid}>
          {planes.map(plan => <PlanCard key={plan.id} plan={plan} esPlanActual={planActual?.id === plan.id} />)}
        </div>

        <div style={styles.infoAdicional}>
          <div style={styles.infoTitulo}>📞 ¿Necesitas ayuda?</div>
          <div style={styles.infoTexto}>WhatsApp: <strong>+595 994 747 485</strong></div>
          <div style={styles.infoTexto}>Email: <strong>soporte@odontolog.lat</strong></div>
        </div>

        <div style={styles.garantia}>
          <div style={styles.garantiaTitulo}>✅ Garantía de 30 días</div>
          <div style={styles.garantiaTexto}>Si no estás satisfecho con tu plan, te devolvemos tu dinero. Sin preguntas.</div>
        </div>
      </div>

      {/* ═══════ MODAL DE COMPRA ═══════ */}
      {compraModal.isOpen && (
        <div style={styles.overlay} onClick={() => !enviandoCompra && setCompraModal({ isOpen: false, plan: null })}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {!compraEnviada ? (
              <>
                <h3 style={styles.modalTitle}>🎉 Contratar Plan {compraModal.plan?.nombre}</h3>

                {/* Resumen del plan */}
                <div style={styles.planResumen}>
                  <div style={styles.planResumenRow}>
                    <span>Plan:</span>
                    <span style={{ fontWeight: '700' }}>{compraModal.plan?.nombre}</span>
                  </div>
                  <div style={styles.planResumenRow}>
                    <span>Precio:</span>
                    <span style={{ fontWeight: '700', color: '#1e40af' }}>
                      ${getPrecio(compraModal.plan?.precio_mensual_usd)} USD/mes
                    </span>
                  </div>
                  {ciclo === 'anual' && (
                    <>
                      <div style={styles.planResumenRow}>
                        <span>Total anual:</span>
                        <span>${getPrecioTotal(compraModal.plan?.precio_mensual_usd)} USD</span>
                      </div>
                      <div style={styles.planResumenRow}>
                        <span>Ahorro:</span>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>
                          ${getAhorro(compraModal.plan?.precio_mensual_usd)} USD/año
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Formulario */}
                <div style={styles.formSection}>
                  <div style={styles.formTitle}>Datos de contacto</div>

                  <label style={styles.formLabel}>Nombre de la clínica</label>
                  <input
                    type="text"
                    value={compraForm.nombre_clinica}
                    onChange={e => setCompraForm({...compraForm, nombre_clinica: e.target.value})}
                    placeholder="Ej: Clínica Dental Sonrisas"
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>Nombre de contacto *</label>
                  <input
                    type="text"
                    value={compraForm.nombre_contacto}
                    onChange={e => setCompraForm({...compraForm, nombre_contacto: e.target.value})}
                    placeholder="Ej: Dr. Juan Pérez"
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>Email *</label>
                  <input
                    type="email"
                    value={compraForm.email}
                    onChange={e => setCompraForm({...compraForm, email: e.target.value})}
                    placeholder="tu@email.com"
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={compraForm.telefono}
                    onChange={e => setCompraForm({...compraForm, telefono: e.target.value})}
                    placeholder="+595 981 123 456"
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>Método de pago preferido</label>
                  <select
                    value={compraForm.metodo_pago}
                    onChange={e => setCompraForm({...compraForm, metodo_pago: e.target.value})}
                    style={styles.formSelect}
                  >
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="tarjeta">Tarjeta de crédito/débito</option>
                    <option value="giro_tigo">Giro Tigo Money</option>
                    <option value="paypal">PayPal</option>
                    <option value="otro">Otro</option>
                  </select>

                  <label style={styles.formLabel}>Notas adicionales</label>
                  <textarea
                    value={compraForm.notas}
                    onChange={e => setCompraForm({...compraForm, notas: e.target.value})}
                    placeholder="Consultas, preferencias de horario para contacto, etc."
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
                    Cancelar
                  </button>
                  <button
                    onClick={enviarSolicitudCompra}
                    disabled={enviandoCompra}
                    style={styles.submitBtn}
                  >
                    {enviandoCompra ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            ) : (
              /* ═══ CONFIRMACIÓN ═══ */
              <div style={styles.confirmacion}>
                <div style={styles.confirmIcon}>✅</div>
                <h3 style={styles.confirmTitle}>¡Solicitud enviada!</h3>
                <p style={styles.confirmText}>
                  Recibimos tu solicitud para el plan <strong>{compraModal.plan?.nombre}</strong>.
                </p>
                <p style={styles.confirmText}>
                  Nos pondremos en contacto contigo en las próximas horas para coordinar el pago y activar tu plan.
                </p>

                <div style={styles.confirmContacto}>
                  <div style={styles.confirmContactoTitle}>¿Necesitas respuesta inmediata?</div>
                  <div style={styles.confirmContactoItem}>
                    📱 WhatsApp: <a href="https://wa.me/595994747485" style={{ color: '#1e40af', fontWeight: '600' }}>+595 994 747 485</a>
                  </div>
                  <div style={styles.confirmContactoItem}>
                    📧 Email: <a href="mailto:soporte@odontolog.lat" style={{ color: '#1e40af', fontWeight: '600' }}>soporte@odontolog.lat</a>
                  </div>
                </div>

                <button
                  onClick={() => { setCompraModal({ isOpen: false, plan: null }); navigate('/dashboard') }}
                  style={styles.submitBtn}
                >
                  Volver al Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.footerText}>OdontoLog • Planes y Precios</div>
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

  // Modal
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

  // Confirmación
  confirmacion: { textAlign: 'center', padding: '10px 0' },
  confirmIcon: { fontSize: '64px', marginBottom: '16px' },
  confirmTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  confirmText: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '8px' },
  confirmContacto: { margin: '24px 0', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px' },
  confirmContactoTitle: { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' },
  confirmContactoItem: { fontSize: '14px', color: '#6b7280', marginBottom: '6px' },
}