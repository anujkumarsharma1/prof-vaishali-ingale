/* Stage: renderer, camera, resize, pixel ratio by quality tier. */
import * as THREE from 'three';
import { skyTexture } from './materials.js';
import { RoomEnvironment } from '../../../room/vendor/RoomEnvironment.js';

export class Stage {
  constructor(bus, container, quality) {
    this.bus = bus; this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: quality.tier >= 2, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = quality.tier >= 2; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    // soft studio reflections for the polished stylised look
    const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.45; pm.dispose();
    this.scene.fog = new THREE.Fog('#f6d2c6', 40, 120);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); bus.emit('gl:lost'); });
    this._resize = this._resize.bind(this); addEventListener('resize', this._resize); this._resize();
    bus.on('quality:change', () => this._resize());
    bus.hook('render', () => { this.renderer.render(this.scene, this.camera); });
  }
  _resize() {
    const w = innerWidth, h = innerHeight, cap = this.quality.tier >= 2 ? 2 : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 62 : 50;   // portrait phones see a bit more
    // portrait phones: the info card covers the bottom third, so frame the scene higher (she stays visible above it)
    if (w < h) this.camera.setViewOffset(w, h, 0, Math.round(h * 0.17), w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
}
