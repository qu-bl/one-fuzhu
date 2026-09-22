(() => {
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const defaults = {
    light: {
      primary: "#445e91", onPrimary: "#ffffff",
      primaryContainer: "#d8e2ff", onPrimaryContainer: "#001a41",
      secondaryContainer: "#dce2f9", onSecondaryContainer: "#171b2c",
      surface: "#faf9fd", onSurface: "#1b1b20", onSurfaceVariant: "#44474f",
      surfaceContainerLow: "#f3f3fa", surfaceContainer: "#ededf4",
      surfaceContainerHigh: "#e7e8ef", surfaceContainerHighest: "#e1e2e9",
      outline: "#74777f", outlineVariant: "#c4c6d0",
      inverseSurface: "#303034", inverseOnSurface: "#f1f0f5"
    },
    dark: {
      primary: "#adc6ff", onPrimary: "#102f60",
      primaryContainer: "#2b4778", onPrimaryContainer: "#d8e2ff",
      secondaryContainer: "#3f4559", onSecondaryContainer: "#dce2f9",
      surface: "#121318", onSurface: "#e3e2e8", onSurfaceVariant: "#c4c6d0",
      surfaceContainerLow: "#1b1b20", surfaceContainer: "#1f2025",
      surfaceContainerHigh: "#292a2f", surfaceContainerHighest: "#34343a",
      outline: "#8e9099", outlineVariant: "#44474f",
      inverseSurface: "#e3e2e8", inverseOnSurface: "#303034"
    }
  };
  const initial = { mode: "system", colorMode: "default", seedColor: "#4285f4", palettes: {} };
  let settings = structuredClone(initial);
  let current;

  const clone = value => JSON.parse(JSON.stringify(value));
  const color = value => {
    if (!/^#[\da-f]{6}$/i.test(value || "")) throw new TypeError("Colors must use #RRGGBB.");
    return value.toLowerCase();
  };
  const rgb = value => [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
  const hex = values => `#${values.map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  const mix = (a, b, amount) => hex(rgb(a).map((value, index) => value + (rgb(b)[index] - value) * amount));
  const readable = value => {
    const [r, g, b] = rgb(value).map(channel => channel / 255);
    return .2126 * r + .7152 * g + .0722 * b > .55 ? "#111111" : "#ffffff";
  };

  function normalize(next = {}) {
    if (!next || typeof next !== "object" || Array.isArray(next)) throw new TypeError("Theme must be an object.");
    const result = { ...settings };
    if (next.mode !== undefined) {
      if (!["light", "dark", "system"].includes(next.mode)) throw new TypeError("mode: light | dark | system");
      result.mode = next.mode;
    }
    if (next.colorMode !== undefined) {
      if (!["default", "seed", "custom"].includes(next.colorMode)) throw new TypeError("colorMode: default | seed | custom");
      result.colorMode = next.colorMode;
    }
    if (next.seedColor !== undefined) result.seedColor = color(next.seedColor);
    if (next.palettes !== undefined) result.palettes = clone(next.palettes);
    return result;
  }

  function palette(mode) {
    const result = { ...defaults[mode] };
    if (settings.colorMode === "seed") {
      const seed = settings.seedColor;
      result.primary = seed;
      result.onPrimary = readable(seed);
      result.primaryContainer = mix(seed, mode === "dark" ? "#000000" : "#ffffff", .72);
      result.onPrimaryContainer = readable(result.primaryContainer);
    } else if (settings.colorMode === "custom") {
      Object.assign(result, settings.palettes?.[mode] || {});
    }
    return result;
  }

  function apply() {
    const mode = settings.mode === "system" ? (systemDark.matches ? "dark" : "light") : settings.mode;
    const colors = palette(mode);
    for (const [name, value] of Object.entries(colors)) {
      root.style.setProperty(`--md-sys-color-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, color(value));
    }
    root.dataset.theme = mode;
    root.dataset.colorMode = settings.colorMode;
    root.style.colorScheme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.surface);
    current = { ...clone(settings), resolvedMode: mode, colors };
    dispatchEvent(new CustomEvent("qianji:themechange", { detail: clone(current) }));
    return clone(current);
  }

  function setTheme(next) {
    settings = normalize(next);
    return apply();
  }

  window.QianjiTheme = Object.freeze({
    version: 1,
    setTheme,
    setMode: mode => setTheme({ mode }),
    setColorMode: colorMode => setTheme({ colorMode }),
    setSeedColor: seedColor => setTheme({ seedColor, colorMode: "seed" }),
    setPalettes: palettes => setTheme({ palettes, colorMode: "custom" }),
    getTheme: () => clone(current),
    reset: () => { settings = structuredClone(initial); return apply(); }
  });
  window.setAppTheme = setTheme;
  apply();
  if (window.__APP_THEME__ !== undefined) {
    try { setTheme(window.__APP_THEME__); } catch (error) { console.warn("Invalid initial app theme:", error.message); }
  }
  systemDark.addEventListener?.("change", () => settings.mode === "system" && apply());
  dispatchEvent(new CustomEvent("qianji:themeready", { detail: window.QianjiTheme.getTheme() }));
})();
