import { useEffect, useRef, useState } from 'react'
import AdminDashboard from './components/AdminDashboard.jsx'
import AccountPanel from './components/AccountPanel.jsx'
import AuthPanel from './components/AuthPanel.jsx'
import CartPanel from './components/CartPanel.jsx'
import CouponManagementPanel from './components/CouponManagementPanel.jsx'
import InventoryPanel from './components/InventoryPanel.jsx'
import ProductCatalog from './components/ProductCatalog.jsx'
import ReviewPanel from './components/ReviewPanel.jsx'
import WishlistPanel from './components/WishlistPanel.jsx'
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

const emptyReviewForm = {
  rating: '5',
  comment: '',
}

const emptyCartCouponForm = {
  code: '',
}

const emptyAdminCouponForm = {
  code: '',
  discount_percent: '10',
  expiry_date: '',
  is_active: true,
}

function App() {
  // Main data from the backend.
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    discount_amount: 0,
    total: 0,
    coupon: null,
  })
  const [wishlistItems, setWishlistItems] = useState([])
  const [reviews, setReviews] = useState([])
  const [coupons, setCoupons] = useState([])
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [reviewForm, setReviewForm] = useState(emptyReviewForm)
  const [cartCouponForm, setCartCouponForm] = useState(emptyCartCouponForm)
  const [adminCouponForm, setAdminCouponForm] = useState(emptyAdminCouponForm)
  const [cartCouponMessage, setCartCouponMessage] = useState('')
  const [authMode, setAuthMode] = useState('login')
  // Save token so refresh keeps login.
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') ?? '')
  const [currentUser, setCurrentUser] = useState(null)
  const [adminCarts, setAdminCarts] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [adminCoupons, setAdminCoupons] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [activeReviewProduct, setActiveReviewProduct] = useState(null)
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard')
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editingCouponId, setEditingCouponId] = useState(null)
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
    const shouldLockScroll =
      isCartOpen || isAccountOpen || isAdminOpen || isWishlistOpen || isReviewOpen
    document.body.classList.toggle('overlay-open', shouldLockScroll)

    return () => {
      document.body.classList.remove('overlay-open')
    }
  }, [isAccountOpen, isAdminOpen, isCartOpen, isWishlistOpen, isReviewOpen])

  useEffect(() => {
    // Keep role-specific panels closed when the role no longer allows them.
    if (!currentUser) {
      setIsCartOpen(false)
      setIsAdminOpen(false)
      setIsWishlistOpen(false)
      setIsReviewOpen(false)
      setActiveAdminTab('dashboard')
      return
    }

    if (currentUser.role !== 'customer') {
      setIsCartOpen(false)
      setIsWishlistOpen(false)
      setIsReviewOpen(false)
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
        await loadAdminCoupons(token)
      }
      if (user.role === 'super_admin') {
        await loadAdminUsers(token)
      }
      if (user.role === 'customer') {
        await loadWishlist(token, user)
      }
    } catch {
      setAuthToken('')
      setCurrentUser(null)
      setCartItems([])
      setCartSummary({
        subtotal: 0,
        discount_amount: 0,
        total: 0,
        coupon: null,
      })
      setWishlistItems([])
      setAdminCarts([])
      setAdminUsers([])
      setAdminCoupons([])
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
      await loadCoupons()

      // Anyone can see products, but only customers have carts.
      if (!cartToken) {
        setCartItems([])
        setCartSummary({
          subtotal: 0,
          discount_amount: 0,
          total: 0,
          coupon: null,
        })
        setWishlistItems([])
        return
      }

      if (!cartUser) {
        return
      }

      if (cartUser.role !== 'customer') {
        setCartItems([])
        setCartSummary({
          subtotal: 0,
          discount_amount: 0,
          total: 0,
          coupon: null,
        })
        setWishlistItems([])
        return
      }

      try {
        const cartData = await request('/cart', { authToken: cartToken })
        setCartItems(cartData)
        const summaryData = await request('/cart/summary', { authToken: cartToken })
        setCartSummary(summaryData)
      } catch (cartErr) {
        if (cartErr.message.toLowerCase().includes('authentication token')) {
          setAuthToken('')
          setCurrentUser(null)
          setCartItems([])
          setWishlistItems([])
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

  async function loadWishlist(tokenOverride = authToken, userOverride = currentUser) {
    const wishlistToken = typeof tokenOverride === 'string' ? tokenOverride : authToken
    const wishlistUser = userOverride ?? currentUser
    if (!wishlistToken || wishlistUser?.role !== 'customer') {
      setWishlistItems([])
      return
    }

    try {
      setWishlistLoading(true)
      const items = await request('/wishlist', { authToken: wishlistToken })
      setWishlistItems(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setWishlistLoading(false)
    }
  }

  async function loadReviews(productId) {
    if (!productId) {
      setReviews([])
      return
    }

    try {
      setReviewLoading(true)
      const items = await request(`/products/${productId}/reviews`)
      setReviews(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewLoading(false)
    }
  }

  async function loadAdminCoupons(tokenOverride = authToken) {
    const adminToken = typeof tokenOverride === 'string' ? tokenOverride : authToken
    if (!adminToken) {
      setAdminCoupons([])
      return
    }

    try {
      setCouponLoading(true)
      const items = await request('/admin/coupons', { authToken: adminToken })
      setAdminCoupons(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setCouponLoading(false)
    }
  }

  async function loadCoupons() {
    try {
      const items = await request('/coupons')
      setCoupons(items)
    } catch (err) {
      setError(err.message)
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

  function updateReviewForm(event) {
    const { name, value } = event.target
    setReviewForm((current) => ({ ...current, [name]: value }))
  }

  function updateCartCouponForm(event) {
    const { name, value } = event.target
    setCartCouponForm((current) => ({ ...current, [name]: value }))
  }

  function updateAdminCouponForm(event) {
    const { name, type, checked, value } = event.target
    setAdminCouponForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
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

  function resetReviewForm() {
    setReviewForm(emptyReviewForm)
    setEditingReviewId(null)
  }

  function resetAdminCouponForm() {
    setAdminCouponForm(emptyAdminCouponForm)
    setEditingCouponId(null)
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

  function openWishlistPanel() {
    setIsWishlistOpen(true)
    loadWishlist()
  }

  function openReviewPanel(product) {
    setActiveReviewProduct(product)
    setIsReviewOpen(true)
    setEditingReviewId(null)
    setReviewForm(emptyReviewForm)
    loadReviews(product.id)
  }

  function closeAllPanels() {
    setIsCartOpen(false)
    setIsAccountOpen(false)
    setIsAdminOpen(false)
    setIsWishlistOpen(false)
    setIsReviewOpen(false)
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
    setReviewForm(emptyReviewForm)
    setCartCouponForm(emptyCartCouponForm)
    setCartCouponMessage('')
    await loadStore(data.access_token, data.user)
    if (data.user.role === 'admin' || data.user.role === 'super_admin') {
      await loadAdminDashboard(data.access_token)
      await loadAdminCoupons(data.access_token)
    }
    if (data.user.role === 'super_admin') {
      await loadAdminUsers(data.access_token)
    }
      if (data.user.role === 'customer') {
      await loadWishlist(data.access_token, data.user)
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
    setCartSummary({
      subtotal: 0,
      discount_amount: 0,
      total: 0,
      coupon: null,
    })
    setWishlistItems([])
    setReviews([])
    setCoupons([])
    setAdminCarts([])
    setAdminUsers([])
    setAdminCoupons([])
    setIsWishlistOpen(false)
    setIsReviewOpen(false)
    setActiveReviewProduct(null)
    setEditingReviewId(null)
    setEditingCouponId(null)
    closeAllPanels()
    setNotice('Logged out.')
    setError('')
    setAuthError('')
    setAuthNotice('')
    setReviewForm(emptyReviewForm)
    setCartCouponForm(emptyCartCouponForm)
    setAdminCouponForm(emptyAdminCouponForm)
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

  async function toggleWishlistItem(productId, isWishlisted) {
    if (!currentUser || currentUser.role !== 'customer') {
      setError('Login as a customer to save wishlist items.')
      return
    }

    try {
      setError('')
      if (isWishlisted) {
        await request(`/wishlist/${productId}`, { method: 'DELETE' })
        setNotice('Removed from wishlist.')
      } else {
        await request(`/wishlist/${productId}`, { method: 'POST' })
        setNotice('Saved to wishlist.')
      }
      await loadWishlist()
    } catch (err) {
      setError(err.message)
    }
  }

  async function addWishlistItemToCart(productId) {
    await addProductToCart(productId)
  }

  async function applyCartCoupon(event) {
    event.preventDefault()
    if (!currentUser || currentUser.role !== 'customer') {
      setCartCouponMessage('Login as a customer to apply coupons.')
      return
    }

    const code = cartCouponForm.code.trim()
    if (!code) {
      setCartCouponMessage('Please enter a coupon code.')
      return
    }

    try {
      setCartCouponMessage('')
      const summary = await request('/cart/apply-coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      setCartSummary(summary)
      setCartCouponMessage(`Coupon ${summary.coupon?.code ?? code} applied.`)
    } catch (err) {
      setCartCouponMessage('Invalid coupon code.')
    }
  }

  async function clearCartCoupon() {
    if (!currentUser || currentUser.role !== 'customer') {
      return
    }

    try {
      setCartCouponMessage('')
      const summary = await request('/cart/apply-coupon', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
      })
      setCartSummary(summary)
    } catch {
      // Ignore invalid clear attempts and reset locally.
    }

    setCartCouponForm(emptyCartCouponForm)
    setCartSummary((current) => ({ ...current, discount_amount: 0, total: current.subtotal, coupon: null }))
    setCartCouponMessage('Coupon cleared.')
  }

  function startEditReview(review) {
    setEditingReviewId(review.id)
    setReviewForm({
      rating: String(review.rating),
      comment: review.comment,
    })
  }

  async function submitReview(event) {
    event.preventDefault()
    if (!currentUser || currentUser.role !== 'customer' || !activeReviewProduct) {
      setError('Open a product review as a logged-in customer.')
      return
    }

    const payload = {
      product_id: activeReviewProduct.id,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment.trim(),
    }

    if (Number.isNaN(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      setError('Rating must be between 1 and 5.')
      return
    }

    try {
      setError('')
      if (editingReviewId) {
        await request(`/reviews/${editingReviewId}`, {
          method: 'PUT',
          body: JSON.stringify({
            rating: payload.rating,
            comment: payload.comment,
          }),
        })
        setNotice('Review updated.')
      } else {
        await request(`/products/${activeReviewProduct.id}/reviews`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setNotice('Review posted.')
      }

      setEditingReviewId(null)
      setReviewForm(emptyReviewForm)
      await loadReviews(activeReviewProduct.id)
      await loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteReviewById(reviewId) {
    try {
      setError('')
      await request(`/reviews/${reviewId}`, { method: 'DELETE' })
      setNotice('Review deleted.')
      if (activeReviewProduct) {
        await loadReviews(activeReviewProduct.id)
        await loadStore()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function submitAdminCoupon(event) {
    event.preventDefault()

    const payload = {
      code: adminCouponForm.code.trim(),
      discount_percent: Number(adminCouponForm.discount_percent),
      is_active: Boolean(adminCouponForm.is_active),
      expiry_date: adminCouponForm.expiry_date ? new Date(adminCouponForm.expiry_date).toISOString() : null,
    }

    if (!payload.code || Number.isNaN(payload.discount_percent)) {
      setError('Enter a coupon code and discount percent.')
      return
    }

    try {
      setError('')
      if (editingCouponId) {
        await request(`/admin/coupons/${editingCouponId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setNotice('Coupon updated.')
      } else {
        await request('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setNotice('Coupon created.')
      }
      resetAdminCouponForm()
      await loadAdminCoupons()
      await loadCoupons()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEditAdminCoupon(coupon) {
    setEditingCouponId(coupon.id)
    setAdminCouponForm({
      code: coupon.code,
      discount_percent: String(coupon.discount_percent),
      expiry_date: coupon.expiry_date ? coupon.expiry_date.slice(0, 16) : '',
      is_active: coupon.is_active,
    })
  }

  async function deleteAdminCoupon(couponId) {
    try {
      setError('')
      await request(`/admin/coupons/${couponId}`, { method: 'DELETE' })
      setNotice('Coupon deleted.')
      await loadAdminCoupons()
      await loadCoupons()
    } catch (err) {
      setError(err.message)
    }
  }

  const cartTotal = cartItems.reduce((total, item) => total + item.subtotal, 0)
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const canUseCart = currentUser?.role === 'customer'
  const canUseWishlist = currentUser?.role === 'customer'
  const showCartButton = !currentUser || canUseCart
  const wishlistProductIds = wishlistItems.map((item) => item.product_id)
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
          {canUseWishlist && (
            <button className="ghost-button" onClick={openWishlistPanel} type="button">
              Wishlist ({wishlistItems.length})
            </button>
          )}
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
          onOpenReviews={openReviewPanel}
          onToggleWishlist={toggleWishlistItem}
          products={products}
          searchTerm={searchTerm}
          canUseWishlist={canUseWishlist}
          wishlistProductIds={wishlistProductIds}
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
              cartSummary={cartSummary}
              couponForm={cartCouponForm}
              couponMessage={cartCouponMessage}
              onApplyCoupon={applyCartCoupon}
              onClearCoupon={clearCartCoupon}
              onCouponFormChange={updateCartCouponForm}
              onChangeCartQuantity={changeCartQuantity}
              onRemoveCartItem={removeCartItem}
              totalItems={totalItems}
            />
          </aside>
        </div>
      )}

      {canUseWishlist && isWishlistOpen && (
        <div className="overlay-layer" role="presentation">
          <button
            aria-label="Close wishlist panel"
            className="overlay-backdrop"
            onClick={() => setIsWishlistOpen(false)}
            type="button"
          />
          <aside className="overlay-shell overlay-shell--drawer" role="dialog" aria-modal="true">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Wishlist</p>
                <h2>Saved products</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsWishlistOpen(false)} type="button">
                Close
              </button>
            </div>
            <WishlistPanel
              items={wishlistItems}
              loading={wishlistLoading}
              onAddToCart={addWishlistItemToCart}
              onRefresh={() => loadWishlist()}
              onRemoveItem={(productId) => toggleWishlistItem(productId, true)}
            />
          </aside>
        </div>
      )}

      {isReviewOpen && activeReviewProduct && (
        <div className="overlay-layer" role="presentation">
          <button
            aria-label="Close review panel"
            className="overlay-backdrop"
            onClick={() => setIsReviewOpen(false)}
            type="button"
          />
          <aside className="overlay-shell overlay-shell--drawer" role="dialog" aria-modal="true">
            <div className="overlay-head">
              <div>
                <p className="eyebrow">Product reviews</p>
                <h2>{activeReviewProduct.name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsReviewOpen(false)} type="button">
                Close
              </button>
            </div>
            <ReviewPanel
              currentUser={currentUser}
              editingReviewId={editingReviewId}
              loading={reviewLoading}
              onCancelEdit={resetReviewForm}
              onDeleteReview={deleteReviewById}
              onEditReview={startEditReview}
              onFormChange={updateReviewForm}
              onRefresh={() => loadReviews(activeReviewProduct.id)}
              onSubmit={submitReview}
              product={activeReviewProduct}
              reviewForm={reviewForm}
              reviews={reviews}
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
              <button
                aria-selected={activeAdminTab === 'coupons'}
                className={`tab-button ${activeAdminTab === 'coupons' ? 'active' : ''}`}
                onClick={() => setActiveAdminTab('coupons')}
                role="tab"
                type="button"
              >
                Coupons
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

              {activeAdminTab === 'coupons' && (
                <CouponManagementPanel
                  coupons={adminCoupons}
                  couponForm={adminCouponForm}
                  editingCouponId={editingCouponId}
                  loading={couponLoading}
                  onCancelEdit={resetAdminCouponForm}
                  onCouponFormChange={updateAdminCouponForm}
                  onDeleteCoupon={deleteAdminCoupon}
                  onEditCoupon={startEditAdminCoupon}
                  onRefresh={() => loadAdminCoupons()}
                  onSubmit={submitAdminCoupon}
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
