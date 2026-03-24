import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ToastNotification() {
  const [notifications, setNotifications] = useState([])
  
  useEffect(() => {
    // Suscribirse a nuevas notificaciones en tiempo real
    const subscription = supabase
      .channel('notificaciones_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones_clinica',
        filter: `tipo=eq.confirmacion_cita`
      }, (payload) => {
        const nuevaNotif = payload.new
        
        // Agregar notificación al estado
        setNotifications(prev => [...prev, {
          id: nuevaNotif.id,
          titulo: nuevaNotif.titulo,
          mensaje: nuevaNotif.mensaje,
          tipo: nuevaNotif.metadata?.accion || 'info',
          timestamp: Date.now()
        }])
        
        // Auto-remover después de 8 segundos
        setTimeout(() => {
          removeNotification(nuevaNotif.id)
        }, 8000)
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  if (notifications.length === 0) return null
  
  return (
    <div style={styles.container}>
      {notifications.map(notif => (
        <div 
          key={notif.id}
          style={{
            ...styles.toast,
            ...(notif.tipo === 'confirmar' ? styles.toastSuccess : styles.toastCancel)
          }}
        >
          <div style={styles.toastIcon}>
            {notif.tipo === 'confirmar' ? '✅' : '❌'}
          </div>
          
          <div style={styles.toastContent}>
            <div style={styles.toastTitle}>
              {notif.titulo}
            </div>
            <div style={styles.toastMessage}>
              {notif.mensaje}
            </div>
          </div>
          
          <button
            style={styles.closeButton}
            onClick={() => removeNotification(notif.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '400px'
  },
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    minHeight: '80px',
    animation: 'slideIn 0.3s ease-out'
  },
  toastSuccess: {
    borderLeft: '4px solid #10b981'
  },
  toastCancel: {
    borderLeft: '4px solid #ef4444'
  },
  toastIcon: {
    fontSize: '24px',
    marginTop: '2px'
  },
  toastContent: {
    flex: 1,
    minWidth: 0
  },
  toastTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  toastMessage: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px'
  }
}

// CSS para animación (agregar a tu CSS global)
const globalCSS = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`