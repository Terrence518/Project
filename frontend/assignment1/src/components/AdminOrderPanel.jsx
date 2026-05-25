function AdminOrderPanel({ orders, loading, onRefresh, onStatusChange }) {
  return (
    <section className="panel admin-order-panel">
      <div className="section-heading">
        <div>
          <h2>Orders</h2>
          <p className="panel-note">View all customer orders and update status.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders found.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-head">
                <div>
                  <h3>Order #{order.id}</h3>
                  <p>
                    {order.username} - {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <select
                  aria-label={`Change status for order ${order.id}`}
                  className="status-select"
                  onChange={(event) => onStatusChange(order.id, event.target.value)}
                  value={order.order_status}
                >
                  <option value="paid">paid</option>
                  <option value="packed">packed</option>
                  <option value="shipped">shipped</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div className="order-items">
                {order.items.map((item) => (
                  <div className="order-item" key={item.id}>
                    <span>{item.product_name}</span>
                    <span>
                      {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                    </span>
                    <strong>${Number(item.subtotal).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <span>Total paid</span>
                <strong>${Number(order.total).toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminOrderPanel
