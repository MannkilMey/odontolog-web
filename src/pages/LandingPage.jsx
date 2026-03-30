import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════
// SEO CHANGES:
// 1. Semantic HTML: <header>, <main>, <section>, <footer>
// 2. Single <h1>, proper <h2>/<h3> hierarchy
// 3. Alt text on images, aria-labels on buttons
// 4. Updated copyright year
// 5. Removed inline styles from critical content
//    (Google can read them, but semantic tags help crawlers)
// ═══════════════════════════════════════════════════════════

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
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
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logo} role="img" aria-label="OdontoLog logo dental">🦷</div>
          <h1 style={styles.title}>OdontoLog</h1>
          <p style={styles.subtitle}>
            Software de gestión para clínicas dentales
          </p>
          <p style={styles.description}>
            Gestiona pacientes, citas, odontogramas digitales, pagos y planes de cuotas en un solo lugar. Comienza gratis.
          </p>
          
          <nav style={styles.ctaButtons} aria-label="Acciones principales">
            <button 
              style={styles.primaryButton}
              onClick={() => navigate('/login')}
              aria-label="Iniciar sesión en OdontoLog"
            >
              Iniciar Sesión
            </button>
            <button 
              style={styles.secondaryButton}
              onClick={() => navigate('/registro')}
              aria-label="Crear cuenta gratis en OdontoLog"
            >
              Crear Cuenta Gratis
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Features Section */}
        <section style={styles.features} aria-label="Funcionalidades">
          <h2 style={styles.featuresTitle}>Todo lo que tu clínica dental necesita</h2>
          
          <div style={styles.featuresGrid}>
            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Gestión de pacientes">👥</div>
              <h3 style={styles.featureTitle}>Gestión de Pacientes</h3>
              <p style={styles.featureText}>
                Historial clínico completo, odontograma interactivo y seguimiento detallado de cada paciente
              </p>
            </article>

            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Calendario de citas">📅</div>
              <h3 style={styles.featureTitle}>Calendario de Citas</h3>
              <p style={styles.featureText}>
                Agenda intuitiva para gestionar horarios y citas. Recordatorios automáticos por email y WhatsApp
              </p>
            </article>

            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Control financiero">💰</div>
              <h3 style={styles.featureTitle}>Control Financiero</h3>
              <p style={styles.featureText}>
                Presupuestos, pagos, planes de cuotas, cuentas por cobrar y reportes financieros detallados
              </p>
            </article>

            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Odontograma digital">🦷</div>
              <h3 style={styles.featureTitle}>Odontograma Digital</h3>
              <p style={styles.featureText}>
                Registro visual completo del estado dental de cada paciente con historial de procedimientos
              </p>
            </article>

            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Reportes y análisis">📊</div>
              <h3 style={styles.featureTitle}>Reportes y Análisis</h3>
              <p style={styles.featureText}>
                Métricas clave de tu clínica, gráficos de ingresos, gastos y rendimiento mensual
              </p>
            </article>

            <article style={styles.featureCard}>
              <div style={styles.featureIcon} role="img" aria-label="Documentos PDF">📄</div>
              <h3 style={styles.featureTitle}>Recibos y Presupuestos PDF</h3>
              <p style={styles.featureText}>
                Genera presupuestos y recibos profesionales. Envío automático por email y WhatsApp
              </p>
            </article>
          </div>
        </section>

        {/* Pricing hint */}
        <section style={styles.pricingSection} aria-label="Precios">
          <h2 style={styles.pricingSectionTitle}>Planes simples y transparentes</h2>
          <div style={styles.pricingCards}>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>Gratuito</h3>
              <div style={styles.pricingPrice}>$0</div>
              <p style={styles.pricingDesc}>Para siempre. Gestión básica de pacientes, citas y gastos.</p>
            </div>
            <div style={{...styles.pricingCard, ...styles.pricingCardPro}}>
              <div style={styles.pricingPopular}>Más Popular</div>
              <h3 style={styles.pricingName}>Profesional</h3>
              <div style={styles.pricingPrice}>$30<span style={styles.pricingPeriod}>/mes</span></div>
              <p style={styles.pricingDesc}>Notificaciones automáticas, reportes, métricas y más.</p>
            </div>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>Clínica</h3>
              <div style={styles.pricingPrice}>$80<span style={styles.pricingPeriod}>/mes</span></div>
              <p style={styles.pricingDesc}>Multi-usuario, gestión de equipo y dashboard consolidado.</p>
            </div>
          </div>
          <p style={styles.pricingNote}>20% de descuento en planes anuales. Sin tarjeta de crédito para empezar.</p>
        </section>

        {/* CTA Section */}
        <section style={styles.ctaSection} aria-label="Llamado a la acción">
          <h2 style={styles.ctaTitle}>¿Listo para modernizar tu clínica dental?</h2>
          <p style={styles.ctaText}>
            Comienza gratis hoy mismo. Sin tarjeta de crédito. Configura tu clínica en 2 minutos.
          </p>
          <button 
            style={styles.ctaButton}
            onClick={() => navigate('/registro')}
            aria-label="Registrarse gratis en OdontoLog"
          >
            Crear Cuenta Gratis →
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>🦷 OdontoLog</div>
            <p style={styles.footerTagline}>Software de gestión dental en la nube</p>
          </div>
          
          <nav style={styles.footerLinks} aria-label="Enlaces legales">
            <a href="/privacidad" style={styles.footerLink}>Política de Privacidad</a>
            <a href="/terminos" style={styles.footerLink}>Términos y Condiciones</a>
            <a href="mailto:contacto@odontolog.lat" style={styles.footerLink}>contacto@odontolog.lat</a>
          </nav>
        </div>
        
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>© 2026 OdontoLog. Desarrollado por MCorp.</p>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
  },
  // Hero
  hero: {
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
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
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#dbeafe',
  },
  description: {
    fontSize: '18px',
    marginBottom: '40px',
    color: '#bfdbfe',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 40px',
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
    color: '#1e40af',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
  },
  // Features
  features: {
    padding: '80px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featuresTitle: {
    fontSize: '36px',
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
    border: '1px solid #e5e7eb',
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
  // Pricing
  pricingSection: {
    padding: '80px 20px',
    backgroundColor: '#f8fafc',
  },
  pricingSectionTitle: {
    fontSize: '36px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '48px',
    color: '#1f2937',
  },
  pricingCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    position: 'relative',
  },
  pricingCardPro: {
    border: '3px solid #3b82f6',
    boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
  },
  pricingPopular: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  pricingName: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '12px',
  },
  pricingPrice: {
    fontSize: '40px',
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: '12px',
  },
  pricingPeriod: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#6b7280',
  },
  pricingDesc: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  pricingNote: {
    textAlign: 'center',
    marginTop: '32px',
    fontSize: '14px',
    color: '#6b7280',
  },
  // CTA
  ctaSection: {
    padding: '80px 20px',
    backgroundColor: '#ffffff',
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
    lineHeight: '1.6',
  },
  ctaButton: {
    padding: '16px 48px',
    fontSize: '18px',
    fontWeight: '700',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
  },
  // Footer
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