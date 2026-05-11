function InventoryPanel({
  editingProductId,
  productForm,
  onProductFormChange,
  onSubmit,
  onCancelEdit,
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{editingProductId ? 'Edit inventory item' : 'Inventory manager'}</h2>
          <p className="panel-note">
            Add new products or update stock and product details here.
          </p>
        </div>
        {editingProductId && (
          <button className="ghost-button" onClick={onCancelEdit} type="button">
            Cancel edit
          </button>
        )}
      </div>

      <form className="product-form" onSubmit={onSubmit}>
        <label>
          Product name
          <input
            name="name"
            onChange={onProductFormChange}
            placeholder="Desk lamp"
            value={productForm.name}
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            onChange={onProductFormChange}
            placeholder="Describe the product"
            rows="4"
            value={productForm.description}
          />
        </label>

        <div className="form-row">
          <label>
            Price
            <input
              min="0"
              name="price"
              onChange={onProductFormChange}
              placeholder="49.90"
              step="0.01"
              type="number"
              value={productForm.price}
            />
          </label>

          <label>
            Stock
            <input
              min="0"
              name="stock"
              onChange={onProductFormChange}
              placeholder="12"
              step="1"
              type="number"
              value={productForm.stock}
            />
          </label>
        </div>
        <button className="primary-button submit-button" type="submit">
          {editingProductId ? 'Save inventory changes' : 'Add product to inventory'}
        </button>
      </form>
    </section>
  )
}

export default InventoryPanel
