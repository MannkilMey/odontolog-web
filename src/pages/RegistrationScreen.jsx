import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSelector from '../components/LanguageSelector'

const MONEDAS_POR_PAIS = {
  PY: { moneda: 'PYG', simbolo: 'Gs.'  },
  AR: { moneda: 'ARS', simbolo: '$'    },
  BR: { moneda: 'BRL', simbolo: 'R$'   },
  US: { moneda: 'USD', simbolo: '$'    },
  UY: { moneda: 'UYU', simbolo: '$U'   },
  CL: { moneda: 'CLP', simbolo: '$'    },
  BO: { moneda: 'BOB', simbolo: 'Bs.'  },
  VE: { moneda: 'VES', simbolo: 'Bs.S' },
  CO: { moneda: 'COP', simbolo: '$'    },
  PE: { moneda: 'PEN', simbolo: 'S/.'  },
  EC: { moneda: 'USD', simbolo: '$'    },
  ES: { moneda: 'EUR', simbolo: '€'    },
  DE: { moneda: 'EUR', simbolo: '€'    },
  FR: { moneda: 'EUR', simbolo: '€'    },
  IT: { moneda: 'EUR', simbolo: '€'    },
  PT: { moneda: 'EUR', simbolo: '€'    },
}

const CODIGOS_PAIS = {
  PY: { prefijo: '+595', ejemplo: '994 747 584'   },
  AR: { prefijo: '+54',  ejemplo: '11 1234 5678'  },
  BR: { prefijo: '+55',  ejemplo: '11 91234 5678' },
  US: { prefijo: '+1',   ejemplo: '555 123 4567'  },
  UY: { prefijo: '+598', ejemplo: '99 123 456'    },
  CL: { prefijo: '+56',  ejemplo: '9 1234 5678'   },
  BO: { prefijo: '+591', ejemplo: '7 123 4567'    },
  VE: { prefijo: '+58',  ejemplo: '412 123 4567'  },
  CO: { prefijo: '+57',  ejemplo: '310 123 4567'  },
  PE: { prefijo: '+51',  ejemplo: '9 1234 5678'   },
  EC: { prefijo: '+593', ejemplo: '9 9123 4567'   },
  ES: { prefijo: '+34',  ejemplo: '612 345 678'   },
  DE: { prefijo: '+49',  ejemplo: '151 1234 5678' },
  FR: { prefijo: '+33',  ejemplo: '6 12 34 56 78' },
  IT: { prefijo: '+39',  ejemplo: '312 345 6789'  },
  PT: { prefijo: '+351', ejemplo: '912 345 678'   },
}

export default function RegistrationScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [nombre,           setNombre]           = useState('')
  const [apellido,         setApellido]         = useState('')
  const [clinica,          setClinica]          = useState('')
  const [email,            setEmail]            = useState('')
  const [emailError,       setEmailError]       = useState('')
  const [password,         setPassword]         = useState('')
  const [passwordConfirm,  setPasswordConfirm]  = useState('')
  const [passwordError,    setPasswordError]    = useState('')
  const [telefono,         setTelefono]         = useState('')
  const [telefonoError,    setTelefonoError]    = useState('')
  const [pais,             setPais]             = useState('PY')
  const [moneda,           setMoneda]           = useState('PYG')
  const [simboloMoneda,    setSimboloMoneda]    = useState('Gs.')
  const [idioma,           setIdioma]           = useState('es')
  const [loading,          setLoading]          = useState(false)

  // ─── Validaciones ────────────────────────────────────────────────────────

  const validarEmail = (valor) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!valor.trim()) {
      setEmailError(t('errors.requiredField', { field: t('common.email') }))
      return false
    }
    if (!regex.test(valor)) {
      setEmailError(t('errors.invalidEmail'))
      return false
    }
    setEmailError('')
    return true
  }

  const validarPassword = (valor, confirmacion) => {
    if (!valor.trim()) {
      setPasswordError(t('errors.requiredField', { field: t('auth.password') }))
      return false
    }
    if (valor.length < 6) {
      setPasswordError(t('register.passwordTooShort'))
      return false
    }
    if (confirmacion && valor !== confirmacion) {
      setPasswordError(t('register.passwordMismatch'))
      return false
    }
    setPasswordError('')
    return true
  }

  const validarTelefono = (valor) => {
    const soloNumeros = valor.replace(/\D/g, '')
    if (!valor.trim()) {
      setTelefonoError(t('errors.requiredField', { field: t('common.phone') }))
      return false
    }
    const numerosNormalizados = soloNumeros.startsWith('0')
      ? soloNumeros.slice(1)
      : soloNumeros
    if (numerosNormalizados.length < 6 || numerosNormalizados.length > 13) {
      setTelefonoError(t('register.phoneInvalid'))
      return false
    }
    setTelefonoError('')
    return true
  }

  const handlePaisChange = (nuevoPais) => {
    setPais(nuevoPais)
    const m = MONEDAS_POR_PAIS[nuevoPais]
    if (m) { setMoneda(m.moneda); setSimboloMoneda(m.simbolo) }
    const prefijosConocidos = Object.values(CODIGOS_PAIS).map(c => c.prefijo)
    const soloTienePrefijo = prefijosConocidos.some(p => telefono.trim() === p)
    if (!telefono.trim() || soloTienePrefijo) setTelefono('')
    setTelefonoError('')
  }

  const handleSignUp = async (e) => {
    e.preventDefault()

    // Validar todos los campos antes de enviar
    const emailOk    = validarEmail(email)
    const passOk     = validarPassword(password, passwordConfirm)
    const telefonoOk = validarTelefono(telefono)
    if (!emailOk || !passOk || !telefonoOk) return

    setLoading(true)

    try {
      const prefijo = CODIGOS_PAIS[pais]?.prefijo || ''
      const telefonoLimpio = telefono.trim()
      const numeroSinCero = telefonoLimpio.replace(/^0+/, '')
      const telefonoCompleto = numeroSinCero.startsWith(prefijo)
        ? numeroSinCero
        : `${prefijo} ${numeroSinCero}`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            apellido,
            clinica,
            telefono:       telefonoCompleto,
            pais,
            moneda,
            simbolo_moneda: simboloMoneda,
            idioma,
          }
        }
      })
      if (error) throw error

      i18n.changeLanguage(idioma)
      localStorage.setItem('odontolog_idioma', idioma)
      localStorage.setItem('odontolog_moneda', moneda)

      alert(t('register.successMessage'))
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const paises = [
    { code: 'PY', flag: '🇵🇾', key: 'countries.PY' },
    { code: 'AR', flag: '🇦🇷', key: 'countries.AR' },
    { code: 'BR', flag: '🇧🇷', key: 'countries.BR' },
    { code: 'CL', flag: '🇨🇱', key: 'countries.CL' },
    { code: 'UY', flag: '🇺🇾', key: 'countries.UY' },
    { code: 'BO', flag: '🇧🇴', key: 'countries.BO' },
    { code: 'CO', flag: '🇨🇴', key: 'countries.CO' },
    { code: 'PE', flag: '🇵🇪', key: 'countries.PE' },
    { code: 'VE', flag: '🇻🇪', key: 'countries.VE' },
    { code: 'EC', flag: '🇪🇨', key: 'countries.EC' },
    { code: 'US', flag: '🇺🇸', key: 'countries.US' },
    { code: 'ES', flag: '🇪🇸', key: 'countries.ES' },
    { code: 'DE', flag: '🇩🇪', key: 'countries.DE' },
    { code: 'FR', flag: '🇫🇷', key: 'countries.FR' },
    { code: 'IT', flag: '🇮🇹', key: 'countries.IT' },
    { code: 'PT', flag: '🇵🇹', key: 'countries.PT' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '24px', zIndex: 10 }}>
        <LanguageSelector compact showCurrency={false} dark />
      </div>

      <div style={{
        maxWidth: '500px', width: '100%', background: 'white',
        borderRadius: '16px', padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: '#1E40AF', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: '5px 0' }}
        >
          {t('common.back')}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1E40AF', fontSize: '2em', marginBottom: '10px' }}>🦷 OdontoLog</h1>
          <p style={{ color: '#6b7280' }}>{t('register.tagline')}</p>
        </div>

        <form onSubmit={handleSignUp}>

          {/* Nombre y Apellido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InputField
              label={t('patients.firstName')} type="text"
              value={nombre} onChange={setNombre}
              placeholder={t('register.namePlaceholder')} required
            />
            <InputField
              label={t('patients.lastName')} type="text"
              value={apellido} onChange={setApellido}
              placeholder={t('register.lastNamePlaceholder')} required
            />
          </div>

          <InputField
            label={t('register.clinicOptional')} type="text"
            value={clinica} onChange={setClinica}
            placeholder={t('register.clinicPlaceholder')}
          />

          {/* Email con validación */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {t('common.email')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (emailError) validarEmail(e.target.value)
              }}
              onBlur={e => validarEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              required
              style={{
                width: '100%', padding: '12px',
                border: `2px solid ${emailError ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '8px', fontSize: '14px',
                boxSizing: 'border-box', transition: 'border-color 0.3s'
              }}
              onFocus={e => e.target.style.borderColor = '#1E40AF'}
            />
            {emailError && <p style={errorStyle}>{emailError}</p>}
          </div>

          {/* Password con confirmación */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {t('auth.password')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (passwordError) validarPassword(e.target.value, passwordConfirm)
              }}
              onBlur={e => validarPassword(e.target.value, passwordConfirm)}
              placeholder={t('register.passwordPlaceholder')}
              required
              style={{
                width: '100%', padding: '12px',
                border: `2px solid ${passwordError ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '8px', fontSize: '14px',
                boxSizing: 'border-box', transition: 'border-color 0.3s',
                marginBottom: '8px'
              }}
              onFocus={e => e.target.style.borderColor = '#1E40AF'}
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => {
                setPasswordConfirm(e.target.value)
                if (passwordError) validarPassword(password, e.target.value)
              }}
              onBlur={e => validarPassword(password, e.target.value)}
              placeholder={t('register.passwordConfirmPlaceholder')}
              required
              style={{
                width: '100%', padding: '12px',
                border: `2px solid ${passwordError ? '#ef4444' : passwordConfirm && password === passwordConfirm ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '8px', fontSize: '14px',
                boxSizing: 'border-box', transition: 'border-color 0.3s'
              }}
              onFocus={e => e.target.style.borderColor = '#1E40AF'}
            />
            {passwordError && <p style={errorStyle}>{passwordError}</p>}
            {passwordConfirm && password === passwordConfirm && !passwordError && (
              <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                ✓ {t('register.passwordMatch')}
              </p>
            )}
          </div>

          {/* País + Moneda */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                {t('common.country')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                style={selectStyle}
                value={pais}
                onChange={e => handlePaisChange(e.target.value)}
              >
                {paises.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.flag} {t(p.key)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{t('settings.currency')}</label>
              <div style={{
                padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px',
                backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px',
                height: '46px', boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>
                  {simboloMoneda}
                </span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{moneda}</span>
              </div>
            </div>
          </div>

          {/* Teléfono con código de país */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {t('common.phone')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 12px', border: '2px solid #e5e7eb', borderRadius: '8px',
                backgroundColor: '#f0f9ff', fontSize: '14px', fontWeight: '700',
                color: '#1e40af', whiteSpace: 'nowrap', minWidth: '72px'
              }}>
                {CODIGOS_PAIS[pais]?.prefijo}
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={e => {
                  const val = e.target.value
                  if (/^[\d\s\-\(\)]*$/.test(val)) {
                    setTelefono(val)
                    if (telefonoError) setTelefonoError('')
                  }
                }}
                onBlur={() => validarTelefono(telefono)}
                placeholder={CODIGOS_PAIS[pais]?.ejemplo}
                required
                style={{
                  flex: 1, padding: '12px',
                  border: `2px solid ${telefonoError ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '8px', fontSize: '14px',
                  boxSizing: 'border-box', transition: 'border-color 0.3s'
                }}
                onFocus={e => e.target.style.borderColor = '#1E40AF'}
              />
            </div>
            {telefonoError && <p style={errorStyle}>{telefonoError}</p>}
            <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px', marginBottom: 0 }}>
              {t('register.phoneHint', {
                ejemplo: `${CODIGOS_PAIS[pais]?.prefijo} ${CODIGOS_PAIS[pais]?.ejemplo}`
              })}
            </p>
          </div>

          {/* Idioma */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('settings.language')}</label>
            <select
              style={selectStyle}
              value={idioma}
              onChange={e => setIdioma(e.target.value)}
            >
              <option value="es">🌎 Español</option>
              <option value="pt">🇧🇷 Português</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#94a3b8' : '#1E40AF',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold', marginTop: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.3s'
            }}
          >
            {loading ? t('common.loading') : `🚀 ${t('register.createAccount')}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
          {t('auth.hasAccount')}
          <button
            onClick={() => navigate('/login')}
            style={{ marginLeft: '5px', background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {t('auth.login')}
          </button>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
          <p style={{ fontSize: '14px', color: '#1E40AF', fontWeight: 'bold', marginBottom: '10px' }}>
            {t('login.featuresTitle')}
          </p>
          <ul style={{ fontSize: '13px', color: '#6b7280', margin: 0, paddingLeft: '20px' }}>
            <li>{t('login.feature1')}</li>
            <li>{t('login.feature2')}</li>
            <li>{t('login.feature3')}</li>
            <li>{t('login.feature4')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', marginBottom: '6px',
  color: '#374151', fontSize: '14px', fontWeight: '500'
}

const selectStyle = {
  width: '100%', padding: '12px',
  border: '2px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', backgroundColor: '#ffffff',
  cursor: 'pointer', boxSizing: 'border-box'
}

const errorStyle = {
  color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0
}

function InputField({ label, type, value, onChange, placeholder, required = false }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{
          width: '100%', padding: '12px',
          border: '2px solid #e5e7eb', borderRadius: '8px',
          fontSize: '14px', transition: 'border-color 0.3s',
          boxSizing: 'border-box'
        }}
        onFocus={e => e.target.style.borderColor = '#1E40AF'}
        onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
      />
    </div>
  )
}