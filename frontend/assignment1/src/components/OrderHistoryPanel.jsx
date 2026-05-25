function OrderHistoryPanel({ orders, loading, onRefresh }) {
  return (
    <section className="panel order-history-panel">
      <div className="section-heading">
        <div>
          <h2>Order history</h2>
          <p className="panel-note">Past checkout orders for this account.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-head">
                <div>
                  <h3>Order #{order.id}</h3>
                  <p>{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className="badge">{order.order_status}</span>
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

export default OrderHistoryPanel
