# Credits: third-party assets in the 3D world

All third-party textures and the sky are **CC0 (public domain)** from [Poly Haven](https://polyhaven.com)
(license: https://polyhaven.com/license). They were downscaled (512 px colour/normal, 256 px roughness) and
re-encoded as JPG; colour maps have the set's AO baked in at 60 %.

| File(s) in `world/assets/` | Poly Haven asset | Used for |
|---|---|---|
| `tex/paving_*` | [Rectangular Paving](https://polyhaven.com/a/rectangular_paving) | walkway, plazas, terrace floor |
| `tex/asphalt_*` | [Asphalt 02](https://polyhaven.com/a/asphalt_02) | road and campus drive |
| `tex/plaster_*` | [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | painted walls, trims, kerbs (tinted) |
| `tex/concrete_*` | [Concrete](https://polyhaven.com/a/concrete) | kerbs, plinths, roofs, monument stone |
| `tex/grass_*` | [Sparse Grass](https://polyhaven.com/a/sparse_grass) | lawns, ground, hill slopes |
| `tex/bark_*` | [Bark Brown 02](https://polyhaven.com/a/bark_brown_02) | tree and palm trunks |
| `tex/metal_*` | [Metal Plate](https://polyhaven.com/a/metal_plate) | railings, poles, gates, plaques |
| `tex/rock_*` | [Cliff Side](https://polyhaven.com/a/cliff_side) | waterfall cliffs, fort wall |
| `tex/wood_*` | [Wood Planks](https://polyhaven.com/a/wood_planks) | bridge deck |
| `sky.hdr` | [Qwantani Sunset (Pure Sky)](https://polyhaven.com/a/qwantani_sunset_puresky), 1k HDR (Greg Zaal, Jarod Guest) | sky background and image-based lighting |

Everything else is original: procedural geometry, the leaf/frond/hedge textures, the curtain-wall façade,
the water normal map and the character model (built with our own Blender scripts in `room/tools/blender/`).

Libraries: three.js r170 (MIT, `room/vendor/LICENSE-three.txt`), including `RGBELoader.js` from the three.js examples (MIT).
