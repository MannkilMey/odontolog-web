export default function LoadingScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.logo}>🦷</div>
        <div style={styles.title}>OdontoLog</div>
        <div style={styles.subtitle}>Cargando...</div>
        <div style={styles.spinner}>
          <div style={styles.spinnerDot}></div>
          <div style={styles.spinnerDot}></div>
          <div style={styles.spinnerDot}></div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1e40af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    textAlign: 'center',
    color: '#ffffff'
  },
  logo: {
    fontSize: 80,
    marginBottom: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 2
  },
  subtitle: {
    fontSize: 16,
    color: '#f3f4f6',
    marginBottom: 40
  },
  spinner: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px'
  },
  spinnerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    animation: 'pulse 1.5s ease-in-out infinite'
  }
}