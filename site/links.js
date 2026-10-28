/* Navigation for the website hosted inside the app. No native bridge is required. */
(function (root) {
  const platform = new URLSearchParams(location.search).get("appPlatform");
  const inApp = ["Apple", "Android", "HarmonyOS"].includes(platform);
  const sitePath = new URL(".", document.currentScript.src).pathname;
  let toastTimer;

  function copyContainer() {
    return document.querySelector("dialog[open]") || document.querySelector(".case-card-trigger.is-expanded") || document.body;
  }

  function showMessage(message) {
    let toast = document.querySelector("#copy-toast");
    if (!toast) {
      toast = document.createElement("p");
      toast.id = "copy-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      Object.assign(toast.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        maxWidth: "calc(100% - 32px)", width: "max-content", padding: "12px 20px",
        borderRadius: "24px", background: "#263238", color: "white", zIndex: "10000",
        font: "14px/1.5 system-ui, sans-serif", pointerEvents: "none"
      });
    }
    // A modal dialog is in the browser's top layer; its feedback belongs inside it.
    copyContainer().append(toast);
    toast.inert = false;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.dataset.visible = "true";
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      delete toast.dataset.visible;
    }, 2600);
  }

  async function copy(value, label = "内容") {
    try {
      let copied = false;
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        try { await navigator.clipboard.writeText(value); copied = true; }
        catch { /* Older embedded browsers may reject the asynchronous clipboard API. */ }
      }
      if (!copied) {
        const field = document.createElement("textarea");
        field.value = value;
        field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        const previousFocus = document.activeElement;
        copyContainer().append(field);
        try { field.select(); copied = document.execCommand("copy"); }
        finally { field.remove(); previousFocus?.focus({ preventScroll: true }); }
        if (!copied) throw new Error("Clipboard unavailable");
      }
      const isWebsite = /^https?:\/\//i.test(value);
      showMessage(isWebsite && inApp ? "网址已复制，请粘贴到浏览器打开" : `已复制${label}`);
      return true;
    } catch (error) {
      console.error("复制失败", error);
      showMessage("复制失败，请重试");
      return false;
    }
  }

  root.SiteLinks = { inApp, copy };
  if (!inApp) return;

  function isSite(url) { return url.origin === location.origin && url.pathname.startsWith(sitePath); }
  function copyLink(url) {
    const isContact = ["mailto:", "tel:", "sms:"].includes(url.protocol);
    return copy(isContact ? decodeURIComponent(url.pathname) : url.href, isContact ? "联系方式" : "链接");
  }

  document.querySelectorAll("a[href]").forEach(link => {
    const url = new URL(link.href);
    if (isSite(url)) return;
    link.title = "复制链接";
    link.setAttribute("aria-label", `复制链接：${link.textContent.trim()}`);
    const hint = document.createElement("span");
    hint.textContent = "（复制）";
    hint.setAttribute("aria-hidden", "true");
    link.append(hint);
  });

  // Capture on window so app shells' document-level new-window handlers never navigate first.
  window.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    if (isSite(url)) {
      url.searchParams.set("appPlatform", platform);
      link.href = url.href;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    void copyLink(url);
  }, true);

  window.open = function (value) {
    if (!value) return null;
    const url = new URL(value, location.href);
    if (isSite(url)) {
      url.searchParams.set("appPlatform", platform);
      location.assign(url.href);
    } else {
      void copyLink(url);
    }
    return null;
  };
})(window);
