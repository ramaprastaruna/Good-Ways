// Universal Print Service for Thermal Printer (58mm)
// Using jsPDF for proper 58mm PDF generation
// Works on all platforms: iOS, Android, Desktop

import jsPDF from 'jspdf'

interface ReceiptData {
  transactionNumber: string
  transactionDate: string
  cashierName: string
  items: Array<{
    product_name: string
    quantity: number
    variant?: string | null
    addOns?: Array<{ name: string; price: number }>
    totalPrice: number
  }>
  subtotal: number
  total: number
  paymentMethod?: string | null
  cashReceived?: number | null
  cashChange?: number | null
  customerName?: string | null
  referenceNumber?: string | null
}

class UniversalPrintService {
  /**
   * Format price for receipt
   */
  private formatPrice(price: number): string {
    const formatted = new Intl.NumberFormat('id-ID').format(price)
    return 'Rp ' + formatted
  }

  /**
   * Format date
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  /**
   * Print receipt using jsPDF for proper 58mm thermal printer
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      // Generate PDF with exact 58mm width
      const pdf = this.generateReceiptPDF(receiptData)

      // Open PDF in new window for printing
      const pdfBlob = pdf.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)

      // Open in new window
      const printWindow = window.open(pdfUrl, '_blank')

      if (!printWindow) {
        throw new Error('Popup blocked. Izinkan popup untuk mencetak.')
      }

      // Auto trigger print dialog after PDF loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }

      // Cleanup URL after use
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 10000)

    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error('Gagal membuat PDF struk')
    }
  }

  /**
   * Generate PDF receipt with proper 58mm size
   */
  private generateReceiptPDF(data: ReceiptData): jsPDF {
    // 58mm = 164.41 points (1mm = 2.83465 points)
    // Auto height based on content
    const pageWidth = 58 // mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, 297], // Start with A4 height, will trim
      compress: true
    })

    // Set font
    pdf.setFont('courier', 'normal')

    let y = 5 // Start position
    const leftMargin = 3
    const rightMargin = pageWidth - 3

    // Helper function to add text
    const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', align: 'left' | 'center' | 'right' = 'left') => {
      pdf.setFont('courier', style)
      pdf.setFontSize(size)

      if (align === 'center') {
        pdf.text(text, pageWidth / 2, y, { align: 'center' })
      } else if (align === 'right') {
        pdf.text(text, rightMargin, y, { align: 'right' })
      } else {
        pdf.text(text, leftMargin, y)
      }

      y += size * 0.4 // Line height
    }

    // Helper for justified text (left and right)
    const addJustified = (left: string, right: string, size: number) => {
      pdf.setFontSize(size)
      pdf.setFont('courier', 'normal')
      pdf.text(left, leftMargin, y)
      pdf.text(right, rightMargin, y, { align: 'right' })
      y += size * 0.4
    }

    // Helper for line separator
    const addLine = (_style: 'solid' | 'dashed' = 'dashed') => {
      // Draw simple line (jsPDF doesn't support dashed lines easily)
      pdf.line(leftMargin, y, rightMargin, y)
      y += 2
    }

    // Header
    addText('GOOD WAYS', 12, 'bold', 'center')
    addText('Sistem Kasir Digital', 8, 'normal', 'center')
    y += 1
    addLine('solid')

    // Transaction Info
    addJustified('Kasir:', data.cashierName, 8)
    addJustified('Tanggal:', this.formatDate(data.transactionDate), 7)
    addJustified('No. Trx:', data.transactionNumber, 8)

    if (data.customerName) {
      addJustified('Pelanggan:', data.customerName, 8)
    }

    y += 1
    addLine()

    // Items Section
    addText('RINCIAN PESANAN', 9, 'bold', 'center')
    y += 1
    addLine()

    // Items
    data.items.forEach(item => {
      // Product name and unit price
      pdf.setFont('courier', 'bold')
      pdf.setFontSize(9)
      pdf.text(item.product_name, leftMargin, y)
      pdf.text(this.formatPrice(item.totalPrice / item.quantity), rightMargin, y, { align: 'right' })
      y += 3.5

      // Variant
      if (item.variant) {
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(7)
        pdf.text(`  - ${item.variant}`, leftMargin, y)
        y += 2.8
      }

      // Add-ons
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addon => {
          pdf.setFontSize(7)
          pdf.text(`  - ${addon.name}`, leftMargin, y)
          pdf.text(`+${this.formatPrice(addon.price)}`, rightMargin, y, { align: 'right' })
          y += 2.8
        })
      }

      // Quantity and total
      pdf.setFontSize(8)
      pdf.text(`  ${item.quantity}x`, leftMargin, y)
      pdf.setFont('courier', 'bold')
      pdf.text(this.formatPrice(item.totalPrice), rightMargin, y, { align: 'right' })
      y += 4
    })

    addLine()

    // Total
    addJustified('Subtotal:', this.formatPrice(data.subtotal), 8)
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(10)
    pdf.text('TOTAL:', leftMargin, y)
    pdf.text(this.formatPrice(data.total), rightMargin, y, { align: 'right' })
    y += 5
    addLine()

    // Payment Info
    if (data.paymentMethod) {
      addText('PEMBAYARAN', 9, 'bold', 'center')
      y += 1
      addJustified('Metode:', data.paymentMethod.toUpperCase(), 8)

      if (data.paymentMethod === 'cash' && data.cashReceived) {
        addJustified('Bayar:', this.formatPrice(data.cashReceived), 8)
        pdf.setFont('courier', 'bold')
        pdf.setFontSize(8)
        pdf.text('Kembalian:', leftMargin, y)
        pdf.text(this.formatPrice(data.cashChange || 0), rightMargin, y, { align: 'right' })
        y += 3.5
      }

      if ((data.paymentMethod === 'qris' || data.paymentMethod === 'debit') && data.referenceNumber) {
        addJustified('Ref:', data.referenceNumber, 7)
      }

      y += 1
      addLine()
    }

    // Open Bill
    if (!data.paymentMethod && data.customerName) {
      addText('** OPEN BILL **', 9, 'bold', 'center')
      addText('Belum dibayar', 7, 'normal', 'center')
      y += 1
      addLine()
    }

    // Footer
    y += 2
    addLine()
    addText('Terima kasih!', 8, 'normal', 'center')
    addText('atas kunjungan Anda', 8, 'normal', 'center')
    y += 2
    addText('Powered by Good Ways POS', 7, 'normal', 'center')

    // Add some padding at bottom
    y += 5

    return pdf
  }

  /**
   * Check if universal print is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.print === 'function'
  }
}

// Export singleton instance
export const universalPrintService = new UniversalPrintService()
