/* Stage: renderer, camera, resize, pixel ratio by quality tier; HDRI sky + image-based lighting. */
import * as THREE from 'three';
import { skyTexture, REAL } from './materials.js';

export const SKY_ROT = 2.0;   // rotates the CC0 sunset HDRI so its sun sits behind the main building (-z)
export class Stage {
  constructor(bus, container, quality) {
    this.bus = bus; this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: quality.tier >= 2, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = quality.tier >= 2; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.FogExp2('#d9c3ad', 0.0085);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); bus.emit('gl:lost'); });
    this._resize = this._resize.bind(this); addEventListener('resize', this._resize); this._resize();
    bus.on('quality:change', () => this._resize());
    bus.hook('render', () => { this.renderer.render(this.scene, this.camera); });
  }
  /* CC0 Poly Haven "Qwantani Sunset (Pure Sky)" 1k HDR (~1 MB): background + PMREM environment.
     Lite mode uses a gradient sky and a cheap hemisphere-only look. */
  async loadSky() {
    const s = this.scene;
    s.backgroundRotation.y = s.environmentRotation.y = SKY_ROT;
    if (REAL.lite) { this._liteEnv(); return; }
    try {
      const { RGBELoader } = await import('../../../room/vendor/RGBELoader.js');
      const hdr = await new RGBELoader().loadAsync(new URL('../../assets/sky.hdr', import.meta.url).href);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(this.renderer), env = pm.fromEquirectangular(hdr).texture; pm.dispose();
      s.environment = env; s.environmentIntensity = 0.8;
      s.background = hdr; s.backgroundIntensity = 0.85; s.backgroundBlurriness = 0.0;
    } catch (e) { console.info('sky: gradient fallback (' + (e && e.message) + ')'); this._liteEnv(); }
  }
  _liteEnv() {
    const pm = new THREE.PMREMGenerator(this.renderer), bg = skyTexture(); bg.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = pm.fromEquirectangular(bg).texture; this.scene.environmentIntensity = 0.6; pm.dispose();
  }
  _resize() {
    const w = innerWidth, h = innerHeight, cap = this.quality.tier >= 2 ? 2 : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 62 : 50;   // portrait phones see a bit more
    if (w < h) this.camera.setViewOffset(w, h, 0, Math.round(h * 0.17), w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
}
