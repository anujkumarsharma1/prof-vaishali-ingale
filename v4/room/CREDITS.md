# Credits and licences

Most of the office (walls, window, desk, chair, laptop, mug, notebook, bookshelf and books, the corner plant, rug, wall art) is built in code from simple shapes in `js/scene.js`. The garden outside the window, the two wall pictures and the laptop wallpaper are painted in code on a `<canvas>` at load time, and so is the chalkboard's neural-net drawing.

A few imported props are added on top by `js/props.js` (see "Imported 3D props" below). All of them are CC0 (public domain). If they fail to load, the room keeps its code-built lamp and canvas-painted floor.

| What | Version | Source | Licence |
|---|---|---|---|
| three.js (`vendor/three.module.min.js`) | r170 (npm `three@0.170.0`) | https://github.com/mrdoob/three.js | MIT, © 2010–2024 three.js authors. Licence text: `vendor/LICENSE-three.txt` |
| `vendor/RoundedBoxGeometry.js` | three.js r170 `examples/jsm/geometries/` | https://github.com/mrdoob/three.js/blob/r170/examples/jsm/geometries/RoundedBoxGeometry.js | MIT (three.js). Only the import path was changed to point at the local file |
| `vendor/RoomEnvironment.js` | three.js r170 `examples/jsm/environments/` | https://github.com/mrdoob/three.js/blob/r170/examples/jsm/environments/RoomEnvironment.js | MIT (three.js); its header credits Google's model-viewer `EnvironmentScene`. Only the import path was changed |
| GSAP (`vendor/gsap.min.js`) | 3.12.5 (npm `gsap@3.12.5`) | https://gsap.com | GreenSock "Standard" no-charge licence, https://gsap.com/standard-license |
| Fraunces (`fonts/fraunces-*.woff2`) | variable, latin and latin-ext subsets | https://fonts.google.com/specimen/Fraunces | SIL Open Font License 1.1 (Undercase Type) |
| Inter (`fonts/inter-*.woff2`) | variable, latin and latin-ext subsets | https://fonts.google.com/specimen/Inter | SIL Open Font License 1.1 (Rasmus Andersson) |
| Portrait (`assets/portrait.webp`) | 400 × 381 px | An unchanged copy of the main site's `assets/img/prof_pic-400.webp` (the photo of Prof. Ingale supplied for the site) | Same terms as the main site's portrait. It is a real photo, not a generated one |

Ideas only: the "walk into a room and sit at a desk" idea comes from room-style portfolios in general (for example Bruno Simon's). No code, models, layout or art were taken from any of them.

## Imported 3D props (CC0)

Optimised by `tools/optimize_models.sh` (gltf-transform 4: weld, meshopt compression, quantisation, WebP textures at 512 px desktop / 256 px phone; metal-roughness maps dropped because every material is set matte in code). Materials are tinted toward the room palette in `js/props.js`; the lamp texture was also desaturated. Sizes are the shipped file sizes.

| File | What | Source | Author | Licence | Size |
|---|---|---|---|---|---|
| `assets/models/chalkboard.glb`, `chalkboard.phone.glb` | Standing Chalkboard 01 (2,372 tris). The board face is redrawn in code (neural-net sketch, "Teaching") | https://polyhaven.com/a/standing_chalkboard_01 | ParzivalCG (Poly Haven) | CC0 1.0, https://polyhaven.com/license | 53 KB / 37 KB |
| `assets/models/plant.glb`, `plant.phone.glb` | Potted Plant 04, a small succulent on the windowsill (8,929 tris) | https://polyhaven.com/a/potted_plant_04 | James Ray Cock (Poly Haven) | CC0 1.0, https://polyhaven.com/license | 180 KB / 102 KB |
| `assets/models/clock.glb` | Wall Clock above the door, glass removed; hands set to IST in code (3,130 tris). Desktop only | https://polyhaven.com/a/wall_clock | PierreB3D (Poly Haven) | CC0 1.0, https://polyhaven.com/license | 71 KB |
| `assets/models/lamp.glb` | Desk Lamp Arm 01, simplified from 25,710 to 7,487 tris; replaces the code-built lamp. Desktop only | https://polyhaven.com/a/desk_lamp_arm_01 | Kuutti Siitonen (modelling and texturing), Yann Kervran (rigging) (Poly Haven) | CC0 1.0, https://polyhaven.com/license | 161 KB |
| `assets/models/books.glb` | `books.glb` from Furniture Kit 2.0, re-coloured to the shelf palette (62 tris). Desktop only | https://kenney.nl/assets/furniture-kit | Kenney (www.kenney.nl) | CC0 1.0 (the kit's `License.txt`) | 6 KB |
| `assets/textures/woodfloor051_color_512.webp`, `_color_256.webp`, `woodfloor051_normal_512.webp` | Wood Floor 051 colour (tinted toward the room's floor colour) and OpenGL normal map; replaces the canvas floor | https://ambientcg.com/a/WoodFloor051 | ambientCG (Lennart Demes) | CC0 1.0, https://docs.ambientcg.com/license/ | 13 KB, 3 KB, 1 KB |
| `vendor/GLTFLoader.js`, `vendor/BufferGeometryUtils.js` | three.js r170 `examples/jsm/loaders/GLTFLoader.js` and `examples/jsm/utils/BufferGeometryUtils.js`, minified with esbuild; only the import paths were changed | https://github.com/mrdoob/three.js/tree/r170/examples/jsm | three.js authors | MIT (see `vendor/LICENSE-three.txt`) | 46 KB, 13 KB |
| `vendor/meshopt_decoder.module.js` | meshoptimizer decoder 0.18, unchanged copy from three.js r170 `examples/jsm/libs/` | https://github.com/zeux/meshoptimizer | Arseny Kapoulkine | MIT (header in the file) | 25 KB |

Totals added: desktop 580 KB (models, textures, loader, decoder and `js/props.js`), phone 237 KB (chalkboard, plant, floor colour, loader, decoder, `js/props.js`).
