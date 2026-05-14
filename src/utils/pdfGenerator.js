import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import i18n from '../i18n' // ajusta el path según tu configuración

// ─── Helpers de idioma ───────────────────────────────────────────────────────
const getLang = (config) => config?.idioma || 'es'
const getT    = (config) => i18n.getFixedT(getLang(config))

// ─── Helpers de formato ──────────────────────────────────────────────────────
const formatMoney = (value, simbolo = 'Gs.', lang = 'es') =>
  `${simbolo} ${Number(value).toLocaleString(lang)}`

const formatDate = (dateString, lang = 'es') => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESUPUESTO PDF
// ─────────────────────────────────────────────────────────────────────────────
export const generarPresupuestoPDF = async (presupuesto, items, paciente, config) => {
  const doc      = new jsPDF()
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const t    = getT(config)
  const lang = getLang(config)

  const primaryColor = config.color_primario || '#1E40AF'
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 30, g: 64, b: 175 }
  }
  const primaryRgb = hexToRgb(primaryColor)

  let yPosition = 20

  // ===== ENCABEZADO =====
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.rect(0, 0, pageWidth, 45, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(config.nombre_comercial || config.razon_social, 15, yPosition)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  yPosition += 6

  if (config.ruc) {
    doc.text(`RUC: ${config.ruc}`, 15, yPosition)
    yPosition += 4
  }
  if (config.direccion_fiscal) {
    doc.text(config.direccion_fiscal, 15, yPosition)
    yPosition += 4
  }
  if (config.telefono) {
    doc.text(`Tel: ${config.telefono}`, 15, yPosition)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.budgetTitle'), pageWidth - 15, 25, { align: 'right' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(presupuesto.numero_presupuesto, pageWidth - 15, 32, { align: 'right' })

  // ===== INFORMACIÓN DEL PACIENTE =====
  yPosition = 60
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(245, 245, 245)
  doc.rect(15, yPosition - 5, pageWidth - 30, 25, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.patientData'), 20, yPosition)

  doc.setFont('helvetica', 'normal')
  yPosition += 7
  doc.text(`${paciente.nombre} ${paciente.apellido}`, 20, yPosition)

  if (paciente.telefono) {
    yPosition += 5
    doc.text(`Tel: ${paciente.telefono}`, 20, yPosition)
  }

  // Fechas (derecha)
  yPosition = 67
  doc.text(
    `${t('pdfGenerator.issuedDate')} ${formatDate(presupuesto.fecha_emision, lang)}`,
    pageWidth - 20, yPosition, { align: 'right' }
  )

  if (presupuesto.fecha_vencimiento) {
    yPosition += 5
    doc.text(
      `${t('pdfGenerator.validUntil')} ${formatDate(presupuesto.fecha_vencimiento, lang)}`,
      pageWidth - 20, yPosition, { align: 'right' }
    )
  }

  // ===== TABLA DE ITEMS =====
  yPosition = 95

  const tableData = items.map(item => [
    item.descripcion + (item.numero_diente
      ? ` ${t('pdfGenerator.toothRef', { number: item.numero_diente })}`
      : ''),
    item.cantidad.toString(),
    formatMoney(item.precio_unitario, config.simbolo_moneda, lang),
    formatMoney(item.subtotal, config.simbolo_moneda, lang)
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [[
      t('pdfGenerator.colDescription'),
      t('pdfGenerator.colQty'),
      t('pdfGenerator.colUnitPrice'),
      t('common.subtotal')
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  })

  // ===== TOTALES =====
  const finalY  = doc.lastAutoTable.finalY + 10
  const totalsX = pageWidth - 85

  doc.setFillColor(250, 250, 250)
  doc.rect(totalsX - 5, finalY - 5, 75, 25, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${t('common.subtotal')}:`, totalsX, finalY)
  doc.text(
    formatMoney(presupuesto.subtotal, config.simbolo_moneda, lang),
    pageWidth - 15, finalY, { align: 'right' }
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(t('pdfGenerator.totalLabel'), totalsX, finalY + 10)
  doc.text(
    formatMoney(presupuesto.total, config.simbolo_moneda, lang),
    pageWidth - 15, finalY + 10, { align: 'right' }
  )

  // ===== NOTAS =====
  if (presupuesto.notas) {
    const notasY = finalY + 25
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(t('pdfGenerator.observations'), 15, notasY)

    doc.setFont('helvetica', 'normal')
    const splitNotas = doc.splitTextToSize(presupuesto.notas, pageWidth - 30)
    doc.text(splitNotas, 15, notasY + 5)
  }

  // ===== PIE DE PÁGINA =====
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.setFont('helvetica', 'italic')
  doc.text(t('pdfGenerator.budgetFooter'), pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Guardar PDF
  const fileName = `Presupuesto_${presupuesto.numero_presupuesto}_${paciente.apellido}.pdf`
  doc.save(fileName)
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIBO PDF
// ─────────────────────────────────────────────────────────────────────────────
export const generarReciboPDF = async (pago, paciente, config) => {
  const doc      = new jsPDF()
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const t    = getT(config)
  const lang = getLang(config)

  const primaryColor = config.color_primario || '#10B981'
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 16, g: 185, b: 129 }
  }
  const primaryRgb = hexToRgb(primaryColor)

  let yPosition = 20

  // ===== ENCABEZADO =====
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.rect(0, 0, pageWidth, 45, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(config.nombre_comercial || config.razon_social, 15, yPosition)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  yPosition += 6

  if (config.ruc) {
    doc.text(`RUC: ${config.ruc}`, 15, yPosition)
    yPosition += 4
  }
  if (config.direccion_fiscal) {
    doc.text(config.direccion_fiscal, 15, yPosition)
    yPosition += 4
  }
  if (config.telefono) {
    doc.text(`Tel: ${config.telefono}`, 15, yPosition)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.receiptTitle'), pageWidth - 15, 25, { align: 'right' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(pago.numero_recibo, pageWidth - 15, 33, { align: 'right' })

  // ===== INFORMACIÓN DEL PAGO =====
  yPosition = 60

  doc.setFillColor(245, 245, 245)
  doc.rect(15, yPosition - 5, pageWidth - 30, 70, 'F')
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.setLineWidth(0.5)
  doc.rect(15, yPosition - 5, pageWidth - 30, 70)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.receivedFrom'), 20, yPosition)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  yPosition += 7
  doc.text(`${paciente.nombre} ${paciente.apellido}`, 20, yPosition)

  if (paciente.telefono || paciente.email) {
    yPosition += 5
    doc.setFontSize(9)
    if (paciente.telefono) {
      doc.text(`Tel: ${paciente.telefono}`, 20, yPosition)
    }
    if (paciente.email) {
      doc.text(`Email: ${paciente.email}`, 20, yPosition + 5)
      yPosition += 5
    }
  }

  yPosition += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.theAmountOf'), 20, yPosition)

  // Monto en grande
  doc.setFontSize(20)
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  yPosition += 10
  doc.text(formatMoney(pago.monto, config.simbolo_moneda, lang), 20, yPosition)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  yPosition += 10
  doc.text(t('pdfGenerator.inConceptOf'), 20, yPosition)

  doc.setFont('helvetica', 'normal')
  yPosition += 6
  const splitConcepto = doc.splitTextToSize(pago.concepto, pageWidth - 50)
  doc.text(splitConcepto, 20, yPosition)

  // Información adicional en el lateral derecho
  const rightX = pageWidth - 75
  let rightY = 67

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.dateLabel'), rightX, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(pago.fecha_pago, lang), rightX + 18, rightY)

  rightY += 7
  doc.setFont('helvetica', 'bold')
  doc.text(t('pdfGenerator.methodLabel'), rightX, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(
    t('pdfGenerator.methods.' + pago.metodo_pago, { defaultValue: pago.metodo_pago }),
    rightX + 18, rightY
  )

  // Notas adicionales
  if (pago.notas) {
    yPosition = 145
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(t('pdfGenerator.observations'), 15, yPosition)

    doc.setFont('helvetica', 'normal')
    const splitNotas = doc.splitTextToSize(pago.notas, pageWidth - 30)
    doc.text(splitNotas, 15, yPosition + 5)
  }

  // Línea de firma
  yPosition = pageHeight - 50
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(t('pdfGenerator.signatureAndSeal'), pageWidth / 2, yPosition + 5, { align: 'center' })

  // Pie de página
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.setFont('helvetica', 'italic')
  doc.text(t('pdfGenerator.receiptFooter'), pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Guardar PDF
  const fileName = `Recibo_${pago.numero_recibo}_${paciente.apellido}.pdf`
  doc.save(fileName)
}