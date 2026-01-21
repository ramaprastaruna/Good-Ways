import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Products from './Products'
import Cashier, { CartItem } from './Cashier'
import Payment from './Payment'
import Sales from './Sales'
import Reports from './Reports'
import { useToast } from '../components/ToastContainer'

interface HomeProps {
  user: {
    id: string
    username: string
    role: string
  }
  onLogout: () => void
}

export default function Home({ user, onLogout }: HomeProps) {
  const toast = useToast()
  const [activeNav, setActiveNav] = useState('cashier')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentData, setPaymentData] = useState<{ cart: CartItem[]; grandTotal: number; transactionId?: string; transactionNumber?: string } | null>(null)
  const [openBillsCount, setOpenBillsCount] = useState(0)

  const handleGoToPayment = (cart: CartItem[], grandTotal: number) => {
    setPaymentData({ cart, grandTotal })
    setShowPayment(true)
  }

  const handleBackFromPayment = () => {
    setShowPayment(false)
    setPaymentData(null)
  }

  const handlePaymentSuccess = (transactionNumber: string, paymentMethod: string | null) => {
    // Clear cart from localStorage
    localStorage.removeItem('goodways-cart')

    // Show success message
    toast.success(
      'Pembayaran Berhasil!',
      `No. Transaksi: ${transactionNumber}${paymentMethod ? `\nMetode: ${paymentMethod.toUpperCase()}` : ''}`
    )

    // Back to cashier or open bills
    setShowPayment(false)
    setPaymentData(null)

    // Refresh open bills count
    fetchOpenBillsCount()
  }

  // Handle pay open bill
  const handlePayOpenBill = (transaction: any) => {
    // Convert transaction items to cart items
    const cart: CartItem[] = transaction.items.map((item: any) => ({
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        category: '',
        recipe: null,
        image_url: '',
        created_at: ''
      },
      quantity: item.quantity,
      variant: item.variant,
      addOns: item.addOns || [],
      totalPrice: item.totalPrice
    }))

    // Set payment data with transaction details and go to payment
    setPaymentData({
      cart,
      grandTotal: transaction.total,
      transactionId: transaction.id,
      transactionNumber: transaction.transaction_number
    })
    setShowPayment(true)
  }

  // Fetch open bills count
  const fetchOpenBillsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'open_bill')

      if (error) throw error
      setOpenBillsCount(count || 0)
    } catch (error) {
      console.error('Error fetching open bills count:', error)
    }
  }

  // Fetch open bills count on mount and when returning to open bills
  useEffect(() => {
    fetchOpenBillsCount()
  }, [])

  // Refresh count when navigating to sales
  useEffect(() => {
    if (activeNav === 'sales') {
      fetchOpenBillsCount()
    }
  }, [activeNav])

  // Close menu on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Disable body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  const navItems = [
    { id: 'cashier', label: 'Kasir', icon: 'M3 3h18v4H3V3zm0 6v8a2 2 0 002 2h14a2 2 0 002-2V9H3zm5 3h8m-8 3h8', adminOnly: false },
    { id: 'sales', label: 'Penjualan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', badge: openBillsCount, adminOnly: false },
    { id: 'reports', label: 'Laporan', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', adminOnly: true },
    { id: 'products', label: 'Produk', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', adminOnly: true },
  ]

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden">
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLW9wYWNpdHk9IjAuMDIiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-100/40 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Sidebar Menu */}
      {isMenuOpen && !showPayment && (
        <div
          className="fixed inset-0 z-50 h-screen-dynamic w-full touch-none"
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Sidebar Container */}
          <div className="fixed top-4 left-4 w-[calc(75vw-2rem)] max-w-sm sm:max-w-none sm:w-64 h-sidebar-dynamic">
            <div
              className={`h-full w-full backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden transform transition-all duration-200 ease-out ${
                isMenuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >

          {/* Menu Header - Fixed */}
          <div className="flex items-center justify-between px-5 pt-5 pb-6 flex-shrink-0">
            <h2 className="text-lg font-semibold text-black">Menu</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sidebar-scroll">
            {/* User Info */}
            <div className="mb-6 p-3 bg-white/30 rounded-xl border border-white/20">
              <div className="text-sm font-semibold text-black text-left">{user.username}</div>
            </div>

            {/* Menu Items */}
            <nav className="space-y-1.5 mb-6">
              {navItems.filter(item => !item.adminOnly || user.role === 'admin').map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg group ${
                    activeNav === item.id
                      ? 'text-blue-500'
                      : 'text-gray-700 hover:bg-white/60 hover:translate-x-1 transition-all duration-200'
                  }`}
                >
                  <svg className={`w-4 h-4 ${activeNav === item.id ? '' : 'group-hover:scale-110 transition-transform duration-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className={`text-xs ${activeNav === item.id ? 'font-bold' : 'font-medium'} flex-1 text-left`}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Logout Button - Fixed at bottom */}
          <div className="px-5 pt-4 pb-5 border-t border-white/20 flex-shrink-0">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:translate-x-1 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs font-medium text-left flex-1">Keluar</span>
            </button>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      {!showPayment && (
        <div className="pt-4 px-4 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-3">
              <div className="flex items-center justify-between">
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="w-9 h-9 rounded-lg bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-black/10 flex items-center justify-center transition-all duration-200 hover:scale-105 flex-shrink-0"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Active Menu Name */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <h1 className="text-lg font-bold text-black tracking-tight capitalize">
                    {navItems.find(item => item.id === activeNav)?.label || 'GOOD WAYS'}
                  </h1>
                </div>

                {/* Empty space for balance */}
                <div className="w-9 flex-shrink-0"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 px-4 pb-4">
        <div className="max-w-6xl mx-auto">
          {showPayment && paymentData ? (
            <Payment
              cart={paymentData.cart}
              grandTotal={paymentData.grandTotal}
              cashierName={user.username}
              userId={user.id}
              onBack={handleBackFromPayment}
              onPaymentSuccess={handlePaymentSuccess}
              existingTransactionId={paymentData.transactionId}
              existingTransactionNumber={paymentData.transactionNumber}
            />
          ) : (
            <>
              {activeNav === 'cashier' && <Cashier onGoToPayment={handleGoToPayment} />}
              {activeNav === 'sales' && <Sales onPayBill={handlePayOpenBill} />}
              {activeNav === 'reports' && user.role === 'admin' && <Reports />}
              {activeNav === 'products' && user.role === 'admin' && <Products userRole={user.role} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
