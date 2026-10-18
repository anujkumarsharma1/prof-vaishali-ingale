/* Panels: one clay card per place, filled from ROOM_CONTENT (room/js/content.js). Only the
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
    const tpl = {
      home: `<p class="eyebrow">Hello, welcome</p>
        <h1 class="title">${esc(content.name)}</h1>
        <p class="sub">${esc(content.subtitle)}</p>
        <p class="lede">${esc(content.tagline)}</p>
        <p class="hint" data-hint>Scroll or swipe to walk with me</p>`,
      campus: `<p class="eyebrow">Army Institute of Technology · Dighi Hills, Pune</p>
        <p class="lede">${esc((F.research && F.research.lead) || content.tagline)}</p>
        <p class="row"><a class="btn puffy" href="${site}publications/">Publications</a><a class="btn puffy ghost" href="${site}leadership/">Leadership</a></p>`,
      about: `<p class="eyebrow">About</p>
        <div class="about-head"><img class="portrait clay-frame" src="../room/assets/portrait.webp" alt="Portrait of ${esc(content.name)}" width="88" height="88" loading="lazy">
        <p class="lede">I'm ${esc(content.name.replace(/^Prof\.\s*/, ''))}. ${esc(a.lead.replace(/^Assistant Professor/, 'I am an Assistant Professor'))}</p></div>
        <ul class="stats">${a.stats.map((s) => `<li class="neu-in"><b>${esc(s.n)}</b><span>${esc(s.l)}</span></li>`).join('')}</ul>
        ${a.facts.map((f) => `<p class="fact"><b>${esc(f.b)}:</b> ${esc(f.t)}</p>`).join('')}
        <p class="row"><a class="btn puffy" href="${href(a.url)}">Full bio</a><a class="btn puffy ghost" href="${site}cv/">CV</a></p>`,
      contact: `<p class="eyebrow">Contact</p>
        <p class="lede">Tap a tile, or use these links.</p>
        <ul class="links">${c.links.map((l) => `<li><a class="btn puffy link" href="${esc(l.href)}"${ext(l.href)}><b>${esc(l.label)}</b><span>${esc(l.value)}</span></a></li>`).join('')}</ul>
        <p class="addr">${esc(c.lead)}</p>`
    };
    for (const id of Object.keys(tpl)) {
      const s = document.createElement('section');
      s.className = 'panel clay'; s.id = 'panel-' + id; s.setAttribute('aria-labelledby', 'panel-' + id + '-h');
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
