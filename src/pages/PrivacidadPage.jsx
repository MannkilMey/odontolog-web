import { useNavigate } from 'react-router-dom'

export default function PrivacidadPage() {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Volver
        </button>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>Política de Privacidad</h1>
        <p style={styles.date}>Última actualización: Noviembre 2024</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Información que Recopilamos</h2>
          <p style={styles.text}>
            OdontoLog recopila información necesaria para proporcionar servicios de gestión dental, incluyendo:
          </p>
          <ul style={styles.list}>
            <li>Información de cuenta (email, nombre)</li>
            <li>Información de pacientes ingresada por el usuario</li>
            <li>Datos de procedimientos y citas</li>
            <li>Información financiera de la clínica</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Uso de la Información</h2>
          <p style={styles.text}>
            Utilizamos la información recopilada para:
          </p>
          <ul style={styles.list}>
            <li>Proporcionar y mantener nuestros servicios</li>
            <li>Mejorar y personalizar la experiencia del usuario</li>
            <li>Comunicarnos sobre actualizaciones y soporte</li>
            <li>Garantizar la seguridad de los datos</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Seguridad de Datos</h2>
          <p style={styles.text}>
            Implementamos medidas de seguridad para proteger su información, incluyendo:
          </p>
          <ul style={styles.list}>
            <li>Cifrado SSL/TLS para todas las comunicaciones</li>
            <li>Almacenamiento seguro en Supabase</li>
            <li>Autenticación robusta</li>
            <li>Backups regulares</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Compartir Información</h2>
          <p style={styles.text}>
            No vendemos, comercializamos ni compartimos su información personal con terceros, 
            excepto cuando sea necesario para proporcionar el servicio o cuando lo requiera la ley.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Sus Derechos</h2>
          <p style={styles.text}>
            Usted tiene derecho a:
          </p>
          <ul style={styles.list}>
            <li>Acceder a sus datos personales</li>
            <li>Rectificar información incorrecta</li>
            <li>Solicitar la eliminación de sus datos</li>
            <li>Exportar sus datos</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Contacto</h2>
          <p style={styles.text}>
            Para preguntas sobre esta política, contáctenos en: 
            <a href="mailto:contacto@odontolog.lat" style={styles.link}> contacto@odontolog.lat</a>
          </p>
        </section>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>© 2024 OdontoLog. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: '20px 40px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '60px 20px',
  },
  title: {
    fontSize: '40px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '8px',
  },
  date: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '40px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  text: {
    fontSize: '16px',
    color: '#4b5563',
    lineHeight: '1.7',
    marginBottom: '12px',
  },
  list: {
    paddingLeft: '24px',
    color: '#4b5563',
    lineHeight: '1.8',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
  },
}