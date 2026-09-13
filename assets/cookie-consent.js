(function () {
    'use strict';
    const STORAGE_KEY = 'lsc_cookie_consent_v1';
    let dialog;
    let returnFocus;

    const readConsent = () => {
        try {
            const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
            return value?.version === 1 && value.necessary === true && typeof value.analytics === 'boolean' ? value : null;
        } catch (_) { return null; }
    };

    const loadAnalytics = () => {
        // GitHub Pages and local previews do not provide Vercel's analytics endpoint.
        const hostname = window.location.hostname;
        const supportedHost = ['lukasschwarzcoaching.com', 'www.lukasschwarzcoaching.com'].includes(hostname) || hostname.endsWith('.vercel.app');
        if (!supportedHost || window.__lscAnalyticsLoaded) return;
        const script = document.createElement('script');
        script.defer = true;
        script.src = '/_vercel/insights/script.js';
        script.setAttribute('data-cookie-analytics', 'vercel');
        document.head.appendChild(script);
        window.__lscAnalyticsLoaded = true;
    };

    const closeDialog = () => {
        dialog?.close();
        document.documentElement.classList.remove('cookie-dialog-open');
        returnFocus?.focus({preventScroll: true});
    };

    const saveConsent = (analytics) => {
        const wasLoaded = window.__lscAnalyticsLoaded === true;
        const consent = {necessary: true, analytics, updatedAt: new Date().toISOString(), version: 1};
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent)); } catch (_) {}
        closeDialog();
        if (analytics) loadAnalytics();
        else if (wasLoaded) {
            // Reload removes the already running analytics script after revocation.
            window.location.reload();
        }
    };

    const openDialog = () => {
        if (dialog.open) return;
        returnFocus = document.activeElement;
        document.documentElement.classList.add('cookie-dialog-open');
        dialog.showModal();
    };

    const initConsent = () => {
        dialog = document.createElement('dialog');
        dialog.id = 'cookie-banner';
        dialog.className = 'cookie-dialog';
        dialog.setAttribute('aria-labelledby', 'cookie-title');
        dialog.setAttribute('aria-describedby', 'cookie-description');
        dialog.innerHTML = `
            <p class="section-kicker">Deine Privatsphäre</p>
            <h2 id="cookie-title">Du entscheidest.</h2>
            <p id="cookie-description">Wir speichern deine Cookie-Auswahl für den Betrieb der Website. Optionale Reichweitenmessung mit Vercel Web Analytics wird ausschließlich nach deiner Zustimmung aktiviert.</p>
            <p>Du kannst deine Auswahl jederzeit über „Cookie-Einstellungen“ im Footer ändern oder widerrufen.</p>
            <a href="datenschutz.html" class="text-link">Datenschutzerklärung lesen</a>
            <div class="cookie-dialog__actions">
                <button type="button" data-cookie-action="necessary" autofocus>Nur Notwendige</button>
                <button type="button" data-cookie-action="all">Alle Akzeptieren</button>
            </div>`;
        dialog.addEventListener('click', (event) => {
            const action = event.target.closest('[data-cookie-action]')?.dataset.cookieAction;
            if (action) saveConsent(action === 'all');
        });
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            if (readConsent()) closeDialog();
            else saveConsent(false);
        });
        document.body.appendChild(dialog);
        document.querySelectorAll('[data-open-cookie-settings]').forEach((button) => button.addEventListener('click', openDialog));
        const consent = readConsent();
        if (consent?.analytics) loadAnalytics();
        if (!consent) openDialog();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initConsent);
    else initConsent();
})();
