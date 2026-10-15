(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // handle, name, followers, hasLocalAvatar
  const CREATORS = [
    ['milesdeutscher', 'Miles Deutscher', '662.4K'],
    ['Scobleizer', 'Robert Scoble', '570.7K'],
    ['hasantoxr', 'Hasan Toor', '432.2K'],
    ['FellMentKE', 'FELIX', '269.6K'],
    ['DataChaz', 'DataChaz', '162.4K'],
    ['aisolopreneur', 'The AI Solopreneur', '158K'],
    ['EHuanglu', 'el.cine', '125.3K'],
    ['TukiFromKL', 'Tuki', '115.4K'],
    ['EXM7777', 'Machina', '97.6K'],
    ['alifcoder', 'Alif Hossain', '90.2K'],
    ['mhdfaran', 'Farhan', '78.4K'],
    ['Marryclaire_AI', 'Marry Claire', '72.6K'],
    ['sharbel', 'Sharbel', '67K', false],
    ['slow_developer', 'Haider.', '64.5K', false],
    ['aiedge_', 'AI Edge', '57.5K'],
    ['damianplayer', 'Damian Player', '46.7K'],
    ['HeyToha', 'Toha Khan', '37.9K'],
    ['hey_mujeebahmed', 'Mujeeb Ahmed', '37.4K'],
    ['VibeMarketer_', 'J.B.', '28.8K'],
    ['Voxyz_ai', 'Vox', '11.1K'],
  ];

  function avatar(c, lazy = true) {
    const [handle, name, , local] = c;
    const el = document.createElement('span');
    el.className = 'av';
    const mono = () => { el.classList.add('mono'); el.textContent = (name.match(/[A-Za-z]/) || ['G'])[0].toUpperCase(); };
    // no public photo available for these handles: use a painted monogram
    if (local === false) { mono(); return el; }
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    img.src = `/assets/creators/${handle}.jpg`;
    img.onerror = () => { img.remove(); mono(); };
    el.appendChild(img);
    return el;
  }

  /* ---------- confetti (pastel, no library) ---------- */
  function confetti({ count = 170, origin = null } = {}) {
    if (reduce) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.append(c);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const COLS = ['#a9c8ec', '#9fd2b5', '#f0bb9d', '#c4b6ee', '#e8d38f', '#141414'];
    const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight * 0.35;
    const ps = Array.from({ length: count }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 7 + Math.random() * 9;
      return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: COLS[Math.floor(Math.random() * COLS.length)], round: Math.random() < 0.3 };
    });
    const t0 = performance.now();
    (function tick(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1.8) / 1.2);
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
        ctx.restore();
      });
      if (t < 3) requestAnimationFrame(tick); else c.remove();
    })(t0);
  }

  /* ---------- playbook opt-in ---------- */
  // Nothing is sent yet. To go live, set LEAD_ENDPOINT to your email tool / CRM form URL (it receives JSON { name, email, source }).
  const LEAD_ENDPOINT = null;
  const pbForm = $('#pb-form');
  if (pbForm) {
    const err = $('.pb-err', pbForm);
    const btn = $('button[type="submit"]', pbForm);
    pbForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = pbForm.name.value.trim();
      const email = pbForm.email.value.trim();
      err.textContent = '';
      if (!name) { err.textContent = 'Add your first name.'; pbForm.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'That email doesn’t look right.'; pbForm.email.focus(); return; }
      btn.disabled = true;
      if (LEAD_ENDPOINT) {
        try { await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, source: 'creator-launch-playbook' }) }); }
        catch { /* still show the thank-you page; the lead can be retried server-side */ }
      }
      try { sessionStorage.setItem('grvty_name', name.split(/\s+/)[0]); } catch { /* storage blocked */ }
      pbForm.classList.add('sent');
      btn.innerHTML = 'Sent <span class="arr">✓</span>';
      const r = btn.getBoundingClientRect();
      confetti({ origin: { x: r.left + r.width / 2, y: r.top } });
      setTimeout(() => { location.href = '/thank-you/'; }, reduce ? 200 : 1400);
    });
  }

  // thank-you page: greet by first name and celebrate
  const tyName = $('[data-ty-name]');
  if (tyName) {
    let n = '';
    try { n = sessionStorage.getItem('grvty_name') || ''; } catch { /* storage blocked */ }
    if (n) tyName.textContent = `, ${n}`;
    setTimeout(() => confetti({ count: 200 }), 350);
  }

  const nav = $('#nav');
  const menuBtn = $('.menu-btn');
  const closeMenu = () => { nav?.classList.remove('open'); menuBtn?.setAttribute('aria-expanded', 'false'); };
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id.length > 1 && $(id);
    if (!t) return;
    e.preventDefault();
    closeMenu();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (id === '#main') t.focus?.({ preventScroll: true });
  }));

  /* ---------- populate creators ---------- */
  const roster = $('#roster');
  if (roster) {
    CREATORS.slice(0, 5).forEach((c, i) => {
      const card = document.createElement('a');
      card.className = 'rcard';
      card.href = `https://x.com/${c[0]}`;
      card.target = '_blank';
      card.rel = 'noopener';
      card.style.transitionDelay = (700 + i * 110) + 'ms';
      card.append(avatar(c, false));
      card.insertAdjacentHTML('beforeend', `<b>${c[1]}</b><small>@${c[0]}</small><span class="rcard-foot"><em>${c[2]}</em>followers on X</span>`);
      roster.append(card);
    });
    setTimeout(() => {
      roster.classList.add('in');
      // drop the entrance delay so hover lifts respond immediately
      setTimeout(() => $$('.rcard', roster).forEach(c => c.style.transitionDelay = ''), 2000);
    }, 200);
  }

  /* ---------- hero flow: platform signals rise from creators into the product ---------- */
  const stageEl = $('#stage');
  const flow = { on: false, blips: [], paths: [], next: 0 };
  const PLATFORMS = [
    ['youtube', '/assets/platforms/youtube.svg'],
    ['x', '/assets/platforms/x.svg'],
    ['linkedin', '/assets/platforms/linkedin.svg'],
  ];
  if (stageEl && roster) {
    const layer = document.createElement('div');
    layer.className = 'flow';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `<svg class="flow-lines"></svg>
      <div class="hub"><span class="hub-ring"></span><span class="hub-in"><span class="hub-logos">${PLATFORMS.map(p => `<img src="${p[1]}" alt="" data-p="${p[0]}">`).join('')}</span><span class="hub-txt"><b>Your launch</b><small>In front of technical buyers</small></span></span></div>`;
    stageEl.insertBefore(layer, roster);
    flow.layer = layer;
    flow.svg = $('.flow-lines', layer);
    flow.hub = $('.hub', layer);
    flow.hubIn = $('.hub-in', layer);
    flow.ring = $('.hub-ring', layer);
    flow.layout = () => {
      const sr = stageEl.getBoundingClientRect();
      const hr = flow.hub.getBoundingClientRect();
      const hx = hr.left + hr.width / 2 - sr.left, hy = hr.bottom - sr.top - 4;
      flow.svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
      flow.svg.innerHTML = '';
      flow.paths = $$('.rcard', roster).filter(c => c.offsetParent && c.getBoundingClientRect().right > sr.left && c.getBoundingClientRect().left < sr.right).map(c => {
        const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2 - sr.left, y = r.top - sr.top + 2;
        const dy = y - hy;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x},${y} C${x},${y - dy * 0.55} ${hx},${hy + dy * 0.5} ${hx},${hy}`);
        path.setAttribute('class', 'fl');
        flow.svg.append(path);
        return { path, len: path.getTotalLength() };
      });
    };
    new IntersectionObserver(es => { flow.on = es[0].isIntersecting; }).observe(stageEl);
    addEventListener('load', flow.layout);
    document.fonts?.ready.then(flow.layout);
    roster.addEventListener('scroll', () => flow.layout(), { passive: true });
    setTimeout(flow.layout, 1600);
  }
  function stepFlow(now, dt) {
    if (!flow.layer || !flow.on || !flow.paths.length || reduce || document.hidden) return;
    if (now > flow.next) {
      flow.next = now + 420 + Math.random() * 380;
      const p = flow.paths[Math.floor(Math.random() * flow.paths.length)];
      const pf = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const el = document.createElement('span');
      el.className = 'blip blip-' + pf[0];
      el.innerHTML = `<img src="${pf[1]}" alt="">`;
      flow.layer.append(el);
      flow.blips.push({ el, p, t: 0, dur: 2.6 + Math.random() * 0.8, key: pf[0] });
    }
    flow.blips = flow.blips.filter(b => {
      b.t += dt / b.dur;
      if (b.t >= 1) {
        b.el.remove();
        flow.hubIn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(.22,.61,.21,1)' });
        flow.layer.querySelector(`.hub-logos [data-p="${b.key}"]`)?.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-5px) scale(1.18)' }, { transform: 'translateY(0) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.22,.61,.21,1)' });
        flow.ring.animate([{ boxShadow: '0 0 0 0 rgba(255,255,255,.8)' }, { boxShadow: '0 0 0 18px rgba(255,255,255,0)' }], { duration: 900, easing: 'ease-out' });
        return false;
      }
      const e = b.t < 0.5 ? 2 * b.t * b.t : 1 - Math.pow(-2 * b.t + 2, 2) / 2;
      const pt = b.p.path.getPointAtLength(e * b.p.len);
      const s = b.t < 0.15 ? b.t / 0.15 : b.t > 0.85 ? (1 - b.t) / 0.15 : 1;
      b.el.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) scale(${(0.6 + 0.4 * s).toFixed(3)})`;
      b.el.style.opacity = s.toFixed(3);
      return true;
    });
  }

  const fillStack = (sel, list) => { const s = $(sel); if (s) list.forEach(i => s.append(avatar(CREATORS[i]))); };
  // faint pastel pulses on the hero grid
  const heroRail = $('.hero-rail');
  if (heroRail && !reduce) {
    const gp = document.createElement('div');
    gp.className = 'grid-pulse';
    gp.setAttribute('aria-hidden', 'true');
    heroRail.prepend(gp);
    const COLORS = ['#a9c8ec', '#9fd2b5', '#f0bb9d', '#c4b6ee', '#e8d38f'];
    let heroOn = true;
    new IntersectionObserver(es => { heroOn = es[0].isIntersecting; }).observe(heroRail);
    // short streaks of light travelling along the grid lines
    const CELL = 58, LEN = 120;
    setInterval(() => {
      if (!heroOn || document.hidden || gp.childElementCount > 8) return;
      const st = $('#stage');
      const H = st ? st.offsetTop : heroRail.clientHeight, W = heroRail.clientWidth;
      const cols = Math.floor(W / CELL), rows = Math.floor(H / CELL);
      const horiz = Math.random() < 0.5;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const dist = CELL * (3 + Math.floor(Math.random() * 4));
      const line = document.createElement('i');
      line.className = horiz ? 'h' : 'v';
      line.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
      // snap to a grid line, start somewhere along it
      const lx = horiz ? Math.random() * (W - LEN) : Math.floor(Math.random() * cols) * CELL;
      const ly = horiz ? Math.floor(Math.random() * rows) * CELL : Math.random() * Math.max(0, H - LEN);
      const from = horiz ? `translate(${lx}px, ${ly}px)` : `translate(${lx}px, ${ly}px)`;
      const to = horiz ? `translate(${lx + dist * dir}px, ${ly}px)` : `translate(${lx}px, ${ly + dist * dir}px)`;
      gp.append(line);
      const dur = 2600 + Math.random() * 1400;
      const anim = line.animate([
        { transform: from, opacity: 0 },
        { opacity: 0.85, offset: 0.3 },
        { opacity: 0.85, offset: 0.6 },
        { transform: to, opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' });
      anim.onfinish = () => line.remove();
    }, 420);
  }

  // hero: cycle the platforms inline
  const rot = $('#rot');
  if (rot) {
    const items = $$('.rot-item', rot);
    let ri = 0;
    setInterval(() => {
      if (document.hidden) return;
      const prev = items[ri];
      ri = (ri + 1) % items.length;
      prev.classList.remove('on');
      prev.classList.add('out');
      setTimeout(() => prev.classList.remove('out'), 650);
      items[ri].classList.add('on');
    }, 2200);
  }

  // statement: words fill in from grey to ink as the line passes through the viewport
  const say = $('#say');
  const sayBits = [];
  if (say) {
    const faces = $('#say-faces');
    [0, 1, 2, 3, 4].forEach(i => faces.append(avatar(CREATORS[i], false)));
    const split = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.append(t); return; }
          const w = document.createElement('span');
          w.className = 'wd';
          w.textContent = t;
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.classList?.contains('say-media')) {
        n.classList.add('wd-media');
      } else if (n.nodeType === 1) split(n);
    });
    split(say);
    sayBits.push(...$$('.wd, .wd-media', say));
    if (reduce) sayBits.forEach(b => b.classList.add('on'));
  }
  let sayLit = -1;

  const netGrid = $('#net-grid');
  if (netGrid) [5, 6, 7, 8, 9, 10, 11, 14, 15, 16].forEach((ci, i) => { const a = avatar(CREATORS[ci]); a.style.transitionDelay = (i * 60) + 'ms'; netGrid.append(a); });

  // "signal over noise": jittery static with one clean wave running through it
  const sig = { a: $('#noise-a'), b: $('#noise-b'), s: $('#signal'), on: false, t: 0, next: 0 };
  if (sig.s) new IntersectionObserver(es => { sig.on = es[0].isIntersecting; }).observe(sig.s.closest('.why-viz'));
  function noisePath(amp, seed) {
    let d = 'M0 75';
    for (let x = 0; x <= 300; x += 6) d += ` L${x} ${(75 + (Math.random() - 0.5) * amp * (0.6 + 0.4 * Math.sin(x / 23 + seed))).toFixed(1)}`;
    return d;
  }
  function stepSignal(now, dt) {
    if (!sig.s || (!sig.on && sig.t)) return;
    sig.t += reduce ? 0 : dt;
    if (now > sig.next) { sig.next = now + (reduce ? 1e9 : 110); sig.a.setAttribute('d', noisePath(120, 0)); sig.b.setAttribute('d', noisePath(80, 2)); }
    let d = '';
    for (let x = 0; x <= 300; x += 4) d += `${x ? ' L' : 'M'}${x} ${(75 + Math.sin(x / 300 * Math.PI * 3 - sig.t * 2.2) * 26).toFixed(1)}`;
    sig.s.setAttribute('d', d);
  }
  fillStack('#more-stack', [15, 16, 17, 18, 19]);

  const xIcon = '<svg class="xmark" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
  $$('[data-creators]').forEach(g => {
    const [a, b] = g.dataset.creators.split(',').map(Number);
    CREATORS.slice(a, b).forEach(c => {
      const card = document.createElement('a');
      card.className = 'ccard';
      card.href = `https://x.com/${c[0]}`;
      card.target = '_blank';
      card.rel = 'noopener';
      card.append(avatar(c));
      card.insertAdjacentHTML('beforeend', `<span><b>${c[1]}</b><small>@${c[0]} · <em>${c[2]}</em></small></span>${xIcon}`);
      g.append(card);
    });
  });

  /* ---------- reveals ---------- */
  $$('[data-stagger]').forEach(p => $$(':scope > .reveal', p).forEach((el, i) => el.style.setProperty('--d', i * 110 + 'ms')));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const n = $('[data-count]', e.target);
    if (n) countUp(n);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  $$('.reveal').forEach(el => io.observe(el));

  const title = $('#hero-title');
  if (title) setTimeout(() => title.classList.add('in'), 60);

  function countUp(el) {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (reduce) return;
    const t0 = performance.now(), dur = 1700;
    const step = now => {
      const p = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  /* ---------- marquees ---------- */
  const marquees = $$('.mq').map(root => {
    const track = $('.mq-track', root);
    const group = $('.mq-group', root);
    // duplicate content until it can loop seamlessly
    const clone = () => { const c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('a', c).forEach(a => a.tabIndex = -1); track.append(c); };
    clone(); clone();
    const m = { root, track, group, x: 0, w: 0, speed: +root.dataset.speed || 30, dir: +root.dataset.dir || 1, cur: 0, hover: false, visible: true };
    m.measure = () => { m.w = group.getBoundingClientRect().width; };
    if (root.dataset.hover === 'pause') {
      root.addEventListener('mouseenter', () => m.hover = true);
      root.addEventListener('mouseleave', () => m.hover = false);
    }
    m.cur = m.speed;
    return m;
  });
  const mqIO = new IntersectionObserver(es => es.forEach(e => { const m = marquees.find(m => m.root === e.target); if (m) m.visible = e.isIntersecting; }));
  marquees.forEach(m => mqIO.observe(m.root));
  const measureAll = () => marquees.forEach(m => m.measure());
  document.fonts?.ready.then(measureAll);
  addEventListener('load', measureAll);
  measureAll();

  /* ---------- service demos ---------- */
  const demos = $$('[data-demo]').map(el => ({ el, type: el.dataset.demo, k: 0, visible: false }));
  const demoIO = new IntersectionObserver(es => es.forEach(e => { const d = demos.find(d => d.el === e.target); if (d) d.visible = e.isIntersecting; }), { threshold: 0.3 });
  demos.forEach(d => demoIO.observe(d.el));

  const SCORES = [[94, 88, 91, 97], [89, 95, 86, 93], [97, 84, 90, 95], [86, 92, 96, 91]];
  const SCORE_WHO = [2, 4, 6, 9];
  const ATTR = [
    'M0 82 C40 80 70 74 100 64 S160 40 200 32 S260 14 300 8',
    'M0 84 C30 82 60 70 100 66 S150 52 190 36 S250 22 300 12',
    'M0 80 C50 79 80 68 120 58 S170 46 210 26 S270 16 300 6',
  ];

  const runDemo = d => {
    const el = d.el;
    if (d.type === 'brief') {
      const items = $$('li', el), n = items.length;
      d.k = (d.k + 1) % (n + 3);
      items.forEach((li, i) => li.classList.toggle('done', i < d.k));
      $('[data-status]', el).textContent = d.k >= n ? 'Ready' : 'Drafting';
    }
    if (d.type === 'ops') {
      const rows = $$('li', el), n = rows.length;
      d.k = (d.k + 1) % (n + 2);
      rows.forEach((li, i) => {
        const state = i < d.k ? 'done' : i === d.k ? 'active' : 'queued';
        li.className = state;
        $('em', li).textContent = state === 'done' ? 'Done' : state === 'active' ? 'In progress' : 'Queued';
      });
    }
    if (d.type === 'score') {
      if (d.k % 2 === 0) {
        const idx = (d.k / 2) % SCORE_WHO.length;
        const who = $('[data-who]', el);
        const bars = $$('.track i', el);
        who.classList.add('swap');
        bars.forEach(b => b.style.width = '0');
        setTimeout(() => {
          const c = CREATORS[SCORE_WHO[idx]];
          who.replaceChildren(avatar(c, false));
          who.insertAdjacentHTML('beforeend', `<span><b>${c[1]}</b><small>@${c[0]}</small></span>`);
          who.classList.remove('swap');
          bars.forEach((b, i) => setTimeout(() => b.style.width = SCORES[idx][i] + '%', 120 + i * 120));
        }, 450);
      }
      d.k++;
    }
    if (d.type === 'attr') {
      const box = $('.attr', el);
      const p = ATTR[d.k % ATTR.length];
      box.classList.remove('draw');
      setTimeout(() => {
        $('.ln', el).setAttribute('d', p);
        $('.area', el).setAttribute('d', p + ' L300 96 L0 96 Z');
        box.getBoundingClientRect();
        box.classList.add('draw');
      }, 500);
      d.k++;
    }
  };
  const DEMO_MS = { brief: 950, ops: 1000, score: 1900, attr: 4200 };
  demos.forEach(d => {
    runDemo(d);
    setInterval(() => { if (d.visible && !document.hidden) runDemo(d); }, reduce ? 4000 : DEMO_MS[d.type]);
  });

  /* ---------- orbit ---------- */
  const orbit = $('#orbit');
  const ctaCopy = $('#cta-copy');
  const orbs = [];
  if (orbit) {
    CREATORS.forEach((c, i) => {
      const ring = i % 2;
      const n = ring ? 10 : 10;
      const o = document.createElement('a');
      o.className = 'orb';
      o.href = `https://x.com/${c[0]}`;
      o.target = '_blank';
      o.rel = 'noopener';
      o.tabIndex = -1;
      o.dataset.name = c[1];
      o.append(avatar(c));
      orbit.append(o);
      orbs.push({ el: o, ring, a: (Math.floor(i / 2) / n) * Math.PI * 2 + ring * 0.31, ox: 0, oy: 0, hover: false });
      o.addEventListener('mouseenter', () => orbs.forEach(b => b.paused = true));
      o.addEventListener('mouseleave', () => orbs.forEach(b => b.paused = false));
    });
  }

  /* ---------- pointer ---------- */
  const mouse = { x: -9999, y: -9999 };
  const stage = $('#stage');
  const stageImg = $('.stage-img');
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });

  const progress = $('.progress i');
  const article = $('.article');
  const coverImg = $('.article-cover .cover img');

  const magnets = fine && !reduce ? $$('.magnetic').map(el => ({ el, x: 0, y: 0 })) : [];

  /* ---------- toc (legal pages) ---------- */
  const tocLinks = $$('.toc a');
  if (tocLinks.length) {
    const map = new Map(tocLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const tio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { tocLinks.forEach(a => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on'); }
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const h = document.getElementById(id); if (h) tio.observe(h); });
  }

  /* ---------- frame loop ---------- */
  let lastY = scrollY, vel = 0, last = performance.now(), navY = scrollY;

  const inView = r => r.bottom > 0 && r.top < innerHeight;
  const drift = (img, r, amt) => {
    const p = clamp(1 - (r.top + r.height) / (innerHeight + r.height));
    img.style.transform = `translate3d(0, ${((p - 0.5) * amt).toFixed(2)}%, 0)`;
  };
  let mouseMoved = 0;
  addEventListener('pointermove', () => { mouseMoved = performance.now(); }, { passive: true });

  // All layout reads happen first, then all style writes, so a frame never forces an extra layout.
  function frame(now) {
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    const y = scrollY;
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001) / 60, 0.12);
    lastY = y;

    /* ---- reads ---- */
    const stageR = stageImg && !reduce && y < innerHeight * 1.6 ? stage.getBoundingClientRect() : null;
    const artR = progress && article ? article.getBoundingClientRect() : null;
    const coverR = coverImg && !reduce ? coverImg.parentNode.getBoundingClientRect() : null;
    const orR = orbit && ctaCopy ? orbit.getBoundingClientRect() : null;
    const orbitLive = orR && inView(orR);
    const ctaR = orbitLive ? ctaCopy.getBoundingClientRect() : null;
    const sayR = say && !reduce ? say.getBoundingClientRect() : null;
    const magnetLive = magnets.length && now - mouseMoved < 1500;
    const magR = magnetLive ? magnets.map(m => m.el.getBoundingClientRect()) : null;

    /* ---- writes ---- */
    if (nav) {
      const scrolled = y > 12;
      if (scrolled !== nav._s) { nav.classList.toggle('scrolled', scrolled); nav._s = scrolled; }
      if (!nav.classList.contains('open')) {
        if (y > navY + 6 && y > 480) nav.classList.add('hide');
        else if (y < navY - 6 || y < 480) nav.classList.remove('hide');
      }
      navY = y;
    }

    if (stageR && inView(stageR)) drift(stageImg, stageR, 14);
    if (sayR) {
      const p = clamp((innerHeight * 0.82 - sayR.top) / (sayR.height + innerHeight * 0.3));
      const lit = Math.round(p * sayBits.length);
      if (lit !== sayLit) { sayLit = lit; sayBits.forEach((b, i) => b.classList.toggle('on', i < lit)); }
    }
    stepFlow(now, dt);
    stepSignal(now, dt);

    if (artR) progress.style.transform = `scaleX(${clamp(-artR.top / Math.max(1, artR.height - innerHeight * 0.6)).toFixed(4)})`;
    if (coverR && inView(coverR)) drift(coverImg, coverR, 12);

    if (!reduce) {
      const boost = 1 + Math.min(Math.abs(vel) * 0.09, 5);
      marquees.forEach(m => {
        if (!m.visible || !m.w) return;
        m.cur = lerp(m.cur, m.hover ? 0 : m.speed * boost, 0.06);
        m.x += m.cur * dt * m.dir;
        const off = ((m.x % m.w) + m.w) % m.w;
        m.track.style.transform = `translate3d(${(-off).toFixed(2)}px,0,0)`;
      });
    }

    if (orbitLive) {
      const cx = ctaR.left + ctaR.width / 2 - orR.left;
      const cy = ctaR.top + ctaR.height / 2 - orR.top;
      const small = orR.width < 720;
      orbs.forEach(o => {
        if (!reduce && !o.paused) o.a += dt * (o.ring ? -0.07 : 0.1);
        const rx = orR.width * (o.ring ? (small ? 0.40 : 0.36) : (small ? 0.46 : 0.45));
        const ry = small ? (o.ring ? 230 : 290) : (o.ring ? 205 : 270);
        const x = cx + Math.cos(o.a) * rx;
        const yy = cy + Math.sin(o.a) * ry;
        const depth = Math.sin(o.a);
        // pull toward the cursor, like a small gravity well
        const dx = mouse.x - (orR.left + x), dy = mouse.y - (orR.top + yy);
        const d = Math.hypot(dx, dy);
        const pull = d < 180 ? (180 - d) / 180 : 0;
        o.ox = lerp(o.ox, dx * pull * 0.35, 0.08);
        o.oy = lerp(o.oy, dy * pull * 0.35, 0.08);
        o.el.style.transform = `translate3d(${(x + o.ox).toFixed(1)}px, ${(yy + o.oy).toFixed(1)}px, 0) scale(${(0.68 + (depth + 1) * 0.2).toFixed(3)})`;
        o.el.style.opacity = (0.22 + (depth + 1) * 0.2).toFixed(3);
        const z = depth > 0 ? 3 : 0;
        if (z !== o.z) { o.el.style.zIndex = z; o.z = z; }
      });
    }

    if (magnetLive) {
      magnets.forEach((m, i) => {
        const r = magR[i];
        const cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
        const dx = mouse.x - cx, dy = mouse.y - cy;
        const near = Math.hypot(dx, dy) < 110;
        m.x = lerp(m.x, near ? dx * 0.22 : 0, 0.14);
        m.y = lerp(m.y, near ? dy * 0.3 : 0, 0.14);
        m.el.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0)`;
      });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measureAll(); flow.layout?.(); }, 150); });
})();
