function CouponManagementPanel({
  coupons,
  couponForm,
  editingCouponId,
  loading,
  onCancelEdit,
  onCouponFormChange,
  onDeleteCoupon,
  onEditCoupon,
  onRefresh,
  onSubmit,
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Coupons</h2>
          <p className="panel-note">Create discount codes and control activation.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <form className="product-form" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            Code
            <input
              name="code"
              onChange={onCouponFormChange}
              placeholder="SAVE10"
              value={couponForm.code}
            />
          </label>
          <label>
            Discount %
            <input
              min="1"
              max="100"
              name="discount_percent"
              onChange={onCouponFormChange}
              type="number"
              value={couponForm.discount_percent}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Expiry date
            <input
              name="expiry_date"
              onChange={onCouponFormChange}
              type="datetime-local"
              value={couponForm.expiry_date}
            />
          </label>
          <label className="coupon-toggle">
            Active
            <input
              checked={couponForm.is_active}
              name="is_active"
              onChange={onCouponFormChange}
              type="checkbox"
            />
          </label>
        </div>
        <div className="form-row">
          <button className="primary-button submit-button" type="submit">
            {editingCouponId ? 'Update coupon' : 'Create coupon'}
          </button>
          {editingCouponId && (
            <button className="ghost-button submit-button" onClick={onCancelEdit} type="button">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="empty-state">Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <p className="empty-state">No coupons created yet.</p>
      ) : (
        <div className="coupon-list">
          {coupons.map((coupon) => (
            <article className="coupon-card" key={coupon.id}>
              <div>
                <h3>{coupon.code}</h3>
                <p className="panel-note">
                  {coupon.discount_percent}% off{coupon.is_active ? '' : ' · inactive'}
                </p>
              </div>
              <div className="coupon-actions">
                <button className="ghost-button" onClick={() => onEditCoupon(coupon)} type="button">
                  Edit
                </button>
                <button className="danger-button" onClick={() => onDeleteCoupon(coupon.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default CouponManagementPanel
