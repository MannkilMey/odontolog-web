import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  console.log('🎯 AdminDashboard montado')
  console.log('🎯 isAdmin:', isAdmin)
  console.log('🎯 adminLoading:', adminLoading)
  
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosPremium: 0,
    usuariosPorPais: { PY: 0, BR: 0, AR: 0, otros: 0 }
  })
  const [usuarios, setUsuarios] = useState([])
  const [ultimosPagos, setUltimosPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    plan: 'todos',
    estado: 'todos',
    pais: 'todos'
  })
  const [modalCambiarPlan, setModalCambiarPlan] = useState({
    isOpen: false,
    usuario: null
  })
  const [planes, setPlanes] = useState([])

  useEffect(() => {
    console.log('🎯 useEffect AdminDashboard - adminLoading:', adminLoading, 'isAdmin:', isAdmin)
    
    if (!adminLoading) {
      if (!isAdmin) {
        console.log('❌ NO es admin, redirigiendo a /dashboard')
        navigate('/dashboard')
        return
      }
      console.log('✅ ES admin, cargando datos')
      loadData()
    }
  }, [adminLoading, isAdmin])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadStats(),
        loadUsuarios(),
        loadUltimosPagos(),
        loadPlanes()
      ])
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Total usuarios
      const { data: allUsers } = await supabase
        .from('dentistas')
        .select('id, created_at')
      
      // Usuarios con actividad reciente (últimos 30 días)
      const { data: activeUsers } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id')
        .gte('ultima_actividad', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Usuarios premium
      const { data: premiumUsers } = await supabase
        .from('suscripciones_usuarios')
        .select('dentista_id, plan:plan_id(codigo)')
        .eq('estado', 'activa')
        .in('plan.codigo', ['pro', 'enterprise'])

      

      setStats({
        totalUsuarios: allUsers?.length || 0,
        usuariosActivos: activeUsers?.length || 0,
        usuariosPremium: premiumUsers?.length || 0,
        usuariosPorPais: { PY: 0, BR: 0, AR: 0, otros: 0 }
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadUsuarios = async () => {
  try {
    const { data, error } = await supabase
      .from('dentistas')
      .select(`
        id,
        email,
        nombre,
        telefono,
        created_at,
        suscripcion:suscripciones_usuarios(
          id,
          estado,
          plan:plan_id(id, nombre, codigo)
        ),
        actividad:usuarios_actividad(
          ultima_actividad
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const usuariosConEstado = data.map(user => {
      const ultimaActividad = user.actividad?.[0]?.ultima_actividad
      const diasInactivo = ultimaActividad 
        ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      return {
        ...user,
        pais: '-', // ← VALOR POR DEFECTO
        planActual: user.suscripcion?.[0]?.plan?.nombre || 'Sin plan',
        planCodigo: user.suscripcion?.[0]?.plan?.codigo || 'free',
        estadoSuscripcion: user.suscripcion?.[0]?.estado || 'inactiva',
        diasInactivo: diasInactivo,
        esActivo: diasInactivo <= 30
      }
    })

    setUsuarios(usuariosConEstado)
  } catch (error) {
    console.error('Error loading usuarios:', error)
  }
}

  const loadUltimosPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos_suscripciones')
        .select(`
          id,
          monto,
          moneda,
          estado,
          fecha_pago,
          metodo_pago,
          dentista:dentista_id(email, nombre),
          plan:plan_id(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setUltimosPagos(data || [])
    } catch (error) {
      console.error('Error loading pagos:', error)
    }
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
      console.error('Error loading planes:', error)
    }
  }

  const handleCambiarPlan = (usuario) => {
    setModalCambiarPlan({
      isOpen: true,
      usuario: usuario
    })
  }

  const confirmarCambioPlan = async (nuevoPlanId) => {
    try {
      const usuario = modalCambiarPlan.usuario

      // Actualizar suscripción
      const { error } = await supabase
        .from('suscripciones_usuarios')
        .update({
          plan_id: nuevoPlanId,
          updated_at: new Date().toISOString()
        })
        .eq('dentista_id', usuario.id)

      if (error) throw error

      alert('✅ Plan actualizado correctamente')
      setModalCambiarPlan({ isOpen: false, usuario: null })
      await loadData()
    } catch (error) {
      console.error('Error cambiando plan:', error)
      alert('❌ Error al cambiar plan')
    }
  }

  const usuariosFiltrados = usuarios.filter(user => {
    if (filtros.plan !== 'todos' && user.planCodigo !== filtros.plan) return false
    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'activo' && !user.esActivo) return false
      if (filtros.estado === 'inactivo' && user.esActivo) return false
    }
    if (filtros.pais !== 'todos') {
      const paisUser = user.pais?.toUpperCase()
      if (filtros.pais === 'PY' && !(paisUser === 'PY' || paisUser === 'PARAGUAY')) return false
      if (filtros.pais === 'BR' && !(paisUser === 'BR' || paisUser === 'BRASIL' || paisUser === 'BRAZIL')) return false
      if (filtros.pais === 'AR' && !(paisUser === 'AR' || paisUser === 'ARGENTINA')) return false
    }
    return true
  })

  const handleLogout = async () => {
    if (window.confirm('¿Cerrar sesión?')) {
      await supabase.auth.signOut()
    }
  }

  if (adminLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando panel de administración...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          👨‍💼 Panel de Administración
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>

      <div style={styles.content}>
        {/* Métricas principales */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statNumber}>{stats.totalUsuarios}</div>
            <div style={styles.statLabel}>Usuarios Totales</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statNumber}>{stats.usuariosActivos}</div>
            <div style={styles.statLabel}>Usuarios Activos</div>
            <div style={styles.statSubtext}>(últimos 30 días)</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>
            <div style={styles.statNumber}>{stats.usuariosPremium}</div>
            <div style={styles.statLabel}>Usuarios Premium</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>🌎</div>
            <div style={styles.statLabel}>Por País</div>
            <div style={styles.paisesGrid}>
              <div>🇵🇾 PY: {stats.usuariosPorPais.PY}</div>
              <div>🇧🇷 BR: {stats.usuariosPorPais.BR}</div>
              <div>🇦🇷 AR: {stats.usuariosPorPais.AR}</div>
              <div>🌍 Otros: {stats.usuariosPorPais.otros}</div>
            </div>
          </div>
        </div>

        {/* 
        ═══════════════════════════════════════════════════════
        📊 SECCIÓN DE RENTABILIDAD (PREPARADA PARA EL FUTURO)
        ═══════════════════════════════════════════════════════
        
        Descomentar cuando estés listo para agregar análisis:
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Análisis de Rentabilidad</h2>
          <RentabilidadStats />
        </div>
        
        ═══════════════════════════════════════════════════════
        */}

        {/* Últimos pagos */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💳 Últimos Pagos Registrados</h2>
          {ultimosPagos.length === 0 ? (
            <div style={styles.emptyState}>No hay pagos registrados aún</div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Plan</th>
                    <th style={styles.th}>Monto</th>
                    <th style={styles.th}>Método</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPagos.map(pago => (
                    <tr key={pago.id} style={styles.tr}>
                      <td style={styles.td}>
                        {pago.dentista?.email || 'N/A'}
                      </td>
                      <td style={styles.td}>{pago.plan?.nombre || 'N/A'}</td>
                      <td style={styles.td}>
                        {pago.moneda === 'PYG' ? 'Gs.' : '$'} {Number(pago.monto).toLocaleString()}
                      </td>
                      <td style={styles.td}>{pago.metodo_pago || 'N/A'}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(pago.estado === 'aprobado' ? styles.badgeSuccess : styles.badgePending)
                        }}>
                          {pago.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gestión de usuarios */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Gestión de Usuarios</h2>
          
          {/* Filtros */}
          <div style={styles.filters}>
            <select 
              value={filtros.plan}
              onChange={(e) => setFiltros({...filtros, plan: e.target.value})}
              style={styles.select}
            >
              <option value="todos">Todos los planes</option>
              <option value="free">Gratuito</option>
              <option value="pro">Profesional</option>
              <option value="enterprise">Clínica</option>
            </select>

            <select 
              value={filtros.estado}
              onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              style={styles.select}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>

            <select 
              value={filtros.pais}
              onChange={(e) => setFiltros({...filtros, pais: e.target.value})}
              style={styles.select}
            >
              <option value="todos">Todos los países</option>
              <option value="PY">Paraguay</option>
              <option value="BR">Brasil</option>
              <option value="AR">Argentina</option>
            </select>

            <button onClick={loadData} style={styles.refreshButton}>
              🔄 Actualizar
            </button>
          </div>

          {/* Tabla de usuarios */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>País</th>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Días Inactivo</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(user => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.nombre || '-'}</td>
                    <td style={styles.td}>{user.pais || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.planBadge,
                        ...(user.planCodigo === 'free' ? styles.planFree : styles.planPremium)
                      }}>
                        {user.planActual}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        ...(user.esActivo ? styles.badgeSuccess : styles.badgeDanger)
                      }}>
                        {user.esActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {user.diasInactivo > 365 ? '+1 año' : `${user.diasInactivo} días`}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleCambiarPlan(user)}
                        style={styles.actionButton}
                      >
                        Cambiar Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.resultsCount}>
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
          </div>
        </div>
      </div>

      {/* Modal cambiar plan */}
      {modalCambiarPlan.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setModalCambiarPlan({ isOpen: false, usuario: null })}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Cambiar Plan de Usuario</h3>
            <p style={styles.modalSubtitle}>
              Usuario: <strong>{modalCambiarPlan.usuario?.email}</strong>
            </p>
            <p style={styles.modalSubtitle}>
              Plan actual: <strong>{modalCambiarPlan.usuario?.planActual}</strong>
            </p>

            <div style={styles.planesGrid}>
              {planes.map(plan => (
                <div
                  key={plan.id}
                  style={{
                    ...styles.planCard,
                    ...(modalCambiarPlan.usuario?.planActual === plan.nombre && styles.planCardActual)
                  }}
                >
                  <div style={styles.planNombre}>{plan.nombre}</div>
                  <div style={styles.planPrecio}>
                    Gs. {Number(plan.precio_mensual_gs).toLocaleString()}
                  </div>
                  <button
                    onClick={() => confirmarCambioPlan(plan.id)}
                    style={styles.planButton}
                    disabled={modalCambiarPlan.usuario?.planActual === plan.nombre}
                  >
                    {modalCambiarPlan.usuario?.planActual === plan.nombre ? 'Plan Actual' : 'Seleccionar'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setModalCambiarPlan({ isOpen: false, usuario: null })}
              style={styles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e5e7eb',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  statIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  paisesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '12px',
    fontSize: '14px',
    color: '#374151',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '16px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1f2937',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  planBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  planFree: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  planPremium: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resultsCount: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  planesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '24px',
    marginBottom: '24px',
  },
  planCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    cursor: 'pointer',
  },
  planCardActual: {
    border: '2px solid #10b981',
    backgroundColor: '#f0fdf4',
  },
  planNombre: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  planPrecio: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  planButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}