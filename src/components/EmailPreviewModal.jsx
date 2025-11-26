import { useState } from 'react'

export default function EmailPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  emailData 
}) {
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
  setSending(true)
  try {
    await onConfirm()
    // Mensaje de éxito antes de cerrar
    alert('✅ Mensaje enviado correctamente')
    onClose()
  } catch (error) {
    console.error('Error:', error)
    alert('❌ Error al enviar: ' + error.message)
  } finally {
    setSending(false)
  }
}

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            {emailData.tipo === 'whatsapp' ? '📱 Vista Previa WhatsApp' : '📧 Vista Previa Email'}
          </div>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        {/* Email Info */}
        <div style={styles.emailInfo}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Para:</span>
            <span style={styles.infoValue}>{emailData.destinatario}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Asunto:</span>
            <span style={styles.infoValue}>{emailData.asunto}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tipo:</span>
            <span style={styles.tipoBadge}>{emailData.tipoLabel}</span>
          </div>
        </div>

        {/* Message Preview */}
        <div style={styles.preview}>
          <div style={styles.previewLabel}>Mensaje:</div>
          <div 
            style={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: emailData.html || emailData.mensaje }}
          />
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button 
            style={styles.cancelButton} 
            onClick={onClose}
            disabled={sending}
          >
            Cancelar
          </button>
          <button 
            style={{
              ...styles.confirmButton,
              opacity: sending ? 0.6 : 1,
              cursor: sending ? 'not-allowed' : 'pointer'
            }}
            onClick={handleConfirm}
            disabled={sending}
          >
            {sending ? 'Enviando...' : emailData.tipo === 'whatsapp' ? '📱 Enviar WhatsApp' : '📧 Enviar Email'}
          </button>
        </div>

        {/* Cost Info */}
        <div style={styles.costInfo}>
          💡 Este mensaje será contabilizado en tus estadísticas
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  emailInfo: {
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '8px',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    width: '80px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    flex: 1,
  },
  tipoBadge: {
    padding: '4px 12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '12px',
    textTransform: 'capitalize',
  },
  preview: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
  },
  previewLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  previewContent: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    minHeight: '200px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  costInfo: {
    textAlign: 'center',
    padding: '12px 24px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#fffbeb',
    borderTop: '1px solid #fef3c7',
  },
}