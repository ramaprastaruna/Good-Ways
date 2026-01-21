import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContainer'

interface Transaction {
  id: string
  transaction_number: string
  transaction_date: string
  items: any[]
  total: number
  payment_status: string
  payment_method: string | null
  customer_name: string | null
  cashier_name: string
  created_at: string
}

interface OverviewStats {
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  openBills: number
  todaySales: number
}

interface BestSellerProduct {
  product_name: string
  total_quantity: number
  total_revenue: number
}

export default function Reports() {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    openBills: 0,
    todaySales: 0
  })
  const [bestSellers, setBestSellers] = useState<BestSellerProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')

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

  // Get date range filter
  const getDateRangeFilter = () => {
    const now = new Date()
    let startDate = new Date()

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'all':
        return null
    }

    return startDate.toISOString()
  }

  // Fetch transactions
  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      const dateFilter = getDateRangeFilter()
      if (dateFilter) {
        query = query.gte('transaction_date', dateFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setTransactions(data || [])
      calculateStats(data || [])
      calculateBestSellers(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal Memuat Data', 'Terjadi kesalahan saat memuat data transaksi')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate overview stats
  const calculateStats = (data: Transaction[]) => {
    const paidTransactions = data.filter(t => t.payment_status === 'paid')
    const openBillsCount = data.filter(t => t.payment_status === 'open_bill').length
    const totalSales = paidTransactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = paidTransactions.length
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0

    // Today's sales
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySales = paidTransactions
      .filter(t => new Date(t.transaction_date) >= today)
      .reduce((sum, t) => sum + t.total, 0)

    setOverviewStats({
      totalSales,
      totalTransactions,
      averageTransaction,
      openBills: openBillsCount,
      todaySales
    })
  }

  // Calculate best sellers
  const calculateBestSellers = (data: Transaction[]) => {
    const paidTransactions = data.filter(t => t.payment_status === 'paid')
    const productMap = new Map<string, { quantity: number; revenue: number }>()

    paidTransactions.forEach(transaction => {
      transaction.items.forEach((item: any) => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 }
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.totalPrice
        })
      })
    })

    const bestSellersList: BestSellerProduct[] = Array.from(productMap.entries())
      .map(([name, data]) => ({
        product_name: name,
        total_quantity: data.quantity,
        total_revenue: data.revenue
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5)

    setBestSellers(bestSellersList)
  }

  // Initial fetch
  useEffect(() => {
    fetchTransactions()
  }, [dateRange])

  // Filter transactions
  useEffect(() => {
    let result = [...transactions]

    // Search filter
    if (searchQuery) {
      result = result.filter(t =>
        t.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.cashier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.payment_status === statusFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter(t => t.payment_method === paymentMethodFilter)
    }

    setFilteredTransactions(result)
  }, [transactions, searchQuery, statusFilter, paymentMethodFilter])

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
        <h2 className="text-xs font-semibold text-black mb-3">Periode</h2>
        <div className="grid grid-cols-4 gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`h-8 rounded-lg text-[10px] font-semibold transition-all ${
                dateRange === range
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
              }`}
            >
              {range === 'today' && 'Hari Ini'}
              {range === 'week' && '7 Hari'}
              {range === 'month' && '30 Hari'}
              {range === 'all' && 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats Cards */}
      {isLoading ? (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat data...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Sales */}
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-1">Total Penjualan</p>
              <p className="text-lg font-bold text-black">{formatPrice(overviewStats.totalSales)}</p>
            </div>

            {/* Total Transactions */}
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-1">Total Transaksi</p>
              <p className="text-lg font-bold text-black">{overviewStats.totalTransactions}</p>
            </div>

            {/* Average Transaction */}
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-1">Rata-rata</p>
              <p className="text-lg font-bold text-black">{formatPrice(overviewStats.averageTransaction)}</p>
            </div>

            {/* Open Bills */}
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-1">Open Bills</p>
              <p className="text-lg font-bold text-black">{overviewStats.openBills}</p>
            </div>
          </div>

          {/* Best Sellers */}
          {bestSellers.length > 0 && (
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
              <h2 className="text-xs font-semibold text-black mb-3">Produk Terlaris</h2>
              <div className="space-y-2">
                {bestSellers.map((product, index) => (
                  <div key={index} className="bg-white/40 border border-white/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-black">{product.product_name}</p>
                        <p className="text-[9px] text-gray-600">{product.total_quantity} terjual</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-blue-500">{formatPrice(product.total_revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi..."
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

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2 bg-white/60 border border-white/30 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">Semua Status</option>
                  <option value="paid">Paid</option>
                  <option value="open_bill">Open Bill</option>
                  <option value="voided">Voided</option>
                </select>

                {/* Payment Method Filter */}
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="h-8 px-2 bg-white/60 border border-white/30 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">Semua Metode</option>
                  <option value="cash">Cash</option>
                  <option value="qris">QRIS</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden">
            <div className="p-4 border-b border-white/20">
              <h2 className="text-xs font-semibold text-black">Riwayat Transaksi ({filteredTransactions.length})</h2>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-sm text-gray-600">Tidak ada transaksi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-white/60 backdrop-blur-xl border-b border-white/20">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">No. Transaksi</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">Tanggal</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">Kasir</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">Total</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">Metode</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-white/10 hover:bg-white/30 transition-all">
                          <td className="px-4 py-3 text-[10px] font-medium text-black">{transaction.transaction_number}</td>
                          <td className="px-4 py-3 text-[10px] text-gray-600">{formatDate(transaction.transaction_date)}</td>
                          <td className="px-4 py-3 text-[10px] text-gray-600">{transaction.cashier_name}</td>
                          <td className="px-4 py-3 text-[10px] font-semibold text-black">{formatPrice(transaction.total)}</td>
                          <td className="px-4 py-3">
                            {transaction.payment_method ? (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 border border-blue-200 rounded text-[9px] font-semibold text-blue-700 uppercase">
                                {transaction.payment_method}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 border rounded text-[9px] font-semibold uppercase ${
                              transaction.payment_status === 'paid' ? 'bg-green-100 border-green-200 text-green-700' :
                              transaction.payment_status === 'open_bill' ? 'bg-yellow-100 border-yellow-200 text-yellow-700' :
                              'bg-red-100 border-red-200 text-red-700'
                            }`}>
                              {transaction.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
