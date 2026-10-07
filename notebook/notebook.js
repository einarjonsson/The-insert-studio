// Notebook builder: collect several inserts, tune each in its own live page, make one PDF.
//
// Every insert runs its normal generator page inside a hidden frame (?embed). To make the PDF we
// press that page's own Generate button, catch the PDF it produces instead of downloading it, and
// stitch all the PDFs together with pdf-lib. Nothing is uploaded: it all happens in the browser.
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // sided: 2 = designed to print on both sides (front/back pairs), 1 = single sheets
  const INSERTS = [
    { key: 'sudoku',            name: 'Sudoku',            tag: 'Logic puzzles',   sided: 2, color: '#8b3a1a' },
    { key: 'wordsearch',        name: 'Word Search',       tag: 'Hidden words',    sided: 2, color: '#b8860b' },
    { key: 'numberfill',        name: 'Number Fill-In',    tag: 'Crossing numbers', sided: 2, color: '#2f6a6a' },
    { key: 'nonogram',          name: 'Nonogram',          tag: 'Picture logic',   sided: 1, color: '#2a2218' },
    { key: 'habit',             name: 'Habit Tracker',     tag: 'Monthly grid',    sided: 1, color: '#4d6a3f' },
    { key: 'calligraphy',       name: 'Calligraphy',       tag: 'Practice sheets', sided: 1, color: '#35507a' },
    { key: 'dnd',               name: 'D&D Pack',          tag: 'Campaign manual', sided: 1, color: '#6a1f1f', regularOnly: true },
    { key: 'wandering-library', name: 'Wandering Library', tag: 'Solo RPG pack',   sided: 2, color: '#4a3018' }
  ];
  const BY_KEY = Object.fromEntries(INSERTS.map((i) => [i.key, i]));

  const state = { size: 'regular', mode: 'duplex', title: 'My Notebook', cover: true, items: [], seq: 0, active: null, busy: false, opened: false };

  const stage = $('#stage'), cover = $('#cover'), coverFront = $('#coverFront'), pageRight = $('#pageRight'), pageScroll = $('#pageScroll');
  const shelf = $('#shelf'), booklets = $('#booklets'), countEl = $('#count'), tally = $('#tally'), makeBtn = $('#makeBtn');
  const card = $('.settings-card'), backFace = $('.face.back'), pocket = $('.pocket');
  const drawer = $('#drawer'), drawerBody = $('#drawerBody'), scrim = $('#scrim');
  const mobileMQ = window.matchMedia('(max-width: 900px)');

  const lede = $('#lede'), nb = $('#nb'), grab = $('#grab');
  const shadeFront = $('.face.front .shade'), shadeBack = $('.face.back .shade'), pageShade = $('.page-shade');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  card.setAttribute('inert', ''); grab.setAttribute('inert', '');

  // ── open / close the notebook ──────────────────────────────────────────────
  // One number, p (0 = shut ... 1 = open), drives the whole scene: the cover swings round the
  // spine, the notebook slides to centre, light and shadow follow, the headline fades.
  // Clicking animates p; dragging the cover's edge sets p straight from the pointer.
  const ANGLE = 178;
  let p = 0, raf = 0, drag = null, unhooked = false;

  const shiftPx = (q) => {                                  // how far the notebook travels sideways
    if (mobileMQ.matches) return 0;
    const closed = Math.min(window.innerWidth * 0.22, 300), open = nb.offsetWidth / 2;
    return closed + (open - closed) * q;
  };

  function render(q) {
    p = Math.max(0, Math.min(1, q));
    const rad = ANGLE * p * Math.PI / 180;
    cover.style.transform = `translateZ(${(48 * Math.sin(Math.PI * p)).toFixed(1)}px) rotateY(${(-ANGLE * p).toFixed(2)}deg)`;
    nb.style.transform = mobileMQ.matches ? '' : `translateX(${shiftPx(p).toFixed(1)}px)`;
    lede.style.opacity = String(Math.max(0, 1 - p * 2.4).toFixed(3));
    lede.style.transform = mobileMQ.matches ? '' : `translate(${(-70 * p).toFixed(1)}px, -50%)`;
    shadeFront.style.opacity = (0.5 * (1 - Math.cos(rad))).toFixed(3);       // the outside darkens as it turns away
    shadeBack.style.opacity = (0.5 * (1 + Math.cos(rad))).toFixed(3);        // light returns to the lining
    pageShade.style.opacity = Math.sin(rad).toFixed(3);                      // the cover's shadow falls across the page
    if (p > 0.06 && !unhooked) { unhooked = true; cover.classList.add('snap'); }      // the elastic lets go
    if (p < 0.02 && unhooked) { unhooked = false; cover.classList.remove('snap'); }
  }

  function settle() {                                       // the cover has come to rest: update the page
    if (p >= 0.999 && !state.opened) {
      state.opened = true; stage.dataset.state = 'open';
      pageRight.removeAttribute('inert'); card.removeAttribute('inert'); grab.removeAttribute('inert');
      coverFront.setAttribute('tabindex', '-1');
      placeSettings();
      if (mobileMQ.matches) setTimeout(() => stage.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }
  function lockPage() {                                     // the notebook is closing or shut
    state.opened = false; stage.dataset.state = 'closed';
    pageRight.setAttribute('inert', ''); card.setAttribute('inert', ''); grab.setAttribute('inert', '');
    coverFront.setAttribute('tabindex', '0');
    placeSettings();
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function animateTo(target, ms) {
    cancelAnimationFrame(raf);
    const from = p, d = ms != null ? ms : 450 + 850 * Math.abs(target - from);
    if (reduceMotion.matches || Math.abs(target - from) < 0.001) { render(target); settle(); return; }
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / d);
      render(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step); else settle();
    })(t0);
  }
  const openNotebook = () => { if (!state.opened && !drag) animateTo(1); };
  function closeNotebook() {
    if (!state.opened && p < 0.001) return;
    if (state.opened) { lockPage(); render(1); }            // mobile hides the cover while open, so put it back first
    animateTo(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── grab the cover's edge and swing it, like the real thing ──
  // Where the cover's free edge is on screen for a given p (the spine stays put while the notebook slides).
  function edgeX(spine0, W, q) { return spine0 + shiftPx(q) + W * Math.cos(ANGLE * q * Math.PI / 180); }
  function solve(spine0, W, x) {                            // which p puts the edge under the pointer?
    if (x >= edgeX(spine0, W, 0)) return 0;
    if (x <= edgeX(spine0, W, 1)) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (edgeX(spine0, W, m) > x) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function beginDrag(e, from) {
    if (e.button > 0 || (from === 'front' && state.opened)) return;
    cancelAnimationFrame(raf);
    const W = nb.offsetWidth, spine0 = nb.getBoundingClientRect().left - shiftPx(p);
    drag = { from, id: e.pointerId, startX: e.clientX, startP: p, W, spine0, offset: e.clientX - edgeX(spine0, W, p), moved: false, samples: [{ t: performance.now(), x: e.clientX }] };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.startX) < 6) return;
    if (!drag.moved) { drag.moved = true; nb.classList.add('dragging'); if (state.opened) lockPage(); }
    render(solve(drag.spine0, drag.W, e.clientX - drag.offset));
    const now = performance.now();
    drag.samples.push({ t: now, x: e.clientX });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 110) drag.samples.shift();
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; nb.classList.remove('dragging');
    if (!d.moved) { if (d.from === 'front') animateTo(1); else closeNotebook(); return; }      // a plain tap on the cover opens it (on the grab strip, shuts it)
    const a = d.samples[0], b = d.samples[d.samples.length - 1];
    const v = b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;                  // px per ms; negative = towards the left (opening)
    const open = v < -0.5 ? true : v > 0.5 ? false : p > 0.5;              // a flick decides; otherwise whichever side it is nearer
    if (open) animateTo(1, 260 + 560 * (1 - p)); else animateTo(0, 260 + 560 * p);
    // swallow the click that follows a drag
    window.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
  }
  [[coverFront, 'front'], [grab, 'back']].forEach(([elm, from]) => {
    elm.addEventListener('pointerdown', (e) => beginDrag(e, from));
    elm.addEventListener('pointermove', moveDrag);
    elm.addEventListener('pointerup', endDrag);
    elm.addEventListener('pointercancel', endDrag);
  });
  // a little peek when the pointer hovers over the shut notebook
  coverFront.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && p < 0.001 && !drag && !state.opened) animateTo(0.035, 280); });
  coverFront.addEventListener('pointerleave', () => { if (!drag && !state.opened && p > 0.001 && p < 0.06) animateTo(0, 280); });
  grab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeNotebook(); } });

  $('#openBtn').addEventListener('click', openNotebook);
  coverFront.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotebook(); } });
  window.addEventListener('resize', () => render(p));
  render(0);

  // on phones the settings card moves onto the page so everything scrolls together
  function placeSettings() {
    const onPage = state.opened && mobileMQ.matches;
    if (onPage && card.parentNode !== pageScroll) { card.classList.add('moved'); pageScroll.insertBefore(card, pageScroll.firstChild); }
    else if (!onPage && card.parentNode !== backFace) { card.classList.remove('moved'); backFace.insertBefore(card, pocket); }
  }
  mobileMQ.addEventListener('change', placeSettings);

  // ── leather colours ───────────────────────────────────────────────────────
  const LEATHERS = [
    { key: 'chocolate', name: 'Chocolate', l: ['#7a4a2a', '#5a3219', '#3b1e0d'], band: '#14110e', hint: 'rgba(246,224,160,0.85)', dark: true,  pdf: [122, 46, 14] },
    { key: 'camel',     name: 'Camel',     l: ['#dba96a', '#c08846', '#97622b'], band: '#3b2a1d', hint: 'rgba(255,240,215,0.85)',      dark: true,  pdf: [151, 98, 43] },
    { key: 'black',     name: 'Black',     l: ['#3d4045', '#26282c', '#131416'], band: '#d9822b', hint: 'rgba(255,255,255,0.6)',  dark: false, pdf: [217, 130, 43] },
    { key: 'navy',      name: 'Navy',      l: ['#456287', '#2d4466', '#1a2a45'], band: '#e6d3a8', hint: 'rgba(255,255,255,0.65)', dark: false, pdf: [45, 68, 102] },
    { key: 'olive',     name: 'Olive',     l: ['#82915a', '#5e6e3e', '#3c4826'], band: '#2a2118', hint: 'rgba(255,255,255,0.65)', dark: false, pdf: [94, 110, 62] },
    { key: 'burgundy',  name: 'Burgundy',  l: ['#9a3445', '#72222f', '#4a1520'], band: '#1a1210', hint: 'rgba(255,255,255,0.65)', dark: false, pdf: [114, 34, 47] }
  ];
  function applyLeather(key, save) {
    const lt = LEATHERS.find((x) => x.key === key) || LEATHERS[0];
    state.leather = lt;
    const s = nb.style;
    s.setProperty('--l1', lt.l[0]); s.setProperty('--l2', lt.l[1]); s.setProperty('--l3', lt.l[2]);
    s.setProperty('--band', lt.band); s.setProperty('--hint', lt.hint);
    s.setProperty('--deb', lt.dark ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.34)');
    s.setProperty('--debs', lt.dark ? '0 1px 0 rgba(255,225,180,0.16)' : '0 -1px 0 rgba(0,0,0,0.45)');
    document.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', b.dataset.key === lt.key ? 'true' : 'false'));
    document.querySelectorAll('[data-leather-name]').forEach((n) => { n.textContent = '· ' + lt.name; });
    if (save) { try { localStorage.setItem('insertStudio.leather', lt.key); } catch (e) { /* fine */ } }
  }
  document.querySelectorAll('[data-swatches]').forEach((box) => {
    LEATHERS.forEach((lt) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.dataset.key = lt.key; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', lt.name); b.title = lt.name;
      b.style.setProperty('--l1', lt.l[0]); b.style.setProperty('--l3', lt.l[2]);
      b.addEventListener('click', (e) => { e.stopPropagation(); applyLeather(lt.key, true); });
      box.appendChild(b);
    });
  });
  let savedLeather = null; try { savedLeather = localStorage.getItem('insertStudio.leather'); } catch (e) { /* fine */ }
  applyLeather(savedLeather, false);

  // ── settings on the inside cover ──────────────────────────────────────────
  const titleIn = $('#titleIn');
  titleIn.addEventListener('input', () => {
    state.title = titleIn.value.trim() || 'My Notebook';
    $('#coverTitle').textContent = state.title;
  });

  document.querySelectorAll('input[name="nbsize"]').forEach((r) => r.addEventListener('change', () => setSize(r.value)));
  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => { state.mode = r.value; }));
  $('#coverIn').addEventListener('change', (e) => { state.cover = e.target.checked; });

  function setSize(size) {
    const clash = size === 'passport' ? state.items.filter((i) => BY_KEY[i.key].regularOnly) : [];
    if (clash.length && !window.confirm(clash.map((i) => BY_KEY[i.key].name).join(', ') + ' only comes in Regular size. Remove it from the notebook?')) {
      document.querySelector('input[name="nbsize"][value="regular"]').checked = true;
      return;
    }
    clash.forEach(removeItem);
    state.size = size;
    state.items.forEach((i) => applySize(i));
    $('#coverIn').disabled = size === 'passport';
    $('#coverRow').classList.toggle('disabled', size === 'passport');
    const note = $('#sizeNote');
    note.hidden = size !== 'passport';
    note.textContent = size === 'passport' ? 'Cover sheets are made for Regular size. D&D is Regular only.' : '';
    renderShelf(); updateAll();
  }

  // push the notebook size into an insert's own page
  function applySize(item) {
    const f = item.frame; if (!f || !item.ready) return;
    const w = f.contentWindow, d = f.contentDocument;
    try {
      if (typeof w.setSizeBtn === 'function') { w.setSizeBtn(state.size); return; }
      const r = d.querySelector(`input[name="size"][value="${state.size}"], input[name="nbsize"][value="${state.size}"]`);
      if (r) r.click();
    } catch (e) { /* the insert keeps its own size */ }
  }

  // ── the shelf ─────────────────────────────────────────────────────────────
  function renderShelf() {
    shelf.innerHTML = '';
    INSERTS.forEach((ins) => {
      const n = state.items.filter((i) => i.key === ins.key).length;
      const locked = ins.regularOnly && state.size === 'passport';
      const b = el('button', 'shelf-item',
        `${n ? `<span class="badge">×${n}</span>` : ''}<span class="plus" aria-hidden="true">+</span>${(window.NB_THUMBS || {})[ins.key] || ''}<b>${ins.name}</b><i>${locked ? 'Regular only' : ins.tag}</i>`);
      b.type = 'button'; b.disabled = locked; b.setAttribute('role', 'listitem');
      b.setAttribute('aria-label', `Add ${ins.name} to the notebook`);
      b.addEventListener('click', () => addItem(ins.key));
      shelf.appendChild(b);
    });
  }

  // ── the inserts in the notebook ───────────────────────────────────────────
  function addItem(key) {
    const ins = BY_KEY[key];
    const item = { id: ++state.seq, key, ready: false, summary: 'Loading…' };

    // the insert's own page runs here, live, so every setting is remembered
    const wrap = el('div', 'frame');
    const frame = document.createElement('iframe');
    frame.title = `${ins.name} settings`;
    frame.src = `../${key}/?embed`;
    frame.addEventListener('load', () => {
      item.ready = true;
      applySize(item);
      const d = frame.contentDocument;
      let t = null;
      const poke = () => { clearTimeout(t); t = setTimeout(() => refreshSummary(item), 250); };
      ['input', 'change', 'click'].forEach((ev) => d.addEventListener(ev, poke, true));
      setTimeout(() => refreshSummary(item), 400);
    });
    wrap.appendChild(frame); drawerBody.appendChild(wrap);
    item.wrap = wrap; item.frame = frame;

    // the booklet in the list
    const li = el('li', 'booklet');
    li.style.setProperty('--c', ins.color);
    li.innerHTML = `<div class="thumb">${(window.NB_THUMBS || {})[key] || ''}</div>
      <div><h4>${ins.name}</h4><p class="sum">Loading…</p></div>
      <div class="acts"><button class="edit" type="button">Edit</button><button class="up" type="button" aria-label="Move up">↑</button><button class="down" type="button" aria-label="Move down">↓</button><button class="del" type="button" aria-label="Remove ${ins.name}">×</button></div>`;
    li.querySelector('.edit').addEventListener('click', () => openDrawer(item));
    li.querySelector('.up').addEventListener('click', () => moveItem(item, -1));
    li.querySelector('.down').addEventListener('click', () => moveItem(item, 1));
    li.querySelector('.del').addEventListener('click', () => removeItem(item));
    item.el = li;

    state.items.push(item);
    renderList(); renderShelf(); updateAll();
    setTimeout(() => li.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  function renderList() {
    state.items.forEach((i) => booklets.appendChild(i.el));        // re-appending reorders without re-animating
    state.items.forEach((i, idx) => {
      i.el.querySelector('.up').disabled = idx === 0;
      i.el.querySelector('.down').disabled = idx === state.items.length - 1;
    });
  }
  function moveItem(item, dir) {
    const i = state.items.indexOf(item), j = i + dir;
    if (j < 0 || j >= state.items.length) return;
    [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
    renderList();
  }
  function removeItem(item) {
    state.items = state.items.filter((i) => i !== item);
    item.el.classList.add('leaving');
    setTimeout(() => { item.el.remove(); item.wrap.remove(); renderList(); renderShelf(); updateAll(); }, 280);
  }

  // what each booklet says about its settings, read from the insert's own preview
  function refreshSummary(item) {
    if (!item.ready) return;
    try {
      const d = item.frame.contentDocument;
      const badge = (d.getElementById('previewBadge') || {}).textContent;
      const lowBadge = (badge || '').toLowerCase();
      const stats = [...d.querySelectorAll('.preview-stat')].slice(0, 3).map((s) => {
        const v = s.querySelector('.preview-stat-val'), l = s.querySelector('.preview-stat-label');
        if (!v || !l) return '';
        const val = v.textContent.trim(); let label = l.textContent.trim().toLowerCase();
        if (val === '1') label = label.replace(/^(\w+?)s\b/, '$1');            // "1 sheets" -> "1 sheet"
        const word = label.split(' ')[0];
        return lowBadge.includes(word) ? '' : `${val} ${label}`;                // don't repeat what the badge already says
      }).filter(Boolean).slice(0, 2);
      item.summary = [badge && badge.trim(), stats.join(' · ')].filter(Boolean).join(' — ') || 'Default settings';
    } catch (e) { item.summary = 'Default settings'; }
    item.el.querySelector('.sum').textContent = item.summary;
  }

  function updateAll() {
    const n = state.items.length;
    countEl.textContent = n;
    tally.innerHTML = n ? `<b>${n}</b> insert${n > 1 ? 's' : ''} in your notebook` : 'Add an insert to begin';
    makeBtn.disabled = n === 0 || state.busy;
    makeBtn.classList.toggle('pulse', n > 0);
  }

  // ── the settings drawer ───────────────────────────────────────────────────
  function openDrawer(item) {
    state.active = item;
    const ins = BY_KEY[item.key];
    $('#drawerTitle').textContent = ins.name;
    $('#drawerKicker').textContent = 'Insert settings · changes are saved as you go';
    drawerBody.querySelectorAll('.frame').forEach((f) => f.classList.toggle('show', f === item.wrap));
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    scrim.hidden = false; pageRight.setAttribute('inert', '');
    setTimeout(() => $('#drawerDone').focus({ preventScroll: true }), 500);
    // the preview draws once it has a size; nudge it now that the drawer is visible
    setTimeout(() => { try { item.frame.contentWindow.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ } }, 600);
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    scrim.hidden = true; pageRight.removeAttribute('inert');
    if (state.active) { refreshSummary(state.active); state.active.el.querySelector('.edit').focus({ preventScroll: true }); }
    state.active = null;
  }
  $('#drawerDone').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#binding').hidden) return; closeDrawer(); } });

  // ── making the PDF ────────────────────────────────────────────────────────
  // Press the insert's own Generate button and catch the PDF jsPDF hands to the download.
  async function capture(item) {
    const w = item.frame.contentWindow, d = item.frame.contentDocument;
    if (!item.sink) {
      item.sink = [];
      const orig = w.URL.createObjectURL.bind(w.URL);
      w.URL.createObjectURL = (b) => { if (b && b.type === 'application/pdf') item.sink.push(b); return orig(b); };
      const swallow = (a) => a && a.hasAttribute && a.hasAttribute('download');
      const click = w.HTMLAnchorElement.prototype.click;
      w.HTMLAnchorElement.prototype.click = function () { return swallow(this) ? undefined : click.call(this); };
      const dispatch = w.EventTarget.prototype.dispatchEvent;
      w.EventTarget.prototype.dispatchEvent = function (ev) { return (this instanceof w.HTMLAnchorElement && swallow(this)) ? true : dispatch.call(this, ev); };
    }
    item.sink.length = 0;
    const ov = d.getElementById('duplexOverride');                    // ask for one combined PDF
    if (ov) ov.click();
    applySize(item);
    d.querySelector('.generate-btn').click();
    const t0 = Date.now();
    while (!item.sink.length) {
      const m = d.querySelector('.modal-overlay.visible .modal-btn:not(.ghost):not([disabled])');   // two-step dialog fallback
      if (m) m.click();
      if (Date.now() - t0 > 120000) throw new Error('timed out');
      await new Promise((r) => setTimeout(r, 150));
    }
    return new Uint8Array(await item.sink[0].arrayBuffer());
  }

  async function buildCover() {
    await PDFKit.preload();
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    PDFKit.register(doc);
    PDFKit.cover(doc, { kicker: 'Traveler’s Notebook', title: state.title, subtitle: `${state.items.length} insert${state.items.length > 1 ? 's' : ''}`, accentColor: state.leather.pdf });
    PDFKit.marks(doc, 'regular', { label: 'Cover' });
    return new Uint8Array(doc.output('arraybuffer'));
  }

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'notebook';

  async function makePdf() {
    if (state.busy || !state.items.length) return;
    state.busy = true; updateAll();
    const items = [...state.items];
    const useCover = state.cover && state.size === 'regular';

    const box = $('#binding'), stepsEl = $('#bindSteps'), bar = $('#bindBar');
    box.hidden = false; box.classList.remove('done');
    $('#result').hidden = true; $('#bindErr').hidden = true; $('#bindTitle').textContent = 'Binding your notebook…';
    stepsEl.innerHTML = ''; bar.style.width = '0%';
    const rows = [];
    if (useCover) rows.push({ label: 'Cover sheet' });
    items.forEach((i) => rows.push({ label: BY_KEY[i.key].name, item: i }));
    rows.push({ label: 'Binding it all together' });
    rows.forEach((r) => { r.li = el('li', '', r.label); stepsEl.appendChild(r.li); });
    const mark = (n, cls) => { rows[n].li.className = cls; bar.style.width = Math.round((n + (cls === 'done' ? 1 : 0.4)) / rows.length * 100) + '%'; };

    try {
      const parts = [];
      let n = 0;
      if (useCover) { mark(n, 'doing'); parts.push({ bytes: await buildCover(), sided: 1 }); mark(n++, 'done'); }
      for (const it of items) {
        mark(n, 'doing');
        await new Promise((r) => setTimeout(r, 60));
        parts.push({ bytes: await capture(it), sided: BY_KEY[it.key].sided });
        mark(n++, 'done');
      }
      mark(n, 'doing');
      const result = await bind(parts, items.length);
      mark(n, 'done');
      showResult(result);
    } catch (err) {
      console.error(err);
      $('#bindTitle').textContent = 'That did not work';
      const e = $('#bindErr'); e.hidden = false;
      e.innerHTML = 'Something went wrong while making the PDF. Try again, or make that insert on its own page. <br><button type="button" id="errClose" class="btn-gold small" style="margin-top:12px">Back to my notebook</button>';
      $('#errClose').addEventListener('click', () => { $('#binding').hidden = true; });
    }
    state.busy = false; updateAll();
  }

  // stitch the parts together (adding blank backs where single sheets sit among double-sided ones)
  async function bind(parts, insertCount) {
    const { PDFDocument } = PDFLib;
    const twoSided = parts.some((p) => p.sided === 2);
    const backs = twoSided;                                   // all-single-sided notebooks print one side only
    const out = await PDFDocument.create();
    for (const p of parts) {
      const src = await PDFDocument.load(p.bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((pg) => {
        out.addPage(pg);
        if (backs && p.sided === 1) { const s = pg.getSize(); out.addPage([s.width, s.height]); }   // blank back
      });
    }
    out.setTitle(state.title); out.setCreator('The Insert Studio'); out.setProducer('The Insert Studio');
    const total = out.getPageCount();
    const files = [];
    if (state.mode === 'manual' && backs) {
      const front = await PDFDocument.create(), back = await PDFDocument.create();
      const idx = out.getPageIndices();
      const odd = idx.filter((i) => i % 2 === 0), even = idx.filter((i) => i % 2 === 1).reverse();   // side 2 prints in reverse
      (await front.copyPages(out, odd)).forEach((p) => front.addPage(p));
      (await back.copyPages(out, even)).forEach((p) => back.addPage(p));
      files.push({ label: 'Download side 1', name: `${slug(state.title)}-side1.pdf`, bytes: await front.save() });
      files.push({ label: 'Download side 2', name: `${slug(state.title)}-side2.pdf`, bytes: await back.save() });
    } else {
      files.push({ label: 'Download my notebook PDF', name: `${slug(state.title)}.pdf`, bytes: await out.save() });
    }
    return { files, total, sheets: backs ? Math.ceil(total / 2) : total, insertCount, backs };
  }

  let urls = [];
  function showResult(r) {
    urls.forEach(URL.revokeObjectURL); urls = [];
    $('#binding').classList.add('done');
    $('#bindTitle').textContent = 'Your notebook is ready';
    $('#bindBar').style.width = '100%';
    $('#resultStats').innerHTML = `<div>${r.insertCount}<small>insert${r.insertCount > 1 ? 's' : ''}</small></div><div>${r.sheets}<small>sheets of paper</small></div><div>A4<small>landscape</small></div>`;
    const acts = $('#resultActions'); acts.innerHTML = '';
    r.files.forEach((f) => {
      const url = URL.createObjectURL(new Blob([f.bytes], { type: 'application/pdf' })); urls.push(url);
      const a = el('a', '', `${f.label} <span aria-hidden="true">↓</span>`); a.href = url; a.download = f.name;
      acts.appendChild(a);
    });
    const how = $('#howto'); const steps = [];
    const fold = state.size === 'regular' ? 'Fold each sheet at 110mm and cut at 220mm (the marks are printed).' : 'Cut each sheet along the centre lines (the marks are printed).';
    if (r.files.length === 2) {
      steps.push('Print <strong>side 1</strong> on A4, landscape.');
      steps.push('Flip the stack face-down, put it back in the tray without rotating, and print <strong>side 2</strong>.');
    } else if (r.backs) {
      steps.push('Print on A4, <strong>landscape, double-sided</strong> (flip on the long edge).');
    } else {
      steps.push('Print on A4, <strong>landscape, one side only</strong>.');
    }
    steps.push(fold);
    steps.push('Slip the inserts into your notebook.');
    if (r.backs && state.items.some((i) => BY_KEY[i.key].sided === 1)) steps.push('Single-sheet inserts get a blank back so every page lines up.');
    how.innerHTML = steps.map((s) => `<li>${s}</li>`).join('');
    $('#result').hidden = false;
    $('#resultActions a').focus({ preventScroll: true });
  }
  $('#backBtn').addEventListener('click', () => { $('#binding').hidden = true; });
  $('#againBtn').addEventListener('click', () => {
    if (!window.confirm('Start a new notebook? This clears the inserts you have added.')) return;
    [...state.items].forEach((i) => { i.el.remove(); i.wrap.remove(); });
    state.items = []; $('#binding').hidden = true; renderShelf(); updateAll();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#binding').hidden && !state.busy) $('#binding').hidden = true; });
  makeBtn.addEventListener('click', makePdf);

  // a small "close the notebook" link under the settings
  const closeLink = el('button', 'result-links-btn', '↺ Close the notebook');
  closeLink.type = 'button';
  closeLink.style.cssText = 'align-self:flex-start;background:none;border:0;cursor:pointer;font:500 .62rem "DM Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#7a2e0e;text-decoration:underline;text-underline-offset:4px;min-height:44px;padding:0';
  closeLink.addEventListener('click', closeNotebook);
  card.appendChild(closeLink);

  renderShelf(); updateAll();
  if (/[#?]open\b/.test(location.hash + location.search)) openNotebook();
})();
