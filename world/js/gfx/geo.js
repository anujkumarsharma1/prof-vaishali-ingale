/* Real-world bevels: every box gets a small rounded edge (5-9 cm, never more than 15% of its thinnest side)
   with smooth normals, so edges catch the light like finished concrete or plaster rather than CG cubes. */
import { RoundedBoxGeometry as RB } from '../../../room/vendor/RoundedBoxGeometry.js';
export class RoundedBoxGeometry extends RB {
  constructor(w = 1, h = 1, d = 1, segments = 2, radius = 0.1) {
    const r = Math.min(Math.max(radius, 0.05), 0.09, Math.min(w, h, d) * 0.15);
    super(w, h, d, 3, r);
  }
}
