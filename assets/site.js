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
        const target = document.getElementById(id);
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

        const updateScrolledState = () => nav.classList.toggle('site-nav--scrolled', window.scrollY > 18);
        updateScrolledState();
        window.addEventListener('scroll', updateScrolledState, { passive: true });

        if (!menu || !button) return;

        const setOpen = (open) => {
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
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

    const initHeroClaim = () => {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const update = () => {
            const revealAfter = Math.min(140, Math.max(80, window.innerHeight * 0.12));
            hero.classList.toggle('is-claim-visible', window.scrollY >= revealAfter);
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
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

        const paragraphs = createElement('div', 'approach-paragraphs');
        (data.paragraphs || []).forEach((text) => paragraphs.appendChild(createElement('p', '', text)));
        copy.appendChild(paragraphs);

        const image = document.getElementById(`${prefix}-image`);
        if (image) {
            image.src = data.image || image.src;
            image.alt = data.image_alt || '';
        }
    };

    const renderOffers = (data) => {
        const root = document.getElementById('offers-root');
        if (!root) return;
        root.innerHTML = '';

        (data?.items || []).forEach((offer, index) => {
            const accent = offer.accent === 'blue' ? 'blue' : 'red';
            const card = createElement('article', `coaching-card coaching-card--${accent} reveal`);
            card.id = offer.id || `coaching-${index + 1}`;

            const media = createElement('div', 'coaching-card__media');
            const image = createElement('img');
            image.src = offer.image || '';
            image.alt = offer.title || 'Coaching';
            image.loading = 'lazy';
            media.appendChild(image);

            const body = createElement('div', 'coaching-card__body');
            body.appendChild(createElement('span', 'coaching-card__number', `0${index + 1}`));
            body.appendChild(createElement('h3', '', offer.title || ''));
            body.appendChild(createElement('p', 'coaching-card__tagline', offer.tagline || ''));
            body.appendChild(createElement('p', 'coaching-card__summary', offer.summary || ''));

            const disclosure = createElement('details');
            disclosure.appendChild(createElement('summary', '', 'Leistungen anzeigen'));
            const details = createElement('div', 'coaching-card__details');
            details.appendChild(createElement('p', '', offer.details?.left_heading || 'Das bekommst du:'));

            const list = createElement('ul', 'coaching-list');
            (offer.details?.left_list || []).forEach((item) => {
                const listItem = createElement('li');
                const strong = createElement('strong', '', `${item.title || ''}: `);
                listItem.appendChild(strong);
                listItem.appendChild(document.createTextNode(item.text || ''));
                list.appendChild(listItem);
            });
            details.appendChild(list);
            disclosure.appendChild(details);
            body.appendChild(disclosure);

            const action = createElement('a', `button button--${accent}`,'Kontakt aufnehmen');
            action.href = '#kontakt';
            action.style.marginTop = '1.5rem';
            body.appendChild(action);

            card.appendChild(media);
            card.appendChild(body);
            root.appendChild(card);
        });
    };

    const buildTestimonialCard = (testimonial) => {
        const card = createElement('article', 'testimonial-card');
        const header = createElement('div', 'testimonial-card__header');
        const image = createElement('img');
        image.src = testimonial.image || '';
        image.alt = testimonial.name || 'Testimonial';
        image.loading = 'lazy';
        header.appendChild(image);
        header.appendChild(createElement('h3', '', testimonial.name || ''));
        card.appendChild(header);
        card.appendChild(createElement('blockquote', '', testimonial.quote ? `„${testimonial.quote}“` : ''));
        const action = createElement('a', 'testimonial-card__more', 'Mehr anzeigen');
        action.href = `testimonials.html#testimonial-${slugify(testimonial.name)}`;
        action.setAttribute('aria-label', `Ausführliches Testimonial von ${testimonial.name || 'dieser Person'} anzeigen`);
        card.appendChild(action);
        return card;
    };

    const renderTestimonials = (data) => {
        const allItems = data?.items || [];
        document.querySelectorAll('[data-testimonial-track]').forEach((track) => {
            const carousel = track.closest('[data-testimonial-carousel]');
            const start = Number(carousel?.dataset.sliceStart || 0);
            const count = Number(carousel?.dataset.sliceCount || allItems.length);
            const subset = allItems.slice(start, start + count);
            const items = subset.length ? subset : allItems;

            track.innerHTML = '';
            if (!items.length) {
                track.appendChild(createElement('p', 'testimonial-card', 'Weitere Testimonials sind in Vorbereitung.'));
                return;
            }

            for (let copy = 0; copy < 3; copy += 1) {
                const set = createElement('div', 'testimonial-set');
                set.setAttribute('aria-hidden', copy === 1 ? 'false' : 'true');
                if (copy !== 1) set.inert = true;
                items.forEach((item) => set.appendChild(buildTestimonialCard(item)));
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

            let interactingUntil = 0;
            let visible = false;
            let isDragging = false;
            let pointerHovering = false;
            let pointerId = null;
            let startX = 0;
            let startScrollLeft = 0;
            let ignoreScrollUntil = 0;
            let lastAutoTick = performance.now();

            const pause = (duration = 1800) => {
                interactingUntil = performance.now() + duration;
            };

            const markProgrammaticScroll = () => {
                ignoreScrollUntil = performance.now() + 100;
            };

            const gap = () => parseFloat(getComputedStyle(track).gap) || 0;
            const loopWidth = () => firstSet.getBoundingClientRect().width + gap();

            const normalizePosition = () => {
                const width = loopWidth();
                if (width <= 1) return;
                let adjusted = false;
                if (track.scrollLeft >= width * 2) {
                    markProgrammaticScroll();
                    track.scrollLeft -= width;
                    adjusted = true;
                }
                if (track.scrollLeft <= 0) {
                    markProgrammaticScroll();
                    track.scrollLeft += width;
                    adjusted = true;
                }
                return adjusted;
            };

            requestAnimationFrame(() => {
                track.scrollLeft = loopWidth();
            });

            const visibilityObserver = new IntersectionObserver((entries) => {
                visible = entries[0]?.isIntersecting || false;
            }, { threshold: 0.08 });
            visibilityObserver.observe(carousel);

            track.addEventListener('scroll', () => {
                const wasProgrammatic = performance.now() < ignoreScrollUntil;
                normalizePosition();
                if (!wasProgrammatic && !isDragging) pause(1200);
            }, { passive: true });

            track.addEventListener('wheel', (event) => {
                const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.1;
                if (!horizontalIntent) return;
                event.preventDefault();
                pause();
                track.scrollLeft += event.deltaX;
                normalizePosition();
            }, { passive: false });

            track.addEventListener('pointerenter', (event) => {
                if (event.pointerType === 'mouse') pointerHovering = true;
            });

            track.addEventListener('pointerleave', (event) => {
                if (event.pointerType !== 'mouse') return;
                pointerHovering = false;
                pause(700);
            });

            track.addEventListener('click', (event) => {
                const action = event.target.closest('.testimonial-card__more');
                if (!action || action.closest('[inert]')) return;
                event.preventDefault();
                window.location.assign(action.href);
            });

            track.addEventListener('pointerdown', (event) => {
                pause();
                if (event.pointerType !== 'mouse' || event.button !== 0) return;
                if (event.target.closest('a, button')) return;
                isDragging = true;
                pointerId = event.pointerId;
                startX = event.clientX;
                startScrollLeft = track.scrollLeft;
                track.classList.add('is-dragging');
                track.setPointerCapture(event.pointerId);
            });

            track.addEventListener('pointermove', (event) => {
                if (!isDragging || event.pointerId !== pointerId) return;
                track.scrollLeft = startScrollLeft - (event.clientX - startX) * 1.15;
                normalizePosition();
            });

            const endDrag = (event) => {
                if (!isDragging || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
                isDragging = false;
                pointerId = null;
                track.classList.remove('is-dragging');
                pause();
            };
            track.addEventListener('pointerup', endDrag);
            track.addEventListener('pointercancel', endDrag);
            track.addEventListener('lostpointercapture', endDrag);
            track.addEventListener('touchstart', () => pause(1800), { passive: true });

            const autoplay = () => {
                const timestamp = performance.now();
                const deltaTime = Math.min(160, timestamp - lastAutoTick);
                lastAutoTick = timestamp;
                if (!reducedMotion && visible && !isDragging && !pointerHovering && performance.now() >= interactingUntil) {
                    const speed = window.innerWidth < 768 ? 44 : 52;
                    markProgrammaticScroll();
                    track.scrollLeft += speed * deltaTime / 1000;
                    normalizePosition();
                }
            };
            window.setInterval(autoplay, 32);

            let lastWindowY = window.scrollY;
            window.addEventListener('scroll', () => {
                const currentY = window.scrollY;
                const deltaY = currentY - lastWindowY;
                lastWindowY = currentY;
                if (!visible || isDragging || performance.now() < interactingUntil || Math.abs(deltaY) < 1) return;
                markProgrammaticScroll();
                track.scrollLeft += deltaY * (window.innerWidth < 768 ? 0.2 : 0.28);
                normalizePosition();
            }, { passive: true });

            window.addEventListener('resize', () => {
                markProgrammaticScroll();
                track.scrollLeft = loopWidth();
            });
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
        anchor.href = directUrl || fallback || '#kontaktformular';
        anchor.innerHTML = `${messengerIcon(type)}<span>${type === 'whatsapp' ? 'WhatsApp Kontakt' : 'Telegram Kontakt'}</span>`;
        if (directUrl) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        } else {
            anchor.title = 'Direkter Messenger-Link folgt. Anfrageformular öffnen.';
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
        (data?.items || []).forEach((item) => {
            const details = createElement('details', 'faq-item');
            details.appendChild(createElement('summary', '', item.question || ''));
            details.appendChild(createElement('p', '', item.answer || ''));
            root.appendChild(details);
        });
    };

    const renderGallery = (items) => {
        const root = document.getElementById('gallery-root');
        if (!root || !items?.length) return;
        root.innerHTML = '';

        let activeIndex = 0;
        const stage = createElement('div', 'gallery-stage');
        const image = createElement('img');
        image.loading = 'lazy';
        stage.appendChild(image);

        const previous = createElement('button', 'gallery-arrow gallery-arrow--prev', '‹');
        previous.type = 'button';
        previous.setAttribute('aria-label', 'Vorheriges Bild');
        const next = createElement('button', 'gallery-arrow gallery-arrow--next', '›');
        next.type = 'button';
        next.setAttribute('aria-label', 'Nächstes Bild');
        stage.appendChild(previous);
        stage.appendChild(next);

        const thumbs = createElement('div', 'gallery-thumbs');
        const thumbButtons = items.map((item, index) => {
            const button = createElement('button', 'gallery-thumb');
            button.type = 'button';
            button.setAttribute('aria-label', `Bild ${index + 1} anzeigen`);
            const thumb = createElement('img');
            thumb.src = item.image || '';
            thumb.alt = '';
            thumb.loading = 'lazy';
            button.appendChild(thumb);
            thumbs.appendChild(button);
            return button;
        });

        const show = (index) => {
            activeIndex = (index + items.length) % items.length;
            image.style.opacity = '0.35';
            window.setTimeout(() => {
                image.src = items[activeIndex].image || '';
                image.alt = items[activeIndex].alt || '';
                image.style.opacity = '1';
            }, 90);
            thumbButtons.forEach((button, buttonIndex) => {
                button.classList.toggle('is-active', buttonIndex === activeIndex);
                button.setAttribute('aria-current', buttonIndex === activeIndex ? 'true' : 'false');
            });
        };

        thumbButtons.forEach((button, index) => button.addEventListener('click', () => show(index)));
        previous.addEventListener('click', () => show(activeIndex - 1));
        next.addEventListener('click', () => show(activeIndex + 1));
        stage.tabIndex = 0;
        stage.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') show(activeIndex - 1);
            if (event.key === 'ArrowRight') show(activeIndex + 1);
        });

        root.appendChild(stage);
        root.appendChild(thumbs);
        show(0);
    };

    const renderHolistic = (data) => {
        if (!data) return;
        const eyebrow = document.getElementById('holistic-eyebrow');
        const title = document.getElementById('holistic-title');
        const lead = document.getElementById('holistic-lead');
        const copy = document.getElementById('holistic-copy');
        const expanded = document.getElementById('holistic-expanded');
        const image = document.getElementById('holistic-image');

        if (eyebrow) eyebrow.textContent = data.eyebrow || '';
        if (title) title.textContent = data.title || '';
        if (lead) lead.textContent = data.lead || '';
        if (copy) {
            copy.innerHTML = '';
            (data.intro || []).forEach((text) => copy.appendChild(createElement('p', '', text)));
        }
        if (expanded) {
            expanded.innerHTML = '';
            (data.expanded || []).forEach((text) => expanded.appendChild(createElement('p', '', text)));
        }
        if (image) {
            image.src = data.image || image.src;
            image.alt = data.image_alt || '';
        }
        renderGallery(data.gallery || []);
    };

    const renderTopics = (data) => {
        const root = document.getElementById('topics-root');
        const title = document.getElementById('topics-title');
        if (!root) return;
        if (title) title.textContent = data?.title || '';
        root.innerHTML = '';

        (data?.items || []).forEach((item) => {
            const card = createElement('article', 'topic-card reveal');
            const media = createElement('div', 'topic-card__image');
            const image = createElement('img');
            image.src = item.image || '';
            image.alt = '';
            image.loading = 'lazy';
            media.appendChild(image);
            card.appendChild(media);
            card.appendChild(createElement('p', 'topic-card__subtitle', item.subtitle || ''));
            card.appendChild(createElement('h3', '', item.title || ''));
            card.appendChild(createElement('p', 'topic-card__text', item.text || ''));
            root.appendChild(card);
        });
    };

    const renderSiteContent = (site) => {
        const heroKicker = document.getElementById('hero-kicker');
        const heroHeadline = document.getElementById('hero-headline');
        const heroSubline = document.getElementById('hero-subline');
        if (heroKicker) heroKicker.textContent = site?.hero?.kicker || '';
        if (heroHeadline) heroHeadline.textContent = site?.hero?.headline || '';
        if (heroSubline) heroSubline.textContent = site?.hero?.subline || '';

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
        (data?.items || []).forEach((item) => {
            const article = createElement('article', 'testimonial-detail reveal');
            article.id = `testimonial-${slugify(item.name)}`;
            const media = createElement('div', 'testimonial-detail__media');
            const image = createElement('img');
            image.src = item.image || '';
            image.alt = item.name || 'Testimonial';
            image.loading = 'lazy';
            media.appendChild(image);
            const copy = createElement('div', 'testimonial-detail__copy');
            copy.appendChild(createElement('p', 'section-kicker', 'Testimonial'));
            copy.appendChild(createElement('h2', '', item.name || ''));
            copy.appendChild(createElement('blockquote', '', `„${item.long_text || item.quote || ''}“`));
            article.appendChild(media);
            article.appendChild(copy);
            root.appendChild(article);
        });
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
                link.href = `artikel.html?id=${encodeURIComponent(item.id || '')}`;
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
            back.href = 'blog.html';
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
            image.src = item.image;
            image.alt = item.title || '';
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

            const subject = encodeURIComponent(`Coaching-Anfrage von ${nameInput.value.trim()}`);
            const body = encodeURIComponent([
                `Name: ${nameInput.value.trim()}`,
                `E-Mail: ${emailInput.value.trim() || '-'}`,
                `Instagram: ${instagramInput.value.trim() || '-'}`,
                '',
                'Alle relevanten Informationen:',
                messageInput.value.trim(),
            ].join('\n'));

            setStatus('Dein E-Mail-Programm wird geöffnet. Bitte sende die vorbereitete Nachricht dort ab.', 'success');
            window.location.href = `mailto:luk.black@me.com?subject=${subject}&body=${body}`;
            submitButton.disabled = false;
            submitButton.style.opacity = '';
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
        initScrollRestoration();
        initAnchorNavigation();
        initNavigation();
        initHeroClaim();
        observeReveals();
        initWaitlistForm();
        loadPageContent();
    });
})();
