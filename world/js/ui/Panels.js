/* Panels: one glass card per place, filled from ROOM_CONTENT (room/js/content.js). Only the
   card for the current place is shown; all text is real DOM so screen readers and search see it. */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export class Panels {
  constructor(bus, host, content, site) {
    this.bus = bus; this.el = {}; this.site = site; this.content = content;
    const F = Object.fromEntries(content.folders.map((f) => [f.id, f]));
    this.F = F;
    const href = (u) => (/^(https?:|mailto:)/.test(u) ? u : site + u);
    const ext = (u) => (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '');
    const a = F.about, c = F.contact;
    const stats = (st) => (st && st.length ? `<ul class="stats">${st.map((x) => `<li class="neu-in"><b>${esc(x.n)}</b><span>${esc(x.l)}</span></li>`).join('')}</ul>` : '');
    const years = (pubs) => { const m = new Map(); for (const p of pubs) { const y = p.year || 'Other'; if (!m.has(y)) m.set(y, []); m.get(y).push(p); } return [...m.entries()].sort((x, y) => (+y[0] || 0) - (+x[0] || 0)); };
    const tpl = {
      home: `<p class="eyebrow">Hello, welcome</p>
        <h1 class="title">${esc(content.name)}</h1>
        <p class="sub">${esc(content.subtitle)}</p>
        <p class="lede">${esc(content.tagline)}</p>
        <p class="hint" data-hint>Scroll or swipe to walk with me</p>`,
      campus: `<p class="eyebrow">Army Institute of Technology · Dighi Hills, Pune</p>
        <p class="lede">${esc((F.research && F.research.lead) || content.tagline)}</p>
        <p class="row"><a class="btn solid" href="${site}publications/">Publications</a><a class="btn ghost" href="${site}leadership/">Leadership</a></p>`,
      research: `<p class="eyebrow">Research &amp; publications</p>
        <p class="lede">${esc(F.research.lead)}</p>
        <ul class="tags">${F.research.sections[0].items.map((i) => `<li title="${esc(i.t)}"><b>${esc(i.b)}</b></li>`).join('')}</ul>
        <h2 class="h2">All publications <span class="count">${F.publications.pubs.length}</span></h2>
        ${years(F.publications.pubs).map(([y, list]) => `<h3 class="yr">${esc(y)}</h3><ol class="pubs">${list.map((p) => `<li>${p.href ? `<a href="${esc(p.href)}"${ext(p.href)}>${esc(p.title)}</a>` : esc(p.title)}<span>${esc(p.meta)}</span></li>`).join('')}</ol>`).join('')}
        <p class="row"><a class="btn solid" href="${site}publications/">Publications page</a></p>`,
      teaching: `<p class="eyebrow">Teaching</p>
        <p class="lede">${esc(F.teaching.lead)}</p>
        <ul class="plain">${F.teaching.sections[0].items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${(() => { const tb = F.awards.sections.find((x) => /textbook/i.test(x.h)); return tb ? `<h2 class="h2">${esc(tb.h)}</h2>${stats(tb.stats)}<ul class="plain">${tb.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''; })()}
        <p class="row"><a class="btn ghost" href="${href(F.teaching.url || 'about/#teaching')}">More on teaching</a></p>`,
      projects: `<p class="eyebrow">Projects &amp; research areas</p>
        <p class="lede">A page of student and lab projects is coming soon. Until then, these are the areas her group works in.</p>
        <ul class="plain">${F.research.sections[0].items.map((i) => `<li><b>${esc(i.b)}</b>: ${esc(i.t)}</li>`).join('')}</ul>
        ${(() => { const pt = F.awards.sections.find((x) => /patent/i.test(x.h)); return pt ? `<h2 class="h2">${esc(pt.h)}</h2><p class="fact"><b>${esc(pt.p)}</b></p><ul class="plain">${pt.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''; })()}`,
      leadership: `<p class="eyebrow">Leadership &amp; awards</p>
        <p class="lede">${esc(F.leadership.lead)}</p>
        ${F.leadership.sections.map((x) => `<article class="lead-item"><h2 class="h2">${esc(x.h)}</h2>${x.kicker ? `<p class="kicker">${esc(x.kicker)}</p>` : ''}${x.p ? `<p>${esc(x.p)}</p>` : ''}${stats(x.stats)}${x.items && x.items.length ? `<ul class="plain">${x.items.map((i) => `<li>${esc(typeof i === 'string' ? i : (i.b ? i.b + ': ' : '') + (i.t || ''))}</li>`).join('')}</ul>` : ''}</article>`).join('')}
        <h2 class="h2">Awards</h2>
        <ul class="plain">${F.awards.sections[0].timeline.map((i) => `<li><b>${esc(i.y)}</b> · ${esc(i.t)}</li>`).join('')}</ul>
        ${(() => { const ce = F.awards.sections.find((x) => /certif/i.test(x.h)); return ce ? `<h2 class="h2">${esc(ce.h)}</h2><ul class="plain">${ce.items.map((i) => `<li><b>${esc(i.b)}</b>: ${esc(i.t)}</li>`).join('')}</ul>` : ''; })()}
        <p class="row"><a class="btn solid" href="${site}leadership/">Leadership page</a><a class="btn ghost" href="${site}awards/">Awards &amp; books</a></p>`,
      about: `<p class="eyebrow">About</p>
        <div class="about-head"><img class="portrait photo-frame" src="../room/assets/portrait.webp" alt="Portrait of ${esc(content.name)}" width="88" height="88" loading="lazy">
        <p class="lede">I'm ${esc(content.name.replace(/^Prof\.\s*/, ''))}. ${esc(a.lead.replace(/^Assistant Professor/, 'I am an Assistant Professor'))}</p></div>
        <ul class="stats">${a.stats.map((s) => `<li class="neu-in"><b>${esc(s.n)}</b><span>${esc(s.l)}</span></li>`).join('')}</ul>
        ${a.facts.map((f) => `<p class="fact"><b>${esc(f.b)}:</b> ${esc(f.t)}</p>`).join('')}
        <p class="row"><a class="btn solid" href="${href(a.url)}">Full bio</a><a class="btn ghost" href="${site}cv/">CV</a></p>`,
      contact: `<p class="eyebrow">Contact</p>
        <p class="lede">Tap a tile, or use these links.</p>
        <ul class="links">${c.links.map((l) => `<li><a class="btn link" href="${esc(l.href)}"${ext(l.href)}><b>${esc(l.label)}</b><span>${esc(l.value)}</span></a></li>`).join('')}</ul>
        <p class="addr">${esc(c.lead)}</p>`
    };
    for (const id of Object.keys(tpl)) {
      const s = document.createElement('section');
      s.className = 'panel glass'; s.id = 'panel-' + id; s.setAttribute('aria-labelledby', 'panel-' + id + '-h');
      s.innerHTML = `<button class="panel-toggle" type="button" aria-expanded="true" aria-controls="panel-${id}-body"><span class="sr-only">Show or hide details</span></button><div class="panel-body" id="panel-${id}-body">${tpl[id]}</div>`;
      s.hidden = true;
      s.querySelector('.panel-toggle').addEventListener('click', () => this.setCollapsed(!this.collapsed));
      const h = s.querySelector('h1, .eyebrow'); h.id = 'panel-' + id + '-h';
      host.appendChild(s); this.el[id] = s;
    }
  }
  /* mobile: collapse every card to its heading row so the scene is visible; remembered across places */
  setCollapsed(v) {
    this.collapsed = v;
    for (const s of Object.values(this.el)) { s.classList.toggle('collapsed', v); s.querySelector('.panel-toggle').setAttribute('aria-expanded', String(!v)); }
  }
  show(id) {
    for (const [k, s] of Object.entries(this.el)) {
      if (k === id) { s.hidden = false; requestAnimationFrame(() => s.classList.add('in')); }
      else { s.classList.remove('in'); s.hidden = true; }
    }
  }
}
