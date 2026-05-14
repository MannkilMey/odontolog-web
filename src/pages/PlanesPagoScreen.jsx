import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useSuscripcion } from '../hooks/SuscripcionContext'
import { useMoneda } from '../hooks/useMoneda'

export default function PlanesPagoScreen() {
  const navigate = useNavigate()
  const { userProfile } = useSuscripcion()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    if (userProfile?.id) loadData()
  }, [userProfile?.id])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: planesData, error } = await supabase
        .from('planes_pago')
        .select(`
          *,
          pacientes ( id, nombre, apellido, telefono ),
          cuotas_plan_pago ( id, numero_cuota, monto_cuota, fecha_vencimiento, estado, fecha_pago )
        `)
        .eq('dentista_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const procesados = (planesData || []).map(plan => {
        const cuotas = plan.cuotas_plan_pago || []
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const pagadas   = cuotas.filter(c => c.estado === 'pagada')
        const pendientes = cuotas.filter(c => c.estado === 'pendiente')
        const vencidas   = pendientes.filter(c => new Date(c.fecha_vencimiento) < hoy)

        const proximaCuota = pendientes
          .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))[0]

        let diasAtraso = 0
        if (vencidas.length > 0) {
          const masAntigua = vencidas.reduce((oldest, c) =>
            new Date(c.fecha_vencimiento) < new Date(oldest.fecha_vencimiento) ? c : oldest
          )
          diasAtraso = Math.floor((hoy - new Date(masAntigua.fecha_vencimiento)) / 86400000)
        }

        const montoVencido = vencidas.reduce((sum, c) => sum + (c.monto_cuota || 0), 0)

        let estadoReal = plan.estado
        if (plan.estado === 'activo' && vencidas.length > 0) {
          estadoReal = 'vencido'
        }

        return {
          ...plan,
          cuotas,
          pagadas: pagadas.length,
          pendientes: pendientes.length,
          vencidasCount: vencidas.length,
          montoVencido,
          diasAtraso,
          proximaCuota,
          estadoReal,
          porcentaje: cuotas.length > 0
            ? Math.round((pagadas.length / cuotas.length) * 100)
            : 0
        }
      })

      setPlanes(procesados)
    } catch (error) {
      console.error('Error cargando planes:', error)
      alert(t('errors.loadError', { item: t('planesPago.titlePlural') }))
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha + 'T12:00:00').toLocaleDateString(i18n.language, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const planesFiltrados = planes.filter(p => {
    if (filtro === 'todos') return true
    if (filtro === 'vencido') return p.estadoReal === 'vencido'
    return p.estado === filtro
  })

  const stats = {
    total: planes.length,
    activos:     planes.filter(p => p.estado === 'activo').length,
    completados: planes.filter(p => p.estado === 'completado').length,
    conAtraso:   planes.filter(p => p.vencidasCount > 0).length,
    montoVencidoTotal:   planes.reduce((sum, p) => sum + p.montoVencido, 0),
    montoPendienteTotal: planes
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.monto_total - p.monto_pagado), 0),
  }

  const getEstadoColor = (estado) => {
    const colores = {
      activo: '#10b981', completado: '#3b82f6',
      vencido: '#ef4444', cancelado: '#6b7280',
    }
    return colores[estado] || '#6b7280'
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      activo:     t('planesPago.estadoActivo'),
      completado: t('planesPago.estadoCompletado'),
      vencido:    t('planesPago.estadoVencido'),
      cancelado:  t('planesPago.estadoCancelado'),
    }
    return labels[estado] || estado
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <div style={styles.loadingText}>{t('planesPago.loading')}</div>
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
          <div style={styles.title}>{t('planesPago.title')}</div>
          <div style={styles.subtitle}>{t('planesPago.subtitle', { count: planes.length })}</div>
        </div>
        <button onClick={loadData} style={styles.refreshBtn} title={t('common.refresh')}>🔄</button>
      </div>

      <div style={styles.content}>
        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.activos}</div>
            <div style={styles.statLabel}>{t('planesPago.statActive')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#ef4444'}}>{stats.conAtraso}</div>
            <div style={styles.statLabel}>{t('planesPago.statOverdue')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#3b82f6'}}>{stats.completados}</div>
            <div style={styles.statLabel}>{t('planesPago.statCompleted')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#ef4444', fontSize: '18px'}}>
              {formatMoney(stats.montoVencidoTotal)}
            </div>
            <div style={styles.statLabel}>{t('planesPago.statOverdueAmount')}</div>
          </div>
        </div>

        {/* Monto pendiente banner */}
        {stats.montoPendienteTotal > 0 && (
          <div style={styles.pendienteBanner}>
            <div style={styles.pendienteLabel}>{t('planesPago.totalPending')}</div>
            <div style={styles.pendienteMonto}>{formatMoney(stats.montoPendienteTotal)}</div>
          </div>
        )}

        {/* Filtros */}
        <div style={styles.filtrosContainer}>
          {[
            { key: 'todos',      label: t('planesPago.filterAll',       { count: planes.length }) },
            { key: 'activo',     label: t('planesPago.filterActive',    { count: stats.activos }) },
            { key: 'vencido',    label: t('planesPago.filterOverdue',   { count: stats.conAtraso }) },
            { key: 'completado', label: t('planesPago.filterCompleted', { count: stats.completados }) },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                ...styles.filtroBtn,
                ...(filtro === f.key ? styles.filtroBtnActivo : {})
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de planes */}
        {planesFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyTitle}>
              {filtro === 'todos'
                ? t('planesPago.emptyAll')
                : t('planesPago.emptyFiltered', { filtro: t('planesPago.filter_' + filtro) })}
            </div>
            <div style={styles.emptyText}>{t('planesPago.emptyText')}</div>
            <button onClick={() => navigate('/clientes')} style={styles.emptyButton}>
              👥 {t('planesPago.goToPatients')}
            </button>
          </div>
        ) : (
          <div style={styles.planesList}>
            {planesFiltrados.map(plan => (
              <div
                key={plan.id}
                style={{ ...styles.planCard, borderLeftColor: getEstadoColor(plan.estadoReal) }}
                onClick={() => navigate(`/plan-pago/${plan.id}`)}
              >
                {/* Encabezado */}
                <div style={styles.planHeader}>
                  <div style={styles.planHeaderLeft}>
                    <div style={styles.planPaciente}>
                      {plan.pacientes?.nombre} {plan.pacientes?.apellido}
                    </div>
                    <div style={styles.planNumero}>{plan.numero_plan}</div>
                  </div>
                  <div style={{
                    ...styles.planEstadoBadge,
                    backgroundColor: getEstadoColor(plan.estadoReal),
                  }}>
                    {getEstadoLabel(plan.estadoReal)}
                  </div>
                </div>

                {/* Descripción */}
                <div style={styles.planDescripcion}>{plan.descripcion}</div>

                {/* Progreso */}
                <div style={styles.progressSection}>
                  <div style={styles.progressInfo}>
                    <span style={styles.progressLabel}>
                      {t('planesPago.installmentsProgress', {
                        paid: plan.pagadas, total: plan.cantidad_cuotas
                      })}
                    </span>
                    <span style={styles.progressPorcentaje}>{plan.porcentaje}%</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${plan.porcentaje}%`,
                      backgroundColor: getEstadoColor(plan.estadoReal),
                    }} />
                  </div>
                </div>

                {/* Montos */}
                <div style={styles.planMontos}>
                  <div style={styles.planMonto}>
                    <div style={styles.montoLabel}>{t('common.total')}</div>
                    <div style={styles.montoValor}>{formatMoney(plan.monto_total)}</div>
                  </div>
                  <div style={styles.planMonto}>
                    <div style={styles.montoLabel}>{t('planesPago.montosPaid')}</div>
                    <div style={{...styles.montoValor, color: '#10b981'}}>
                      {formatMoney(plan.monto_pagado)}
                    </div>
                  </div>
                  <div style={styles.planMonto}>
                    <div style={styles.montoLabel}>{t('planesPago.montosPending')}</div>
                    <div style={{...styles.montoValor, color: '#f59e0b'}}>
                      {formatMoney(plan.monto_total - plan.monto_pagado)}
                    </div>
                  </div>
                </div>

                {/* Alerta atraso */}
                {plan.vencidasCount > 0 && (
                  <div style={styles.alertaAtraso}>
                    <div style={styles.alertaTexto}>
                      {t('planesPago.alertOverdue', {
                        count: plan.vencidasCount, days: plan.diasAtraso
                      })}
                    </div>
                    <div style={styles.alertaMonto}>
                      {t('planesPago.alertOverdueAmount', { amount: formatMoney(plan.montoVencido) })}
                    </div>
                  </div>
                )}

                {/* Próxima cuota */}
                {plan.proximaCuota && plan.estado === 'activo' && (
                  <div style={styles.proximaCuota}>
                    <span style={styles.proximaLabel}>{t('planesPago.nextDue')}</span>
                    <span style={styles.proximaFecha}>
                      {t('planesPago.nextDueDetail', {
                        number: plan.proximaCuota.numero_cuota,
                        date:   formatFecha(plan.proximaCuota.fecha_vencimiento),
                        amount: formatMoney(plan.proximaCuota.monto_cuota)
                      })}
                    </span>
                  </div>
                )}

                {/* Footer card */}
                <div style={styles.planFooter}>
                  <span style={styles.planFrecuencia}>📅 {plan.frecuencia}</span>
                  <span style={styles.planCuotaValor}>
                    {t('planesPago.installmentValue', { amount: formatMoney(plan.monto_cuota) })}
                  </span>
                  <span style={styles.planVerDetalle}>{t('planesPago.viewDetail')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          {t('common.footerBrand')} • {t('planesPago.titlePlural')}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: '#f8fafc' },
  loadingSpinner: { fontSize: '48px' },
  loadingText: { fontSize: '16px', color: '#6b7280' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  backButton: { padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '16px', fontWeight: '500', cursor: 'pointer' },
  headerInfo: { flex: 1, textAlign: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e40af' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  refreshBtn: { padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  content: { flex: 1, padding: '24px', maxWidth: '1100px', width: '100%', margin: '0 auto' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' },
  statCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statNumber: { fontSize: '28px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' },
  statLabel: { fontSize: '13px', color: '#6b7280', fontWeight: '500' },
  pendienteBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#fffbeb', border: '2px solid #fbbf24', borderRadius: '12px', marginBottom: '20px' },
  pendienteLabel: { fontSize: '15px', fontWeight: '600', color: '#92400e' },
  pendienteMonto: { fontSize: '22px', fontWeight: '700', color: '#b45309' },
  filtrosContainer: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  filtroBtn: { padding: '8px 16px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '500', color: '#6b7280', cursor: 'pointer' },
  filtroBtnActivo: { backgroundColor: '#1e40af', color: '#ffffff', borderColor: '#1e40af' },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  emptyTitle: { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' },
  emptyText: { fontSize: '14px', color: '#6b7280', marginBottom: '24px' },
  emptyButton: { padding: '12px 24px', backgroundColor: '#1e40af', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  planesList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  planCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', borderLeft: '4px solid', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  planHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  planHeaderLeft: { flex: 1 },
  planPaciente: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '2px' },
  planNumero: { fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' },
  planEstadoBadge: { padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#ffffff' },
  planDescripcion: { fontSize: '14px', color: '#6b7280', marginBottom: '16px', lineHeight: '1.4' },
  progressSection: { marginBottom: '16px' },
  progressInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  progressLabel: { fontSize: '13px', color: '#6b7280', fontWeight: '500' },
  progressPorcentaje: { fontSize: '13px', color: '#1f2937', fontWeight: '700' },
  progressBar: { height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  planMontos: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' },
  planMonto: { textAlign: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  montoLabel: { fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase' },
  montoValor: { fontSize: '15px', fontWeight: '700', color: '#1f2937' },
  alertaAtraso: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' },
  alertaTexto: { fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' },
  alertaMonto: { fontSize: '13px', color: '#b91c1c' },
  proximaCuota: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  proximaLabel: { fontSize: '12px', color: '#065f46', fontWeight: '600' },
  proximaFecha: { fontSize: '13px', color: '#047857' },
  planFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '8px' },
  planFrecuencia: { fontSize: '12px', color: '#9ca3af' },
  planCuotaValor: { fontSize: '12px', color: '#6b7280', fontWeight: '500' },
  planVerDetalle: { fontSize: '12px', color: '#3b82f6', fontWeight: '600' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}