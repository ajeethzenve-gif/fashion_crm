/* =========================================================
   ZENVE TOAST NOTIFICATIONS (DISABLED)
   All notifications disabled per user request
========================================================= */

export const showSuccessToast = () => null;
export const showErrorToast = () => null;
export const showToast = () => null;

if (typeof window !== "undefined") {
  window.zenveToast = showToast;
  window.zenveSuccess = showSuccessToast;
  window.zenveError = showErrorToast;
}

export default showToast;
