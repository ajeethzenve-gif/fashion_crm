export const SESSION_EXPIRED_EVENT = "zenve:session-expired";

export function tokenExpiry(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : 0;
  } catch { return 0; }
}

export function installExpiryFetch(target, getToken, onExpired) {
  const original = target.fetch;
  const wrapped = async (input, options) => {
    const headers = new Headers(options?.headers ?? (input instanceof Request ? input.headers : undefined));
    const authorization = headers.get("Authorization");
    const token = getToken();
    const authenticated = Boolean(token && authorization === `Bearer ${token}`);
    if (authenticated && tokenExpiry(token) <= Date.now()) {
      onExpired();
      throw new Error("Your session has expired. Please sign in again.");
    }
    const response = await original.call(target, input, options);
    // Ignore late responses belonging to an account that has already signed out.
    if (authenticated && response.status === 401 && getToken() === token) {
      onExpired();
      throw new Error("Your session has expired. Please sign in again.");
    }
    return response;
  };
  target.fetch = wrapped;
  return () => { if (target.fetch === wrapped) target.fetch = original; };
}
