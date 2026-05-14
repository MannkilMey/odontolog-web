import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useMoneda } from '../hooks/useMoneda'

export default function TimelineUnificadoScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  const [loading, setLoading] = useState(true)
  const [paciente, setPaciente] = useState(location.state?.paciente || null)
  const [eventos, setEventos] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')

  // Wrapper que devuelve vacío si no hay valor (para montos opcionales)
  const fmt = (value) => value ? formatMoney(value) : ''

  const tiposEvento = [
    { value: 'todos',         label: t('timeline.filterAll'),          icon: '📊', color: '#6b7280' },
    { value: 'procedimiento', label: t('timeline.filterProcedures'),   icon: '🦷', color: '#3b82f6' },
    { value: 'cita',          label: t('timeline.filterAppointments'), icon: '📅', color: '#8b5cf6' },
    { value: 'pago',          label: t('timeline.filterPayments'),     icon: '💰', color: '#10b981' },
    { value: 'presupuesto',   label: t('timeline.filterBudgets'),      icon: '📄', color: '#f59e0b' },
    { value: 'plan',          label: t('timeline.filterPlans'),        icon: '📋', color: '#06b6d4' },
  ]

  useEffect(() => {
    if (!paciente) {
      loadPaciente()
    } else {
      loadEventos()
    }
  }, [id])

  const loadPaciente = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes').select('*').eq('id', id).single()
      if (error) throw error
      setPaciente(data)
      loadEventos()
    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('nav.patients') }))
      navigate('/clientes')
    }
  }

  const loadEventos = async () => {
    try {
      setLoading(true)
      await supabase.auth.getUser()

      const { data: procedimientos } = await supabase
        .from('procedimientos_dentales')
        .select('*, catalogo_procedimientos (nombre_procedimiento, categoria)')
        .eq('paciente_id', id)

      const { data: citas } = await supabase
        .from('citas').select('*').eq('paciente_id', id)

      const { data: pagos } = await supabase
        .from('pagos_pacientes').select('*').eq('paciente_id', id)

      const { data: presupuestos } = await supabase
        .from('presupuestos').select('*').eq('paciente_id', id)

      const { data: planes } = await supabase
        .from('planes_pago').select('*').eq('paciente_id', id)

      const todosEventos = []

      procedimientos?.forEach(proc => {
        todosEventos.push({
          id: proc.id,
          tipo: 'procedimiento',
          fecha: proc.fecha_procedimiento,
          titulo: proc.catalogo_procedimientos?.nombre_procedimiento || proc.procedimiento || t('timeline.unnamedProcedure'),
          descripcion: proc.descripcion,
          detalle: t('timeline.procedureDetail', { tooth: proc.numero_diente || 'N/A', estado: proc.estado }),
          monto: proc.precio_final || proc.costo,
          icon: '🦷',
          color: '#3b82f6',
          data: proc
        })
      })

      citas?.forEach(cita => {
        const estadoIcons = {
          pendiente: '🟡', confirmada: '🔵', en_proceso: '🟣',
          completada: '🟢', cancelada: '🔴', no_asistio: '⚫'
        }
        todosEventos.push({
          id: cita.id,
          tipo: 'cita',
          fecha: cita.fecha_cita,
          titulo: cita.motivo,
          descripcion: cita.notas,
          detalle: `${cita.hora_inicio?.slice(0, 5)} - ${cita.hora_fin?.slice(0, 5)} • ${cita.estado}`,
          icon: estadoIcons[cita.estado] || '📅',
          color: '#8b5cf6',
          data: cita
        })
      })

      pagos?.forEach(pago => {
        todosEventos.push({
          id: pago.id,
          tipo: 'pago',
          fecha: pago.fecha_pago,
          titulo: t('timeline.paymentTitle', { number: pago.numero_recibo }),
          descripcion: pago.concepto,
          detalle: `${pago.metodo_pago} • ${pago.notas || ''}`,
          monto: pago.monto,
          icon: '💰',
          color: '#10b981',
          data: pago
        })
      })

      presupuestos?.forEach(pres => {
        todosEventos.push({
          id: pres.id,
          tipo: 'presupuesto',
          fecha: pres.fecha_emision,
          titulo: t('timeline.budgetTitle', { number: pres.numero_presupuesto }),
          descripcion: pres.notas,
          detalle: t('timeline.budgetDetail', { estado: pres.estado, date: pres.fecha_vencimiento || 'N/A' }),
          monto: pres.total,
          icon: '📄',
          color: '#f59e0b',
          data: pres
        })
      })

      planes?.forEach(plan => {
        todosEventos.push({
          id: plan.id,
          tipo: 'plan',
          fecha: plan.created_at,
          titulo: t('timeline.planTitle', { number: plan.numero_plan }),
          descripcion: plan.descripcion,
          detalle: t('timeline.planDetail', { paid: plan.cuotas_pagadas, total: plan.cantidad_cuotas, estado: plan.estado }),
          monto: plan.monto_total,
          icon: '📋',
          color: '#06b6d4',
          data: plan
        })
      })

      todosEventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      setEventos(todosEventos)

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('timeline.titlePlain') }))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const handleEventClick = (evento) => {
    switch (evento.tipo) {
      case 'cita':        navigate(`/cita/${evento.id}`); break
      case 'plan':        navigate(`/plan-pago/${evento.id}`, { state: { paciente } }); break
      case 'procedimiento':
      case 'pago':
      case 'presupuesto': navigate(`/paciente/${id}`); break
      default:            break
    }
  }

  const eventosFiltrados = filtroTipo === 'todos'
    ? eventos
    : eventos.filter(e => e.tipo === filtroTipo)

  const eventosPorFecha = {}
  eventosFiltrados.forEach(evento => {
    const fecha = evento.fecha
    if (!eventosPorFecha[fecha]) eventosPorFecha[fecha] = []
    eventosPorFecha[fecha].push(evento)
  })

  const stats = {
    total:          eventos.length,
    procedimientos: eventos.filter(e => e.tipo === 'procedimiento').length,
    citas:          eventos.filter(e => e.tipo === 'cita').length,
    pagos:          eventos.filter(e => e.tipo === 'pago').length,
    totalPagado:    eventos.filter(e => e.tipo === 'pago').reduce((sum, e) => sum + Number(e.monto || 0), 0)
  }

  if (!paciente) {
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
        <button onClick={() => navigate(`/paciente/${id}`)} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('timeline.title')}</div>
          <div style={styles.subtitle}>{paciente.nombre} {paciente.apellido}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Paciente */}
        <div style={styles.patientCard}>
          <div style={styles.patientAvatar}>
            {paciente.nombre.charAt(0)}{paciente.apellido.charAt(0)}
          </div>
          <div style={styles.patientInfo}>
            <div style={styles.patientName}>{paciente.nombre} {paciente.apellido}</div>
            <div style={styles.patientContact}>
              {paciente.telefono && `📱 ${paciente.telefono}`}
              {paciente.email && ` • ✉️ ${paciente.email}`}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>{t('timeline.statTotal')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.procedimientos}</div>
            <div style={styles.statLabel}>{t('timeline.statProcedures')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.citas}</div>
            <div style={styles.statLabel}>{t('timeline.statAppointments')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.pagos}</div>
            <div style={styles.statLabel}>{t('timeline.statPayments')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{fmt(stats.totalPagado)}</div>
            <div style={styles.statLabel}>{t('timeline.statTotalPaid')}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtersContainer}>
          {tiposEvento.map(tipo => (
            <button
              key={tipo.value}
              style={{
                ...styles.filterButton,
                ...(filtroTipo === tipo.value && {
                  backgroundColor: tipo.color,
                  color: '#ffffff',
                  borderColor: tipo.color
                })
              }}
              onClick={() => setFiltroTipo(tipo.value)}
            >
              {tipo.icon} {tipo.label}
              {tipo.value !== 'todos' && (
                <span style={styles.filterCount}>
                  {eventos.filter(e => e.tipo === tipo.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div style={styles.loadingCard}>
            <div>{t('timeline.loadingEvents')}</div>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyText}>
              {filtroTipo === 'todos'
                ? t('timeline.emptyAll')
                : t('timeline.emptyFiltered', {
                    tipo: tiposEvento.find(tp => tp.value === filtroTipo)?.label
                  })
              }
            </div>
          </div>
        ) : (
          <div style={styles.timeline}>
            {Object.keys(eventosPorFecha).map((fecha, idx) => (
              <div key={idx} style={styles.timelineDay}>
                <div style={styles.timelineDateHeader}>
                  📅 {formatDate(fecha)}
                  <span style={styles.timelineEventCount}>
                    {t('timeline.eventCount', { count: eventosPorFecha[fecha].length })}
                  </span>
                </div>

                <div style={styles.timelineEvents}>
                  {eventosPorFecha[fecha].map((evento, eventIdx) => (
                    <div
                      key={eventIdx}
                      style={{ ...styles.eventCard, borderLeftColor: evento.color, cursor: 'pointer' }}
                      onClick={() => handleEventClick(evento)}
                    >
                      <div style={styles.eventHeader}>
                        <div style={styles.eventIcon}>{evento.icon}</div>
                        <div style={styles.eventTitle}>{evento.titulo}</div>
                        {evento.monto && (
                          <div style={{
                            ...styles.eventMonto,
                            color: evento.tipo === 'pago' ? '#10b981' : '#6b7280'
                          }}>
                            {fmt(evento.monto)}
                          </div>
                        )}
                      </div>

                      {evento.detalle && (
                        <div style={styles.eventDetalle}>{evento.detalle}</div>
                      )}

                      {evento.descripcion && (
                        <div style={styles.eventDescripcion}>{evento.descripcion}</div>
                      )}

                      <div style={styles.eventFooter}>
                        <span style={{ ...styles.eventTipo, backgroundColor: evento.color }}>
                          {tiposEvento.find(tp => tp.value === evento.tipo)?.label}
                        </span>
                        <span style={styles.eventClickHint}>
                          {t('timeline.viewDetails')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
  content: { flex: 1, padding: '24px', overflowY: 'auto', maxWidth: '1200px', width: '100%', margin: '0 auto' },
  patientCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '2px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '16px' },
  patientAvatar: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#1e40af', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' },
  patientContact: { fontSize: '13px', color: '#6b7280' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', textAlign: 'center' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  filtersContainer: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  filterButton: { padding: '8px 16px', backgroundColor: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  filterCount: { backgroundColor: 'rgba(255, 255, 255, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' },
  loadingCard: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '2px dashed #e5e7eb' },
  emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '2px dashed #e5e7eb' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  emptyText: { fontSize: '16px', color: '#6b7280' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '24px' },
  timelineDay: { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
  timelineDateHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '16px', fontWeight: '700', color: '#1f2937' },
  timelineEventCount: { fontSize: '12px', color: '#6b7280', fontWeight: '500' },
  timelineEvents: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  eventCard: { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', borderLeft: '4px solid', transition: 'all 0.2s' },
  eventHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  eventIcon: { fontSize: '24px' },
  eventTitle: { flex: 1, fontSize: '16px', fontWeight: '700', color: '#1f2937' },
  eventMonto: { fontSize: '16px', fontWeight: '700' },
  eventDetalle: { fontSize: '13px', color: '#6b7280', marginBottom: '8px' },
  eventDescripcion: { fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '12px' },
  eventFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventTipo: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: '#ffffff' },
  eventClickHint: { fontSize: '12px', color: '#3b82f6', fontWeight: '600' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}