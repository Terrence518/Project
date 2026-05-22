import { useEffect, useRef, useState } from 'react'
import AdminDashboard from './components/AdminDashboard.jsx'
import AccountPanel from './components/AccountPanel.jsx'
import AuthPanel from './components/AuthPanel.jsx'
import CartPanel from './components/CartPanel.jsx'
import InventoryPanel from './components/InventoryPanel.jsx'
import ProductCatalog from './components/ProductCatalog.jsx'
import UserManagementPanel from './components/UserManagementPanel.jsx'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  image_url: '',
}

const emptyAuthForm = {
  username: '',
  email: '',
  password: '',
}

function App() {
  // Main data from the backend.
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [authMode, setAuthMode] = useState('login')
  // Save token so refresh keeps login.
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') ?? '')
  const [currentUser, setCurrentUser] = useState(null)
  const [adminCarts, setAdminCarts] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard')
  const [editingProductId, setEditingProductId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    // Wait a bit before searching.
    const timeoutId = setTimeout(() => {
      loadStore()
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    // Check saved login token.
    if (!authToken) {
      setCurrentUser(null)
      localStorage.removeItem('authToken')
      return
    }

    localStorage.setItem('authToken', authToken)
    loadCurrentUser(authToken)
  }, [authToken])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    // Stop the page behind drawers and modals from scrolling.
    const shouldLockScroll = isCartOpen || isAccountOpen || isAdminOpen
    document.body.classList.toggle('overlay-open', shouldLockScroll)

    return () => {
      document.body.classList.remove('overlay-open')
    }
  }, [isAccountOpen, isAdminOpen, isCartOpen])

  useEffect(() => {
    // Keep role-specific panels closed when the role no longer allows them.
    if (!currentUser) {
      setIsCartOpen(false)
      setIsAdminOpen(false)
      setActiveAdminTab('dashboard')
      return
    }

    if (currentUser.role !== 'customer') {
      setIsCartOpen(false)
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      setIsAdminOpen(false)
      setActiveAdminTab('dashboard')
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.role !== 'super_admin' && activeAdminTab === 'users') {
      setActiveAdminTab('dashboard')
    }
  }, [activeAdminTab, currentUser])

  async function request(path, options = {}) {
    // Helper for calling the backend.
    const token = options.authToken ?? authToken
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    }
    const { authToken: _authToken, ...fetchOptions } = options

    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      ...fetchOptions,
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

  async function loadCurrentUser(token) {
    try {
      // Load user again after refresh.
      const user = await request('/auth/me', { authToken: token })
      setCurrentUser(user)
      await loadStore(token, user)
      if (user.role === 'admin' || user.role === 'super_admin') {
        await loadAdminDashboard(token)
      }
      if (user.role === 'super_admin') {
        await loadAdminUsers(token)
      }
    } catch {
      setAuthToken('')
      setCurrentUser(null)
      setCartItems([])
      setAdminCarts([])
      setAdminUsers([])
    }
  }

  async function loadStore(tokenOverride = authToken, userOverride = currentUser) {
    try {
      setLoading(true)
      setError('')
      const cartToken = typeof tokenOverride === 'string' ? tokenOverride : ''
      const cartUser = userOverride ?? currentUser

      const productPath = searchTerm.trim()
        ? `/products?search=${encodeURIComponent(searchTerm.trim())}`
        : '/products'

      const productData = await request(productPath)
      setProducts(productData)

      // Anyone can see products, but only customers have carts.
      if (!cartToken) {
        setCartItems([])
        return
      }

      if (!cartUser) {
        return
      }

      if (cartUser.role !== 'customer') {
        setCartItems([])
        return
      }

      try {
        const cartData = await request('/cart', { authToken: cartToken })
        setCartItems(cartData)
      } catch (cartErr) {
        if (cartErr.message.toLowerCase().includes('authentication token')) {
          setAuthToken('')
          setCurrentUser(null)
          setCartItems([])
          setNotice('Session expired. Please log in again.')
          return
        }

        throw cartErr
      }
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

  async function loadAdminDashboard(tokenOverride = authToken) {
    // Load data for admin dashboard.
    const adminToken = typeof tokenOverride === 'string' ? tokenOverride : authToken
    if (!adminToken) {
      setAdminCarts([])
      return
    }

    try {
      setAdminLoading(true)
      const carts = await request('/admin/carts', { authToken: adminToken })
      setAdminCarts(carts)
    } catch (err) {
      setError(err.message)
    } finally {
      setAdminLoading(false)
    }
  }

  async function loadAdminUsers(tokenOverride = authToken) {
    // Load user list for super admin.
    const adminToken = typeof tokenOverride === 'string' ? tokenOverride : authToken
    if (!adminToken) {
      setAdminUsers([])
      return
    }

    try {
      setUserLoading(true)
      const users = await request('/admin/users', { authToken: adminToken })
      setAdminUsers(users)
    } catch (err) {
      setError(err.message)
    } finally {
      setUserLoading(false)
    }
  }

  function updateAuthForm(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  function switchAuthMode(mode) {
    setAuthMode(mode)
    setAuthForm(emptyAuthForm)
    setAuthError('')
    setAuthNotice('')
  }

  function updateSearchTerm(event) {
    setSearchTerm(event.target.value)
  }

  function toggleSearch() {
    setIsSearchOpen((current) => !current)
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

  function openAccountPanel() {
    setIsAccountOpen(true)
  }

  function openCartPanel() {
    if (!currentUser) {
      setIsAccountOpen(true)
      setAuthMode('login')
      return
    }

    if (currentUser.role !== 'customer') {
      setIsAdminOpen(true)
      setActiveAdminTab('dashboard')
      return
    }

    setIsCartOpen(true)
  }

  function openAdminWorkspace() {
    setIsAdminOpen(true)
    setActiveAdminTab('dashboard')
  }

  function closeAllPanels() {
    setIsCartOpen(false)
    setIsAccountOpen(false)
    setIsAdminOpen(false)
    setActiveAdminTab('dashboard')
  }

  async function saveAuthSession(data) {
    // Save login and load user data.
    setAuthToken(data.access_token)
    setCurrentUser(data.user)
    setAuthForm(emptyAuthForm)
    setIsAccountOpen(false)
    setAuthError('')
    setNotice('')
    await loadStore(data.access_token, data.user)
    if (data.user.role === 'admin' || data.user.role === 'super_admin') {
      await loadAdminDashboard(data.access_token)
    }
    if (data.user.role === 'super_admin') {
      await loadAdminUsers(data.access_token)
    }
  }

  async function registerUser(event) {
    event.preventDefault()

    const payload = {
      username: authForm.username.trim(),
      email: authForm.email.trim(),
      password: authForm.password,
    }

    if (!payload.username || !payload.email || payload.password.length < 6) {
      setError('Enter a username, email, and password with at least 6 characters.')
      return
    }

    if (payload.password.length > 72) {
      setAuthError('Password must be 72 characters or fewer.')
      return
    }

    try {
      setAuthError('')
      setAuthNotice('')
      // Register, then login.
      await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const loginData = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: payload.username,
          password: payload.password,
        }),
      })
      await saveAuthSession(loginData)
      setNotice('Logged in.')
      setAuthNotice('Account created and logged in.')
    } catch (err) {
      setAuthError(err.message)
    }
  }

  async function loginUser(event) {
    event.preventDefault()

    const payload = {
      username: authForm.username.trim(),
      password: authForm.password,
    }

    if (!payload.username || !payload.password) {
      setAuthError('Enter your username and password.')
      return
    }

    try {
      setAuthError('')
      setAuthNotice('')
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await saveAuthSession(data)
      setNotice('Logged in.')
      setAuthNotice('Logged in.')
    } catch (err) {
      setAuthError(err.message)
    }
  }

  function logoutUser() {
    setAuthToken('')
    setCurrentUser(null)
    setCartItems([])
    setAdminCarts([])
    setAdminUsers([])
    closeAllPanels()
    setNotice('Logged out.')
    setError('')
    setAuthError('')
    setAuthNotice('')
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
      image_url: product.image_url ?? '',
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
      image_url: productForm.image_url.trim(),
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
      if (isAdmin) {
        await loadAdminDashboard()
      }
      if (isSuperAdmin) {
        await loadAdminUsers()
      }
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
      if (isAdmin) {
        await loadAdminDashboard()
      }
      if (isSuperAdmin) {
        await loadAdminUsers()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeUserRole(userId, role) {
    try {
      setError('')
      await request(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      })
      setNotice('User role updated.')
      await loadAdminUsers()
      await loadAdminDashboard()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteAdminUser(userId) {
    try {
      setError('')
      await request(`/admin/users/${userId}`, { method: 'DELETE' })
      setNotice('User deleted.')
      await loadAdminUsers()
      await loadAdminDashboard()
    } catch (err) {
      setError(err.message)
    }
  }

  async function addProductToCart(productId) {
    // Need login before adding to cart.
    if (!currentUser) {
      setError('Login before adding products to your cart.')
      return
    }

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
    if (!currentUser) {
      setError('Login before changing cart items.')
      return
    }

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
    if (!currentUser) {
      setError('Login before removing cart items.')
      return
    }

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
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const canUseCart = currentUser?.role === 'customer'
  const showCartButton = !currentUser || canUseCart
  const adminCartValue = adminCarts.reduce((total, cart) => total + cart.total_price, 0)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">St Leonards</span>
          <strong>Tech Store</strong>
        </div>

        <div className="topbar-search">
          {isSearchOpen && (
            <input
              className="search-input search-input--topbar"
              onBlur={handleSearchBlur}
              onChange={updateSearchTerm}
              placeholder="Search products"
              ref={searchInputRef}
              type="search"
              value={searchTerm}
            />
          )}
          <button className="ghost-button" onClick={toggleSearch} type="button">
            {isSearchOpen ? 'Close search' : 'Search'}
          </button>
        </div>

        <div className="topbar-actions">
          {showCartButton && (
            <button className="ghost-button" onClick={openCartPanel} type="button">
              Cart{canUseCart ? ` (${totalItems})` : ''}
            </button>
          )}
          <button className="ghost-button" onClick={openAccountPanel} type="button">
            {currentUser ? 'Account' : 'Login'}
          </button>
          {isAdmin && (
            <button className="ghost-button" onClick={openAdminWorkspace} type="button">
              Admin
            </button>
          )}
        </div>
      </header>

      {(error || notice) && (
        <section className="message-strip">
          {error && <p className="message error">{error}</p>}
          {notice && <p className="message notice">{notice}</p>}
        </section>
      )}

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Curated commerce</p>
          <h1>Practical tech for everyday setups.</h1>
          <p className="hero-text">
            Browse the catalog first, then slide open your cart, account, or
            admin tools only when you need them.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Products</span>
            <strong>{products.length}</strong>
          </div>
          {isAdmin ? (
            <>
              <div className="stat-card">
                <span className="stat-label">Customers</span>
                <strong>{adminCarts.length}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Cart value</span>
                <strong>${adminCartValue.toFixed(2)}</strong>
              </div>
            </>
          ) : canUseCart ? (
            <>
              <div className="stat-card">
                <span className="stat-label">Cart items</span>
                <strong>{totalItems}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Cart total</span>
                <strong>${cartTotal.toFixed(2)}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <span className="stat-label">Account</span>
                <strong>Login</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Access</span>
                <strong>Shop</strong>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="content-grid">
        <ProductCatalog
          getCartQuantityForProduct={getCartQuantityForProduct}
          canUseCart={canUseCart}
          isAdmin={isAdmin}
          isLoggedIn={Boolean(currentUser)}
          loading={loading}
          onAddToCart={addProductToCart}
          onEditProduct={startEditProduct}
          onRefresh={() => loadStore()}
          onRemoveProduct={removeProduct}
          products={products}
          searchTerm={searchTerm}
        />
      </section>

      {isAccountOpen && (
        <div className="overlay-layer" role="presentation">
          <button
            aria-label="Close account panel"
            className="overlay-backdrop"
            onClick={() => setIsAccountOpen(false)}
            type="button"
          />
          <aside className="overlay-shell overlay-shell--drawer" role="dialog" aria-modal="true">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Account</p>
                <h2>{currentUser ? 'Your profile' : 'Login or register'}</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsAccountOpen(false)} type="button">
                Close
              </button>
            </div>
            {currentUser ? (
              <AccountPanel currentUser={currentUser} onLogout={logoutUser} />
            ) : (
              <AuthPanel
                authForm={authForm}
                authMode={authMode}
                error={authError}
                notice={authNotice}
                onAuthFormChange={updateAuthForm}
                onAuthModeChange={switchAuthMode}
                onLogin={loginUser}
                onRegister={registerUser}
              />
            )}
          </aside>
        </div>
      )}

      {canUseCart && isCartOpen && (
        <div className="overlay-layer" role="presentation">
          <button
            aria-label="Close cart panel"
            className="overlay-backdrop"
            onClick={() => setIsCartOpen(false)}
            type="button"
          />
          <aside className="overlay-shell overlay-shell--drawer" role="dialog" aria-modal="true">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Shopping cart</p>
                <h2>Your items</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsCartOpen(false)} type="button">
                Close
              </button>
            </div>
            <CartPanel
              cartItems={cartItems}
              cartTotal={cartTotal}
              onChangeCartQuantity={changeCartQuantity}
              onRemoveCartItem={removeCartItem}
              totalItems={totalItems}
            />
          </aside>
        </div>
      )}

      {isAdminOpen && (
        <div className="overlay-layer overlay-layer--admin" role="presentation">
          <button
            aria-label="Close admin workspace"
            className="overlay-backdrop"
            onClick={() => setIsAdminOpen(false)}
            type="button"
          />
          <section className="overlay-shell overlay-shell--workspace" role="dialog" aria-modal="true">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Admin workspace</p>
                <h2>Operations center</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsAdminOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="workspace-tabs" role="tablist" aria-label="Admin sections">
              <button
                aria-selected={activeAdminTab === 'dashboard'}
                className={`tab-button ${activeAdminTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveAdminTab('dashboard')}
                role="tab"
                type="button"
              >
                Dashboard
              </button>
              <button
                aria-selected={activeAdminTab === 'inventory'}
                className={`tab-button ${activeAdminTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveAdminTab('inventory')}
                role="tab"
                type="button"
              >
                Inventory
              </button>
              {isSuperAdmin && (
                <button
                  aria-selected={activeAdminTab === 'users'}
                  className={`tab-button ${activeAdminTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveAdminTab('users')}
                  role="tab"
                  type="button"
                >
                  Users
                </button>
              )}
            </div>

            <div className="workspace-body" role="tabpanel">
              {activeAdminTab === 'dashboard' && (
                <AdminDashboard
                  carts={adminCarts}
                  loading={adminLoading}
                  onRefresh={() => loadAdminDashboard()}
                />
              )}

              {activeAdminTab === 'inventory' && (
                <InventoryPanel
                  editingProductId={editingProductId}
                  onCancelEdit={resetProductForm}
                  onProductFormChange={updateProductForm}
                  onSubmit={submitProduct}
                  productForm={productForm}
                />
              )}

              {activeAdminTab === 'users' && isSuperAdmin && (
                <UserManagementPanel
                  currentUser={currentUser}
                  loading={userLoading}
                  onDeleteUser={deleteAdminUser}
                  onRefresh={() => loadAdminUsers()}
                  onRoleChange={changeUserRole}
                  users={adminUsers}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
