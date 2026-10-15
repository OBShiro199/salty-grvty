/* The Creator Launch Playbook tools (thank-you page). */
(function(){
  const $ = s => document.querySelector(s);
  const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');

  /* progress + active nav */
  const prog = $('#progress');
  const links = [...document.querySelectorAll('.pb-chapters a[href^="#ch"]')];
  const secs = [...document.querySelectorAll('[data-ch]')];
  function onScroll(){
    const h = document.documentElement;
    prog.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100).toFixed(2) + '%';
    let cur = null; secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id; });
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  function copy(text, el, ok){
    const fail = () => { el.textContent = 'Select the text and copy it manually.'; };
    try { navigator.clipboard.writeText(text).then(() => { el.textContent = ok; setTimeout(() => el.textContent = '', 2200); }, fail); } catch(e){ fail(); }
  }

  /* TOOL 1 */
  const S = [['depth','Technical depth',.28],['lit','Audience literacy',.22],['eng','Engagement quality',.20],['safe','Brand safety',.15],['fit','Buyer fit',.15]];
  $('#bars').innerHTML = S.map(([k,l]) => `<div class="barrow"><span>${l}</span><div class="t"><div class="f" id="f-${k}"></div></div><span id="v-${k}"></span></div>`).join('');
  function score(){
    let total = 0; const v = {};
    S.forEach(([k,,w]) => { v[k] = +$('#s-'+k).value; $('#o-'+k).textContent = v[k]; $('#f-'+k).style.width = v[k]/5*100 + '%'; $('#v-'+k).textContent = v[k] + '/5'; total += w*v[k]; });
    const s = Math.round(total/5*100); $('#score').textContent = s;
    let c, t, d;
    if (v.safe <= 2){ c='bad'; t='Pass · brand safety gate'; d='Brand risk outweighs reach. Your logo inherits their history.'; }
    else if (s >= 80){ c='good'; t='Anchor voice'; d='Lead with them. Give early access and a long-form slot.'; }
    else if (s >= 62){ c='mid'; t='Amplifier'; d='Strong for launch-day reach. Pair with an anchor for depth.'; }
    else if (s >= 45){ c=''; t='Test with one post'; d='Worth a single tracked placement before committing more.'; }
    else { c='bad'; t='Pass'; d='Signals are too weak for a technical buyer to trust the mention.'; }
    $('#verdict').className = 'verdict ' + c; $('#verdict-t').textContent = t; $('#verdict-c').textContent = d;
  }
  S.forEach(([k]) => $('#s-'+k).addEventListener('input', score)); score();

  /* TOOL 2 */
  const bf = ['product','buyer','one','space','proof','guard','cta'];
  const esc = s => s.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  function briefData(){
    const v = {}; bf.forEach(k => v[k] = $('#b-'+k).value.trim() || '—');
    return [['Product',v.product],['Who it is for',v.buyer],['The one thing',v.one],['Why it matters',v.space],['Proof path',v.proof],['Please do not claim',v.guard],['Yours to decide','Format, hook, tone, length and honest criticism.'],['The ask',v.cta+' · use your tracked link'],['Disclosure','Label as a paid partnership on every post.'],['Review','One accuracy check. Feedback within 24 hours.']];
  }
  function brief(){ $('#brief-out').innerHTML = '<span class="k">CREATOR BRIEF\n────────────</span>\n\n' + briefData().map(([k,v]) => `<span class="k">${esc(k.toUpperCase())}</span>\n${esc(v)}`).join('\n\n'); }
  bf.forEach(k => $('#b-'+k).addEventListener('input', brief)); brief();
  $('#copy-brief').addEventListener('click', () => copy('CREATOR BRIEF\n\n' + briefData().map(([k,v]) => k.toUpperCase()+'\n'+v).join('\n\n'), $('#brief-toast'), 'Copied'));

  /* TOOL 3 */
  const CH = ['YouTube','X','LinkedIn','Newsletters','Podcasts'];
  const BASE = {dev:[30,35,5,20,10], ml:[30,30,10,20,10], founder:[20,30,20,15,15], enterprise:[15,5,40,20,20], prosumer:[40,30,10,15,5]};
  const MOD = {aware:[-5,10,5,-5,-5], consider:[10,-10,-5,0,5], convert:[5,-5,0,10,-10]};
  const FMT = {
    aware:{YouTube:'short demo cuts from longer videos',X:'launch threads and 30-second screen recordings',LinkedIn:'operator posts on the problem you solve',Newsletters:'featured launch mention',Podcasts:'founder guest spot on the category'},
    consider:{YouTube:'full walkthroughs, teardowns and comparisons',X:'"I tried it on a real task" threads',LinkedIn:'case-style posts with numbers',Newsletters:'deep-dive sponsored sections',Podcasts:'long-form interviews on how it works'},
    convert:{YouTube:'tutorials ending in a tracked offer',X:'reminder posts with a creator code',LinkedIn:'posts tied to a demo or trial offer',Newsletters:'dedicated sends with one call to action',Podcasts:'host-read offer with a vanity URL'}
  };
  const NOTE = {dev:'Developers trust people who build on screen. Weight toward demos and threads.', ml:'ML engineers want evidence. Reproducible tests and teardowns earn the most belief.', founder:'Technical founders split time between building and buying. Mix velocity with operator stories.', enterprise:'Enterprise leaders build a business case. Credibility channels outweigh reach.', prosumer:'Prosumers discover visually. Show the outcome first, then the workflow.'};
  let buyer = 'dev', stage = 'aware';
  function mix(){
    let w = BASE[buyer].map((b,i) => Math.max(0, b + MOD[stage][i]));
    const tot = w.reduce((a,b) => a+b, 0); w = w.map(x => Math.round(x/tot*100));
    w[w.indexOf(Math.max(...w))] += 100 - w.reduce((a,b) => a+b, 0);
    $('#mix').innerHTML = CH.map((c,i) => `<div class="mixrow"><span>${c}</span><div class="t"><div class="f" style="width:${w[i]}%"></div></div><span>${w[i]}%</span></div>`).join('');
    const top = CH.map((c,i) => [c,w[i]]).sort((a,b) => b[1]-a[1]).slice(0,2);
    $('#formats').innerHTML = '<span class="mono">Lead formats</span>' + top.map(([c]) => `<span><b>${c}</b> · ${FMT[stage][c]}</span>`).join('');
    $('#mix-note').textContent = NOTE[buyer];
  }
  function seg(id, set){
    const g = $(id);
    g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); set(b.dataset.v); mix(); });
  }
  seg('#buyer-seg', v => buyer = v); seg('#stage-seg', v => stage = v); mix();

  /* TOOL 4 */
  function roas(){
    const n = id => Math.max(0, +$(id).value || 0);
    const spend = n('#r-spend'), sign = n('#r-sign'), act = Math.min(100, n('#r-act'))/100, conv = Math.min(100, n('#r-conv'))/100, val = n('#r-val');
    const cust = sign*act*conv, rev = cust*val, r = spend ? rev/spend : 0, cac = cust ? spend/cust : 0;
    $('#k-roas').textContent = r.toFixed(1) + 'X';
    $('#k-roas').style.color = r >= 3 ? 'var(--green)' : r >= 1 ? 'var(--fg)' : '#C2410C';
    $('#k-rev').textContent = fmt$(rev);
    $('#k-cust').textContent = Math.round(cust).toLocaleString('en-US');
    $('#k-cac').textContent = cust ? fmt$(cac) : '—';
    const rows = [['Your campaign', r, 'var(--blue)'], ['GRVTY avg.', 3, '#0A0A0A'], ['Break-even', 1, '#CFCFCB']];
    const max = Math.max(4, Math.ceil(r*1.15)), W = 400, L = 92, R = 40, bw = W - L - R;
    const x = v => L + Math.min(v, max)/max*bw;
    let svg = `<svg viewBox="0 0 ${W} 112" role="img">`;
    for (let t = 0; t <= max; t += max > 8 ? 2 : 1){ svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="96" stroke="#EEEEEA"/><text x="${x(t)}" y="110" font-size="9" text-anchor="middle" fill="#A6A6A2" font-family="Geist Mono, monospace">${t}X</text>`; }
    rows.forEach(([l,v,c],i) => { const y = 8 + i*30; svg += `<text x="0" y="${y+12}" font-size="11" fill="#6E6E6B" font-family="Geist, sans-serif">${l}</text><rect x="${L}" y="${y+2}" width="${Math.max(2, x(v)-L)}" height="14" rx="3" fill="${c}"/><text x="${x(v)+6}" y="${y+13}" font-size="10" fill="#0A0A0A" font-family="Geist Mono, monospace">${v.toFixed(1)}X</text>`; });
    $('#roas-chart').innerHTML = svg + '</svg>';
    const per = val*act*conv, need = per ? Math.ceil(spend*3/per) : 0;
    $('#roas-note').textContent = r >= 3 ? 'Above the 3X GRVTY client average. Put more budget behind the creators driving it.' : `To reach 3X at these rates you need about ${need.toLocaleString('en-US')} tracked sign-ups, or stronger activation and conversion.`;
  }
  ['#r-spend','#r-sign','#r-act','#r-conv','#r-val'].forEach(id => $(id).addEventListener('input', roas)); roas();

  /* TOOL 5 */
  const SPLIT = [['Proven creators',.60,'#0A0A0A','Anchors and amplifiers scored 62+'],['Testing new voices',.20,'#3D6BF2','One tracked post each, then decide'],['Amplification',.10,'#9DB5F8','Boosting and re-running top performers'],['Reserve',.10,'#D9D9D5','Held for what week one teaches you']];
  function budget(){
    const t = +$('#g-total').value, f = +$('#g-fee').value;
    $('#o-total').textContent = fmt$(t); $('#o-fee').textContent = fmt$(f);
    $('#split').innerHTML = SPLIT.map(([,p,c]) => `<div style="flex:${p};background:${c}"></div>`).join('');
    $('#legend').innerHTML = SPLIT.map(([k,p,c,d]) => `<div><i style="background:${c}"></i><span>${k} · ${Math.round(p*100)}%<small>${d}</small></span><b>${fmt$(t*p)}</b></div>`).join('');
    $('#g-slots').textContent = Math.max(0, Math.floor(t*.8/f));
    $('#g-weeks').textContent = t >= 200000 ? '8' : '6';
  }
  ['#g-total','#g-fee'].forEach(id => $(id).addEventListener('input', budget)); budget();

  /* CHECKLIST */
  const LIST = {
    'Narrative':['North-star goal agreed and written down','The one thing fits in a single sentence','Competitive white space documented','Claims and guardrails approved'],
    'Creators':['Every creator scored on the four signals','Lineup covers anchors, amplifiers and specialists','Contracts cover usage rights, timing and disclosure','Product access sent 7+ days before posting'],
    'Content':['Briefs sent without scripts','Technical contact assigned for questions','Drafts checked for accuracy only','Disclosure confirmed on every post'],
    'Launch':['Tracked links and codes tested end to end','Landing page matches the promise in the posts','Posting windows confirmed with every creator','Team on hand to reply during launch'],
    'Measure':['Two-week baseline captured before launch','"Where did you hear about us?" field live','Weekly read-out template ready','Budget set aside to re-run winners']
  };
  const KEY = 'grvty-playbook-checklist';
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){ saved = {}; }
  const box = $('#checklist'); let i = 0;
  box.innerHTML = Object.entries(LIST).map(([g, items]) => `<div class="cgroup"><h4><span>${g}</span><span class="tnum" data-g="${g}"></span></h4>${items.map(t => { const id = 'c' + (i++); return `<label for="${id}"><input type="checkbox" id="${id}" data-group="${g}" ${saved[id] ? 'checked' : ''}><span>${t}</span></label>`; }).join('')}</div>`).join('');
  function tally(){
    const all = [...box.querySelectorAll('input')], done = all.filter(x => x.checked).length;
    $('#check-count').textContent = `${done} / ${all.length} complete`;
    $('#check-meter').style.width = (done/all.length*100) + '%';
    Object.keys(LIST).forEach(g => { const gs = all.filter(x => x.dataset.group === g); box.querySelector(`[data-g="${g}"]`).textContent = gs.filter(x => x.checked).length + '/' + gs.length; });
  }
  box.addEventListener('change', e => { if (e.target.type !== 'checkbox') return; saved[e.target.id] = e.target.checked; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(err){} tally(); });
  $('#check-reset').addEventListener('click', () => { box.querySelectorAll('input').forEach(x => x.checked = false); saved = {}; try { localStorage.removeItem(KEY); } catch(e){} tally(); });
  tally();

  /* network */
  const NET = [['milesdeutscher','Miles Deutscher','662.4K'],['Scobleizer','Robert Scoble','570.7K'],['hasantoxr','Hasan Toor','432.2K'],['FellMentKE','FELIX','269.6K'],['DataChaz','DataChaz','162.4K'],['aisolopreneur','The AI Solopreneur','158K'],['EHuanglu','el.cine','125.3K'],['TukiFromKL','Tuki','115.4K'],['EXM7777','Machina','97.6K'],['alifcoder','Alif Hossain','90.2K'],['mhdfaran','Farhan','78.4K'],['Marryclaire_AI','Marry Claire','72.6K'],['aiedge_','AI Edge','57.5K'],['damianplayer','Damian Player','46.7K']];
  const row = NET.map(([h,n,f]) => `<span><img src="/assets/creators/${h}.jpg" alt="" loading="lazy">${n}<em>${f}</em></span>`).join('');
  $('#marquee').innerHTML = row + row;

})();
