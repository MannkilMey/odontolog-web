import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { registrarSalida } from '../utils/analytics'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fuwrayxwjldtawtsljro.supabase.co'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  
  const [activeTab, setActiveTab] = useState('usuarios')
  
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosPremium: 0,
    usuariosPorPais: { PY: 0, BR: 0, AR: 0, otros: 0 }
  })

  const [marketingStats, setMarketingStats] = useState({
    mrr: 0, ltv: 0, cac: 0, churnRate: 0, conversionRate: 0,
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

  // ═══ PROSPECTS STATE ═══
  const [prospects, setProspects] = useState([])
  const [prospectsStats, setProspectsStats] = useState({
    total: 0, porPais: {}, conTelefono: 0, conWebsite: 0, conEmail: 0
  })
  const [prospectsLoading, setProspectsLoading] = useState(false)
  const [prospectsFiltros, setProspectsFiltros] = useState({
    pais: 'todos', busqueda: '', estado: 'todos'
  })
  const [prospectsPagina, setProspectsPagina] = useState(0)
  const PROSPECTS_POR_PAGINA = 50
  const [selectedProspects, setSelectedProspects] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // ═══ SEND MODAL STATE ═══
  const [sendModal, setSendModal] = useState({ isOpen: false, canal: null })
  const [sendingStatus, setSendingStatus] = useState({ sending: false, result: null })
  const [emailAsunto, setEmailAsunto] = useState('🦷 Optimice la gestión de su clínica dental con OdontoLog')

  // ═══ TRACKING STATE ═══
  const [trackingStats, setTrackingStats] = useState({
    enviados: 0, abiertos: 0, clicks: 0
  })

  // ═══ LIFECYCLE ═══
  useEffect(() => {
    if (!adminLoading) {
      if (!isAdmin) {
        navigate('/dashboard')
        return
      }
      loadData()
    }
  }, [adminLoading, isAdmin])

  // Lazy loading per tab
  useEffect(() => {
    if (loading) return
    if (activeTab === 'marketing') loadMarketingStats()
    if (activeTab === 'churn') loadChurnData()
    if (activeTab === 'ventas') loadVentasData()
    if (activeTab === 'prospects') {
      loadProspects()
      loadTrackingStats()
    }
  }, [activeTab, loading])

  // Reload prospects when filters change
  useEffect(() => {
    if (activeTab === 'prospects' && !loading) {
      loadProspectsPage()
    }
  }, [prospectsFiltros, prospectsPagina])

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

  // ═══════════════════════════════════════
  // LOAD STATS
  // ═══════════════════════════════════════
  const loadStats = async () => {
    try {
      const { data: allUsers } = await supabase
        .from('dentistas')
        .select('id, created_at')
      
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() - 30)
      
      const { data: activeUsers } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id')
        .gte('ultima_actividad', fechaLimite.toISOString())

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

  // ═══════════════════════════════════════
  // MARKETING STATS (USD)
  // ═══════════════════════════════════════
  const loadMarketingStats = async () => {
    try {
      const { data: suscripcionesActivas } = await supabase
        .from('suscripciones_usuarios')
        .select('dentista_id, plan_id, estado, planes_suscripcion(precio_mensual_usd, codigo)')
        .eq('estado', 'activa')

      const mrr = suscripcionesActivas?.reduce((sum, sub) => {
        const precio = sub.planes_suscripcion?.precio_mensual_usd || 0
        return sum + precio
      }, 0) || 0

      const { data: pagosData } = await supabase
        .from('pagos_suscripciones')
        .select('monto, fecha_pago, estado')
        .eq('estado', 'aprobado')

      const ingresoTotal = pagosData?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0
      
      const mesActual = new Date()
      const ingresoMensual = pagosData?.filter(p => {
        if (!p.fecha_pago) return false
        const fechaPago = new Date(p.fecha_pago)
        return fechaPago.getMonth() === mesActual.getMonth() && 
               fechaPago.getFullYear() === mesActual.getFullYear()
      }).reduce((sum, p) => sum + (p.monto || 0), 0) || 0

      const totalUsuarios = stats.totalUsuarios || 1
      const usuariosPremium = stats.usuariosPremium || 0
      const ltvEstimado = usuariosPremium > 0 ? (ingresoTotal / usuariosPremium) : 0
      const cacEstimado = ltvEstimado * 0.2
      const conversionRate = totalUsuarios > 0 ? (usuariosPremium / totalUsuarios * 100) : 0

      const segmentos = {}
      suscripcionesActivas?.forEach(sub => {
        const codigo = sub.planes_suscripcion?.codigo || 'free'
        segmentos[codigo] = (segmentos[codigo] || 0) + 1
      })

      setMarketingStats({
        mrr, ltv: ltvEstimado, cac: cacEstimado,
        churnRate: 5, conversionRate,
        segmentos,
        ingresos: { mensual: ingresoMensual, total: ingresoTotal }
      })
    } catch (error) {
      console.error('Error loading marketing stats:', error)
    }
  }

  // ═══════════════════════════════════════
  // CHURN DATA
  // ═══════════════════════════════════════
  const loadChurnData = async () => {
    try {
      const { data: dentistas } = await supabase
        .from('dentistas')
        .select('id, email, nombre, clinica, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      const { data: actividades } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id, ultima_actividad')

      const churnSimulado = dentistas?.map(dentista => {
        const actividad = actividades?.find(a => a.dentista_id === dentista.id)
        const ultimaActividad = actividad?.ultima_actividad
        
        let diasInactivo = 0
        let estadoActual = 'activo'
        let scoreRiesgo = 0

        if (ultimaActividad) {
          diasInactivo = Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 86400000)
        } else {
          diasInactivo = Math.floor((Date.now() - new Date(dentista.created_at).getTime()) / 86400000)
        }

        if (diasInactivo <= 7) { estadoActual = 'activo'; scoreRiesgo = 5 }
        else if (diasInactivo <= 30) { estadoActual = 'activo'; scoreRiesgo = 25 }
        else if (diasInactivo <= 90) { estadoActual = 'en_riesgo'; scoreRiesgo = 60 }
        else if (diasInactivo <= 180) { estadoActual = 'hibernating'; scoreRiesgo = 85 }
        else { estadoActual = 'churned'; scoreRiesgo = 95 }

        return {
          dentista_id: dentista.id,
          estado_actual: estadoActual,
          score_riesgo_churn: scoreRiesgo,
          dias_desde_ultimo_uso: diasInactivo,
          fecha_ultimo_uso: ultimaActividad,
          nombre: dentista.clinica || dentista.nombre || dentista.email
        }
      }) || []

      churnSimulado.sort((a, b) => b.score_riesgo_churn - a.score_riesgo_churn)
      setChurnData(churnSimulado)
    } catch (error) {
      console.error('Error loading churn data:', error)
      setChurnData([])
    }
  }

  // ═══════════════════════════════════════
  // VENTAS (intereses_planes)
  // ═══════════════════════════════════════
  const loadVentasData = async () => {
    try {
      const { data, error } = await supabase
        .from('intereses_planes')
        .select('*, dentistas(email, nombre, clinica)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setVentasData(data || [])
    } catch (error) {
      console.error('Error loading ventas data:', error)
      setVentasData([])
    }
  }

  const updateEstadoInteres = async (interesId, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('intereses_planes')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', interesId)

      if (error) throw error
      await loadVentasData()
    } catch (error) {
      console.error('Error updating interest:', error)
      alert('Error al actualizar estado')
    }
  }

  // ═══════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════
  const loadUsuarios = async () => {
    try {
      const { data: dentistas, error: dentistasError } = await supabase
        .from('dentistas')
        .select('id, email, nombre, apellido, clinica, telefono, created_at')
        .order('created_at', { ascending: false })

      if (dentistasError) throw dentistasError

      const { data: suscripciones } = await supabase
        .from('suscripciones_usuarios')
        .select('dentista_id, estado, plan_id, planes_suscripcion(id, nombre, codigo)')

      const { data: actividades } = await supabase
        .from('usuarios_actividad')
        .select('dentista_id, ultima_actividad')

      const usuariosConEstado = dentistas.map(dentista => {
        const suscripcion = suscripciones?.find(s => s.dentista_id === dentista.id)
        const plan = suscripcion?.planes_suscripcion
        const actividad = actividades?.find(a => a.dentista_id === dentista.id)
        const ultimaActividad = actividad?.ultima_actividad
        
        const diasInactivo = ultimaActividad 
          ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 86400000)
          : 999

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
          diasInactivo,
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
        .select('id, monto, moneda, estado, fecha_pago, metodo_pago, dentista_id, plan_id, dentistas(email, nombre, clinica), planes_suscripcion(nombre)')
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

  // ═══════════════════════════════════════
  // PROSPECTS
  // ═══════════════════════════════════════
  const loadProspects = async () => {
    try {
      setProspectsLoading(true)

      const { count: total } = await supabase
        .from('prospects').select('id', { count: 'exact', head: true })
      const { count: conTel } = await supabase
        .from('prospects').select('id', { count: 'exact', head: true })
        .neq('telefono', '').not('telefono', 'is', null)
      const { count: conWeb } = await supabase
        .from('prospects').select('id', { count: 'exact', head: true })
        .neq('website', '').not('website', 'is', null)
      const { count: conEmail } = await supabase
        .from('prospects').select('id', { count: 'exact', head: true })
        .not('email', 'like', '%sin-email.temp%').neq('email', '')

      const { data: porPaisData } = await supabase
        .from('prospects').select('pais').limit(5000)
      const porPais = {}
      porPaisData?.forEach(p => { porPais[p.pais] = (porPais[p.pais] || 0) + 1 })

      setProspectsStats({
        total: total || 0,
        conTelefono: conTel || 0,
        conWebsite: conWeb || 0,
        conEmail: conEmail || 0,
        porPais
      })

      await loadProspectsPage()
    } catch (error) {
      console.error('Error loading prospects:', error)
    } finally {
      setProspectsLoading(false)
    }
  }

  const loadProspectsPage = async () => {
    try {
      let query = supabase
        .from('prospects')
        .select('id, nombre_clinica, email, telefono, pais, ciudad, direccion, rating, total_reviews, website, google_maps_url, estado, created_at')
        .order('created_at', { ascending: false })
        .range(prospectsPagina * PROSPECTS_POR_PAGINA, (prospectsPagina + 1) * PROSPECTS_POR_PAGINA - 1)

      if (prospectsFiltros.pais !== 'todos') query = query.eq('pais', prospectsFiltros.pais)
      if (prospectsFiltros.estado !== 'todos') query = query.eq('estado', prospectsFiltros.estado)
      if (prospectsFiltros.busqueda) query = query.ilike('nombre_clinica', `%${prospectsFiltros.busqueda}%`)

      const { data, error } = await query
      if (error) throw error
      setProspects(data || [])
      setSelectedProspects(new Set())
      setSelectAll(false)
    } catch (error) {
      console.error('Error loading prospects page:', error)
    }
  }

  // ═══════════════════════════════════════
  // TRACKING STATS
  // ═══════════════════════════════════════
  const loadTrackingStats = async () => {
    try {
      const { data } = await supabase
        .from('tracking_marketing')
        .select('evento, canal')

      let enviados = 0, abiertos = 0, clicks = 0
      data?.forEach(t => {
        if (t.evento === 'enviado') enviados++
        if (t.evento === 'abierto') abiertos++
        if (t.evento === 'click') clicks++
      })
      setTrackingStats({ enviados, abiertos, clicks })
    } catch (error) {
      console.error('Error loading tracking:', error)
    }
  }

  // ═══════════════════════════════════════
  // SELECTION HANDLERS
  // ═══════════════════════════════════════
  const toggleSelectProspect = (id) => {
    setSelectedProspects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProspects(new Set())
      setSelectAll(false)
    } else {
      setSelectedProspects(new Set(prospects.map(p => p.id)))
      setSelectAll(true)
    }
  }

  // ═══════════════════════════════════════
  // SEND CAMPAIGN
  // ═══════════════════════════════════════
  const openSendModal = (canal) => {
    if (selectedProspects.size === 0) {
      alert('Seleccioná al menos un prospect')
      return
    }
    setSendModal({ isOpen: true, canal })
    setSendingStatus({ sending: false, result: null })
  }

  const getSelectedProspectsData = () => {
    return prospects.filter(p => selectedProspects.has(p.id))
  }

  const executeSend = async () => {
    setSendingStatus({ sending: true, result: null })
    const ids = Array.from(selectedProspects)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const functionName = sendModal.canal === 'email' ? 'enviar-campana-email' : 'enviar-campana-whatsapp'
      const body = sendModal.canal === 'email'
        ? { prospect_ids: ids, asunto: emailAsunto }
        : { prospect_ids: ids }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      setSendingStatus({ sending: false, result: data })
      await loadProspectsPage()
      await loadTrackingStats()
    } catch (error) {
      setSendingStatus({ sending: false, result: { ok: false, error: error.message } })
    }
  }

  // ═══════════════════════════════════════
  // PLAN CHANGE
  // ═══════════════════════════════════════
  const handleCambiarPlan = (usuario) => {
    setModalCambiarPlan({ isOpen: true, usuario })
  }

  const confirmarCambioPlan = async (nuevoPlanId) => {
    try {
      const usuario = modalCambiarPlan.usuario
      const { data: suscripcionExistente } = await supabase
        .from('suscripciones_usuarios')
        .select('id')
        .eq('dentista_id', usuario.id)
        .maybeSingle()

      if (suscripcionExistente) {
        const { error } = await supabase
          .from('suscripciones_usuarios')
          .update({ plan_id: nuevoPlanId, updated_at: new Date().toISOString() })
          .eq('dentista_id', usuario.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('suscripciones_usuarios')
          .insert({ dentista_id: usuario.id, plan_id: nuevoPlanId, estado: 'activa', fecha_inicio: new Date().toISOString() })
        if (error) throw error
      }

      alert('Plan actualizado correctamente')
      setModalCambiarPlan({ isOpen: false, usuario: null })
      await loadData()
    } catch (error) {
      console.error('Error cambiando plan:', error)
      alert('Error al cambiar plan: ' + error.message)
    }
  }

  // ═══════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════
  const usuariosFiltrados = usuarios.filter(user => {
    if (filtros.plan !== 'todos' && user.planCodigo !== filtros.plan) return false
    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'activo' && !user.esActivo) return false
      if (filtros.estado === 'inactivo' && user.esActivo) return false
    }
    return true
  })

  const paisesUnicos = [...new Set(Object.keys(prospectsStats.porPais || {}))].sort()
  const estadosProspect = ['nuevo', 'contactado', 'abierto', 'click', 'registro_iniciado', 'respondio', 'convertido']

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
        {[
          { key: 'usuarios', label: '👥 Gestión de Usuarios' },
          { key: 'prospects', label: `🎯 Prospects (${prospectsStats.total})` },
          { key: 'marketing', label: '📊 Métricas de Marketing' },
          { key: 'churn', label: '⚠️ Análisis de Churn' },
          { key: 'ventas', label: '💰 Pipeline de Ventas' },
        ].map(tab => (
          <button
            key={tab.key}
            style={{...styles.tab, ...(activeTab === tab.key && styles.tabActive)}}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
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
            <div style={styles.statLabel}>Usuarios Activos (30d)</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>
            <div style={styles.statNumber}>{stats.usuariosPremium}</div>
            <div style={styles.statLabel}>Usuarios Premium</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🎯</div>
            <div style={styles.statNumber}>{prospectsStats.total}</div>
            <div style={styles.statLabel}>Prospects</div>
          </div>
        </div>

        {/* ═══════ TAB: USUARIOS ═══════ */}
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
                          <td style={styles.td}>{pago.dentista?.clinica || pago.dentista?.nombre || pago.dentista?.email || 'N/A'}</td>
                          <td style={styles.td}>{pago.plan?.nombre || 'N/A'}</td>
                          <td style={styles.td}>${Number(pago.monto).toLocaleString()}</td>
                          <td style={styles.td}>{pago.metodo_pago || 'N/A'}</td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, ...(pago.estado === 'aprobado' ? styles.badgeSuccess : styles.badgePending)}}>
                              {pago.estado}
                            </span>
                          </td>
                          <td style={styles.td}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>👥 Gestión de Usuarios</h2>
              <div style={styles.filters}>
                <select value={filtros.plan} onChange={(e) => setFiltros({...filtros, plan: e.target.value})} style={styles.select}>
                  <option value="todos">Todos los planes</option>
                  <option value="free">Gratuito</option>
                  <option value="pro">Profesional</option>
                  <option value="enterprise">Clínica</option>
                </select>
                <select value={filtros.estado} onChange={(e) => setFiltros({...filtros, estado: e.target.value})} style={styles.select}>
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
                <button onClick={loadData} style={styles.refreshButton}>🔄 Actualizar</button>
              </div>

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
                          <span style={{...styles.badge, ...(user.planCodigo === 'free' ? styles.badgeNeutral : styles.badgeInfo)}}>
                            {user.planActual}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{...styles.badge, ...(user.esActivo ? styles.badgeSuccess : styles.badgeDanger)}}>
                            {user.esActivo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={styles.td}>{user.diasInactivo > 365 ? '+1 año' : `${user.diasInactivo} días`}</td>
                        <td style={styles.td}>
                          <button onClick={() => handleCambiarPlan(user)} style={styles.actionButton}>Cambiar Plan</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={styles.resultsCount}>Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios</div>
            </div>
          </>
        )}

        {/* ═══════ TAB: PROSPECTS ═══════ */}
        {activeTab === 'prospects' && (
          <>
            {/* Tracking metrics bar */}
            <div style={styles.trackingBar}>
              <div style={styles.trackingItem}>
                <span style={styles.trackingNum}>{trackingStats.enviados}</span>
                <span style={styles.trackingLabel}>Enviados</span>
              </div>
              <div style={styles.trackingItem}>
                <span style={{...styles.trackingNum, color: '#3b82f6'}}>{trackingStats.abiertos}</span>
                <span style={styles.trackingLabel}>Abiertos</span>
              </div>
              <div style={styles.trackingItem}>
                <span style={{...styles.trackingNum, color: '#10b981'}}>{trackingStats.clicks}</span>
                <span style={styles.trackingLabel}>Clicks</span>
              </div>
              <div style={styles.trackingItem}>
                <span style={{...styles.trackingNum, color: '#f59e0b'}}>
                  {trackingStats.enviados > 0 ? Math.round(trackingStats.abiertos / trackingStats.enviados * 100) : 0}%
                </span>
                <span style={styles.trackingLabel}>Open Rate</span>
              </div>
              <div style={styles.trackingItem}>
                <span style={{...styles.trackingNum, color: '#8b5cf6'}}>
                  {trackingStats.enviados > 0 ? Math.round(trackingStats.clicks / trackingStats.enviados * 100) : 0}%
                </span>
                <span style={styles.trackingLabel}>Click Rate</span>
              </div>
            </div>

            {/* Country cards */}
            <div style={styles.countryGrid}>
              {Object.entries(prospectsStats.porPais || {}).sort((a, b) => b[1] - a[1]).map(([pais, total]) => (
                <div
                  key={pais}
                  style={{...styles.countryCard, ...(prospectsFiltros.pais === pais && styles.countryCardActive)}}
                  onClick={() => {
                    setProspectsFiltros({...prospectsFiltros, pais: prospectsFiltros.pais === pais ? 'todos' : pais})
                    setProspectsPagina(0)
                  }}
                >
                  <div style={styles.countryName}>{pais}</div>
                  <div style={styles.countryNum}>{total}</div>
                </div>
              ))}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🎯 Base de Prospects ({prospectsStats.total})</h2>

              {/* Filtros */}
              <div style={styles.filters}>
                <select
                  value={prospectsFiltros.pais}
                  onChange={e => { setProspectsFiltros({...prospectsFiltros, pais: e.target.value}); setProspectsPagina(0) }}
                  style={styles.select}
                >
                  <option value="todos">Todos los países</option>
                  {paisesUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  value={prospectsFiltros.estado}
                  onChange={e => { setProspectsFiltros({...prospectsFiltros, estado: e.target.value}); setProspectsPagina(0) }}
                  style={styles.select}
                >
                  <option value="todos">Todos los estados</option>
                  {estadosProspect.map(e => <option key={e} value={e}>{e}</option>)}
                </select>

                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={prospectsFiltros.busqueda}
                  onChange={e => { setProspectsFiltros({...prospectsFiltros, busqueda: e.target.value}); setProspectsPagina(0) }}
                  style={styles.searchInput}
                />

                <button onClick={() => { setProspectsFiltros({pais:'todos',busqueda:'',estado:'todos'}); setProspectsPagina(0) }} style={styles.clearButton}>
                  Limpiar filtros
                </button>
                <button onClick={loadProspects} style={styles.refreshButton}>🔄</button>
              </div>

              {/* Send buttons */}
              <div style={styles.sendBar}>
                <span style={styles.selectedCount}>{selectedProspects.size} seleccionados</span>
                <button
                  onClick={() => openSendModal('email')}
                  style={{...styles.sendButton, backgroundColor: '#3b82f6'}}
                  disabled={selectedProspects.size === 0}
                >
                  📧 Enviar Email ({selectedProspects.size})
                </button>
                <button
                  onClick={() => openSendModal('whatsapp')}
                  style={{...styles.sendButton, backgroundColor: '#25d366'}}
                  disabled={selectedProspects.size === 0}
                >
                  💬 Enviar WhatsApp ({selectedProspects.size})
                </button>
              </div>

              {/* Tabla de prospects */}
              {prospectsLoading ? (
                <div style={styles.emptyState}>Cargando prospects...</div>
              ) : (
                <>
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /></th>
                          <th style={styles.th}>Clínica</th>
                          <th style={styles.th}>Ciudad</th>
                          <th style={styles.th}>País</th>
                          <th style={styles.th}>Teléfono</th>
                          <th style={styles.th}>Rating</th>
                          <th style={styles.th}>Links</th>
                          <th style={styles.th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prospects.map(p => (
                          <tr key={p.id} style={{...styles.tr, backgroundColor: selectedProspects.has(p.id) ? '#eff6ff' : 'transparent'}}>
                            <td style={styles.td}>
                              <input type="checkbox" checked={selectedProspects.has(p.id)} onChange={() => toggleSelectProspect(p.id)} />
                            </td>
                            <td style={{...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                              {p.nombre_clinica || '-'}
                            </td>
                            <td style={styles.td}>{p.ciudad || '-'}</td>
                            <td style={styles.td}>{p.pais || '-'}</td>
                            <td style={styles.td}>
                              {p.telefono ? <a href={`tel:${p.telefono}`} style={{color:'#3b82f6',textDecoration:'none'}}>{p.telefono}</a> : '-'}
                            </td>
                            <td style={styles.td}>
                              {p.rating ? (
                                <span style={{color: p.rating >= 4.5 ? '#10b981' : '#f59e0b', fontWeight:'600'}}>
                                  ⭐ {p.rating}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={styles.td}>
                              <div style={{display:'flex',gap:'6px'}}>
                                {p.website && <a href={p.website} target="_blank" rel="noopener" style={{fontSize:'16px',textDecoration:'none'}} title="Website">🌐</a>}
                                {p.google_maps_url && <a href={p.google_maps_url} target="_blank" rel="noopener" style={{fontSize:'16px',textDecoration:'none'}} title="Maps">📍</a>}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.badge,
                                ...(p.estado === 'nuevo' ? styles.badgeNeutral :
                                    p.estado === 'contactado' ? styles.badgeWarning :
                                    p.estado === 'abierto' ? styles.badgeInfo :
                                    ['click','registro_iniciado'].includes(p.estado) ? styles.badgeSuccess :
                                    styles.badgeNeutral)
                              }}>
                                {p.estado || 'nuevo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div style={styles.pagination}>
                    <button
                      onClick={() => setProspectsPagina(Math.max(0, prospectsPagina - 1))}
                      disabled={prospectsPagina === 0}
                      style={{...styles.pageButton, ...(prospectsPagina === 0 && styles.pageButtonDisabled)}}
                    >
                      ← Anterior
                    </button>
                    <span style={{fontSize:'14px',color:'#6b7280'}}>
                      Página {prospectsPagina + 1} • {prospects.length} resultados
                    </span>
                    <button
                      onClick={() => setProspectsPagina(prospectsPagina + 1)}
                      disabled={prospects.length < PROSPECTS_POR_PAGINA}
                      style={{...styles.pageButton, ...(prospects.length < PROSPECTS_POR_PAGINA && styles.pageButtonDisabled)}}
                    >
                      Siguiente →
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ═══════ TAB: MARKETING ═══════ */}
        {activeTab === 'marketing' && (
          <>
            <div style={styles.marketingGrid}>
              {[
                { icon: '💰', value: `$${Number(marketingStats.mrr).toLocaleString()}`, label: 'MRR (USD)' },
                { icon: '📈', value: `$${Math.round(marketingStats.ltv).toLocaleString()}`, label: 'LTV Promedio' },
                { icon: '💸', value: `$${Math.round(marketingStats.cac).toLocaleString()}`, label: 'CAC' },
                { icon: '⚠️', value: `${Number(marketingStats.churnRate).toFixed(1)}%`, label: 'Tasa de Churn' },
                { icon: '🎯', value: `${Number(marketingStats.conversionRate).toFixed(1)}%`, label: 'Conversión' },
                { icon: '📊', value: `${marketingStats.ltv > 0 && marketingStats.cac > 0 ? (marketingStats.ltv / marketingStats.cac).toFixed(1) : '0'}:1`, label: 'LTV/CAC' },
              ].map((m, i) => (
                <div key={i} style={styles.statCard}>
                  <div style={styles.statIcon}>{m.icon}</div>
                  <div style={styles.statNumber}>{m.value}</div>
                  <div style={styles.statLabel}>{m.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🎯 Segmentación de Clientes</h2>
              {Object.keys(marketingStats.segmentos).length === 0 ? (
                <div style={styles.emptyState}>No hay datos de segmentación disponibles</div>
              ) : (
                <div style={styles.segmentosGrid}>
                  {Object.entries(marketingStats.segmentos).map(([segmento, cantidad]) => (
                    <div key={segmento} style={styles.segmentoCard}>
                      <div style={styles.segmentoNumber}>{cantidad}</div>
                      <div style={styles.segmentoLabel}>{segmento}</div>
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
                  <div style={styles.financialValue}>${Number(marketingStats.ingresos.mensual).toLocaleString()}</div>
                </div>
                <div style={styles.financialCard}>
                  <div style={styles.financialTitle}>Ingresos Totales</div>
                  <div style={styles.financialValue}>${Number(marketingStats.ingresos.total).toLocaleString()}</div>
                </div>
                <div style={styles.financialCard}>
                  <div style={styles.financialTitle}>ARR Proyectado</div>
                  <div style={styles.financialValue}>${Number(marketingStats.mrr * 12).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ TAB: CHURN ═══════ */}
        {activeTab === 'churn' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⚠️ Usuarios en Riesgo de Churn</h2>
            {churnData.length === 0 ? (
              <div style={styles.emptyState}>No hay datos de churn disponibles</div>
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
                            color: user.score_riesgo_churn > 70 ? '#ef4444' : user.score_riesgo_churn > 40 ? '#f59e0b' : '#10b981',
                            fontWeight: 'bold'
                          }}>
                            {user.score_riesgo_churn}%
                          </span>
                        </td>
                        <td style={styles.td}>{user.dias_desde_ultimo_uso} días</td>
                        <td style={styles.td}>
                          {user.fecha_ultimo_uso ? new Date(user.fecha_ultimo_uso).toLocaleDateString() : 'Nunca'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════ TAB: VENTAS ═══════ */}
        {activeTab === 'ventas' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💰 Pipeline de Ventas — Intereses en Planes</h2>
            {ventasData.length === 0 ? (
              <div style={styles.emptyState}>
                No hay intereses registrados. Aparecerán cuando usuarios hagan click en "Contratar Ahora".
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Usuario</th>
                      <th style={styles.th}>Plan</th>
                      <th style={styles.th}>Precio</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasData.map(v => (
                      <tr key={v.id} style={styles.tr}>
                        <td style={styles.td}>{v.dentistas?.clinica || v.dentistas?.email || 'N/A'}</td>
                        <td style={styles.td}>{v.plan_nombre || 'N/A'}</td>
                        <td style={styles.td}>${Number(v.plan_precio || 0).toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(v.estado === 'pendiente' ? styles.badgeWarning :
                                v.estado === 'convertido' ? styles.badgeSuccess : styles.badgeNeutral)
                          }}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(v.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <select
                            value={v.estado}
                            onChange={e => updateEstadoInteres(v.id, e.target.value)}
                            style={styles.selectSmall}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="contactado">Contactado</option>
                            <option value="en_negociacion">En negociación</option>
                            <option value="convertido">Convertido</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ MODAL: ENVIAR CAMPAÑA ═══════ */}
      {sendModal.isOpen && (
        <div style={styles.modalOverlay} onClick={() => !sendingStatus.sending && setSendModal({isOpen:false,canal:null})}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {sendModal.canal === 'email' ? '📧 Enviar Email Marketing' : '💬 Enviar WhatsApp Marketing'}
            </h3>

            {!sendingStatus.result ? (
              <>
                {/* Info summary */}
                <div style={styles.modalInfo}>
                  <div style={styles.modalInfoRow}>
                    <span style={{color:'#6b7280'}}>Canal:</span>
                    <span style={{fontWeight:'600'}}>{sendModal.canal === 'email' ? 'Email (Resend)' : 'WhatsApp (Twilio)'}</span>
                  </div>
                  <div style={styles.modalInfoRow}>
                    <span style={{color:'#6b7280'}}>Destinatarios:</span>
                    <span style={{fontWeight:'600'}}>{selectedProspects.size} prospects</span>
                  </div>
                  {sendModal.canal === 'email' && (
                    <div style={styles.modalInfoRow}>
                      <span style={{color:'#6b7280'}}>Con email válido:</span>
                      <span style={{fontWeight:'600'}}>
                        {getSelectedProspectsData().filter(p => p.email && !p.email.includes('sin-email')).length}
                      </span>
                    </div>
                  )}
                  {sendModal.canal === 'whatsapp' && (
                    <div style={styles.modalInfoRow}>
                      <span style={{color:'#6b7280'}}>Con teléfono:</span>
                      <span style={{fontWeight:'600'}}>
                        {getSelectedProspectsData().filter(p => p.telefono).length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email subject editor */}
                {sendModal.canal === 'email' && (
                  <div style={{marginTop:'16px'}}>
                    <label style={{display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'6px'}}>
                      Asunto del email:
                    </label>
                    <input
                      type="text"
                      value={emailAsunto}
                      onChange={e => setEmailAsunto(e.target.value)}
                      style={{width:'100%',padding:'10px 14px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}
                    />
                  </div>
                )}

                {/* Message preview */}
                <div style={{marginTop:'16px'}}>
                  <div style={{fontSize:'14px',fontWeight:'600',color:'#374151',marginBottom:'8px'}}>
                    Preview del mensaje:
                  </div>
                  <div style={styles.previewBox}>
                    {sendModal.canal === 'email' ? (
                      <>
                        <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>
                          De: OdontoLog &lt;noreply@odontolog.lat&gt;
                        </div>
                        <div style={{fontSize:'14px',fontWeight:'600',color:'#1f2937',marginBottom:'12px'}}>
                          Asunto: {emailAsunto}
                        </div>
                        <div style={{lineHeight:'1.6',fontSize:'13px'}}>
                          <p>Estimado/a <strong>[Nombre Clínica]</strong>,</p>
                          <p>Le escribimos porque OdontoLog puede optimizar la gestión de su clínica dental.</p>
                          <p>✅ Gestión de pacientes e historial clínico<br/>
                          ✅ Calendario con recordatorios automáticos<br/>
                          ✅ Odontograma digital interactivo<br/>
                          ✅ Control financiero y reportes</p>
                          <p style={{textAlign:'center'}}>
                            <span style={{padding:'8px 24px',backgroundColor:'#1e40af',color:'#fff',borderRadius:'8px',display:'inline-block'}}>
                              Comenzar gratis →
                            </span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px'}}>
                          WhatsApp Business: +595 994 737 584
                        </div>
                        <div style={{lineHeight:'1.6',fontSize:'13px'}}>
                          <p>Estimado/a <strong>[Nombre Clínica]</strong>,</p>
                          <p>Le escribimos de *OdontoLog*, el software de gestión dental en la nube.</p>
                          <p>🦷 ¿Qué puede hacer OdontoLog?<br/>
                          ✅ Gestión de pacientes<br/>
                          ✅ Calendario con recordatorios<br/>
                          ✅ Odontograma digital<br/>
                          ✅ Control financiero</p>
                          <p>🎁 Comience gratis — sin compromiso.</p>
                          <p>👉 [Link de registro con tracking]</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recipients list */}
                <div style={styles.recipientsList}>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'#374151',marginBottom:'8px'}}>
                    Primeros 5 destinatarios:
                  </div>
                  {getSelectedProspectsData().slice(0, 5).map(p => (
                    <div key={p.id} style={styles.recipientRow}>
                      <span>{p.nombre_clinica || 'Sin nombre'}</span>
                      <span style={{color:'#9ca3af'}}>
                        {sendModal.canal === 'email' ? (p.email || 'sin email') : (p.telefono || 'sin teléfono')}
                      </span>
                    </div>
                  ))}
                  {selectedProspects.size > 5 && (
                    <div style={{color:'#9ca3af',fontSize:'13px',marginTop:'4px'}}>
                      ... y {selectedProspects.size - 5} más
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{display:'flex',gap:'12px',marginTop:'20px'}}>
                  <button
                    onClick={() => setSendModal({isOpen:false,canal:null})}
                    style={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeSend}
                    disabled={sendingStatus.sending}
                    style={{
                      ...styles.confirmButton,
                      backgroundColor: sendModal.canal === 'email' ? '#3b82f6' : '#25d366'
                    }}
                  >
                    {sendingStatus.sending ? 'Enviando...' : `Enviar a ${selectedProspects.size} prospects`}
                  </button>
                </div>
              </>
            ) : (
              /* ═══ RESULTS SCREEN ═══ */
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>
                  {sendingStatus.result?.ok ? '✅' : '❌'}
                </div>
                <div style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',marginBottom:'16px'}}>
                  {sendingStatus.result?.ok ? 'Envío completado' : 'Error en el envío'}
                </div>

                {sendingStatus.result?.resumen && (
                  <div style={{padding:'16px',backgroundColor:'#f9fafb',borderRadius:'8px',marginBottom:'16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',padding:'6px 0'}}>
                      <span>Enviados:</span>
                      <span style={{color:'#10b981',fontWeight:'700'}}>{sendingStatus.result.resumen.enviados}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',padding:'6px 0'}}>
                      <span>Errores:</span>
                      <span style={{color:'#ef4444',fontWeight:'700'}}>{sendingStatus.result.resumen.errores}</span>
                    </div>
                    {sendingStatus.result.resumen.sin_email_valido > 0 && (
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',padding:'6px 0'}}>
                        <span>Sin email válido:</span>
                        <span>{sendingStatus.result.resumen.sin_email_valido}</span>
                      </div>
                    )}
                    {sendingStatus.result.resumen.sin_telefono > 0 && (
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',padding:'6px 0'}}>
                        <span>Sin teléfono:</span>
                        <span>{sendingStatus.result.resumen.sin_telefono}</span>
                      </div>
                    )}
                  </div>
                )}

                {sendingStatus.result?.error && (
                  <div style={{padding:'12px',backgroundColor:'#fef2f2',borderRadius:'8px',color:'#dc2626',fontSize:'14px',marginBottom:'16px'}}>
                    {sendingStatus.result.error}
                  </div>
                )}

                <button
                  onClick={() => { setSendModal({isOpen:false,canal:null}); setSelectedProspects(new Set()) }}
                  style={styles.confirmButton}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL: CAMBIAR PLAN ═══════ */}
      {modalCambiarPlan.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setModalCambiarPlan({isOpen:false,usuario:null})}>
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
                  <div key={plan.id} style={{...styles.planCard, ...(esActual && styles.planCardActual)}}>
                    <div style={styles.planNombre}>{plan.nombre}</div>
                    <div style={styles.planPrecio}>${plan.precio_mensual_usd}/mes</div>
                    <button
                      onClick={() => confirmarCambioPlan(plan.id)}
                      style={{...styles.planButton, ...(esActual && styles.planButtonDisabled)}}
                      disabled={esActual}
                    >
                      {esActual ? 'Plan Actual' : 'Seleccionar'}
                    </button>
                  </div>
                )
              })}
            </div>

            <button onClick={() => setModalCambiarPlan({isOpen:false,usuario:null})} style={styles.cancelButton}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#6b7280' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', backgroundColor: '#ffffff', borderBottom: '2px solid #e5e7eb' },
  headerTitle: { fontSize: '28px', fontWeight: '700', color: '#1e40af' },
  logoutButton: { padding: '10px 20px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  tabsContainer: { display: 'flex', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' },
  tab: { padding: '16px 24px', backgroundColor: 'transparent', border: 'none', borderBottomWidth: '3px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6', backgroundColor: '#f8fafc' },
  content: { padding: '32px', maxWidth: '1400px', margin: '0 auto' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' },
  marketingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '2px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  statIcon: { fontSize: '36px', marginBottom: '12px' },
  statNumber: { fontSize: '28px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' },
  statLabel: { fontSize: '14px', color: '#6b7280', fontWeight: '500' },
  section: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '16px' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#374151' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px', fontSize: '14px', color: '#1f2937' },
  badge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
  badgeSuccess: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgePending: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeWarning: { backgroundColor: '#fed7aa', color: '#9a3412' },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeNeutral: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  badgeInfo: { backgroundColor: '#dbeafe', color: '#1e40af' },
  filters: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  select: { padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#ffffff', cursor: 'pointer' },
  selectSmall: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#ffffff', cursor: 'pointer' },
  searchInput: { padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', minWidth: '200px' },
  clearButton: { padding: '10px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#6b7280' },
  refreshButton: { padding: '10px 20px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  actionButton: { padding: '6px 12px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  resultsCount: { marginTop: '16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' },

  // Tracking bar
  trackingBar: { display: 'flex', gap: '20px', marginBottom: '20px', padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', justifyContent: 'space-around', flexWrap: 'wrap' },
  trackingItem: { textAlign: 'center' },
  trackingNum: { fontSize: '28px', fontWeight: '700', color: '#1e40af', display: 'block' },
  trackingLabel: { fontSize: '12px', color: '#6b7280' },

  // Country cards
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px' },
  countryCard: { backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' },
  countryCardActive: { border: '2px solid #3b82f6', backgroundColor: '#eff6ff' },
  countryName: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' },
  countryNum: { fontSize: '22px', fontWeight: '700', color: '#1e40af' },

  // Send bar
  sendBar: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
  selectedCount: { fontSize: '14px', color: '#6b7280', fontWeight: '500' },
  sendButton: { padding: '10px 20px', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },

  // Pagination
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 0' },
  pageButton: { padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  pageButtonDisabled: { backgroundColor: '#d1d5db', cursor: 'not-allowed' },

  // Segmentos
  segmentosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' },
  segmentoCard: { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #e5e7eb' },
  segmentoNumber: { fontSize: '24px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' },
  segmentoLabel: { fontSize: '12px', color: '#6b7280', fontWeight: '500' },

  // Financial
  financialGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  financialCard: { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', textAlign: 'center' },
  financialTitle: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' },
  financialValue: { fontSize: '20px', fontWeight: '700', color: '#1e40af' },

  // Modals
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
  modal: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  modalSubtitle: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' },
  modalInfo: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  modalInfoRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' },

  // Preview
  previewBox: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', fontSize: '14px', color: '#374151', backgroundColor: '#fafafa', maxHeight: '220px', overflowY: 'auto' },

  // Recipients
  recipientsList: { marginTop: '16px', padding: '14px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  recipientRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderBottom: '1px solid #f3f4f6' },

  // Buttons
  cancelButton: { flex: 1, padding: '12px', backgroundColor: '#6b7280', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  confirmButton: { flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },

  // Plan cards
  planesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '24px', marginBottom: '24px' },
  planCard: { border: '2px solid #e5e7eb', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  planCardActual: { border: '2px solid #10b981', backgroundColor: '#f0fdf4' },
  planNombre: { fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' },
  planPrecio: { fontSize: '14px', color: '#6b7280', marginBottom: '12px' },
  planButton: { width: '100%', padding: '8px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  planButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
}