import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Si ya está logueado, redirigir al dashboard
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      navigate('/dashboard')
    }
  }

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logo}>🦷</div>
          <h1 style={styles.title}>OdontoLog</h1>
          <p style={styles.subtitle}>
            Sistema completo de gestión para clínicas dentales
          </p>
          <p style={styles.description}>
            Gestiona pacientes, citas, procedimientos y finanzas en un solo lugar
          </p>
          
          <div style={styles.ctaButtons}>
            <button 
              style={styles.primaryButton}
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
            </button>
            <button 
              style={styles.secondaryButton}
              onClick={() => navigate('/registro')}
            >
              Crear Cuenta Gratis
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={styles.features}>
        <h2 style={styles.featuresTitle}>Todo lo que necesitas</h2>
        
        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>👥</div>
            <h3 style={styles.featureTitle}>Gestión de Pacientes</h3>
            <p style={styles.featureText}>
              Historial completo, odontograma interactivo y seguimiento detallado
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📅</div>
            <h3 style={styles.featureTitle}>Calendario de Citas</h3>
            <p style={styles.featureText}>
              Agenda intuitiva con vistas diarias, semanales y mensuales
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>💰</div>
            <h3 style={styles.featureTitle}>Control Financiero</h3>
            <p style={styles.featureText}>
              Presupuestos, pagos, planes de cuotas y reportes detallados
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🦷</div>
            <h3 style={styles.featureTitle}>Odontograma Digital</h3>
            <p style={styles.featureText}>
              Registro visual completo del estado dental de cada paciente
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Reportes y Análisis</h3>
            <p style={styles.featureText}>
              Gráficos interactivos y métricas clave de tu clínica
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📄</div>
            <h3 style={styles.featureTitle}>Documentos PDF</h3>
            <p style={styles.featureText}>
              Genera presupuestos y recibos profesionales automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>¿Listo para modernizar tu clínica?</h2>
        <p style={styles.ctaText}>
          Comienza gratis hoy mismo. Sin tarjeta de crédito.
        </p>
        <button 
          style={styles.ctaButton}
          onClick={() => navigate('/registro')}
        >
          Crear Cuenta Gratis
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>🦷 OdontoLog</div>
            <p style={styles.footerTagline}>Gestión dental inteligente</p>
          </div>
          
          <div style={styles.footerLinks}>
            <a href="/privacidad" style={styles.footerLink}>Privacidad</a>
            <a href="/terminos" style={styles.footerLink}>Términos</a>
            <a href="mailto:contacto@odontolog.lat" style={styles.footerLink}>Contacto</a>
          </div>
        </div>
        
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>© 2024 OdontoLog. Desarrollado por MCorp.</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
  },
  hero: {
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px 20px',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '800px',
    color: '#ffffff',
  },
  logo: {
    fontSize: '80px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '56px',
    fontWeight: '800',
    marginBottom: '20px',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#f0f0f0',
  },
  description: {
    fontSize: '18px',
    marginBottom: '40px',
    color: '#e0e0e0',
  },
  ctaButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    backgroundColor: '#ffffff',
    color: '#667eea',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  secondaryButton: {
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '2px solid #ffffff',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  features: {
    padding: '80px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featuresTitle: {
    fontSize: '40px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '60px',
    color: '#1f2937',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
  },
  featureCard: {
    padding: '32px',
    backgroundColor: '#f9fafb',
    borderRadius: '16px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    transition: 'all 0.3s',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#1f2937',
  },
  featureText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.6',
  },
  ctaSection: {
    padding: '80px 20px',
    backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1f2937',
  },
  ctaText: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '32px',
  },
  ctaButton: {
    padding: '16px 48px',
    fontSize: '18px',
    fontWeight: '700',
    backgroundColor: '#667eea',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  footer: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: '60px 20px 20px',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '32px',
    marginBottom: '32px',
  },
  footerBrand: {
    flex: '1',
    minWidth: '250px',
  },
  footerLogo: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  footerTagline: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  footerLinks: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: '14px',
    color: '#d1d5db',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingTop: '20px',
    borderTop: '1px solid #374151',
    textAlign: 'center',
  },
  copyright: {
    fontSize: '14px',
    color: '#9ca3af',
  },
}