import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  recipe: string | null
  image_url: string
  has_variants?: boolean
  has_addons?: boolean
  created_at: string
}

export interface ProductAddon {
  id: string
  product_id: string
  name: string
  price: number
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  variant: string | null
  addOns: Array<{ name: string; price: number }>
  totalPrice: number
}

interface CashierProps {
  onGoToPayment: (cart: CartItem[], grandTotal: number) => void
}

export default function Cashier({ onGoToPayment }: CashierProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initial render
    const savedCart = localStorage.getItem('goodways-cart')
    return savedCart ? JSON.parse(savedCart) : []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Modal state for product selection
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productModalAnimating, setProductModalAnimating] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalVariant, setModalVariant] = useState<string>('Ice')
  const [modalAddOns, setModalAddOns] = useState<Array<{ name: string; price: number; selected: boolean }>>([])
  const [modalQuantity, setModalQuantity] = useState(1)

  // Cart detail modal state
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [cartModalAnimating, setCartModalAnimating] = useState(false)
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null)

  // Fetch products
  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('goodways-cart', JSON.stringify(cart))
  }, [cart])

  // Control body scroll when modals are open
  useEffect(() => {
    if (isProductModalOpen || isCartModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isProductModalOpen, isCartModalOpen])

  // Filter and search products
  useEffect(() => {
    let result = [...products]

    // Apply search
    if (searchQuery) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter)
    }

    setFilteredProducts(result)
  }, [products, searchQuery, categoryFilter])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is outside the filter button and dropdown
      if (isFilterOpen && !target.closest('.filter-dropdown-container')) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterOpen])

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  // Open product modal
  const openProductModal = async (product: Product) => {
    // Close filter dropdown if open
    setIsFilterOpen(false)

    setSelectedProduct(product)
    setModalVariant('Ice')
    setModalQuantity(1)

    // Fetch add-ons if product has add-ons enabled
    if (product.has_addons) {
      try {
        const { data, error } = await supabase
          .from('product_addons')
          .select('*')
          .eq('product_id', product.id)

        if (error) throw error

        if (data) {
          setModalAddOns(data.map(addon => ({
            name: addon.name,
            price: addon.price,
            selected: false
          })))
        } else {
          setModalAddOns([])
        }
      } catch (error) {
        console.error('Error fetching add-ons:', error)
        setModalAddOns([])
      }
    } else {
      setModalAddOns([])
    }

    setIsProductModalOpen(true)
    setTimeout(() => setProductModalAnimating(true), 10)
  }

  // Close product modal
  const closeProductModal = () => {
    setProductModalAnimating(false)
    setTimeout(() => {
      setIsProductModalOpen(false)
      setSelectedProduct(null)
      setEditingCartIndex(null)
    }, 200)
  }

  // Add to cart or update if editing
  const addToCart = () => {
    if (!selectedProduct) return

    // If editing existing item, update it
    if (editingCartIndex !== null) {
      updateCartItem()
      return
    }

    // Otherwise, add new item
    const selectedAddOns = modalAddOns.filter(a => a.selected).map(a => ({ name: a.name, price: a.price }))
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
    const totalPrice = (selectedProduct.price + addOnsTotal) * modalQuantity

    const newItem: CartItem = {
      product: selectedProduct,
      quantity: modalQuantity,
      variant: selectedProduct.has_variants ? modalVariant : null,
      addOns: selectedAddOns,
      totalPrice
    }

    setCart([...cart, newItem])
    closeProductModal()
  }

  // Calculate total
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  // Go to payment
  const goToPayment = () => {
    if (cart.length === 0) return
    onGoToPayment(cart, grandTotal)
  }

  // Open cart detail modal
  const openCartModal = () => {
    setIsCartModalOpen(true)
    setTimeout(() => setCartModalAnimating(true), 10)
  }

  // Close cart detail modal
  const closeCartModal = () => {
    setCartModalAnimating(false)
    setTimeout(() => {
      setIsCartModalOpen(false)
      setEditingCartIndex(null)
    }, 200)
  }

  // Remove item from cart
  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index)
    setCart(newCart)

    // Tutup modal jika cart kosong
    if (newCart.length === 0) {
      closeCartModal()
    }
  }

  // Start editing cart item
  const startEditCartItem = async (index: number) => {
    const item = cart[index]
    setEditingCartIndex(index)
    setSelectedProduct(item.product)
    setModalVariant(item.variant || 'Ice')
    setModalQuantity(item.quantity)

    // Fetch add-ons if product has add-ons enabled
    if (item.product.has_addons) {
      try {
        const { data, error } = await supabase
          .from('product_addons')
          .select('*')
          .eq('product_id', item.product.id)

        if (error) throw error

        if (data) {
          setModalAddOns(data.map(addon => ({
            name: addon.name,
            price: addon.price,
            selected: item.addOns.some(a => a.name === addon.name)
          })))
        } else {
          setModalAddOns([])
        }
      } catch (error) {
        console.error('Error fetching add-ons:', error)
        setModalAddOns([])
      }
    } else {
      setModalAddOns([])
    }

    // Close cart modal manually without resetting editingCartIndex
    setCartModalAnimating(false)
    setTimeout(() => {
      setIsCartModalOpen(false)
    }, 200)

    // Open product modal after cart modal closes
    setTimeout(() => {
      setIsProductModalOpen(true)
      setTimeout(() => setProductModalAnimating(true), 10)
    }, 250)
  }

  // Update cart item after edit
  const updateCartItem = () => {
    if (!selectedProduct || editingCartIndex === null) return

    const selectedAddOns = modalAddOns.filter(a => a.selected).map(a => ({ name: a.name, price: a.price }))
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
    const totalPrice = (selectedProduct.price + addOnsTotal) * modalQuantity

    const updatedItem: CartItem = {
      product: selectedProduct,
      quantity: modalQuantity,
      variant: selectedProduct.has_variants ? modalVariant : null,
      addOns: selectedAddOns,
      totalPrice
    }

    const newCart = [...cart]
    newCart[editingCartIndex] = updatedItem
    setCart(newCart)
    setEditingCartIndex(null)
    closeProductModal()
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Search and Filter */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4 mb-4 relative z-10">
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk..."
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

          {/* Filter */}
          <div className="relative filter-dropdown-container z-20">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-10 w-10 border-2 rounded-lg flex items-center justify-center transition-all ${
                categoryFilter !== 'all'
                  ? 'bg-white/60 border-blue-500 text-blue-500'
                  : 'bg-white/60 hover:bg-white/80 border-black/10 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-[60] h-full min-h-screen w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFilterOpen(false)
                  }}
                  style={{ height: '100vh', minHeight: '100dvh' }}
                />
                <div className="absolute right-0 mt-2 w-auto min-w-[120px] bg-white rounded-xl border border-gray-200 shadow-xl z-[70] max-h-64 overflow-y-auto animate-slideIn">
                  <div className="p-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat)
                          setIsFilterOpen(false)
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                          categoryFilter === cat
                            ? 'text-blue-500 font-bold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {cat === 'all' ? 'Semua Kategori' : cat}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat produk...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="mt-4 text-sm text-gray-600">Tidak ada produk</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => openProductModal(product)}
              className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3">
                <h3 className="font-semibold text-black text-xs mb-0.5 line-clamp-2 leading-tight">{product.name}</h3>
                {product.category && (
                  <p className="text-[10px] text-gray-500 mb-1.5">{product.category}</p>
                )}
                <p className="text-sm font-bold text-blue-500">{formatPrice(product.price)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Summary - Fixed Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Cart Info - Clickable */}
                <button
                  onClick={openCartModal}
                  className="flex-1 flex flex-col items-start hover:bg-white/30 rounded-xl p-2 -m-2 transition-all"
                >
                  <p className="text-[10px] text-gray-600 font-medium">{cart.length} Pesanan</p>
                  <p className="text-lg font-bold text-black">{formatPrice(grandTotal)}</p>
                </button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={openCartModal}
                    className="px-4 py-2.5 bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    title="Lihat Detail Pesanan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Detail
                  </button>
                  <button
                    onClick={goToPayment}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Bayar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {isProductModalOpen && selectedProduct && (
        <div
          className="fixed inset-0 z-[90] h-screen-dynamic w-full touch-none"
          onClick={closeProductModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Modal Container */}
          <div className="relative flex items-center justify-center min-h-screen-dynamic w-full p-4 overflow-y-auto">
            <div
              className={`w-full max-w-[280px] max-h-[calc(100vh-2rem)] my-8 backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden transform transition-all duration-200 ease-out ${
                productModalAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-3 py-2 border-b border-white/20 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-black">Tambah ke Pesanan</h2>
                  <button
                    onClick={closeProductModal}
                    className="w-5 h-5 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {/* Product Info */}
                <div className="text-center">
                  <h3 className="text-sm font-bold text-black">{selectedProduct.name}</h3>
                  <p className="text-xs text-blue-500 font-semibold mt-0.5">{formatPrice(selectedProduct.price)}</p>
                </div>

                {/* Variant Selection - Only show if product has variants */}
                {selectedProduct.has_variants && (
                  <div>
                    <label className="block text-[10px] font-semibold text-black mb-1">Variant</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalVariant('Ice')}
                        className={`flex-1 h-7 rounded-lg text-[10px] font-semibold transition-all ${
                          modalVariant === 'Ice'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        Ice
                      </button>
                      <button
                        onClick={() => setModalVariant('Hot')}
                        className={`flex-1 h-7 rounded-lg text-[10px] font-semibold transition-all ${
                          modalVariant === 'Hot'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/40 border border-white/30 text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        Hot
                      </button>
                    </div>
                  </div>
                )}

                {/* Add-ons - Only show if product has add-ons */}
                {selectedProduct.has_addons && modalAddOns.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-black mb-1">Add-ons</label>
                    <div className="space-y-1">
                      {modalAddOns.map((addon, index) => (
                        <label
                          key={index}
                          className="flex items-center justify-between p-2 bg-white/40 border border-white/30 rounded-lg cursor-pointer hover:bg-white/60 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={addon.selected}
                              onChange={(e) => {
                                const newAddOns = [...modalAddOns]
                                newAddOns[index].selected = e.target.checked
                                setModalAddOns(newAddOns)
                              }}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-[10px] text-gray-700">{addon.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-600">{addon.price > 0 ? `+${formatPrice(addon.price)}` : 'Free'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-semibold text-black mb-1">Jumlah</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      className="w-8 h-7 bg-white/40 border border-white/30 rounded-lg text-gray-700 font-bold hover:bg-white/60 transition-all"
                    >
                      -
                    </button>
                    <div className="flex-1 h-7 bg-white/40 border border-white/30 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-black">{modalQuantity}</span>
                    </div>
                    <button
                      onClick={() => setModalQuantity(modalQuantity + 1)}
                      className="w-8 h-7 bg-white/40 border border-white/30 rounded-lg text-gray-700 font-bold hover:bg-white/60 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-3 pb-3 pt-2 border-t border-white/20 flex-shrink-0 flex gap-1.5">
                <button
                  onClick={closeProductModal}
                  className="flex-1 h-7 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={addToCart}
                  className="flex-1 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  {editingCartIndex !== null ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Detail Modal */}
      {isCartModalOpen && (
        <div
          className="fixed inset-0 z-[90] h-screen-dynamic w-full touch-none"
          onClick={closeCartModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Modal Container */}
          <div className="relative flex items-center justify-center min-h-screen-dynamic w-full p-4 overflow-y-auto">
            <div
              className={`backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl w-full max-w-lg my-8 flex flex-col max-h-[85vh] transform transition-all duration-200 ease-out ${
                cartModalAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 py-3 border-b border-white/20 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-black">Detail Pesanan</h2>
                    <p className="text-[10px] text-gray-600 mt-0.5">{cart.length} item · Total {formatPrice(grandTotal)}</p>
                  </div>
                  <button
                    onClick={closeCartModal}
                    className="w-7 h-7 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body - Cart Items */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white/40 border border-white/30 rounded-xl p-3 hover:bg-white/50 transition-all"
                  >
                    <div className="flex gap-3">
                      {/* Item Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-black line-clamp-1">{item.product.name}</h3>
                        <div className="mt-1 space-y-0.5">
                          {item.variant && (
                            <p className="text-[10px] text-gray-600">
                              <span className="font-semibold">Variant:</span> {item.variant}
                            </p>
                          )}
                          {item.addOns.length > 0 && (
                            <p className="text-[10px] text-gray-600">
                              <span className="font-semibold">Add-ons:</span> {item.addOns.map(a => a.name).join(', ')}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600">
                            <span className="font-semibold">Jumlah:</span> {item.quantity}x
                          </p>
                        </div>
                        <p className="text-xs font-bold text-blue-500 mt-1.5">{formatPrice(item.totalPrice)}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditCartItem(index)}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center transition-all"
                          title="Edit item"
                        >
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="w-7 h-7 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-center transition-all"
                          title="Hapus item"
                        >
                          <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-3 border-t border-white/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-700">Total Pembayaran</span>
                  <span className="text-lg font-bold text-black">{formatPrice(grandTotal)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeCartModal}
                    className="flex-1 h-9 bg-white/60 hover:bg-white/80 border border-white/30 rounded-xl text-xs font-semibold text-gray-700 transition-all"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      closeCartModal()
                      goToPayment()
                    }}
                    className="flex-1 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Lanjut Bayar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
