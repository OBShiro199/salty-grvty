# GRVTY website

Static site: plain HTML, CSS and JS. No framework or bundler.

## Run locally

```bash
python3 scripts/serve.py
```

Opens on http://localhost:4321 with caching disabled, so edits show on reload.

## Edit content

- **Home page:** `index.html` (edit by hand).
- **Blog posts:** Markdown files in `content/blog/`. Each one has front matter (title, description, date, category, cover 1 to 6) and supports `##` headings, `-` and `1.` lists, `>` pull quotes, `**bold**` and `*italic*`.
- **Blog, tools and legal pages:** generated. After changing a post, `index.html`'s footer or anything in `scripts/build.py`, run:

```bash
python3 scripts/build.py
```

Bump `V` at the top of `scripts/build.py` whenever `styles.css`, `main.js` or `tools.js` change, so visitors' browsers fetch the new files.

## Free tools (Social Fetch)

The Email Finder and Engagement Audit call `/api/socialfetch`, a small proxy in `api/socialfetch.js` that adds the API key server-side so it never reaches the browser.

1. Deploy on Vercel (the `api/` folder becomes a serverless function automatically).
2. Add the environment variable `SOCIALFETCH_API_KEY` with your key from socialfetch.dev.

Until the key is set, both tools run in **preview mode**: they show clearly labelled sample data for a fictional creator. Each live lookup costs 1 Social Fetch credit. Successful responses are cached at the edge for an hour. Consider adding rate limiting (for example Vercel Firewall rules) before promoting the tools heavily.

## Assets

- `assets/paintings/`: the six paintings, desaturated to 30% colour. Full-colour originals are in `assets/paintings/original/`.
- `assets/creators/`: creator profile photos.
- `assets/team/salty-qazi.webp`: author photo for the blog.
- `assets/platforms/`: YouTube, X and LinkedIn logos.

## Playbook opt-in (lead magnet)

The "Creator Launch Playbook" form on the home page validates the name and email, fires confetti and goes to `/thank-you/`. **Nothing is sent yet.** To go live, set `LEAD_ENDPOINT` near the top of `main.js` to your email tool's form URL (ConvertKit, Mailchimp, HubSpot, a Zapier webhook, etc.). It receives JSON `{ name, email, source }`. That tool can email people a link back to `/thank-you/`.

The playbook itself lives on the thank-you page, under the Book a Call card. Its content is `content/playbook.html` (rebuild with `scripts/build.py`), its styles are `playbook.css` (every rule scoped to `.pb`) and its five interactive tools are `playbook.js`. The page is set to `noindex`, but anyone with the URL can open it. Visitors can save it with the "Save as PDF" button on desktop.
