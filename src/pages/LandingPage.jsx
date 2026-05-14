import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSelector from '../components/LanguageSelector'

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
        {/* Language selector flotante */}
        <div style={styles.langSelectorWrapper}>
          <LanguageSelector compact showCurrency={false} dark/>
        </div>

        <div style={styles.heroContent}>
          <div style={styles.logo} role="img" aria-label="OdontoLog logo dental">🦷</div>
          <h1 style={styles.title}>OdontoLog</h1>
          <p style={styles.subtitle}>
            {t('landing.subtitle')}
          </p>
          <p style={styles.description}>
            {t('landing.description')}
          </p>
          
          <nav style={styles.ctaButtons} aria-label={t('landing.mainActions')}>
            <button 
              style={styles.primaryButton}
              onClick={() => navigate('/login')}
              aria-label={t('auth.login')}
            >
              {t('auth.login')}
            </button>
            <button 
              style={styles.secondaryButton}
              onClick={() => navigate('/registro')}
              aria-label={t('landing.createFreeAccount')}
            >
              {t('landing.createFreeAccount')}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Features Section */}
        <section style={styles.features} aria-label={t('landing.features')}>
          <h2 style={styles.featuresTitle}>{t('landing.featuresTitle')}</h2>
          
          <div style={styles.featuresGrid}>
            {[
              { icon: '👥', titleKey: 'landing.feature1Title', textKey: 'landing.feature1Text' },
              { icon: '📅', titleKey: 'landing.feature2Title', textKey: 'landing.feature2Text' },
              { icon: '💰', titleKey: 'landing.feature3Title', textKey: 'landing.feature3Text' },
              { icon: '🦷', titleKey: 'landing.feature4Title', textKey: 'landing.feature4Text' },
              { icon: '📊', titleKey: 'landing.feature5Title', textKey: 'landing.feature5Text' },
              { icon: '📄', titleKey: 'landing.feature6Title', textKey: 'landing.feature6Text' },
            ].map((feature, i) => (
              <article key={i} style={styles.featureCard}>
                <div style={styles.featureIcon} role="img">{feature.icon}</div>
                <h3 style={styles.featureTitle}>{t(feature.titleKey)}</h3>
                <p style={styles.featureText}>{t(feature.textKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pricing hint */}
        <section style={styles.pricingSection} aria-label={t('landing.pricing')}>
          <h2 style={styles.pricingSectionTitle}>{t('landing.pricingTitle')}</h2>
          <div style={styles.pricingCards}>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>{t('landing.planFree')}</h3>
              <div style={styles.pricingPrice}>$0</div>
              <p style={styles.pricingDesc}>{t('landing.planFreeDesc')}</p>
            </div>
            <div style={{...styles.pricingCard, ...styles.pricingCardPro}}>
              <div style={styles.pricingPopular}>{t('plans.mostPopular')}</div>
              <h3 style={styles.pricingName}>{t('landing.planPro')}</h3>
              <div style={styles.pricingPrice}>$30<span style={styles.pricingPeriod}>/{t('common.month')}</span></div>
              <p style={styles.pricingDesc}>{t('landing.planProDesc')}</p>
            </div>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>{t('landing.planEnterprise')}</h3>
              <div style={styles.pricingPrice}>$80<span style={styles.pricingPeriod}>/{t('common.month')}</span></div>
              <p style={styles.pricingDesc}>{t('landing.planEnterpriseDesc')}</p>
            </div>
          </div>
          <p style={styles.pricingNote}>{t('landing.pricingNote')}</p>
        </section>

        {/* CTA Section */}
        <section style={styles.ctaSection} aria-label="CTA">
          <h2 style={styles.ctaTitle}>{t('landing.ctaTitle')}</h2>
          <p style={styles.ctaText}>{t('landing.ctaText')}</p>
          <button 
            style={styles.ctaButton}
            onClick={() => navigate('/registro')}
            aria-label={t('landing.createFreeAccount')}
          >
            {t('landing.createFreeAccount')} →
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>🦷 OdontoLog</div>
            <p style={styles.footerTagline}>{t('landing.footerTagline')}</p>
          </div>
          
          <nav style={styles.footerLinks} aria-label={t('landing.legalLinks')}>
            <a href="/privacidad" style={styles.footerLink}>{t('landing.privacy')}</a>
            <a href="/terminos" style={styles.footerLink}>{t('landing.terms')}</a>
            <a href="mailto:contacto@odontolog.lat" style={styles.footerLink}>contacto@odontolog.lat</a>
          </nav>
        </div>
        
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>© 2026 OdontoLog. {t('landing.developedBy')}</p>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#ffffff' },
  hero: { minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)', padding: '40px 20px', position: 'relative' },
  langSelectorWrapper: { position: 'absolute', top: '20px', right: '24px', zIndex: 10 },
  heroContent: { textAlign: 'center', maxWidth: '800px', color: '#ffffff' },
  logo: { fontSize: '80px', marginBottom: '20px' },
  title: { fontSize: '56px', fontWeight: '800', marginBottom: '20px', color: '#ffffff', letterSpacing: '-1px' },
  subtitle: { fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#dbeafe' },
  description: { fontSize: '18px', marginBottom: '40px', color: '#bfdbfe', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 40px' },
  ctaButtons: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  primaryButton: { padding: '16px 32px', fontSize: '18px', fontWeight: '700', backgroundColor: '#ffffff', color: '#1e40af', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  secondaryButton: { padding: '16px 32px', fontSize: '18px', fontWeight: '700', backgroundColor: 'transparent', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '12px', cursor: 'pointer' },
  features: { padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' },
  featuresTitle: { fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '60px', color: '#1f2937' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' },
  featureCard: { padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px', textAlign: 'center', border: '1px solid #e5e7eb' },
  featureIcon: { fontSize: '48px', marginBottom: '16px' },
  featureTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' },
  featureText: { fontSize: '16px', color: '#6b7280', lineHeight: '1.6' },
  pricingSection: { padding: '80px 20px', backgroundColor: '#f8fafc' },
  pricingSectionTitle: { fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px', color: '#1f2937' },
  pricingCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' },
  pricingCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '2px solid #e5e7eb', position: 'relative' },
  pricingCardPro: { border: '3px solid #3b82f6', boxShadow: '0 8px 24px rgba(59,130,246,0.15)' },
  pricingPopular: { position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '20px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  pricingName: { fontSize: '22px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' },
  pricingPrice: { fontSize: '40px', fontWeight: '800', color: '#1e40af', marginBottom: '12px' },
  pricingPeriod: { fontSize: '16px', fontWeight: '500', color: '#6b7280' },
  pricingDesc: { fontSize: '14px', color: '#6b7280', lineHeight: '1.5' },
  pricingNote: { textAlign: 'center', marginTop: '32px', fontSize: '14px', color: '#6b7280' },
  ctaSection: { padding: '80px 20px', backgroundColor: '#ffffff', textAlign: 'center' },
  ctaTitle: { fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#1f2937' },
  ctaText: { fontSize: '18px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' },
  ctaButton: { padding: '16px 48px', fontSize: '18px', fontWeight: '700', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,64,175,0.3)' },
  footer: { backgroundColor: '#1f2937', color: '#ffffff', padding: '60px 20px 20px' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px', marginBottom: '32px' },
  footerBrand: { flex: '1', minWidth: '250px' },
  footerLogo: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
  footerTagline: { fontSize: '14px', color: '#9ca3af' },
  footerLinks: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  footerLink: { fontSize: '14px', color: '#d1d5db', textDecoration: 'none' },
  footerBottom: { maxWidth: '1200px', margin: '0 auto', paddingTop: '20px', borderTop: '1px solid #374151', textAlign: 'center' },
  copyright: { fontSize: '14px', color: '#9ca3af' },
}