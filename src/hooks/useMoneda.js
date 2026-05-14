import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Configuración de monedas por país
 * Cada dentista puede elegir su moneda en configuración
 */
const MONEDAS = {
  PYG: { codigo: 'PYG', simbolo: 'Gs.', locale: 'es-PY', decimales: 0, separadorMiles: '.', separadorDecimal: ',' },
  USD: { codigo: 'USD', simbolo: '$',    locale: 'en-US', decimales: 2, separadorMiles: ',', separadorDecimal: '.' },
  BRL: { codigo: 'BRL', simbolo: 'R$',   locale: 'pt-BR', decimales: 2, separadorMiles: '.', separadorDecimal: ',' },
  ARS: { codigo: 'ARS', simbolo: '$',    locale: 'es-AR', decimales: 2, separadorMiles: '.', separadorDecimal: ',' },
  CLP: { codigo: 'CLP', simbolo: '$',    locale: 'es-CL', decimales: 0, separadorMiles: '.', separadorDecimal: ',' },
  BOB: { codigo: 'BOB', simbolo: 'Bs.',  locale: 'es-BO', decimales: 2, separadorMiles: '.', separadorDecimal: ',' },
  UYU: { codigo: 'UYU', simbolo: '$U',   locale: 'es-UY', decimales: 2, separadorMiles: '.', separadorDecimal: ',' },
}

const PAIS_A_MONEDA = {
  PY: 'PYG', BR: 'BRL', AR: 'ARS', CL: 'CLP', BO: 'BOB', UY: 'UYU', US: 'USD'
}

/**
 * Hook para formatear moneda según configuración del usuario
 * 
 * Uso:
 *   const { formatMoney, monedaActual, monedas } = useMoneda()
 *   formatMoney(150000)        → "Gs. 150.000"
 *   formatMoney(30, 'USD')     → "$30.00"
 *   formatMoney(99.90, 'BRL')  → "R$ 99,90"
 */
export function useMoneda(codigoMoneda = null) {
  // Obtener moneda guardada en localStorage o usar PYG por defecto
  const monedaGuardada = codigoMoneda || localStorage.getItem('odontolog_moneda') || 'PYG'
  const config = MONEDAS[monedaGuardada] || MONEDAS.PYG

  const formatMoney = useCallback((valor, monedaOverride = null) => {
    const conf = monedaOverride ? (MONEDAS[monedaOverride] || config) : config
    
    if (valor === null || valor === undefined) return `${conf.simbolo} 0`
    
    const numero = Number(valor)
    if (isNaN(numero)) return `${conf.simbolo} 0`

    try {
      const formatted = new Intl.NumberFormat(conf.locale, {
        minimumFractionDigits: conf.decimales,
        maximumFractionDigits: conf.decimales,
      }).format(numero)
      
      return `${conf.simbolo} ${formatted}`
    } catch {
      // Fallback manual
      const parts = numero.toFixed(conf.decimales).split('.')
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, conf.separadorMiles)
      const decPart = parts[1] ? `${conf.separadorDecimal}${parts[1]}` : ''
      return `${conf.simbolo} ${intPart}${decPart}`
    }
  }, [config])

  const setMoneda = useCallback((codigo) => {
    if (MONEDAS[codigo]) {
      localStorage.setItem('odontolog_moneda', codigo)
      window.location.reload() // Recargar para aplicar en toda la app
    }
  }, [])

  const getMonedaPorPais = useCallback((codigoPais) => {
    const monedaCodigo = PAIS_A_MONEDA[codigoPais]
    return monedaCodigo ? MONEDAS[monedaCodigo] : MONEDAS.USD
  }, [])

  return {
    formatMoney,
    setMoneda,
    getMonedaPorPais,
    monedaActual: config,
    monedas: MONEDAS,
    codigoActual: monedaGuardada
  }
}