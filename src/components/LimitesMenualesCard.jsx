import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function LimitesMenualesCard({ userProfile, plan }) {
  const [limites, setLimites] = useState({
    mensajes_total: 0,
    emails_enviados: 0,
    whatsapp_enviados: 0,
    loading: true,
    error: null
  })

  const [diasRestantes, setDiasRestantes] = useState(0)

  useEffect(() => {
    if (userProfile?.id && plan) {
      cargarLimitesDelMes()
      calcularDiasRestantes()
    }
  }, [userProfile?.id, plan])

  const cargarLimitesDelMes = async () => {
    try {
      setLimites(prev => ({ ...prev, loading: true }))

      const ahora = new Date()
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

      // ✅ Todas las queries sobre mensajes_enviados, filtrando por canal
      const [totalResult, emailsResult, whatsappResult] = await Promise.allSettled([
        // Total mensajes enviados este mes
        supabase
          .from('mensajes_enviados')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id)
          .gte('created_at', inicioMes.toISOString())
          .lte('created_at', finMes.toISOString()),

        // Emails enviados este mes
        supabase
          .from('mensajes_enviados')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id)
          .eq('canal', 'email')
          .gte('created_at', inicioMes.toISOString())
          .lte('created_at', finMes.toISOString()),

        // WhatsApp enviados este mes
        supabase
          .from('mensajes_enviados')
          .select('id', { count: 'exact' })
          .eq('dentista_id', userProfile.id)
          .eq('canal', 'whatsapp')
          .gte('created_at', inicioMes.toISOString())
          .lte('created_at', finMes.toISOString())
      ])

      const total = totalResult.status === 'fulfilled' ? (totalResult.value.count || 0) : 0
      const emails = emailsResult.status === 'fulfilled' ? (emailsResult.value.count || 0) : 0
      const whatsapp = whatsappResult.status === 'fulfilled' ? (whatsappResult.value.count || 0) : 0

      setLimites({
        mensajes_total: total,
        emails_enviados: emails,
        whatsapp_enviados: whatsapp,
        loading: false,
        error: null
      })


    } catch (error) {
      console.error('❌ Error cargando límites mensuales:', error)
      setLimites(prev => ({ ...prev, loading: false, error: error.message }))
    }
  }

  const calcularDiasRestantes = () => {
    const ahora = new Date()
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    setDiasRestantes(Math.max(0, finMes.getDate() - ahora.getDate()))
  }

  const calcularPorcentajeUso = (usado, limite) => {
    if (!limite || limite === 0) return 0
    return Math.min(100, (usado / limite) * 100)
  }

  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 90) return '#ef4444'
    if (porcentaje >= 75) return '#f59e0b'
    return '#10b981'
  }

  const formatearLimite = (limite) => {
    if (!limite || limite === 0) return '∞'
    if (limite >= 1000) return `${(limite / 1000).toFixed(1)}k`
    return limite.toString()
  }

  const getMesActual = () => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const ahora = new Date()
    return `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`
  }

  if (limites.loading) {
    return (
      <div style={styles.loadingCard}>
        <div style={styles.loadingIcon}>🔄</div>
        <div style={styles.loadingText}>Cargando límites...</div>
      </div>
    )
  }

  if (limites.error) {
    return (
      <div style={styles.errorCard}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorText}>Error cargando límites</div>
        <button onClick={cargarLimitesDelMes} style={styles.retryButton}>Reintentar</button>
      </div>
    )
  }

  const limitesData = [
    {
      tipo: 'total',
      icon: '📨',
      label: 'Total Mensajes',
      usado: limites.mensajes_total,
      limite: plan.limite_mensajes_mes,
      color: '#3b82f6'
    },
    {
      tipo: 'email',
      icon: '✉️',
      label: 'Emails',
      usado: limites.emails_enviados,
      limite: plan.limite_emails_mes,
      color: '#8b5cf6'
    },
    {
      tipo: 'whatsapp',
      icon: '💬',
      label: 'WhatsApp',
      usado: limites.whatsapp_enviados,
      limite: plan.limite_whatsapp_mes,
      color: '#10b981'
    }
  ]

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>📊 Uso Mensual - {getMesActual()}</span>
          <span style={styles.planName}>Plan {plan.nombre}</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.resetInfo}>
            <span style={styles.resetIcon}>🔄</span>
            <span style={styles.resetText}>
              Resetea en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
            </span>
          </div>
          <button onClick={cargarLimitesDelMes} style={styles.refreshButton} title="Actualizar datos">↻</button>
        </div>
      </div>

      <div style={styles.limitesGrid}>
        {limitesData.map((item) => {
          const porcentaje = calcularPorcentajeUso(item.usado, item.limite)
          const color = getColorPorcentaje(porcentaje)

          return (
            <div key={item.tipo} style={styles.limiteItem}>
              <div style={styles.limiteHeader}>
                <span style={styles.limiteIcon}>{item.icon}</span>
                <span style={styles.limiteLabel}>{item.label}</span>
              </div>
              
              <div style={styles.limiteNumeros}>
                <span style={styles.limiteUsado}>{item.usado}</span>
                <span style={styles.limiteSeparador}>/</span>
                <span style={styles.limiteLimite}>{formatearLimite(item.limite)}</span>
              </div>

              {item.limite > 0 && (
                <div style={styles.barraContainer}>
                  <div style={{ ...styles.barraFondo, borderColor: color }}>
                    <div style={{ ...styles.barraRelleno, width: `${porcentaje}%`, backgroundColor: color }} />
                  </div>
                  <span style={{ ...styles.barraPorcentaje, color }}>{Math.round(porcentaje)}%</span>
                </div>
              )}

              {item.limite > 0 && porcentaje >= 90 && (
                <div style={styles.advertencia}>⚠️ Límite próximo</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerInfo}>
          Los límites se resetean automáticamente el primer día de cada mes
        </div>
        {plan.precio_mensual_usd > 0 && (
          <div style={styles.footerPrecio}>${plan.precio_mensual_usd}/mes</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  loadingCard: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  loadingIcon: { fontSize: '24px' },
  loadingText: { fontSize: '14px', color: '#6b7280' },
  errorCard: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  errorIcon: { fontSize: '24px' },
  errorText: { fontSize: '14px', color: '#dc2626' },
  retryButton: { padding: '8px 16px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  card: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', marginBottom: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#1f2937' },
  planName: { fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  resetInfo: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', padding: '6px 12px', borderRadius: '8px' },
  resetIcon: { fontSize: '12px' },
  resetText: { fontSize: '11px', color: '#1e40af', fontWeight: '600' },
  refreshButton: { padding: '6px 10px', backgroundColor: 'transparent', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#6b7280', fontSize: '14px', cursor: 'pointer' },
  limitesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '20px' },
  limiteItem: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' },
  limiteHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  limiteIcon: { fontSize: '20px' },
  limiteLabel: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  limiteNumeros: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' },
  limiteUsado: { fontSize: '24px', fontWeight: '700', color: '#1f2937' },
  limiteSeparador: { fontSize: '16px', color: '#9ca3af' },
  limiteLimite: { fontSize: '16px', color: '#6b7280', fontWeight: '500' },
  barraContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
  barraFondo: { flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', border: '1px solid', overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' },
  barraPorcentaje: { fontSize: '12px', fontWeight: '700', minWidth: '36px', textAlign: 'right' },
  advertencia: { fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '8px', textAlign: 'center' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' },
  footerInfo: { fontSize: '11px', color: '#6b7280', fontStyle: 'italic' },
  footerPrecio: { fontSize: '12px', color: '#10b981', fontWeight: '700', backgroundColor: '#f0f9f5', padding: '4px 8px', borderRadius: '4px' },
}

export default LimitesMenualesCard