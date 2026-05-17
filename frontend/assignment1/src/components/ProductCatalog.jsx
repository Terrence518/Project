function ProductCatalog({
  products,
  loading,
  searchTerm,
  isSearchOpen,
  searchInputRef,
  onSearchChange,
  onSearchToggle,
  onSearchBlur,
  onRefresh,
  onAddToCart,
  onEditProduct,
  onRemoveProduct,
  getCartQuantityForProduct,
  canUseCart,
  isAdmin,
  isLoggedIn,
}) {
  return (
    <div className="catalog-panel">
      <div className="section-heading">
        <div>
          <h2>Products</h2>
        </div>
        <div className="toolbar">
          {/* Show search box when user opens it. */}
          {(isSearchOpen || searchTerm.trim()) && (
            <input
              className="search-input"
              onBlur={onSearchBlur}
              onChange={onSearchChange}
              placeholder="Search products"
              ref={searchInputRef}
              type="search"
              value={searchTerm}
            />
          )}
          <button
            aria-label="Search products"
            className="icon-button"
            onClick={onSearchToggle}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10.5 4a6.5 6.5 0 1 0 4.02 11.61l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button className="ghost-button" onClick={onRefresh} type="button">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="empty-state">
          No products found{searchTerm.trim() ? ` for "${searchTerm.trim()}"` : ''}.
        </p>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            // Check stock before allowing add to cart.
            const cartQuantity = getCartQuantityForProduct(product.id)
            const isOutOfStock = product.stock === 0
            const isAtStockLimit = cartQuantity >= product.stock && product.stock > 0

            return (
              <article className="product-card" key={product.id}>
                <div className="product-visual" aria-hidden="true">
                  {product.image_url ? (
                    <img alt="" src={product.image_url} />
                  ) : (
                    <span>{product.name.slice(0, 1)}</span>
                  )}
                </div>

                <div className="product-body">
                  <div className="product-header">
                    <h3>{product.name}</h3>
                    <p className="price">${Number(product.price).toFixed(2)}</p>
                  </div>

                  <p className="description">{product.description}</p>

                  <div className="product-meta">
                    <span>Stock: {product.stock}</span>
                    {cartQuantity > 0 && <span>In cart: {cartQuantity}</span>}
                  </div>

                  <div className="card-actions">
                    {/* Customers buy, admins edit. */}
                    {!isAdmin && (
                      <button
                        className="primary-button"
                        disabled={!canUseCart || isOutOfStock || isAtStockLimit}
                        onClick={() => onAddToCart(product.id)}
                        type="button"
                      >
                        {!isLoggedIn
                          ? 'Login to add'
                          : isOutOfStock
                            ? 'Out of stock'
                            : isAtStockLimit
                              ? 'Max in cart'
                              : 'Add to cart'}
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          className="ghost-button"
                          onClick={() => onEditProduct(product)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => onRemoveProduct(product.id)}
                          type="button"
                        >
                          Delete product
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductCatalog
