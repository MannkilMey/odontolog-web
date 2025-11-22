import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegistrationScreen({ onBack, onLogin }) {
  const navigate = useNavigate()
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
      alert('¡Cuenta creada! Revisa tu email para confirmar.')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '450px', width: '100%', background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        
        {/* Botón Volver */}
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#1E40AF', 
            fontSize: '14px', 
            cursor: 'pointer',
            marginBottom: '20px',
            padding: '5px 0'
          }}
        >
          ← Volver
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1E40AF', fontSize: '2em', marginBottom: '10px' }}>
            🦷 OdontoLog
          </h1>
          <p style={{ color: '#6b7280' }}>
            ¡Únete a la revolución digital dental!
          </p>
        </div>

        <form onSubmit={handleSignUp}>
          <InputField 
            label="Nombre"
            type="text"
            value={nombre}
            onChange={setNombre}
            placeholder="Tu nombre"
            required
          />
          <InputField 
            label="Apellido"
            type="text"
            value={apellido}
            onChange={setApellido}
            placeholder="Tu apellido"
            required
          />
          <InputField 
            label="Clínica (opcional)"
            type="text"
            value={clinica}
            onChange={setClinica}
            placeholder="Nombre de tu clínica"
          />
          <InputField 
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@email.com"
            required
          />
          <InputField 
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 6 caracteres"
            required
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: loading ? '#94a3b8' : '#1E40AF',
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
          >
            {loading ? 'Cargando...' : '🚀 Crear Cuenta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
          ¿Ya tienes cuenta?
          <button 
            onClick={() => navigate('/login')}
            style={{ 
              marginLeft: '5px', 
              background: 'none', 
              border: 'none', 
              color: '#1E40AF', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Inicia Sesión
          </button>
        </div>

        {/* Features Preview */}
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
          <p style={{ fontSize: '14px', color: '#1E40AF', fontWeight: 'bold', marginBottom: '10px' }}>✨ Con OdontoLog podrás:</p>
          <ul style={{ fontSize: '13px', color: '#6b7280', margin: 0, paddingLeft: '20px' }}>
            <li>Ver métricas de tu clínica en tiempo real</li>
            <li>Crear odontogramas digitales interactivos</li>
            <li>Gestionar citas con recordatorios automáticos</li>
            <li>Controlar ingresos y gastos fácilmente</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Componente reutilizable InputField
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
        style={{ 
          width: '100%', 
          padding: '12px', 
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          transition: 'border-color 0.3s'
        }}
        onFocus={(e) => e.target.style.borderColor = '#1E40AF'}
        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
      />
    </div>
  )
}