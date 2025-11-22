import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generarPresupuestoPDF } from '../utils/pdfGenerator'


export default function PresupuestoScreen() {
  const { pacienteId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [paciente, setPaciente] = useState(null)
  const [config, setConfig] = useState(null)
  const [catalogoProcedimientos, setCatalogoProcedimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    notas: '',
    items: []
  })

  useEffect(() => {
    loadData()
  }, [pacienteId])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar configuración de la clínica
      const { data: configData, error: configError } = await supabase
        .from('configuracion_clinica')
        .select('*')
        .eq('dentista_id', user.id)
        .single()

      if (configError || !configData) {
        alert('⚠️ Primero debes configurar los datos de tu clínica')
        navigate('/configuracion')
        return
      }

      setConfig(configData)

      // Cargar paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single()

      if (pacienteError) throw pacienteError
      setPaciente(pacienteData)

      // Cargar catálogo de procedimientos
      const { data: procedimientos, error: procError } = await supabase
        .from('catalogo_procedimientos')
        .select('*')
        .eq('dentista_id', user.id)
        .eq('activo', true)
        .order('nombre_procedimiento')

      if (procError) {
        console.error('Error loading procedimientos:', procError)
      } else {
        setCatalogoProcedimientos(procedimientos || [])
      }

      // Agregar un item vacío inicial
      setFormData(prev => ({
        ...prev,
        items: [createEmptyItem()]
      }))

    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar datos')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    subtotal: 0,
    procedimiento_id: null,
    numero_diente: null
  })

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateItem = (itemId, field, value) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          
          // Recalcular subtotal si cambia cantidad o precio
          if (field === 'cantidad' || field === 'precio_unitario') {
            updatedItem.subtotal = updatedItem.cantidad * updatedItem.precio_unitario
          }
          
          // Si selecciona un procedimiento del catálogo, llenar datos
          if (field === 'procedimiento_id' && value) {
            const proc = catalogoProcedimientos.find(p => p.id === value)
            if (proc) {
              updatedItem.descripcion = proc.nombre_procedimiento
              updatedItem.precio_unitario = Number(proc.precio_base)
              updatedItem.subtotal = updatedItem.cantidad * Number(proc.precio_base)
            }
          }
          
          return updatedItem
        }
        return item
      })
      
      return { ...prev, items: updatedItems }
    })
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyItem()]
    }))
  }

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    const total = subtotal
    return { subtotal, total }
  }

  const generateNumeroPresupuesto = () => {
    const fecha = new Date()
    const year = fecha.getFullYear().toString().slice(-2)
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `PRES-${year}${month}-${random}`
  }

  const validateForm = () => {
    if (formData.items.length === 0) {
      alert('Debes agregar al menos un item')
      return false
    }

    const hasEmptyItems = formData.items.some(item => 
      !item.descripcion.trim() || item.precio_unitario <= 0
    )

    if (hasEmptyItems) {
      alert('Todos los items deben tener descripción y precio')
      return false
    }

    return true
  }

  const handleSave = async () => {
  if (!validateForm()) return

  setSaving(true)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const totales = calculateTotals()
    const numeroPresupuesto = generateNumeroPresupuesto()

    // Crear presupuesto
    const { data: presupuesto, error: presupuestoError } = await supabase
      .from('presupuestos')
      .insert({
        dentista_id: user.id,
        paciente_id: pacienteId,
        numero_presupuesto: numeroPresupuesto,
        fecha_emision: formData.fecha_emision,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        subtotal: totales.subtotal,
        descuento: 0,
        total: totales.total,
        estado: 'pendiente',
        notas: formData.notas || null
      })
      .select()
      .single()

    if (presupuestoError) throw presupuestoError

    // Crear items del presupuesto
    const items = formData.items.map(item => ({
      presupuesto_id: presupuesto.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      procedimiento_id: item.procedimiento_id,
      numero_diente: item.numero_diente
    }))

    const { error: itemsError } = await supabase
      .from('presupuesto_items')
      .insert(items)

    if (itemsError) throw itemsError

    // Preguntar si quiere descargar PDF
    const descargarPDF = window.confirm(
      `✅ Presupuesto ${numeroPresupuesto} creado exitosamente\n\n¿Deseas descargar el PDF ahora?`
    )

    if (descargarPDF) {
      await generarPresupuestoPDF(presupuesto, formData.items, paciente, config)
    }

    navigate(`/paciente/${pacienteId}`)

  } catch (error) {
    console.error('Error:', error)
    alert('Error al guardar presupuesto: ' + error.message)
  } finally {
    setSaving(false)
  }
}

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Cargando...</div>
      </div>
    )
  }

  const totales = calculateTotals()

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/paciente/${pacienteId}`)} style={styles.backButton}>
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📄 Nuevo Presupuesto</div>
          <div style={styles.subtitle}>
            {paciente?.nombre} {paciente?.apellido}
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        {/* Información del Presupuesto */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Información General</div>
          
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Fecha de Emisión</label>
              <input
                type="date"
                style={styles.input}
                value={formData.fecha_emision}
                onChange={(e) => updateFormField('fecha_emision', e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Válido Hasta (opcional)</label>
              <input
                type="date"
                style={styles.input}
                value={formData.fecha_vencimiento}
                onChange={(e) => updateFormField('fecha_vencimiento', e.target.value)}
                min={formData.fecha_emision}
              />
            </div>
          </div>
        </div>

        {/* Items del Presupuesto */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Items del Presupuesto</div>
            <button onClick={addItem} style={styles.addButton}>
              + Agregar Item
            </button>
          </div>

          <div style={styles.itemsTable}>
            {/* Header de la tabla */}
            <div style={styles.tableHeader}>
              <div style={{ ...styles.tableCell, flex: 3 }}>Descripción</div>
              <div style={{ ...styles.tableCell, flex: 1 }}>Diente</div>
              <div style={{ ...styles.tableCell, flex: 1 }}>Cant.</div>
              <div style={{ ...styles.tableCell, flex: 1.5 }}>Precio Unit.</div>
              <div style={{ ...styles.tableCell, flex: 1.5 }}>Subtotal</div>
              <div style={{ ...styles.tableCell, width: '40px' }}></div>
            </div>

            {/* Items */}
            {formData.items.map((item, index) => (
              <div key={item.id} style={styles.tableRow}>
                <div style={{ ...styles.tableCell, flex: 3, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  {catalogoProcedimientos.length > 0 ? (
                    <select
                      style={styles.select}
                      value={item.procedimiento_id || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === 'manual') {
                          updateItem(item.id, 'procedimiento_id', null)
                        } else if (value) {
                          updateItem(item.id, 'procedimiento_id', value)
                        }
                      }}
                    >
                      <option value="">Seleccionar procedimiento...</option>
                      {catalogoProcedimientos.map(proc => (
                        <option key={proc.id} value={proc.id}>
                          {proc.nombre_procedimiento} - {config.simbolo_moneda} {Number(proc.precio_base).toLocaleString()}
                        </option>
                      ))}
                      <option value="manual">📝 Escribir manualmente</option>
                    </select>
                  ) : null}
                  
                  {/* Input manual - mostrar si no hay catálogo O si eligió "manual" */}
                  {(catalogoProcedimientos.length === 0 || !item.procedimiento_id) && (
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Descripción del servicio..."
                      value={item.descripcion}
                      onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)}
                    />
                  )}
                </div>

                <div style={{ ...styles.tableCell, flex: 1 }}>
                  <input
                    type="number"
                    style={styles.inputSmall}
                    placeholder="#"
                    min="1"
                    max="32"
                    value={item.numero_diente || ''}
                    onChange={(e) => updateItem(item.id, 'numero_diente', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>

                <div style={{ ...styles.tableCell, flex: 1 }}>
                  <input
                    type="number"
                    style={styles.inputSmall}
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => updateItem(item.id, 'cantidad', parseInt(e.target.value) || 1)}
                  />
                </div>

                <div style={{ ...styles.tableCell, flex: 1.5 }}>
                  <input
                    type="number"
                    style={styles.inputSmall}
                    min="0"
                    step="1000"
                    value={item.precio_unitario}
                    onChange={(e) => updateItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div style={{ ...styles.tableCell, flex: 1.5 }}>
                  <div style={styles.subtotalDisplay}>
                    {config.simbolo_moneda} {item.subtotal.toLocaleString()}
                  </div>
                </div>

                <div style={{ ...styles.tableCell, width: '40px' }}>
                  {formData.items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      style={styles.removeButton}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div style={styles.totalesSection}>
          <div style={styles.totalesCard}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Subtotal:</span>
              <span style={styles.totalValue}>
                {config.simbolo_moneda} {totales.subtotal.toLocaleString()}
              </span>
            </div>
            <div style={styles.totalRow}>
              <span style={styles.totalLabelFinal}>TOTAL:</span>
              <span style={styles.totalValueFinal}>
                {config.simbolo_moneda} {totales.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div style={styles.section}>
          <label style={styles.label}>Notas / Observaciones (opcional)</label>
          <textarea
            style={{ ...styles.input, ...styles.textArea }}
            placeholder="Notas adicionales para el paciente..."
            value={formData.notas}
            onChange={(e) => updateFormField('notas', e.target.value)}
            rows={3}
          />
        </div>

        {/* Botones de Acción */}
        <div style={styles.actionsContainer}>
          <button
            onClick={() => navigate(`/paciente/${pacienteId}`)}
            style={styles.cancelButton}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              ...(saving && styles.saveButtonDisabled)
            }}
          >
            {saving ? 'Guardando...' : '💾 Guardar Presupuesto'}
          </button>
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
    overflowY: 'auto',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
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
  inputSmall: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    textAlign: 'center',
  },
  textArea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  itemsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tableHeader: {
    display: 'flex',
    gap: '8px',
    padding: '12px 8px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#6b7280',
  },
  tableRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #f3f4f6',
    borderRadius: '8px',
    alignItems: 'start',
  },
  tableCell: {
    display: 'flex',
    alignItems: 'center',
  },
  subtotalDisplay: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669',
  },
  removeButton: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '14px',
    cursor: 'pointer',
  },
  totalesSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  totalesCard: {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    minWidth: '300px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  totalLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  totalValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  totalLabelFinal: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValueFinal: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e40af',
  },
  actionsContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
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