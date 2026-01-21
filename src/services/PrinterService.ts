// Printer Service for Bluetooth Thermal Printer (58mm)
// Using Web Bluetooth API and ESC/POS commands

import { detectWebBluetoothSupport } from '../utils/platformDetect'

export interface PrinterDevice {
  device: BluetoothDevice
  characteristic: BluetoothRemoteGATTCharacteristic | null
}

class PrinterService {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private isConnected: boolean = false

  // ESC/POS Commands

  // Initialize commands
  private readonly CMD_INIT = '\x1B\x40' // Initialize printer
  private readonly CMD_CENTER = '\x1B\x61\x01' // Center align
  private readonly CMD_LEFT = '\x1B\x61\x00' // Left align

  // Font commands
  private readonly CMD_BOLD_ON = '\x1B\x45\x01' // Bold ON
  private readonly CMD_BOLD_OFF = '\x1B\x45\x00' // Bold OFF
  private readonly CMD_DOUBLE_ON = '\x1B\x21\x30' // Double size ON
  private readonly CMD_DOUBLE_OFF = '\x1B\x21\x00' // Double size OFF
  private readonly CMD_SMALL = '\x1B\x21\x01' // Small font

  // Line commands
  private readonly CMD_FEED = '\x0A' // Line feed
  private readonly CMD_CUT = '\x1D\x56\x00' // Cut paper

  // Separator lines for 58mm (32 chars width)
  private readonly LINE_SINGLE = '--------------------------------'
  private readonly LINE_DOUBLE = '================================'
  private readonly LINE_DASHED = '- - - - - - - - - - - - - - - - '

  /**
   * Connect to Bluetooth printer
   */
  async connect(): Promise<boolean> {
    try {
      // Check platform and browser support
      const platformInfo = detectWebBluetoothSupport()

      if (!platformInfo.isSupported) {
        throw new Error(platformInfo.message)
      }

      // Double check if Web Bluetooth API is available
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API tidak tersedia')
      }

      // Request device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic printer service
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      })

      if (!this.device.gatt) {
        throw new Error('GATT tidak tersedia')
      }

      // Connect to GATT server
      const server = await this.device.gatt.connect()

      // Get service
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')

      // Get characteristic (write)
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')

      this.isConnected = true
      console.log('Printer connected successfully')

      return true
    } catch (error) {
      console.error('Printer connection error:', error)
      this.isConnected = false
      throw error
    }
  }

  /**
   * Disconnect printer
   */
  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt) {
      this.device.gatt.disconnect()
      this.device = null
      this.characteristic = null
      this.isConnected = false
      console.log('Printer disconnected')
    }
  }

  /**
   * Check if printer is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.device !== null && this.characteristic !== null
  }

  /**
   * Send data to printer
   */
  private async sendData(data: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Printer belum terhubung')
    }

    const encoder = new TextEncoder()
    const encoded = encoder.encode(data)

    // Send in chunks (max 20 bytes per write for BLE)
    const chunkSize = 20
    for (let i = 0; i < encoded.length; i += chunkSize) {
      const chunk = encoded.slice(i, i + chunkSize)
      await this.characteristic.writeValue(chunk)
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  /**
   * Create justified line (left and right text)
   */
  private justifyLine(left: string, right: string, maxLength: number = 32): string {
    const totalLength = left.length + right.length
    if (totalLength >= maxLength) {
      return left.substring(0, maxLength - right.length) + right
    }
    const spaces = ' '.repeat(maxLength - totalLength)
    return left + spaces + right
  }

  /**
   * Print receipt
   */
  async printReceipt(receiptData: {
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
  }): Promise<void> {
    try {
      if (!this.getConnectionStatus()) {
        throw new Error('Printer belum terhubung. Silakan hubungkan printer terlebih dahulu.')
      }

      let receipt = ''

      // Initialize
      receipt += this.CMD_INIT

      // Header - Centered
      receipt += this.CMD_CENTER
      receipt += this.CMD_DOUBLE_ON + this.CMD_BOLD_ON
      receipt += 'GOOD WAYS' + this.CMD_FEED
      receipt += this.CMD_DOUBLE_OFF + this.CMD_BOLD_OFF
      receipt += this.CMD_SMALL
      receipt += 'Sistem Kasir Digital' + this.CMD_FEED
      receipt += this.CMD_LEFT
      receipt += this.LINE_DOUBLE + this.CMD_FEED

      // Transaction Info
      receipt += this.CMD_SMALL
      const date = new Date(receiptData.transactionDate)
      const dateStr = date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      receipt += this.justifyLine('Kasir:', receiptData.cashierName) + this.CMD_FEED
      receipt += this.justifyLine('Tanggal:', dateStr) + this.CMD_FEED
      receipt += this.justifyLine('No.Trx:', receiptData.transactionNumber) + this.CMD_FEED

      if (receiptData.customerName) {
        receipt += this.justifyLine('Pelanggan:', receiptData.customerName) + this.CMD_FEED
      }

      receipt += this.LINE_DASHED + this.CMD_FEED

      // Items
      receipt += this.CMD_CENTER + this.CMD_BOLD_ON
      receipt += 'RINCIAN PESANAN' + this.CMD_FEED
      receipt += this.CMD_LEFT + this.CMD_BOLD_OFF
      receipt += this.LINE_DASHED + this.CMD_FEED

      receiptData.items.forEach((item) => {
        // Product name and price
        const itemLine = this.justifyLine(
          item.product_name,
          this.formatPrice(item.product_name === item.product_name ? item.totalPrice / item.quantity : 0)
        )
        receipt += this.CMD_BOLD_ON + itemLine + this.CMD_FEED + this.CMD_BOLD_OFF

        // Variant
        if (item.variant) {
          receipt += '  - ' + item.variant + this.CMD_FEED
        }

        // Add-ons
        if (item.addOns && item.addOns.length > 0) {
          item.addOns.forEach((addon) => {
            const addonLine = this.justifyLine(
              '  - ' + addon.name,
              '+' + this.formatPrice(addon.price)
            )
            receipt += addonLine + this.CMD_FEED
          })
        }

        // Quantity and total
        const qtyLine = this.justifyLine(
          `  ${item.quantity}x`,
          this.CMD_BOLD_ON + this.formatPrice(item.totalPrice) + this.CMD_BOLD_OFF
        )
        receipt += qtyLine + this.CMD_FEED
        receipt += this.CMD_FEED
      })

      receipt += this.LINE_DASHED + this.CMD_FEED

      // Total
      const subtotalLine = this.justifyLine('Subtotal:', this.formatPrice(receiptData.subtotal))
      receipt += subtotalLine + this.CMD_FEED

      const totalLine = this.justifyLine('TOTAL:', this.formatPrice(receiptData.total))
      receipt += this.CMD_BOLD_ON + totalLine + this.CMD_FEED + this.CMD_BOLD_OFF

      receipt += this.LINE_DASHED + this.CMD_FEED

      // Payment info
      if (receiptData.paymentMethod) {
        receipt += this.CMD_CENTER + this.CMD_BOLD_ON
        receipt += 'PEMBAYARAN' + this.CMD_FEED
        receipt += this.CMD_LEFT + this.CMD_BOLD_OFF

        const methodLine = this.justifyLine('Metode:', receiptData.paymentMethod.toUpperCase())
        receipt += methodLine + this.CMD_FEED

        if (receiptData.paymentMethod === 'cash' && receiptData.cashReceived) {
          const receivedLine = this.justifyLine('Bayar:', this.formatPrice(receiptData.cashReceived))
          receipt += receivedLine + this.CMD_FEED

          const changeLine = this.justifyLine('Kembalian:', this.formatPrice(receiptData.cashChange || 0))
          receipt += this.CMD_BOLD_ON + changeLine + this.CMD_FEED + this.CMD_BOLD_OFF
        }

        if ((receiptData.paymentMethod === 'qris' || receiptData.paymentMethod === 'debit') && receiptData.referenceNumber) {
          const refLine = this.justifyLine('Ref:', receiptData.referenceNumber)
          receipt += refLine + this.CMD_FEED
        }

        receipt += this.LINE_DASHED + this.CMD_FEED
      }

      // Open Bill indicator
      if (!receiptData.paymentMethod && receiptData.customerName) {
        receipt += this.CMD_CENTER + this.CMD_BOLD_ON
        receipt += '** OPEN BILL **' + this.CMD_FEED
        receipt += this.CMD_BOLD_OFF
        receipt += 'Belum dibayar' + this.CMD_FEED
        receipt += this.LINE_DASHED + this.CMD_FEED
      }

      // Footer
      receipt += this.CMD_CENTER + this.CMD_SMALL
      receipt += 'Terima kasih!' + this.CMD_FEED
      receipt += 'atas kunjungan Anda' + this.CMD_FEED
      receipt += this.CMD_FEED
      receipt += 'Powered by Good Ways POS' + this.CMD_FEED
      receipt += this.CMD_FEED
      receipt += this.CMD_FEED
      receipt += this.CMD_FEED

      // Cut paper
      receipt += this.CMD_CUT

      // Send to printer
      await this.sendData(receipt)

      console.log('Receipt printed successfully')

    } catch (error) {
      console.error('Print error:', error)
      throw error
    }
  }

  /**
   * Format price for receipt (shorter format)
   */
  private formatPrice(price: number): string {
    // Format: Rp 50.000 (no decimals, thousand separator)
    const formatted = new Intl.NumberFormat('id-ID').format(price)
    return 'Rp ' + formatted
  }

  /**
   * Test print
   */
  async testPrint(): Promise<void> {
    if (!this.getConnectionStatus()) {
      throw new Error('Printer belum terhubung')
    }

    let test = ''
    test += this.CMD_INIT
    test += this.CMD_CENTER
    test += this.CMD_DOUBLE_ON + this.CMD_BOLD_ON
    test += 'TEST PRINT' + this.CMD_FEED
    test += this.CMD_DOUBLE_OFF + this.CMD_BOLD_OFF
    test += this.LINE_DOUBLE + this.CMD_FEED
    test += 'Printer connected!' + this.CMD_FEED
    test += this.CMD_FEED
    test += new Date().toLocaleString('id-ID') + this.CMD_FEED
    test += this.CMD_FEED
    test += this.LINE_SINGLE + this.CMD_FEED
    test += this.CMD_LEFT + this.CMD_SMALL
    test += 'Good Ways POS System' + this.CMD_FEED
    test += this.CMD_FEED
    test += this.CMD_FEED
    test += this.CMD_CUT

    await this.sendData(test)
  }
}

// Export singleton instance
export const printerService = new PrinterService()
