import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContainer'
import { useConfirm } from '../components/ConfirmDialog'
import Receipt from '../components/Receipt'
import { universalPrintService } from '../services/UniversalPrintService'

interface Transaction {
  id: string
  transaction_number: string
  transaction_date: string
  items: any[]
  total: number
  customer_name: string | null
  notes: string | null
  cashier_name: string
  payment_method: string | null
  payment_status: string
  created_at: string
}

interface SalesProps {
  onPayBill: (transaction: Transaction) => void
}

export default function Sales({ onPayBill }: SalesProps) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [activeTab, setActiveTab] = useState<'paid' | 'open'>('paid')
  const [paidTransactions, setPaidTransactions] = useState<Transaction[]>([])
  const [openBills, setOpenBills] = useState<Transaction[]>([])
  const [filteredPaid, setFilteredPaid] = useState<Transaction[]>([])
  const [filteredOpen, setFilteredOpen] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedBill, setExpandedBill] = useState<string | null>(null)

  // Receipt modal states
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | 'year'>('all')
  const [monthFilter, setMonthFilter] = useState<number | null>(null)

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

  // Filter by date
  const filterByDate = (transactions: Transaction[]) => {
    const now = new Date()

    // Month filter has priority
    if (monthFilter !== null) {
      return transactions.filter(txn => {
        const txnDate = new Date(txn.transaction_date)
        return txnDate.getMonth() === monthFilter && txnDate.getFullYear() === now.getFullYear()
      })
    }

    // Then apply general date filter
    switch (dateFilter) {
      case 'today':
        return transactions.filter(txn => {
          const txnDate = new Date(txn.transaction_date)
          return (
            txnDate.getDate() === now.getDate() &&
            txnDate.getMonth() === now.getMonth() &&
            txnDate.getFullYear() === now.getFullYear()
          )
        })
      case 'month':
        return transactions.filter(txn => {
          const txnDate = new Date(txn.transaction_date)
          return (
            txnDate.getMonth() === now.getMonth() &&
            txnDate.getFullYear() === now.getFullYear()
          )
        })
      case 'year':
        return transactions.filter(txn => {
          const txnDate = new Date(txn.transaction_date)
          return txnDate.getFullYear() === now.getFullYear()
        })
      default: // 'all'
        return transactions
    }
  }

  // Handle show receipt
  const handleShowReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowReceipt(true)
  }

  // Handle close receipt
  const handleCloseReceipt = () => {
    setShowReceipt(false)
    setSelectedTransaction(null)
  }

  // Handle print receipt
  const handlePrintReceipt = async () => {
    if (!selectedTransaction) return

    try {
      const receiptData = {
        transactionNumber: selectedTransaction.transaction_number,
        transactionDate: selectedTransaction.transaction_date,
        cashierName: selectedTransaction.cashier_name,
        items: selectedTransaction.items.map((item: any) => ({
          name: item.product_name,
          variant: item.variant,
          addOns: item.addOns || [],
          quantity: item.quantity,
          price: item.totalPrice / item.quantity,
          totalPrice: item.totalPrice
        })),
        subtotal: selectedTransaction.total,
        total: selectedTransaction.total,
        paymentMethod: selectedTransaction.payment_method || 'OPEN BILL',
        cashReceived: selectedTransaction.payment_method === 'cash' ? selectedTransaction.total : null,
        cashChange: 0,
        customerName: selectedTransaction.customer_name
      }

      await universalPrintService.printReceipt(receiptData)
      toast.success('Print Dialog Dibuka', 'Pilih printer Epson EP5859 yang sudah terhubung di perangkat Anda')
    } catch (error: any) {
      console.error('Print error:', error)
      toast.error('Gagal Print', error.message || 'Terjadi kesalahan saat mencetak struk')
    }
  }

  // Fetch paid transactions
  const fetchPaidTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .neq('payment_status', 'open_bill')
        .neq('payment_status', 'voided')
        .order('transaction_date', { ascending: false })
        .limit(50)

      if (error) throw error

      setPaidTransactions(data || [])
      setFilteredPaid(data || [])
    } catch (error) {
      console.error('Error fetching paid transactions:', error)
      toast.error('Gagal Memuat Data', 'Terjadi kesalahan saat memuat transaksi')
    }
  }

  // Fetch open bills
  const fetchOpenBills = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_status', 'open_bill')
        .order('transaction_date', { ascending: false })

      if (error) throw error

      setOpenBills(data || [])
      setFilteredOpen(data || [])
    } catch (error) {
      console.error('Error fetching open bills:', error)
      toast.error('Gagal Memuat Data', 'Terjadi kesalahan saat memuat open bills')
    }
  }

  // Fetch all data
  const fetchAllData = async () => {
    setIsLoading(true)
    await Promise.all([fetchPaidTransactions(), fetchOpenBills()])
    setIsLoading(false)
  }

  // Initial fetch
  useEffect(() => {
    fetchAllData()
  }, [])

  // Date filter
  useEffect(() => {
    if (activeTab === 'paid') {
      let result = [...paidTransactions]
      // Apply date filter
      result = filterByDate(result)
      setFilteredPaid(result)
    } else {
      let result = [...openBills]
      // Apply date filter
      result = filterByDate(result)
      setFilteredOpen(result)
    }
  }, [paidTransactions, openBills, activeTab, dateFilter, monthFilter])

  // Reset expanded bill when changing tabs
  useEffect(() => {
    setExpandedBill(null)
  }, [activeTab])

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedBill(expandedBill === id ? null : id)
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
      const { error } = await supabase
        .from('transactions')
        .update({
          payment_status: 'voided',
          void_reason: 'Dibatalkan oleh kasir',
          voided_at: new Date().toISOString()
        })
        .eq('id', billId)

      if (error) throw error

      toast.success('Open Bill Dibatalkan', 'Open bill berhasil dibatalkan')
      fetchAllData()
    } catch (error) {
      console.error('Error voiding bill:', error)
      toast.error('Gagal Membatalkan', 'Terjadi kesalahan saat membatalkan open bill')
    }
  }

  const renderPaidTransactions = () => {
    if (isLoading) {
      return (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat transaksi...</p>
        </div>
      )
    }

    if (filteredPaid.length === 0) {
      return (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-sm text-gray-600">Tidak ada transaksi</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {filteredPaid.map((txn) => (
          <div
            key={txn.id}
            className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden"
          >
            {/* Transaction Header */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 bg-green-100 border border-green-200 rounded text-[9px] font-semibold text-green-700">
                      LUNAS
                    </span>
                    <span className="text-[10px] text-gray-500">{txn.transaction_number}</span>
                  </div>
                  {txn.customer_name && (
                    <h3 className="text-sm font-bold text-black">{txn.customer_name}</h3>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {formatDate(txn.transaction_date)} • {txn.cashier_name}
                  </p>
                  {txn.payment_method && (
                    <p className="text-[10px] text-blue-600 font-semibold mt-1">
                      {txn.payment_method.toUpperCase()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-black">{formatPrice(txn.total)}</p>
                  <p className="text-[9px] text-gray-500">{txn.items.length} item</p>
                </div>
              </div>

              {/* Notes */}
              {txn.notes && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[10px] text-blue-700">
                    <span className="font-semibold">Catatan:</span> {txn.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1 border-t border-black/5 pt-3 -mb-1">
                <button
                  onClick={() => toggleExpand(txn.id)}
                  className={`flex-1 h-8 text-[10px] font-semibold transition-all duration-300 flex items-center justify-center gap-1 ${
                    expandedBill === txn.id
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {expandedBill === txn.id ? 'Tutup Detail' : 'Lihat Detail'}
                </button>
                <div className="w-px bg-gray-200" />
                <button
                  onClick={() => handleShowReceipt(txn)}
                  className="flex-1 h-8 text-[10px] font-semibold transition-all duration-300 flex items-center justify-center gap-1 text-gray-500 hover:text-green-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Lihat Struk
                </button>
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedBill === txn.id && (
              <div className="border-t border-white/20 bg-white/30 p-4">
                <h4 className="text-[10px] font-semibold text-black mb-2">Detail Pesanan</h4>
                <div className="space-y-2">
                  {txn.items.map((item: any, index: number) => (
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
    )
  }

  const renderOpenBills = () => {
    if (isLoading) {
      return (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat open bills...</p>
        </div>
      )
    }

    if (filteredOpen.length === 0) {
      return (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-sm text-gray-600">Tidak ada open bill</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {filteredOpen.map((bill) => (
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
              <div className="space-y-2">
                {/* Top Row - Detail and Receipt */}
                <div className="flex gap-1 border-t border-black/5 pt-3">
                  <button
                    onClick={() => toggleExpand(bill.id)}
                    className={`flex-1 h-8 text-[10px] font-semibold transition-all duration-300 flex items-center justify-center gap-1 ${
                      expandedBill === bill.id
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expandedBill === bill.id ? 'Tutup Detail' : 'Lihat Detail'}
                  </button>
                  <div className="w-px bg-gray-200" />
                  <button
                    onClick={() => handleShowReceipt(bill)}
                    className="flex-1 h-8 text-[10px] font-semibold transition-all duration-300 flex items-center justify-center gap-1 text-gray-500 hover:text-green-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Lihat Struk
                  </button>
                </div>

                {/* Bottom Row - Pay and Cancel */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onPayBill(bill)}
                    className="flex-1 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Bayar Sekarang
                  </button>
                  <button
                    onClick={() => handleVoidBill(bill.id, bill.customer_name || 'pelanggan')}
                    className="h-9 px-4 bg-white/40 hover:bg-red-50 border border-red-200 rounded-lg flex items-center justify-center transition-all text-red-600 hover:text-red-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="ml-1 text-[10px] font-semibold">Batalkan</span>
                  </button>
                </div>
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
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('paid')}
            className={`flex-1 h-10 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'paid'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/40 text-gray-700 hover:bg-white/60'
            }`}
          >
            Bayar Langsung
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 h-10 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === 'open'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/40 text-gray-700 hover:bg-white/60'
            }`}
          >
            Open Bills
            {openBills.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[9px] font-bold leading-none text-white bg-red-500 rounded-full">
                {openBills.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden">
        <div className="p-3">
          {/* Compact Filter Bar */}
          <div className="space-y-2">
            {/* Quick Filters - Top Row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'today', label: 'Hari Ini' },
                { key: 'month', label: 'Bulan Ini' },
                { key: 'year', label: 'Tahun Ini' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => { setDateFilter(filter.key as any); setMonthFilter(null); }}
                  className={`relative h-8 text-[10px] font-semibold transition-all duration-300 rounded-lg ${
                    dateFilter === filter.key
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                  {dateFilter === filter.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-scale-in" />
                  )}
                </button>
              ))}
            </div>

            {/* Month Filters - Bottom Row - Only show when filter is "all" or "year" */}
            {(dateFilter === 'all' || dateFilter === 'year') && (
              <div className="grid grid-cols-6 gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setMonthFilter(monthFilter === index ? null : index)}
                    className={`relative h-8 text-[10px] font-semibold transition-all duration-300 rounded-lg ${
                      monthFilter === index
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {month}
                    {monthFilter === index && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-full animate-scale-in" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'paid' ? renderPaidTransactions() : renderOpenBills()}

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <Receipt
          transactionNumber={selectedTransaction.transaction_number}
          transactionDate={selectedTransaction.transaction_date}
          cashierName={selectedTransaction.cashier_name}
          cart={selectedTransaction.items.map((item: any) => ({
            product: {
              name: item.product_name,
              price: item.totalPrice / item.quantity
            },
            variant: item.variant,
            addOns: item.addOns || [],
            quantity: item.quantity,
            totalPrice: item.totalPrice
          }))}
          subtotal={selectedTransaction.total}
          total={selectedTransaction.total}
          paymentMethod={selectedTransaction.payment_method || 'OPEN BILL'}
          cashReceived={selectedTransaction.payment_method === 'cash' ? selectedTransaction.total : null}
          cashChange={0}
          customerName={selectedTransaction.customer_name}
          onClose={handleCloseReceipt}
          onPrint={handlePrintReceipt}
        />
      )}
    </div>
  )
}
