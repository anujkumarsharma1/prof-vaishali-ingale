# Credits and licences

Every 3D object in the office (walls, window, desk, chair, laptop, lamp, mug, notebook, bookshelf and books, plants, rug, wall art) is built in code from simple shapes in `js/scene.js`. **No external 3D models, textures or photos are used apart from the portrait below.** The floor boards, the garden outside the window, the two wall pictures and the laptop wallpaper are painted in code on a `<canvas>` at load time.

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
