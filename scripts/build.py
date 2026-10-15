#!/usr/bin/env python3
"""Generate the blog, tools and legal pages from shared templates.

Run from anywhere:  python3 scripts/build.py
Blog posts live in content/blog/*.md (front matter + a small Markdown subset).
The footer is copied from index.html so there is one source of truth.
"""
import datetime as dt
import html
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = '33'  # bump to bust browser caches for styles.css / main.js / tools.js
SITE = 'https://grvty.ltd'
BOOK = 'https://calendar.app.google/D2n2vk7Z5fZMMSHQA'
AUTHOR = {
    'name': 'Salty Qazi',
    'role': 'Founder, GRVTY',
    'photo': '/assets/team/salty-qazi.webp',
    'bio': 'Salty Qazi is the founder of GRVTY, a creator-marketing agency for AI companies. '
           'GRVTY works with a network of 100+ AI creators to put AI products in front of technical buyers.',
}

esc = html.escape


# ---------------------------------------------------------------- shell

def head(title, desc, path, extra=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="theme-color" content="#f6f6f4">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<script>document.documentElement.classList.add('js')</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v={V}">
{extra}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
'''


def header(active=None):
    def link(href, label, key):
        on = ' class="on" aria-current="page"' if key == active else ''
        return f'<a href="{href}"{on}>{label}</a>'
    links = [('/#services', 'Services', 'services'), ('/#why', 'Why GRVTY', 'why'),
             ('/#creators', 'Creators', 'creators'), ('/blog/', 'Blog', 'blog'),
             ('/tools/', 'Free Tools', 'tools')]
    desk = '\n      '.join(link(*l) for l in links)
    mob = '\n    '.join(f'<a href="{h}">{t}</a>' for h, t, _ in links)
    return f'''<header class="nav" id="nav">
  <div class="rail nav-inner">
    <a href="/" class="logo" aria-label="GRVTY home">GRVTY<span>.</span></a>
    <nav class="nav-links" aria-label="Primary">
      {desk}
    </nav>
    <a href="{BOOK}" target="_blank" rel="noopener" class="btn btn-primary btn-sm magnetic">Book a Call <span class="arr">→</span></a>
    <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"><i></i><i></i></button>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    {mob}
    <a href="{BOOK}" target="_blank" rel="noopener" class="btn btn-primary">Book a Call <span class="arr">→</span></a>
  </div>
</header>
'''


def footer():
    src = (ROOT / 'index.html').read_text()
    foot = re.search(r'<footer class="sec">.*?</footer>', src, re.S).group(0)
    foot = foot.replace('href="#top"', 'href="/"')
    foot = re.sub(r'href="#(\w+)"', r'href="/#\1"', foot)
    foot = foot.replace('href="privacy.html"', 'href="/privacy.html"').replace('href="terms.html"', 'href="/terms.html"')
    return foot


def tail(scripts=()):
    extra = ''.join(f'\n<script src="{s}?v={V}"></script>' for s in scripts)
    return f'''
{footer()}

<script src="/main.js?v={V}"></script>{extra}
</body>
</html>
'''


def mini_cta(title, text):
    return f'''
  <section class="sec mini-cta">
    <div class="rail">
      <div class="reveal">
        <span class="eyebrow">Book a Call</span>
        <h2 style="margin-top:16px">{title}</h2>
        <p>{text}</p>
      </div>
      <div class="cta-row reveal" style="--d:120ms">
        <a href="mailto:hello@grvty.ltd" class="btn btn-secondary">Get in Touch</a>
        <a href="{BOOK}" target="_blank" rel="noopener" class="btn btn-primary magnetic">Book a Call <span class="arr">→</span></a>
      </div>
    </div>
  </section>
'''


def write(rel, content):
    out = ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content)
    print('wrote', rel)


# ---------------------------------------------------------------- markdown

def inline(t):
    t = esc(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
    return t


def md(text):
    out, para, lst = [], [], None

    def flush():
        nonlocal para, lst
        if para:
            out.append(f'<p>{inline(" ".join(para))}</p>')
            para = []
        if lst:
            tag, items = lst
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(i)}</li>' for i in items) + f'</{tag}>')
            lst = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            flush(); continue
        if line.startswith('## '):
            flush(); out.append(f'<h2>{inline(line[3:])}</h2>'); continue
        if line.startswith('> '):
            flush(); out.append(f'<blockquote><p>{inline(line[2:])}</p></blockquote>'); continue
        m = re.match(r'^(-|\d+\.)\s+(.*)', line)
        if m:
            if para:
                out.append(f'<p>{inline(" ".join(para))}</p>'); para = []
            tag = 'ul' if m.group(1) == '-' else 'ol'
            if not lst or lst[0] != tag:
                flush(); lst = (tag, [])
            lst[1].append(m.group(2)); continue
        if lst:
            flush()
        para.append(line)
    flush()
    return '\n'.join(out)


def load_posts():
    posts = []
    for f in sorted((ROOT / 'content/blog').glob('*.md')):
        raw = f.read_text()
        fm, body = re.match(r'^---\n(.*?)\n---\n(.*)$', raw, re.S).groups()
        meta = dict(l.split(': ', 1) for l in fm.splitlines() if ': ' in l)
        words = len(re.findall(r'\w+', body))
        d = dt.date.fromisoformat(meta['date'])
        posts.append({
            **meta, 'slug': f.stem, 'body': body, 'words': words,
            'mins': max(1, math.ceil(words / 230)), 'd': d,
            'nice': f'{d:%B} {d.day}, {d.year}',
            'cover_src': f"/assets/paintings/{meta['cover']}.webp",
            'url': f'/blog/{f.stem}/',
        })
    return sorted(posts, key=lambda p: p['d'], reverse=True)


# ---------------------------------------------------------------- blog

def byline(p, sm=False):
    cls = 'byline sm' if sm else 'byline'
    return (f'<div class="{cls}"><img src="{AUTHOR["photo"]}" alt="" width="80" height="80" loading="lazy">'
            f'<div><b>{AUTHOR["name"]}</b><span>{p["nice"]} · {p["mins"]} min read</span></div></div>')


def meta_row(p):
    return f'<div class="meta"><span class="cat">{esc(p["category"])}</span><i></i><span>{p["nice"]}</span><i></i><span>{p["mins"]} min read</span></div>'


def card(p, i=0):
    return f'''<a class="post-card reveal" href="{p['url']}" style="--d:{i*110}ms">
          <span class="cover"><img src="{p['cover_src']}" alt="" loading="lazy" width="1344" height="896"></span>
          {meta_row(p)}
          <h3>{esc(p['title'])}</h3>
          <p>{esc(p['description'])}</p>
          {byline(p, sm=True)}
        </a>'''


def blog_index(posts):
    first, rest = posts[0], posts[1:]
    grid = '\n        '.join(card(p, i % 2) for i, p in enumerate(rest))
    page = head('Blog — GRVTY', 'Notes on creator marketing for AI companies, written by Salty Qazi, founder of GRVTY.', '/blog/')
    page += header('blog')
    page += f'''
<main id="main">
  <section class="page-hero">
    <div class="rail">
      <span class="eyebrow reveal">Blog</span>
      <h1 class="reveal" style="--d:80ms">Notes on creator marketing for AI companies.</h1>
      <p class="lede reveal" style="--d:160ms">How we pick creators, write briefs, choose channels and measure what a campaign earns. Written from inside the work.</p>
      <div class="byline reveal" style="--d:240ms"><img src="{AUTHOR['photo']}" alt="" width="80" height="80"><div><b>{AUTHOR['name']}</b><span>{AUTHOR['role']}</span></div></div>
    </div>
  </section>

  <section class="sec">
    <div class="rail">
      <a class="feature" href="{first['url']}">
        <span class="cover reveal"><img src="{first['cover_src']}" alt="" width="1344" height="896"></span>
        <div class="reveal" style="--d:120ms">
          {meta_row(first)}
          <h2>{esc(first['title'])}</h2>
          <p>{esc(first['description'])}</p>
          {byline(first)}
          <span class="read-more">Read the post <span class="arr">→</span></span>
        </div>
      </a>
      <div class="post-grid">
        {grid}
      </div>
    </div>
  </section>
{mini_cta('Ready to create<br>gravity for your brand?', 'We match AI companies with 100+ vetted AI creators and run the whole campaign.')}
</main>
'''
    page += tail()
    write('blog/index.html', page)


def blog_post(p, posts):
    others = [o for o in posts if o['slug'] != p['slug']][:3]
    more = '\n        '.join(card(o, i) for i, o in enumerate(others))
    ld = {
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        'headline': p['title'], 'description': p['description'],
        'datePublished': p['date'], 'image': SITE + p['cover_src'],
        'author': {'@type': 'Person', 'name': AUTHOR['name'], 'jobTitle': 'Founder', 'worksFor': {'@type': 'Organization', 'name': 'GRVTY'}},
        'publisher': {'@type': 'Organization', 'name': 'GRVTY LTD'},
        'mainEntityOfPage': SITE + p['url'],
    }
    extra = f'<meta property="og:image" content="{SITE}{p["cover_src"]}">\n<meta property="og:type" content="article">\n<script type="application/ld+json">{json.dumps(ld)}</script>\n'
    page = head(f"{p['title']} — GRVTY", p['description'], p['url'], extra)
    page += '<div class="progress" aria-hidden="true"><i></i></div>\n'
    page += header('blog')
    page += f'''
<main id="main">
  <section class="page-hero article-head">
    <div class="rail">
      <a href="/blog/" class="back reveal"><span class="arr">←</span> All posts</a>
      <div class="reveal" style="--d:60ms">{meta_row(p)}</div>
      <h1 class="reveal" style="--d:120ms">{esc(p['title'])}</h1>
      <p class="lede reveal" style="--d:200ms">{esc(p['description'])}</p>
      <div class="byline reveal" style="--d:280ms"><img src="{AUTHOR['photo']}" alt="" width="80" height="80"><div><b>{AUTHOR['name']}</b><span>{AUTHOR['role']}</span></div></div>
    </div>
  </section>

  <section class="article-cover">
    <div class="rail"><div class="cover reveal" style="--d:200ms"><img src="{p['cover_src']}" alt="" width="1344" height="896"></div></div>
  </section>

  <section class="article-body">
    <div class="rail">
      <article class="article">
{md(p['body'])}
      </article>
      <aside class="author-card reveal">
        <img src="{AUTHOR['photo']}" alt="Salty Qazi" width="152" height="152" loading="lazy">
        <div>
          <b>{AUTHOR['name']}</b><small>{AUTHOR['role']}</small>
          <p>{AUTHOR['bio']}</p>
          <div class="links"><a href="https://x.com/grvtyltd" target="_blank" rel="noopener">GRVTY on X</a><a href="https://www.linkedin.com/company/grvtyltd/" target="_blank" rel="noopener">GRVTY on LinkedIn</a></div>
        </div>
      </aside>
    </div>
  </section>

  <section class="sec">
    <div class="rail">
      <div class="more-head">
        <div><span class="eyebrow">Keep reading</span><h2>More from the blog</h2></div>
        <a href="/blog/">All posts →</a>
      </div>
      <div class="post-grid three">
        {more}
      </div>
    </div>
  </section>
{mini_cta('Ready to create<br>gravity for your brand?', 'We match AI companies with 100+ vetted AI creators and run the whole campaign.')}
</main>
'''
    page += tail()
    write(f"blog/{p['slug']}/index.html", page)


# ---------------------------------------------------------------- tools

IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>'
TT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.2 8.2 0 0 0 4.8 1.5V6.8l-1-.1z"/></svg>'

TOOLS = {
    'email-finder': {
        'title': 'Influencer Email Finder',
        'desc': 'Find the contact email an Instagram or TikTok creator lists on their profile. Free, no sign-up.',
        'lede': 'Paste an Instagram or TikTok handle. We read the public profile and pull any contact email the creator lists in their bio or links.',
        'cta': 'Find email', 'painting': 4, 'tool': 'email',
        'notes': ['Instagram and TikTok', 'Public profile data only', 'No sign-up'],
        'how': [('Paste a handle', 'An @handle or a full profile link from Instagram or TikTok.'),
                ('We read the profile', 'The public bio and link-in-bio, including emails written as "name [at] domain".'),
                ('Copy and reach out', 'Copy the address or open a draft. If nothing is listed, we show you where to look next.')],
        'mini': ('Need the right creators,<br>not just their emails?', 'We match AI companies with 100+ vetted AI creators and run the outreach, briefs and campaign for you.'),
    },
    'engagement-audit': {
        'title': 'Engagement Audit',
        'desc': 'Audit any Instagram or TikTok creator: engagement rate, post-by-post performance, outliers and what to test next. Free.',
        'lede': 'Check whether a creator’s audience actually shows up. Get engagement rate, post-by-post performance, outliers and a plain-English read on what it means.',
        'cta': 'Run audit', 'painting': 1, 'tool': 'audit',
        'notes': ['Instagram and TikTok', 'Recent posts analysed', 'No sign-up'],
        'how': [('Paste a handle', 'An @handle or a full profile link from Instagram or TikTok.'),
                ('We score recent posts', 'Likes, comments, shares and views against follower count, post by post.'),
                ('Read the verdict', 'A quality label, outliers, content patterns and experiments worth running.')],
        'mini': ('Want creators whose<br>audiences show up?', 'Every creator in our network is scored on engagement quality, not follower count. Let us build your shortlist.'),
    },
}


def tool_page(slug, t):
    notes = ''.join(f'<span>{n}</span>' for n in t['notes'])
    how = ''.join(f'<div class="reveal" style="--d:{i*110}ms"><span class="n">0{i+1}</span><b>{a}</b><p>{b}</p></div>' for i, (a, b) in enumerate(t['how']))
    page = head(f"{t['title']} — Free tool by GRVTY", t['desc'], f'/tools/{slug}/')
    page += header('tools')
    page += f'''
<main id="main">
  <section class="page-hero center">
    <div class="rail">
      <a href="/tools/" class="back reveal" style="margin-bottom:26px"><span class="arr">←</span> All free tools</a><br>
      <span class="eyebrow reveal">Free tool</span>
      <h1 class="reveal" style="--d:80ms">{t['title']}</h1>
      <p class="lede reveal" style="--d:160ms">{t['lede']}</p>
    </div>
  </section>

  <section>
    <div class="rail" style="padding-bottom:64px">
      <div class="tool-stage reveal" style="--d:200ms">
        <div class="tool-paint"><img src="/assets/paintings/{t['painting']}.webp" alt="" width="1344" height="896"></div>
        <form class="tool-form" id="tool" data-tool="{t['tool']}" novalidate>
          <div class="seg" role="group" aria-label="Platform" data-v="instagram">
            <span class="knob" aria-hidden="true"></span>
            <button type="button" data-platform="instagram" aria-pressed="true">{IG}Instagram</button>
            <button type="button" data-platform="tiktok" aria-pressed="false">{TT}TikTok</button>
          </div>
          <div class="field">
            <label class="input"><span>@</span><input name="handle" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="handle or profile link" aria-label="Creator handle or profile link" required></label>
            <button class="btn btn-primary" type="submit">{t['cta']} <span class="arr">→</span></button>
          </div>
          <div class="form-err" role="alert"></div>
          <div class="form-note">{notes}</div>
        </form>
      </div>
    </div>
  </section>

  <section class="sec results" id="results" hidden aria-live="polite">
    <div class="rail"><div id="out"></div></div>
  </section>

  <section class="sec">
    <div class="rail">
      <div class="more-head"><div><span class="eyebrow">How it works</span><h2>Three steps, about ten seconds.</h2></div></div>
      <div class="how">{how}</div>
    </div>
  </section>
{mini_cta(*t['mini'])}
</main>
'''
    page += tail(['/tools.js'])
    write(f'tools/{slug}/index.html', page)


def tools_index():
    email_preview = f'''<div class="pc">
              <div class="pc-head"><span class="dots"><i></i><i></i><i></i></span>email-finder<span class="live"><b></b>Found</span></div>
              <div class="pc-body">
                <div class="input" style="pointer-events:none"><span>@</span><input tabindex="-1" value="sample.creator" readonly aria-hidden="true" style="padding:10px 12px 10px 4px;font-size:14px"></div>
                <div class="email-row" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line3)"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z M4 7l8 6 8-6"/></svg></span><div><b style="font-size:14.5px">hello@samplecreator.com</b><small>Found in bio</small></div></div>
              </div>
            </div>'''
    audit_preview = '''<div class="pc">
              <div class="pc-head"><span class="dots"><i></i><i></i><i></i></span>engagement-audit<span class="live"><b></b>Scored</span></div>
              <div class="pc-body">
                <div style="display:flex;align-items:flex-end;justify-content:space-between">
                  <div><b style="display:block;font-size:34px;font-weight:500;letter-spacing:-.05em;line-height:1;color:var(--ink-num)">4.8%</b><small style="font-size:12px;color:var(--meta)">Avg. engagement rate</small></div>
                  <span class="ql strong"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>Strong</span>
                </div>
                <svg viewBox="0 0 300 70" style="display:block;width:100%;height:70px;margin-top:14px" aria-hidden="true">
                  <g fill="#9db7f7"><rect x="0" y="34" width="20" height="36" rx="3"/><rect x="28" y="24" width="20" height="46" rx="3"/><rect x="56" y="40" width="20" height="30" rx="3"/><rect x="84" y="18" width="20" height="52" rx="3"/><rect x="112" y="30" width="20" height="40" rx="3"/><rect x="140" y="4" width="20" height="66" rx="3" fill="#2f6bff"/><rect x="168" y="28" width="20" height="42" rx="3"/><rect x="196" y="36" width="20" height="34" rx="3"/><rect x="224" y="22" width="20" height="48" rx="3"/><rect x="252" y="32" width="20" height="38" rx="3"/><rect x="280" y="26" width="20" height="44" rx="3"/></g>
                  <line x1="0" x2="300" y1="40" y2="40" stroke="#141414" stroke-dasharray="3 4" stroke-width="1"/>
                </svg>
              </div>
            </div>'''
    cards = ''
    for i, (slug, preview) in enumerate([('email-finder', email_preview), ('engagement-audit', audit_preview)]):
        t = TOOLS[slug]
        cards += f'''
        <a class="tool-card reveal" href="/tools/{slug}/" style="--d:{i*120}ms">
          <span class="free">Free</span>
          <h2>{t['title']}</h2>
          <p>{t['lede']}</p>
          <span class="read-more">Open the tool <span class="arr">→</span></span>
          <div class="panel" style="--img:url(/assets/paintings/{t['painting']}.webp)">
            <div class="panel-bg"></div><div class="panel-veil"></div>
            {preview}
          </div>
        </a>'''
    page = head('Free tools — GRVTY', 'Free creator-marketing tools from GRVTY: find an influencer’s email and audit their engagement on Instagram and TikTok.', '/tools/')
    page += header('tools')
    page += f'''
<main id="main">
  <section class="page-hero">
    <div class="rail">
      <span class="eyebrow reveal">Free tools</span>
      <h1 class="reveal" style="--d:80ms">Free tools for creator marketing.</h1>
      <p class="lede reveal" style="--d:160ms">Built on the same profile data we use to vet creators for AI campaigns. Paste a handle, get an answer. No sign-up.</p>
    </div>
  </section>
  <section class="sec">
    <div class="rail">
      <div class="tool-cards">{cards}
      </div>
    </div>
  </section>
{mini_cta('Rather we handle<br>the whole campaign?', 'We match AI companies with 100+ vetted AI creators, write the brief and measure what it earns.')}
</main>
'''
    page += tail()
    write('tools/index.html', page)


# ---------------------------------------------------------------- thank you

def thank_you():
    playbook = (ROOT / 'content/playbook.html').read_text()
    extra = f'<meta name="robots" content="noindex">\n<link rel="stylesheet" href="/playbook.css?v={V}">\n'
    page = head('Your Creator Launch Playbook — GRVTY', 'The Creator Launch Playbook for AI companies, from GRVTY.', '/thank-you/', extra)
    page += header()
    page += f'''
<main id="main">
  <section class="page-hero ty">
    <div class="rail">
      <div class="ty-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <span class="eyebrow reveal">Your playbook is ready</span>
      <h1 class="reveal" style="--d:80ms;margin-top:20px">Thank you<span data-ty-name></span>.</h1>
      <p class="lede reveal" style="--d:160ms">The Creator Launch Playbook is right below: five chapters, each with a working tool. Bookmark this page to come back to it.</p>
      <div class="ty-steps reveal" style="--d:240ms"><a href="#ch1"><b>1</b>Read the five chapters</a><a href="#tool-score"><b>2</b>Try the tools</a><span><b>3</b>Pick one chapter to run this month</span></div>

      <div class="ty-call reveal" style="--d:320ms">
        <img src="{AUTHOR['photo']}" alt="Salty Qazi" width="144" height="144">
        <div>
          <b>Want help putting it into practice?</b>
          <p>Book a call with Salty, GRVTY’s founder. We’ll look at your launch and tell you which creators and channels we’d start with.</p>
        </div>
        <a href="{BOOK}" target="_blank" rel="noopener" class="btn btn-primary magnetic">Book a Call <span class="arr">→</span></a>
      </div>
      <a href="#playbook" class="ty-down reveal" style="--d:400ms">Start reading <span>↓</span></a>
    </div>
  </section>

  <div class="pb-chapters" id="playbook">
    <div class="rail">
      <b>Playbook</b>
      <a href="#ch1">Signal</a><a href="#ch2">Brief</a><a href="#ch3">Distribution</a><a href="#ch4">Success</a><a href="#ch5">Launch</a>
      <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">Save as PDF</button>
    </div>
    <i id="progress"></i>
  </div>

  <div class="pb">
{playbook}
  </div>
{mini_cta('Ready to create<br>gravity for your brand?', 'Tell us what you’re launching and who needs to hear about it. We’ll come back with the creators we’d pick and the story we’d tell.')}
</main>
'''
    page += tail(['/playbook.js'])
    write('thank-you/index.html', page)


# ---------------------------------------------------------------- legal

def legal(name):
    p = ROOT / name
    s = p.read_text()
    s = re.sub(r'<header class="nav[^"]*" id="nav">.*?</header>\n', header(), s, flags=re.S)
    s = re.sub(r'<footer class="sec">.*?</footer>', footer(), s, flags=re.S)
    s = re.sub(r'(styles\.css|main\.js)\?v=\d+', rf'\1?v={V}', s)
    s = s.replace('href="styles.css', 'href="/styles.css').replace('src="main.js', 'src="/main.js')
    s = s.replace('<a class="skip" href="#main-content">', '<a class="skip" href="#main-content">')
    p.write_text(s)
    print('updated', name)


if __name__ == '__main__':
    posts = load_posts()
    blog_index(posts)
    for post in posts:
        blog_post(post, posts)
    tools_index()
    thank_you()
    for slug, t in TOOLS.items():
        tool_page(slug, t)
    for name in ('privacy.html', 'terms.html'):
        legal(name)
    idx = ROOT / 'index.html'
    idx.write_text(re.sub(r'(styles\.css|main\.js)\?v=\d+', rf'\1?v={V}', idx.read_text()))
