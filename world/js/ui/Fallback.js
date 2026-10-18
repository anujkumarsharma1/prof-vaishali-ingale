/* Fallback: no WebGL (or ?static). Same panels, stacked as a calm one-page layout. */
export class Fallback {
  static mount(panels, reason) {
    document.body.classList.add('static');
    Object.values(panels.el).forEach((s) => { s.hidden = false; s.classList.add('in'); });
    const note = document.getElementById('static-note');
    if (note) { note.hidden = false; note.textContent = 'Showing the light version (' + reason + ').'; }
  }
}
