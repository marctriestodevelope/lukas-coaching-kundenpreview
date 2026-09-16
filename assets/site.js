(function () {
    'use strict';

    const SELECTORS = {
        nav: '.site-nav',
        menu: '#site-menu',
        menuButton: '#site-menu-button',
    };

    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    };

    const previewVersion = new URLSearchParams(window.location.search).get('version') || '';
    const versionAssetPath = (path) => {
        const value = String(path || '');
        if (!previewVersion || !value.startsWith('assets/')) return value;
        const separator = value.includes('?') ? '&' : '?';
        return `${value}${separator}preview=${encodeURIComponent(previewVersion)}`;
    };

    const versionPagePath = (path) => {
        const value = String(path || '');
        if (!previewVersion || !value || value.startsWith('#')) return value;
        const url = new URL(value, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.endsWith('.html')) return value;
        url.searchParams.set('version', previewVersion);
        return url.href;
    };

    const versionStaticImages = () => {
        if (!previewVersion) return;
        document.querySelectorAll('img[src^="assets/"]').forEach((image) => {
            image.src = versionAssetPath(image.getAttribute('src'));
        });
        document.querySelectorAll('a[href]').forEach((anchor) => {
            anchor.href = versionPagePath(anchor.getAttribute('href'));
        });
    };

    // Small, safe editorial format: **bold**, ## subheading, and - list items.
    // Never interpret content-file text as HTML.
    const appendFormattedText = (element, text) => {
        String(text || '').split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
            element.appendChild(part.startsWith('**') && part.endsWith('**')
                ? createElement('strong', '', part.slice(2, -2))
                : document.createTextNode(part));
        });
        return element;
    };

    const renderCopyBlocks = (root, paragraphs) => {
        root.replaceChildren();
        let list;
        paragraphs.forEach((text) => {
            if (text.startsWith('- ')) {
                if (!list) { list = createElement('ul', 'holistic-list'); root.appendChild(list); }
                list.appendChild(appendFormattedText(createElement('li'), text.slice(2)));
                return;
            }
            list = null;
            const heading = text.startsWith('## ');
            root.appendChild(appendFormattedText(createElement(heading ? 'h4' : 'p'), heading ? text.slice(3) : text));
        });
    };

    const slugify = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const loadJson = async (path) => {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Content konnte nicht geladen werden: ${path} (${response.status})`);
        return response.json();
    };

    const getNavOffset = () => (document.querySelector(SELECTORS.nav)?.offsetHeight || 0) + 14;

    const scrollToHashTarget = (hash, behavior = 'smooth') => {
        if (!hash || hash === '#') return false;
        const id = decodeURIComponent(String(hash).replace(/^#/, ''));
        const aliases = { wettkampf: 'performance', 'testimonials-krafttraining': 'kundenfeedback', 'testimonials-ganzheitlich': 'kundenfeedback' };
        const resolvedId = aliases[id] || id;
        let target = document.getElementById(resolvedId);
        if (resolvedId === 'performance' && window.matchMedia('(max-width: 767px)').matches) {
            target = target?.querySelector('.coaching-card__intro') || target;
        }
        if (!target) return false;
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - getNavOffset());
        window.scrollTo({ top, behavior });
        return true;
    };

    const initScrollRestoration = () => {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

        const navigationEntry = performance.getEntriesByType?.('navigation')?.[0] || null;
        const isReload = navigationEntry?.type === 'reload';
        const hasHash = () => Boolean(window.location.hash && window.location.hash !== '#');

        const forceTop = () => {
            if (hasHash()) return;
            const scrollingElement = document.scrollingElement || document.documentElement;
            scrollingElement.scrollTop = 0;
            document.body.scrollTop = 0;
            window.scrollTo(0, 0);
        };

        if (isReload && !hasHash()) {
            forceTop();
            requestAnimationFrame(forceTop);
        }

        window.addEventListener('pageshow', () => {
            if (isReload && !hasHash()) forceTop();
        });

        window.addEventListener('beforeunload', () => {
            if (!hasHash()) window.scrollTo(0, 0);
        });
    };

    const realignInitialHashTarget = () => {
        if (!window.location.hash) return;
        const align = () => scrollToHashTarget(window.location.hash, 'auto');
        align();
        requestAnimationFrame(align);
        [260, 650, 1100].forEach((delay) => window.setTimeout(align, delay));
    };

    const initAnchorNavigation = () => {
        document.addEventListener('click', (event) => {
            const anchor = event.target.closest('a[href^="#"]');
            if (!anchor) return;
            const hash = anchor.getAttribute('href');
            if (!hash || hash === '#' || !document.getElementById(decodeURIComponent(hash.slice(1)))) return;

            event.preventDefault();
            scrollToHashTarget(hash, 'smooth');
            history.replaceState(null, '', window.location.pathname + window.location.search);
        });

        window.addEventListener('hashchange', () => {
            window.setTimeout(() => scrollToHashTarget(window.location.hash, 'auto'), 0);
        });
    };

    const initNavigation = () => {
        const nav = document.querySelector(SELECTORS.nav);
        const menu = document.querySelector(SELECTORS.menu);
        const button = document.querySelector(SELECTORS.menuButton);
        if (!nav) return;

        // Pages without the animated homepage hero always use the solid navigation.
        // On the homepage, initHeroNavigation drives the background continuously instead.
        nav.classList.toggle('site-nav--scrolled', !document.querySelector('.hero'));

        if (!menu || !button) return;

        const setOpen = (open) => {
            menu.classList.toggle('is-open', open);
            menu.inert = !open;
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.documentElement.classList.toggle('menu-open', open);
        };

        button.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
        menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setOpen(false);
        });
    };

    const initHeroNavigation = () => {
        const hero = document.querySelector('.hero');
        const nav = document.querySelector(SELECTORS.nav);
        if (!hero || !nav) return;

        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let framePending = false;

        const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
        const ease = (value) => value * value * (3 - (2 * value));

        const update = () => {
            framePending = false;
            const transitionEnd = clamp(window.innerHeight * 0.2, 130, 190);
            const rawProgress = clamp((window.scrollY - 10) / transitionEnd);
            const progress = reducedMotionQuery.matches
                ? (rawProgress >= 0.5 ? 1 : 0)
                : ease(rawProgress);
            nav.style.setProperty('--nav-background-alpha', (progress * 0.96).toFixed(3));
            nav.style.setProperty('--nav-border-alpha', (progress * 0.14).toFixed(3));
            nav.style.setProperty('--nav-blur', `${(progress * 13).toFixed(2)}px`);
            nav.style.setProperty('--nav-saturation', `${(100 + (progress * 25)).toFixed(1)}%`);
        };

        const requestUpdate = () => {
            if (framePending) return;
            framePending = true;
            requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
        reducedMotionQuery.addEventListener?.('change', requestUpdate);
    };

    let revealObserver;
    const observeReveals = () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion || !('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
            return;
        }

        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('is-visible');
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
        }

        document.querySelectorAll('.reveal:not([data-reveal-observed])').forEach((element) => {
            element.dataset.revealObserved = 'true';
            revealObserver.observe(element);
        });
    };

    const renderApproach = (data, prefix) => {
        const copy = document.getElementById(`${prefix}-copy`);
        if (!copy || !data) return;

        copy.innerHTML = '';
        copy.appendChild(createElement('p', 'section-kicker', data.eyebrow || ''));
        copy.appendChild(createElement('h2', '', data.title || ''));
        copy.appendChild(createElement('p', 'approach-lead', data.lead || ''));

        const allParagraphs = data.paragraphs || [];
        const previewCount = Math.max(1, Number(data.preview_count || 1));
        const paragraphs = createElement('div', 'approach-paragraphs');
        allParagraphs.slice(0, previewCount).forEach((text) => paragraphs.appendChild(appendFormattedText(createElement('p'), text)));
        copy.appendChild(paragraphs);

        if (allParagraphs.length > previewCount) {
            const disclosure = createElement('details', 'approach-disclosure content-disclosure');
            const summary = createElement('summary', '', 'Mehr anzeigen');
            const expanded = createElement('div', 'content-disclosure__body');
            allParagraphs.slice(previewCount).forEach((text) => expanded.appendChild(appendFormattedText(createElement('p'), text)));
            disclosure.appendChild(summary);
            disclosure.appendChild(expanded);
            disclosure.addEventListener('toggle', () => {
                summary.textContent = disclosure.open ? 'Weniger anzeigen' : 'Mehr anzeigen';
            });
            copy.appendChild(disclosure);
        }

        const image = document.getElementById(`${prefix}-image`);
        if (image) {
            image.src = versionAssetPath(data.image || image.getAttribute('src'));
            image.alt = data.image_alt || '';
        }
    };

    const renderOffers = (data) => {
        const root = document.getElementById('offers-root');
        if (!root) return;
        root.innerHTML = '';
        const disclosures = [];
        (data?.items || []).forEach((offer, index) => {
            const accent = offer.accent === 'blue' ? 'blue' : 'red';
            const card = createElement('article', `coaching-card coaching-card--${accent} reveal`);
            card.id = offer.id || `coaching-${index + 1}`;

            const media = createElement('div', 'coaching-card__media');
            const image = createElement('img');
            image.src = versionAssetPath(offer.image || '');
            image.alt = offer.title || 'Coaching';
            image.loading = 'lazy';
            image.decoding = 'async';
            if (offer.image_position) image.style.objectPosition = offer.image_position;
            media.appendChild(image);

            const body = createElement('div', 'coaching-card__intro');
            body.appendChild(createElement('span', 'coaching-card__number', `0${index + 1}`));
            body.appendChild(createElement('h3', '', offer.title || ''));
            body.appendChild(createElement('p', 'coaching-card__tagline', offer.tagline || ''));
            body.appendChild(createElement('p', 'coaching-card__summary', offer.summary || ''));

            const allServices = offer.details?.left_list || [];
            const previewServices = createElement('ul', 'coaching-list coaching-list--preview');
            allServices.slice(0, 2).forEach((item) => {
                const listItem = createElement('li');
                listItem.appendChild(createElement('strong', '', `${item.title || ''}: `));
                listItem.appendChild(document.createTextNode(item.text || ''));
                previewServices.appendChild(listItem);
            });
            const disclosure = createElement('details', 'coaching-card__disclosure');
            disclosure.id = `services-${card.id}`;
            const summary = createElement('summary', '', 'Weitere Leistungen anzeigen');
            summary.setAttribute('aria-expanded', 'false');
            disclosure.appendChild(summary);
            const details = createElement('div', 'coaching-card__details');
            details.appendChild(createElement('p', '', offer.details?.left_heading || 'Das bekommst du:'));

            const list = createElement('ul', 'coaching-list');
            allServices.slice(2).forEach((item) => {
                const listItem = createElement('li');
                const strong = createElement('strong', '', `${item.title || ''}: `);
                listItem.appendChild(strong);
                listItem.appendChild(document.createTextNode(item.text || ''));
                list.appendChild(listItem);
            });
            details.appendChild(list);
            disclosure.appendChild(details);
            disclosures.push(disclosure);
            summary.addEventListener('click', (event) => {
                event.preventDefault();
                const open = !disclosure.open;
                disclosures.forEach((entry) => {
                    entry.open = open;
                    const toggle = entry.querySelector('summary');
                    toggle.textContent = open ? 'Leistungen schließen' : 'Weitere Leistungen anzeigen';
                    toggle.setAttribute('aria-expanded', String(open));
                });
                // On phones, expanding Lifestyle also moves Performance below it.
                // Align only after both height changes; desktop remains untouched.
                if (card.id === 'performance' && window.matchMedia('(max-width: 767px)').matches) {
                    requestAnimationFrame(() => scrollToHashTarget('#performance', 'instant'));
                }
            });

            const action = createElement('a', `button button--${accent}`,'Kontakt aufnehmen');
            action.href = '#kontakt';
            action.classList.add('coaching-card__action');
            card.appendChild(media);
            card.appendChild(body);
            card.appendChild(previewServices);
            card.appendChild(disclosure);
            card.appendChild(action);
            root.appendChild(card);
        });
        disclosures.forEach((entry) => entry.querySelector('summary').setAttribute('aria-controls', disclosures.map((item) => item.id).join(' ')));
    };

    const feedbackName = (item) => String(item.name || '').trim().split(/\s+/)[0];

    const prioritizeTestimonials = (items) => [...(items || [])].sort((first, second) =>
        Number(second.priority || 0) - Number(first.priority || 0));

    const buildFeedbackResult = (item, detail = false) => {
        const text = detail ? (item.result_detail || item.result) : item.result;
        const results = String(text || '').split(/\r?\n/).map((line) => line.trim().replace(/^[–•]\s*/, '')).filter(Boolean);
        if (!results.length) return null;
        const result = createElement('p', 'testimonial-card__result');
        results.slice(0, 1).forEach((line) => result.appendChild(createElement('span', 'testimonial-card__result-line', `• ${line}`)));
        return result;
    };

    const buildTestimonialCard = (testimonial) => {
        const card = createElement('article', 'testimonial-card');
        const header = createElement('div', 'testimonial-card__header');
        const image = createElement('img');
        image.src = versionAssetPath(testimonial.image || 'assets/img/Logo-LS_Coaching_white-coloured.png');
        image.alt = feedbackName(testimonial) || 'Kundenfeedback';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.style.objectPosition = testimonial.image_position || 'center center';
        if (testimonial.image_placeholder) image.classList.add('is-placeholder');
        header.appendChild(image);
        const identity = createElement('div', 'testimonial-card__identity');
        identity.appendChild(createElement('h3', '', feedbackName(testimonial)));
        const result = buildFeedbackResult(testimonial);
        if (result) identity.appendChild(result);
        header.appendChild(identity);
        card.appendChild(header);
        card.appendChild(createElement('blockquote', '', testimonial.quote ? `„${testimonial.quote}“` : ''));
        const more = createElement('a', 'testimonial-card__more text-link', 'Mehr anzeigen');
        more.href = versionPagePath(`kundenfeedback.html#feedback-${slugify(feedbackName(testimonial))}`);
        more.setAttribute('aria-label', `Kundenfeedback von ${feedbackName(testimonial)} vollständig lesen`);
        card.appendChild(more);
        return card;
    };

    const renderTestimonials = (data) => {
        const items = prioritizeTestimonials(data?.items);
        document.querySelectorAll('[data-testimonial-track]').forEach((track) => {
            track.innerHTML = '';
            const category = track.dataset.testimonialCategory || '';
            const visibleItems = category
                ? items.filter((item) => (item.category || 'krafttraining') === category)
                : items;
            if (!visibleItems.length) {
                track.appendChild(createElement('p', 'testimonial-card', 'Weiteres Kundenfeedback ist in Vorbereitung.'));
                return;
            }

            // Five identical sets provide enough buffer for continuous swiping in
            // both directions while the viewport is silently recentered.
            for (let copy = 0; copy < 5; copy += 1) {
                const set = createElement('div', 'testimonial-set');
                set.setAttribute('aria-hidden', copy === 2 ? 'false' : 'true');
                visibleItems.forEach((item) => set.appendChild(buildTestimonialCard(item)));
                if (copy !== 2) set.querySelectorAll('a').forEach((link) => link.tabIndex = -1);
                track.appendChild(set);
            }
        });
    };

    const initTestimonialCarousels = () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        document.querySelectorAll('[data-testimonial-carousel]').forEach((carousel) => {
            const track = carousel.querySelector('[data-testimonial-track]');
            const firstSet = track?.querySelector('.testimonial-set');
            if (!track || !firstSet || track.dataset.initialized === 'true') return;
            track.dataset.initialized = 'true';
            let userPaused = reducedMotion;
            const pauseButton = document.querySelector('[data-testimonial-pause]');
            const syncPauseButton = () => {
                track.dataset.autoplay = userPaused ? 'paused' : 'running';
                if (!pauseButton) return;
                pauseButton.textContent = userPaused ? 'Animation starten' : 'Animation pausieren';
                pauseButton.setAttribute('aria-pressed', String(userPaused));
            };
            syncPauseButton();
            pauseButton?.addEventListener('click', () => { userPaused = !userPaused; syncPauseButton(); });

            let interactingUntil = 0;
            let isDragging = false;
            let isPointerDown = false;
            let dragAxis = null;
            let pointerId = null;
            let startX = 0;
            let startY = 0;
            let startPhase = 0;
            let phase = 0;
            let measuredLoopWidth = 0;
            let lastAutoTick = performance.now();
            let pixelRemainder = 0;

            const pause = (duration = 700) => {
                interactingUntil = performance.now() + duration;
            };

            const gap = () => parseFloat(getComputedStyle(track).gap) || 0;
            const loopWidth = () => firstSet.getBoundingClientRect().width + gap();

            const wrapPhase = (value, width = measuredLoopWidth) => {
                if (width <= 1) return 0;
                return ((value % width) + width) % width;
            };

            const applyPosition = () => {
                if (measuredLoopWidth <= 1) return;
                phase = wrapPhase(phase);
                const offset = (measuredLoopWidth * 2) + phase;
                track.style.transform = `translate3d(${-offset}px, 0, 0)`;
            };

            const refreshGeometry = () => {
                const previousWidth = measuredLoopWidth;
                const nextWidth = loopWidth();
                if (nextWidth <= 1) return;
                const progress = previousWidth > 1 ? phase / previousWidth : 0;
                measuredLoopWidth = nextWidth;
                phase = progress * measuredLoopWidth;
                applyPosition();
            };

            refreshGeometry();
            carousel.addEventListener('focusin', (event) => {
                const card = event.target.closest('.testimonial-card');
                // Do not move a link between pointer-down and pointer-up.
                if (!card || !event.target.matches(':focus-visible')) return;
                const index = [...card.parentElement.children].indexOf(card);
                phase = index * (card.getBoundingClientRect().width + gap());
                carousel.scrollLeft = 0;
                applyPosition();
            });
            carousel.addEventListener('keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                event.preventDefault();
                pause(2500);
                phase += (event.key === 'ArrowRight' ? 1 : -1) * (firstSet.querySelector('.testimonial-card').getBoundingClientRect().width + gap());
                applyPosition();
            });

            carousel.addEventListener('wheel', (event) => {
                const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.1;
                if (!horizontalIntent) return;
                event.preventDefault();
                pause(850);
                phase += event.deltaX;
                applyPosition();
            }, { passive: false });

            carousel.addEventListener('pointerdown', (event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (event.target.closest('a, button')) return;
                isPointerDown = true;
                isDragging = event.pointerType === 'mouse';
                dragAxis = isDragging ? 'horizontal' : null;
                pointerId = event.pointerId;
                startX = event.clientX;
                startY = event.clientY;
                startPhase = phase;
                if (isDragging) {
                    pause(850);
                    track.classList.add('is-dragging');
                    carousel.setPointerCapture?.(event.pointerId);
                }
            });

            carousel.addEventListener('pointermove', (event) => {
                if (!isPointerDown || event.pointerId !== pointerId) return;
                const deltaX = event.clientX - startX;
                const deltaY = event.clientY - startY;
                if (!dragAxis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6) {
                    dragAxis = Math.abs(deltaX) > Math.abs(deltaY) * 1.05 ? 'horizontal' : 'vertical';
                    if (dragAxis === 'horizontal') {
                        isDragging = true;
                        pause(850);
                        track.classList.add('is-dragging');
                        carousel.setPointerCapture?.(event.pointerId);
                    }
                }
                if (dragAxis !== 'horizontal') return;
                event.preventDefault();
                phase = startPhase - (deltaX * 1.15);
                applyPosition();
            });

            const endDrag = (event) => {
                if (!isPointerDown || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
                const hadHorizontalDrag = isDragging;
                isPointerDown = false;
                isDragging = false;
                dragAxis = null;
                pointerId = null;
                track.classList.remove('is-dragging');
                if (hadHorizontalDrag) pause(550);
            };
            carousel.addEventListener('pointerup', endDrag);
            carousel.addEventListener('pointercancel', endDrag);
            carousel.addEventListener('lostpointercapture', endDrag);

            const autoplay = (timestamp) => {
                const deltaTime = Math.min(64, timestamp - lastAutoTick);
                lastAutoTick = timestamp;
                if (!document.hidden && !userPaused && !isPointerDown && !carousel.contains(document.activeElement) && timestamp >= interactingUntil) {
                    const baseSpeed = window.innerWidth < 768 ? 46 : 58;
                    const speed = baseSpeed;
                    pixelRemainder += speed * deltaTime / 1000;
                    const pixels = Math.floor(pixelRemainder);
                    if (pixels > 0) {
                        pixelRemainder -= pixels;
                        phase += pixels;
                        applyPosition();
                    }
                }
                requestAnimationFrame(autoplay);
            };
            requestAnimationFrame(autoplay);

            document.addEventListener('visibilitychange', () => {
                lastAutoTick = performance.now();
            });

            window.addEventListener('resize', refreshGeometry, { passive: true });
            document.fonts?.ready.then(refreshGeometry);
        });
    };

    const messengerIcon = (type) => {
        if (type === 'whatsapp') {
            return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2.05 22l5.25-1.5A9.93 9.93 0 1 0 12.04 2Zm0 17.98a8.04 8.04 0 0 1-4.1-1.12l-.29-.17-3.12.89.91-3.03-.19-.31a8 8 0 1 1 6.79 3.74Zm4.4-6.03c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.23 7.23 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z"/></svg>';
        }
        return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.67 2.36a1.2 1.2 0 0 0-1.22-.2L2.9 8.94c-1.2.47-1.18 1.18-.22 1.48l4.5 1.4 1.73 5.43c.21.59.1.82.72.82.48 0 .7-.22.97-.48l2.16-2.1 4.5 3.33c.83.46 1.43.22 1.64-.77l2.96-13.97c.3-1.22-.47-1.77-.19-1.72ZM8.9 11.5l8.78-5.54c.44-.27.85-.13.52.17l-7.25 6.55-.28 3.02-1.77-4.2Z"/></svg>';
    };

    const createMessengerButton = (type, url, fallback) => {
        const directUrl = String(url || '').trim();
        const anchor = createElement('a', `button messenger-button messenger-button--${type}`);
        const fallbackUrl = String(fallback || '').trim();
        if (directUrl || fallbackUrl) anchor.href = directUrl || fallbackUrl;
        anchor.innerHTML = `${messengerIcon(type)}<span>${type === 'whatsapp' ? 'WhatsApp Kontakt' : 'Telegram Kontakt'}</span>`;
        if (directUrl) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        } else {
            anchor.classList.add('is-disabled');
            anchor.setAttribute('aria-disabled', 'true');
            anchor.title = 'Direkter Messenger-Link folgt.';
        }
        return anchor;
    };

    const renderContactSections = (contact) => {
        document.querySelectorAll('[data-contact-title]').forEach((element) => { element.textContent = contact?.title || ''; });
        document.querySelectorAll('[data-contact-text]').forEach((element) => { element.textContent = contact?.text || ''; });
        document.querySelectorAll('[data-contact-actions]').forEach((root) => {
            root.innerHTML = '';
            root.appendChild(createMessengerButton('whatsapp', contact?.whatsapp_url, contact?.fallback_anchor));
            root.appendChild(createMessengerButton('telegram', contact?.telegram_url, contact?.fallback_anchor));
        });
    };

    const renderFaq = (data) => {
        const root = document.getElementById('faq-root');
        if (!root) return;
        root.innerHTML = '';

        const groups = [
            {
                title: data?.training?.title || 'FAQ Krafttraining',
                items: data?.training?.items || data?.items || [],
                className: 'faq-column--training',
            },
            {
                title: data?.holistic?.title || 'FAQ Ganzheitliches Coaching',
                items: data?.holistic?.items || [],
                className: 'faq-column--holistic',
            },
        ];

        groups.forEach((group) => {
            const column = createElement('section', `faq-column ${group.className}`);
            column.appendChild(createElement('h3', '', group.title));
            const list = createElement('div', 'faq-list');
            if (!group.items.length) {
                list.appendChild(createElement('p', 'faq-placeholder', 'Fragen und Antworten folgen in Kürze.'));
            } else {
                group.items.forEach((item) => {
                    const details = createElement('details', 'faq-item');
                    details.appendChild(createElement('summary', '', item.question || ''));
                    details.appendChild(createElement('p', '', item.answer || ''));
                    list.appendChild(details);
                });
            }
            column.appendChild(list);
            root.appendChild(column);
        });
    };

    const renderGallery = (items, rootId = 'gallery-root') => {
        const root = document.getElementById(rootId);
        if (!root || !items?.length) return;
        root.innerHTML = '';

        let activeIndex = 0;
        const stage = createElement('div', 'gallery-stage');
        const imageButton = createElement('button', 'gallery-image-button');
        imageButton.type = 'button';
        imageButton.setAttribute('aria-label', 'Nächstes Bild anzeigen');
        const image = createElement('img');
        image.loading = 'lazy';
        image.decoding = 'async';
        imageButton.appendChild(image);
        stage.appendChild(imageButton);

        const previous = createElement('button', 'gallery-arrow gallery-arrow--prev', '‹');
        previous.type = 'button';
        previous.setAttribute('aria-label', 'Vorheriges Bild');
        const next = createElement('button', 'gallery-arrow gallery-arrow--next', '›');
        next.type = 'button';
        next.setAttribute('aria-label', 'Nächstes Bild');
        stage.appendChild(previous);
        stage.appendChild(next);

        const status = createElement('div', 'sr-only');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
        const dots = createElement('div', 'gallery-dots');
        const dotButtons = items.map((item, index) => {
            const dot = createElement('button', 'gallery-dot');
            dot.type = 'button';
            dot.setAttribute('aria-label', `Bild ${index + 1} anzeigen`);
            dot.addEventListener('click', () => show(index));
            dots.appendChild(dot);
            return dot;
        });
        const show = (index) => {
            activeIndex = (index + items.length) % items.length;
            image.src = versionAssetPath(items[activeIndex].image || '');
            image.alt = items[activeIndex].alt || '';
            image.style.objectPosition = items[activeIndex].image_position || 'center center';
            image.style.objectFit = items[activeIndex].image_fit || 'cover';
            image.style.height = items[activeIndex].image_fit === 'contain' ? 'auto' : '';
            dotButtons.forEach((dot, dotIndex) => {
                const active = dotIndex === activeIndex;
                dot.classList.toggle('is-active', active);
                dot.setAttribute('aria-current', active ? 'true' : 'false');
            });
            status.textContent = `Bild ${activeIndex + 1} von ${items.length}`;
        };
        imageButton.addEventListener('click', () => show(activeIndex + 1));
        previous.addEventListener('click', () => show(activeIndex - 1));
        next.addEventListener('click', () => show(activeIndex + 1));
        stage.addEventListener('keydown', (event) => {
            if (['ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
            if (event.key === 'ArrowLeft') show(activeIndex - 1);
            if (event.key === 'ArrowRight') show(activeIndex + 1);
        });

        stage.appendChild(dots);
        root.appendChild(stage);
        root.appendChild(status);
        show(0);
    };

    const renderHolistic = (data) => {
        if (!data) return;
        const eyebrow = document.getElementById('holistic-eyebrow');
        const title = document.getElementById('holistic-title');
        const lead = document.getElementById('holistic-lead');
        const copy = document.getElementById('holistic-copy');
        const expanded = document.getElementById('holistic-expanded');

        if (eyebrow) eyebrow.textContent = data.eyebrow || '';
        if (title) title.textContent = data.title || '';
        if (lead) lead.textContent = data.lead || '';
        const allParagraphs = [...(data.intro || []), ...(data.expanded || [])];
        const requestedVisibleCount = Number(data.visible_paragraph_count || data.intro?.length || 1);
        const visibleCount = Math.min(allParagraphs.length, Math.max(2, requestedVisibleCount));
        const visibleParagraphs = allParagraphs.slice(0, visibleCount);
        const remainingParagraphs = allParagraphs.slice(visibleCount);
        if (copy) {
            renderCopyBlocks(copy, visibleParagraphs);
        }
        if (expanded) {
            renderCopyBlocks(expanded, remainingParagraphs);
        }
        const gallery = data.gallery || [];
        renderGallery(gallery, 'holistic-gallery');

        const disclosure = document.getElementById('holistic-details');
        const summary = disclosure?.querySelector('summary');
        if (disclosure) disclosure.hidden = remainingParagraphs.length === 0;
        if (disclosure && summary && !disclosure.dataset.toggleBound) {
            disclosure.dataset.toggleBound = 'true';
            const syncDisclosureLayout = () => {
                summary.textContent = disclosure.open ? 'Weniger anzeigen' : 'Mehr anzeigen';
            };
            disclosure.addEventListener('toggle', syncDisclosureLayout);
            syncDisclosureLayout();
        }
    };

    const renderTopics = (data) => {
        const root = document.getElementById('topics-root');
        const eyebrow = document.getElementById('topics-eyebrow');
        const title = document.getElementById('topics-title');
        const subline = document.getElementById('topics-subline');
        if (!root) return;
        if (eyebrow) eyebrow.textContent = data?.eyebrow || '';
        if (title) title.textContent = data?.title || '';
        if (subline) subline.textContent = data?.subline || '';
        root.innerHTML = '';

        (data?.items || []).forEach((item) => {
            const card = createElement('article', 'topic-card reveal');
            const media = createElement('div', 'topic-card__image');
            const image = createElement('img');
            image.src = versionAssetPath(item.image || '');
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            if (item.dark_image) {
                const picture = createElement('picture', 'topic-card__picture');
                const darkSource = createElement('source');
                darkSource.media = '(prefers-color-scheme: dark)';
                darkSource.srcset = versionAssetPath(item.dark_image);
                picture.appendChild(darkSource);
                picture.appendChild(image);
                media.appendChild(picture);
            } else {
                media.appendChild(image);
            }
            card.appendChild(media);
            const copy = createElement('div', 'topic-card__copy');
            copy.appendChild(createElement('p', 'topic-card__subtitle', item.subtitle || ''));
            copy.appendChild(createElement('h3', '', item.title || ''));
            copy.appendChild(createElement('p', 'topic-card__text', item.text || ''));
            card.appendChild(copy);
            root.appendChild(card);
        });
    };

    const renderSiteContent = (site) => {
        const heroHeadline = document.getElementById('hero-headline');
        if (heroHeadline && site?.hero?.headline) {
            const parts = site.hero.headline.split(' oder ');
            const firstLine = parts.shift();
            const remainingWords = parts.join(' oder ').trim().split(/\s+/).filter(Boolean);
            heroHeadline.textContent = parts.length || remainingWords.length ? `${firstLine} oder` : firstLine;
            if (remainingWords.length) {
                const finalWord = remainingWords.pop();
                heroHeadline.appendChild(document.createElement('br'));
                heroHeadline.appendChild(createElement('span', '', remainingWords.join(' ')));
                heroHeadline.appendChild(document.createElement('br'));
                heroHeadline.appendChild(createElement('span', '', finalWord));
            }
        }
        const kicker = document.getElementById('hero-kicker');
        const subline = document.getElementById('hero-subline');
        if (kicker) kicker.textContent = site?.hero?.kicker || '';
        if (subline) subline.textContent = site?.hero?.subline || '';

        renderApproach(site?.philosophy, 'philosophy');
        renderApproach(site?.methodology, 'methodology');
        renderContactSections(site?.contact || {});
        renderFaq(site?.faq || {});
        renderHolistic(site?.holistic || {});
        renderTopics(site?.topics || {});
    };

    const renderTestimonialDetails = (data) => {
        const root = document.getElementById('testimonial-detail-root');
        if (!root) return;
        root.innerHTML = '';
        const items = prioritizeTestimonials(data?.items);
        const categories = [
            {key: 'lifestyle', title: 'Lifestyle Coaching'},
            {key: 'performance', title: 'Performance Coaching'},
            {key: 'ganzheitlich', title: 'Ganzheitliches Coaching'}
        ];
        categories.forEach((categoryGroup) => {
            const categoryItems = items.filter((item) => item.category === categoryGroup.key);
            if (!categoryItems.length) return;
            const group = createElement('section', `testimonial-detail-group testimonial-detail-group--${categoryGroup.key}`);
            group.appendChild(createElement('h2', 'testimonial-detail-group__title', categoryGroup.title));
            const list = createElement('div', 'testimonial-detail-group__list');
            categoryItems.forEach((item) => {
                const article = createElement('article', 'testimonial-detail');
                article.id = `feedback-${slugify(feedbackName(item))}`;
                const media = createElement('div', 'testimonial-detail__media');
                const image = createElement('img');
                image.src = versionAssetPath(item.image || 'assets/img/Logo-LS_Coaching_white-coloured.png');
                image.alt = feedbackName(item) || 'Kundenfeedback';
                image.loading = 'lazy';
                image.decoding = 'async';
                image.style.objectPosition = item.image_position || 'center center';
                if (item.image_placeholder) image.classList.add('is-placeholder');
                media.appendChild(image);
                const copy = createElement('div', 'testimonial-detail__copy');
                copy.appendChild(createElement('p', 'section-kicker', categoryGroup.title));
                copy.appendChild(createElement('h2', '', feedbackName(item)));
                const result = buildFeedbackResult(item, true);
                if (result) copy.appendChild(result);
                copy.appendChild(createElement('blockquote', '', item.long_text || item.quote || ''));
                article.appendChild(media);
                article.appendChild(copy);
                list.appendChild(article);
            });
            group.appendChild(list);
            root.appendChild(group);
        });
        // Tall feedback text scrolls naturally before sticking at its lower edge.
        const updateSticky = () => root.querySelectorAll('.testimonial-detail__copy').forEach((copy) => {
            copy.style.setProperty('--feedback-sticky-top', `${Math.min(getNavOffset() + 10, window.innerHeight - copy.offsetHeight - 24)}px`);
        });
        updateSticky();
        window.addEventListener('resize', updateSticky, {passive: true});
        document.fonts?.ready.then(updateSticky);
        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(updateSticky);
            root.querySelectorAll('.testimonial-detail__copy').forEach((copy) => observer.observe(copy));
        }
    };

    const renderAboutPage = (data) => {
        const root = document.getElementById('about-page-text');
        if (!root || !data) return;
        root.innerHTML = '';
        root.appendChild(createElement('p', '', data.teaser || ''));
        root.appendChild(createElement('p', 'about-page-copy__highlight', data.highlight || ''));
        (data.hidden_paragraphs || []).forEach((text) => root.appendChild(createElement('p', '', text)));
        root.appendChild(createElement('p', 'about-page-copy__highlight', data.closing || ''));
    };

    const renderBlog = (data) => {
        const root = document.getElementById('blog-root');
        if (!root) return;
        root.innerHTML = '';

        (data?.items || []).forEach((item, index) => {
            const card = createElement('article', 'blog-card reveal');
            card.appendChild(createElement('p', 'section-kicker', item.category || `Artikel ${String(index + 1).padStart(2, '0')}`));
            card.appendChild(createElement('h2', '', item.title || ''));
            card.appendChild(createElement('p', '', item.excerpt || ''));

            const hasArticle = Boolean(item.published && item.body?.length);
            if (hasArticle) {
                const link = createElement('a', 'blog-card__link', 'Artikel lesen');
                link.href = versionPagePath(`artikel.html?id=${encodeURIComponent(item.id || '')}`);
                card.appendChild(link);
            } else {
                card.appendChild(createElement('span', 'blog-card__status', 'In Vorbereitung'));
            }
            root.appendChild(card);
        });
    };

    const renderArticle = (data) => {
        const root = document.getElementById('article-root');
        if (!root) return;
        const id = new URLSearchParams(window.location.search).get('id');
        const item = (data?.items || []).find((entry) => entry.id === id && entry.published);
        root.innerHTML = '';

        if (!item) {
            const header = createElement('header', 'content-page__intro');
            header.appendChild(createElement('p', 'section-kicker', 'Blog'));
            header.appendChild(createElement('h1', '', 'Artikel in Vorbereitung'));
            header.appendChild(createElement('p', '', 'Dieser Beitrag ist noch nicht veröffentlicht.'));
            const back = createElement('a', 'button button--ghost', 'Zur Blogübersicht');
            back.href = versionPagePath('blog.html');
            header.appendChild(back);
            root.appendChild(header);
            return;
        }

        const header = createElement('header', 'content-page__intro');
        header.appendChild(createElement('p', 'section-kicker', item.category || 'Artikel'));
        header.appendChild(createElement('h1', '', item.title || ''));
        header.appendChild(createElement('p', '', item.excerpt || ''));
        root.appendChild(header);

        if (item.image) {
            const image = createElement('img', 'article-page__image');
            image.src = versionAssetPath(item.image);
            image.alt = item.title || '';
            image.loading = 'lazy';
            image.decoding = 'async';
            root.appendChild(image);
        }

        const body = createElement('div', 'article-page__body');
        (item.body || []).forEach((paragraph) => body.appendChild(createElement('p', '', paragraph)));
        root.appendChild(body);
    };

    const initWaitlistForm = () => {
        const form = document.getElementById('waitlist-form');
        if (!form) return;

        const nameInput = document.getElementById('waitlist-name');
        const emailInput = document.getElementById('waitlist-email');
        const instagramInput = document.getElementById('waitlist-instagram');
        const messageInput = document.getElementById('waitlist-message');
        const privacyInput = document.getElementById('waitlist-privacy');
        const honeyInput = document.getElementById('waitlist-website');
        const submitButton = document.getElementById('waitlist-submit');
        const status = document.getElementById('waitlist-status');
        if (!nameInput || !emailInput || !instagramInput || !messageInput || !privacyInput || !submitButton || !status) return;

        const setStatus = (text, tone) => {
            status.textContent = text || '';
            status.className = 'contact-form__status';
            if (tone) status.classList.add(`is-${tone}`);
        };

        const syncContactValidity = () => {
            const valid = emailInput.value.trim() || instagramInput.value.trim();
            const message = valid ? '' : 'Bitte gib eine E-Mail-Adresse oder einen Instagram-Tag an.';
            emailInput.setCustomValidity(message);
            instagramInput.setCustomValidity(message);
        };

        emailInput.addEventListener('input', syncContactValidity);
        instagramInput.addEventListener('input', syncContactValidity);
        syncContactValidity();

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            syncContactValidity();
            if (!form.reportValidity()) return;

            submitButton.disabled = true;
            submitButton.style.opacity = '0.65';
            setStatus('Anfrage wird gesendet ...');

            try {
                const response = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        instagram: instagramInput.value.trim(),
                        message: messageInput.value.trim(),
                        privacyAccepted: privacyInput.checked,
                        website: honeyInput?.value.trim() || '',
                    }),
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.ok) throw new Error(result.message || 'Senden fehlgeschlagen.');

                form.reset();
                syncContactValidity();
                setStatus(result.message || 'Danke! Deine Anfrage ist eingegangen.', 'success');
            } catch (error) {
                setStatus(error.message || 'Technischer Fehler. Bitte versuche es später erneut.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.style.opacity = '';
            }
        });
    };

    const loadPageContent = async () => {
        const tasks = [];

        if (document.getElementById('offers-root')) {
            tasks.push(loadJson('content/offers.json').then(renderOffers));
        }

        if (document.querySelector('[data-testimonial-track]') || document.getElementById('testimonial-detail-root')) {
            tasks.push(loadJson('content/testimonials.json').then((data) => {
                renderTestimonials(data);
                renderTestimonialDetails(data);
            }));
        }

        if (document.getElementById('philosophy-copy')) {
            tasks.push(loadJson('content/site.json').then(renderSiteContent));
        }

        if (document.getElementById('about-page-text')) {
            tasks.push(loadJson('content/about.json').then(renderAboutPage));
        }

        if (document.getElementById('blog-root') || document.getElementById('article-root')) {
            tasks.push(loadJson('content/blog.json').then((data) => {
                renderBlog(data);
                renderArticle(data);
            }));
        }

        const results = await Promise.allSettled(tasks);
        results.forEach((result) => {
            if (result.status === 'rejected') console.warn(result.reason);
        });

        observeReveals();
        initTestimonialCarousels();
        realignInitialHashTarget();
    };

    document.addEventListener('DOMContentLoaded', () => {
        versionStaticImages();
        initScrollRestoration();
        initAnchorNavigation();
        initNavigation();
        initHeroNavigation();
        observeReveals();
        initWaitlistForm();
        loadPageContent();
    });
})();
