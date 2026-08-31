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
    if (session) navigate('/dashboard')
  }

  const features = [
    { icon: '👥', titleKey: 'landing.feature1Title',  textKey: 'landing.feature1Text'  },
    { icon: '🦷', titleKey: 'landing.feature2Title',  textKey: 'landing.feature2Text'  },
    { icon: '📅', titleKey: 'landing.feature3Title',  textKey: 'landing.feature3Text'  },
    { icon: '📱', titleKey: 'landing.feature4Title',  textKey: 'landing.feature4Text'  },
    { icon: '💬', titleKey: 'landing.feature5Title',  textKey: 'landing.feature5Text'  },
    { icon: '📄', titleKey: 'landing.feature6Title',  textKey: 'landing.feature6Text'  },
    { icon: '💰', titleKey: 'landing.feature7Title',  textKey: 'landing.feature7Text'  },
    { icon: '📊', titleKey: 'landing.feature8Title',  textKey: 'landing.feature8Text'  },
    { icon: '💳', titleKey: 'landing.feature9Title',  textKey: 'landing.feature9Text'  },
    { icon: '📈', titleKey: 'landing.feature10Title', textKey: 'landing.feature10Text' },
    { icon: '🕐', titleKey: 'landing.feature11Title', textKey: 'landing.feature11Text' },
    { icon: '⚙️', titleKey: 'landing.feature12Title', textKey: 'landing.feature12Text' },
  ]

  const planFeaturesFree = [
    'landing.planFreeF1', 'landing.planFreeF2', 'landing.planFreeF3',
    'landing.planFreeF4', 'landing.planFreeF5',
  ]
  const planFeaturesPro = [
    'landing.planProF1', 'landing.planProF2', 'landing.planProF3',
    'landing.planProF4', 'landing.planProF5', 'landing.planProF6',
  ]
  const planFeaturesEnterprise = [
    'landing.planEntF1', 'landing.planEntF2', 'landing.planEntF3',
    'landing.planEntF4', 'landing.planEntF5',
  ]

  return (
    <div style={styles.container}>

      {/* ═══════════════ HERO ═══════════════ */}
      <header style={styles.hero}>
        <div style={styles.langSelectorWrapper}>
          <LanguageSelector compact showCurrency={false} dark />
        </div>

        <div style={styles.heroContent}>
          <div style={styles.logo} role="img" aria-label="OdontoLog logo dental">🦷</div>
          <h1 style={styles.title}>OdontoLog by MYR E.A.S.</h1>
          <p style={styles.subtitle}>{t('landing.subtitle')}</p>
          <p style={styles.description}>{t('landing.description')}</p>

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

          <div style={styles.heroBadges}>
            <span style={styles.heroBadge}>✅ {t('landing.badgeFree')}</span>
            <span style={styles.heroBadge}>✅ {t('landing.badgeNoCard')}</span>
            <span style={styles.heroBadge}>✅ {t('landing.badgeLatam')}</span>
          </div>
        </div>
      </header>

      <main>

        {/* ═══════════════ MARKET STATS ═══════════════ */}
        <section style={styles.statsStrip} aria-label={t('landing.marketStats')}>
          <div style={styles.statsInner}>
            {[
              { value: '73%',   labelKey: 'landing.stat1Label' },
              { value: '600K+', labelKey: 'landing.stat2Label' },
              { value: '$1.2B', labelKey: 'landing.stat3Label' },
              { value: '18%',   labelKey: 'landing.stat4Label' },
            ].map((s, i) => (
              <div key={i} style={styles.statItem}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{t(s.labelKey)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section style={styles.features} aria-label={t('landing.features')}>
          <div style={styles.sectionBadge}>{t('landing.featuresBadge')}</div>
          <h2 style={styles.featuresTitle}>{t('landing.featuresTitle')}</h2>
          <p style={styles.featuresSubtitle}>{t('landing.featuresSubtitle')}</p>

          <div style={styles.featuresGrid}>
            {features.map((f, i) => (
              <article key={i} style={styles.featureCard}>
                <div style={styles.featureIcon} role="img">{f.icon}</div>
                <h3 style={styles.featureTitle}>{t(f.titleKey)}</h3>
                <p style={styles.featureText}>{t(f.textKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ═══════════════ VALUE PROPS ═══════════════ */}
        <section style={styles.valueSection} aria-label={t('landing.valueProps')}>
          <div style={styles.valueInner}>
            <div style={styles.valueLeft}>
              <div style={styles.sectionBadge}>{t('landing.valueBadge')}</div>
              <h2 style={styles.valueTitle}>{t('landing.valueTitle')}</h2>
              <p style={styles.valueSubtitle}>{t('landing.valueSubtitle')}</p>
            </div>
            <div style={styles.valueRight}>
              {[
                { icon: '☁️', key: 'landing.value1' },
                { icon: '💱', key: 'landing.value2' },
                { icon: '🌎', key: 'landing.value3' },
                { icon: '🎁', key: 'landing.value5' },
              ].map((v, i) => (
                <div key={i} style={styles.valueItem}>
                  <span style={styles.valueItemIcon}>{v.icon}</span>
                  <span style={styles.valueItemText}>{t(v.key)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section style={styles.pricingSection} aria-label={t('landing.pricing')}>
          <div style={styles.sectionBadge}>{t('landing.pricingBadge')}</div>
          <h2 style={styles.pricingSectionTitle}>{t('landing.pricingTitle')}</h2>
          <p style={styles.pricingSubtitle}>{t('landing.pricingNote')}</p>

          <div style={styles.pricingCards}>

            {/* FREE */}
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>{t('landing.planFree')}</h3>
              <div style={styles.pricingPrice}>$0</div>
              <div style={styles.pricingAnnual}>{t('landing.planFreeForever')}</div>
              <p style={styles.pricingDesc}>{t('landing.planFreeDesc')}</p>
              <ul style={styles.planFeaturesList}>
                {planFeaturesFree.map((k, i) => (
                  <li key={i} style={styles.planFeatureItem}>
                    <span style={styles.checkIcon}>✓</span> {t(k)}
                  </li>
                ))}
              </ul>
              <button
                style={styles.planButtonSecondary}
                onClick={() => navigate('/registro')}
              >
                {t('landing.startFree')}
              </button>
            </div>

            {/* PRO */}
            <div style={{ ...styles.pricingCard, ...styles.pricingCardPro }}>
              <div style={styles.pricingPopular}>{t('plans.mostPopular')}</div>
              <h3 style={styles.pricingName}>{t('landing.planPro')}</h3>
              <div style={styles.pricingPrice}>
                $30<span style={styles.pricingPeriod}>/{t('common.month')}</span>
              </div>
              <div style={styles.pricingAnnual}>{t('landing.planProAnnual')}</div>
              <p style={styles.pricingDesc}>{t('landing.planProDesc')}</p>
              <ul style={styles.planFeaturesList}>
                {planFeaturesPro.map((k, i) => (
                  <li key={i} style={styles.planFeatureItem}>
                    <span style={{ ...styles.checkIcon, color: '#3b82f6' }}>✓</span> {t(k)}
                  </li>
                ))}
              </ul>
              <button
                style={styles.planButtonPrimary}
                onClick={() => navigate('/planes')}
              >
                {t('landing.startPro')}
              </button>
            </div>

            {/* ENTERPRISE */}
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingName}>{t('landing.planEnterprise')}</h3>
              <div style={styles.pricingPrice}>
                $80<span style={styles.pricingPeriod}>/{t('common.month')}</span>
              </div>
              <div style={styles.pricingAnnual}>{t('landing.planEntAnnual')}</div>
              <p style={styles.pricingDesc}>{t('landing.planEnterpriseDesc')}</p>
              <ul style={styles.planFeaturesList}>
                {planFeaturesEnterprise.map((k, i) => (
                  <li key={i} style={styles.planFeatureItem}>
                    <span style={styles.checkIcon}>✓</span> {t(k)}
                  </li>
                ))}
              </ul>
              <button
                style={styles.planButtonSecondary}
                onClick={() => navigate('/planes')}
              >
                {t('landing.startEnterprise')}
              </button>
            </div>

          </div>
        </section>

       {/* ═══════════════ CTA FINAL ═══════════════ */}
      <section style={styles.ctaSection} aria-label="CTA">
        <div style={styles.ctaInner}>
          <div style={styles.ctaEmoji}>🚀</div>
          <h2 style={styles.ctaTitle}>{t('landing.ctaTitle')}</h2>
          <p style={styles.ctaText}>{t('landing.ctaText')}</p>
          <div style={styles.ctaButtons}>
            <button
              style={styles.ctaButton}
              onClick={() => navigate('/registro')}
              aria-label={t('landing.createFreeAccount')}
            >
              {t('landing.createFreeAccount')} {'→'}
            </button>
            
              <a href="https://odontolog.lat"
              style={styles.ctaLinkButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('landing.learnMore')}
            </a>
          </div>
          <p style={styles.ctaNote}>{t('landing.ctaNote')}</p>
        </div>
      </section>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>🦷 OdontoLog</div>
            <p style={styles.footerTagline}>{t('landing.footerTagline')}</p>
          </div>
          <nav style={styles.footerLinks} aria-label={t('landing.legalLinks')}>
            <a href="/privacidad" style={styles.footerLink}>{t('landing.privacy')}</a>
            <a href="/terminos"   style={styles.footerLink}>{t('landing.terms')}</a>
            <a href="mailto:contacto@odontolog.lat" style={styles.footerLink}>
              contacto@odontolog.lat
            </a>
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
  heroBadges: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' },
  heroBadge: { fontSize: '13px', color: '#bfdbfe', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)' },
  statsStrip: { backgroundColor: '#1e40af', padding: '32px 20px' },
  statsInner: { maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: '40px', fontWeight: '800', color: '#ffffff', marginBottom: '6px' },
  statLabel: { fontSize: '14px', color: '#bfdbfe', lineHeight: '1.4' },
  features: { padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' },
  sectionBadge: { display: 'inline-block', padding: '6px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '20px', fontSize: '13px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  featuresTitle: { fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '16px', color: '#1f2937' },
  featuresSubtitle: { fontSize: '18px', color: '#6b7280', textAlign: 'center', marginBottom: '60px', maxWidth: '600px', margin: '0 auto 60px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' },
  featureCard: { padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px', textAlign: 'left', border: '1px solid #e5e7eb', transition: 'all 0.2s' },
  featureIcon: { fontSize: '40px', marginBottom: '16px' },
  featureTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' },
  featureText: { fontSize: '15px', color: '#6b7280', lineHeight: '1.6' },
  valueSection: { padding: '80px 20px', backgroundColor: '#f0f9ff' },
  valueInner: { maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' },
  valueLeft: {},
  valueTitle: { fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', lineHeight: '1.3' },
  valueSubtitle: { fontSize: '16px', color: '#6b7280', lineHeight: '1.6' },
  valueRight: { display: 'flex', flexDirection: 'column', gap: '16px' },
  valueItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #dbeafe' },
  valueItemIcon: { fontSize: '28px', flexShrink: 0 },
  valueItemText: { fontSize: '15px', color: '#1f2937', fontWeight: '500' },
  pricingSection: { padding: '80px 20px', backgroundColor: '#f8fafc', textAlign: 'center' },
  pricingSectionTitle: { fontSize: '36px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' },
  pricingSubtitle: { fontSize: '15px', color: '#6b7280', marginBottom: '48px' },
  pricingCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '960px', margin: '0 auto' },
  pricingCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px 28px', textAlign: 'center', border: '2px solid #e5e7eb', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' },
  pricingCardPro: { border: '3px solid #3b82f6', boxShadow: '0 8px 32px rgba(59,130,246,0.2)' },
  pricingPopular: { position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', padding: '6px 20px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '20px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  pricingName: { fontSize: '22px', fontWeight: '700', color: '#1f2937' },
  pricingPrice: { fontSize: '44px', fontWeight: '800', color: '#1e40af' },
  pricingPeriod: { fontSize: '16px', fontWeight: '500', color: '#6b7280' },
  pricingAnnual: { fontSize: '13px', color: '#10b981', fontWeight: '600' },
  pricingDesc: { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', marginBottom: '8px' },
  planFeaturesList: { listStyle: 'none', padding: 0, margin: '8px 0 16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' },
  planFeatureItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#374151' },
  checkIcon: { color: '#10b981', fontWeight: '700', flexShrink: 0, marginTop: '1px' },
  planButtonPrimary: { width: '100%', padding: '12px', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: 'auto' },
  planButtonSecondary: { width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#1e40af', border: '2px solid #1e40af', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: 'auto' },
  ctaSection: { padding: '80px 20px', backgroundColor: '#ffffff', textAlign: 'center' },
  ctaInner: { maxWidth: '700px', margin: '0 auto' },
  ctaEmoji: { fontSize: '56px', marginBottom: '16px' },
  ctaTitle: { fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#1f2937' },
  ctaText: { fontSize: '18px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' },
  ctaButton: { padding: '16px 48px', fontSize: '18px', fontWeight: '700', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,64,175,0.3)', marginRight: '12px' },
  ctaLinkButton: { display: 'inline-block', padding: '16px 32px', fontSize: '16px', fontWeight: '600', color: '#1e40af', border: '2px solid #1e40af', borderRadius: '12px', textDecoration: 'none' },
  ctaNote: { fontSize: '13px', color: '#9ca3af', marginTop: '20px' },
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