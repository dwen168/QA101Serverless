// Frontend auth runtime helpers for serverless stateless login.

const AUTH_API_BASE = '/api/auth';

let authState = {
  authenticated: false,
  loginEnabled: false,
  user: null,
  providers: ['gemini'],
  deepseekEnabled: false,
};
let loginModalOpen = false;

function normalizeProviders(providers) {
  const allowed = Array.isArray(providers)
    ? providers.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
    : [];
  if (allowed.length > 0) return Array.from(new Set(allowed));
  return ['gemini'];
}

function updateAuthControls() {
  const controls = document.getElementById('auth-controls');
  const userEl = document.getElementById('auth-user');
  const btnEl = document.getElementById('auth-btn');

  if (!controls || !userEl || !btnEl) return;

  if (!authState.loginEnabled) {
    controls.style.display = 'none';
    return;
  }

  controls.style.display = 'inline-flex';
  if (authState.authenticated && authState.user?.username) {
    userEl.textContent = authState.user.username;
    btnEl.textContent = 'Logout';
  } else {
    userEl.textContent = 'Guest';
    btnEl.textContent = 'Login';
  }
}

function getLoginModalElements() {
  return {
    modal: document.getElementById('login-modal'),
    form: document.getElementById('login-form'),
    usernameInput: document.getElementById('login-username'),
    passwordInput: document.getElementById('login-password'),
    errorEl: document.getElementById('login-error'),
    submitBtn: document.getElementById('login-submit'),
  };
}

function setLoginError(message) {
  const { errorEl } = getLoginModalElements();
  if (!errorEl) return;
  errorEl.textContent = message ? String(message) : '';
}

function closeLoginModal() {
  const { modal, form, errorEl } = getLoginModalElements();
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  loginModalOpen = false;
  if (form) form.reset();
  if (errorEl) errorEl.textContent = '';
}

function openLoginModal() {
  const { modal, usernameInput, submitBtn } = getLoginModalElements();
  if (!modal) return;
  setLoginError('');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  loginModalOpen = true;
  if (submitBtn) submitBtn.disabled = false;
  if (usernameInput) {
    window.setTimeout(() => usernameInput.focus(), 0);
  }
}

async function submitLoginForm(event) {
  if (event) event.preventDefault();

  const { usernameInput, passwordInput, submitBtn } = getLoginModalElements();
  const username = String(usernameInput?.value || '').trim();
  const password = String(passwordInput?.value || '');

  if (!username || !password) {
    setLoginError('Please enter username and password.');
    return;
  }

  try {
    if (submitBtn) submitBtn.disabled = true;
    setLoginError('');

    const response = await fetch(`${AUTH_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(String(payload?.error || 'Login failed'));
    }

    setAuthState(payload);
    closeLoginModal();
    await refreshLlmForAuthChange();
  } catch (error) {
    setLoginError(error.message || 'Login failed');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function bindLoginModalEvents() {
  const { modal, form } = getLoginModalElements();

  if (form && !form.dataset.bound) {
    form.addEventListener('submit', submitLoginForm);
    form.dataset.bound = 'true';
  }

  if (modal && !modal.dataset.bound) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeLoginModal();
      }
    });
    modal.dataset.bound = 'true';
  }

  if (!document.body.dataset.authEscBound) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && loginModalOpen) {
        closeLoginModal();
      }
    });
    document.body.dataset.authEscBound = 'true';
  }
}

async function refreshLlmForAuthChange() {
  if (typeof window.refreshLlmAvailability === 'function') {
    await window.refreshLlmAvailability();
  }
}

function setAuthState(nextState) {
  authState = {
    authenticated: Boolean(nextState?.authenticated),
    loginEnabled: Boolean(nextState?.loginEnabled),
    user: nextState?.user && nextState.user.username
      ? { username: String(nextState.user.username) }
      : null,
    providers: normalizeProviders(nextState?.providers),
    deepseekEnabled: Boolean(nextState?.deepseekEnabled),
  };
  updateAuthControls();
}

function getAuthState() {
  return {
    authenticated: authState.authenticated,
    loginEnabled: authState.loginEnabled,
    user: authState.user ? { ...authState.user } : null,
    providers: [...authState.providers],
    deepseekEnabled: authState.deepseekEnabled,
  };
}

async function fetchAuthStatus() {
  const response = await fetch(`${AUTH_API_BASE}/status`, {
    method: 'GET',
    credentials: 'same-origin',
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(String(payload?.error || 'Failed to fetch auth status'));
  }
  return payload;
}

async function initializeAuth() {
  bindLoginModalEvents();

  try {
    const payload = await fetchAuthStatus();
    setAuthState(payload);
  } catch {
    setAuthState({
      authenticated: false,
      loginEnabled: false,
      user: null,
      providers: ['gemini'],
      deepseekEnabled: false,
    });
  }

  await refreshLlmForAuthChange();
}

async function handleAuthAction() {
  if (!authState.loginEnabled) return;

  if (authState.authenticated) {
    try {
      const response = await fetch(`${AUTH_API_BASE}/logout`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Logout failed'));
      }
      setAuthState(payload);
      await refreshLlmForAuthChange();
    } catch (error) {
      alert(`Logout failed: ${error.message}`);
    }
    return;
  }

  openLoginModal();
}

window.initializeAuth = initializeAuth;
window.handleAuthAction = handleAuthAction;
window.getAuthState = getAuthState;
window.setAuthState = setAuthState;
window.closeLoginModal = closeLoginModal;
