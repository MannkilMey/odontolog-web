import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMoneda } from '../hooks/useMoneda'

export default function ReportesScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [config, setConfig] = useState(null)

  const [stats, setStats] = useState({
    totalIngresos: 0, totalGastos: 0, balance: 0,
    totalProcedimientos: 0, totalCitas: 0, totalPagos: 0
  })

  const [graficoIngresos, setGraficoIngresos] = useState([])
  const [graficoProcedimientos, setGraficoProcedimientos] = useState([])
  const [graficoCategoriasGastos, setGraficoCategoriasGastos] = useState([])
  const [graficoMetodosPago, setGraficoMetodosPago] = useState([])

  useEffect(() => {
    loadReportes()
  }, [periodo, fechaInicio, fechaFin])

  const loadReportes = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: configData } = await supabase
        .from('configuracion_clinica').select('*')
        .eq('dentista_id', user.id).single()
      setConfig(configData)

      const { inicio, fin } = getRangoFechas()

      const { data: ingresos } = await supabase
        .from('pagos_pacientes').select('monto')
        .eq('dentista_id', user.id)
        .gte('fecha_pago', inicio).lte('fecha_pago', fin)
      const totalIngresos = ingresos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0

      const { data: gastos } = await supabase
        .from('gastos_clinica').select('monto, categoria')
        .eq('dentista_id', user.id)
        .gte('fecha_gasto', inicio).lte('fecha_gasto', fin)
      const totalGastos = gastos?.reduce((sum, g) => sum + Number(g.monto), 0) || 0

      const { count: procedimientosCount } = await supabase
        .from('procedimientos_dentales').select('*', { count: 'exact', head: true })
        .eq('dentista_id', user.id)
        .gte('fecha_procedimiento', inicio).lte('fecha_procedimiento', fin)

      const { count: citasCount } = await supabase
        .from('citas').select('*', { count: 'exact', head: true })
        .eq('dentista_id', user.id)
        .gte('fecha_cita', inicio).lte('fecha_cita', fin)

      const { count: pagosCount } = await supabase
        .from('pagos_pacientes').select('*', { count: 'exact', head: true })
        .eq('dentista_id', user.id)
        .gte('fecha_pago', inicio).lte('fecha_pago', fin)

      setStats({
        totalIngresos, totalGastos,
        balance: totalIngresos - totalGastos,
        totalProcedimientos: procedimientosCount || 0,
        totalCitas: citasCount || 0,
        totalPagos: pagosCount || 0
      })

      await cargarGraficoIngresos(user.id, inicio, fin)
      await cargarGraficoProcedimientos(user.id, inicio, fin)
      cargarGraficoCategoriasGastos(gastos)
      await cargarGraficoMetodosPago(user.id, inicio, fin)

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('reportes.titlePlain') }))
    } finally {
      setLoading(false)
    }
  }

  const getRangoFechas = () => {
    const hoy = new Date()
    let inicio, fin

    if (periodo === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    } else if (periodo === 'año') {
      inicio = new Date(hoy.getFullYear(), 0, 1)
      fin = new Date(hoy.getFullYear(), 11, 31)
    } else if (periodo === 'personalizado') {
      inicio = fechaInicio ? new Date(fechaInicio) : new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      fin = fechaFin ? new Date(fechaFin) : hoy
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0]
    }
  }

  const cargarGraficoIngresos = async (userId, inicio, fin) => {
    let dias = []
    const inicioDate = new Date(inicio)
    const finDate = new Date(fin)
    const diffDays = Math.ceil(Math.abs(finDate - inicioDate) / (1000 * 60 * 60 * 24))

    if (diffDays <= 31) {
      for (let i = 0; i <= diffDays; i++) {
        const fecha = new Date(inicioDate)
        fecha.setDate(inicioDate.getDate() + i)
        dias.push({
          fecha: fecha.toISOString().split('T')[0],
          label: fecha.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        })
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const fecha = new Date()
        fecha.setDate(fecha.getDate() - (i * 7))
        dias.push({
          fecha: fecha.toISOString().split('T')[0],
          label: t('reportes.weekLabel', { number: 12 - i })
        })
      }
    }

    const data = await Promise.all(dias.map(async ({ fecha, label }) => {
      const { data: ing } = await supabase
        .from('pagos_pacientes').select('monto')
        .eq('dentista_id', userId).eq('fecha_pago', fecha)
      const { data: gas } = await supabase
        .from('gastos_clinica').select('monto')
        .eq('dentista_id', userId).eq('fecha_gasto', fecha)
      return {
        fecha: label,
        ingresos: ing?.reduce((sum, p) => sum + Number(p.monto), 0) || 0,
        gastos: gas?.reduce((sum, g) => sum + Number(g.monto), 0) || 0
      }
    }))

    setGraficoIngresos(data)
  }

  const cargarGraficoProcedimientos = async (userId, inicio, fin) => {
    const { data: procedimientos } = await supabase
      .from('procedimientos_dentales')
      .select('*, catalogo_procedimientos (categoria)')
      .eq('dentista_id', userId)
      .gte('fecha_procedimiento', inicio).lte('fecha_procedimiento', fin)

    const procPorCategoria = {}
    procedimientos?.forEach(proc => {
      const cat = proc.catalogo_procedimientos?.categoria || 'otros'
      procPorCategoria[cat] = (procPorCategoria[cat] || 0) + 1
    })

    setGraficoProcedimientos(
      Object.keys(procPorCategoria).map(cat => ({ name: cat, value: procPorCategoria[cat] }))
    )
  }

  const cargarGraficoCategoriasGastos = (gastos) => {
    const gastosPorCat = {}
    gastos?.forEach(gasto => {
      const cat = gasto.categoria || 'otros'
      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + Number(gasto.monto)
    })

    setGraficoCategoriasGastos(
      Object.keys(gastosPorCat).map(cat => ({ name: cat, monto: gastosPorCat[cat] }))
    )
  }

  const cargarGraficoMetodosPago = async (userId, inicio, fin) => {
    const { data: pagos } = await supabase
      .from('pagos_pacientes').select('metodo_pago, monto')
      .eq('dentista_id', userId)
      .gte('fecha_pago', inicio).lte('fecha_pago', fin)

    const pagosPorMetodo = {}
    pagos?.forEach(pago => {
      const metodo = pago.metodo_pago || 'otro'
      pagosPorMetodo[metodo] = (pagosPorMetodo[metodo] || 0) + Number(pago.monto)
    })

    setGraficoMetodosPago(
      Object.keys(pagosPorMetodo).map(metodo => ({ name: metodo, value: pagosPorMetodo[metodo] }))
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>{t('reportes.loading')}</div>
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
          <div style={styles.title}>{t('reportes.title')}</div>
          <div style={styles.subtitle}>{t('reportes.subtitle')}</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Filtros de Período */}
        <div style={styles.filtersSection}>
          <div style={styles.filtersRow}>
            <button
              style={{ ...styles.periodoButton, ...(periodo === 'mes' && styles.periodoButtonActive) }}
              onClick={() => setPeriodo('mes')}
            >
              {t('reportes.periodMonth')}
            </button>
            <button
              style={{ ...styles.periodoButton, ...(periodo === 'año' && styles.periodoButtonActive) }}
              onClick={() => setPeriodo('año')}
            >
              {t('reportes.periodYear')}
            </button>
            <button
              style={{ ...styles.periodoButton, ...(periodo === 'personalizado' && styles.periodoButtonActive) }}
              onClick={() => setPeriodo('personalizado')}
            >
              {t('reportes.periodCustom')}
            </button>
          </div>

          {periodo === 'personalizado' && (
            <div style={styles.customDateRow}>
              <div style={styles.dateGroup}>
                <label style={styles.dateLabel}>{t('historial.from')}</label>
                <input
                  type="date" style={styles.dateInput}
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
              </div>
              <div style={styles.dateGroup}>
                <label style={styles.dateLabel}>{t('historial.to')}</label>
                <input
                  type="date" style={styles.dateInput}
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas Principales */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderColor: '#10b981' }}>
            <div style={styles.statLabel}>{t('reportes.statIncome')}</div>
            <div style={{ ...styles.statValue, color: '#10b981' }}>
              {formatMoney(stats.totalIngresos)}
            </div>
          </div>

          <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
            <div style={styles.statLabel}>{t('reportes.statExpenses')}</div>
            <div style={{ ...styles.statValue, color: '#ef4444' }}>
              {formatMoney(stats.totalGastos)}
            </div>
          </div>

          <div style={{
            ...styles.statCard,
            borderColor: stats.balance >= 0 ? '#10b981' : '#ef4444',
            backgroundColor: stats.balance >= 0 ? '#f0fdf4' : '#fef2f2'
          }}>
            <div style={styles.statLabel}>{t('reportes.statBalance')}</div>
            <div style={{ ...styles.statValue, color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
              {formatMoney(stats.balance)}
            </div>
          </div>

          <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
            <div style={styles.statLabel}>{t('reportes.statProcedures')}</div>
            <div style={{ ...styles.statValue, color: '#3b82f6' }}>
              {stats.totalProcedimientos}
            </div>
          </div>

          <div style={{ ...styles.statCard, borderColor: '#8b5cf6' }}>
            <div style={styles.statLabel}>{t('reportes.statAppointments')}</div>
            <div style={{ ...styles.statValue, color: '#8b5cf6' }}>
              {stats.totalCitas}
            </div>
          </div>

          <div style={{ ...styles.statCard, borderColor: '#06b6d4' }}>
            <div style={styles.statLabel}>{t('reportes.statPayments')}</div>
            <div style={{ ...styles.statValue, color: '#06b6d4' }}>
              {stats.totalPagos}
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div style={styles.chartsGrid}>
          {/* Gráfico 1: Ingresos vs Gastos */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t('reportes.chartIncomeVsExpenses')}</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={graficoIngresos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={value => formatMoney(value)} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} name={t('reportes.seriesIncome')} />
                <Line type="monotone" dataKey="gastos"   stroke="#ef4444" strokeWidth={3} name={t('reportes.seriesExpenses')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 2: Procedimientos por Categoría */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t('reportes.chartProceduresByCategory')}</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={graficoProcedimientos}
                  cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100} fill="#8884d8" dataKey="value"
                >
                  {graficoProcedimientos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 3: Gastos por Categoría */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t('reportes.chartExpensesByCategory')}</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoCategoriasGastos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={value => formatMoney(value)} />
                <Bar dataKey="monto" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 4: Métodos de Pago */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t('reportes.chartPaymentMethods')}</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={graficoMetodosPago}
                  cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100} fill="#8884d8" dataKey="value"
                >
                  {graficoMetodosPago.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
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
  content: { flex: 1, padding: '24px', overflowY: 'auto', maxWidth: '1400px', width: '100%', margin: '0 auto' },
  filtersSection: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e5e7eb' },
  filtersRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  periodoButton: { padding: '10px 20px', backgroundColor: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s' },
  periodoButtonActive: { backgroundColor: '#1e40af', borderColor: '#1e40af', color: '#ffffff' },
  customDateRow: { display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' },
  dateGroup: { flex: 1, minWidth: '200px' },
  dateLabel: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  dateInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '2px solid', textAlign: 'center' },
  statLabel: { fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' },
  statValue: { fontSize: '24px', fontWeight: '700' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' },
  chartCard: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' },
  chartTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' },
}