// Optimises the CC0 props for the office. Run via room/tools/optimize_models.sh.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, reorder, quantize, meshopt, join, flatten } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import path from 'node:path';

const [RAW, OUT] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const JOBS = [
  // name, source, variants, options
  { out: 'chalkboard', src: 'standing_chalkboard_01/standing_chalkboard_01_1k.gltf', dropTex: ['standing_chalkboard_01_board'], keepNodes: false },
  { out: 'plant', src: 'potted_plant_04/potted_plant_04_1k.gltf' },
  { out: 'clock', src: 'wall_clock/wall_clock_1k.gltf', dropMat: ['wall_clock_glass'], keepNodes: true, phone: false },
  { out: 'lamp', src: 'desk_lamp_arm_01/desk_lamp_arm_01_1k.gltf', simplify: 0.28, phone: false, modulate: { saturation: 0.5, brightness: 0.82 } },
  { out: 'books', src: 'kenney/Models/GLTF format/books.glb', phone: false, noTex: true }
];

for (const job of JOBS) {
  for (const variant of job.phone === false ? ['desktop'] : ['desktop', 'phone']) {
    const doc = await io.read(path.join(RAW, job.src));
    const root = doc.getRoot();
    for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_transmission') ext.dispose();
    for (const prim of root.listMeshes().flatMap(m => m.listPrimitives())) {
      const m = prim.getMaterial();
      if (m && (job.dropMat || []).includes(m.getName())) prim.dispose();
    }
    for (const m of root.listMaterials()) {
      // matte: constant roughness, no metal, so the ARM map is not needed
      m.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(Math.max(0.6, m.getRoughnessFactor()));
      m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
      if (variant === 'phone') m.setNormalTexture(null);
      if ((job.dropTex || []).includes(m.getName())) m.setBaseColorTexture(null).setNormalTexture(null);
    }
    if (job.modulate) {  // calm a loud source colour before compression
      for (const m of root.listMaterials()) {
        const t = m.getBaseColorTexture();
        if (t && !t.getExtras().modulated) {
          t.setImage(new Uint8Array(await sharp(t.getImage()).modulate(job.modulate).png().toBuffer())).setMimeType('image/png');
          t.setExtras({ modulated: true });
        }
      }
    }
    const steps = [dedup(), prune(), weld()];
    if (job.simplify) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: variant === 'phone' ? job.simplify / 2 : job.simplify, error: 0.002 }));
    if (!job.keepNodes) steps.push(flatten(), join());
    steps.push(reorder({ encoder: MeshoptEncoder }), quantize());
    if (!job.noTex) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: variant === 'phone' ? [256, 256] : [512, 512], quality: 80 }));
    steps.push(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await doc.transform(...steps);
    const file = path.join(OUT, `${job.out}${variant === 'phone' ? '.phone' : ''}.glb`);
    await io.write(file, doc);
    let tris = 0;
    for (const p of doc.getRoot().listMeshes().flatMap(m => m.listPrimitives())) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
    console.log(path.basename(file), Math.round(tris), 'tris');
  }
}
