// Seeds: the same seed (with the same settings) always gives the same puzzles.
//   Seed.begin(text)   -> a seed code: the reader's text (tidied) or a fresh random one
//   Seed.at(code, n)   -> make Seed.random() repeatable for puzzle number n of that seed
//   Seed.random()      -> like Math.random(); seeded after Seed.at(), plain until then
//   Seed.free()        -> back to plain random (call when generating is done)
//   Seed.num(code)     -> a 32-bit number for engines that want one
//   Seed.mount(el, {onChange}) -> builds the seed field into `el`; returns { value(), used(code) }
window.Seed = (function () {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L to misread
  let rnd = Math.random;

  function xmur3(str) {                               // string -> 32-bit hash stream
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  }
  function mulberry32(a) {
    return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const tidy = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '-').slice(0, 24);
  function fresh() {
    const b = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(b);
    return [...b].map((x) => ALPHA[x % ALPHA.length]).join('');
  }
  const begin = (text) => tidy(text) || fresh();
  const num = (code) => xmur3(String(code))();
  const at = (code, n) => { rnd = mulberry32(xmur3(code + '#' + n)()); };
  const free = () => { rnd = Math.random; };

  function mount(el, opts) {
    opts = opts || {};
    el.innerHTML = '<div class="seed-row"><input type="text" class="seed-input" maxlength="24" placeholder="Blank = a new surprise each time" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Seed">' +
      '<button type="button" class="seed-roll" title="Pick a random seed">🎲 Roll</button></div>' +
      '<p class="seed-note">Same seed + same settings = the same puzzles again. Share it with a friend.</p>' +
      '<p class="seed-used" hidden>Last made with seed <button type="button" class="seed-keep" title="Use this seed again"></button></p>';
    const input = el.querySelector('.seed-input'), usedP = el.querySelector('.seed-used'), keep = el.querySelector('.seed-keep');
    const changed = () => { if (opts.onChange) opts.onChange(); };
    input.addEventListener('input', changed);
    el.querySelector('.seed-roll').addEventListener('click', () => { input.value = fresh(); changed(); });
    keep.addEventListener('click', () => { input.value = keep.textContent; changed(); });
    return {
      value: () => input.value,
      used(code) { keep.textContent = code; usedP.hidden = !code || tidy(input.value) === code; }
    };
  }

  if (!document.getElementById('seedCss')) {
    const st = document.createElement('style'); st.id = 'seedCss';
    st.textContent = '.seed-row{display:flex;gap:8px;align-items:center}' +
      '.seed-input{flex:1;min-width:0;font-family:"DM Mono",monospace;font-size:.72rem;letter-spacing:.08em;color:var(--ink);border:1.5px solid var(--rule);background:var(--warm,#fff);padding:8px 10px;outline:none;transition:border-color .12s}' +
      '.seed-input:focus{border-color:var(--accent)}.seed-input::placeholder{color:var(--muted);letter-spacing:0}' +
      '.seed-roll{padding:8px 12px;border:1.5px solid var(--rule);background:var(--warm,#fff);color:var(--ink);cursor:pointer;font:inherit;font-size:.7rem;transition:all .12s;white-space:nowrap}' +
      '.seed-roll:hover{border-color:var(--accent);background:var(--accent);color:#fff}' +
      '.seed-note,.seed-used{margin:8px 0 0;font-size:.62rem;line-height:1.5;color:var(--muted)}' +
      '.seed-keep{font:inherit;font-family:"DM Mono",monospace;letter-spacing:.1em;font-weight:500;color:var(--accent);background:none;border:0;border-bottom:1px dashed currentColor;padding:0;cursor:pointer}';
    document.head.appendChild(st);
  }
  return { begin, at, free, num, mount, random: () => rnd(), fresh };
})();
