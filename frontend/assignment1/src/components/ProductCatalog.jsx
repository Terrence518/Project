function ProductCatalog({
  products,
  loading,
  searchTerm,
  onRefresh,
  onAddToCart,
  onOpenReviews,
  onEditProduct,
  onRemoveProduct,
  onToggleWishlist,
  getCartQuantityForProduct,
  canUseCart,
  canUseWishlist,
  isAdmin,
  isLoggedIn,
  wishlistProductIds = [],
}) {
  return (
    <div className="catalog-panel">
      <div className="section-heading">
        <div>
          <h2>Products</h2>
          <p className="panel-note">
            Browse the catalog here and use the top bar for search, cart, and account actions.
          </p>
        </div>
        <div className="toolbar">
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
            const isWishlisted = wishlistProductIds.includes(product.id)

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
                    <span>
                      Rating: {product.review_count > 0 ? `${product.average_rating} / 5 (${product.review_count})` : 'No reviews yet'}
                    </span>
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
                    {!isAdmin && canUseWishlist && (
                      <button
                        className="ghost-button"
                        onClick={() => onToggleWishlist(product.id, isWishlisted)}
                        type="button"
                      >
                        {isWishlisted ? 'Remove wishlist' : 'Save for later'}
                      </button>
                    )}
                    <button
                      className="ghost-button"
                      onClick={() => onOpenReviews(product)}
                      type="button"
                    >
                      Reviews
                    </button>
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
