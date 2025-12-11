import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/useSuscripcion'

export default function PlanesScreen() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  
  const { suscripcion, plan: planActual, refresh } = useSuscripcion(user?.id)

  useEffect(() => {
    getProfile()
    loadPlanes()
  }, [])

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

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

  const handleSeleccionarPlan = async (plan) => {
  if (!user) return

  // Si ya tiene ese plan
  if (planActual?.id === plan.id) {
    alert('Ya tienes este plan activo')
    return
  }

  // Si es plan FREE (downgrade)
  if (plan.codigo === 'free') {
    if (!window.confirm('¿Estás seguro que deseas cambiar al plan gratuito? Perderás las funciones premium.')) {
      return
    }
    await cambiarPlan(plan)
    return
  }

  // Si es upgrade a plan pago - MODAL CON INFO
  if (plan.codigo === 'pro' || plan.codigo === 'enterprise') {
    const mensaje = `
📱 CONTRATAR PLAN ${plan.nombre.toUpperCase()}

💰 Precio: Gs. ${Number(plan.precio_mensual_gs).toLocaleString('es-PY')}/mes

📞 Para suscribirte, contáctanos por:

WhatsApp: +595 981 XXX XXX
Email: ventas@odontolog.com

Te responderemos en menos de 1 hora con:
✅ Datos para transferencia bancaria
✅ Activación inmediata tras confirmar pago
✅ Soporte para migrar tus datos

¿Deseas que te contactemos?
    `
    
    if (window.confirm(mensaje)) {
      // Registrar interés en la base de datos
      await registrarInteres(plan)
      alert('✅ ¡Perfecto! Te contactaremos pronto.')
    }
    return
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
        .eq('dentista_id', user.id)

      if (error) throw error

      alert(`✅ Plan cambiado exitosamente a ${nuevoPlan.nombre}`)
      refresh()
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

    // Obtener info del dentista
    const { data: dentista } = await supabase
      .from('dentistas')
      .select('nombre, email, telefono')
      .eq('id', user.id)
      .single()

    // Guardar el interés
    const { data, error } = await supabase
      .from('intereses_planes')
      .insert({
        dentista_id: user.id,
        plan_id: plan.id,
        plan_nombre: plan.nombre,
        plan_precio: plan.precio_mensual_gs,
        estado: 'pendiente',
        notas: `Usuario mostró interés desde la app. Email: ${dentista?.email || user.email}`
      })
      .select()
      .single()

    if (error) throw error

    console.log('✅ Interés registrado:', data)

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

    return (
      <div style={{
        ...styles.planCard,
        ...(esPlanActual && styles.planCardActual),
        ...(esPro && styles.planCardPro)
      }}>
        {/* Badge de plan actual */}
        {esPlanActual && (
          <div style={styles.badgeActual}>Plan Actual</div>
        )}

        {/* Badge de más popular */}
        {esPro && (
          <div style={styles.badgePopular}>Más Popular</div>
        )}

        {/* Header del plan */}
        <div style={styles.planHeader}>
          <div style={styles.planIcono}>
            {esGratuito && '🆓'}
            {esPro && '⭐'}
            {esEnterprise && '💎'}
          </div>
          <div style={styles.planNombre}>{plan.nombre}</div>
          <div style={styles.planDescripcion}>{plan.descripcion}</div>
        </div>

        {/* Precio */}
        <div style={styles.planPrecio}>
          {esGratuito ? (
            <>
              <div style={styles.precioNumero}>Gratis</div>
              <div style={styles.precioPeriodo}>Para siempre</div>
            </>
          ) : (
            <>
              <div style={styles.precioNumero}>
                Gs. {Number(plan.precio_mensual_gs).toLocaleString('es-PY')}
              </div>
              <div style={styles.precioPeriodo}>por mes</div>
              <div style={styles.precioUSD}>
                ~${Number(plan.precio_mensual_usd).toFixed(0)} USD/mes
              </div>
            </>
          )}
        </div>

        {/* Características */}
        <div style={styles.caracteristicasList}>
          {caracteristicas.map((caracteristica, index) => (
            <div key={index} style={styles.caracteristicaItem}>
              <span style={styles.caracteristicaIcono}>✓</span>
              <span style={styles.caracteristicaTexto}>{caracteristica}</span>
            </div>
          ))}
        </div>

        {/* Límites específicos */}
        {plan.limite_pacientes && (
          <div style={styles.limiteInfo}>
            👥 Hasta {plan.limite_pacientes} pacientes
          </div>
        )}
        {plan.limite_mensajes_mes && (
          <div style={styles.limiteInfo}>
            📨 {plan.limite_mensajes_mes} mensajes/mes
          </div>
        )}
        {!plan.limite_pacientes && !plan.limite_mensajes_mes && (
          <div style={styles.limiteInfo}>
            ♾️ Sin límites
          </div>
        )}

        {/* Botón de acción */}
        <button
          style={{
            ...styles.planButton,
            ...(esPlanActual && styles.planButtonActual),
            ...(esPro && styles.planButtonPro),
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
        <div>Cargando planes...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>⭐ Planes y Precios</div>
          <div style={styles.subtitle}>Elige el plan perfecto para tu clínica</div>
          {/* Botón historial de pagos */}
          <button 
            onClick={() => navigate('/historial-pagos')}
            style={styles.historialButton}
          >
            📋 Ver mis pagos
          </button>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info actual */}
        {planActual && (
          <div style={styles.infoActual}>
            <div style={styles.infoActualTexto}>
              Tu plan actual: <strong>{planActual.nombre}</strong>
            </div>
            {suscripcion?.mensajes_usados_mes !== undefined && planActual.limite_mensajes_mes && (
              <div style={styles.infoUsage}>
                📨 Mensajes usados este mes: {suscripcion.mensajes_usados_mes} / {planActual.limite_mensajes_mes}
              </div>
            )}
          </div>
        )}

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

        {/* Info adicional */}
        <div style={styles.infoAdicional}>
          <div style={styles.infoTitulo}>📞 ¿Necesitas ayuda?</div>
          <div style={styles.infoTexto}>
            Contáctanos por WhatsApp: <strong>+595 XXX XXX XXX</strong>
          </div>
          <div style={styles.infoTexto}>
            O envíanos un email: <strong>soporte@odontolog.com</strong>
          </div>
        </div>

        {/* Garantía */}
        <div style={styles.garantia}>
          <div style={styles.garantiaTitulo}>✅ Garantía de 30 días</div>
          <div style={styles.garantiaTexto}>
            Si no estás satisfecho con tu plan, te devolvemos tu dinero. Sin preguntas.
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
    fontSize: '28px',
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
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
  infoActual: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    border: '2px solid #3b82f6',
  },
  infoActualTexto: {
    fontSize: '16px',
    color: '#1e40af',
    marginBottom: '8px',
  },
  infoUsage: {
    fontSize: '14px',
    color: '#6b7280',
  },
  planesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '32px',
    marginBottom: '48px',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    border: '2px solid #e5e7eb',
    position: 'relative',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  },
  planCardActual: {
    border: '2px solid #10b981',
    backgroundColor: '#f0fdf4',
  },
  planCardPro: {
    border: '3px solid #3b82f6',
    transform: 'scale(1.05)',
    boxShadow: '0 10px 30px rgba(59,130,246,0.2)',
  },
  badgeActual: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '6px 14px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  badgePopular: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
  },
  planHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  planIcono: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  planNombre: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  planDescripcion: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  planPrecio: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  precioNumero: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '4px',
  },
  precioPeriodo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  precioUSD: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  caracteristicasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  caracteristicaItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  caracteristicaIcono: {
    color: '#10b981',
    fontSize: '18px',
    fontWeight: '700',
    flexShrink: 0,
  },
  caracteristicaTexto: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  limiteInfo: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#6b7280',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  planButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  planButtonActual: {
    backgroundColor: '#10b981',
    cursor: 'not-allowed',
  },
  planButtonPro: {
    backgroundColor: '#2563eb',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
  planButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  infoAdicional: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  infoTitulo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  infoTexto: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  garantia: {
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    border: '2px solid #10b981',
  },
  garantiaTitulo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '8px',
  },
  garantiaTexto: {
    fontSize: '14px',
    color: '#047857',
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
  historialButton: {
  marginTop: '12px',
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
},
}