import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSelector from '../components/LanguageSelector'

export default function RegistrationScreen({ onBack, onLogin }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [clinica, setClinica] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            nombre,
            apellido,
            clinica
          }
        }
      })
      if (error) throw error
      alert(t('register.successMessage'))
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      
      <div style={{ position: 'absolute', top: '20px', right: '24px', zIndex: 10 }}>
        <LanguageSelector compact showCurrency={false} dark />
      </div>

      <div style={{ maxWidth: '450px', width: '100%', background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: '#1E40AF', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: '5px 0' }}
        >
          {t('common.back')}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1E40AF', fontSize: '2em', marginBottom: '10px' }}>
            🦷 OdontoLog
          </h1>
          <p style={{ color: '#6b7280' }}>
            {t('register.tagline')}
          </p>
        </div>

        <form onSubmit={handleSignUp}>
          <InputField 
            label={t('patients.firstName')}
            type="text"
            value={nombre}
            onChange={setNombre}
            placeholder={t('register.namePlaceholder')}
            required
          />
          <InputField 
            label={t('patients.lastName')}
            type="text"
            value={apellido}
            onChange={setApellido}
            placeholder={t('register.lastNamePlaceholder')}
            required
          />
          <InputField 
            label={t('register.clinicOptional')}
            type="text"
            value={clinica}
            onChange={setClinica}
            placeholder={t('register.clinicPlaceholder')}
          />
          <InputField 
            label={t('common.email')}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t('login.emailPlaceholder')}
            required
          />
          <InputField 
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t('register.passwordPlaceholder')}
            required
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : '#1E40AF', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '20px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.3s' }}
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

        <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
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

function InputField({ label, type, value, onChange, placeholder, required = false }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '6px', color: '#374151', fontSize: '14px', fontWeight: '500' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', transition: 'border-color 0.3s', boxSizing: 'border-box' }}
        onFocus={(e) => e.target.style.borderColor = '#1E40AF'}
        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
      />
    </div>
  )
}