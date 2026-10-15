/* GRVTY free tools: Influencer Email Finder + Engagement Audit.
   Talks to /api/socialfetch (see api/socialfetch.js), which adds the Social Fetch key server-side.
   If that proxy isn't deployed or has no key yet, the tools run in preview mode with sample data. */
(() => {
  const API = '/api/socialfetch';
  const form = document.getElementById('tool');
  if (!form) return;

  const kind = form.dataset.tool; // 'email' | 'audit'
  const seg = form.querySelector('.seg');
  const input = form.querySelector('input[name="handle"]');
  const btn = form.querySelector('button[type="submit"]');
  const err = form.querySelector('.form-err');
  const results = document.getElementById('results');
  const out = document.getElementById('out');
  const btnLabel = btn.innerHTML;
  let platform = 'instagram';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => typeof v === 'number' && isFinite(v);
  const fmt = n => {
    if (!num(n)) return '–';
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return Math.round(n).toLocaleString('en-US');
  };
  const pct = (n, d = 2) => num(n) ? n.toFixed(n >= 10 ? 1 : d).replace(/\.?0+$/, '') + '%' : '–';
  const dateFmt = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const P_NAME = { instagram: 'Instagram', tiktok: 'TikTok' };

  /* ---------- platform toggle ---------- */
  seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    platform = b.dataset.platform;
    seg.dataset.v = platform;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    input.focus();
  }));

  /* ---------- handle parsing ---------- */
  function parseHandle(raw) {
    let v = raw.trim();
    const url = v.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i);
    if (url) {
      v = url[1];
      if (/tiktok\.com/i.test(raw)) setPlatform('tiktok');
      else setPlatform('instagram');
    }
    v = v.replace(/^@/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
  }
  function setPlatform(p) { seg.querySelector(`[data-platform="${p}"]`)?.click(); }

  /* ---------- API ---------- */
  async function call(path) {
    try {
      const r = await fetch(`${API}?path=${encodeURIComponent(path)}`, { headers: { accept: 'application/json' } });
      if (!(r.headers.get('content-type') || '').includes('json')) return { preview: true };
      const j = await r.json();
      if (j?.error?.code === 'not_configured') return { preview: true };
      if (!r.ok) return { error: r.status, code: j?.error?.code };
      return { data: j.data };
    } catch {
      return { preview: true };
    }
  }

  const ERRORS = {
    400: 'That handle doesn’t look right. Check the spelling and try again.',
    402: 'The tool is out of lookups for now. Please try again later.',
    429: 'Too many lookups in a row. Give it a minute and try again.',
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const handle = parseHandle(input.value);
    if (!handle) { err.textContent = 'Enter an Instagram or TikTok handle, like @creator, or paste a profile link.'; input.focus(); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Looking up';
    showLoading();

    const path = `/v1/${platform}/profiles/${encodeURIComponent(handle)}${kind === 'audit' ? '/engagement' : ''}`;
    let res = await call(path);
    let preview = false;
    if (res.preview) { preview = true; res = { data: SAMPLE[kind](platform) }; await wait(700); }

    btn.disabled = false;
    btn.innerHTML = btnLabel;

    if (res.error) {
      out.innerHTML = notice('Something went wrong', ERRORS[res.error] || 'We couldn’t complete that lookup. Please try again in a moment.');
    } else {
      const d = res.data || {};
      currentData = d;
      const status = d.lookupStatus;
      if (status === 'not_found') out.innerHTML = notice('No account found', `We couldn’t find <b>@${esc(handle)}</b> on ${P_NAME[platform]}. Check the spelling, or switch platform.`);
      else if (status === 'private' && !(kind === 'email' && d.profile)) out.innerHTML = notice('This account is private', `<b>@${esc(handle)}</b> is private, so its public details aren’t available.`);
      else if (status === 'restricted') out.innerHTML = notice('This account is restricted', `${P_NAME[platform]} restricts access to <b>@${esc(handle)}</b>, so we can’t read it.`);
      else out.innerHTML = (preview ? previewNote() : '') + (kind === 'email' ? renderEmail(d) : renderAudit(d));
    }
    out.classList.remove('r-in'); void out.offsetWidth; out.classList.add('r-in');
    wire();
    results.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function showLoading() {
    results.hidden = false;
    out.innerHTML = `<div class="r-grid"><div class="r-card"><div class="skel" style="height:60px;width:60px;border-radius:50%"></div><div class="skel" style="height:14px;width:70%;margin-top:18px"></div><div class="skel" style="height:14px;width:50%;margin-top:10px"></div></div><div class="r-card"><div class="skel" style="height:22px;width:40%"></div><div class="skel" style="height:120px;margin-top:20px"></div></div></div>`;
  }
  const previewNote = () => `<div class="preview-note"><span aria-hidden="true">◐</span><div><b>Preview mode.</b> Live lookups switch on once the Social Fetch API key is connected. Showing sample data for a fictional creator.</div></div>`;
  const notice = (t, p) => `<div class="r-card empty" style="max-width:640px"><b>${t}</b><p>${p}</p></div>`;

  /* ---------- shared bits ---------- */
  const VERIFIED = '<svg viewBox="0 0 24 24" aria-label="Verified"><path d="M12 1l2.6 2.1 3.3-.4.9 3.2 2.9 1.7-1.2 3.1 1.2 3.1-2.9 1.7-.9 3.2-3.3-.4L12 23l-2.6-2.1-3.3.4-.9-3.2-2.9-1.7 1.2-3.1-1.2-3.1 2.9-1.7.9-3.2 3.3.4z"/><path d="M8 12.5l2.7 2.7L16 9.8" fill="none" stroke="#fff" stroke-width="2"/></svg>';
  function avatarHTML(p) {
    const letter = esc(((p.displayName || p.handle || 'G').match(/[A-Za-z0-9]/) || ['G'])[0].toUpperCase());
    if (!p.avatarUrl) return `<span class="av mono">${letter}</span>`;
    return `<span class="av"><img src="${esc(p.avatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('mono');this.parentNode.textContent='${letter}'"></span>`;
  }
  function profileCard(p, metrics, extra = '') {
    const url = p.profileUrl || (platform === 'tiktok' ? `https://www.tiktok.com/@${p.handle}` : `https://www.instagram.com/${p.handle}/`);
    const counts = metrics ? `<div class="counts">
        <div><b>${fmt(metrics.followers)}</b><span>Followers</span></div>
        <div><b>${fmt(metrics.following)}</b><span>Following</span></div>
        <div><b>${fmt(platform === 'tiktok' ? metrics.likes ?? metrics.posts : metrics.posts)}</b><span>${platform === 'tiktok' && num(metrics.likes) ? 'Likes' : 'Posts'}</span></div>
      </div>` : '';
    return `<div class="r-card">
      <div class="prof">${avatarHTML(p)}<div><b>${esc(p.displayName || p.handle)}${p.verified ? VERIFIED : ''}</b><a href="${esc(url)}" target="_blank" rel="noopener">@${esc(p.handle)} on ${P_NAME[platform]} ↗</a></div></div>
      ${counts}
      ${p.categoryName ? `<span class="cat-tag">${esc(p.categoryName)}</span>` : ''}
      ${extra}
    </div>`;
  }

  /* ---------- email finder ---------- */
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  function deobfuscate(t) {
    return t
      .replace(/\s*[\[({<]\s*(?:at|@)\s*[\])}>]\s*/gi, '@')
      .replace(/\s*[\[({<]\s*(?:dot|\.)\s*[\])}>]\s*/gi, '.')
      .replace(/([\w.+-]+)\s+at\s+([\w-]+)\s+dot\s+([a-z]{2,})/gi, '$1@$2.$3');
  }
  function findEmails(text) {
    if (!text) return [];
    const found = deobfuscate(text).match(EMAIL_RE) || [];
    return [...new Set(found.map(e => e.replace(/\.+$/, '').toLowerCase()))];
  }
  function linksOf(p) {
    const links = [];
    (p.bioLinks || []).forEach(l => l?.url && links.push({ title: l.title || '', url: l.url }));
    if (p.bioLink?.url) links.push({ title: '', url: p.bioLink.url });
    if (p.externalUrl && !links.some(l => l.url === p.externalUrl)) links.push({ title: '', url: p.externalUrl });
    return links;
  }
  function renderEmail(d) {
    const p = d.profile || {};
    const m = d.metrics || {};
    const links = linksOf(p);
    const emails = new Map();
    findEmails(p.bio).forEach(e => emails.set(e, 'Found in bio'));
    links.forEach(l => {
      const mail = l.url.match(/^mailto:([^?]+)/i);
      if (mail) emails.set(decodeURIComponent(mail[1]).toLowerCase(), 'Found in profile link');
      findEmails(l.title).forEach(e => emails.has(e) || emails.set(e, 'Found in link title'));
    });

    let bio = esc(p.bio || '');
    emails.forEach((_, e) => { bio = bio.replace(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); });
    const bioBlock = p.bio ? `<div class="bio">${bio}</div>` : '';

    const MAIL = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
    const emailBlock = emails.size
      ? [...emails].map(([e, src]) => `<div class="email-row">
          <span class="ic">${MAIL}</span>
          <div><b>${esc(e)}</b><small>${src}</small></div>
          <div class="acts"><button type="button" class="chip-btn" data-copy="${esc(e)}">Copy</button><a class="chip-btn" href="mailto:${esc(e)}">Email ↗</a></div>
        </div>`).join('')
      : `<div class="empty"><b>No public email listed</b><p>@${esc(p.handle)} doesn’t show an email in their bio or profile links. ${links.length ? 'Their link-in-bio below is the next place to check, as many creators keep a contact form or media kit there.' : 'Many business accounts only show contact buttons inside the app, so it’s worth checking there.'}</p></div>`;

    const linkBlock = links.length ? `<div class="r-card"><h3>Profile links</h3><div class="link-list">${links.map(l => `<a href="${esc(/^https?:|^mailto:/i.test(l.url) ? l.url : 'https://' + l.url)}" target="_blank" rel="noopener nofollow">${esc(l.title || l.url.replace(/^https?:\/\//, ''))}<span>↗</span></a>`).join('')}</div></div>` : '';

    return `<div class="r-grid">
      ${profileCard(p, m, bioBlock)}
      <div class="r-stack">
        <div class="r-card"><h3>${emails.size ? `${emails.size === 1 ? 'Email' : 'Emails'} found` : 'Result'}</h3>${emailBlock}</div>
        ${linkBlock}
      </div>
    </div>`;
  }

  /* ---------- engagement audit ---------- */
  function normAudit(d) {
    const m = d.metrics || {};
    const tt = platform === 'tiktok';
    const handle = d.profile?.handle || '';
    const items = (tt ? d.videos : d.posts) || [];
    return {
      p: d.profile || {},
      can: d.canCalculateEngagement !== false,
      m: {
        followers: m.followers, avg: m.averageEngagementRatePercent, med: m.medianEngagementRatePercent,
        likes: tt ? m.averageLikesPerVideo : m.averageLikesPerPost,
        comments: tt ? m.averageCommentsPerVideo : m.averageCommentsPerPost,
        views: tt ? m.averageViewsPerVideo : null, shares: tt ? m.averageSharesPerVideo : null,
        c2l: m.commentToLikeRatio, vol: m.engagementVolatilityPercent, label: m.qualityLabel, note: m.qualityLabelNote,
      },
      posts: items.filter(x => num(x.engagementRatePercent)).map(x => ({
        date: x.createdAt, er: x.engagementRatePercent, likes: x.likeCount, comments: x.commentCount,
        views: x.viewCount ?? x.videoViewCount, shares: x.shareCount, hi: x.isOutlierHigh, lo: x.isOutlierLow,
        url: tt ? `https://www.tiktok.com/@${handle}/video/${x.id}` : (x.postUrl || `https://www.instagram.com/p/${x.shortcode}/`),
      })).sort((a, b) => new Date(a.date) - new Date(b.date)),
      segments: (d.contentSegments || []).filter(s => s.postCount > 0 && num(s.averageEngagementRatePercent)),
      cov: d.sampleCoverage || {}, formula: d.formulaDescription, fresh: d.dataFreshnessNote, insight: d.insight,
    };
  }

  const QL = {
    excellent: ['Excellent', '<path d="M5 12l5 5 9-10"/>'],
    strong: ['Strong', '<path d="M5 12l5 5 9-10"/>'],
    moderate: ['Moderate', '<path d="M5 12h14"/>'],
    low: ['Low', '<path d="M12 5v9M12 18v.5"/>'],
    directional: ['Directional', '<circle cx="12" cy="12" r="8"/><path d="M12 8v5"/>'],
  };

  function renderAudit(d) {
    const a = normAudit(d);
    const m = a.m;
    const ql = QL[m.label];
    const tiles = [
      [fmt(m.followers), 'Followers'],
      [pct(m.med), 'Median engagement'],
      [fmt(m.likes), `Avg. likes per ${platform === 'tiktok' ? 'video' : 'post'}`],
      [fmt(m.comments), 'Avg. comments'],
      ...(platform === 'tiktok' ? [[fmt(m.views), 'Avg. views'], [fmt(m.shares), 'Avg. shares']] : []),
      [num(m.c2l) ? m.c2l.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : '–', 'Comment-to-like ratio'],
      [pct(m.vol, 0), 'Volatility'],
    ].map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('');

    const segs = a.segments.length > 1 ? (() => {
      const max = Math.max(...a.segments.map(s => s.averageEngagementRatePercent));
      const names = { video: 'Reels / video', image: 'Photos', sidecar: 'Carousels', unknown: 'Other' };
      return `<div class="r-card"><h3>By content type</h3><div class="seg-bars">${a.segments.map(s => `<div><span>${names[s.mediaType] || esc(s.mediaType)}</span><span class="trk"><i style="width:${(s.averageEngagementRatePercent / max * 100).toFixed(1)}%"></i></span><em>${pct(s.averageEngagementRatePercent)}</em></div>`).join('')}</div><p class="fine" style="margin-top:10px">Average engagement rate per format, across ${a.segments.reduce((n, s) => n + s.postCount, 0)} recent posts.</p></div>`;
    })() : '';

    const ins = a.insight;
    const list = arr => (arr || []).map(x => `<li>${esc(x)}</li>`).join('');
    const insight = ins ? `<div class="r-card"><h3>What it means</h3>
        <p class="insight-head">${esc(ins.headlineInsight)}</p>
        <p class="insight-p">${esc(ins.engagementAssessment)}</p>
        <div class="ins-cols">
          ${ins.contentPatternObservations?.length ? `<div><h4>Patterns</h4><ul>${list(ins.contentPatternObservations)}</ul></div>` : ''}
          ${ins.recommendedExperiments?.length ? `<div><h4>Worth testing</h4><ul>${list(ins.recommendedExperiments)}</ul></div>` : ''}
          ${ins.risksAndCaveats?.length ? `<div><h4>Caveats</h4><ul>${list(ins.risksAndCaveats)}</ul></div>` : ''}
        </div></div>` : '';

    const total = a.cov.totalRecentPosts ?? a.cov.totalRecentVideos;
    const usable = a.cov.usablePosts ?? a.cov.usableVideos;
    const unit = platform === 'tiktok' ? 'videos' : 'posts';
    const fine = `<div class="fine">
        ${num(usable) ? `<p>Based on ${usable} of ${total} recent ${unit}.</p>` : ''}
        ${a.formula ? `<p>${esc(a.formula)}</p>` : ''}
        ${a.fresh ? `<p>${esc(a.fresh)}</p>` : ''}
      </div>`;

    if (!a.can) {
      return `<div class="r-grid">${profileCard(a.p, null)}<div class="r-card empty"><b>Not enough data to score</b><p>${esc(m.note || `There aren’t enough recent public ${unit} with likes and comments to calculate a reliable engagement rate.`)}</p>${fine}</div></div>`;
    }

    return `<div class="r-grid">
      ${profileCard(a.p, null, `<div class="bio">${esc(a.p.bio || '')}</div>`)}
      <div class="r-stack">
        <div class="r-card">
          <h3>Engagement rate</h3>
          <div class="score">
            <div class="score-big"><b>${pct(m.avg)}</b><span>Average across recent ${unit}</span></div>
            ${ql ? `<span class="ql ${m.label}"><svg viewBox="0 0 24 24">${ql[1]}</svg>${ql[0]}</span>` : ''}
            ${m.note ? `<p class="ql-note">${esc(m.note)}</p>` : ''}
          </div>
          <div class="tiles">${tiles}</div>
        </div>
        <div class="r-card">
          <h3>Engagement by ${platform === 'tiktok' ? 'video' : 'post'}</h3>
          <div class="chart-wrap" data-chart></div>
          <div class="chart-key">
            <span><i style="background:#9db7f7"></i>${platform === 'tiktok' ? 'Video' : 'Post'}</span>
            <span><i style="background:#2f6bff"></i>High outlier</span>
            <span><i style="background:#cfd8ec"></i>Low outlier</span>
            <span><i style="background:none;border-top:1px dashed #141414;height:0;border-radius:0;width:14px"></i>Median</span>
          </div>
          <details class="table"><summary>View as table</summary>
            <table><thead><tr><th>Date</th><th>Engagement</th><th>Likes</th><th>Comments</th>${platform === 'tiktok' ? '<th>Views</th>' : ''}</tr></thead>
            <tbody>${a.posts.map(x => `<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${dateFmt(x.date) || 'Post'}</a></td><td>${pct(x.er)}</td><td>${fmt(x.likes)}</td><td>${fmt(x.comments)}</td>${platform === 'tiktok' ? `<td>${fmt(x.views)}</td>` : ''}</tr>`).join('')}</tbody></table>
          </details>
        </div>
        ${segs}
        ${insight}
        ${fine}
      </div>
    </div>`;

  }

  /* ---------- bar chart (single series, one axis, hover tooltip) ---------- */
  function drawChart(wrap, a) {
    const posts = a.posts;
    if (!posts.length) { wrap.innerHTML = '<p class="fine">No scorable posts in the recent sample.</p>'; return; }
    const W = Math.max(280, wrap.clientWidth), H = 240, L = 40, R = 8, T = 18, B = 26;
    const pw = W - L - R, ph = H - T - B;
    const max = Math.max(...posts.map(p => p.er), a.m.med || 0) * 1.15 || 1;
    const step = niceStep(max / 3);
    const top = Math.ceil(max / step) * step;
    const y = v => T + ph - (v / top) * ph;
    const n = posts.length;
    const slot = pw / n;
    const gap = Math.max(2, Math.min(10, slot * 0.28));
    const bw = slot - gap;
    const r = Math.min(4, bw / 2);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Engagement rate for each of the last ${n} posts">`;
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(2)}%</text>`;
    }
    posts.forEach((p, i) => {
      const x = L + i * slot + gap / 2, yt = y(p.er), yb = T + ph;
      const h = Math.max(2, yb - yt);
      const rr = Math.min(r, h);
      const cls = p.hi ? 'bar hi' : p.lo ? 'bar lo' : 'bar';
      svg += `<path class="${cls}" data-i="${i}" d="M${x},${yb} V${yb - h + rr} Q${x},${yb - h} ${x + rr},${yb - h} H${x + bw - rr} Q${x + bw},${yb - h} ${x + bw},${yb - h + rr} V${yb} Z"/>`;
      if (p.hi) svg += `<text class="mk" x="${x + bw / 2}" y="${yb - h - 6}" text-anchor="middle">High</text>`;
    });
    if (num(a.m.med)) {
      const ym = y(a.m.med);
      svg += `<line class="med" x1="${L}" x2="${W - R}" y1="${ym}" y2="${ym}"/><text class="med-l" x="${W - R}" y="${ym - 6}" text-anchor="end">Median ${pct(a.m.med)}</text>`;
    }
    const labelEvery = Math.ceil(n / Math.max(2, Math.floor(pw / 64)));
    posts.forEach((p, i) => {
      if (i % labelEvery === 0 || i === n - 1) svg += `<text class="axis" x="${L + i * slot + slot / 2}" y="${H - 6}" text-anchor="middle">${dateFmt(p.date)}</text>`;
      svg += `<rect class="hit" data-i="${i}" x="${L + i * slot}" y="${T}" width="${slot}" height="${ph}"/>`;
    });
    svg += '</svg><div class="tip" role="tooltip"></div>';
    wrap.innerHTML = svg;

    const tip = wrap.querySelector('.tip');
    const bars = wrap.querySelectorAll('.bar');
    const show = i => {
      const p = posts[i];
      bars.forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      const scale = wrap.clientWidth / W;
      tip.innerHTML = `<b>${pct(p.er)}</b><span>${dateFmt(p.date)}${p.hi ? ' · High outlier' : p.lo ? ' · Low outlier' : ''}</span><br>${fmt(p.likes)} likes · ${fmt(p.comments)} comments${num(p.views) ? `<br>${fmt(p.views)} views` : ''}`;
      tip.style.left = Math.min(Math.max((L + i * slot + slot / 2) * scale, 80), wrap.clientWidth - 80) + 'px';
      tip.style.top = y(p.er) * scale + 'px';
      tip.classList.add('on');
    };
    const hide = () => { tip.classList.remove('on'); bars.forEach(b => b.classList.remove('on')); };
    wrap.querySelectorAll('.hit').forEach(h => {
      const i = +h.dataset.i;
      h.addEventListener('mouseenter', () => show(i));
      h.addEventListener('mouseleave', hide);
      h.addEventListener('click', () => window.open(posts[i].url, '_blank', 'noopener'));
    });
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  let lastAudit = null;
  let currentData = null; // raw response, kept for the chart and resizes
  function wire() {
    out.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1800); } catch { /* clipboard blocked */ }
    }));
    const wrap = out.querySelector('[data-chart]');
    if (wrap) { lastAudit = normAudit(currentData); drawChart(wrap, lastAudit); }
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const w = out.querySelector('[data-chart]'); if (w && lastAudit) drawChart(w, lastAudit); }, 150); });

  /* ---------- sample data (preview mode only) ---------- */
  const SAMPLE = {
    email: p => ({
      lookupStatus: 'found',
      profile: {
        handle: 'sample.creator', displayName: 'Sample Creator', verified: true, avatarUrl: null,
        bio: 'AI tools, explained in 60 seconds.\nWeekly breakdowns of new models and agents.\nCollabs: hello [at] samplecreator [dot] com',
        categoryName: p === 'instagram' ? 'Digital creator' : null,
        bioLinks: [{ title: 'Newsletter', url: 'https://samplecreator.com/newsletter' }, { title: 'Media kit', url: 'https://samplecreator.com/kit' }],
      },
      metrics: { followers: 184200, following: 412, posts: 638, likes: 2400000 },
    }),
    audit: p => {
      const tt = p === 'tiktok';
      const ers = [3.1, 4.4, 2.6, 5.2, 3.8, 9.6, 3.3, 2.1, 4.9, 3.6, 4.1, 0.9];
      const f = 184200;
      const items = ers.map((er, i) => {
        const likes = Math.round(f * er / 100 * 0.94);
        const d = new Date(Date.UTC(2026, 8, 2 + i * 3));
        return {
          id: String(7400000000 + i), shortcode: 'S' + i, mediaType: i % 3 === 0 ? 'sidecar' : i % 2 ? 'video' : 'image',
          createdAt: d.toISOString(), likeCount: likes, commentCount: Math.round(f * er / 100 * 0.06),
          shareCount: tt ? Math.round(likes * 0.08) : undefined, viewCount: tt ? likes * 11 : undefined, videoViewCount: !tt && i % 2 ? likes * 9 : null,
          engagementRatePercent: er, isOutlierHigh: er > 8, isOutlierLow: er < 1.5, postUrl: 'https://www.instagram.com/',
        };
      });
      const metrics = {
        followers: f, averageEngagementRatePercent: 3.97, medianEngagementRatePercent: 3.7,
        [tt ? 'averageLikesPerVideo' : 'averageLikesPerPost']: 6870, [tt ? 'averageCommentsPerVideo' : 'averageCommentsPerPost']: 439,
        averageViewsPerVideo: tt ? 75600 : undefined, averageSharesPerVideo: tt ? 550 : undefined,
        commentToLikeRatio: 0.064, engagementVolatilityPercent: 48, qualityLabel: 'strong',
        qualityLabelNote: 'Engagement is well above typical for accounts of this size, with one breakout post and one quiet one.',
      };
      return {
        lookupStatus: 'found', canCalculateEngagement: true,
        profile: { handle: 'sample.creator', displayName: 'Sample Creator', verified: true, avatarUrl: null, bio: 'AI tools, explained in 60 seconds.' },
        metrics, [tt ? 'videos' : 'posts']: items,
        contentSegments: tt ? [] : [
          { mediaType: 'video', postCount: 4, averageEngagementRatePercent: 4.6 },
          { mediaType: 'sidecar', postCount: 4, averageEngagementRatePercent: 4.0 },
          { mediaType: 'image', postCount: 4, averageEngagementRatePercent: 3.1 },
        ],
        sampleCoverage: { [tt ? 'totalRecentVideos' : 'totalRecentPosts']: 12, [tt ? 'usableVideos' : 'usablePosts']: 12 },
        formulaDescription: `Engagement rate per ${tt ? 'video' : 'post'} is (likes + comments${tt ? ' + shares' : ''}) divided by followers, times 100.`,
        dataFreshnessNote: null,
        insight: {
          headlineInsight: 'A consistently engaged audience, with one breakout tutorial pulling well above the rest.',
          engagementAssessment: 'Most posts land between 2.5% and 5%, which suggests a real, returning audience rather than reach from a single viral moment. Comments are healthy relative to likes, a good sign people are reading, not just scrolling.',
          contentPatternObservations: ['Step-by-step walkthroughs outperform news recaps.', 'Carousels hold attention better than single images.'],
          recommendedExperiments: ['Brief a hands-on product walkthrough, not a feature list.', 'Test a two-part series to carry interest across posts.'],
          risksAndCaveats: ['One outlier lifts the average; the median is the safer planning number.', 'Twelve posts is a small sample.'],
          apiUseCaseTeaser: '',
        },
      };
    },
  };
})();
