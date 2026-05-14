import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMoneda } from '../hooks/useMoneda'

const IDIOMAS = [
  { codigo: 'es', nombre: 'Español', bandera: '🇪🇸' },
  { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
  { codigo: 'pt', nombre: 'Português', bandera: '🇧🇷' },
]

const MONEDAS_LIST = [
  { codigo: 'PYG', nombre: 'Guaraní (Gs.)', bandera: '🇵🇾' },
  { codigo: 'USD', nombre: 'Dólar ($)', bandera: '🇺🇸' },
  { codigo: 'BRL', nombre: 'Real (R$)', bandera: '🇧🇷' },
  { codigo: 'ARS', nombre: 'Peso AR ($)', bandera: '🇦🇷' },
  { codigo: 'CLP', nombre: 'Peso CL ($)', bandera: '🇨🇱' },
  { codigo: 'BOB', nombre: 'Boliviano (Bs.)', bandera: '🇧🇴' },
  { codigo: 'UYU', nombre: 'Peso UY ($U)', bandera: '🇺🇾' },
]

/**
 * Selector compacto de idioma y moneda
 * Puede usarse en header, settings, o sidebar
 * 
 * Props:
 *   showCurrency: boolean (default true) — mostrar selector de moneda
 *   compact: boolean (default false) — modo compacto para header
 *   onChange: () => void — callback después de cambiar
 */
export default function LanguageSelector({ showCurrency = true, compact = false, dark = false, onChange }) {
  const { i18n, t } = useTranslation()
  const { codigoActual, setMoneda } = useMoneda()
  const [isOpen, setIsOpen] = useState(false)

  const idiomaActual = IDIOMAS.find(i => i.codigo === i18n.language?.slice(0, 2)) || IDIOMAS[0]
  const monedaActual = MONEDAS_LIST.find(m => m.codigo === codigoActual) || MONEDAS_LIST[0]

  const cambiarIdioma = (codigo) => {
    i18n.changeLanguage(codigo)
    localStorage.setItem('odontolog_idioma', codigo)
    if (onChange) onChange()
  }

  const cambiarMoneda = (codigo) => {
    setMoneda(codigo)
    if (onChange) onChange()
  }

  // Modo compacto: solo muestra bandera + dropdown
  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...styles.compactButton,
            ...(dark && { color: '#ffffff', borderColor: 'rgba(255,255,255,0.5)' })
          }}
        >
          {idiomaActual.bandera} {idiomaActual.codigo.toUpperCase()}
          {showCurrency && ` • ${monedaActual.codigo}`}
        </button>

        {isOpen && (
          <>
            <div style={styles.backdrop} onClick={() => setIsOpen(false)} />
            <div style={styles.dropdown}>
              <div style={styles.dropdownSection}>
                <div style={styles.dropdownLabel}>{t('settings.language')}</div>
                {IDIOMAS.map(idioma => (
                  <button
                    key={idioma.codigo}
                    onClick={() => { cambiarIdioma(idioma.codigo); setIsOpen(false) }}
                    style={{
                      ...styles.dropdownItem,
                      ...(idioma.codigo === idiomaActual.codigo && styles.dropdownItemActive)
                    }}
                  >
                    <span>{idioma.bandera}</span>
                    <span>{idioma.nombre}</span>
                    {idioma.codigo === idiomaActual.codigo && <span style={styles.check}>✓</span>}
                  </button>
                ))}
              </div>

              {showCurrency && (
                <div style={styles.dropdownSection}>
                  <div style={styles.dropdownLabel}>{t('settings.currency')}</div>
                  {MONEDAS_LIST.map(moneda => (
                    <button
                      key={moneda.codigo}
                      onClick={() => { cambiarMoneda(moneda.codigo); setIsOpen(false) }}
                      style={{
                        ...styles.dropdownItem,
                        ...(moneda.codigo === codigoActual && styles.dropdownItemActive)
                      }}
                    >
                      <span>{moneda.bandera}</span>
                      <span>{moneda.nombre}</span>
                      {moneda.codigo === codigoActual && <span style={styles.check}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // Modo completo: para pantalla de settings
  return (
    <div style={styles.fullContainer}>
      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>{t('settings.language')}</label>
        <select
          value={i18n.language?.slice(0, 2)}
          onChange={e => cambiarIdioma(e.target.value)}
          style={styles.settingSelect}
        >
          {IDIOMAS.map(idioma => (
            <option key={idioma.codigo} value={idioma.codigo}>
              {idioma.bandera} {idioma.nombre}
            </option>
          ))}
        </select>
      </div>

      {showCurrency && (
        <div style={styles.settingRow}>
          <label style={styles.settingLabel}>{t('settings.currency')}</label>
          <select
            value={codigoActual}
            onChange={e => cambiarMoneda(e.target.value)}
            style={styles.settingSelect}
          >
            {MONEDAS_LIST.map(moneda => (
              <option key={moneda.codigo} value={moneda.codigo}>
                {moneda.bandera} {moneda.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

const styles = {
  // Compact mode
  compactContainer: { position: 'relative', display: 'inline-block' },
  compactButton: {
    padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #e5e7eb',
    borderRadius: '8px', fontSize: '13px', fontWeight: '500', color: '#6b7280',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
  },
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
    backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 9999,
    minWidth: '200px', overflow: 'hidden',
  },
  dropdownSection: { padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
  dropdownLabel: {
    padding: '6px 14px', fontSize: '11px', fontWeight: '600', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  dropdownItem: {
    width: '100%', padding: '8px 14px', backgroundColor: 'transparent', border: 'none',
    fontSize: '14px', color: '#374151', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '8px', textAlign: 'left',
  },
  dropdownItemActive: { backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: '600' },
  check: { marginLeft: 'auto', color: '#1e40af', fontWeight: '700' },

  // Full mode (settings)
  fullContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  settingRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  settingLabel: { fontSize: '14px', fontWeight: '500', color: '#374151' },
  settingSelect: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px',
    fontSize: '14px', backgroundColor: '#ffffff', cursor: 'pointer',
  },
}