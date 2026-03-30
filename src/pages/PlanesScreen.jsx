import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'

// ═══════════════════════════════════════════════════════════
// CAMBIOS:
// 1. useSuscripcion() sin parámetros (el userId viene del Provider)
// 2. Eliminado getProfile() — userProfile viene del Context
// 3. Precios solo en USD con toggle mensual/anual
// 4. 20% descuento por pago anual
// ═══════════════════════════════════════════════════════════

const DESCUENTO_ANUAL = 0.20 // 20% descuento

export default function PlanesScreen() {
  const navigate = useNavigate()
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [ciclo, setCiclo] = useState('mensual') // mensual | anual

  // ✅ Context sin parámetros
  const { 
    userProfile, 
    suscripcion, 
    plan: planActual, 
    refreshData 
  } = useSuscripcion()

  useEffect(() => {
    loadPlanes()
  }, [])

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

  // Calcular precio según ciclo
  const getPrecio = (precioMensualUsd) => {
    if (!precioMensualUsd || precioMensualUsd === 0) return 0
    if (ciclo === 'anual') {
      return Math.round(precioMensualUsd * (1 - DESCUENTO_ANUAL))
    }
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
      if (!window.confirm('¿Estás seguro que deseas cambiar al plan gratuito? Perderás las funciones premium.')) {
        return
      }
      await cambiarPlan(plan)
      return
    }

    // Plan pago — mostrar info de contacto
    const precioMes = getPrecio(plan.precio_mensual_usd)
    const total = getPrecioTotal(plan.precio_mensual_usd)
    const periodo = ciclo === 'anual' ? 'año' : 'mes'

    const mensaje = `📱 CONTRATAR PLAN ${plan.nombre.toUpperCase()}

💰 Precio: $${precioMes} USD/mes${ciclo === 'anual' ? ` (facturado $${total}/año)` : ''}
${ciclo === 'anual' ? `🎁 Ahorro: $${getAhorro(plan.precio_mensual_usd)} USD/año\n` : ''}
📞 Para suscribirte, contáctanos por:

WhatsApp: +595 994 747 485
Email: ventas@odontolog.lat

Te responderemos en menos de 1 hora con:
✅ Link de pago seguro
✅ Activación inmediata tras confirmar pago
✅ Soporte para migrar tus datos

¿Deseas que te contactemos?`

    if (window.confirm(mensaje)) {
      await registrarInteres(plan)
      alert('✅ ¡Perfecto! Te contactaremos pronto.')
    }
  }

  const cambiarPlan = async (nuevoPlan) => {
    try {
      setProcesando(true)
      const { error } = await supabase
        .from('suscripciones_usuarios')
        .update({
          plan_id: nuevoPlan.id,
          updated_at: new Date().toISOString()
        })
        .eq('dentista_id', userProfile.id)

      if (error) throw error

      alert(`✅ Plan cambiado exitosamente a ${nuevoPlan.nombre}`)
      refreshData()
    } catch (error) {
      console.error('Error cambiando plan:', error)
      alert('Error al cambiar de plan')
    } finally {
      setProcesando(false)
    }
  }

  const registrarInteres = async (plan) => {
    try {
      setProcesando(true)
      await supabase
        .from('intereses_planes')
        .insert({
          dentista_id: userProfile.id,
          plan_id: plan.id,
          plan_nombre: plan.nombre,
          plan_precio: getPrecioTotal(plan.precio_mensual_usd),
          estado: 'pendiente',
          notas: `Ciclo: ${ciclo} | $${getPrecio(plan.precio_mensual_usd)}/mes | Email: ${userProfile.email}`
        })
    } catch (error) {
      console.error('Error registrando interés:', error)
    } finally {
      setProcesando(false)
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
            {esGratuito && '🆓'}
            {esPro && '⭐'}
            {esEnterprise && '💎'}
          </div>
          <div style={styles.planNombre}>{plan.nombre}</div>
          <div style={styles.planDescripcion}>{plan.descripcion}</div>
        </div>

        {/* Precio USD */}
        <div style={styles.planPrecio}>
          {esGratuito ? (
            <>
              <div style={styles.precioNumero}>$0</div>
              <div style={styles.precioPeriodo}>Gratis para siempre</div>
            </>
          ) : (
            <>
              {ciclo === 'anual' && (
                <div style={styles.precioTachado}>
                  ${plan.precio_mensual_usd}/mes
                </div>
              )}
              <div style={styles.precioNumero}>${precioMes}</div>
              <div style={styles.precioPeriodo}>USD / mes</div>
              {ciclo === 'anual' && (
                <div style={styles.precioAnual}>
                  Facturado ${getPrecioTotal(plan.precio_mensual_usd)}/año
                </div>
              )}
              {ciclo === 'anual' && ahorro > 0 && (
                <div style={styles.ahorroTag}>
                  Ahorrás ${ahorro}/año
                </div>
              )}
            </>
          )}
        </div>

        {/* Características */}
        <div style={styles.caracteristicasList}>
          {caracteristicas.map((c, i) => (
            <div key={i} style={styles.caracteristicaItem}>
              <span style={styles.caracteristicaIcono}>✓</span>
              <span style={styles.caracteristicaTexto}>{c}</span>
            </div>
          ))}
        </div>

        {/* Límites */}
        <div style={styles.limitesContainer}>
          {plan.limite_pacientes ? (
            <div style={styles.limiteInfo}>👥 Hasta {plan.limite_pacientes} pacientes</div>
          ) : (
            <div style={styles.limiteInfo}>👥 Pacientes ilimitados</div>
          )}
          {plan.limite_mensajes_mes ? (
            <div style={styles.limiteInfo}>📨 {plan.limite_mensajes_mes} mensajes/mes</div>
          ) : plan.codigo !== 'free' ? (
            <div style={styles.limiteInfo}>📨 Mensajes ilimitados</div>
          ) : null}
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
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Volver</button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>⭐ Planes y Precios</div>
          <div style={styles.subtitle}>Elige el plan perfecto para tu clínica</div>
        </div>
        <button onClick={() => navigate('/historial-pagos')} style={styles.historialButton}>
          📋 Mis pagos
        </button>
      </div>

      <div style={styles.content}>
        {/* Info plan actual */}
        {planActual && (
          <div style={styles.infoActual}>
            <div style={styles.infoActualTexto}>
              Tu plan actual: <strong>{planActual.nombre}</strong>
            </div>
            {suscripcion?.mensajes_usados_mes !== undefined && planActual.limite_mensajes_mes && (
              <div style={styles.infoUsage}>
                📨 Mensajes usados: {suscripcion.mensajes_usados_mes} / {planActual.limite_mensajes_mes}
              </div>
            )}
          </div>
        )}

        {/* Toggle Mensual / Anual */}
        <div style={styles.cicloContainer}>
          <button
            onClick={() => setCiclo('mensual')}
            style={{
              ...styles.cicloBtn,
              ...(ciclo === 'mensual' ? styles.cicloBtnActivo : {})
            }}
          >
            Mensual
          </button>
          <button
            onClick={() => setCiclo('anual')}
            style={{
              ...styles.cicloBtn,
              ...(ciclo === 'anual' ? styles.cicloBtnActivo : {})
            }}
          >
            Anual
            <span style={styles.cicloBadge}>-{DESCUENTO_ANUAL * 100}%</span>
          </button>
        </div>

        {/* Grid de planes */}
        <div style={styles.planesGrid}>
          {planes.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              esPlanActual={planActual?.id === plan.id}
            />
          ))}
        </div>

        {/* Contacto */}
        <div style={styles.infoAdicional}>
          <div style={styles.infoTitulo}>📞 ¿Necesitas ayuda?</div>
          <div style={styles.infoTexto}>WhatsApp: <strong>+595 994 747 485</strong></div>
          <div style={styles.infoTexto}>Email: <strong>soporte@odontolog.lat</strong></div>
        </div>

        {/* Garantía */}
        <div style={styles.garantia}>
          <div style={styles.garantiaTitulo}>✅ Garantía de 30 días</div>
          <div style={styles.garantiaTexto}>
            Si no estás satisfecho con tu plan, te devolvemos tu dinero. Sin preguntas.
          </div>
        </div>
      </div>

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

  // Info actual
  infoActual: { backgroundColor: '#eff6ff', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '2px solid #3b82f6' },
  infoActualTexto: { fontSize: '16px', color: '#1e40af', marginBottom: '8px' },
  infoUsage: { fontSize: '14px', color: '#6b7280' },

  // Toggle ciclo
  cicloContainer: { display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '32px', backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '4px', maxWidth: '320px', margin: '0 auto 32px' },
  cicloBtn: { flex: 1, padding: '10px 20px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#6b7280', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  cicloBtnActivo: { backgroundColor: '#ffffff', color: '#1e40af', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cicloBadge: { padding: '2px 6px', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '4px', fontSize: '10px', fontWeight: '700' },

  // Grid
  planesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '48px' },

  // Cards
  planCard: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', border: '2px solid #e5e7eb', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  planCardActual: { border: '2px solid #10b981', backgroundColor: '#f0fdf4' },
  planCardPro: { border: '3px solid #3b82f6', transform: 'scale(1.03)', boxShadow: '0 10px 30px rgba(59,130,246,0.2)' },
  badgeActual: { position: 'absolute', top: '16px', right: '16px', padding: '6px 14px', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgePopular: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '8px 20px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '20px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(59,130,246,0.4)', whiteSpace: 'nowrap' },
  planHeader: { textAlign: 'center', marginBottom: '24px' },
  planIcono: { fontSize: '48px', marginBottom: '16px' },
  planNombre: { fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' },
  planDescripcion: { fontSize: '14px', color: '#6b7280', lineHeight: '1.5' },

  // Precio
  planPrecio: { textAlign: 'center', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' },
  precioTachado: { fontSize: '14px', color: '#9ca3af', textDecoration: 'line-through', marginBottom: '4px' },
  precioNumero: { fontSize: '40px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' },
  precioPeriodo: { fontSize: '14px', color: '#6b7280' },
  precioAnual: { fontSize: '13px', color: '#6b7280', marginTop: '8px' },
  ahorroTag: { display: 'inline-block', marginTop: '8px', padding: '4px 12px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: '1px solid #10b981' },

  // Características
  caracteristicasList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  caracteristicaItem: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  caracteristicaIcono: { color: '#10b981', fontSize: '16px', fontWeight: '700', flexShrink: 0, marginTop: '1px' },
  caracteristicaTexto: { fontSize: '14px', color: '#374151', lineHeight: '1.5' },

  // Límites
  limitesContainer: { marginBottom: '24px' },
  limiteInfo: { textAlign: 'center', fontSize: '13px', color: '#6b7280', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '6px' },

  // Botones
  planButton: { width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  planButtonActual: { backgroundColor: '#10b981', cursor: 'not-allowed' },
  planButtonPro: { backgroundColor: '#2563eb', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' },
  planButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },

  // Info adicional
  infoAdicional: { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px', textAlign: 'center' },
  infoTitulo: { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  infoTexto: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' },
  garantia: { backgroundColor: '#ecfdf5', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '2px solid #10b981', marginBottom: '24px' },
  garantiaTitulo: { fontSize: '18px', fontWeight: '700', color: '#059669', marginBottom: '8px' },
  garantiaTexto: { fontSize: '14px', color: '#047857' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}