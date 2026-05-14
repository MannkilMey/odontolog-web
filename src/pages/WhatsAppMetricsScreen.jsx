import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function WhatsAppMetricsScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState(null)
  const [mensajesPorDia, setMensajesPorDia] = useState([])
  const [mensajesPorTipo, setMensajesPorTipo] = useState([])
  const [topPacientes, setTopPacientes] = useState([])
  const [periodo, setPeriodo] = useState('mes_actual')

  useEffect(() => {
    loadData()
  }, [periodo])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: metricasData, error: metricasError } = await supabase
        .from('metricas_mensajeria_dentista').select('*')
        .eq('dentista_id', user.id).single()
      if (metricasError) throw metricasError
      setMetricas(metricasData)

      let fechaInicio, fechaFin
      const hoy = new Date()

      if (periodo === 'mes_actual') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fechaFin = hoy
      } else if (periodo === 'mes_anterior') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      } else {
        fechaInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
        fechaFin = hoy
      }

      const { data: mensajesDia, error: diaError } = await supabase
        .from('mensajes_enviados').select('fecha_enviado, canal')
        .eq('dentista_id', user.id)
        .gte('fecha_enviado', fechaInicio.toISOString())
        .lte('fecha_enviado', fechaFin.toISOString())
        .order('fecha_enviado')
      if (diaError) throw diaError

      const grouped = {}
      mensajesDia?.forEach(m => {
        const fecha = new Date(m.fecha_enviado).toISOString().split('T')[0]
        if (!grouped[fecha]) grouped[fecha] = { fecha, email: 0, whatsapp: 0, total: 0 }
        grouped[fecha][m.canal]++
        grouped[fecha].total++
      })
      setMensajesPorDia(Object.values(grouped))

      const { data: mensajesTipo, error: tipoError } = await supabase
        .from('mensajes_enviados').select('tipo, canal')
        .eq('dentista_id', user.id)
        .gte('fecha_enviado', fechaInicio.toISOString())
        .lte('fecha_enviado', fechaFin.toISOString())
      if (tipoError) throw tipoError

      const tipoGrouped = {}
      mensajesTipo?.forEach(m => {
        const key = `${m.tipo}_${m.canal}`
        if (!tipoGrouped[key]) tipoGrouped[key] = { tipo: m.tipo, canal: m.canal, count: 0 }
        tipoGrouped[key].count++
      })
      setMensajesPorTipo(Object.values(tipoGrouped))

      const { data: topData, error: topError } = await supabase
        .from('mensajes_enviados')
        .select('paciente_id, paciente:pacientes(nombre, apellido)')
        .eq('dentista_id', user.id)
        .gte('fecha_enviado', fechaInicio.toISOString())
        .lte('fecha_enviado', fechaFin.toISOString())
      if (topError) throw topError

      const pacientesCount = {}
      topData?.forEach(m => {
        if (!m.paciente) return
        const key = m.paciente_id
        if (!pacientesCount[key]) {
          pacientesCount[key] = {
            paciente_id: key,
            nombre: `${m.paciente.nombre} ${m.paciente.apellido}`,
            count: 0
          }
        }
        pacientesCount[key].count++
      })

      setTopPacientes(
        Object.values(pacientesCount)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      )

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('whatsappMetrics.titlePlain') }))
    } finally {
      setLoading(false)
    }
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      recibo_pago:        t('whatsappMetrics.typeReceipt'),
      recibo_cuota:       t('whatsappMetrics.typeInstallmentReceipt'),
      presupuesto:        t('whatsappMetrics.typeBudget'),
      recordatorio_cita:  t('whatsappMetrics.typeAppointmentReminder'),
      recordatorio_cuota: t('whatsappMetrics.typeInstallmentReminder'),
      mensaje_directo:    t('whatsappMetrics.typeDirectMessage'),
    }
    return labels[tipo] || tipo
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>{t('whatsappMetrics.loading')}</div>
      </div>
    )
  }

  const alertaNivelEmail    = metricas?.porcentaje_email >= 90    ? 'danger' : metricas?.porcentaje_email >= 70    ? 'warning' : 'ok'
  const alertaNivelWhatsApp = metricas?.porcentaje_whatsapp >= 90 ? 'danger' : metricas?.porcentaje_whatsapp >= 70 ? 'warning' : 'ok'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('whatsappMetrics.title')}</div>
          <div style={styles.subtitle}>
            {t('whatsappMetrics.planLabel', { name: metricas?.plan_nombre })}
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Filtro de período */}
        <div style={styles.periodoSelector}>
          <button
            style={{ ...styles.periodoButton, ...(periodo === 'mes_actual'   && styles.periodoButtonActive) }}
            onClick={() => setPeriodo('mes_actual')}
          >
            {t('metricasPerfil.thisMes')}
          </button>
          <button
            style={{ ...styles.periodoButton, ...(periodo === 'mes_anterior' && styles.periodoButtonActive) }}
            onClick={() => setPeriodo('mes_anterior')}
          >
            {t('metricasPerfil.lastMes')}
          </button>
          <button
            style={{ ...styles.periodoButton, ...(periodo === 'ultimos_30'   && styles.periodoButtonActive) }}
            onClick={() => setPeriodo('ultimos_30')}
          >
            {t('metricasPerfil.last30')}
          </button>
        </div>

        {/* Alertas */}
        {(alertaNivelEmail !== 'ok' || alertaNivelWhatsApp !== 'ok') && (
          <div style={styles.alertSection}>
            {alertaNivelEmail === 'danger' && (
              <div style={{ ...styles.alert, ...styles.alertDanger }}>
                {t('whatsappMetrics.alertEmailDanger', { percent: metricas.porcentaje_email })}
              </div>
            )}
            {alertaNivelEmail === 'warning' && (
              <div style={{ ...styles.alert, ...styles.alertWarning }}>
                {t('whatsappMetrics.alertEmailWarning', { percent: metricas.porcentaje_email })}
              </div>
            )}
            {alertaNivelWhatsApp === 'danger' && (
              <div style={{ ...styles.alert, ...styles.alertDanger }}>
                {t('whatsappMetrics.alertWADanger', { percent: metricas.porcentaje_whatsapp })}
              </div>
            )}
            {alertaNivelWhatsApp === 'warning' && (
              <div style={{ ...styles.alert, ...styles.alertWarning }}>
                {t('whatsappMetrics.alertWAWarning', { percent: metricas.porcentaje_whatsapp })}
              </div>
            )}
          </div>
        )}

        {/* Métricas principales */}
        <div style={styles.metricsGrid}>
          {/* Email */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>📧</span>
              <span style={styles.metricTitle}>{t('whatsappMetrics.emailsTitle')}</span>
            </div>
            <div style={styles.metricValue}>
              {metricas?.emails_usados || 0}
              {metricas?.limite_email && ` / ${metricas.limite_email}`}
            </div>
            {metricas?.limite_email ? (
              <>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(metricas.porcentaje_email, 100)}%`,
                    backgroundColor: alertaNivelEmail === 'danger' ? '#ef4444' :
                                     alertaNivelEmail === 'warning' ? '#f59e0b' : '#10b981'
                  }} />
                </div>
                <div style={styles.metricSubtext}>
                  {metricas.emails_restantes >= 0
                    ? t('whatsappMetrics.available', { count: metricas.emails_restantes })
                    : t('whatsappMetrics.limitExceeded')}
                </div>
              </>
            ) : (
              <div style={styles.metricSubtext}>{t('common.unlimited')}</div>
            )}
          </div>

          {/* WhatsApp */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>📱</span>
              <span style={styles.metricTitle}>{t('whatsappMetrics.whatsappTitle')}</span>
            </div>
            <div style={styles.metricValue}>
              {metricas?.whatsapp_usados || 0}
              {metricas?.limite_whatsapp && ` / ${metricas.limite_whatsapp}`}
            </div>
            {metricas?.limite_whatsapp && metricas?.limite_whatsapp > 0 ? (
              <>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(metricas.porcentaje_whatsapp, 100)}%`,
                    backgroundColor: alertaNivelWhatsApp === 'danger' ? '#ef4444' :
                                     alertaNivelWhatsApp === 'warning' ? '#f59e0b' : '#10b981'
                  }} />
                </div>
                <div style={styles.metricSubtext}>
                  {metricas.whatsapp_restantes >= 0
                    ? t('whatsappMetrics.available', { count: metricas.whatsapp_restantes })
                    : t('whatsappMetrics.limitExceeded')}
                </div>
              </>
            ) : (
              <div style={styles.metricSubtext}>
                {metricas?.plan_codigo === 'free'
                  ? t('whatsappMetrics.notAvailable')
                  : t('common.unlimited')}
              </div>
            )}
          </div>

          {/* Total */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>💬</span>
              <span style={styles.metricTitle}>{t('whatsappMetrics.totalTitle')}</span>
            </div>
            <div style={styles.metricValue}>
              {(metricas?.emails_usados || 0) + (metricas?.whatsapp_usados || 0)}
            </div>
            <div style={styles.metricSubtext}>{t('whatsappMetrics.thisMonth')}</div>
          </div>
        </div>

        {/* Mensajes por tipo */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('whatsappMetrics.sectionByType')}</div>
          {mensajesPorTipo.length === 0 ? (
            <div style={styles.emptyState}>{t('whatsappMetrics.noPeriodData')}</div>
          ) : (
            <div style={styles.tiposList}>
              {mensajesPorTipo.map((item, idx) => (
                <div key={idx} style={styles.tipoItem}>
                  <div style={styles.tipoLabel}>{getTipoLabel(item.tipo)}</div>
                  <div style={styles.tipoCanal}>
                    {item.canal === 'email' ? '📧' : '📱'} {item.canal}
                  </div>
                  <div style={styles.tipoCount}>{item.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top pacientes */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('whatsappMetrics.sectionTopPatients')}</div>
          {topPacientes.length === 0 ? (
            <div style={styles.emptyState}>{t('whatsappMetrics.noPeriodData')}</div>
          ) : (
            <div style={styles.topList}>
              {topPacientes.map((paciente, idx) => (
                <div key={idx} style={styles.topItem}>
                  <div style={styles.topRank}>#{idx + 1}</div>
                  <div style={styles.topNombre}>{paciente.nombre}</div>
                  <div style={styles.topCount}>
                    {t('whatsappMetrics.messageCount', { count: paciente.count })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad diaria */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('whatsappMetrics.sectionDailyActivity')}</div>
          {mensajesPorDia.length === 0 ? (
            <div style={styles.emptyState}>{t('whatsappMetrics.noPeriodData')}</div>
          ) : (
            <div style={styles.chartContainer}>
              {mensajesPorDia.slice(-14).map((dia, idx) => {
                const maxVal = Math.max(...mensajesPorDia.map(d => d.total))
                const altura = maxVal > 0 ? (dia.total / maxVal) * 100 : 0
                return (
                  <div key={idx} style={styles.barContainer}>
                    <div
                      style={{ ...styles.bar, height: `${altura}%` }}
                      title={t('whatsappMetrics.barTooltip', { date: dia.fecha, count: dia.total })}
                    />
                    <div style={styles.barLabel}>{new Date(dia.fecha).getDate()}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upgrade */}
        {metricas?.plan_codigo === 'free' && (
          <div style={styles.upgradeSection}>
            <div style={styles.upgradeCard}>
              <div style={styles.upgradeIcon}>⭐</div>
              <div style={styles.upgradeContent}>
                <div style={styles.upgradeTitle}>{t('whatsappMetrics.upgradeTitle')}</div>
                <div style={styles.upgradeText}>{t('whatsappMetrics.upgradeText')}</div>
              </div>
              <button style={styles.upgradeButton} onClick={() => navigate('/suscripcion')}>
                {t('whatsappMetrics.upgradePlansBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

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
  content: { flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto', overflowY: 'auto' },
  periodoSelector: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  periodoButton: { padding: '10px 20px', backgroundColor: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s' },
  periodoButtonActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' },
  alertSection: { marginBottom: '24px' },
  alert: { padding: '16px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600' },
  alertDanger: { backgroundColor: '#fee2e2', color: '#991b1b', border: '2px solid #ef4444' },
  alertWarning: { backgroundColor: '#fef3c7', color: '#92400e', border: '2px solid #f59e0b' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' },
  metricCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '2px solid #e5e7eb' },
  metricHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  metricIcon: { fontSize: '24px' },
  metricTitle: { fontSize: '16px', fontWeight: '600', color: '#6b7280' },
  metricValue: { fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' },
  metricSubtext: { fontSize: '14px', color: '#9ca3af', marginTop: '8px' },
  progressBar: { width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', transition: 'width 0.3s ease' },
  section: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '16px' },
  tiposList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tipoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  tipoLabel: { flex: 1, fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  tipoCanal: { fontSize: '13px', color: '#6b7280', marginRight: '16px' },
  tipoCount: { fontSize: '18px', fontWeight: '700', color: '#3b82f6' },
  topList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  topItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  topRank: { fontSize: '20px', fontWeight: '700', color: '#f59e0b', minWidth: '40px' },
  topNombre: { flex: 1, fontSize: '15px', fontWeight: '600', color: '#1f2937' },
  topCount: { fontSize: '14px', color: '#6b7280' },
  chartContainer: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  barContainer: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  bar: { width: '100%', backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', minHeight: '2px', transition: 'height 0.3s ease' },
  barLabel: { fontSize: '11px', color: '#9ca3af', marginTop: '8px' },
  upgradeSection: { marginTop: '32px' },
  upgradeCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', backgroundColor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px' },
  upgradeIcon: { fontSize: '48px' },
  upgradeContent: { flex: 1 },
  upgradeTitle: { fontSize: '20px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' },
  upgradeText: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6' },
  upgradeButton: { padding: '12px 24px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}