import { useEffect, useRef, useState } from 'react'
import CartPanel from './components/CartPanel.jsx'
import InventoryPanel from './components/InventoryPanel.jsx'
import ProductCatalog from './components/ProductCatalog.jsx'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
}

function App() {
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editingProductId, setEditingProductId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStore()
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })

    if (!response.ok) {
      let message = 'Something went wrong.'

      try {
        const data = await response.json()
        message = data.detail ?? message
      } catch {
        message = response.statusText || message
      }

      throw new Error(message)
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  }

  async function loadStore() {
    try {
      setLoading(true)
      setError('')

      const productPath = searchTerm.trim()
        ? `/products?search=${encodeURIComponent(searchTerm.trim())}`
        : '/products'

      const [productData, cartData] = await Promise.all([
        request(productPath),
        request('/cart'),
      ])

      setProducts(productData)
      setCartItems(cartData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateProductForm(event) {
    const { name, value } = event.target
    setProductForm((current) => ({ ...current, [name]: value }))
  }

  function updateSearchTerm(event) {
    setSearchTerm(event.target.value)
  }

  function toggleSearch() {
    if (isSearchOpen && !searchTerm.trim()) {
      setIsSearchOpen(false)
      return
    }

    setIsSearchOpen(true)
  }

  function handleSearchBlur() {
    if (!searchTerm.trim()) {
      setIsSearchOpen(false)
    }
  }

  function resetProductForm() {
    setProductForm(emptyProductForm)
    setEditingProductId(null)
  }

  function getCartQuantityForProduct(productId) {
    const cartItem = cartItems.find((item) => item.product_id === productId)
    return cartItem ? cartItem.quantity : 0
  }

  function startEditProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
    })
    setNotice(`Editing "${product.name}"`)
    setError('')
  }

  async function submitProduct(event) {
    event.preventDefault()

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
    }

    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
      setError('Enter a product name, price, and stock before saving.')
      return
    }

    try {
      setError('')

      if (editingProductId) {
        await request(`/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setNotice('Product updated.')
      } else {
        await request('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setNotice('Product created.')
      }

      resetProductForm()
      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeProduct(productId) {
    try {
      setError('')
      await request(`/products/${productId}`, { method: 'DELETE' })
      setNotice('Product deleted.')

      if (editingProductId === productId) {
        resetProductForm()
      }

      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  async function addProductToCart(productId) {
    try {
      setError('')
      await request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      })
      setNotice('Added to cart.')
      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeCartQuantity(cartItemId, quantity) {
    try {
      setError('')
      await request(`/cart/items/${cartItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      })
      setNotice('Cart updated.')
      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeCartItem(cartItemId) {
    try {
      setError('')
      await request(`/cart/items/${cartItemId}`, { method: 'DELETE' })
      setNotice('Item removed from cart.')
      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  const cartTotal = cartItems.reduce((total, item) => total + item.subtotal, 0)
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <h1>St Leonards' Tech Store</h1>
          <p className="hero-text">
            Welcome to St Leonards' Tech Store, your place for practical and
            reliable tech accessories for study, work, and everyday use.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Products</span>
            <strong>{products.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cart items</span>
            <strong>{totalItems}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cart total</span>
            <strong>${cartTotal.toFixed(2)}</strong>
          </div>
        </div>
      </section>

      {(error || notice) && (
        <section className="message-strip">
          {error && <p className="message error">{error}</p>}
          {notice && <p className="message notice">{notice}</p>}
        </section>
      )}

      <section className="content-grid">
        <ProductCatalog
          getCartQuantityForProduct={getCartQuantityForProduct}
          isSearchOpen={isSearchOpen}
          loading={loading}
          onAddToCart={addProductToCart}
          onEditProduct={startEditProduct}
          onRefresh={loadStore}
          onRemoveProduct={removeProduct}
          onSearchBlur={handleSearchBlur}
          onSearchChange={updateSearchTerm}
          onSearchToggle={toggleSearch}
          products={products}
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
        />

        <aside className="side-column">
          <CartPanel
            cartItems={cartItems}
            cartTotal={cartTotal}
            onChangeCartQuantity={changeCartQuantity}
            onRemoveCartItem={removeCartItem}
            totalItems={totalItems}
          />

          <InventoryPanel
            editingProductId={editingProductId}
            onCancelEdit={resetProductForm}
            onProductFormChange={updateProductForm}
            onSubmit={submitProduct}
            productForm={productForm}
          />
        </aside>
      </section>
    </main>
  )
}

export default App
