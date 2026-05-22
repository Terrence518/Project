function AccountPanel({ currentUser, onLogout }) {
  return (
    <section className="panel account-panel">
      <div>
        <span className="stat-label">Signed in</span>
        <h2>{currentUser.username}</h2>
        <p className="panel-note">{currentUser.email}</p>
      </div>

      <div className="account-row">
        <span className="badge">{currentUser.role}</span>
        <button className="ghost-button" onClick={onLogout} type="button">
          Logout
        </button>
      </div>

      <p className="panel-note">
        Use the top bar for search, cart, and admin tools. This panel only shows your account state.
      </p>
    </section>
  )
}

export default AccountPanel
