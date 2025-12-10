import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HistorialPagosScreen() {
  const [user, setUser] = useState(null)
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getProfile()
    loadPagos()
  }, [])

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos_suscripciones')
        .select(`
          *,
          plan:plan_id (nombre)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPagos(data || [])
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { color: '#f59e0b', text: '⏳ Pendiente' },
      aprobado: { color: '#10b981', text: '✓ Aprobado' },
      rechazado: { color: '#ef4444', text: '✗ Rechazado' },
      cancelado: { color: '#6b7280', text: '⊘ Cancelado' }
    }
    return badges[estado] || badges.pendiente
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/planes')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>💳 Historial de Pagos</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingText}>Cargando...</div>
        ) : pagos.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={styles.emptyText}>No tienes pagos registrados</div>
          </div>
        ) : (
          <div style={styles.pagosList}>
            {pagos.map((pago) => {
              const badge = getEstadoBadge(pago.estado)
              return (
                <div key={pago.id} style={styles.pagoCard}>
                  <div style={styles.pagoHeader}>
                    <div style={styles.pagoTitulo}>
                      {pago.plan?.nombre || 'Plan'}
                    </div>
                    <div style={{...styles.estadoBadge, backgroundColor: badge.color}}>
                      {badge.text}
                    </div>
                  </div>

                  <div style={styles.pagoInfo}>
                    <div style={styles.pagoRow}>
                      <span style={styles.pagoLabel}>Monto:</span>
                      <span style={styles.pagoValue}>
                        Gs. {Number(pago.monto).toLocaleString('es-PY')}
                      </span>
                    </div>
                    <div style={styles.pagoRow}>
                      <span style={styles.pagoLabel}>Período:</span>
                      <span style={styles.pagoValue}>
                        {new Date(pago.periodo_desde).toLocaleDateString()} - {new Date(pago.periodo_hasta).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.pagoRow}>
                      <span style={styles.pagoLabel}>Fecha de pago:</span>
                      <span style={styles.pagoValue}>
                        {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    {pago.metodo_pago && (
                      <div style={styles.pagoRow}>
                        <span style={styles.pagoLabel}>Método:</span>
                        <span style={styles.pagoValue}>{pago.metodo_pago}</span>
                      </div>
                    )}
                    {pago.referencia_externa && (
                      <div style={styles.pagoRow}>
                        <span style={styles.pagoLabel}>Referencia:</span>
                        <span style={styles.pagoValue}>{pago.referencia_externa}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    display: 'flex',
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
  content: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#6b7280',
  },
  pagosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  pagoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  pagoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  pagoTitulo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  estadoBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
  },
  pagoInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pagoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  pagoLabel: {
    color: '#6b7280',
  },
  pagoValue: {
    color: '#1f2937',
    fontWeight: '500',
  },
}