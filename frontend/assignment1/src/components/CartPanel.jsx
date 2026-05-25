function CartPanel({
  cartItems,
  totalItems,
  cartSummary,
  couponForm,
  couponMessage,
  onApplyCoupon,
  onCouponFormChange,
  onClearCoupon,
  onChangeCartQuantity,
  onRemoveCartItem,
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Your cart</h2>
        </div>
        <span className="badge">{totalItems} items</span>
      </div>

      {cartItems.length === 0 ? (
        <p className="empty-state">
          Your cart is empty. Add a product from the storefront.
        </p>
      ) : (
        <>
          <div className="cart-list">
            {/* Update quantity in the database. */}
            {cartItems.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <h3>{item.product_name}</h3>
                  <p>${Number(item.unit_price).toFixed(2)} each</p>
                </div>

                <div className="cart-controls">
                  <button
                    className="mini-button"
                    disabled={item.quantity <= 1}
                    onClick={() => onChangeCartQuantity(item.id, item.quantity - 1)}
                    type="button"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="mini-button"
                    disabled={item.quantity >= item.stock}
                    onClick={() => onChangeCartQuantity(item.id, item.quantity + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>

                <div className="cart-footer">
                  <strong>${Number(item.subtotal).toFixed(2)}</strong>
                  <button
                    className="text-button"
                    onClick={() => onRemoveCartItem(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <strong>${cartSummary.subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-${cartSummary.discount_amount.toFixed(2)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>${cartSummary.total.toFixed(2)}</strong>
            </div>
          </div>

          <form className="coupon-form" onSubmit={onApplyCoupon}>
            <label>
              Coupon code
              <input
                name="code"
                onChange={onCouponFormChange}
                placeholder="SAVE10"
                value={couponForm.code}
              />
            </label>
            {couponMessage && <p className="panel-note">{couponMessage}</p>}
            <div className="form-row">
              <button className="primary-button submit-button" type="submit">
                Apply coupon
              </button>
              <button className="ghost-button submit-button" onClick={onClearCoupon} type="button">
                Clear
              </button>
            </div>
            {cartSummary.coupon && (
              <p className="panel-note">
                Applied coupon: {cartSummary.coupon.code}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  )
}

export default CartPanel
