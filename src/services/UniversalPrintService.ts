// Universal Print Service for Thermal Printer (58mm)
// Using native system print dialog via window.print()
// Works on all platforms: iOS, Android, Desktop

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
   * Print receipt using iOS native print dialog
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    // Create print window with 58mm width (~220px at 96dpi)
    const printWindow = window.open('', '_blank', 'width=220,height=600')

    if (!printWindow) {
      throw new Error('Popup blocked. Izinkan popup untuk mencetak.')
    }

    // Generate receipt HTML optimized for 58mm thermal printer
    const receiptHTML = this.generateReceiptHTML(receiptData)

    // Write HTML to print window
    printWindow.document.write(receiptHTML)
    printWindow.document.close()

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 250))

    // Trigger print dialog
    printWindow.focus()
    printWindow.print()

    // Close print window after printing
    setTimeout(() => {
      printWindow.close()
    }, 100)
  }

  /**
   * Generate receipt HTML optimized for 58mm thermal printer
   */
  private generateReceiptHTML(data: ReceiptData): string {
    const itemsHTML = data.items.map(item => {
      const variantHTML = item.variant ? `
        <div style="font-size: 9px; color: #666; margin-left: 4px;">- ${item.variant}</div>
      ` : ''

      const addOnsHTML = item.addOns && item.addOns.length > 0 ? item.addOns.map(addon => `
        <div style="font-size: 9px; color: #666; margin-left: 4px; display: flex; justify-content: space-between;">
          <span style="max-width: 60%;">- ${addon.name}</span>
          <span>+${this.formatPrice(addon.price)}</span>
        </div>
      `).join('') : ''

      return `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px;">
            <span style="max-width: 60%;">${item.product_name}</span>
            <span>${this.formatPrice(item.totalPrice / item.quantity)}</span>
          </div>
          ${variantHTML}
          ${addOnsHTML}
          <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 2px;">
            <span>${item.quantity}x</span>
            <span style="font-weight: bold;">${this.formatPrice(item.totalPrice)}</span>
          </div>
        </div>
      `
    }).join('')

    const paymentHTML = data.paymentMethod ? `
      <div style="border-top: 1px dashed #999; padding-top: 6px; margin-top: 6px;">
        <div style="text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 6px;">PEMBAYARAN</div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 3px;">
          <span>Metode:</span>
          <span style="font-weight: bold;">${data.paymentMethod.toUpperCase()}</span>
        </div>
        ${data.paymentMethod === 'cash' && data.cashReceived ? `
          <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 3px;">
            <span>Bayar:</span>
            <span>${this.formatPrice(data.cashReceived)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: bold;">
            <span>Kembalian:</span>
            <span>${this.formatPrice(data.cashChange || 0)}</span>
          </div>
        ` : ''}
        ${(data.paymentMethod === 'qris' || data.paymentMethod === 'debit') && data.referenceNumber ? `
          <div style="display: flex; justify-content: space-between; font-size: 9px;">
            <span>Ref:</span>
            <span style="font-weight: bold; word-break: break-all;">${data.referenceNumber}</span>
          </div>
        ` : ''}
      </div>
    ` : ''

    const openBillHTML = !data.paymentMethod && data.customerName ? `
      <div style="border-top: 1px dashed #999; padding-top: 6px; margin-top: 6px; text-align: center;">
        <div style="font-weight: bold; font-size: 10px; color: #d97706;">** OPEN BILL **</div>
        <div style="font-size: 9px; color: #666; margin-top: 2px;">Belum dibayar</div>
      </div>
    ` : ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="description" content="Struk Pembayaran Good Ways POS">
        <title>Struk - ${data.transactionNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          /* Page setup untuk printer thermal 58mm (58mm = ~220px at 96dpi) */
          /* Multiple @page rules for better browser compatibility */
          @page {
            size: 58mm auto;
            margin: 0mm;
          }

          @page :first {
            size: 58mm auto;
            margin: 0mm;
          }

          html {
            width: 58mm;
            height: auto;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Courier New', monospace;
            width: 58mm;
            max-width: 58mm;
            min-width: 58mm;
            height: auto;
            margin: 0;
            padding: 3mm;
            background: white;
            color: black;
            font-size: 10px;
            line-height: 1.3;
          }

          .receipt-container {
            width: 100%;
            max-width: 52mm;
            height: auto;
          }

          /* Media query khusus untuk print */
          @media print {
            @page {
              size: 58mm auto !important;
              margin: 0mm !important;
            }

            html {
              width: 58mm !important;
              height: auto !important;
            }

            body {
              width: 58mm !important;
              max-width: 58mm !important;
              min-width: 58mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 3mm !important;
              font-size: 10px !important;
            }

            .receipt-container {
              width: 100% !important;
              max-width: 52mm !important;
              height: auto !important;
            }

            .no-print {
              display: none !important;
            }
          }

          /* Prevent page breaks inside important elements */
          .receipt-container, .receipt-container > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* iOS and Safari specific */
          @supports (-webkit-touch-callout: none) {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #000;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 2px;">GOOD WAYS</div>
            <div style="font-size: 9px; color: #666;">Sistem Kasir Digital</div>
          </div>

          <!-- Transaction Info -->
          <div style="border-bottom: 1px dashed #999; padding-bottom: 6px; margin-bottom: 6px; font-size: 9px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Kasir:</span>
              <span style="font-weight: bold;">${data.cashierName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Tanggal:</span>
              <span style="font-size: 8px;">${this.formatDate(data.transactionDate)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>No. Trx:</span>
              <span style="font-weight: bold;">${data.transactionNumber}</span>
            </div>
            ${data.customerName ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Pelanggan:</span>
                <span style="font-weight: bold;">${data.customerName}</span>
              </div>
            ` : ''}
          </div>

          <!-- Items -->
          <div style="border-bottom: 1px dashed #999; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 6px;">RINCIAN PESANAN</div>
            ${itemsHTML}
          </div>

          <!-- Total -->
          <div style="border-bottom: 1px dashed #999; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 3px;">
              <span>Subtotal:</span>
              <span>${this.formatPrice(data.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
              <span>TOTAL:</span>
              <span>${this.formatPrice(data.total)}</span>
            </div>
          </div>

          <!-- Payment Info -->
          ${paymentHTML}

          <!-- Open Bill -->
          ${openBillHTML}

          <!-- Footer -->
          <div style="text-align: center; font-size: 9px; color: #666; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #999;">
            <div style="margin-bottom: 2px;">Terima kasih!</div>
            <div style="margin-bottom: 2px;">atas kunjungan Anda</div>
            <div style="margin-top: 4px; font-size: 8px;">Powered by Good Ways POS</div>
          </div>
        </div>
      </body>
      </html>
    `
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
