(function () {
  var STORAGE_KEY = 'lsc_cookie_consent_v1';
  var ANALYTICS_SCRIPT_SRC = '/_vercel/insights/script.js';
  var POLICY_URL = '/datenschutz.html';
  var bannerEl = null;

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeConsent(consent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (_) {}
  }

  function loadAnalytics() {
    if (window.__lscAnalyticsLoaded) return;
    if (document.querySelector('script[data-cookie-analytics="vercel"]')) return;
    var s = document.createElement('script');
    s.defer = true;
    s.src = ANALYTICS_SCRIPT_SRC;
    s.setAttribute('data-cookie-analytics', 'vercel');
    document.head.appendChild(s);
    window.__lscAnalyticsLoaded = true;
  }

  function clearLikelyAnalyticsCookies() {
    var names = ['_vercel', '_vercel_jwt', '_vercel_insights'];
    names.forEach(function (name) {
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + window.location.hostname + '; SameSite=Lax';
    });
  }

  function applyConsent(consent) {
    if (consent && consent.analytics === true) {
      loadAnalytics();
      return;
    }
    clearLikelyAnalyticsCookies();
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.add('hidden');
  }

  function saveAndApply(analyticsAllowed) {
    var previous = readConsent();
    var consent = {
      necessary: true,
      analytics: analyticsAllowed === true,
      updatedAt: new Date().toISOString(),
      version: 1
    };
    writeConsent(consent);
    hideBanner();
    applyConsent(consent);

    if (previous && previous.analytics === true && consent.analytics === false) {
      window.location.reload();
    }
  }

  function buildBanner() {
    if (bannerEl) return bannerEl;

    var wrapper = document.createElement('div');
    wrapper.id = 'cookie-banner';
    wrapper.className = 'fixed inset-x-4 bottom-4 z-[100000] bg-black/95 border border-gray-700 text-white p-4 sm:p-5 shadow-2xl max-w-3xl mx-auto';
    wrapper.innerHTML =
      '<p class="text-sm leading-relaxed">' +
      'Wir verwenden notwendige Technologien fuer den Betrieb der Website. Optionale Analytics werden erst nach deiner Zustimmung geladen. ' +
      '<a href="' + POLICY_URL + '" class="underline hover:text-[#C5A059]">Mehr Infos</a>.' +
      '</p>' +
      '<div class="mt-4 grid gap-2 sm:grid-cols-2">' +
      '<button type="button" data-cookie-action="necessary" class="w-full py-3 px-4 border border-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition">Nur notwendige</button>' +
      '<button type="button" data-cookie-action="all" class="w-full py-3 px-4 bg-[#A91D1D] border border-[#A91D1D] text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition">Alle akzeptieren</button>' +
      '</div>';

    wrapper.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cookie-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-cookie-action');
      if (action === 'all') saveAndApply(true);
      if (action === 'necessary') saveAndApply(false);
    });

    bannerEl = wrapper;
    return wrapper;
  }

  function bindSettingsButtons() {
    var buttons = document.querySelectorAll('[data-open-cookie-settings]');
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      if (btn.dataset.cookieBound === 'true') return;
      btn.dataset.cookieBound = 'true';
      btn.addEventListener('click', function () {
        var b = buildBanner();
        if (!b.parentNode) {
          document.body.appendChild(b);
        }
        b.classList.remove('hidden');
      });
    });
  }

  function initConsent() {
    var consent = readConsent();
    applyConsent(consent);
    bindSettingsButtons();

    if (!consent) {
      var b = buildBanner();
      document.body.appendChild(b);
      b.classList.remove('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsent);
  } else {
    initConsent();
  }
})();
