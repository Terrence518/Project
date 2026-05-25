function CheckoutPanel({
  checkoutForm,
  cartSummary,
  loading,
  message,
  onCheckoutFormChange,
  onSubmit,
}) {
  return (
    <section className="panel checkout-panel">
      <div className="section-heading">
        <div>
          <h2>Checkout</h2>
          <p className="panel-note">Mock payment for this assignment.</p>
        </div>
      </div>

      <div className="checkout-total">
        <span>Total to pay</span>
        <strong>${Number(cartSummary.total).toFixed(2)}</strong>
      </div>

      <form className="product-form" onSubmit={onSubmit}>
        <label>
          Cardholder name
          <input
            name="cardholder_name"
            onChange={onCheckoutFormChange}
            placeholder="Terrence Huang"
            value={checkoutForm.cardholder_name}
          />
        </label>

        <label>
          Card number
          <input
            inputMode="numeric"
            maxLength="19"
            name="card_number"
            onChange={onCheckoutFormChange}
            placeholder="4111111111111111"
            value={checkoutForm.card_number}
          />
        </label>

        <div className="form-row">
          <label>
            Expiry
            <input
              name="expiry"
              onChange={onCheckoutFormChange}
              placeholder="12/28"
              value={checkoutForm.expiry}
            />
          </label>

          <label>
            CVV
            <input
              inputMode="numeric"
              maxLength="4"
              name="cvv"
              onChange={onCheckoutFormChange}
              placeholder="123"
              value={checkoutForm.cvv}
            />
          </label>
        </div>

        <label>
          Delivery address
          <textarea
            name="delivery_address"
            onChange={onCheckoutFormChange}
            placeholder="Street address, suburb, state, postcode"
            rows="4"
            value={checkoutForm.delivery_address}
          />
        </label>

        {message && <p className="panel-note">{message}</p>}

        <button className="primary-button submit-button" disabled={loading} type="submit">
          {loading ? 'Processing...' : 'Pay and place order'}
        </button>
      </form>
    </section>
  )
}

export default CheckoutPanel
