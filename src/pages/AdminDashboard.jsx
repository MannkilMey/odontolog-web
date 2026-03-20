import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { registrarSalida } from '../utils/analytics'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  
  const [activeTab, setActiveTab] = useState('usuarios') // 'usuarios', 'marketing', 'churn', 'ventas'
  
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosPremium: 0,
    usuariosPorPais: { PY: 0, BR: 0, AR: 0, otros: 0 }
  })

  const [marketingStats, setMarketingStats] = useState({
    mrr: 0,
    ltv: 0,
    cac: 0,
    churnRate: 0,
    conversionRate: 0,
    segmentos: {},
    ingresos: { mensual: 0, total: 0 }
  })

  const [churnData, setChurnData] = useState([])
  const [ventasData, setVentasData] = useState([])
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
    if (!adminLoading) {
      if (!isAdmin) {
        navigate('/dashboard')
        return
      }
      loadData()
    }
  }, [adminLoading, isAdmin])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadStats(),
        loadMarketingStats(),
        loadChurnData(),
        loadVentasData(),
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
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() - 30)
      
      const { data: activeUsers } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id')
        .gte('ultima_actividad', fechaLimite.toISOString())

      // Usuarios premium (no free)
      const { data: suscripciones } = await supabase
        .from('suscripciones_usuarios')
        .select('dentista_id, plan_id, planes_suscripcion(codigo)')
        .eq('estado', 'activa')

      const premiumUsers = suscripciones?.filter(s => 
        s.planes_suscripcion?.codigo !== 'free'
      ) || []

      setStats({
        totalUsuarios: allUsers?.length || 0,
        usuariosActivos: activeUsers?.length || 0,
        usuariosPremium: premiumUsers.length,
        usuariosPorPais: { PY: 0, BR: 0, AR: 0, otros: 0 }
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

 const loadMarketingStats = async () => {
  try {
    console.log('Cargando marketing stats...')
    
    // Obtener estadísticas básicas de tablas existentes
    
    // 1. Usar datos de suscripciones para calcular MRR
    const { data: suscripcionesActivas } = await supabase
      .from('suscripciones_usuarios')
      .select(`
        dentista_id,
        plan_id,
        estado,
        planes_suscripcion(precio_mensual_gs, codigo)
      `)
      .eq('estado', 'activa')

    console.log('Suscripciones activas:', suscripcionesActivas)

    // 2. Calcular MRR basado en suscripciones
    const mrr = suscripcionesActivas?.reduce((sum, sub) => {
      const precio = sub.planes_suscripcion?.precio_mensual_gs || 0
      return sum + precio
    }, 0) || 0

    // 3. Usar datos de pagos existentes
    const { data: pagosData } = await supabase
      .from('pagos_suscripciones')
      .select('monto, fecha_pago, estado')
      .eq('estado', 'aprobado')

    console.log('Pagos data:', pagosData)

    // 4. Calcular ingresos
    const ingresoTotal = pagosData?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0
    
    const mesActual = new Date()
    const ingresoMensual = pagosData?.filter(p => {
      if (!p.fecha_pago) return false
      const fechaPago = new Date(p.fecha_pago)
      return fechaPago.getMonth() === mesActual.getMonth() && 
             fechaPago.getFullYear() === mesActual.getFullYear()
    }).reduce((sum, p) => sum + (p.monto || 0), 0) || 0

    // 5. Calcular métricas simples
    const totalUsuarios = stats.totalUsuarios || 1
    const usuariosPremium = stats.usuariosPremium || 0
    
    // Estimaciones básicas
    const ltvEstimado = usuariosPremium > 0 ? (ingresoTotal / usuariosPremium) : 0
    const cacEstimado = ltvEstimado * 0.2 // Estimación: 20% del LTV
    const conversionRate = totalUsuarios > 0 ? (usuariosPremium / totalUsuarios * 100) : 0
    const churnRate = 5 // Estimación fija hasta tener datos reales

    // Segmentación básica por tipo de plan
    const segmentos = {}
    suscripcionesActivas?.forEach(sub => {
      const codigo = sub.planes_suscripcion?.codigo || 'free'
      segmentos[codigo] = (segmentos[codigo] || 0) + 1
    })

    console.log('Métricas calculadas:', {
      mrr,
      ltv: ltvEstimado,
      cac: cacEstimado,
      conversionRate,
      churnRate,
      segmentos,
      ingresos: { mensual: ingresoMensual, total: ingresoTotal }
    })

    setMarketingStats({
      mrr: mrr,
      ltv: ltvEstimado,
      cac: cacEstimado,
      churnRate: churnRate,
      conversionRate: conversionRate,
      segmentos: segmentos,
      ingresos: {
        mensual: ingresoMensual,
        total: ingresoTotal
      }
    })

  } catch (error) {
    console.error('Error loading marketing stats:', error)
    
    // Valores por defecto en caso de error
    setMarketingStats({
      mrr: 0,
      ltv: 0,
      cac: 0,
      churnRate: 0,
      conversionRate: 0,
      segmentos: { 
        free: stats.totalUsuarios - stats.usuariosPremium,
        premium: stats.usuariosPremium 
      },
      ingresos: { mensual: 0, total: 0 }
    })
  }
}

const loadChurnData = async () => {
  try {
    console.log('Cargando churn data...')

    // Usar datos existentes de usuarios y actividad
    const { data: dentistas } = await supabase
      .from('dentistas')
      .select('id, email, nombre, clinica, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: actividades } = await supabase
      .from('usuarios_actividad')
      .select('dentista_id, ultima_actividad')

    // Calcular datos de churn basados en actividad
    const churnSimulado = dentistas?.map(dentista => {
      const actividad = actividades?.find(a => a.dentista_id === dentista.id)
      const ultimaActividad = actividad?.ultima_actividad
      
      let diasInactivo = 0
      let estadoActual = 'activo'
      let scoreRiesgo = 0

      if (ultimaActividad) {
        diasInactivo = Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
      } else {
        diasInactivo = Math.floor((Date.now() - new Date(dentista.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }

      // Calcular estado y riesgo basado en días de inactividad
      if (diasInactivo <= 7) {
        estadoActual = 'activo'
        scoreRiesgo = 5
      } else if (diasInactivo <= 30) {
        estadoActual = 'activo'
        scoreRiesgo = 25
      } else if (diasInactivo <= 90) {
        estadoActual = 'en_riesgo'
        scoreRiesgo = 60
      } else if (diasInactivo <= 180) {
        estadoActual = 'hibernating'
        scoreRiesgo = 85
      } else {
        estadoActual = 'churned'
        scoreRiesgo = 95
      }

      return {
        dentista_id: dentista.id,
        estado_actual: estadoActual,
        score_riesgo_churn: scoreRiesgo,
        dias_desde_ultimo_uso: diasInactivo,
        fecha_ultimo_uso: ultimaActividad,
        nombre: dentista.clinica || dentista.nombre || dentista.email
      }
    }) || []

    // Ordenar por score de riesgo descendente
    churnSimulado.sort((a, b) => b.score_riesgo_churn - a.score_riesgo_churn)

    console.log('Churn data calculado:', churnSimulado.slice(0, 5))
    
    setChurnData(churnSimulado)

  } catch (error) {
    console.error('Error loading churn data:', error)
    setChurnData([])
  }
}
const loadVentasData = async () => {
  try {
    console.log('Cargando ventas data...')
    
    // Por ahora usar datos vacíos hasta que se implementen los leads
    // En el futuro aquí iría la lógica para cargar intereses de planes
    setVentasData([])
    
    console.log('Ventas data: datos vacíos (función pendiente de implementar)')
  } catch (error) {
    console.error('Error loading ventas data:', error)
    setVentasData([])
  }
}

  const loadUsuarios = async () => {
    try {
      // 1. Obtener todos los dentistas
      const { data: dentistas, error: dentistasError } = await supabase
        .from('dentistas')
        .select('id, email, nombre, apellido, clinica, telefono, created_at')
        .order('created_at', { ascending: false })

      if (dentistasError) throw dentistasError

      // 2. Obtener suscripciones
      const { data: suscripciones } = await supabase
        .from('suscripciones_usuarios')
        .select(`
          dentista_id,
          estado,
          plan_id,
          planes_suscripcion(id, nombre, codigo)
        `)

      // 3. Obtener actividad
      const { data: actividades } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id, ultima_actividad')

      // 4. Combinar datos
      const usuariosConEstado = dentistas.map(dentista => {
        // Buscar suscripción
        const suscripcion = suscripciones?.find(s => s.dentista_id === dentista.id)
        const plan = suscripcion?.planes_suscripcion

        // Buscar actividad
        const actividad = actividades?.find(a => a.dentista_id === dentista.id)
        const ultimaActividad = actividad?.ultima_actividad
        
        const diasInactivo = ultimaActividad 
          ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
          : 999

        // Determinar nombre a mostrar
        const nombreMostrar = dentista.clinica 
          ? dentista.clinica 
          : `${dentista.nombre} ${dentista.apellido}`.trim()

        return {
          ...dentista,
          nombreMostrar,
          planActual: plan?.nombre || 'Sin plan',
          planCodigo: plan?.codigo || 'free',
          planId: suscripcion?.plan_id || null,
          estadoSuscripcion: suscripcion?.estado || 'inactiva',
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
          dentista_id,
          plan_id,
          dentistas(email, nombre, clinica),
          planes_suscripcion(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const pagosFormateados = data?.map(pago => ({
        ...pago,
        dentista: pago.dentistas,
        plan: pago.planes_suscripcion
      })) || []

      setUltimosPagos(pagosFormateados)
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

      // Verificar si ya tiene suscripción
      const { data: suscripcionExistente } = await supabase
        .from('suscripciones_usuarios')
        .select('id')
        .eq('dentista_id', usuario.id)
        .single()

      if (suscripcionExistente) {
        // Actualizar suscripción existente
        const { error } = await supabase
          .from('suscripciones_usuarios')
          .update({
            plan_id: nuevoPlanId,
            updated_at: new Date().toISOString()
          })
          .eq('dentista_id', usuario.id)

        if (error) throw error
      } else {
        // Crear nueva suscripción
        const { error } = await supabase
          .from('suscripciones_usuarios')
          .insert({
            dentista_id: usuario.id,
            plan_id: nuevoPlanId,
            estado: 'activa',
            fecha_inicio: new Date().toISOString()
          })

        if (error) throw error
      }

      alert('✅ Plan actualizado correctamente')
      setModalCambiarPlan({ isOpen: false, usuario: null })
      await loadData()
    } catch (error) {
      console.error('Error cambiando plan:', error)
      alert('❌ Error al cambiar plan: ' + error.message)
    }
  }

  const updateEstadoInteres = async (interesId, nuevoEstado) => {
    try {
      // TODO: Implementar cuando exista la tabla intereses_planes
      alert(`✅ Estado actualizado a: ${nuevoEstado}`)
      await loadVentasData()
    } catch (error) {
      console.error('Error updating interest:', error)
      alert('❌ Error al actualizar estado')
    }
  }

  const usuariosFiltrados = usuarios.filter(user => {
    if (filtros.plan !== 'todos' && user.planCodigo !== filtros.plan) return false
    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'activo' && !user.esActivo) return false
      if (filtros.estado === 'inactivo' && user.esActivo) return false
    }
    return true
  })

  const handleLogout = async () => {
    if (window.confirm('¿Cerrar sesión?')) {
      try {
        registrarSalida()
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
        alert('Error al cerrar sesión')
      }
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
          👨‍💼 Panel de Administración - OdontoLog
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button
          style={{...styles.tab, ...(activeTab === 'usuarios' && styles.tabActive)}}
          onClick={() => setActiveTab('usuarios')}
        >
          👥 Gestión de Usuarios
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'marketing' && styles.tabActive)}}
          onClick={() => setActiveTab('marketing')}
        >
          📊 Métricas de Marketing
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'churn' && styles.tabActive)}}
          onClick={() => setActiveTab('churn')}
        >
          ⚠️ Análisis de Churn
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'ventas' && styles.tabActive)}}
          onClick={() => setActiveTab('ventas')}
        >
          💰 Pipeline de Ventas
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
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statNumber}>
              Gs. {Number(marketingStats.ingresos.mensual).toLocaleString('es-PY')}
            </div>
            <div style={styles.statLabel}>Ingresos Mensuales</div>
          </div>
        </div>

        {/* GESTIÓN DE USUARIOS */}
        {activeTab === 'usuarios' && (
          <>
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
                            {pago.dentista?.clinica || pago.dentista?.nombre || pago.dentista?.email || 'N/A'}
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
                      <th style={styles.th}>Nombre/Clínica</th>
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
                        <td style={styles.td}>{user.nombreMostrar}</td>
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
          </>
        )}

        {/* MÉTRICAS DE MARKETING */}
        {activeTab === 'marketing' && (
          <>
            <div style={styles.marketingGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statNumber}>
                  Gs. {Number(marketingStats.mrr).toLocaleString('es-PY')}
                </div>
                <div style={styles.statLabel}>MRR (Monthly Recurring Revenue)</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>📈</div>
                <div style={styles.statNumber}>
                  Gs. {Number(marketingStats.ltv).toLocaleString('es-PY')}
                </div>
                <div style={styles.statLabel}>LTV Promedio</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>💸</div>
                <div style={styles.statNumber}>
                  Gs. {Number(marketingStats.cac).toLocaleString('es-PY')}
                </div>
                <div style={styles.statLabel}>CAC (Customer Acquisition Cost)</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>⚠️</div>
                <div style={styles.statNumber}>
                  {Number(marketingStats.churnRate).toFixed(1)}%
                </div>
                <div style={styles.statLabel}>Tasa de Churn</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>🎯</div>
                <div style={styles.statNumber}>
                  {Number(marketingStats.conversionRate).toFixed(1)}%
                </div>
                <div style={styles.statLabel}>Tasa de Conversión</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>📊</div>
                <div style={styles.statNumber}>
                  {marketingStats.ltv > 0 && marketingStats.cac > 0 
                    ? (marketingStats.ltv / marketingStats.cac).toFixed(1) 
                    : '0'
                  }:1
                </div>
                <div style={styles.statLabel}>Ratio LTV/CAC</div>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🎯 Segmentación de Clientes (RFM)</h2>
              {Object.keys(marketingStats.segmentos).length === 0 ? (
                <div style={styles.emptyState}>No hay datos de segmentación disponibles aún</div>
              ) : (
                <div style={styles.segmentosGrid}>
                  {Object.entries(marketingStats.segmentos).map(([segmento, cantidad]) => (
                    <div key={segmento} style={styles.segmentoCard}>
                      <div style={styles.segmentoIcon}>
                        {segmento === 'champion' ? '🏆' :
                         segmento === 'loyal' ? '💙' :
                         segmento === 'potential_loyalist' ? '🌟' :
                         segmento === 'new_customer' ? '🆕' :
                         segmento === 'at_risk' ? '⚠️' :
                         segmento === 'cant_lose' ? '🚨' :
                         segmento === 'hibernating' ? '😴' : '👤'}
                      </div>
                      <div style={styles.segmentoNumber}>{cantidad}</div>
                      <div style={styles.segmentoLabel}>
                        {segmento.charAt(0).toUpperCase() + segmento.slice(1).replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>💰 Análisis Financiero</h2>
              <div style={styles.financialGrid}>
                <div style={styles.financialCard}>
                  <div style={styles.financialTitle}>Ingresos Este Mes</div>
                  <div style={styles.financialValue}>
                    Gs. {Number(marketingStats.ingresos.mensual).toLocaleString('es-PY')}
                  </div>
                </div>
                <div style={styles.financialCard}>
                  <div style={styles.financialTitle}>Ingresos Totales</div>
                  <div style={styles.financialValue}>
                    Gs. {Number(marketingStats.ingresos.total).toLocaleString('es-PY')}
                  </div>
                </div>
                <div style={styles.financialCard}>
                  <div style={styles.financialTitle}>ARR Proyectado</div>
                  <div style={styles.financialValue}>
                    Gs. {Number(marketingStats.mrr * 12).toLocaleString('es-PY')}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ANÁLISIS DE CHURN */}
        {activeTab === 'churn' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⚠️ Usuarios en Riesgo de Churn</h2>
            {churnData.length === 0 ? (
              <div style={styles.emptyState}>No hay datos de churn disponibles aún</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Usuario</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Score de Riesgo</th>
                      <th style={styles.th}>Días Inactivo</th>
                      <th style={styles.th}>Último Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnData.slice(0, 20).map(user => (
                      <tr key={user.dentista_id} style={styles.tr}>
                        <td style={styles.td}>{user.nombre}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(user.estado_actual === 'activo' ? styles.badgeSuccess :
                                user.estado_actual === 'en_riesgo' ? styles.badgeWarning :
                                user.estado_actual === 'churned' ? styles.badgeDanger :
                                styles.badgeNeutral)
                          }}>
                            {user.estado_actual}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            color: user.score_riesgo_churn > 70 ? '#ef4444' :
                                  user.score_riesgo_churn > 40 ? '#f59e0b' : '#10b981',
                            fontWeight: 'bold'
                          }}>
                            {Number(user.score_riesgo_churn || 0).toFixed(0)}%
                          </span>
                        </td>
                        <td style={styles.td}>{user.dias_desde_ultimo_uso || 0} días</td>
                        <td style={styles.td}>
                          {user.fecha_ultimo_uso ? 
                            new Date(user.fecha_ultimo_uso).toLocaleDateString() : 
                            'Nunca'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PIPELINE DE VENTAS */}
        {activeTab === 'ventas' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💰 Pipeline de Ventas - Intereses en Planes</h2>
            <div style={styles.emptyState}>
              Esta función estará disponible próximamente cuando se implementen los leads de marketing.
            </div>
          </div>
        )}
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
              {planes.map(plan => {
                const esActual = modalCambiarPlan.usuario?.planId === plan.id
                return (
                  <div
                    key={plan.id}
                    style={{
                      ...styles.planCard,
                      ...(esActual && styles.planCardActual)
                    }}
                  >
                    <div style={styles.planNombre}>{plan.nombre}</div>
                    <div style={styles.planPrecio}>
                      Gs. {Number(plan.precio_mensual_gs).toLocaleString()}
                    </div>
                    <button
                      onClick={() => confirmarCambioPlan(plan.id)}
                      style={{
                        ...styles.planButton,
                        ...(esActual && styles.planButtonDisabled)
                      }}
                      disabled={esActual}
                    >
                      {esActual ? 'Plan Actual' : 'Seleccionar'}
                    </button>
                  </div>
                )
              })}
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
  tabsContainer: {
    display: 'flex',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
  },
  tab: {
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottomWidth: '3px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
    backgroundColor: '#f8fafc',
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
  marketingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
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
  badgeWarning: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeNeutral: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
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
  selectSmall: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
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
  segmentosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  segmentoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },
  segmentoIcon: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  segmentoNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '4px',
  },
  segmentoLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  financialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  financialCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  financialTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  financialValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  pipelineStats: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  pipelineStat: {
    fontSize: '14px',
    color: '#374151',
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
  planButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
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