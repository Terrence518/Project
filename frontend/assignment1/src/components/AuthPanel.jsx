function AuthPanel({
  authForm,
  authMode,
  error,
  notice,
  onAuthFormChange,
  onAuthModeChange,
  onLogin,
  onRegister,
}) {
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

      {(error || notice) && (
        <div className="auth-messages">
          {error && <p className="message error">{error}</p>}
          {notice && <p className="message notice">{notice}</p>}
        </div>
      )}

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
