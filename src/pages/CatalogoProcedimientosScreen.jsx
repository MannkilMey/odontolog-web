import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CatalogoProcedimientosScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [procedimientos, setProcedimientos] = useState([])
  const [config, setConfig] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  const [formData, setFormData] = useState({
    nombre_procedimiento: '',
    categoria: 'limpieza',
    precio_base: '',
    duracion_estimada_minutos: 60,
    descripcion: '',
    activo: true
  })

  const categorias = [
    { value: 'limpieza', label: 'Limpieza', icon: '🦷' },
    { value: 'restauracion', label: 'Restauración', icon: '🔵' },
    { value: 'endodoncia', label: 'Endodoncia', icon: '🟤' },
    { value: 'cirugia', label: 'Cirugía', icon: '⚕️' },
    { value: 'ortodencia', label: 'Ortodoncia', icon: '🟣' },
    { value: 'protesis', label: 'Prótesis', icon: '🟡' },
    { value: 'estetica', label: 'Estética', icon: '✨' },
    { value: 'prevencion', label: 'Prevención', icon: '🛡️' },
    { value: 'otros', label: 'Otros', icon: '📋' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar configuración
      const { data: configData } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      setConfig(configData)

      // Cargar procedimientos
      const { data: procData, error } = await supabase
        .from('catalogo_procedimientos')
        .select('*')
        .eq('dentista_id', user.id)
        .order('nombre_procedimiento')

      if (error) throw error
      setProcedimientos(procData || [])

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (procedimiento = null) => {
    if (procedimiento) {
      setEditingItem(procedimiento)
      setFormData({
        nombre_procedimiento: procedimiento.nombre_procedimiento,
        categoria: procedimiento.categoria,
        precio_base: procedimiento.precio_base.toString(),
        duracion_estimada_minutos: procedimiento.duracion_estimada_minutos || 60,
        descripcion: procedimiento.descripcion || '',
        activo: procedimiento.activo
      })
    } else {
      setEditingItem(null)
      setFormData({
        nombre_procedimiento: '',
        categoria: 'limpieza',
        precio_base: '',
        duracion_estimada_minutos: 60,
        descripcion: '',
        activo: true
      })
    }
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingItem(null)
  }

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.nombre_procedimiento.trim()) {
      alert('El nombre del procedimiento es requerido')
      return
    }

    if (!formData.precio_base || parseFloat(formData.precio_base) < 0) {
      alert('El precio debe ser mayor o igual a 0')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const dataToSave = {
        dentista_id: user.id,
        nombre_procedimiento: formData.nombre_procedimiento.trim(),
        categoria: formData.categoria,
        precio_base: parseFloat(formData.precio_base),
        duracion_estimada_minutos: parseInt(formData.duracion_estimada_minutos),
        descripcion: formData.descripcion.trim() || null,
        activo: formData.activo,
        updated_at: new Date().toISOString()
      }

      if (editingItem) {
        // Actualizar
        const { error } = await supabase
          .from('catalogo_procedimientos')
          .update(dataToSave)
          .eq('id', editingItem.id)

        if (error) throw error
        alert('✅ Procedimiento actualizado')
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('catalogo_procedimientos')
          .insert(dataToSave)

        if (error) throw error
        alert('✅ Procedimiento agregado')
      }

      closeModal()
      loadData()

    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este procedimiento?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('catalogo_procedimientos')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('✅ Procedimiento eliminado')
      loadData()

    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar: ' + error.message)
    }
  }

  const toggleActivo = async (procedimiento) => {
    try {
      const { error } = await supabase
        .from('catalogo_procedimientos')
        .update({ activo: !procedimiento.activo })
        .eq('id', procedimiento.id)

      if (error) throw error
      loadData()

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar estado')
    }
  }

  const getCategoriaInfo = (categoria) => {
    return categorias.find(c => c.value === categoria) || categorias[categorias.length - 1]
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando catálogo...</div>
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
          <div style={styles.title}>📚 Catálogo de Procedimientos</div>
          <div style={styles.subtitle}>{procedimientos.length} procedimientos registrados</div>
        </div>
        <button onClick={() => openModal()} style={styles.addButton}>
          + Nuevo
        </button>
      </div>

      <div style={styles.content}>
        {procedimientos.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyTitle}>Sin procedimientos</div>
            <div style={styles.emptyText}>
              Agrega procedimientos a tu catálogo para usarlos en presupuestos
            </div>
            <button onClick={() => openModal()} style={styles.emptyButton}>
              + Agregar Primer Procedimiento
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {procedimientos.map(proc => {
              const catInfo = getCategoriaInfo(proc.categoria)
              
              return (
                <div key={proc.id} style={{
                  ...styles.card,
                  ...(proc.activo ? {} : styles.cardInactive)
                }}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardIcon}>{catInfo.icon}</div>
                    <div style={styles.cardCategory}>{catInfo.label}</div>
                  </div>
                  
                  <div style={styles.cardTitle}>{proc.nombre_procedimiento}</div>
                  
                  {proc.descripcion && (
                    <div style={styles.cardDescription}>{proc.descripcion}</div>
                  )}
                  
                  <div style={styles.cardPrice}>
                    {config?.simbolo_moneda || 'Gs.'} {Number(proc.precio_base).toLocaleString()}
                  </div>
                  
                  <div style={styles.cardDuration}>
                    ⏱️ {proc.duracion_estimada_minutos} min
                  </div>
                  
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => toggleActivo(proc)}
                      style={{
                        ...styles.actionButton,
                        backgroundColor: proc.activo ? '#10b981' : '#6b7280'
                      }}
                    >
                      {proc.activo ? '✓ Activo' : '✕ Inactivo'}
                    </button>
                    <button
                      onClick={() => openModal(proc)}
                      style={styles.actionButton}
                    >
                      ✎ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(proc.id)}
                      style={{...styles.actionButton, backgroundColor: '#ef4444'}}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVisible && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {editingItem ? '✎ Editar Procedimiento' : '+ Nuevo Procedimiento'}
              </div>
              <button onClick={closeModal} style={styles.modalClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <label style={styles.label}>Nombre del Procedimiento *</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ej: Limpieza dental completa"
                value={formData.nombre_procedimiento}
                onChange={(e) => updateFormField('nombre_procedimiento', e.target.value)}
              />

              <label style={styles.label}>Categoría *</label>
              <select
                style={styles.select}
                value={formData.categoria}
                onChange={(e) => updateFormField('categoria', e.target.value)}
              >
                {categorias.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Precio Base *</label>
                  <div style={styles.priceInput}>
                    <span style={styles.priceSymbol}>{config?.simbolo_moneda || 'Gs.'}</span>
                    <input
                      type="number"
                      style={{...styles.input, ...styles.priceField}}
                      placeholder="0"
                      min="0"
                      step="1000"
                      value={formData.precio_base}
                      onChange={(e) => updateFormField('precio_base', e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Duración (minutos)</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="60"
                    min="15"
                    step="15"
                    value={formData.duracion_estimada_minutos}
                    onChange={(e) => updateFormField('duracion_estimada_minutos', e.target.value)}
                  />
                </div>
              </div>

              <label style={styles.label}>Descripción (opcional)</label>
              <textarea
                style={{...styles.input, ...styles.textArea}}
                placeholder="Descripción detallada del procedimiento..."
                value={formData.descripcion}
                onChange={(e) => updateFormField('descripcion', e.target.value)}
                rows={3}
              />

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => updateFormField('activo', e.target.checked)}
                />
                <span style={styles.checkboxText}>Activo (disponible para usar)</span>
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={closeModal} style={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                {editingItem ? '💾 Guardar Cambios' : '+ Agregar Procedimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '500px',
    margin: '60px auto',
    border: '2px dashed #e5e7eb',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    transition: 'all 0.2s',
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardCategory: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  cardPrice: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '8px',
  },
  cardDuration: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
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
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalBody: {
    padding: '24px',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
    marginTop: '16px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  textArea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
  },
  priceInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '4px 12px',
  },
  priceSymbol: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
  priceField: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '16px',
    fontWeight: '600',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '14px',
    color: '#374151',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
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