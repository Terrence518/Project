function AuthPanel({
  authForm,
  authMode,
  currentUser,
  onAuthFormChange,
  onAuthModeChange,
  onLogin,
  onLogout,
  onRegister,
}) {
  if (currentUser) {
    // Show account info after login.
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
      </section>
    )
  }

  const isRegistering = authMode === 'register'

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{isRegistering ? 'Create account' : 'Login'}</h2>
          <p className="panel-note">
            {isRegistering
              ? 'Register a customer account for shopping cart access.'
              : 'Sign in to use your shopping cart account.'}
          </p>
        </div>
      </div>

      {/* Same form for login and register. */}
      <form
        className="product-form"
        onSubmit={isRegistering ? onRegister : onLogin}
      >
        <label>
          Username
          <input
            name="username"
            onChange={onAuthFormChange}
            placeholder="terrence"
            value={authForm.username}
          />
        </label>

        {isRegistering && (
          <label>
            Email
            <input
              name="email"
              onChange={onAuthFormChange}
              placeholder="terrence@example.com"
              type="email"
              value={authForm.email}
            />
          </label>
        )}

        <label>
          Password
          <input
            maxLength="72"
            name="password"
            onChange={onAuthFormChange}
            placeholder="At least 6 characters"
            type="password"
            value={authForm.password}
          />
        </label>

        <button className="primary-button submit-button" type="submit">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <button
        className="text-button auth-switch"
        onClick={() => onAuthModeChange(isRegistering ? 'login' : 'register')}
        type="button"
      >
        {isRegistering
          ? 'Already have an account? Login'
          : 'Need an account? Register'}
      </button>
    </section>
  )
}

export default AuthPanel
