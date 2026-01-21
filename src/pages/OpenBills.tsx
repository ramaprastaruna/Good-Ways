import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContainer'
import { useConfirm } from '../components/ConfirmDialog'

interface Transaction {
  id: string
  transaction_number: string
  transaction_date: string
  items: any[]
  total: number
  customer_name: string
  notes: string | null
  cashier_name: string
  created_at: string
}

interface OpenBillsProps {
  onPayBill: (transaction: Transaction) => void
}

export default function OpenBills({ onPayBill }: OpenBillsProps) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [openBills, setOpenBills] = useState<Transaction[]>([])
  const [filteredBills, setFilteredBills] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBill, setExpandedBill] = useState<string | null>(null)

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

  // Fetch open bills
  const fetchOpenBills = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_status', 'open_bill')
        .order('transaction_date', { ascending: false })

      if (error) throw error

      setOpenBills(data || [])
      setFilteredBills(data || [])
    } catch (error) {
      console.error('Error fetching open bills:', error)
      toast.error('Gagal Memuat Data', 'Terjadi kesalahan saat memuat open bills')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchOpenBills()
  }, [])

  // Search filter
  useEffect(() => {
    let result = [...openBills]

    if (searchQuery) {
      result = result.filter(bill =>
        bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.transaction_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredBills(result)
  }, [searchQuery, openBills])

  // Toggle expand bill
  const toggleExpand = (billId: string) => {
    setExpandedBill(expandedBill === billId ? null : billId)
  }

  // Handle void bill
  const handleVoidBill = async (billId: string, customerName: string) => {
    const confirmed = await confirm({
      title: 'Batalkan Open Bill?',
      message: `Apakah Anda yakin ingin membatalkan open bill untuk ${customerName}?\nTindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Batalkan',
      cancelText: 'Batal'
    })

    if (!confirmed) return

    try {
      const { error} = await supabase
        .from('transactions')
        .update({
          payment_status: 'voided',
          void_reason: 'Dibatalkan oleh kasir',
          voided_at: new Date().toISOString()
        })
        .eq('id', billId)

      if (error) throw error

      toast.success('Open Bill Dibatalkan', 'Open bill berhasil dibatalkan')
      fetchOpenBills()
    } catch (error) {
      console.error('Error voiding bill:', error)
      toast.error('Gagal Membatalkan', 'Terjadi kesalahan saat membatalkan open bill')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan atau nomor transaksi..."
            className="w-full h-10 pl-10 pr-10 bg-white/60 border-2 border-black/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Open Bills List */}
      {isLoading ? (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat open bills...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-sm text-gray-600">
            {searchQuery ? 'Tidak ada hasil pencarian' : 'Tidak ada open bill'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden"
            >
              {/* Bill Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-0.5 bg-yellow-100 border border-yellow-200 rounded text-[9px] font-semibold text-yellow-700">
                        OPEN BILL
                      </span>
                      <span className="text-[10px] text-gray-500">{bill.transaction_number}</span>
                    </div>
                    <h3 className="text-sm font-bold text-black">{bill.customer_name}</h3>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {formatDate(bill.transaction_date)} • {bill.cashier_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-black">{formatPrice(bill.total)}</p>
                    <p className="text-[9px] text-gray-500">{bill.items.length} item</p>
                  </div>
                </div>

                {/* Notes */}
                {bill.notes && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-[10px] text-blue-700">
                      <span className="font-semibold">Catatan:</span> {bill.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleExpand(bill.id)}
                    className="flex-1 h-8 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expandedBill === bill.id ? 'Tutup Detail' : 'Lihat Detail'}
                  </button>
                  <button
                    onClick={() => onPayBill(bill)}
                    className="flex-1 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Bayar Sekarang
                  </button>
                  <button
                    onClick={() => handleVoidBill(bill.id, bill.customer_name)}
                    className="h-8 w-8 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-center transition-all"
                    title="Batalkan"
                  >
                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedBill === bill.id && (
                <div className="border-t border-white/20 bg-white/30 p-4">
                  <h4 className="text-[10px] font-semibold text-black mb-2">Detail Pesanan</h4>
                  <div className="space-y-2">
                    {bill.items.map((item: any, index: number) => (
                      <div key={index} className="bg-white/40 border border-white/30 rounded-lg p-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-[10px] font-semibold text-black">
                              {item.product_name} ({item.quantity}x)
                            </p>
                            {item.variant && (
                              <p className="text-[9px] text-gray-600">• {item.variant}</p>
                            )}
                            {item.addOns && item.addOns.length > 0 && (
                              <div className="text-[9px] text-gray-600">
                                {item.addOns.map((addon: any, idx: number) => (
                                  <p key={idx}>• {addon.name} (+{formatPrice(addon.price)})</p>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-blue-500">{formatPrice(item.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
