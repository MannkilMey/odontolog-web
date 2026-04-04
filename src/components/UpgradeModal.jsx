import { useNavigate } from 'react-router-dom'

/**
 * Modal de upgrade que se muestra cuando el usuario alcanza un límite de su plan.
 * 
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   tipo: 'pacientes' | 'emails' | 'whatsapp'
 *   usado: number
 *   limite: number
 *   planActual: string
 */
export default function UpgradeModal({ isOpen, onClose, tipo, usado, limite, planActual }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const mensajes = {
    pacientes: {
      titulo: 'Límite de pacientes alcanzado',
      icono: '👥',
      descripcion: `Tu plan ${planActual} permite un máximo de ${limite} pacientes. Actualmente tenés ${usado}.`,
      beneficio: 'Actualizá tu plan para agregar pacientes ilimitados y acceder a más funciones.',
    },
    emails: {
      titulo: 'Límite de emails alcanzado',
      icono: '📧',
      descripcion: `Tu plan ${planActual} permite ${limite} emails por mes. Ya usaste ${usado}.`,
      beneficio: 'Actualizá tu plan para enviar más emails y hacer crecer tu clínica.',
    },
    whatsapp: {
      titulo: 'Límite de WhatsApp alcanzado',
      icono: '💬',
      descripcion: `Tu plan ${planActual} permite ${limite} mensajes de WhatsApp por mes. Ya usaste ${usado}.`,
      beneficio: 'Actualizá tu plan para enviar más mensajes y mantener contacto con tus pacientes.',
    },
  }

  const msg = mensajes[tipo] || mensajes.pacientes
  const porcentaje = limite > 0 ? Math.round((usado / limite) * 100) : 100

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>{msg.icono}</span>
          </div>
          <h2 style={styles.titulo}>{msg.titulo}</h2>
        </div>

        {/* Progress bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${Math.min(porcentaje, 100)}%`,
              backgroundColor: porcentaje >= 100 ? '#ef4444' : porcentaje >= 80 ? '#f59e0b' : '#10b981'
            }} />
          </div>
          <div style={styles.progressText}>
            <span style={styles.progressUsado}>{usado}</span>
            <span style={styles.progressSep}> / </span>
            <span style={styles.progressLimite}>{limite}</span>
            <span style={styles.progressLabel}> {tipo}</span>
          </div>
        </div>

        {/* Description */}
        <p style={styles.descripcion}>{msg.descripcion}</p>
        <p style={styles.beneficio}>{msg.beneficio}</p>

        {/* Plan comparison */}
        <div style={styles.planesCompare}>
          <div style={styles.planActual}>
            <div style={styles.planTag}>Plan actual</div>
            <div style={styles.planNombre}>{planActual}</div>
            <div style={styles.planLimite}>{limite} {tipo}</div>
          </div>
          <div style={styles.planArrow}>→</div>
          <div style={styles.planRecomendado}>
            <div style={styles.planTagPro}>Recomendado</div>
            <div style={styles.planNombre}>Profesional</div>
            <div style={styles.planLimite}>
              {tipo === 'pacientes' ? '500' : tipo === 'emails' ? '100' : '100'} {tipo}
            </div>
            <div style={styles.planPrecio}>$30/mes</div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.laterButton}>
            Más tarde
          </button>
          <button
            onClick={() => { onClose(); navigate('/planes') }}
            style={styles.upgradeButton}
          >
            Ver planes disponibles
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
  },
  header: {
    marginBottom: '20px',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  icon: {
    fontSize: '32px',
  },
  titulo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  progressSection: {
    margin: '20px 0',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  progressUsado: {
    fontWeight: '700',
    color: '#ef4444',
    fontSize: '18px',
  },
  progressSep: {
    color: '#d1d5db',
  },
  progressLimite: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '18px',
  },
  progressLabel: {
    color: '#6b7280',
  },
  descripcion: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '16px 0 8px',
  },
  beneficio: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '500',
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  planesCompare: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  planActual: {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  planTag: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  planTagPro: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  planRecomendado: {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    border: '2px solid #1e40af',
    backgroundColor: '#eff6ff',
  },
  planNombre: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  planLimite: {
    fontSize: '12px',
    color: '#6b7280',
  },
  planPrecio: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e40af',
    marginTop: '6px',
  },
  planArrow: {
    fontSize: '20px',
    color: '#d1d5db',
    fontWeight: '700',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  laterButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  upgradeButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
}