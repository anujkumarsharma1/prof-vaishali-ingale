"""
Phase 2: rig, bake and animate the stylised likeness built by ingale_char.py, then export a Draco GLB.
Run:  blender -b --factory-startup --python ingale_rig.py -- OUT.glb [--check DIR]
Steps: build model (no render) -> per-part skin weights -> join -> UV + bake procedural colours to one
JPEG atlas -> armature (spine, arms, legs, hair L/R/back, pallu) -> actions (Idle, Walk, Sit, StandToSit,
SitToStand) -> GLB (Draco, JPEG). Original procedural work; nothing third-party is embedded.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Euler, Quaternion
HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/ingale.glb'
CHECK = argv[argv.index('--check') + 1] if '--check' in argv else None

os.environ['NORENDER'] = '1'
G = {'__name__': 'ingale_char', '__file__': os.path.join(HERE, 'ingale_char.py')}
try: exec(compile(open(G['__file__']).read(), G['__file__'], 'exec'), G)
except SystemExit: pass
HC = G['HC']; scn = bpy.context.scene

def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

# ---------------- bones (Blender coords: Z up, front -Y, her left = +X) ----------------
B = {
 'root': ((0, 0, 0), (0, 0, 0.12), None),
 'hips': ((0, 0, 0.94), (0, 0, 1.08), 'root'),
 'spine': ((0, 0, 1.08), (0, 0, 1.22), 'hips'),
 'chest': ((0, 0, 1.22), (0, 0, 1.38), 'spine'),
 'neck': ((0, 0, 1.38), (0, 0, 1.45), 'chest'),
 'head': ((0, 0, 1.45), (0, 0, 1.66), 'neck'),
 'hair.B': ((0, 0.05, 1.50), (0, 0.09, 1.24), 'head'),
 'pallu.B': ((0.17, 0.09, 1.36), (0.19, 0.125, 0.84), 'chest'),
}
for s, sx in (('L', 1), ('R', -1)):
    B['upperarm.' + s] = ((0.165 * sx, 0.005, 1.36), (0.19 * sx, 0.02, 1.115), 'chest')
    B['forearm.' + s] = ((0.19 * sx, 0.02, 1.115), (0.185 * sx, -0.03, 0.885), 'upperarm.' + s)
    B['hand.' + s] = ((0.185 * sx, -0.03, 0.885), (0.185 * sx, -0.035, 0.80), 'forearm.' + s)
    B['thigh.' + s] = ((0.075 * sx, 0, 0.94), (0.075 * sx, -0.005, 0.5), 'hips')
    B['shin.' + s] = ((0.075 * sx, -0.005, 0.5), (0.075 * sx, 0.0, 0.07), 'thigh.' + s)
    B['hair.' + s] = ((0.06 * sx, -0.01, 1.49), (0.11 * sx, 0.0, 1.25), 'head')

# ---------------- skin weights per part ----------------
def W(o, fn):
    groups = {}
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        for bn, w in fn(p).items():
            if w <= 1e-4: continue
            if bn not in groups: groups[bn] = o.vertex_groups.new(name=bn)
            groups[bn].add([v.index], w, 'REPLACE')
def side(p): return 'L' if p.x > 0 else 'R'
def arm_w(p, s):
    el, wr = B['forearm.' + s][0][2], B['hand.' + s][0][2]
    t_el = ss(el + 0.03, el - 0.03, p.z); t_wr = ss(wr + 0.012, wr - 0.012, p.z)
    sh = ss(1.30, 1.37, p.z)                       # top of the sleeve blends into the chest
    return {'chest': sh * 0.5, 'upperarm.' + s: (1 - t_el) * (1 - sh * 0.5), 'forearm.' + s: t_el * (1 - t_wr), 'hand.' + s: t_wr}
def torso_w(p):
    w = {'hips': ss(1.12, 1.0, p.z), 'chest': ss(1.18, 1.28, p.z)}
    w['spine'] = max(0.0, 1 - w['hips'] - w['chest'])
    a = ss(0.12, 0.165, abs(p.x)) * ss(1.28, 1.36, p.z)       # shoulders follow the arms a little
    if a > 0:
        w = {k: v * (1 - 0.6 * a) for k, v in w.items()}; w['upperarm.' + side(p)] = 0.6 * a
    return w
def leg_w(p):
    # Saree skirt: mostly carried by the pelvis so it doesn't stretch when the legs fold to sit. The front (lap)
    # follows the thighs a little more than the back; weights blend smoothly across the knee and the midline.
    h = ss(0.74, 0.96, p.z); kt = ss(0.25, 0.75, p.z); wl = ss(-0.09, 0.09, p.x)
    follow = (0.8 if p.y < 0 else 0.45) * (1 - h) * (0.75 + 0.25 * ss(-0.12, 0.0, -p.y))
    return {'hips': 1 - follow, 'thigh.L': follow * kt * wl, 'thigh.R': follow * kt * (1 - wl), 'shin.L': follow * (1 - kt) * wl, 'shin.R': follow * (1 - kt) * (1 - wl)}
def hair_w(p):
    s = ss(HC.z - 0.03, HC.z - 0.2, p.z)
    bn = 'hair.B' if p.y > 0.035 else 'hair.' + side(p)
    return {'head': 1 - s, bn: s}
def pallu_w(p):
    s = ss(1.34, 1.18, p.z) * ss(0.02, 0.07, p.y)
    return {'chest': 1 - s, 'pallu.B': s}
HEAD = ('head', 'eye_w', 'iris', 'glint', 'lidskin', 'lid', 'brow', 'stud', 'drop', 'ear', 'nose', 'mouth', 'hair_cap')
meshes = [o for o in scn.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)   # bake modifiers (subsurf, solidify, shrinkwrap)
    o.select_set(False)
    n = o.name
    if n.startswith(HEAD): W(o, lambda p: {'head': 1})
    elif n.startswith('hair_locks'): W(o, hair_w)
    elif n.startswith('neck'): W(o, lambda p: {'head': ss(1.43, 1.47, p.z), 'neck': 1 - ss(1.43, 1.47, p.z)})
    elif n.startswith('torso'): W(o, torso_w)
    elif n.startswith('waist'): W(o, lambda p: {'hips': 1})
    elif n.startswith(('arm', 'sleeve')): W(o, lambda p: arm_w(p, side(p)))
    elif n.startswith(('palm', 'finger', 'thumb', 'bangle')): W(o, lambda p: {'hand.' + side(p): 1})
    elif n.startswith('skirt'): W(o, leg_w)
    elif n.startswith('foot'): W(o, lambda p: {'shin.' + side(p): 1})
    elif n.startswith('pallu'): W(o, pallu_w)
    else: W(o, lambda p: {'chest': 1})        # lanyard, card, clip
# join everything into one skinned mesh
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join()
body = bpy.context.view_layer.objects.active; body.name = 'Ingale'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------------- UV + bake every material's base colour (incl. procedural masks) into one atlas ----------------
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
RES = int(os.environ.get('ATLAS', '1024'))
img = bpy.data.images.new('ingale_atlas', RES, RES)
scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = 1; scn.cycles.bake_type = 'EMIT'
saved = {}
for m in body.data.materials:
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF'); out = nt.nodes.get('Material Output')
    em = nt.nodes.new('ShaderNodeEmission')
    bc = bsdf.inputs['Base Color']
    if bc.is_linked: nt.links.new(bc.links[0].from_socket, em.inputs['Color'])
    else: em.inputs['Color'].default_value = bc.default_value
    saved[m.name] = out.inputs['Surface'].links[0].from_socket
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.nodes.active = tex
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type='EMIT', margin=4)
# rebuild export-friendly materials: baked atlas as base colour, original roughness / metallic kept
for m in body.data.materials:
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']; out = nt.nodes['Material Output']
    metal = bsdf.inputs['Metallic'].default_value if not bsdf.inputs['Metallic'].is_linked else 0.2
    rough = bsdf.inputs['Roughness'].default_value
    for n in list(nt.nodes):
        if n not in (out,): nt.nodes.remove(n)
    b2 = nt.nodes.new('ShaderNodeBsdfPrincipled'); b2.name = 'Principled BSDF'
    b2.inputs['Metallic'].default_value = metal; b2.inputs['Roughness'].default_value = rough
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs['Color'], b2.inputs['Base Color']); nt.links.new(b2.outputs[0], out.inputs['Surface'])

# ---------------- armature ----------------
arm_data = bpy.data.armatures.new('IngaleRig'); rig = bpy.data.objects.new('IngaleRig', arm_data); scn.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
for name, (h, t, par) in B.items():
    eb = arm_data.edit_bones.new(name); eb.head = h; eb.tail = t; eb.roll = 0
    if par: eb.parent = arm_data.edit_bones[par]; eb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
mod = body.modifiers.new('rig', 'ARMATURE'); mod.object = rig; body.parent = rig

# ---------------- animation helpers ----------------
FPS = 30; scn.render.fps = FPS
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
def pose(d):
    """d: bone -> (rx, ry, rz) degrees in the bone's local frame, or ('loc', (x,y,z)) via key 'root_loc'."""
    for pb in rig.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    for k, v in d.items():
        if k.endswith('@loc'): rig.pose.bones[k[:-4]].location = v
        else:
            sgn = 1 if k.startswith(('hair', 'pallu')) else -1     # body bones: +X in the tables means 'toward her front'
            rig.pose.bones[k].rotation_euler = [math.radians(v[0]) * sgn, math.radians(v[1]), math.radians(v[2])]
def key(frame):
    for pb in rig.pose.bones:
        pb.keyframe_insert('rotation_euler', frame=frame); pb.keyframe_insert('location', frame=frame)
def action(name, frames):
    rig.animation_data_create(); act = bpy.data.actions.new(name); rig.animation_data.action = act
    for f, d in frames: pose(d); key(f)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    act.use_fake_user = True
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, int(frames[0][0]), act)
    rig.animation_data.action = None
    return act

# Bone-local axes (roll 0): vertical bones -> local X = world X, so +X rotation tips the bone toward -Y/+Y.
# Raw +X tips a bone toward +Y (her back); pose() flips X for body bones so the tables read 'positive = forward'.
# Hair/pallu keep raw X (positive = swing away behind her). Checked with the --check renders.
def arms(swing, bend=12, spread=0):
    return {'upperarm.L': (swing, 0, spread), 'upperarm.R': (-swing, 0, -spread), 'forearm.L': (bend, 0, 0), 'forearm.R': (bend, 0, 0)}
STAND = {}
def walk_pose(ph):
    s = math.sin(ph); c = math.cos(ph)
    d = {'thigh.L': (15 * s, 0, 0), 'thigh.R': (-15 * s, 0, 0),
         'shin.L': (-max(0, -c) * 20 - 3, 0, 0), 'shin.R': (-max(0, c) * 20 - 3, 0, 0),
         'hips': (0, 0, 5 * s), 'spine': (2, 0, -3 * s), 'chest': (0, 0, -3 * s), 'head': (0, 0, 2 * s),
         'hair.L': (-6 + 4 * c, 0, 0), 'hair.R': (-6 - 4 * c, 0, 0), 'hair.B': (8 + 4 * abs(s), 0, 0), 'pallu.B': (10 + 5 * abs(c), 0, 3 * s),
         'root@loc': (0, 0, 0.012 * abs(c))}
    d.update({'upperarm.L': (-18 * s, 0, 4), 'upperarm.R': (18 * s, 0, -4), 'forearm.L': (12 + 10 * max(0, -s), 0, 0), 'forearm.R': (12 + 10 * max(0, s), 0, 0)})
    return d
def idle_pose(ph):
    b = math.sin(ph)
    d = {'chest': (1.2 * b, 0, 0), 'spine': (0.6 * b, 0, 0), 'neck': (-0.8 * b, 0, 0), 'head': (1.0 * b, 1.5 * math.sin(ph * 0.5), 0),
         'hair.L': (2 * b, 0, 0), 'hair.R': (2 * b, 0, 0), 'hair.B': (2.5 * b, 0, 0), 'pallu.B': (3 * b, 0, 0)}
    d.update(arms(0, 10 + 2 * b, 3)); return d
SIT_DROP = -0.14
def sit_pose(b=0.0):
    d = {'root@loc': (0, 0, SIT_DROP), 'thigh.L': (82, 0, -6), 'thigh.R': (82, 0, 6), 'shin.L': (-78, 0, 0), 'shin.R': (-78, 0, 0),
         'spine': (-3, 0, 0), 'chest': (2 + b, 0, 0), 'head': (-4, 0, 0),
         'upperarm.L': (48, 0, -10), 'upperarm.R': (48, 0, 10), 'forearm.L': (28, 0, 0), 'forearm.R': (28, 0, 0), 'hand.L': (-10, 0, 0), 'hand.R': (-10, 0, 0),
         'hair.L': (-8, 0, 0), 'hair.R': (-8, 0, 0), 'hair.B': (14 + 3 * b, 0, 0), 'pallu.B': (25 + 4 * b, 0, 0)}
    return d
def lerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b):
        va = a.get(k, (0, 0, 0)); vb = b.get(k, (0, 0, 0)); out[k] = tuple(x + (y - x) * t for x, y in zip(va, vb))
    return out

N = 24
action('Idle', [(1 + i * 60 // 8, idle_pose(2 * math.pi * i / 8)) for i in range(9)])                  # 2 s loop
action('Walk', [(1 + i * 30 // 8, walk_pose(2 * math.pi * i / 8)) for i in range(9)])                  # 1 s loop (one stride pair)
action('Sit', [(1 + i * 60 // 4, sit_pose(math.sin(2 * math.pi * i / 4))) for i in range(5)])          # seated, gentle breathing/sway
action('StandToSit', [(1 + i * 18 // 6, lerp_pose(idle_pose(0), sit_pose(), ss(0, 1, i / 6))) for i in range(7)])   # 0.6 s
action('SitToStand', [(1 + i * 18 // 6, lerp_pose(sit_pose(), idle_pose(0), ss(0, 1, i / 6))) for i in range(7)])

# ---------------- optional pose check renders ----------------
if CHECK:
    os.makedirs(CHECK, exist_ok=True)
    scn.render.engine = 'BLENDER_WORKBENCH'; scn.display.shading.color_type = 'TEXTURE'; scn.display.shading.light = 'STUDIO'
    scn.render.resolution_x, scn.render.resolution_y = 600, 800
    cam = bpy.data.objects.new('ccam', bpy.data.cameras.new('ccam')); scn.collection.objects.link(cam); scn.camera = cam
    for nm, pd in (('stand', idle_pose(0)), ('walk', walk_pose(math.pi / 2)), ('sit', sit_pose())):
        rig.animation_data.action = None
        for tr in rig.animation_data.nla_tracks: tr.mute = True
        pose(pd); bpy.context.view_layer.update()
        for view, loc in (('side', (3.2, 0, 0.9)), ('front', (0.0, -3.2, 0.9))):
            cam.location = loc; cam.data.lens = 50
            cam.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
            scn.render.filepath = f'{CHECK}/pose_{nm}_{view}.png'; bpy.ops.render.render(write_still=True)
    for tr in rig.animation_data.nla_tracks: tr.mute = False
    pose({})

# ---------------- export ----------------
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_draco_position_quantization=12, export_draco_normal_quantization=8, export_draco_texcoord_quantization=11,
                          export_image_format='JPEG', export_image_quality=82, export_skins=True, export_all_influences=False,
                          export_optimize_animation_size=True, export_yup=True, export_apply=False, export_lights=False, export_cameras=False)
print('GLB', OUT, os.path.getsize(OUT), 'bytes; tris', sum(len(p.vertices) - 2 for p in body.data.polygons))
