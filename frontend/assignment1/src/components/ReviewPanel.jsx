function ReviewPanel({
  currentUser,
  editingReviewId,
  loading,
  onCancelEdit,
  onDeleteReview,
  onEditReview,
  onFormChange,
  onRefresh,
  onSubmit,
  product,
  reviewForm,
  reviews,
}) {
  if (!product) {
    return null
  }

  const canModerate = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Reviews</h2>
          <p className="panel-note">{product.name}</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading reviews...</p>
      ) : (
        <>
          <div className="review-summary">
            <span className="badge">
              {product.review_count > 0
                ? `${product.average_rating} / 5 from ${product.review_count} review(s)`
                : 'No reviews yet'}
            </span>
          </div>

          {currentUser?.role === 'customer' && (
            <form className="product-form review-form" onSubmit={onSubmit}>
              <label>
                Rating
                <input
                  max="5"
                  min="1"
                  name="rating"
                  onChange={onFormChange}
                  type="number"
                  value={reviewForm.rating}
                />
              </label>
              <label>
                Comment
                <textarea
                  name="comment"
                  onChange={onFormChange}
                  placeholder="Share what you think"
                  rows="4"
                  value={reviewForm.comment}
                />
              </label>
              <div className="form-row">
                <button className="primary-button submit-button" type="submit">
                  {editingReviewId ? 'Update review' : 'Post review'}
                </button>
                {editingReviewId && (
                  <button className="ghost-button submit-button" onClick={onCancelEdit} type="button">
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="empty-state">Be the first to review this product.</p>
          ) : (
            <div className="review-list">
              {reviews.map((review) => {
                const isOwner = currentUser?.username === review.username
                return (
                  <article className="review-card" key={review.id}>
                    <div className="review-header">
                      <div>
                        <h3>{review.username}</h3>
                        <p className="panel-note">
                          {review.rating} / 5 · {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="badge">{review.rating}</span>
                    </div>
                    <p>{review.comment || 'No comment provided.'}</p>
                    {(isOwner || canModerate) && (
                      <div className="review-actions">
                        {isOwner && (
                          <button className="ghost-button" onClick={() => onEditReview(review)} type="button">
                            Edit
                          </button>
                        )}
                        <button className="danger-button" onClick={() => onDeleteReview(review.id)} type="button">
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ReviewPanel
