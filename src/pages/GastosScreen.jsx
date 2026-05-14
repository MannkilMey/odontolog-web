import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { useMoneda } from '../hooks/useMoneda'

export default function GastosScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()
  const [loading, setLoading] = useState(true)
  const [gastos, setGastos] = useState([])
  const [config, setConfig] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  const [formData, setFormData] = useState({
    fecha_gasto: new Date().toISOString().split('T')[0],
    categoria: 'materiales',
    concepto: '',
    monto: '',
    proveedor: '',
    numero_factura: '',
    metodo_pago: 'efectivo',
    notas: ''
  })

  const categorias = [
    { value: 'materiales', label: t('gastos.categories.materials'), icon: '🦷' },
    { value: 'equipamiento', label: t('gastos.categories.equipment'), icon: '🔧' },
    { value: 'servicios', label: t('gastos.categories.services'), icon: '📋' },
    { value: 'salarios', label: t('gastos.categories.salaries'), icon: '👥' },
    { value: 'alquiler', label: t('gastos.categories.rent'), icon: '🏢' },
    { value: 'servicios_publicos', label: t('gastos.categories.utilities'), icon: '💡' },
    { value: 'marketing', label: t('gastos.categories.marketing'), icon: '📢' },
    { value: 'impuestos', label: t('gastos.categories.taxes'), icon: '📊' },
    { value: 'mantenimiento', label: t('gastos.categories.maintenance'), icon: '🔨' },
    { value: 'otros', label: t('gastos.categories.other'), icon: '📦' }
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

      // Cargar gastos
      const { data: gastosData, error } = await supabase
        .from('gastos_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .order('fecha_gasto', { ascending: false })

      if (error) throw error
      setGastos(gastosData || [])

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('gastos.title') }))
    } finally {
      setLoading(false)
    }
  }

  const openModal = (gasto = null) => {
    if (gasto) {
      setEditingItem(gasto)
      setFormData({
        fecha_gasto: gasto.fecha_gasto,
        categoria: gasto.categoria,
        concepto: gasto.concepto,
        monto: gasto.monto.toString(),
        proveedor: gasto.proveedor || '',
        numero_factura: gasto.numero_factura || '',
        metodo_pago: gasto.metodo_pago,
        notas: gasto.notas || ''
      })
    } else {
      setEditingItem(null)
      setFormData({
        fecha_gasto: new Date().toISOString().split('T')[0],
        categoria: 'materiales',
        concepto: '',
        monto: '',
        proveedor: '',
        numero_factura: '',
        metodo_pago: 'efectivo',
        notas: ''
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
    if (!formData.concepto.trim()) {
      alert(t('errors.requiredField', { field: t('gastos.concept') }))
      return
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert(t('gastos.amountError'))
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const dataToSave = {
        dentista_id: user.id,
        fecha_gasto: formData.fecha_gasto,
        categoria: formData.categoria,
        concepto: formData.concepto.trim(),
        monto: parseFloat(formData.monto),
        proveedor: formData.proveedor.trim() || null,
        numero_factura: formData.numero_factura.trim() || null,
        metodo_pago: formData.metodo_pago,
        notas: formData.notas.trim() || null,
        updated_at: new Date().toISOString()
      }

      if (editingItem) {
        const { error } = await supabase
          .from('gastos_clinica')
          .update(dataToSave)
          .eq('id', editingItem.id)

        if (error) throw error
        alert(`✅ ${t('gastos.updated')}`)
      } else {
        const { error } = await supabase
          .from('gastos_clinica')
          .insert(dataToSave)

        if (error) throw error
        alert(`✅ ${t('gastos.added')}`)
      }

      closeModal()
      loadData()

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.saveError', { item: t('gastos.title') }) + ': ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('gastos.deleteConfirm'))) {
      return
    }

    try {
      const { error } = await supabase
        .from('gastos_clinica')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert(`✅ ${t('gastos.deleted')}`)
      loadData()

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.deleteError', { item: t('gastos.title') }) + ': ' + error.message)
    }
  }


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoriaInfo = (categoria) => {
    return categorias.find(c => c.value === categoria) || categorias[categorias.length - 1]
  }

  // Filtrar gastos
  const gastosFiltrados = filtroCategoria === 'todos' 
    ? gastos 
    : gastos.filter(g => g.categoria === filtroCategoria)

  // Estadísticas
  const stats = {
    totalGastos: gastos.reduce((sum, g) => sum + Number(g.monto), 0),
    gastosMes: gastos
      .filter(g => {
        const fecha = new Date(g.fecha_gasto)
        const ahora = new Date()
        return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear()
      })
      .reduce((sum, g) => sum + Number(g.monto), 0),
    porCategoria: {}
  }

  gastos.forEach(gasto => {
    if (!stats.porCategoria[gasto.categoria]) {
      stats.porCategoria[gasto.categoria] = 0
    }
    stats.porCategoria[gasto.categoria] += Number(gasto.monto)
  })

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
         {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>💸 {t('gastos.title')}</div>
          <div style={styles.subtitle}>{t('gastos.count', { count: gastos.length })}</div>
        </div>
        <button onClick={() => openModal()} style={styles.addButton}>
          + {t('gastos.newExpense')}
        </button>
      </div>

      <div style={styles.content}>
        {/* Estadísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>{t('gastos.totalExpenses')}</div>
            <div style={styles.statValue}>{formatMoney(stats.totalGastos)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>{t('equipo.thisMonth')}</div>
            <div style={styles.statValue}>{formatMoney(stats.gastosMes)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>{t('gastos.categoriesLabel')}</div>
            <div style={styles.statValue}>{Object.keys(stats.porCategoria).length}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtersContainer}>
          <button
            style={{
              ...styles.filterButton,
              ...(filtroCategoria === 'todos' && styles.filterButtonActive)
            }}
            onClick={() => setFiltroCategoria('todos')}
          >
            {t('common.all')} ({gastos.length})
          </button>
          {categorias.map(cat => {
            const count = gastos.filter(g => g.categoria === cat.value).length
            if (count === 0) return null
            return (
              <button
                key={cat.value}
                style={{
                  ...styles.filterButton,
                  ...(filtroCategoria === cat.value && styles.filterButtonActive)
                }}
                onClick={() => setFiltroCategoria(cat.value)}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Lista de Gastos */}
        {gastosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💸</div>
            <div style={styles.emptyText}>
              {filtroCategoria === 'todos' 
                ? t('gastos.noExpenses')
                : t('gastos.noExpensesCategory')
              }
            </div>
            <button 
              style={styles.emptyButton}
              onClick={() => openModal()}
            >
              + {t('gastos.addFirst')}
            </button>
          </div>
        ) : (
          <div style={styles.gastosList}>
            {gastosFiltrados.map((gasto) => {
              const catInfo = getCategoriaInfo(gasto.categoria)
              
              return (
                <div key={gasto.id} style={styles.gastoCard}>
                  <div style={styles.gastoHeader}>
                    <div style={styles.gastoIcon}>{catInfo.icon}</div>
                    <div style={styles.gastoInfo}>
                      <div style={styles.gastoConcepto}>{gasto.concepto}</div>
                      <div style={styles.gastoCategoria}>{catInfo.label}</div>
                    </div>
                    <div style={styles.gastoMonto}>
                      {formatMoney(gasto.monto)}
                    </div>
                  </div>

                  <div style={styles.gastoDetails}>
                    <div style={styles.gastoFecha}>
                      📅 {formatDate(gasto.fecha_gasto)}
                    </div>
                    {gasto.proveedor && (
                      <div style={styles.gastoProveedor}>
                        🏪 {gasto.proveedor}
                      </div>
                    )}
                    {gasto.numero_factura && (
                      <div style={styles.gastoFactura}>
                        🧾 {gasto.numero_factura}
                      </div>
                    )}
                  </div>

                  {gasto.notas && (
                    <div style={styles.gastoNotas}>{gasto.notas}</div>
                  )}

                  <div style={styles.gastoActions}>
                    <button
                      style={styles.editButton}
                      onClick={() => openModal(gasto)}
                    >
                      ✎ {t('common.edit')}
                    </button>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDelete(gasto.id)}
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
                 {editingItem ? `✎ ${t('gastos.editExpense')}` : `+ ${t('gastos.newExpense')}`}
              </div>
              <button onClick={closeModal} style={styles.modalClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('common.date')} *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.fecha_gasto}
                    onChange={(e) => updateFormField('fecha_gasto', e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>{t('catalog.category')} *</label>
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
                </div>
              </div>

              <label style={styles.label}>{t('gastos.concept')} *</label>
              <input
                type="text"
                style={styles.input}
                placeholder={t('gastos.conceptPlaceholder')}
                value={formData.concepto}
                onChange={(e) => updateFormField('concepto', e.target.value)}
              />

              <label style={styles.label}>{t('export.amount')} *</label>
              <div style={styles.montoInput}>
                <span style={styles.montoSymbol}>{config?.simbolo_moneda || 'Gs.'}</span>
                <input
                  type="number"
                  style={{...styles.input, ...styles.montoField}}
                  placeholder="0"
                  min="0"
                  step="1000"
                  value={formData.monto}
                  onChange={(e) => updateFormField('monto', e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('gastos.supplier')} ({t('common.optional')})</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('gastos.supplierPlaceholder')}
                    value={formData.proveedor}
                    onChange={(e) => updateFormField('proveedor', e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>{t('gastos.invoiceNumber')} ({t('common.optional')})</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="001-001-0000001"
                    value={formData.numero_factura}
                    onChange={(e) => updateFormField('numero_factura', e.target.value)}
                  />
                </div>
              </div>

              <label style={styles.label}>{t('gastos.paymentMethod')}</label>
              <select
                style={styles.select}
                value={formData.metodo_pago}
                onChange={(e) => updateFormField('metodo_pago', e.target.value)}
              >
                <option value="efectivo">💵 {t('gastos.methods.cash')}</option>
                <option value="transferencia">🏦 {t('gastos.methods.transfer')}</option>
                <option value="tarjeta">💳 {t('gastos.methods.card')}</option>
                <option value="cheque">📝 {t('gastos.methods.check')}</option>
                <option value="otro">💰 {t('gastos.methods.other')}</option>
              </select>

              <label style={styles.label}>{t('common.notes')} ({t('common.optional')})</label>
              <textarea
                style={{...styles.input, ...styles.textArea}}
                placeholder="Notas adicionales..."
                value={formData.notas}
                onChange={(e) => updateFormField('notas', e.target.value)}
                rows={2}
              />
            </div>

            <div style={styles.modalFooter}>
              <button onClick={closeModal} style={styles.cancelButton}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                {editingItem ? `💾 ${t('common.save')}` : `+ ${t('gastos.registerExpense')}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
    backgroundColor: '#ef4444',
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
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
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
    padding: '20px',
    border: '2px solid #fee2e2',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ef4444',
  },
  filtersContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
    color: '#ffffff',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  gastosList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px',
  },
  gastoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #fee2e2',
  },
  gastoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  gastoIcon: {
    fontSize: '32px',
  },
  gastoInfo: {
    flex: 1,
  },
  gastoConcepto: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  gastoCategoria: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  gastoMonto: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ef4444',
  },
  gastoDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
    fontSize: '13px',
    color: '#6b7280',
  },
  gastoFecha: {},
  gastoProveedor: {},
  gastoFactura: {},
  gastoNotas: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  gastoActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
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
    minHeight: '60px',
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
  },
  montoInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    padding: '4px 12px',
  },
  montoSymbol: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ef4444',
  },
  montoField: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '18px',
    fontWeight: '600',
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
    backgroundColor: '#ef4444',
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