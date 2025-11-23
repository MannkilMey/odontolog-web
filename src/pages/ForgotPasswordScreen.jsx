import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://odontolog.lat/reset-password',
      })
      
      if (error) throw error
      
      setEmailSent(true)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.successTitle}>¡Correo Enviado!</h1>
          <p style={styles.successText}>
            Revisa tu bandeja de entrada en <strong>{email}</strong>
          </p>
          <p style={styles.successSubtext}>
            Te enviamos un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
          </p>
          <button 
            onClick={() => navigate('/login')}
            style={styles.backToLoginButton}
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button 
          onClick={() => navigate('/login')}
          style={styles.backButton}
        >
          ← Volver
        </button>

        <div style={styles.header}>
          <div style={styles.icon}>🔑</div>
          <h1 style={styles.title}>¿Olvidaste tu contraseña?</h1>
          <p style={styles.subtitle}>
            No te preocupes, te enviaremos instrucciones para restablecerla
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={styles.input}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Enviando...' : '📧 Enviar Instrucciones'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ¿Recordaste tu contraseña?{' '}
            <button 
              onClick={() => navigate('/login')}
              style={styles.footerLink}
            >
              Inicia Sesión
            </button>
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
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#1E40AF',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '20px',
    padding: '5px 0',
    fontWeight: '500',
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
  footer: {
    textAlign: 'center',
  },
  footerText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  footerLink: {
    background: 'none',
    border: 'none',
    color: '#1E40AF',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  successIcon: {
    fontSize: '64px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  successTitle: {
    color: '#10b981',
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '16px',
  },
  successText: {
    color: '#1f2937',
    fontSize: '16px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  successSubtext: {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '30px',
    lineHeight: '1.5',
  },
  backToLoginButton: {
    width: '100%',
    padding: '14px',
    background: '#1E40AF',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}