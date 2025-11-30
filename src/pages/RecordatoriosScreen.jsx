import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RecordatoriosScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [stats, setStats] = useState({
    planesActivos: 0,
    cuotasAtrasadas: 0,
    proximasVencer: 0
  })
  const [ultimaEjecucion, setUltimaEjecucion] = useState(null)

  useEffect(() => {
    cargarEstadisticas()
    cargarUltimaEjecucion()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Planes activos
      const { data: planes, error: planesError } = await supabase
        .from('planes_pago')
        .select('*')
        .eq('dentista_id', user.id)
        .eq('estado', 'activo')

      if (planesError) throw planesError

      const planesActivos = planes || []
      let cuotasAtrasadas = 0
      let proximasVencer = 0

      const hoy = new Date()

      // Analizar cada plan
      for (const plan of planesActivos) {
        const fechaInicio = new Date(plan.fecha_inicio)
        const diasTranscurridos = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
        
        let cuotaActual = 0
        if (plan.frecuencia === 'semanal') {
          cuotaActual = Math.floor(diasTranscurridos / 7) + 1
        } else if (plan.frecuencia === 'quincenal') {
          cuotaActual = Math.floor(diasTranscurridos / 15) + 1
        } else if (plan.frecuencia === 'mensual') {
          cuotaActual = Math.floor(diasTranscurridos / 30) + 1
        }

        if (cuotaActual > plan.cantidad_cuotas) {
          cuotaActual = plan.cantidad_cuotas
        }

        const cuotasPagadas = Math.floor(plan.monto_pagado / plan.monto_cuota)

        // Cuotas atrasadas
        if (cuotasPagadas < cuotaActual - 1) {
          cuotasAtrasadas++
        }
        // Próximas a vencer
        else if (cuotasPagadas === cuotaActual - 1) {
          proximasVencer++
        }
      }

      setStats({
        planesActivos: planesActivos.length,
        cuotasAtrasadas,
        proximasVencer
      })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarUltimaEjecucion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Buscar último recordatorio automático
      const { data, error } = await supabase
        .from('mensajes_enviados')
        .select('fecha_enviado, metadata')
        .eq('dentista_id', user.id)
        .eq('tipo', 'recordatorio_cuota')
        .eq('metadata->>automatico', 'true')
        .order('fecha_enviado', { ascending: false })
        .limit(1)
        .single()

      if (data && !error) {
        setUltimaEjecucion(data.fecha_enviado)
      }

    } catch (error) {
      console.log('No hay ejecuciones previas')
    }
  }

  const ejecutarRecordatorios = async () => {
    if (!confirm('¿Desea ejecutar los recordatorios de cuotas ahora?\n\nSe enviarán emails y WhatsApp a los pacientes con cuotas atrasadas o próximas a vencer.')) {
      return
    }

    try {
      setEjecutando(true)
      setResultado(null)

      console.log('🔔 Ejecutando recordatorios...')

      // Llamar a la Edge Function
      const response = await fetch(
        'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/recordatorios-cuotas',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ejecutado_manualmente: true })
        }
      )

      if (!response.ok) {
        throw new Error('Error al ejecutar recordatorios')
      }

      const data = await response.json()
      console.log('Resultado:', data)

      setResultado(data)

      // Recargar estadísticas
      await cargarEstadisticas()
      await cargarUltimaEjecucion()

      alert(`✅ Recordatorios ejecutados exitosamente!\n\n• Enviados: ${data.recordatoriosEnviados}\n• Errores: ${data.errores}`)

    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al ejecutar recordatorios:\n' + error.message)
    } finally {
      setEjecutando(false)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>🔔 Recordatorios Automáticos</div>
          <div style={styles.subtitle}>Sistema de recordatorios de cuotas</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>ℹ️</div>
          <div style={styles.infoContent}>
            <div style={styles.infoTitle}>¿Cómo funcionan los recordatorios automáticos?</div>
            <div style={styles.infoText}>
              El sistema revisa diariamente los planes de pago activos y envía recordatorios automáticos por email y WhatsApp a los pacientes que tienen:
            </div>
            <ul style={styles.infoList}>
              <li>⚠️ <strong>Cuotas atrasadas:</strong> No han pagado cuotas vencidas</li>
              <li>🔔 <strong>Cuotas próximas a vencer:</strong> Tienen una cuota por pagar en los próximos 3 días</li>
            </ul>
            <div style={styles.infoText}>
              El cron job se ejecuta automáticamente todos los días a las <strong>8:00 AM</strong>.
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{stats.planesActivos}</div>
            <div style={styles.statLabel}>Planes Activos</div>
          </div>

          <div style={{...styles.statCard, borderColor: '#dc2626'}}>
            <div style={styles.statIcon}>⚠️</div>
            <div style={{...styles.statValue, color: '#dc2626'}}>{stats.cuotasAtrasadas}</div>
            <div style={styles.statLabel}>Cuotas Atrasadas</div>
          </div>

          <div style={{...styles.statCard, borderColor: '#f59e0b'}}>
            <div style={styles.statIcon}>🔔</div>
            <div style={{...styles.statValue, color: '#f59e0b'}}>{stats.proximasVencer}</div>
            <div style={styles.statLabel}>Próximas a Vencer</div>
          </div>
        </div>

        {/* Última Ejecución */}
        <div style={styles.ultimaEjecucionCard}>
          <div style={styles.ultimaEjecucionHeader}>
            <span style={styles.ultimaEjecucionIcon}>⏱️</span>
            <span style={styles.ultimaEjecucionTitle}>Última Ejecución Automática</span>
          </div>
          <div style={styles.ultimaEjecucionFecha}>
            {formatDateTime(ultimaEjecucion)}
          </div>
        </div>

        {/* Botón Ejecutar Manual */}
        <div style={styles.ejecutarSection}>
          <div style={styles.ejecutarCard}>
            <div style={styles.ejecutarHeader}>
              <div style={styles.ejecutarIcon}>🚀</div>
              <div>
                <div style={styles.ejecutarTitle}>Ejecutar Recordatorios Manualmente</div>
                <div style={styles.ejecutarSubtitle}>
                  Enviar recordatorios ahora sin esperar la ejecución automática
                </div>
              </div>
            </div>

            <button
              style={{
                ...styles.ejecutarButton,
                ...(ejecutando && styles.ejecutarButtonDisabled)
              }}
              onClick={ejecutarRecordatorios}
              disabled={ejecutando || loading}
            >
              {ejecutando ? (
                <>
                  <span style={styles.spinner}>⏳</span>
                  Ejecutando...
                </>
              ) : (
                <>
                  🔔 Ejecutar Recordatorios Ahora
                </>
              )}
            </button>

            {resultado && (
              <div style={styles.resultadoCard}>
                <div style={styles.resultadoTitle}>
                  ✅ Ejecución Completada
                </div>
                <div style={styles.resultadoStats}>
                  <div style={styles.resultadoStat}>
                    <span style={styles.resultadoLabel}>Recordatorios enviados:</span>
                    <span style={styles.resultadoValue}>{resultado.recordatoriosEnviados}</span>
                  </div>
                  <div style={styles.resultadoStat}>
                    <span style={styles.resultadoLabel}>Errores:</span>
                    <span style={{...styles.resultadoValue, color: resultado.errores > 0 ? '#dc2626' : '#059669'}}>
                      {resultado.errores}
                    </span>
                  </div>
                </div>
                <div style={styles.resultadoMensaje}>
                  {resultado.mensaje}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div style={styles.accionesCard}>
          <div style={styles.accionesTitle}>⚡ Acciones Rápidas</div>
          <div style={styles.accionesGrid}>
            <button
              style={styles.accionButton}
              onClick={() => navigate('/mensajes-enviados')}
            >
              <div style={styles.accionIcon}>📬</div>
              <div style={styles.accionLabel}>Ver Mensajes Enviados</div>
            </button>

            <button
              style={styles.accionButton}
              onClick={() => navigate('/planes-pago')}
            >
              <div style={styles.accionIcon}>💳</div>
              <div style={styles.accionLabel}>Ver Planes de Pago</div>
            </button>

            <button
              style={styles.accionButton}
              onClick={() => window.open('https://supabase.com/dashboard/project/fuwrayxwjldtawtsljro/functions', '_blank')}
            >
              <div style={styles.accionIcon}>⚙️</div>
              <div style={styles.accionLabel}>Ver Edge Functions</div>
            </button>
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
    fontSize: '24px',
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
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    gap: '20px',
  },
  infoIcon: {
    fontSize: '40px',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '12px',
  },
  infoText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  infoList: {
    margin: '12px 0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.8',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  ultimaEjecucionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  ultimaEjecucionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  ultimaEjecucionIcon: {
    fontSize: '24px',
  },
  ultimaEjecucionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  ultimaEjecucionFecha: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#3b82f6',
    paddingLeft: '36px',
  },
  ejecutarSection: {
    marginBottom: '24px',
  },
  ejecutarCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #3b82f6',
  },
  ejecutarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  ejecutarIcon: {
    fontSize: '48px',
  },
  ejecutarTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  ejecutarSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  ejecutarButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  ejecutarButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  resultadoCard: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    border: '1px solid #10b981',
  },
  resultadoTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '16px',
  },
  resultadoStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  resultadoStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultadoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  resultadoValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669',
  },
  resultadoMensaje: {
    fontSize: '14px',
    color: '#1f2937',
    fontStyle: 'italic',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #d1fae5',
  },
  accionesCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  accionesTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  accionesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  accionButton: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  accionIcon: {
    fontSize: '32px',
  },
  accionLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
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
}