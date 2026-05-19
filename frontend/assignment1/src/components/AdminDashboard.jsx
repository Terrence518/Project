function AdminDashboard({ carts, loading, onRefresh }) {
  // Totals for the admin view.
  const totalUsers = carts.length
  const cartsWithItems = carts.filter((cart) => cart.total_items > 0).length
  const totalRevenue = carts.reduce((total, cart) => total + cart.total_price, 0)

  return (
    <section className="panel admin-dashboard">
      <div className="section-heading">
        <div>
          <h2>Admin dashboard</h2>
          <p className="panel-note">View customer carts across the store.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <div className="admin-stats">
        <div>
          <span className="stat-label">Users</span>
          <strong>{totalUsers}</strong>
        </div>
        <div>
          <span className="stat-label">Active carts</span>
          <strong>{cartsWithItems}</strong>
        </div>
        <div>
          <span className="stat-label">Cart value</span>
          <strong>${totalRevenue.toFixed(2)}</strong>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading user carts...</p>
      ) : carts.length === 0 ? (
        <p className="empty-state">No users found.</p>
      ) : (
        <div className="admin-cart-list">
          {/* One card for each customer cart. */}
          {carts.map((cart) => (
            <article className="admin-cart-card" key={cart.user.id}>
              <div className="admin-cart-header">
                <div>
                  <h3>{cart.user.username}</h3>
                  <p>{cart.user.email}</p>
                </div>
                <span className="badge">{cart.user.role}</span>
              </div>

              {cart.items.length === 0 ? (
                <p className="empty-state">No cart items.</p>
              ) : (
                <div className="admin-cart-items">
                  {cart.items.map((item) => (
                    <div className="admin-cart-item" key={item.id}>
                      <span>{item.product_name}</span>
                      <span>
                        {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                      </span>
                      <strong>${Number(item.subtotal).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="cart-summary">
                <span>{cart.total_items} items</span>
                <strong>${Number(cart.total_price).toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminDashboard
