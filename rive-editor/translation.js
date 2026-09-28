(() => {
  'use strict';
  if (window.__QU_RIVE_TRANSLATOR__) return;

  const config = __RIVE_EDITOR_CONFIG__;
  const COLLECTOR_VERSION = '2.0';
  const UNMATCHED_KEY = '__QU_RIVE_UNMATCHED_TERMS__';
  const MAX_UNMATCHED_TERMS = config.unmatchedTermsMax;
  const FONT_FAMILY = config.fontFamily;
  const FONT_SHA256 = config.fontSha256;
  const FONT_BYTES = config.fontBytes;
  const FONT_ASSET = 'https://editor.rive.app/assets/fonts/qu-translation-' + FONT_SHA256 + '.ttf';
  const dictionary = Object.freeze(__RIVE_EDITOR_DICTIONARY__);

  let enabled = true;
  let canvasKitPatched = false;
  let unmatchedFlushTimer = 0;
  const seenUnmatchedThisSession = new Set();
  let unmatchedTerms = Object.create(null);
  try {
    const saved = JSON.parse(localStorage.getItem(UNMATCHED_KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      unmatchedTerms = Object.assign(Object.create(null), saved);
    }
  } catch (_) {}

  function flushUnmatchedTerms() {
    unmatchedFlushTimer = 0;
    try { localStorage.setItem(UNMATCHED_KEY, JSON.stringify(unmatchedTerms)); } catch (_) {}
    try {
      window.webkit?.messageHandlers?.quUnmatched?.postMessage(
        JSON.stringify(window.__QU_RIVE_TRANSLATOR__.getUnmatchedEntries())
      );
    } catch (_) {}
  }

  function isReportableUnmatchedText(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (text.length < 2 || text.length > 240 || !/[A-Za-z]/.test(text)) return false;
    if (/^(?:https?:|data:|blob:|file:)/i.test(text) || /(?:www\.)/i.test(text)) return false;
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return false;
    if (/(?:=>|===|!==|&&|\|\||\$\{|\b(?:const|let|var|function|return|import|export|class)\s+)/.test(text)) return false;
    if (/\.(?:js|mjs|cjs|json|dart|wasm|riv|zip|png|jpe?g|webp|svg|ttf|otf)(?:\?.*)?$/i.test(text)) return false;
    if (/^(?:[a-f0-9]{16,}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(text)) return false;
    if (text.split(/\s+/).length > 40 || text.split(/\r?\n/).length > 4) return false;
    return true;
  }

  function stableTextId(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'rive-' + (hash >>> 0).toString(16).padStart(8, '0');
  }

  function templateDetails(text) {
    const values = text.match(/\b\d+(?:\.\d+)?(?![\d.])/g) || [];
    if (values.length !== 1) return { candidate: '', values: [] };
    return {
      candidate: text.replace(/\b\d+(?:\.\d+)?(?![\d.])/, '{number}'),
      values: values
    };
  }

  function appendUnique(values, value) {
    const result = Array.isArray(values) ? values.slice(0, 8) : [];
    if (value && result.indexOf(value) < 0 && result.length < 8) result.push(value);
    return result;
  }

  function validTimestamp(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function safePagePath() {
    return (location.pathname || '/')
      .replace(/[a-f0-9]{8,}/gi, ':id')
      .replace(/[0-9]{4,}/g, ':id');
  }

  function recordUnmatched(value, source) {
    if (!enabled || typeof value !== 'string') return;
    const text = value.trim();
    if (!isReportableUnmatchedText(text)) return;
    const pagePath = safePagePath();
    const sessionKey = text + '@@' + pagePath;
    if (seenUnmatchedThisSession.has(sessionKey)) return;
    seenUnmatchedThisSession.add(sessionKey);
    const now = Date.now();
    const previous = unmatchedTerms[text];
    if (!previous) {
      const keys = Object.keys(unmatchedTerms);
      if (keys.length >= MAX_UNMATCHED_TERMS) {
        let oldestKey = keys[0];
        for (let index = 1; index < keys.length; index += 1) {
          if (unmatchedTerms[keys[index]].lastSeen < unmatchedTerms[oldestKey].lastSeen) oldestKey = keys[index];
        }
        delete unmatchedTerms[oldestKey];
      }
    }
    const template = templateDetails(text);
    unmatchedTerms[text] = {
      stableId: previous && previous.stableId ? previous.stableId : stableTextId(text),
      text: text,
      normalizedText: text.replace(/\s+/g, ' '),
      templateCandidate: template.candidate,
      templateValues: appendUnique(previous && previous.templateValues, template.values[0] || ''),
      count: previous && Number.isFinite(previous.count) ? previous.count + 1 : 1,
      firstSeen: previous && Number.isFinite(previous.firstSeen) ? previous.firstSeen : now,
      lastSeen: now,
      source: source || 'canvaskit.addText',
      pagePaths: appendUnique(previous && previous.pagePaths, pagePath)
    };
    if (!unmatchedFlushTimer) unmatchedFlushTimer = setTimeout(flushUnmatchedTerms, 500);
  }

  function translateParameterizedText(text) {
    const values = text.match(/\b\d+(?:\.\d+)?(?![\d.])/g) || [];
    if (values.length !== 1) return '';
    const candidate = text.replace(/\b\d+(?:\.\d+)?(?![\d.])/, '{number}');
    const template = dictionary[candidate];
    return template ? template.replaceAll('{number}', values[0]) : '';
  }

  function translateText(value) {
    if (!enabled || typeof value !== 'string' || value.length === 0) return value;
    const exact = dictionary[value];
    if (exact) return exact;
    const trimmed = value.trim();
    const trimmedExact = dictionary[trimmed];
    if (trimmedExact) return value.replace(trimmed, trimmedExact);
    const parameterized = translateParameterizedText(trimmed);
    if (parameterized) return value.replace(trimmed, parameterized);
    const match = trimmed.match(/^(.+?\S)\s+(\d+)$/);
    if (match) {
      const translatedBase = dictionary[match[1]];
      if (translatedBase) return translatedBase + ' ' + match[2];
    }
    recordUnmatched(value);
    return value;
  }

  function patchCanvasKit(canvasKit) {
    if (!canvasKit) return false;
    if (canvasKit.__quRiveTranslationPatched) return true;
    const paragraphBuilder = canvasKit.ParagraphBuilder;
    if (!paragraphBuilder || !paragraphBuilder.prototype) return false;
    const prototype = paragraphBuilder.prototype;
    if (typeof prototype.addText !== 'function') return false;
    const originalPushStyle = typeof prototype.pushStyle === 'function' ? prototype.pushStyle : null;
    const originalPop = typeof prototype.pop === 'function' ? prototype.pop : null;
    const styleStacks = new WeakMap();

    if (originalPushStyle && originalPop && !prototype.__quOriginalPushStyle) {
      prototype.__quOriginalPushStyle = originalPushStyle;
      prototype.__quOriginalPop = originalPop;
      prototype.pushStyle = function (style) {
        const stack = styleStacks.get(this) || [];
        stack.push(style);
        styleStacks.set(this, stack);
        return originalPushStyle.call(this, style);
      };
      prototype.pop = function () {
        const result = originalPop.call(this);
        const stack = styleStacks.get(this);
        if (stack) stack.pop();
        return result;
      };
    }

    if (!prototype.__quOriginalAddText) {
      const originalAddText = prototype.addText;
      prototype.__quOriginalAddText = originalAddText;
      prototype.addText = function (text) {
        const translated = translateText(text);
        if (translated === text || !originalPushStyle || !originalPop) {
          return originalAddText.call(this, translated);
        }
        const stack = styleStacks.get(this);
        const currentStyle = stack && stack.length ? stack[stack.length - 1] : null;
        if (!currentStyle || typeof currentStyle !== 'object') return originalAddText.call(this, translated);
        let originalRemoved = false;
        let translatedPushed = false;
        try {
          originalPop.call(this);
          originalRemoved = true;
          const families = Array.isArray(currentStyle.fontFamilies) ? currentStyle.fontFamilies : [];
          const translatedStyle = Object.assign({}, currentStyle, {
            fontFamilies: [FONT_FAMILY].concat(
              families.filter(function (family) { return family && family !== FONT_FAMILY; })
            )
          });
          originalPushStyle.call(this, translatedStyle);
          translatedPushed = true;
          const result = originalAddText.call(this, translated);
          originalPop.call(this);
          translatedPushed = false;
          originalPushStyle.call(this, currentStyle);
          originalRemoved = false;
          return result;
        } catch (_) {
          try { if (translatedPushed) originalPop.call(this); } catch (_) {}
          try { if (originalRemoved) originalPushStyle.call(this, currentStyle); } catch (_) {}
          return originalAddText.call(this, text);
        }
      };
    }

    canvasKit.__quRiveTranslationPatched = true;
    canvasKitPatched = true;
    return true;
  }

  function hookGlobal(name, callback) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, name);
      if (descriptor && !descriptor.configurable) {
        if (window[name]) callback(window[name]);
        return;
      }
      let value = window[name];
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: function () { return value; },
        set: function (next) {
          value = next;
          try { callback(next); } catch (_) {}
        }
      });
      if (value) callback(value);
    } catch (_) {}
  }

  function decodeBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }

  function loadLocalFont() {
    const bridge = window.webkit?.messageHandlers?.quRiveFont;
    if (!bridge || typeof bridge.postMessage !== 'function') {
      return Promise.reject(new Error('本地翻译字体桥接不可用'));
    }
    return bridge.postMessage(FONT_SHA256).then(decodeBase64);
  }

  const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = function () {
      const args = Array.prototype.slice.call(arguments);
      let url = '';
      try {
        const input = args[0];
        url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
      } catch (_) {}

      if (url.indexOf(FONT_ASSET) >= 0 && window.webkit?.messageHandlers?.quRiveFont) {
        return loadLocalFont().then(function (buffer) {
          if (buffer.byteLength !== FONT_BYTES) throw new Error('本地翻译字体大小不匹配');
          return new Response(buffer, {
            status: 200,
            headers: { 'content-type': 'font/ttf', 'cache-control': 'no-store' }
          });
        });
      }

      return originalFetch.apply(window, args).then(function (response) {
        if (url.indexOf('FontManifest.json') < 0 || !response || response.type === 'opaque') return response;
        return response.clone().json().then(function (manifest) {
          if (!Array.isArray(manifest)) return response;
          if (!manifest.some(function (item) { return item && item.family === FONT_FAMILY; })) {
            manifest.push({ family: FONT_FAMILY, fonts: [{ asset: FONT_ASSET }] });
          }
          const headers = new Headers(response.headers);
          headers.set('content-type', 'application/json; charset=utf-8');
          headers.delete('content-length');
          return new Response(JSON.stringify(manifest), {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
        }).catch(function () { return response; });
      });
    };
  }

  hookGlobal('flutterCanvasKit', patchCanvasKit);
  hookGlobal('CanvasKit', patchCanvasKit);
  hookGlobal('CanvasKitInit', function (initializer) {
    if (typeof initializer !== 'function' || initializer.__quWrapped) return;
    const wrapped = function () {
      return Promise.resolve(initializer.apply(this, arguments)).then(function (canvasKit) {
        patchCanvasKit(canvasKit);
        return canvasKit;
      });
    };
    wrapped.__quWrapped = true;
    window.CanvasKitInit = wrapped;
  });

  const startedAt = Date.now();
  const probe = setInterval(function () {
    const flutterPatched = patchCanvasKit(window.flutterCanvasKit);
    const directPatched = patchCanvasKit(window.CanvasKit);
    if (flutterPatched || directPatched || Date.now() - startedAt > 30000) clearInterval(probe);
  }, 200);

  window.__QU_RIVE_TRANSLATOR__ = {
    isEnabled: function () { return enabled; },
    isPatched: function () { return canvasKitPatched; },
    getUnmatchedEntries: function () {
      return Object.keys(unmatchedTerms).filter(function (key) {
        const trimmed = key.trim();
        return isReportableUnmatchedText(key) && !dictionary[key] && !dictionary[trimmed];
      })
        .map(function (key) { return unmatchedTerms[key]; })
        .sort(function (a, b) { return b.lastSeen - a.lastSeen; });
    },
    exportUnmatchedEntries: function () {
      flushUnmatchedTerms();
      return JSON.stringify(this.getUnmatchedEntries().map(function (item) {
        const exportedAt = Date.now();
        const firstSeen = validTimestamp(item.firstSeen, exportedAt);
        const lastSeen = validTimestamp(item.lastSeen, firstSeen);
        return {
          stableId: item.stableId || stableTextId(item.text),
          text: item.text,
          normalizedText: item.normalizedText || item.text.replace(/\s+/g, ' '),
          templateCandidate: item.templateCandidate || '',
          templateValues: Array.isArray(item.templateValues) ? item.templateValues : [],
          count: Number.isFinite(item.count) ? item.count : 1,
          source: item.source || 'canvaskit.addText',
          pagePaths: Array.isArray(item.pagePaths) ? item.pagePaths : [],
          firstSeen: firstSeen,
          lastSeen: lastSeen,
          firstSeenIso: new Date(firstSeen).toISOString(),
          lastSeenIso: new Date(lastSeen).toISOString(),
          reviewRequired: true
        };
      }), null, 2);
    },
    exportUnmatchedReport: function () {
      const entries = JSON.parse(this.exportUnmatchedEntries());
      return JSON.stringify({
        schemaVersion: 1,
        collectorVersion: COLLECTOR_VERSION,
        generatedAt: Date.now(),
        generatedAtIso: new Date().toISOString(),
        target: 'Rive Web Editor',
        locale: 'zh-CN',
        dictionaryEntryCount: Object.keys(dictionary).length,
        pageOrigin: location.origin,
        submission: 'local-only',
        reviewRequired: true,
        privacyNotice: 'Canvas candidates can include designer-provided names or text. Review and remove private content before sharing; this report is never uploaded automatically.',
        entries: entries
      }, null, 2);
    },
    clearUnmatchedEntries: function () {
      unmatchedTerms = Object.create(null);
      seenUnmatchedThisSession.clear();
      if (unmatchedFlushTimer) clearTimeout(unmatchedFlushTimer);
      unmatchedFlushTimer = 0;
      try { localStorage.removeItem(UNMATCHED_KEY); } catch (_) {}
    },
    setEnabled: function (next) {
      enabled = !!next;
      return enabled;
    }
  };
})();
