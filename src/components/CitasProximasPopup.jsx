import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CitasProximasPopup() {
  const navigate = useNavigate()
  const [citasHoy, setCitasHoy] = useState([])
  const [citasManana, setCitasManana] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarPopup, setMostrarPopup] = useState(false)

  useEffect(() => {
    verificarYCargarCitas()
  }, [])

  const verificarYCargarCitas = async () => {
    try {
      // Verificar si ya se mostró hoy
      const ultimaVez = localStorage.getItem('popup_citas_visto')
      const hoy = new Date().toISOString().split('T')[0]

      if (ultimaVez === hoy) {
        setLoading(false)
        return // Ya se mostró hoy
      }

      // Cargar citas
      await cargarCitas()

    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const cargarCitas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const hoy = new Date()
      const manana = new Date(hoy)
      manana.setDate(manana.getDate() + 1)

      const fechaHoy = hoy.toISOString().split('T')[0]
      const fechaManana = manana.toISOString().split('T')[0]

      // Cargar citas de HOY
      const { data: citasHoyData } = await supabase
        .from('citas')
        .select(`
          *,
          paciente:pacientes(nombre, apellido, telefono)
        `)
        .eq('dentista_id', user.id)
        .eq('fecha_cita', fechaHoy)
        .in('estado', ['pendiente', 'confirmada'])
        .order('hora_inicio')

      setCitasHoy(citasHoyData || [])

      // Cargar citas de MAÑANA
      const { data: citasMananaData } = await supabase
        .from('citas')
        .select(`
          *,
          paciente:pacientes(nombre, apellido, telefono)
        `)
        .eq('dentista_id', user.id)
        .eq('fecha_cita', fechaManana)
        .in('estado', ['pendiente', 'confirmada'])
        .order('hora_inicio')

      setCitasManana(citasMananaData || [])

      // Mostrar popup solo si hay citas
      if ((citasHoyData && citasHoyData.length > 0) || (citasMananaData && citasMananaData.length > 0)) {
        setMostrarPopup(true)
      }

    } catch (error) {
      console.error('Error cargando citas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cerrarPopup = () => {
    // Guardar en localStorage que ya se vio hoy
    const hoy = new Date().toISOString().split('T')[0]
    localStorage.setItem('popup_citas_visto', hoy)
    setMostrarPopup(false)
  }

  const irACita = (citaId) => {
    cerrarPopup()
    navigate(`/cita/${citaId}`)
  }

  const esCitaPasada = (horaCita) => {
    const ahora = new Date()
    const [hora, minuto] = horaCita.split(':')
    const fechaCita = new Date()
    fechaCita.setHours(parseInt(hora), parseInt(minuto), 0, 0)
    return fechaCita < ahora
  }

  if (loading || !mostrarPopup) {
    return null
  }

  const totalCitas = citasHoy.length + citasManana.length

  return (
    <div style={styles.overlay} onClick={cerrarPopup}>
      <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.icon}>📅</div>
            <div>
              <div style={styles.title}>Citas Próximas</div>
              <div style={styles.subtitle}>
                {totalCitas} {totalCitas === 1 ? 'cita programada' : 'citas programadas'}
              </div>
            </div>
          </div>
          <button style={styles.closeButton} onClick={cerrarPopup}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Citas de HOY */}
          {citasHoy.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionBadge}>🔴 HOY</span>
                <span style={styles.sectionCount}>{citasHoy.length}</span>
              </div>
              
              <div style={styles.citasList}>
                {citasHoy.map((cita, index) => {
                  const isPasada = esCitaPasada(cita.hora_inicio)
                  
                  return (
                    <div
                      key={index}
                      style={{
                        ...styles.citaCard,
                        ...(isPasada && styles.citaCardPasada)
                      }}
                      onClick={() => irACita(cita.id)}
                    >
                      <div style={styles.citaHora}>
                        🕐 {cita.hora_inicio?.slice(0, 5)} - {cita.hora_fin?.slice(0, 5)}
                        {isPasada && (
                          <span style={styles.pasadaBadge}>Ya pasó</span>
                        )}
                      </div>
                      <div style={styles.citaPaciente}>
                        👤 {cita.paciente?.nombre} {cita.paciente?.apellido}
                      </div>
                      <div style={styles.citaMotivo}>
                        {cita.motivo}
                      </div>
                      {cita.paciente?.telefono && (
                        <div style={styles.citaTelefono}>
                          📱 {cita.paciente.telefono}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Citas de MAÑANA */}
          {citasManana.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{...styles.sectionBadge, backgroundColor: '#f59e0b'}}>🟠 MAÑANA</span>
                <span style={styles.sectionCount}>{citasManana.length}</span>
              </div>
              
              <div style={styles.citasList}>
                {citasManana.map((cita, index) => (
                  <div
                    key={index}
                    style={styles.citaCard}
                    onClick={() => irACita(cita.id)}
                  >
                    <div style={styles.citaHora}>
                      🕐 {cita.hora_inicio?.slice(0, 5)} - {cita.hora_fin?.slice(0, 5)}
                    </div>
                    <div style={styles.citaPaciente}>
                      👤 {cita.paciente?.nombre} {cita.paciente?.apellido}
                    </div>
                    <div style={styles.citaMotivo}>
                      {cita.motivo}
                    </div>
                    {cita.paciente?.telefono && (
                      <div style={styles.citaTelefono}>
                        📱 {cita.paciente.telefono}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.verTodasButton} onClick={() => {
            cerrarPopup()
            navigate('/calendario')
          }}>
            📆 Ver Calendario Completo
          </button>
          <button style={styles.entendidoButton} onClick={cerrarPopup}>
            ✓ Entendido
          </button>
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
    animation: 'fadeIn 0.3s ease',
  },
  popup: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    borderRadius: '20px 20px 0 0',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  icon: {
    fontSize: '48px',
    lineHeight: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#dbeafe',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionBadge: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionCount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  citasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  citaCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  citaCardPasada: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    opacity: 0.7,
  },
  citaHora: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pasadaBadge: {
    padding: '2px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
  },
  citaPaciente: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  citaMotivo: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  citaTelefono: {
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '500',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  verTodasButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: '2px solid #3b82f6',
    borderRadius: '10px',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  entendidoButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}