import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'

export default function ClientesScreen() {
  const { t } = useTranslation()
  const [pacientes, setPacientes] = useState([])
  const [filteredPacientes, setFilteredPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getPacientes()
  }, [])

  useEffect(() => {
    // Filtrar pacientes cuando cambia el término de búsqueda
    if (searchTerm.trim() === '') {
      setFilteredPacientes(pacientes)
    } else {
      const filtered = pacientes.filter(paciente => {
        const fullName = `${paciente.nombre} ${paciente.apellido}`.toLowerCase()
        const telefono = paciente.telefono?.toLowerCase() || ''
        const email = paciente.email?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()
        
        return fullName.includes(search) || 
               telefono.includes(search) || 
               email.includes(search)
      })
      setFilteredPacientes(filtered)
    }
  }, [searchTerm, pacientes])

  const getPacientes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching pacientes:', error)
        alert(t('errors.loadError', { item: t('patients.title') }))
      } else {
        setPacientes(data || [])
        setFilteredPacientes(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (paciente) => {
    if (!window.confirm(t('patients.confirmDelete'))) {
      return
    }

    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', paciente.id)

      if (error) {
        console.error('Error deleting paciente:', error)
        alert(t('errors.deleteError', { item: t('patients.title') }))
      } else {
        alert(t('clients.patientDeleted'))
        getPacientes() // Recargar lista
      }
    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.deleteError', { item: t('patients.title') }))
    }
  }

  const calculateAge = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A'
    const birth = new Date(fechaNacimiento)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const PacienteCard = ({ paciente }) => (
    <div style={styles.pacienteCard}>
      <div style={styles.pacienteHeader}>
        <div style={styles.pacienteAvatar}>
          <span style={styles.pacienteInitials}>
            {paciente.nombre.charAt(0)}{paciente.apellido.charAt(0)}
          </span>
        </div>
        <div style={styles.pacienteMainInfo}>
          <div style={styles.pacienteNombre}>
            {paciente.nombre} {paciente.apellido}
          </div>
          <div style={styles.pacienteDetalle}>
            {paciente.genero} • {calculateAge(paciente.fecha_nacimiento)} años
          </div>
          <div style={styles.pacienteContacto}>
            {paciente.telefono || t('clients.noPhone')} {paciente.email && `• ${paciente.email}`}
          </div>
        </div>
      </div>

      <div style={styles.pacienteActions}>
        <button
          style={styles.actionButton}
          onClick={() => navigate(`/paciente/${paciente.id}`, { state: { paciente } })}
        >
          👁️ {t('clients.view')}
        </button>
        <button
          style={styles.actionButtonEdit}
          onClick={() => navigate(`/editar-paciente/${paciente.id}`, { state: { paciente } })}
        >
          ✏️ {t('common.edit')}
        </button>
        <button
          style={styles.actionButtonDelete}
          onClick={() => handleDelete(paciente)}
        >
          🗑️ {t('common.delete')}
        </button>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>🔍</div>
      <div style={styles.emptyTitle}>
        {searchTerm ? t('clients.noResults') : t('patients.noPatients')}
      </div>
      <div style={styles.emptySubtitle}>
        {searchTerm 
          ? t('clients.tryAnother') 
          : t('clients.addFirstDesc')}
      </div>
      {!searchTerm && (
        <button 
          style={styles.emptyButton}
          onClick={() => navigate('/agregar-paciente')}
        >
          + {t('patients.addPatient')}
        </button>
      )}
    </div>
  )

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>{t('dashboard.managePatients')}</div>
          <div style={styles.subtitle}>
            {t('patients.totalCount', { count: filteredPacientes.length })}
          </div>
        </div>
        <button 
          onClick={() => navigate('/agregar-paciente')}
          style={styles.addButton}
        >
          + {t('common.new')}
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder={t('patients.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            style={styles.clearButton}
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Lista de pacientes */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>{t('common.loading')}</div>
          </div>
        ) : filteredPacientes.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={styles.pacientesList}>
            {filteredPacientes.map(paciente => (
              <PacienteCard key={paciente.id} paciente={paciente} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>{t('common.poweredBy')}</div>
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
    padding: '8px 12px',
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
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  searchContainer: {
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    paddingRight: '40px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  clearButton: {
    position: 'absolute',
    right: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: '#e5e7eb',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  pacientesList: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  pacienteCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  pacienteHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '16px',
  },
  pacienteAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
  },
  pacienteInitials: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  pacienteMainInfo: {
    flex: 1,
  },
  pacienteNombre: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  pacienteDetalle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '2px',
  },
  pacienteContacto: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  pacienteActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  actionButtonEdit: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  actionButtonDelete: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 32px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
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