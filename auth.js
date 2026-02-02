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

  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);

    if (sessionStorage.getItem("openAdAfterLogin") === "1") {
      sessionStorage.removeItem("openAdAfterLogin");
      window.dispatchEvent(new Event("open-post-ad"));
    }
  }
}

async function requireLogin() {
  if (!auth0Client) await initAuth();
  const isAuth = await auth0Client.isAuthenticated();
  if (isAuth) return true;

  sessionStorage.setItem("openAdAfterLogin", "1");
  await auth0Client.loginWithRedirect();
  return false;
}

window.Auth = { initAuth, requireLogin };
