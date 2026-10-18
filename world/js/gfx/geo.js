/* Crisp bevels: a RoundedBoxGeometry whose corner radius is capped small (no puffy clay look). */
import { RoundedBoxGeometry as RB } from '../../../room/vendor/RoundedBoxGeometry.js';
export class RoundedBoxGeometry extends RB {
  constructor(w = 1, h = 1, d = 1, segments = 2, radius = 0.1) {
    const r = Math.min(radius, 0.035, Math.min(w, h, d) * 0.12);
    super(w, h, d, Math.min(segments, 2), r);
  }
}
