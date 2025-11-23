import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordScreen() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      alert('❌ Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      alert('✅ Contraseña actualizada correctamente')
      navigate('/dashboard')
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h1 style={styles.title}>Nueva Contraseña</h1>
          <p style={styles.subtitle}>
            Ingresa tu nueva contraseña de forma segura
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          {password && confirmPassword && (
            <div style={{
              ...styles.matchIndicator,
              color: password === confirmPassword ? '#10b981' : '#ef4444'
            }}>
              {password === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || password !== confirmPassword}
            style={{
              ...styles.submitButton,
              opacity: (loading || password !== confirmPassword) ? 0.6 : 1,
              cursor: (loading || password !== confirmPassword) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Actualizando...' : '🔑 Actualizar Contraseña'}
          </button>
        </form>

        <div style={styles.securityNote}>
          <p style={styles.securityText}>
            🔒 Tu contraseña será encriptada de forma segura
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '15px',
    lineHeight: '1.5',
  },
  form: {
    marginBottom: '24px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  },
  matchIndicator: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '20px',
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'all 0.3s',
  },
  securityNote: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
  },
  securityText: {
    color: '#1e40af',
    fontSize: '13px',
    margin: 0,
  },
}