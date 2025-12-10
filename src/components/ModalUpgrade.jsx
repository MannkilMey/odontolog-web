import { useNavigate } from 'react-router-dom'

export default function ModalUpgrade({ isOpen, onClose, featureName, planRequerido = 'pro' }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const features = {
    exportar: {
      titulo: 'Exportar a Excel',
      descripcion: 'Exporta todos tus datos a Excel con filtros avanzados',
      beneficios: [
        '📊 Exportación ilimitada',
        '📋 Todas las tablas disponibles',
        '🔍 Filtros por fecha',
        '📈 Reportes personalizados',
      ],
    },
    backups: {
      titulo: 'Sistema de Backups',
      descripcion: 'Respaldo automático y manual de todos tus datos',
      beneficios: [
        '💾 Backups automáticos diarios',
        '🔒 Almacenamiento seguro',
        '📥 Descarga en cualquier momento',
        '⏰ Historial de respaldos',
      ],
    },
  }

  const feature = features[featureName] || features.exportar

  const handleVerPlanes = () => {
    onClose()
    navigate('/planes')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            🚀 Función Premium
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <div style={styles.featureTitle}>
            {feature.titulo}
          </div>
          <div style={styles.featureDescription}>
            {feature.descripcion}
          </div>

          <div style={styles.benefitsList}>
            {feature.beneficios.map((beneficio, index) => (
              <div key={index} style={styles.benefitItem}>
                {beneficio}
              </div>
            ))}
          </div>

          <div style={styles.planInfo}>
            <div style={styles.planBadge}>
              {planRequerido === 'pro' ? '⭐ Plan Profesional' : '💎 Plan Clínica'}
            </div>
            <div style={styles.planPrice}>
              {planRequerido === 'pro' 
                ? 'Desde Gs. 150,000/mes' 
                : 'Desde Gs. 400,000/mes'
              }
            </div>
          </div>

          <div style={styles.actions}>
            <button style={styles.upgradeButton} onClick={handleVerPlanes}>
              Ver Planes y Mejorar
            </button>
            <button style={styles.cancelButton} onClick={onClose}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    padding: '24px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  featureDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  benefitsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  benefitItem: {
    fontSize: '15px',
    color: '#374151',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },
  planInfo: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  planBadge: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },
  planPrice: {
    fontSize: '16px',
    color: '#3b82f6',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  upgradeButton: {
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cancelButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
}