import { useNavigate } from 'react-router-dom'

export default function TerminosPage() {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Volver
        </button>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>Términos y Condiciones</h1>
        <p style={styles.date}>Última actualización: Noviembre 2024</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Aceptación de los Términos</h2>
          <p style={styles.text}>
            Al acceder y utilizar OdontoLog, usted acepta estar sujeto a estos términos y condiciones. 
            Si no está de acuerdo con alguna parte de estos términos, no debe usar nuestro servicio.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Descripción del Servicio</h2>
          <p style={styles.text}>
            OdontoLog es una plataforma de gestión dental que proporciona herramientas para:
          </p>
          <ul style={styles.list}>
            <li>Gestión de pacientes y registros clínicos</li>
            <li>Programación de citas</li>
            <li>Control financiero y facturación</li>
            <li>Odontogramas digitales</li>
            <li>Reportes y análisis</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Responsabilidades del Usuario</h2>
          <p style={styles.text}>
            El usuario se compromete a:
          </p>
          <ul style={styles.list}>
            <li>Proporcionar información veraz y actualizada</li>
            <li>Mantener la seguridad de su cuenta</li>
            <li>Cumplir con las leyes de protección de datos aplicables</li>
            <li>Usar el servicio de manera ética y profesional</li>
            <li>No compartir credenciales de acceso</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Propiedad Intelectual</h2>
          <p style={styles.text}>
            El contenido, diseño, código y funcionalidades de OdontoLog son propiedad exclusiva 
            de MCorp y están protegidos por leyes de propiedad intelectual.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Limitación de Responsabilidad</h2>
          <p style={styles.text}>
            OdontoLog se proporciona "tal cual" sin garantías de ningún tipo. No nos hacemos responsables de:
          </p>
          <ul style={styles.list}>
            <li>Pérdida de datos por causas ajenas a nuestro control</li>
            <li>Interrupciones del servicio por mantenimiento</li>
            <li>Decisiones clínicas basadas en el uso del sistema</li>
            <li>Daños indirectos o consecuentes</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Modificaciones del Servicio</h2>
          <p style={styles.text}>
            Nos reservamos el derecho de modificar, suspender o discontinuar el servicio 
            en cualquier momento, con o sin previo aviso.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Terminación</h2>
          <p style={styles.text}>
            Podemos suspender o terminar su acceso al servicio si se violan estos términos. 
            Usted puede cancelar su cuenta en cualquier momento.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Ley Aplicable</h2>
          <p style={styles.text}>
            Estos términos se rigen por las leyes de Paraguay. Cualquier disputa se resolverá 
            en los tribunales competentes de Asunción, Paraguay.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Contacto</h2>
          <p style={styles.text}>
            Para preguntas sobre estos términos, contáctenos en: 
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