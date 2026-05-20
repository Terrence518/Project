function UserManagementPanel({
  users,
  loading,
  currentUser,
  onRefresh,
  onRoleChange,
  onDeleteUser,
}) {
  return (
    <section className="panel user-management">
      <div className="section-heading">
        <div>
          <h2>User management</h2>
          <p className="panel-note">Manage customer and admin accounts.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="empty-state">No users found.</p>
      ) : (
        <div className="user-table">
          {/* Admin can change roles or delete other users. */}
          {users.map((user) => {
            const isCurrentUser = currentUser?.id === user.id

            return (
              <article className="user-row" key={user.id}>
                <div className="user-main">
                  <h3>{user.username}</h3>
                  <p>{user.email}</p>
                </div>

                <div className="user-meta">
                  <span className="badge">{user.role}</span>
                  {isCurrentUser && <span className="owner-note">Current account</span>}
                  <span>{user.cart_items} cart items</span>
                  <strong>${Number(user.cart_total).toFixed(2)}</strong>
                </div>

                <div className="user-actions">
                  <select
                    aria-label={`Change role for ${user.username}`}
                    disabled={isCurrentUser}
                    onChange={(event) => onRoleChange(user.id, event.target.value)}
                    value={user.role}
                  >
                    <option value="customer">customer</option>
                    <option value="admin">admin</option>
                  </select>

                  <button
                    className="danger-button"
                    disabled={isCurrentUser}
                    onClick={() => onDeleteUser(user.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default UserManagementPanel
