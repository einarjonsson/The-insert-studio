// "What is this?" intro for each generator. Loaded by studio.js on tool pages.
// Content lives in assets/intro/<tool>.js, which calls StudioIntro.register('<tool>', {...}).
//
// data = {
//   kicker:  'Solo journaling RPG',
//   title:   ['The Wandering', 'Library'],           // lines; the last is set in gold italic
//   hook:    'One-sentence pitch.',
//   hero:    '<svg class="ill" viewBox="0 0 640 460">…</svg>',
//   what:    { heading: 'What is it?', lead: 'Pull quote.', body: ['paragraph', …] },
//   steps:   { heading: 'How a session goes', items: [{ icon: '<svg…>', title, text }, …] },
//   pack:    { heading: 'What’s in the pack', items: [{ art: '<svg…>', title, text }, …] },
//   note:    { title, text, art } (optional dark call-out),
//   cta:     'Start building'
// }
// Illustration SVGs use the palette classes in intro.css (i-ink, i-gold, s-ink, …).
window.StudioIntro = (function () {
  const data = {};
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/intro\.js.*$/, '');
  const KEY = 'insertStudio.intro.';

  const store = {
    get(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* private mode: just show again next time */ } }
  };

  const FACT_ICONS = {
    print: '<svg viewBox="0 0 48 48" class="ill"><rect class="i-ink" x="11" y="5" width="26" height="14" rx="2"/><rect class="i-paper" x="13" y="7" width="22" height="10" rx="1"/><rect class="i-rust" x="5" y="19" width="38" height="17" rx="4"/><rect class="i-paper" x="12" y="28" width="24" height="15" rx="1.5"/><path class="s-ink" d="M16 33h16M16 37h12" stroke-width="1.6"/><circle class="i-gold" cx="37" cy="24" r="1.8"/></svg>',
    fold: '<svg viewBox="0 0 48 48" class="ill"><rect class="i-paper" x="6" y="9" width="36" height="30" rx="2" stroke="#1d160d" stroke-width="2"/><path class="s-gold-d" d="M18 9v30M30 9v30" stroke-width="2" stroke-dasharray="3 3"/><path class="s-rust" d="M9 44l6-6m0 6l-6-6" stroke-width="2"/></svg>',
    lock: '<svg viewBox="0 0 48 48" class="ill"><rect class="i-ink" x="9" y="21" width="30" height="21" rx="4"/><path class="s-ink" d="M16 21v-6a8 8 0 0 1 16 0v6" stroke-width="4"/><circle class="i-gold" cx="24" cy="30" r="3.5"/><rect class="i-gold" x="22.6" y="31" width="2.8" height="6" rx="1"/></svg>'
  };
  const DEFAULT_FACTS = [
    { icon: 'print', title: 'Print on A4', text: 'Landscape, one sheet at a time. Duplex printers get a single PDF; others get a guided two-step flow.' },
    { icon: 'fold', title: 'Fold, cut, done', text: 'Regular size folds at 110mm and cuts at 220mm. Passport size cuts at the centre lines. Marks are printed for you.' },
    { icon: 'lock', title: 'Private by design', text: 'Everything is made in your browser. Nothing you type is uploaded anywhere.' }
  ];

  function register(key, d) { data[key] = d; }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build(d) {
    const sec = [];
    if (d.what) {
      sec.push(`<section class="intro-what" id="introWhat"><div><div class="intro-eyebrow">The idea</div><h2 class="intro-h">${d.what.heading || 'What is it?'}</h2>${d.what.lead ? `<p class="lead">${d.what.lead}</p>` : ''}</div><div>${(d.what.body || []).map((p) => `<p>${p}</p>`).join('')}</div></section>`);
    }
    if (d.steps) {
      sec.push(`<section class="intro-steps"><div class="intro-eyebrow">How it works</div><h2 class="intro-h">${d.steps.heading || 'How it works'}</h2><div class="intro-steps-list">${d.steps.items.map((s) => `<article class="intro-step"><div class="art">${s.icon}</div><h3>${s.title}</h3><p>${s.text}</p></article>`).join('')}</div></section>`);
    }
    if (d.pack) {
      sec.push(`<section class="intro-pack"><div class="intro-eyebrow">What you get</div><h2 class="intro-h">${d.pack.heading || 'What’s in the pack'}</h2><div class="intro-pack-grid">${d.pack.items.map((c, i) => `<article class="intro-card"><div class="thumb" style="--r:${i % 2 ? 2 : -2}deg">${c.art}</div><div class="txt"><h3>${c.title}</h3><p>${c.text}</p></div></article>`).join('')}</div></section>`);
    }
    if (d.note) {
      sec.push(`<section class="intro-note">${d.note.art ? `<div class="art">${d.note.art}</div>` : ''}<div><h3>${d.note.title}</h3><p>${d.note.text}</p></div></section>`);
    }
    const facts = d.facts || DEFAULT_FACTS;
    sec.push(`<section class="intro-facts">${facts.map((f) => `<div class="intro-fact">${FACT_ICONS[f.icon] || f.icon}<div><b>${f.title}</b><span>${f.text}</span></div></div>`).join('')}</section>`);

    const cta = d.cta || 'Start building';
    return `
      <div class="intro-sheet" tabindex="-1">
        <button class="intro-close" type="button" aria-label="Close">×</button>
        <header class="intro-hero">
          <div class="intro-hero-text">
            <div class="intro-kicker">${d.kicker || 'The Insert Studio'}</div>
            <h2 class="intro-title" id="introTitle">${d.title.map((l) => `<span>${l}</span>`).join('')}</h2>
            <p class="intro-hook">${d.hook}</p>
            <div class="intro-hero-cta">
              <button class="intro-go" type="button" data-close>${cta} →</button>
              <button class="intro-more" type="button" data-more>Show me how ↓</button>
            </div>
          </div>
          <div class="intro-hero-art" aria-hidden="true">${d.hero || ''}</div>
        </header>
        <div class="intro-body">${sec.join('')}</div>
        <footer class="intro-cta"><span>${esc(d.footer || 'Ready when you are')}</span><button class="intro-go" type="button" data-close>${cta} →</button></footer>
      </div>`;
  }

  function init(key) {
    const d = data[key];
    if (!d) return;
    const header = document.querySelector('header');
    if (!header) return;

    // header: [title block] [actions: What is this? + tag]
    const tag = header.querySelector('.header-tag');
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'intro-btn'; btn.innerHTML = '<b>?</b>What is this?';
    btn.setAttribute('aria-haspopup', 'dialog');
    actions.appendChild(btn);
    if (tag) actions.appendChild(tag);
    header.appendChild(actions);

    let box = null, lastFocus = null;

    function open(auto) {
      if (box) return;
      lastFocus = document.activeElement;
      box = document.createElement('div');
      box.className = 'intro';
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'introTitle');
      box.innerHTML = build(d);
      document.body.appendChild(box);
      // hero scene fills its box edge to edge and sits on the bottom, centred (keep key subjects within the middle 70% of the viewBox)
      const hs = box.querySelector('.intro-hero-art svg'); if (hs) hs.setAttribute('preserveAspectRatio', 'xMidYMax slice');
      document.documentElement.classList.add('intro-open');
      const sheet = box.querySelector('.intro-sheet');
      box.addEventListener('click', (e) => { if (e.target === box) close(); });
      box.querySelector('.intro-close').addEventListener('click', close);
      box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
      box.querySelector('[data-more]').addEventListener('click', () => {
        const t = box.querySelector('.intro-body'); sheet.scrollTo({ top: t.offsetTop - 8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      document.addEventListener('keydown', onKey);
      sheet.focus({ preventScroll: true });
      if (auto) store.set(key, 'seen');
    }
    function close() {
      if (!box) return;
      box.remove(); box = null;
      document.documentElement.classList.remove('intro-open');
      document.removeEventListener('keydown', onKey);
      store.set(key, 'seen');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab' || !box) return;
      const f = [...box.querySelectorAll('button, a[href]')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box.querySelector('.intro-sheet'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    btn.addEventListener('click', () => open(false));
    // first visit to this tool (or #about / ?intro): show it once
    const forced = /[#&?](about|intro)\b/.test(location.hash + location.search);
    // automated browsers (tests, link-preview bots) never get the first-visit popup; ?intro still forces it
    if (forced || (!store.get(key) && !navigator.webdriver)) setTimeout(() => open(true), forced ? 100 : 700);
  }

  // Load this tool's content, then wire everything up.
  function start() {
    if (document.documentElement.classList.contains('embed')) return;   // no explainer inside the notebook builder
    const nav = document.querySelector('nav.topbar');
    const key = nav && nav.getAttribute('data-tool');
    if (!key) return;
    const s = document.createElement('script');
    s.src = BASE + 'intro/' + key + '.js';
    s.onload = () => init(key);
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  return { register, data };
})();
