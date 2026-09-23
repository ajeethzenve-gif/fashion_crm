import Swal from "sweetalert2";

/* =========================================================
   ZENVE SWEETALERT TOAST NOTIFICATIONS (BOTTOM-RIGHT)
   Unified success & error toast notifications for all layers
========================================================= */

export const showSuccessToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "Action completed successfully");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    iconColor: "#16a34a",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-success",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-success",
    },
  });
};

export const showErrorToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "An unexpected error occurred");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "error",
    iconColor: "#dc2626",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 4500,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-error",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-error",
    },
  });
};

export const showToast = (typeOrOptions, text = "", title = "") => {
  if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
    const type = typeOrOptions.type;
    const msg = typeOrOptions.text || typeOrOptions.message || "";
    const t = typeOrOptions.title || "";
    if (type === "error" || type === "danger") {
      return showErrorToast(msg, t);
    }
    return showSuccessToast(msg, t);
  }

  if (typeOrOptions === "error" || typeOrOptions === "danger") {
    return showErrorToast(text, title);
  }
  return showSuccessToast(text, title);
};

// Global helper access
if (typeof window !== "undefined") {
  window.zenveToast = showToast;
  window.zenveSuccess = showSuccessToast;
  window.zenveError = showErrorToast;

  window.addEventListener("zenve:toast", (e) => {
    const { type, text, title } = e.detail || {};
    showToast(type, text, title);
  });
}

export default showToast;
