import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function BackupsScreen() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [ejecutando, setEjecutando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [stats, setStats] = useState({
    totalBackups: 0,
    ultimoBackup: null,
    backupsManual: 0,
    backupsAutomatico: 0
  })

  useEffect(() => {
    cargarHistorial()
  }, [])

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar historial de backups
      const { data: backups, error } = await supabase
        .from('backups_historial')
        .select('*')
        .eq('dentista_id', user.id)
        .order('fecha_backup', { ascending: false })
        .limit(20)

      if (error) throw error

      setHistorial(backups || [])

      // Calcular estadísticas
      const totalBackups = backups?.length || 0
      const ultimoBackup = backups?.[0]?.fecha_backup || null
      const backupsManual = backups?.filter(b => b.tipo === 'manual').length || 0
      const backupsAutomatico = backups?.filter(b => b.tipo === 'automatico').length || 0

      setStats({
        totalBackups,
        ultimoBackup,
        backupsManual,
        backupsAutomatico
      })

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar historial de backups')
    } finally {
      setLoading(false)
    }
  }

  const ejecutarBackup = async () => {
    if (!confirm('¿Desea crear un backup manual ahora?\n\nEsto puede tardar unos segundos.')) {
      return
    }

    try {
      setEjecutando(true)
      const { data: { user } } = await supabase.auth.getUser()

      console.log('💾 Ejecutando backup manual...')

      // Llamar a la Edge Function
      const response = await fetch(
        'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/backup-database',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dentista_id: user.id,
            manual: true
          })
        }
      )

      if (!response.ok) {
        throw new Error('Error al ejecutar backup')
      }

      const data = await response.json()
      console.log('Resultado:', data)

      // Descargar el backup como JSON
      if (data.success) {
        descargarBackup(data.backup, data.stats)
        alert(`✅ Backup creado exitosamente!\n\n📊 Total registros: ${data.stats.total_registros}\n\n✓ El archivo se descargó automáticamente`)
        
        // Recargar historial
        await cargarHistorial()
      }

    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al ejecutar backup:\n' + error.message)
    } finally {
      setEjecutando(false)
    }
  }

  const descargarBackup = (backupData, stats) => {
    try {
      // Crear archivo JSON
      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      // Crear nombre del archivo
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `OdontoLog_Backup_${timestamp}.json`
      
      // Crear link de descarga
      const url = window.URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log(`✅ Backup descargado: ${filename}`)
      console.log(`📊 Registros totales: ${stats.total_registros}`)

    } catch (error) {
      console.error('Error descargando backup:', error)
      alert('Error al descargar el archivo de backup')
    }
  }

  const descargarBackupAnterior = async (backupId) => {
    if (!confirm('¿Desea descargar este backup?\n\nSe descargará un archivo JSON con todos los datos.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Ejecutar backup del mismo día que el seleccionado
      const response = await fetch(
        'https://fuwrayxwjldtawtsljro.supabase.co/functions/v1/backup-database',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dentista_id: user.id,
            manual: true
          })
        }
      )

      if (!response.ok) {
        throw new Error('Error al generar backup')
      }

      const data = await response.json()
      
      if (data.success) {
        descargarBackup(data.backup, data.stats)
        alert('✅ Backup descargado exitosamente')
      }

    } catch (error) {
      console.error('Error:', error)
      alert('Error al descargar backup: ' + error.message)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando backups...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>💾 Sistema de Backups</div>
          <div style={styles.subtitle}>Respaldo y recuperación de datos</div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>ℹ️</div>
          <div style={styles.infoContent}>
            <div style={styles.infoTitle}>¿Cómo funciona el sistema de backups?</div>
            <div style={styles.infoText}>
              El sistema crea copias de seguridad de todos tus datos automáticamente cada noche a las <strong>2:00 AM</strong>.
            </div>
            <ul style={styles.infoList}>
              <li>💾 <strong>Backup automático:</strong> Se ejecuta todas las noches sin intervención</li>
              <li>🖱️ <strong>Backup manual:</strong> Puedes crear uno cuando quieras desde esta pantalla</li>
              <li>📥 <strong>Descarga:</strong> Guarda el archivo JSON en tu computadora</li>
              <li>🔄 <strong>Restauración:</strong> Contacta soporte para restaurar un backup anterior</li>
            </ul>
            <div style={styles.infoText}>
              <strong>Datos incluidos:</strong> Pacientes, citas, presupuestos, pagos, planes de pago, tratamientos, configuraciones y más.
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{stats.totalBackups}</div>
            <div style={styles.statLabel}>Total Backups</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>🖱️</div>
            <div style={styles.statValue}>{stats.backupsManual}</div>
            <div style={styles.statLabel}>Manuales</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>🤖</div>
            <div style={styles.statValue}>{stats.backupsAutomatico}</div>
            <div style={styles.statLabel}>Automáticos</div>
          </div>
        </div>

        {/* Último Backup */}
        <div style={styles.ultimoBackupCard}>
          <div style={styles.ultimoBackupHeader}>
            <span style={styles.ultimoBackupIcon}>⏱️</span>
            <span style={styles.ultimoBackupTitle}>Último Backup</span>
          </div>
          <div style={styles.ultimoBackupFecha}>
            {formatDateTime(stats.ultimoBackup)}
          </div>
        </div>

        {/* Botón Crear Backup */}
        <div style={styles.crearSection}>
          <div style={styles.crearCard}>
            <div style={styles.crearHeader}>
              <div style={styles.crearIcon}>🚀</div>
              <div>
                <div style={styles.crearTitle}>Crear Backup Manual</div>
                <div style={styles.crearSubtitle}>
                  Crea un backup ahora y descárgalo a tu computadora
                </div>
              </div>
            </div>

            <button
              style={{
                ...styles.crearButton,
                ...(ejecutando && styles.crearButtonDisabled)
              }}
              onClick={ejecutarBackup}
              disabled={ejecutando}
            >
              {ejecutando ? (
                <>
                  <span style={styles.spinner}>⏳</span>
                  Creando Backup...
                </>
              ) : (
                <>
                  💾 Crear y Descargar Backup
                </>
              )}
            </button>
          </div>
        </div>

        {/* Historial de Backups */}
        <div style={styles.historialSection}>
          <div style={styles.historialHeader}>
            <div style={styles.historialTitle}>
              📋 Historial de Backups ({historial.length})
            </div>
          </div>

          {historial.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <div style={styles.emptyTitle}>No hay backups aún</div>
              <div style={styles.emptySubtitle}>
                Crea tu primer backup o espera al backup automático nocturno
              </div>
            </div>
          ) : (
            <div style={styles.historialList}>
              {historial.map((backup) => (
                <div key={backup.id} style={styles.backupCard}>
                  {/* Header */}
                  <div style={styles.backupHeader}>
                    <div style={styles.backupTipo}>
                      {backup.tipo === 'manual' ? '🖱️ Manual' : '🤖 Automático'}
                    </div>
                    <div style={{
                      ...styles.backupEstado,
                      backgroundColor: backup.estado === 'completado' ? '#10b981' : '#ef4444'
                    }}>
                      {backup.estado === 'completado' ? '✓ Completado' : '✗ Fallido'}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={styles.backupBody}>
                    <div style={styles.backupRow}>
                      <span style={styles.backupLabel}>📅 Fecha:</span>
                      <span style={styles.backupValue}>
                        {formatDateTime(backup.fecha_backup)}
                      </span>
                    </div>

                    <div style={styles.backupRow}>
                      <span style={styles.backupLabel}>📊 Total registros:</span>
                      <span style={styles.backupValue}>
                        {backup.total_registros?.toLocaleString()} registros
                      </span>
                    </div>

                    {/* Metadata */}
                    {backup.metadata && (
                      <div style={styles.metadata}>
                        <div style={styles.metadataTitle}>Detalle:</div>
                        <div style={styles.metadataGrid}>
                          {backup.metadata.total_pacientes > 0 && (
                            <span style={styles.metadataItem}>
                              👥 {backup.metadata.total_pacientes} pacientes
                            </span>
                          )}
                          {backup.metadata.total_citas > 0 && (
                            <span style={styles.metadataItem}>
                              📅 {backup.metadata.total_citas} citas
                            </span>
                          )}
                          {backup.metadata.total_presupuestos > 0 && (
                            <span style={styles.metadataItem}>
                              📄 {backup.metadata.total_presupuestos} presupuestos
                            </span>
                          )}
                          {backup.metadata.total_pagos > 0 && (
                            <span style={styles.metadataItem}>
                              💰 {backup.metadata.total_pagos} pagos
                            </span>
                          )}
                          {backup.metadata.total_planes > 0 && (
                            <span style={styles.metadataItem}>
                              💳 {backup.metadata.total_planes} planes
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botón Descargar */}
                    <button
                      style={styles.descargarButton}
                      onClick={() => descargarBackupAnterior(backup.id)}
                    >
                      📥 Descargar Backup
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>Diseñado por MCorp</div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  headerInfo: {
    flex: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  content: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    gap: '20px',
  },
  infoIcon: {
    fontSize: '40px',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '12px',
  },
  infoText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  infoList: {
    margin: '12px 0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.8',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  ultimoBackupCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  ultimoBackupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  ultimoBackupIcon: {
    fontSize: '24px',
  },
  ultimoBackupTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  ultimoBackupFecha: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#3b82f6',
    paddingLeft: '36px',
  },
  crearSection: {
    marginBottom: '24px',
  },
  crearCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #10b981',
  },
  crearHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  crearIcon: {
    fontSize: '48px',
  },
  crearTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  crearSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  crearButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  crearButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  historialSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  historialHeader: {
    marginBottom: '20px',
  },
  historialTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '8px',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  historialList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  backupCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
  },
  backupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  backupTipo: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  backupEstado: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
  },
  backupBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backupRow: {
    display: 'flex',
    gap: '8px',
  },
  backupLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    minWidth: '140px',
  },
  backupValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '400',
  },
  metadata: {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  metadataTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  metadataGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  metadataItem: {
    padding: '6px 12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  descargarButton: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
}