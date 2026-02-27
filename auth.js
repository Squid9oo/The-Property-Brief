let auth0Client = null;

const auth0Config = {
  domain: "dev-72rdl3m7zzykqj8h.us.auth0.com",
  clientId: "TUgercyNTRmOs3Dx6UMJdaSwAnIKqkti",
  authorizationParams: {
    redirect_uri: window.location.origin + "/projects.html"
  }
};

async function initAuth() {
  auth0Client = await auth0.createAuth0Client(auth0Config);

  // Handle OAuth callback — wrapped in try/catch so stale state never crashes auth flow
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    try {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);

      // Auto-open form after login
      if (sessionStorage.getItem("openAdAfterLogin") === "1") {
        sessionStorage.removeItem("openAdAfterLogin");
        setTimeout(() => {
          const adModal = document.getElementById('adModal');
          if (adModal) adModal.classList.add('open');
        }, 500);
      }
    } catch (err) {
      // Stale or replayed state token — clean the URL and continue silently
      console.warn('Auth0 callback ignored (stale state):', err.message);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Update UI based on auth status
  await updateAuthUI();
}

async function requireLogin() {
  if (!auth0Client) await initAuth();
  const isAuth = await auth0Client.isAuthenticated();
  if (isAuth) return true;

  // Mark that we want to open the ad form after login
  sessionStorage.setItem("openAdAfterLogin", "1");
  await auth0Client.loginWithRedirect();
  return false;
}

async function logout() {
  if (!auth0Client) return;
  await auth0Client.logout({
    logoutParams: {
      returnTo: window.location.origin + "/projects.html"
    }
  });
}

async function updateAuthUI() {
  if (!auth0Client) return;
  
  const isAuthenticated = await auth0Client.isAuthenticated();
  const loginBtn = document.getElementById('loginBtn');
  const userProfile = document.getElementById('userProfile');
  const userName = document.getElementById('userName');
  
  if (isAuthenticated) {
    const user = await auth0Client.getUser();
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfile) {
      userProfile.style.display = 'flex';
      if (userName) {
        const displayName = user.nickname || user.name || user.email?.split('@')[0] || 'User';
        userName.textContent = `Hi, ${displayName}`;
      }
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userProfile) userProfile.style.display = 'none';
  }
}

// Attach event listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        if (!auth0Client) await initAuth();
        await auth0Client.loginWithRedirect();
      });
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
    
    initAuth();
  });
} else {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      if (!auth0Client) await initAuth();
      await auth0Client.loginWithRedirect();
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  initAuth();
}

window.Auth = { initAuth, requireLogin, logout, updateAuthUI };