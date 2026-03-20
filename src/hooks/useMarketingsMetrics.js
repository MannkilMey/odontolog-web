import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMarketingMetrics() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosPremium: 0,
    churnRate: 0,
    ltv: 0,
    cac: 0,
    segmentos: {},
    ingresos: {
      mensual: 0,
      total: 0
    }
  })

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      setLoading(true)

      // 1. Métricas básicas de usuarios
      const { data: usuarios } = await supabase
        .from('suscripciones_usuarios')
        .select(`
          dentista_id,
          plan:planes_suscripcion(nombre, monto_total),
          fecha_inicio
        `)

      // 2. Análisis de churn
      const { data: churnData } = await supabase
        .from('analisis_churn')
        .select('estado_actual, score_riesgo_churn')

      // 3. Segmentos de clientes
      const { data: segmentosData } = await supabase
        .from('segmentos_clientes')
        .select('segmento_principal, valor_total')

      // 4. Métricas LTV/CAC
      const { data: ltvData } = await supabase
        .from('metricas_ltv_cac')
        .select('ltv_actual, cac, total_pagado')

      // Procesar datos
      const totalUsuarios = usuarios?.length || 0
      const usuariosActivos = churnData?.filter(c => c.estado_actual === 'activo').length || 0
      const usuariosPremium = usuarios?.filter(u => u.plan?.nombre !== 'Gratuito').length || 0
      
      const usuariosChurn = churnData?.filter(c => c.estado_actual === 'churned').length || 0
      const churnRate = totalUsuarios > 0 ? (usuariosChurn / totalUsuarios * 100) : 0

      const ltvPromedio = ltvData?.reduce((sum, item) => sum + (item.ltv_actual || 0), 0) / (ltvData?.length || 1)
      const cacPromedio = ltvData?.reduce((sum, item) => sum + (item.cac || 0), 0) / (ltvData?.length || 1)

      // Agrupar segmentos
      const segmentos = segmentosData?.reduce((acc, seg) => {
        acc[seg.segmento_principal] = (acc[seg.segmento_principal] || 0) + 1
        return acc
      }, {}) || {}

      // Calcular ingresos
      const ingresoTotal = ltvData?.reduce((sum, item) => sum + (item.total_pagado || 0), 0) || 0
      const ingresoMensual = usuarios
        ?.filter(u => u.plan?.nombre !== 'Gratuito')
        .reduce((sum, u) => sum + (u.plan?.monto_total || 0), 0) || 0

      setMetrics({
        totalUsuarios,
        usuariosActivos,
        usuariosPremium,
        churnRate: churnRate.toFixed(2),
        ltv: ltvPromedio.toFixed(2),
        cac: cacPromedio.toFixed(2),
        segmentos,
        ingresos: {
          mensual: ingresoMensual,
          total: ingresoTotal
        }
      })

    } catch (error) {
      console.error('Error loading marketing metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return { metrics, loading, refresh: loadMetrics }
}