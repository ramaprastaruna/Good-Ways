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
    // Create print window
    const printWindow = window.open('', '_blank', 'width=300,height=600')

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
        <div style="font-size: 10px; color: #666; margin-left: 4px;">- ${item.variant}</div>
      ` : ''

      const addOnsHTML = item.addOns && item.addOns.length > 0 ? item.addOns.map(addon => `
        <div style="font-size: 10px; color: #666; margin-left: 4px; display: flex; justify-content: space-between;">
          <span>- ${addon.name}</span>
          <span>+${this.formatPrice(addon.price)}</span>
        </div>
      `).join('') : ''

      return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
            <span>${item.product_name}</span>
            <span>${this.formatPrice(item.totalPrice / item.quantity)}</span>
          </div>
          ${variantHTML}
          ${addOnsHTML}
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
            <span>${item.quantity}x</span>
            <span style="font-weight: bold;">${this.formatPrice(item.totalPrice)}</span>
          </div>
        </div>
      `
    }).join('')

    const paymentHTML = data.paymentMethod ? `
      <div style="border-top: 1px dashed #999; padding-top: 8px; margin-top: 8px;">
        <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 8px;">PEMBAYARAN</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
          <span>Metode:</span>
          <span style="font-weight: bold;">${data.paymentMethod.toUpperCase()}</span>
        </div>
        ${data.paymentMethod === 'cash' && data.cashReceived ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
            <span>Bayar:</span>
            <span>${this.formatPrice(data.cashReceived)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">
            <span>Kembalian:</span>
            <span>${this.formatPrice(data.cashChange || 0)}</span>
          </div>
        ` : ''}
        ${(data.paymentMethod === 'qris' || data.paymentMethod === 'debit') && data.referenceNumber ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px;">
            <span>Ref:</span>
            <span style="font-weight: bold;">${data.referenceNumber}</span>
          </div>
        ` : ''}
      </div>
    ` : ''

    const openBillHTML = !data.paymentMethod && data.customerName ? `
      <div style="border-top: 1px dashed #999; padding-top: 8px; margin-top: 8px; text-align: center;">
        <div style="font-weight: bold; font-size: 11px; color: #d97706;">** OPEN BILL **</div>
        <div style="font-size: 10px; color: #666; margin-top: 2px;">Belum dibayar</div>
      </div>
    ` : ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Struk - ${data.transactionNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            size: 58mm auto;
            margin: 0;
          }

          @media print {
            body {
              width: 58mm;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }
          }

          body {
            font-family: 'Courier New', monospace;
            width: 58mm;
            padding: 4mm;
            background: white;
            color: black;
            font-size: 11px;
            line-height: 1.3;
          }

          .receipt-container {
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #000;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">GOOD WAYS</div>
            <div style="font-size: 10px; color: #666;">Sistem Kasir Digital</div>
          </div>

          <!-- Transaction Info -->
          <div style="border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px; font-size: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Kasir:</span>
              <span style="font-weight: bold;">${data.cashierName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Tanggal:</span>
              <span>${this.formatDate(data.transactionDate)}</span>
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
          <div style="border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 8px;">RINCIAN PESANAN</div>
            ${itemsHTML}
          </div>

          <!-- Total -->
          <div style="border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>${this.formatPrice(data.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;">
              <span>TOTAL:</span>
              <span>${this.formatPrice(data.total)}</span>
            </div>
          </div>

          <!-- Payment Info -->
          ${paymentHTML}

          <!-- Open Bill -->
          ${openBillHTML}

          <!-- Footer -->
          <div style="text-align: center; font-size: 10px; color: #666; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #999;">
            <div style="margin-bottom: 2px;">Terima kasih!</div>
            <div style="margin-bottom: 2px;">atas kunjungan Anda</div>
            <div style="margin-top: 6px; font-size: 9px;">Powered by Good Ways POS</div>
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
