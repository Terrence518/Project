function WishlistPanel({
  items,
  loading,
  onRefresh,
  onRemoveItem,
  onAddToCart,
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Wishlist</h2>
          <p className="panel-note">Keep products here before moving them into the cart.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading wishlist...</p>
      ) : items.length === 0 ? (
        <p className="empty-state">Your wishlist is empty.</p>
      ) : (
        <div className="wishlist-list">
          {items.map((item) => (
            <article className="wishlist-card" key={item.id}>
              <div>
                <h3>{item.product_name}</h3>
                <p className="panel-note">${Number(item.product_price).toFixed(2)}</p>
              </div>
              <div className="wishlist-actions">
                <button className="primary-button" onClick={() => onAddToCart(item.product_id)} type="button">
                  Add to cart
                </button>
                <button className="ghost-button" onClick={() => onRemoveItem(item.product_id)} type="button">
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default WishlistPanel
