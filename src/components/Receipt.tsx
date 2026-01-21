import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CartItem } from '../pages/Cashier'

interface ReceiptProps {
  transactionNumber: string
  transactionDate: string
  cashierName: string
  cart: CartItem[]
  subtotal: number
  total: number
  paymentMethod: string | null
  cashReceived?: number | null
  cashChange?: number | null
  customerName?: string | null
  onClose: () => void
  onPrint?: () => void
}

export default function Receipt({
  transactionNumber,
  transactionDate,
  cashierName,
  cart,
  subtotal,
  total,
  paymentMethod,
  cashReceived,
  cashChange,
  customerName,
  onClose,
  onPrint
}: ReceiptProps) {

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  // Format date
  const formatDate = (dateString: string) => {
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

  // Handle body overflow when modal is open
  useEffect(() => {
    // Save original overflow
    const originalOverflow = document.body.style.overflow

    // Disable scrolling
    document.body.style.overflow = 'hidden'

    // Cleanup: restore original overflow when modal closes
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center touch-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Receipt Modal */}
      <div className="relative w-full max-w-[280px] backdrop-blur-3xl bg-white/90 rounded-xl border border-black/10 shadow-2xl overflow-hidden m-3">

        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-black/10">
          <h2 className="text-[10px] font-bold text-black">Struk Pembayaran</h2>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all"
          >
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt Content - Scrollable */}
        <div className="p-2 max-h-[calc(100vh-10rem)] overflow-y-auto">
          {/* Receipt Paper Mockup - 58mm width */}
          <div className="bg-white rounded-lg border border-gray-200 p-2 font-mono text-[9px]">

            {/* Header */}
            <div className="text-center mb-2 pb-2 border-b border-dashed border-gray-300">
              <div className="text-xs font-bold mb-0.5">GOOD WAYS</div>
              <div className="text-[8px] text-gray-600">Sistem Kasir Digital</div>
            </div>

            {/* Transaction Info */}
            <div className="mb-2 pb-2 border-b border-dashed border-gray-300 text-[8px]">
              <div className="flex justify-between mb-0.5">
                <span className="text-gray-600">Kasir:</span>
                <span className="font-semibold">{cashierName}</span>
              </div>
              <div className="flex justify-between mb-0.5">
                <span className="text-gray-600">Tanggal:</span>
                <span>{formatDate(transactionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">No. Transaksi:</span>
                <span className="font-semibold">{transactionNumber}</span>
              </div>
              {customerName && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-semibold">{customerName}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-2 pb-2 border-b border-dashed border-gray-300">
              <div className="font-semibold mb-1 text-center text-[8px]">RINCIAN PESANAN</div>

              {cart.map((item, index) => (
                <div key={index} className="mb-2 text-[8px]">
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span>{item.product.name}</span>
                    <span>{formatPrice(item.product.price)}</span>
                  </div>

                  {item.variant && (
                    <div className="pl-1.5 text-gray-600 text-[7px]">- {item.variant}</div>
                  )}

                  {item.addOns.length > 0 && (
                    <div className="pl-1.5 text-[7px]">
                      {item.addOns.map((addon, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600">
                          <span>- {addon.name}</span>
                          <span>+{formatPrice(addon.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-600">{item.quantity}x</span>
                    <span className="font-semibold">{formatPrice(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mb-2 pb-2 border-b border-dashed border-gray-300 text-[8px]">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-[9px]">
                <span>TOTAL:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment Info */}
            {paymentMethod && (
              <div className="mb-2 pb-2 border-b border-dashed border-gray-300 text-[8px]">
                <div className="font-semibold mb-1 text-center">PEMBAYARAN</div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-gray-600">Metode:</span>
                  <span className="font-semibold uppercase">{paymentMethod}</span>
                </div>

                {paymentMethod === 'cash' && cashReceived && (
                  <>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-gray-600">Bayar:</span>
                      <span>{formatPrice(cashReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kembalian:</span>
                      <span className="font-semibold">{formatPrice(cashChange || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Open Bill Info */}
            {!paymentMethod && customerName && (
              <div className="mb-2 pb-2 border-b border-dashed border-gray-300 text-center">
                <div className="text-yellow-600 font-semibold text-[8px]">
                  ** OPEN BILL **
                </div>
                <div className="text-[7px] text-gray-600 mt-0.5">
                  Belum dibayar
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[7px] text-gray-600">
              <div className="mb-0.5">Terima kasih atas kunjungan Anda!</div>
              <div>Powered by Good Ways POS</div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-2 border-t border-black/10 flex gap-1.5">
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex-1 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[9px] font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Struk
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-7 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[9px] font-semibold text-gray-700 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
