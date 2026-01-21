import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  name: string
  price: number
  category: string
  recipe: string | null
  image_url: string
  created_at: string
}

interface ProductsProps {
  userRole: string
}

export default function Products({ userRole }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryInput, setEditCategoryInput] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAnimating, setModalAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailModalAnimating, setDetailModalAnimating] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Get unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]
  const categoryOptions = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    recipe: '',
    image: null as File | null
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error' | 'warning'
    message: string
  }>({ show: false, type: 'success', message: '' })

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    message: string
    onConfirm: () => void
  }>({ show: false, message: '', onConfirm: () => {} })
  const [confirmAnimating, setConfirmAnimating] = useState(false)

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message })
    setTimeout(() => {
      setNotification({ show: false, type, message: '' })
    }, 3000)
  }

  // Show confirmation dialog
  const showConfirmDialog = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ show: true, message, onConfirm })
    setTimeout(() => setConfirmAnimating(true), 10)
  }

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmAnimating(false)
    setTimeout(() => {
      setConfirmDialog({ show: false, message: '', onConfirm: () => {} })
    }, 200)
  }

  // Fetch products
  useEffect(() => {
    fetchProducts()
  }, [])

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

  // Disable body scroll when modal or confirm dialog is open
  useEffect(() => {
    if (isModalOpen || confirmDialog.show || isDetailModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen, confirmDialog.show, isDetailModalOpen])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Helper to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Custom validation
    if (!formData.name.trim()) {
      showNotification('warning', 'Nama produk harus diisi')
      return
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      showNotification('warning', 'Harga produk harus diisi dengan angka yang valid')
      return
    }

    if (!formData.category.trim()) {
      showNotification('warning', 'Kategori harus diisi')
      return
    }

    if (userRole !== 'admin') {
      showNotification('warning', 'Hanya admin yang dapat mengelola produk')
      return
    }

    setIsSubmitting(true)
    try {
      // Capitalize name and category
      const capitalizedName = capitalizeWords(formData.name.trim())
      const capitalizedCategory = capitalizeWords(formData.category.trim())

      // Check if product name already exists (case insensitive)
      const existingProduct = products.find(p =>
        p.name.toLowerCase() === capitalizedName.toLowerCase() &&
        p.id !== editingProduct?.id
      )

      if (existingProduct) {
        showNotification('warning', 'Nama produk sudah ada, silakan gunakan nama lain')
        setIsSubmitting(false)
        return
      }

      let imageUrl = ''

      // Check if we're editing and user removed the image (imagePreview is null but product had image)
      if (editingProduct && !imagePreview && !formData.image) {
        // User removed the image, set to empty string
        imageUrl = ''
      } else if (editingProduct && !formData.image) {
        // No new image selected, keep existing image
        imageUrl = editingProduct.image_url || ''
      }

      // Upload image if new image selected
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.image)

        if (uploadError) {
          console.error('Upload error:', uploadError)

          // Handle specific error cases
          if (uploadError.message.includes('Bucket not found')) {
            showNotification('error', 'Storage bucket belum dibuat. Baca file QUICK-SETUP.md untuk instruksi.')
            setIsSubmitting(false)
            return
          } else if (uploadError.message.includes('new row violates row-level security') || uploadError.message.includes('permission denied')) {
            showNotification('error', 'Error: Policy salah! Baca file FIX-UPLOAD-ERROR.md untuk solusi cepat.')
            setIsSubmitting(false)
            return
          } else {
            showNotification('error', `Gagal upload: ${uploadError.message}`)
            setIsSubmitting(false)
            return
          }
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      if (editingProduct) {
        // Update product
        const { error } = await supabase
          .from('products')
          .update({
            name: capitalizedName,
            price: parseFloat(formData.price),
            category: capitalizedCategory,
            recipe: formData.recipe.trim() || null,
            image_url: imageUrl
          })
          .eq('id', editingProduct.id)

        if (error) {
          console.error('Update error:', error)
          throw new Error(`Gagal update produk: ${error.message}`)
        }
        showNotification('success', `${capitalizedName} berhasil diupdate`)
      } else {
        // Create product
        const { error } = await supabase
          .from('products')
          .insert({
            name: capitalizedName,
            price: parseFloat(formData.price),
            category: capitalizedCategory,
            recipe: formData.recipe.trim() || null,
            image_url: imageUrl
          })

        if (error) {
          console.error('Insert error:', error)
          throw new Error(`Gagal tambah produk: ${error.message}`)
        }
        showNotification('success', `${capitalizedName} berhasil ditambahkan`)
      }

      await fetchProducts()
      closeModal()
    } catch (error: any) {
      console.error('Error saving product:', error)
      showNotification('error', error.message || 'Gagal menyimpan produk')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') {
      showNotification('warning', 'Hanya admin yang dapat menghapus produk')
      return
    }

    // Get product name before deleting
    const product = products.find(p => p.id === id)
    const productName = product?.name || 'Produk'

    showConfirmDialog(`Yakin ingin menghapus ${productName}?`, async () => {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Delete error:', error)
          throw new Error(`Gagal hapus produk: ${error.message}`)
        }

        showNotification('success', `${productName} berhasil dihapus`)
        await fetchProducts()
      } catch (error: any) {
        console.error('Error deleting product:', error)
        showNotification('error', error.message || 'Gagal menghapus produk')
      } finally {
        closeConfirmDialog()
      }
    })
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({ name: '', price: '', category: '', recipe: '', image: null })
    setImagePreview(null)
    setIsModalOpen(true)
    setTimeout(() => setModalAnimating(true), 10)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category || '',
      recipe: product.recipe || '',
      image: null
    })
    setImagePreview(product.image_url)
    setIsModalOpen(true)
    setTimeout(() => setModalAnimating(true), 10)
  }

  const closeModal = () => {
    setModalAnimating(false)
    setTimeout(() => {
      setIsModalOpen(false)
      setEditingProduct(null)
      setFormData({ name: '', price: '', category: '', recipe: '', image: null })
      setImagePreview(null)
      setIsCategoryDropdownOpen(false)
      setIsAddingNewCategory(false)
      setNewCategoryInput('')
      setEditingCategory(null)
      setEditCategoryInput('')
    }, 200)
  }

  const handleSaveNewCategory = () => {
    if (newCategoryInput.trim()) {
      const capitalizedCategory = capitalizeWords(newCategoryInput.trim())
      setFormData({ ...formData, category: capitalizedCategory })
      setNewCategoryInput('')
      setIsAddingNewCategory(false)
      setIsCategoryDropdownOpen(false)
    }
  }

  const handleEditCategory = (category: string) => {
    setEditingCategory(category)
    setEditCategoryInput(category)
  }

  const handleSaveEditCategory = async () => {
    if (!editCategoryInput.trim() || !editingCategory) return

    const capitalizedCategory = capitalizeWords(editCategoryInput.trim())

    // Check if new category name already exists (case insensitive)
    const existingCategory = categoryOptions.find(
      cat => cat.toLowerCase() === capitalizedCategory.toLowerCase() && cat !== editingCategory
    )

    if (existingCategory) {
      showNotification('warning', 'Kategori dengan nama tersebut sudah ada')
      return
    }

    try {
      // Update all products with old category to new category in database
      const { error } = await supabase
        .from('products')
        .update({ category: capitalizedCategory })
        .eq('category', editingCategory)

      if (error) throw error

      // If this was the selected category, update it in form
      if (formData.category === editingCategory) {
        setFormData({ ...formData, category: capitalizedCategory })
      }

      // Refresh products from database
      await fetchProducts()

      showNotification('success', 'Kategori berhasil diubah')
      setEditingCategory(null)
      setEditCategoryInput('')
    } catch (error) {
      console.error('Error updating category:', error)
      showNotification('error', 'Gagal mengubah kategori')
    }
  }

  const handleRemoveCategory = async (category: string) => {
    showConfirmDialog(
      `Yakin ingin menghapus kategori "${category}"? Semua produk dengan kategori ini akan dikosongkan kategorinya.`,
      async () => {
        try {
          // Remove category from all products in database (set to empty string)
          const { error } = await supabase
            .from('products')
            .update({ category: '' })
            .eq('category', category)

          if (error) throw error

          // If this was the selected category, clear it
          if (formData.category === category) {
            setFormData({ ...formData, category: '' })
          }

          // Refresh products from database
          await fetchProducts()

          showNotification('success', 'Kategori berhasil dihapus')
          closeConfirmDialog()
        } catch (error) {
          console.error('Error removing category:', error)
          showNotification('error', 'Gagal menghapus kategori')
          closeConfirmDialog()
        }
      }
    )
  }

  const handleClearCategory = () => {
    setFormData({ ...formData, category: '' })
  }

  const openDetailModal = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
    setTimeout(() => setDetailModalAnimating(true), 10)
  }

  const closeDetailModal = () => {
    setDetailModalAnimating(false)
    setTimeout(() => {
      setIsDetailModalOpen(false)
      setSelectedProduct(null)
    }, 200)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Search and Filter Bar */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4 relative z-10">
        <div className="flex gap-3">
          {/* Search with X button */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-10 bg-white/60 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Icon with Dropdown */}
          <div className="relative filter-dropdown-container">
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

            {/* Dropdown with smooth animation */}
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
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-[70] max-h-64 overflow-y-auto animate-slideIn">
                  <div className="p-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat)
                          setIsFilterOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
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

          {/* Add Button - Only for admin */}
          {userRole === 'admin' && (
            <button
              onClick={openAddModal}
              className="h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Tambah Produk"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
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
              className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Product Image - Clickable */}
              <div
                className="aspect-square bg-gray-100 relative cursor-pointer"
                onClick={() => openDetailModal(product)}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-2">
                {/* Clickable Info Area */}
                <div
                  className="cursor-pointer mb-1.5"
                  onClick={() => openDetailModal(product)}
                >
                  <h3 className="font-semibold text-black text-xs mb-0.5 line-clamp-2 leading-tight">{product.name}</h3>
                  {product.category && (
                    <p className="text-[9px] text-gray-500 mb-1">{product.category}</p>
                  )}
                  <p className="text-blue-500 font-bold text-xs">{formatPrice(product.price)}</p>
                </div>

                {/* Actions - Only for admin */}
                {userRole === 'admin' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 h-6 bg-white/60 hover:bg-white/80 border border-black/10 rounded-lg text-[10px] font-medium text-gray-700 transition-all hover:scale-105 active:scale-95"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 h-6 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] font-medium text-red-600 transition-all hover:scale-105 active:scale-95"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[80] h-screen-dynamic w-full touch-none"
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Modal Container */}
          <div className="relative flex items-center justify-center min-h-screen-dynamic w-full p-4 overflow-y-auto">
            <div
              className={`backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl w-full max-w-[320px] max-h-[calc(100vh-2rem)] my-8 flex flex-col overflow-hidden transform transition-all duration-200 ease-out ${
                modalAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header */}
            <div className="px-3 py-2 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black">
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                </h2>
                <button
                  onClick={closeModal}
                  className="w-5 h-5 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-semibold text-black mb-1">
                  Nama <span className="text-red-500 text-[9px]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-7 px-3 bg-white/40 border border-white/30 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Masukkan nama produk"
                />
              </div>

              {/* Product Price */}
              <div>
                <label className="block text-[10px] font-semibold text-black mb-1">
                  Harga <span className="text-red-500 text-[9px]">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setFormData({ ...formData, price: value })
                  }}
                  className="w-full h-7 px-3 bg-white/40 border border-white/30 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Masukkan harga produk"
                />
              </div>

              {/* Product Category */}
              <div className="relative">
                <label className="block text-[10px] font-semibold text-black mb-1">
                  Kategori <span className="text-red-500 text-[9px]">*</span>
                </label>

                {/* Category Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full h-7 px-3 bg-white/40 border border-white/30 rounded-lg text-[10px] text-left flex items-center justify-between focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <span className={formData.category ? 'text-black' : 'text-gray-400'}> 
                      {formData.category || 'Pilih atau tambah kategori'}
                    </span>
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Clear Button */}
                  {formData.category && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearCategory()
                      }}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"
                      title="Hapus kategori"
                    >
                      <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                {isCategoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => {
                        setIsCategoryDropdownOpen(false)
                        setIsAddingNewCategory(false)
                        setNewCategoryInput('')
                        setEditingCategory(null)
                        setEditCategoryInput('')
                      }}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-[70] max-h-48 overflow-y-auto animate-slideIn">
                      <div className="p-1.5">
                        {/* Existing Categories */}
                        {categoryOptions.length > 0 && (
                          <>
                            {categoryOptions.map((cat) => (
                              <div key={cat}>
                                {editingCategory === cat ? (
                                  /* Edit Mode */
                                  <div className="p-1.5 space-y-1.5">
                                    <input
                                      type="text"
                                      value={editCategoryInput}
                                      onChange={(e) => setEditCategoryInput(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          handleSaveEditCategory()
                                        }
                                      }}
                                      placeholder="Edit kategori"
                                      className="w-full h-6 px-2 bg-white border border-gray-300 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                      autoFocus
                                    />
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleSaveEditCategory}
                                        className="flex-1 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all"
                                      >
                                        Simpan
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCategory(null)
                                          setEditCategoryInput('')
                                        }}
                                        className="flex-1 h-6 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Normal Display */
                                  <div className="group relative flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, category: cat })
                                        setIsCategoryDropdownOpen(false)
                                        setIsAddingNewCategory(false)
                                      }}
                                      className={`flex-1 text-left px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                                        formData.category === cat
                                          ? 'text-blue-500 font-bold'
                                          : 'text-gray-700 hover:bg-gray-100'
                                      }`}
                                    >
                                      {cat}
                                    </button>

                                    {/* Edit and Delete buttons - always visible */}
                                    <div className="absolute right-1 flex gap-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditCategory(cat)
                                        }}
                                        className="w-5 h-5 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
                                        title="Edit kategori"
                                      >
                                        <svg className="w-2.5 h-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemoveCategory(cat)
                                        }}
                                        className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center transition-colors"
                                        title="Hapus dari daftar"
                                      >
                                        <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="border-t border-gray-200 my-1" />
                          </>
                        )}

                        {/* Add New Category Section */}
                        {!isAddingNewCategory ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCategory(true)}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-blue-500 hover:bg-gray-100 transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Kategori Baru
                          </button>
                        ) : (
                          <div className="p-1.5 space-y-1.5">
                            <input
                              type="text"
                              value={newCategoryInput}
                              onChange={(e) => setNewCategoryInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleSaveNewCategory()
                                }
                              }}
                              placeholder="Nama kategori baru"
                              className="w-full h-6 px-2 bg-white border border-gray-300 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={handleSaveNewCategory}
                                className="flex-1 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingNewCategory(false)
                                  setNewCategoryInput('')
                                }}
                                className="flex-1 h-6 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Product Recipe */}
              <div>
                <label className="block text-[10px] font-semibold text-black mb-1">
                  Resep
                </label>
                <textarea
                  value={formData.recipe}
                  onChange={(e) => setFormData({ ...formData, recipe: e.target.value })}
                  className="w-full h-16 px-3 py-2 bg-white/40 border border-white/30 rounded-lg text-[10px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  rows={3}
                  placeholder="Masukkan resep produk (Opsional)"
                />
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-[10px] font-semibold text-black mb-1">
                  Gambar
                </label>

                {/* Small Image Preview with X */}
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <div className="w-20 h-20 bg-white/20 rounded-lg overflow-hidden border-2 border-white/30">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setFormData({ ...formData, image: null })
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* File Input */}
                {!imagePreview && (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="w-full h-7 px-3 bg-white/40 border border-white/30 rounded-lg text-[10px] flex items-center justify-center cursor-pointer hover:bg-white/60 transition-all">
                      <svg className="w-3 h-3 mr-1.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600 font-medium">Pilih Gambar</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-7 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menyimpan...' : editingProduct ? 'Update' : 'Tambah'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification Pop-up */}
      <div className={`fixed inset-x-0 top-4 flex justify-center z-[100] px-4 transition-all duration-300 ${
        notification.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-4 w-full max-w-md ${
            notification.type === 'success'
              ? 'bg-green-50/90 border-green-200'
              : notification.type === 'error'
              ? 'bg-red-50/90 border-red-200'
              : 'bg-yellow-50/90 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : notification.type === 'error' ? (
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                notification.type === 'success'
                  ? 'text-green-800'
                  : notification.type === 'error'
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}>
                {notification.message}
              </p>
            </div>
          </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div
          className="fixed inset-0 z-[90] h-screen-dynamic w-full touch-none"
          onClick={closeConfirmDialog}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Dialog Container */}
          <div className="relative flex items-center justify-center min-h-screen-dynamic w-full p-4 overflow-y-auto">
            <div
              className={`backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl w-full max-w-[320px] my-8 flex flex-col overflow-hidden transform transition-all duration-200 ease-out ${
                confirmAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Dialog Header */}
            <div className="px-3 py-2 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-black">Konfirmasi</h3>
              </div>
            </div>

            {/* Dialog Body */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <p className="text-[10px] text-gray-700">{confirmDialog.message}</p>
            </div>

            {/* Dialog Actions */}
            <div className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0">
              <button
                onClick={closeConfirmDialog}
                className="flex-1 h-7 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm()
                }}
                className="flex-1 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-semibold transition-all hover:scale-105 active:scale-95"
              >
                Hapus
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {isDetailModalOpen && selectedProduct && (
        <div
          className="fixed inset-0 z-[90] h-screen-dynamic w-full touch-none"
          onClick={closeDetailModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 h-screen-dynamic w-full backdrop-blur-[2px] bg-black/10" />

          {/* Modal Container */}
          <div className="relative flex items-center justify-center min-h-screen-dynamic w-full p-4 overflow-y-auto">
            <div
              className={`w-full max-w-[280px] max-h-[calc(100vh-2rem)] my-8 backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden transform transition-all duration-200 ease-out ${
                detailModalAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header - Fixed */}
            <div className="px-3 py-2 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black">Detail Produk</h2>
                <button
                  onClick={closeDetailModal}
                  className="w-5 h-5 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {/* Product Image */}
              {selectedProduct.image_url && (
                <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Product Name */}
              <div className="text-center">
                <h3 className="text-sm font-bold text-black leading-tight">{selectedProduct.name}</h3>
                {selectedProduct.category && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{selectedProduct.category}</p>
                )}
              </div>

              {/* Product Price */}
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-[9px] text-gray-600">Harga</p>
                <p className="text-base font-bold text-blue-500">{formatPrice(selectedProduct.price)}</p>
              </div>

              {/* Product Recipe */}
              {selectedProduct.recipe && (
                <div>
                  <h4 className="text-[10px] font-semibold text-black mb-1">Resep</h4>
                  <div className="bg-white/40 border border-white/30 rounded-lg p-2">
                    <pre className="text-[10px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedProduct.recipe}
                    </pre>
                  </div>
                </div>
              )}

              {!selectedProduct.recipe && (
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Resep tidak tersedia</p>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at bottom - Admin Actions */}
            {userRole === 'admin' && (
              <div className="px-3 pb-3 pt-2 border-t border-white/20 flex-shrink-0 flex gap-1.5">
                <button
                  onClick={() => {
                    closeDetailModal()
                    openEditModal(selectedProduct)
                  }}
                  className="flex-1 h-7 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all flex items-center justify-center gap-1"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => {
                    closeDetailModal()
                    handleDelete(selectedProduct.id)
                  }}
                  className="flex-1 h-7 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] font-semibold text-red-600 transition-all flex items-center justify-center gap-1"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
