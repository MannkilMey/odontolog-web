import { useNavigate } from 'react-router-dom'

export default function ModalUpgrade({ isOpen, onClose, featureName, planRequerido = 'pro' }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const features = {
    // ✅ EXISTENTES
    exportar: {
      titulo: 'Exportar a Excel',
      icon: '📊',
      descripcion: 'Exporta todos tus datos a Excel con filtros avanzados',
      beneficios: [
        '📊 Exportación ilimitada de todas las tablas',
        '📋 Pacientes, citas, procedimientos y más',
        '🔍 Filtros personalizados por fecha',
        '📈 Reportes listos para análisis',
      ],
    },
    backups: {
      titulo: 'Sistema de Backups',
      icon: '💾',
      descripcion: 'Respaldo automático y manual de todos tus datos',
      beneficios: [
        '💾 Backups automáticos diarios',
        '🔒 Almacenamiento seguro en la nube',
        '📥 Descarga en cualquier momento',
        '⏰ Historial completo de respaldos',
      ],
    },

    // ✅ NUEVAS FEATURES
    historial_procedimientos: {
      titulo: 'Historial de Procedimientos',
      icon: '🦷',
      descripcion: 'Visualiza todos los tratamientos realizados con filtros avanzados',
      beneficios: [
        '🦷 Historial completo de procedimientos',
        '📅 Filtros por fecha y paciente',
        '💰 Análisis de ingresos por tratamiento',
        '📊 Estadísticas de procedimientos más realizados',
      ],
    },
    historial_financiero: {
      titulo: 'Historial Financiero',
      icon: '💰',
      descripcion: 'Control total de ingresos, gastos y análisis financiero',
      beneficios: [
        '💵 Registro completo de ingresos y gastos',
        '📊 Gráficos de evolución financiera',
        '🔍 Filtros por categoría y período',
        '📈 Balance mensual y anual',
      ],
    },
    mensajes: {
      titulo: 'Historial de Mensajes',
      icon: '📬',
      descripcion: 'Registro de todas las comunicaciones enviadas',
      beneficios: [
        '📱 Historial de WhatsApp y emails',
        '📊 Métricas de mensajes enviados',
        '👥 Seguimiento por paciente',
        '🔍 Búsqueda avanzada de comunicaciones',
      ],
    },
    recordatorios: {
      titulo: 'Recordatorios Automáticos',
      icon: '🔔',
      descripcion: 'Automatiza recordatorios de citas y cuotas por WhatsApp',
      beneficios: [
        '🤖 Envío automático de recordatorios',
        '📱 100 WhatsApp/mes (Pro) o 500/mes (Enterprise)',
        '⏰ Personaliza horarios y días de anticipación',
        '📅 Recordatorios de citas y cuotas vencidas',
      ],
    },
    reportes: {
      titulo: 'Reportes Avanzados',
      icon: '📈',
      descripcion: 'Análisis completo del rendimiento de tu clínica',
      beneficios: [
        '📊 Reportes financieros detallados',
        '🦷 Análisis de procedimientos más rentables',
        '👥 Métricas de pacientes activos/inactivos',
        '📈 Gráficos interactivos y exportables',
      ],
    },
    metricas: {
      titulo: 'Métricas y Estadísticas',
      icon: '📊',
      descripcion: 'Dashboard completo con métricas de rendimiento',
      beneficios: [
        '📊 Métricas en tiempo real',
        '💰 Análisis de rentabilidad',
        '📈 Proyecciones de ingresos',
        '🎯 KPIs de productividad',
      ],
    },
    whatsapp: {
      titulo: 'Mensajes WhatsApp Profesionales',
      icon: '📱',
      descripcion: 'Personaliza tus comunicaciones y envía mensajes automáticos',
      beneficios: [
        '📱 100 WhatsApp/mes con Pro, 500 con Enterprise',
        '✏️ Plantillas personalizables',
        '🤖 Recordatorios automáticos de citas',
        '💰 Envío de presupuestos y recibos',
        '⏰ Recordatorio de cuotas vencidas',
      ],
    },
    equipo: {
      titulo: 'Gestión de Equipo Multi-Perfil',
      icon: '👥',
      descripcion: 'Trabaja con tu equipo completo en una sola plataforma',
      beneficios: [
        '👥 Hasta 4 dentistas en la clínica',
        '📊 Métricas individuales por colaborador',
        '🔐 Roles y permisos personalizados',
        '📈 Dashboard consolidado del equipo',
        '💼 Gestión centralizada de pacientes',
      ],
      planRequerido: 'enterprise',
    },
  }

  const feature = features[featureName] || features.exportar
  const planNecesario = feature.planRequerido || planRequerido

  const handleVerPlanes = () => {
    onClose()
    navigate('/planes')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.featureIcon}>{feature.icon}</div>
            <div style={styles.headerTitle}>
              Función Premium
            </div>
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

          {/* Plan Info */}
          <div style={styles.planInfo}>
            <div style={styles.planBadge}>
              {planNecesario === 'enterprise' ? (
                <>💎 Requiere Plan Enterprise</>
              ) : (
                <>⭐ Disponible en Plan Pro</>
              )}
            </div>
            <div style={styles.planPrice}>
              {planNecesario === 'enterprise' 
                ? 'Desde Gs. 120,000/mes' 
                : 'Desde Gs. 50,000/mes'
              }
            </div>
            
            {/* Features del plan */}
            <div style={styles.planFeatures}>
              {planNecesario === 'enterprise' ? (
                <>
                  <div style={styles.planFeature}>✓ Todo lo de Pro</div>
                  <div style={styles.planFeature}>✓ 500 WhatsApp/mes</div>
                  <div style={styles.planFeature}>✓ Gestión de equipo (4 perfiles)</div>
                </>
              ) : (
                <>
                  <div style={styles.planFeature}>✓ 100 WhatsApp/mes</div>
                  <div style={styles.planFeature}>✓ Reportes avanzados</div>
                  <div style={styles.planFeature}>✓ Soporte prioritario</div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.upgradeButton} onClick={handleVerPlanes}>
              🚀 Ver Planes y Actualizar
            </button>
            <button style={styles.cancelButton} onClick={onClose}>
              Ahora no
            </button>
          </div>

          {/* Garantía */}
          <div style={styles.guarantee}>
            ✅ Sin permanencia · Cancela cuando quieras
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    maxWidth: '550px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  featureIcon: {
    fontSize: '32px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    fontSize: '24px',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    lineHeight: 1,
  },
  body: {
    padding: '32px 24px',
  },
  featureTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '24px',
    textAlign: 'center',
  },
  benefitsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '28px',
  },
  benefitItem: {
    fontSize: '15px',
    color: '#374151',
    padding: '14px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '10px',
    borderLeft: '4px solid #10b981',
    lineHeight: '1.5',
  },
  planInfo: {
    textAlign: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '2px solid #3b82f6',
  },
  planBadge: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },
  planPrice: {
    fontSize: '28px',
    color: '#3b82f6',
    fontWeight: '700',
    marginBottom: '16px',
  },
  planFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  planFeature: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  upgradeButton: {
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
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
  guarantee: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '600',
    marginTop: '16px',
  },
}