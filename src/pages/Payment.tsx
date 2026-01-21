import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CartItem } from './Cashier'
import Receipt from '../components/Receipt'
import { universalPrintService } from '../services/UniversalPrintService'
import { useToast } from '../components/ToastContainer'

interface PaymentProps {
  cart: CartItem[]
  grandTotal: number
  cashierName: string
  userId: string
  onBack: () => void
  onPaymentSuccess: (transactionNumber: string, paymentMethod: string | null) => void
  existingTransactionId?: string // For open bill payment
  existingTransactionNumber?: string // For open bill payment
}

type TransactionType = 'bayar_langsung' | 'open_bill'
type PaymentMethod = 'cash' | 'qris' | 'debit'

export default function Payment({ cart, grandTotal, cashierName, userId, onBack, onPaymentSuccess, existingTransactionId, existingTransactionNumber }: PaymentProps) {
  const toast = useToast()
  const [transactionType, setTransactionType] = useState<TransactionType>('bayar_langsung')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [isProcessing, setIsProcessing] = useState(false)

  // Cash payment states
  const [cashReceived, setCashReceived] = useState('')
  const [cashChange, setCashChange] = useState(0)

  // Open bill states
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')

  // Receipt states
  const [showReceipt, setShowReceipt] = useState(false)
  const [transactionData, setTransactionData] = useState<any>(null)

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  // Calculate cash change
  const handleCashReceivedChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, '')
    setCashReceived(numValue)

    if (numValue) {
      const received = parseFloat(numValue)
      const change = received - grandTotal
      setCashChange(change >= 0 ? change : 0)
    } else {
      setCashChange(0)
    }
  }

  // Quick cash buttons
  const setQuickCash = (amount: number) => {
    setCashReceived(amount.toString())
    const change = amount - grandTotal
    setCashChange(change >= 0 ? change : 0)
  }

  // Validate payment
  const validatePayment = (): string | null => {
    if (transactionType === 'bayar_langsung') {
      if (paymentMethod === 'cash') {
        if (!cashReceived) return 'Masukkan nominal pembayaran'
        const received = parseFloat(cashReceived)
        if (received < grandTotal) return 'Nominal pembayaran kurang'
      }
      // QRIS and Debit no longer need reference number
    } else if (transactionType === 'open_bill') {
      if (!customerName.trim()) return 'Masukkan nama pelanggan'
    }
    return null
  }

  // Check if form is valid (for button disabled state)
  const isFormValid = (): boolean => {
    if (transactionType === 'bayar_langsung') {
      if (paymentMethod === 'cash') {
        if (!cashReceived) return false
        const received = parseFloat(cashReceived)
        if (received < grandTotal) return false
      }
      // QRIS and Debit are always valid (no fields required)
      return true
    } else if (transactionType === 'open_bill') {
      return customerName.trim().length > 0
    }
    return false
  }

  // Process payment
  const handleProcessPayment = async () => {
    const validationError = validatePayment()
    if (validationError) {
      toast.error('Validasi Gagal', validationError)
      return
    }

    setIsProcessing(true)

    try {
      let data

      // Check if this is payment for existing open bill
      if (existingTransactionId) {
        // Update existing transaction (open bill payment)
        const updateData = {
          payment_status: 'paid',
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
          cash_change: paymentMethod === 'cash' ? cashChange : null,
        }

        const { data: updatedData, error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', existingTransactionId)
          .select()
          .single()

        if (error) throw error
        data = updatedData

      } else {
        // Create new transaction
        const transactionData = {
          items: cart.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            variant: item.variant,
            addOns: item.addOns,
            totalPrice: item.totalPrice
          })),
          subtotal: grandTotal,
          total: grandTotal,
          payment_status: transactionType === 'open_bill' ? 'open_bill' : 'paid',
          payment_method: transactionType === 'bayar_langsung' ? paymentMethod : null,
          cash_received: paymentMethod === 'cash' && transactionType === 'bayar_langsung' ? parseFloat(cashReceived) : null,
          cash_change: paymentMethod === 'cash' && transactionType === 'bayar_langsung' ? cashChange : null,
          customer_name: transactionType === 'open_bill' ? customerName.trim() : null,
          notes: notes.trim() || null,
          cashier_name: cashierName,
          created_by: userId
        }

        const { data: insertedData, error } = await supabase
          .from('transactions')
          .insert([transactionData])
          .select()
          .single()

        if (error) throw error
        data = insertedData
      }

      // Store transaction data for receipt
      setTransactionData(data)

      // Show receipt
      setShowReceipt(true)

    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Gagal Memproses Pembayaran', 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle receipt close
  const handleReceiptClose = () => {
    setShowReceipt(false)
    // Call onPaymentSuccess to clear cart and go back
    if (transactionData) {
      onPaymentSuccess(transactionData.transaction_number, transactionData.payment_method)
    }
  }

  // Handle print using native system print dialog
  const handlePrint = async () => {
    if (!transactionData) return

    try {
      const receiptData = {
        transactionNumber: transactionData.transaction_number,
        transactionDate: transactionData.transaction_date,
        cashierName: cashierName,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          variant: item.variant || null,
          addOns: item.addOns || [],
          totalPrice: item.totalPrice
        })),
        subtotal: grandTotal,
        total: grandTotal,
        paymentMethod: transactionData.payment_method || null,
        cashReceived: transactionData.cash_received || null,
        cashChange: transactionData.cash_change || null,
        customerName: transactionData.customer_name || null
      }

      // Use universal print for all platforms
      await universalPrintService.printReceipt(receiptData)
      toast.success('Print Dialog Dibuka', 'Pilih printer Epson EP5859 yang sudah terhubung di perangkat Anda')
    } catch (error: any) {
      console.error('Print error:', error)
      toast.error('Gagal Membuka Print Dialog', error.message || 'Terjadi kesalahan saat membuka print dialog')
    }
  }

  return (
    <>
      {/* Receipt Modal */}
      {showReceipt && transactionData && (
        <Receipt
          transactionNumber={transactionData.transaction_number}
          transactionDate={transactionData.transaction_date}
          cashierName={cashierName}
          cart={cart}
          subtotal={grandTotal}
          total={grandTotal}
          paymentMethod={transactionData.payment_method}
          cashReceived={transactionData.cash_received}
          cashChange={transactionData.cash_change}
          customerName={transactionData.customer_name}
          onClose={handleReceiptClose}
          onPrint={handlePrint}
        />
      )}

      {/* Header */}
      <div className="pt-4 mb-4">
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 transition-all"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-black">Pembayaran</h1>
              <p className="text-xs text-gray-600">{cart.length} item • {formatPrice(grandTotal)}</p>
            </div>
          </div>
        </div>
      </div>

    <div className="space-y-3">

      {/* Order Summary */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
        <h2 className="text-xs font-semibold text-black mb-2">Detail Pesanan</h2>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {cart.map((item, index) => (
            <div key={index} className="bg-white/40 border border-white/30 rounded-lg p-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-black">
                    {item.product.name} <span className="text-gray-600">× {item.quantity}</span>
                  </p>
                  {item.variant && (
                    <p className="text-[9px] text-gray-600 mt-0.5">• {item.variant}</p>
                  )}
                  {item.addOns.length > 0 && (
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      {item.addOns.map((addon, idx) => (
                        <p key={idx}>• {addon.name} (+{formatPrice(addon.price)})</p>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-blue-500 flex-shrink-0">{formatPrice(item.totalPrice)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/20 mt-2 pt-2 bg-white/30 -mx-3 -mb-3 px-3 pb-3 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-black">Total Pembayaran</span>
            <span className="text-xl font-bold text-black">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Transaction Type Selection - Hide if paying existing open bill */}
      {!existingTransactionId && (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
          <h2 className="text-xs font-semibold text-black mb-2">Tipe Transaksi</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTransactionType('bayar_langsung')}
              className={`h-10 rounded-xl text-xs font-semibold transition-all ${
                transactionType === 'bayar_langsung'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              Bayar Langsung
            </button>
            <button
              onClick={() => setTransactionType('open_bill')}
              className={`h-10 rounded-xl text-xs font-semibold transition-all ${
                transactionType === 'open_bill'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              Open Bill
            </button>
          </div>
        </div>
      )}

      {/* Payment Method (for Bayar Langsung or existing open bill) */}
      {(transactionType === 'bayar_langsung' || existingTransactionId) && (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
          <h2 className="text-xs font-semibold text-black mb-2">Metode Pembayaran</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`h-16 rounded-xl font-semibold transition-all flex flex-col items-center justify-center gap-1.5 ${
                paymentMethod === 'cash'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs">Tunai</span>
            </button>
            <button
              onClick={() => setPaymentMethod('qris')}
              className={`h-16 rounded-xl font-semibold transition-all flex flex-col items-center justify-center gap-1.5 ${
                paymentMethod === 'qris'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-xs">QRIS</span>
            </button>
            <button
              onClick={() => setPaymentMethod('debit')}
              className={`h-16 rounded-xl font-semibold transition-all flex flex-col items-center justify-center gap-1.5 ${
                paymentMethod === 'debit'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs">Debit</span>
            </button>
          </div>

          {/* Cash Payment Form */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2 border-t border-white/20 pt-3">
              <div>
                <label className="block text-[10px] font-semibold text-black mb-1.5">Nominal Pembayaran</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cashReceived ? formatPrice(parseFloat(cashReceived)) : ''}
                  onChange={(e) => handleCashReceivedChange(e.target.value)}
                  placeholder="Rp 0"
                  className="w-full h-11 px-3 bg-white/40 border-2 border-white/30 rounded-xl text-base font-bold text-black placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Quick Cash Buttons Container */}
              <div className="bg-gradient-to-br from-white/40 to-white/20 border border-white/30 rounded-xl p-2.5">
                <p className="text-[9px] font-semibold text-gray-700 mb-1.5">Nominal Cepat</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setQuickCash(grandTotal)}
                    className="h-8 bg-white/60 hover:bg-white/80 border border-white/40 rounded-lg text-[10px] font-bold text-gray-700 transition-all hover:scale-105 active:scale-95"
                  >
                    Pas
                  </button>
                  <button
                    onClick={() => setQuickCash(50000)}
                    className="h-8 bg-white/60 hover:bg-white/80 border border-white/40 rounded-lg text-[10px] font-bold text-gray-700 transition-all hover:scale-105 active:scale-95"
                  >
                    50k
                  </button>
                  <button
                    onClick={() => setQuickCash(100000)}
                    className="h-8 bg-white/60 hover:bg-white/80 border border-white/40 rounded-lg text-[10px] font-bold text-gray-700 transition-all hover:scale-105 active:scale-95"
                  >
                    100k
                  </button>
                  <button
                    onClick={() => setQuickCash(200000)}
                    className="h-8 bg-white/60 hover:bg-white/80 border border-white/40 rounded-lg text-[10px] font-bold text-gray-700 transition-all hover:scale-105 active:scale-95"
                  >
                    200k
                  </button>
                </div>
              </div>

              {/* Cash Change Display */}
              {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-green-700">Kembalian</span>
                    <span className="text-base font-bold text-green-700">{formatPrice(cashChange)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Open Bill Form */}
      {transactionType === 'open_bill' && (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
          <h2 className="text-xs font-semibold text-black mb-2">Informasi Pelanggan</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-black mb-1.5">
                Nama Pelanggan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Masukkan nama pelanggan"
                className="w-full h-11 px-3 bg-white/40 border-2 border-white/30 rounded-xl text-sm font-semibold text-black placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-black mb-1.5">
                Catatan (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan jika diperlukan"
                rows={2}
                className="w-full px-3 py-2 bg-white/40 border-2 border-white/30 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="w-12 h-12 bg-white/40 hover:bg-white/60 border border-white/30 rounded-xl text-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing || !isFormValid()}
            className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all shadow-lg ${
              isProcessing || !isFormValid()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memproses...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {transactionType === 'open_bill' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Open Bill
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Proses Pembayaran
                  </>
                )}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
