import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { useMoneda } from '../hooks/useMoneda'


export default function CrearPlanPagoScreen() {
  const { pacienteId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { formatMoney } = useMoneda()

  
  const [paciente, setPaciente] = useState(null)
  const [config, setConfig] = useState(null)
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    presupuesto_id: null,
    descripcion: '',
    monto_total: '',
    cantidad_cuotas: 3,
    frecuencia: 'mensual',
    fecha_inicio: new Date().toISOString().split('T')[0],
    notas: ''
  })

  const [cuotasPreview, setCuotasPreview] = useState([])

  useEffect(() => {
    loadData()
  }, [pacienteId])

  useEffect(() => {
    generarPreviewCuotas()
  }, [formData.monto_total, formData.cantidad_cuotas, formData.frecuencia, formData.fecha_inicio])

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

      // Cargar paciente
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single()

      setPaciente(pacienteData)

      // Cargar presupuestos aprobados sin plan de pago
      const { data: presupuestosData } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('estado', 'aprobado')
        .order('fecha_emision', { ascending: false })

      setPresupuestos(presupuestosData || [])

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.loadError', { item: t('common.noData') }))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const updateFormField = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Si selecciona un presupuesto, llenar monto y descripción
      if (field === 'presupuesto_id' && value) {
        const presupuesto = presupuestos.find(p => p.id === value)
        if (presupuesto) {
          updated.monto_total = presupuesto.total.toString()
          updated.descripcion = `Plan de pago - Presupuesto ${presupuesto.numero_presupuesto}`
        }
      }
      
      return updated
    })
  }

  const calcularFechaVencimiento = (fechaInicio, numeroCuota, frecuencia) => {
    const fecha = new Date(fechaInicio)
    
    switch (frecuencia) {
      case 'semanal':
        fecha.setDate(fecha.getDate() + (numeroCuota * 7))
        break
      case 'quincenal':
        fecha.setDate(fecha.getDate() + (numeroCuota * 15))
        break
      case 'mensual':
        fecha.setMonth(fecha.getMonth() + numeroCuota)
        break
    }
    
    return fecha.toISOString().split('T')[0]
  }

  const generarPreviewCuotas = () => {
    if (!formData.monto_total || !formData.cantidad_cuotas || formData.cantidad_cuotas < 2) {
      setCuotasPreview([])
      return
    }

    const montoTotal = parseFloat(formData.monto_total)
    const cantidadCuotas = parseInt(formData.cantidad_cuotas)
    const montoCuota = Math.ceil(montoTotal / cantidadCuotas)
    
    // Ajustar última cuota para que sume exactamente el total
    const sumaRegular = montoCuota * (cantidadCuotas - 1)
    const ultimaCuota = montoTotal - sumaRegular

    const preview = []
    for (let i = 0; i < cantidadCuotas; i++) {
      const monto = i === cantidadCuotas - 1 ? ultimaCuota : montoCuota
      const fechaVencimiento = calcularFechaVencimiento(formData.fecha_inicio, i, formData.frecuencia)
      
      preview.push({
        numero: i + 1,
        monto,
        fechaVencimiento
      })
    }

    setCuotasPreview(preview)
  }

  const generateNumeroPlan = () => {
    const fecha = new Date()
    const year = fecha.getFullYear().toString().slice(-2)
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() + 9999).toString().padStart(4, '0')
    return `PLAN-${year}${month}-${random}`
  }

  const validateForm = () => {
    if (!formData.descripcion.trim()) {
      alert(t('errors.requiredField', { field: t('common.description') }))
      return false
    }

    if (!formData.monto_total || parseFloat(formData.monto_total) <= 0) {
      alert(t('planPago.amountError'))
      return false
    }

    if (formData.cantidad_cuotas < 2) {
      alert(t('planPago.minInstallments'))
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const numeroPlan = generateNumeroPlan()
      
      const montoTotal = parseFloat(formData.monto_total)
      const cantidadCuotas = parseInt(formData.cantidad_cuotas)
      const montoCuota = Math.ceil(montoTotal / cantidadCuotas)

      // Crear plan de pago
      const { data: plan, error: planError } = await supabase
        .from('planes_pago')
        .insert({
          dentista_id: user.id,
          paciente_id: pacienteId,
          presupuesto_id: formData.presupuesto_id || null,
          numero_plan: numeroPlan,
          descripcion: formData.descripcion,
          monto_total: montoTotal,
          cantidad_cuotas: cantidadCuotas,
          monto_cuota: montoCuota,
          frecuencia: formData.frecuencia,
          fecha_inicio: formData.fecha_inicio,
          fecha_primer_vencimiento: cuotasPreview[0]?.fechaVencimiento,
          estado: 'activo',
          notas: formData.notas || null
        })
        .select()
        .single()

      if (planError) throw planError

      // Crear todas las cuotas
      const cuotas = cuotasPreview.map(cuota => ({
        plan_pago_id: plan.id,
        numero_cuota: cuota.numero,
        monto_cuota: cuota.monto,
        fecha_vencimiento: cuota.fechaVencimiento,
        estado: 'pendiente'
      }))

      const { error: cuotasError } = await supabase
        .from('cuotas_plan_pago')
        .insert(cuotas)

      if (cuotasError) throw cuotasError

      alert(`✅ ${t('planPago.saved', { number: numeroPlan })}\n\n${cantidadCuotas} ${t('planPago.installmentsOf')} ${formatMoney(montoCuota)}`)
      navigate(`/paciente/${pacienteId}`)

    } catch (error) {
      console.error('Error:', error)
      alert(t('errors.saveError', { item: t('planPago.title') }) + ': ' + error.message)
    } finally {
      setSaving(false)
    }
  }

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
        <button onClick={() => navigate(`/paciente/${pacienteId}`)} style={styles.backButton}>
          {t('common.back')}
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.title}>📅 {t('planPago.createTitle')}</div>
          <div style={styles.subtitle}>
            {paciente?.nombre} {paciente?.apellido}
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={styles.content}>
        <div style={styles.form}>
          {/* Información del Plan */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t('planPago.planInfo')}</div>

            {presupuestos.length > 0 && (
              <>
                <label style={styles.label}>{t('planPago.linkBudget')} ({t('common.optional')})</label>
                <select
                  style={styles.select}
                  value={formData.presupuesto_id || ''}
                  onChange={(e) => updateFormField('presupuesto_id', e.target.value || null)}
                >
                  <option value="">{t('planPago.noBudget')}</option>
                  {presupuestos.map(pres => (
                    <option key={pres.id} value={pres.id}>
                      {pres.numero_presupuesto} - {config.simbolo_moneda} {Number(pres.total).toLocaleString()}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label style={styles.label}>{t('planPago.planDescription')} *</label>
            <input
              type="text"
              style={styles.input}
              placeholder={t('planPago.descPlaceholder')}
              value={formData.descripcion}
              onChange={(e) => updateFormField('descripcion', e.target.value)}
            />

            <label style={styles.label}>{t('planPago.totalAmount')} *</label>
            <div style={styles.montoInput}>
              <span style={styles.montoSymbol}>{config?.simbolo_moneda || 'Gs.'}</span>
              <input
                type="number"
                style={{...styles.input, ...styles.montoField}}
                placeholder="0"
                min="0"
                step="1000"
                value={formData.monto_total}
                onChange={(e) => updateFormField('monto_total', e.target.value)}
              />
            </div>
          </div>

          {/* Configuración de Cuotas */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t('planPago.installmentConfig')}</div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>{t('planPago.installmentCount')} *</label>
                <input
                  type="number"
                  style={styles.input}
                  min="2"
                  max="60"
                  value={formData.cantidad_cuotas}
                  onChange={(e) => updateFormField('cantidad_cuotas', e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t('planPago.frequency')}*</label>
                <select
                  style={styles.select}
                  value={formData.frecuencia}
                  onChange={(e) => updateFormField('frecuencia', e.target.value)}
                >
                   <option value="semanal">📅 {t('common.weekly')}</option>
                  <option value="quincenal">📅 {t('planPago.biweekly')}</option>
                  <option value="mensual">📅 {t('common.monthly')}</option>
                </select>
              </div>
            </div>

            <label style={styles.label}>{t('planPago.startDate')} *</label>
            <input
              type="date"
              style={styles.input}
              value={formData.fecha_inicio}
              onChange={(e) => updateFormField('fecha_inicio', e.target.value)}
            />

            <label style={styles.label}>{t('patients.additionalNotes')} ({t('common.optional')})</label>
            <textarea
              style={{...styles.input, ...styles.textArea}}
              placeholder={t('planPago.notesPlaceholder')}
              value={formData.notas}
              onChange={(e) => updateFormField('notas', e.target.value)}
              rows={2}
            />
          </div>

          {/* Preview de Cuotas */}
          {cuotasPreview.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                📋 {t('planPago.installmentPreview')} ({cuotasPreview.length}) ({cuotasPreview.length})
              </div>

              <div style={styles.previewContainer}>
                {cuotasPreview.map((cuota, index) => (
                  <div key={index} style={styles.cuotaPreviewItem}>
                    <div style={styles.cuotaNumber}>{t('planPago.installment')} {cuota.numero}</div>
                    <div style={styles.cuotaMonto}>
                     {formatMoney(cuota.monto)}
                    </div>
                    <div style={styles.cuotaFecha}>
                      {t('planPago.dueDate')}: {new Date(cuota.fechaVencimiento).toLocaleDateString(i18n.language, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.totalPreview}>
                <span style={styles.totalLabel}>TOTAL:</span>
                <span style={styles.totalValue}>
                  {formatMoney(parseFloat(formData.monto_total))}
                </span>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div style={styles.actionsContainer}>
            <button
              onClick={() => navigate(`/paciente/${pacienteId}`)}
              style={styles.cancelButton}
            >
              {t('common.cancel')}

            </button>
            <button
              onClick={handleSave}
              disabled={saving || cuotasPreview.length === 0}
              style={{
                ...styles.saveButton,
                ...((saving || cuotasPreview.length === 0) && styles.saveButtonDisabled)
              }}
            >
              {saving ? t('common.saving') : `💾 ${t('planPago.createPlan')}`}
            </button>
          </div>
        </div>
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
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    overflowY: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
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
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
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
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '4px 12px',
  },
  montoSymbol: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
  montoField: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '20px',
    fontWeight: '600',
    padding: '8px',
  },
  previewContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  cuotaPreviewItem: {
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  cuotaNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '8px',
  },
  cuotaMonto: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '8px',
  },
  cuotaFecha: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  totalPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    border: '2px solid #dbeafe',
    borderRadius: '8px',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: '24px',
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
    backgroundColor: '#10b981',
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