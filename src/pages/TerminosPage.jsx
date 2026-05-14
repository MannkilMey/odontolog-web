import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function TerminosPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          {t('common.back')}
        </button>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>{t('terminos.title')}</h1>
        <p style={styles.date}>{t('terminos.lastUpdated')}</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s1Title')}</h2>
          <p style={styles.text}>{t('terminos.s1Text')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s2Title')}</h2>
          <p style={styles.text}>{t('terminos.s2Text')}</p>
          <ul style={styles.list}>
            <li>{t('terminos.s2li1')}</li>
            <li>{t('terminos.s2li2')}</li>
            <li>{t('terminos.s2li3')}</li>
            <li>{t('terminos.s2li4')}</li>
            <li>{t('terminos.s2li5')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s3Title')}</h2>
          <p style={styles.text}>{t('terminos.s3Text')}</p>
          <ul style={styles.list}>
            <li>{t('terminos.s3li1')}</li>
            <li>{t('terminos.s3li2')}</li>
            <li>{t('terminos.s3li3')}</li>
            <li>{t('terminos.s3li4')}</li>
            <li>{t('terminos.s3li5')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s4Title')}</h2>
          <p style={styles.text}>{t('terminos.s4Text')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s5Title')}</h2>
          <p style={styles.text}>{t('terminos.s5Text')}</p>
          <ul style={styles.list}>
            <li>{t('terminos.s5li1')}</li>
            <li>{t('terminos.s5li2')}</li>
            <li>{t('terminos.s5li3')}</li>
            <li>{t('terminos.s5li4')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s6Title')}</h2>
          <p style={styles.text}>{t('terminos.s6Text')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s7Title')}</h2>
          <p style={styles.text}>{t('terminos.s7Text')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s8Title')}</h2>
          <p style={styles.text}>{t('terminos.s8Text')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('terminos.s9Title')}</h2>
          <p style={styles.text}>
            {t('terminos.s9Text')}{' '}
            <a href="mailto:contacto@odontolog.lat" style={styles.link}>
              contacto@odontolog.lat
            </a>
          </p>
        </section>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>{t('terminos.copyright')}</p>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  header: { padding: '20px 40px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' },
  backButton: { padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: '#667eea', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  content: { maxWidth: '800px', margin: '0 auto', padding: '60px 20px' },
  title: { fontSize: '40px', fontWeight: '800', color: '#1f2937', marginBottom: '8px' },
  date: { fontSize: '14px', color: '#6b7280', marginBottom: '40px' },
  section: { marginBottom: '40px' },
  sectionTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' },
  text: { fontSize: '16px', color: '#4b5563', lineHeight: '1.7', marginBottom: '12px' },
  list: { paddingLeft: '24px', color: '#4b5563', lineHeight: '1.8' },
  link: { color: '#667eea', textDecoration: 'none', fontWeight: '600' },
  footer: { textAlign: 'center', padding: '40px 20px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' },
  footerText: { fontSize: '14px', color: '#6b7280' },
}