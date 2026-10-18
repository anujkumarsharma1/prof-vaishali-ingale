"""
Stylised likeness of Prof. Vaishali Ingale -- original procedural model (phase 1: model + materials).
Run headless:  blender -b --factory-startup --python ingale_char.py -- OUT_DIR [--blend path]
No reference images are read or embedded; proportions/palette were chosen by eye.
Front faces -Y, Z up, metres. Height ~1.62 m, head ~0.27 m (about 1:6).
"""
import bpy, bmesh, math, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/char_renders'
BLEND = argv[argv.index('--blend') + 1] if '--blend' in argv else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
col = scn.collection

# ---------------- materials ----------------
def M(name, rgb, rough=0.55, metal=0.0, sss=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.4, 0.15, 0.08); b.inputs['Subsurface Scale'].default_value = 0.01
    if coat: b.inputs['Coat Weight'].default_value = coat
    return m
def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
SKIN = M('skin', srgb('#a8704e'), 0.5, sss=0.25)
LIPS = M('lips', srgb('#a3262e'), 0.35, coat=0.3)
BLACK = M('saree_black', srgb('#1c191d'), 0.6)
BLOUSE = M('blouse_black', srgb('#18151a'), 0.5)
HAIR = M('hair', srgb('#0f0b0d'), 0.5, coat=0.08)
INK = M('ink', srgb('#160f11'), 0.4)
EYEW = M('eye_white', srgb('#efe8e0'), 0.25)
IRIS = M('iris', srgb('#2a1912'), 0.15, coat=0.6)
GOLDM = M('gold_metal', srgb('#d4a338'), 0.3, metal=1.0)
RED = M('red_drop', srgb('#b3262d'), 0.3)
CARD = M('card', srgb('#f4f1ec'), 0.4)
CARDBLUE = M('card_blue', srgb('#2f5fb0'), 0.4)

# embroidered gold border: mustard base with small procedural motifs (wave + voronoi), no image files
GOLD = bpy.data.materials.new('gold_border'); GOLD.use_nodes = True
nt = GOLD.node_tree; b = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexCoord'); vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 260
ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*srgb('#8a5f18'), 1); ramp.color_ramp.elements[1].color = (*srgb('#c9973a'), 1)
ramp.color_ramp.elements[0].position = 0.05; ramp.color_ramp.elements[1].position = 0.45
nt.links.new(tc.outputs['Object'], vor.inputs['Vector']); nt.links.new(vor.outputs['Distance'], ramp.inputs['Fac'])
nt.links.new(ramp.outputs['Color'], b.inputs['Base Color']); b.inputs['Metallic'].default_value = 0.55; b.inputs['Roughness'].default_value = 0.4
# lanyard: blue strap with white dashes
LAN = bpy.data.materials.new('lanyard'); LAN.use_nodes = True
nt = LAN.node_tree; b = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexCoord'); wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 60
ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
ramp.color_ramp.elements[0].color = (*srgb('#2f67c8'), 1); ramp.color_ramp.elements[1].color = (*srgb('#eef2ff'), 1); ramp.color_ramp.elements[1].position = 0.85
nt.links.new(tc.outputs['Object'], wave.inputs['Vector']); nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
b.inputs['Roughness'].default_value = 0.5

# ---------------- helpers ----------------
def obj_from(bm, name, mats, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); col.objects.link(o)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    return o

def rings_mesh(name, rings, seg, mats, mat_fn=None, cap_top=False, cap_bot=False):
    """rings: list of (z, rx, ry, cx, cy, fn) ; fn(theta)->radius multiplier. theta=0 at front (-Y)."""
    bm = bmesh.new(); vs = []
    for (z, rx, ry, cx, cy, fn) in rings:
        row = []
        for i in range(seg):
            t = 2 * math.pi * i / seg; k = fn(t) if fn else 1
            row.append(bm.verts.new((cx + math.sin(t) * rx * k, cy - math.cos(t) * ry * k, z)))
        vs.append(row)
    for j in range(len(vs) - 1):
        for i in range(seg):
            f = bm.faces.new((vs[j][i], vs[j][(i + 1) % seg], vs[j + 1][(i + 1) % seg], vs[j + 1][i]))
            if mat_fn: f.material_index = mat_fn(j, i, f)
    if cap_top: bm.faces.new(list(reversed(vs[-1])))
    if cap_bot: bm.faces.new(vs[0])
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from(bm, name, mats)

def tube(name, pts, radii, seg, mat, flat=1.0):
    """tube along polyline pts (Vector) with per-point radius; flat squashes along the local side axis."""
    bm = bmesh.new(); rows = []
    for k, p in enumerate(pts):
        d = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((0, 1, 0))
        a = d.cross(up).normalized(); c = d.cross(a).normalized()
        row = [bm.verts.new(p + (a * math.cos(2 * math.pi * i / seg) * flat + c * math.sin(2 * math.pi * i / seg)) * radii[k]) for i in range(seg)]
        rows.append(row)
    for j in range(len(rows) - 1):
        for i in range(seg):
            bm.faces.new((rows[j][i], rows[j][(i + 1) % seg], rows[j + 1][(i + 1) % seg], rows[j + 1][i]))
    bm.faces.new(list(reversed(rows[0]))); bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from(bm, name, [mat])

def uvsphere(name, loc, scale, mat, seg=16, ring=10):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    for v in bm.verts: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(loc)
    return obj_from(bm, name, [mat])

def gauss(d, s): return math.exp(-(d / s) ** 2)

# ---------------- head (sculpted by analytic deformation of a dense sphere, then subdivided) ----------------
HC = Vector((0, 0, 1.495))           # head centre
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=26, v_segments=16, radius=1)
for v in bm.verts:
    x, y, z = v.co
    # base skull: width 0.152, depth 0.19, height 0.23
    X, Y, Z = x * 0.076, y * 0.094, z * 0.112
    lower = max(0.0, -z)                                    # 0 at mid, 1 at chin
    X *= 1 - 0.38 * lower ** 1.6                            # jaw taper to a soft, rounded chin
    Y *= 1 - 0.12 * lower
    if y < 0: Y *= 1.0 - 0.1 * max(0, z)                    # slightly flatter forehead
    if z < -0.55 and y < 0: Y -= 0.012 * (lower - 0.55)     # chin forward
    # cheekbones
    Xs = X + math.copysign(0.006, x) * gauss(z + 0.05, 0.25) * (1 if y < 0 else 0.3)
    X = Xs
    # eye sockets: gentle inset
    for sx in (-1, 1):
        d = math.hypot(x - 0.36 * sx, z - 0.12)
        if y < 0: Y += 0.007 * gauss(d, 0.16) * (-y)
    # nose bridge + tip
    if y < 0:
        nz = gauss(x, 0.10) * gauss(z + 0.05, 0.22)
        Y -= 0.016 * nz * (-y) ** 3
        Y -= 0.008 * gauss(x, 0.13) * gauss(z + 0.24, 0.1) * (-y) ** 3
        # lip mound and mouth line
        Y -= 0.006 * gauss(x, 0.28) * gauss(z + 0.45, 0.12) * (-y) ** 2
    v.co = Vector((X, Y, Z)) + HC
head = obj_from(bm, 'head', [SKIN])
head.modifiers.new('sub', 'SUBSURF').levels = 1

# neck
neck = rings_mesh('neck', [(1.34, 0.056, 0.055, 0, 0.004, None), (1.40, 0.047, 0.05, 0, 0.006, None), (1.46, 0.046, 0.05, 0, 0.01, None)], 16, [SKIN])

# ---------------- face details ----------------
FY = HC.y - 0.094      # front surface y at centre
for sx in (-1, 1):
    ex, ez = 0.031 * sx, HC.z + 0.012
    ey = FY + 0.017
    uvsphere('eye_w%d' % sx, (ex, ey + 0.003, ez), (0.0155, 0.008, 0.0095), EYEW, 16, 10)
    uvsphere('iris%d' % sx, (ex, ey - 0.0042, ez), (0.0085, 0.003, 0.0085), IRIS, 12, 8)
    uvsphere('glint%d' % sx, (ex - 0.003, ey - 0.0072, ez + 0.003), (0.0018, 0.001, 0.0018), EYEW, 8, 6)
    # upper lid line (thick lash line) and soft lower line
    lid = [Vector((ex + 0.0175 * math.cos(a) , ey - 0.0045 - 0.004 * math.sin(a), ez + 0.0035 + 0.0075 * math.sin(a))) for a in [math.pi * k / 10 for k in range(11)]]
    tube('lid%d' % sx, lid, [0.0012 + 0.0011 * math.sin(math.pi * k / 10) for k in range(11)], 6, INK)
    # brows: arched, thicker toward the inner end
    br = [Vector((sx * (0.012 + 0.032 * u), FY + 0.012 + 0.006 * u, ez + 0.024 + 0.008 * math.sin(math.pi * min(1, u * 1.25)) - 0.004 * u)) for u in [k / 10 for k in range(11)]]
    tube('brow%d' % sx, br, [0.0026 - 0.0014 * (k / 10) for k in range(11)], 6, INK, flat=1.8)
    # earrings: gold stud + small red drop
    uvsphere('stud%d' % sx, (0.079 * sx, HC.y + 0.006, HC.z - 0.03), (0.006, 0.006, 0.006), GOLDM, 10, 6)
    uvsphere('drop%d' % sx, (0.08 * sx, HC.y + 0.006, HC.z - 0.047), (0.0055, 0.0055, 0.008), RED, 10, 6)
    # ears (simple smooth shells, mostly under hair)
    uvsphere('ear%d' % sx, (0.075 * sx, HC.y + 0.008, HC.z - 0.008), (0.009, 0.016, 0.024), SKIN, 12, 8)
uvsphere('nose_tip', (0, FY + 0.001, HC.z - 0.03), (0.0095, 0.0075, 0.0075), SKIN, 14, 10)
# lips: full, cupid's bow, red
def lip(name, zc, h, w, bow, yoff):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1)
    for v in bm.verts:
        x, y, z = v.co
        X = x * w; Z = z * h + bow * gauss(x, 0.25) * (1 if z > 0 else 0) * h; Y = y * 0.0042 - 0.003 * (1 - x * x)
        v.co = Vector((X, Y + yoff, Z + zc))
    return obj_from(bm, name, [LIPS])
lip('lip_up', HC.z - 0.058, 0.0042, 0.0175, -0.35, FY + 0.0165)
lip('lip_lo', HC.z - 0.0665, 0.005, 0.0158, 0.0, FY + 0.0175)

# ---------------- hair: cap + many wavy locks (curves -> mesh) ----------------
# cap: shell over the skull, open over the face; parting slightly to her right (-X)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=30, v_segments=16, radius=1)
kill = []
for v in bm.verts:
    x, y, z = v.co
    if z < -0.15 or (y < -0.2 and z < 0.55 - 0.0 * abs(x)): kill.append(v); continue
    groove = 0.004 * gauss(x + 0.18, 0.06) * (1 if z > 0.3 else 0)
    v.co = Vector((x * 0.084, y * 0.101, z * 0.12 - groove)) + HC + Vector((0, 0.004, 0.006))
bmesh.ops.delete(bm, geom=kill, context='VERTS')
cap = obj_from(bm, 'hair_cap', [HAIR]); cap.modifiers.new('sol', 'SOLIDIFY').thickness = 0.006

def lock(name, pts, r0, r1):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.resolution_u = 3; cu.bevel_depth = 1.0; cu.bevel_resolution = 1; cu.extrude = 0.0; cu.use_fill_caps = True
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1); u = i / (len(pts) - 1)
        sp.points[i].radius = (r0 + (r1 - r0) * u) * (0.35 + 0.65 * math.sin(math.pi * min(0.92, u * 1.25 + 0.08)))
    sp.use_endpoint_u = True; sp.order_u = 4
    o = bpy.data.objects.new(name, cu); cu.materials.append(HAIR); col.objects.link(o)
    return o

locks = []
import random
random.seed(7)
N = 20
for i in range(N):
    # angle around the head, from the parting (front, slightly right) going round the back; skip the face
    side = -1 if i < N // 2 else 1
    k = (i % (N // 2)) / (N // 2 - 1)          # 0 at front, 1 at back centre
    a = side * (0.62 + k * (math.pi - 0.62))    # theta from front
    root = HC + Vector((math.sin(a) * 0.07, -math.cos(a) * 0.085, 0.085 - 0.01 * k))
    # parting origin for the front locks: sweep from the parting outward
    if k < 0.25: root = HC + Vector((-0.014 + side * (0.025 + 0.06 * k), -0.062 + 0.07 * k, 0.098 - 0.04 * k))   # from the parting
    out = Vector((math.sin(a), -math.cos(a) * 0.85, 0))
    L = 0.27 + 0.04 * random.random() - 0.05 * (1 - k) * (k < 0.3)
    pts = []
    for s in range(8):
        u = s / 7
        z = root.z - u * L
        bulge = 0.088 + 0.075 * math.sin(min(1, u * 1.6) * math.pi * 0.5) + 0.01 * u     # volume grows down to the jaw
        wave = 0.03 * math.sin(u * math.pi * 3.0 + i * 1.3) * min(1, u * 2)
        p = HC + out * (bulge + wave) + Vector((0, 0, z - HC.z))
        if u == 0: p = root
        if k < 0.25 and u > 0: p += Vector((0, 0.025 * u + 0.012, 0))      # front locks sit behind the cheek line
        if u > 0.6: p += Vector((0, 0.03 * (u - 0.6), 0))                   # ends fall onto the shoulders, slightly back
        pts.append(p)
    locks.append(lock('lock%02d' % i, pts, 0.03, 0.022))
# convert locks to meshes and join
bpy.ops.object.select_all(action='DESELECT')
for o in locks: o.select_set(True)
bpy.context.view_layer.objects.active = locks[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.join(); hairl = bpy.context.view_layer.objects.active; hairl.name = 'hair_locks'
for p in hairl.data.polygons: p.use_smooth = True

# ---------------- torso / blouse ----------------
def torso_r(z):
    # (rx, ry) by height: hips ~0.17, waist 0.13, bust 0.16, shoulders 0.19
    pts = [(0.98, 0.165, 0.11), (1.06, 0.135, 0.095), (1.17, 0.15, 0.105), (1.24, 0.158, 0.112), (1.31, 0.16, 0.098), (1.355, 0.163, 0.088), (1.375, 0.148, 0.08), (1.39, 0.115, 0.07), (1.40, 0.07, 0.055)]
    for a, b in zip(pts, pts[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    return pts[-1][1:]
TZ = [0.98, 1.02, 1.06, 1.11, 1.17, 1.21, 1.24, 1.27, 1.30, 1.33, 1.355, 1.375, 1.39, 1.40]
def chest_fn(z):
    return lambda t: 1 + (0.06 * gauss(abs(math.sin(t)) - 0.45, 0.25) * (math.cos(t) > 0) if 1.17 < z < 1.29 else 0)
def tmat(j, i, f):
    c = f.calc_center_median()
    # scoop neckline (skin) front, and bare midriff band at the waist on her right side under the pallu
    if c.y < 0 and c.z > 1.27 + 0.6 * (c.x / 0.1) ** 2 * 0.1: return 1          # scoop neckline
    if c.z > 1.385: return 1
    if 1.0 < c.z < 1.10: return 1
    return 0
TORSO = bpy.data.materials.new('torso_blouse_skin'); TORSO.use_nodes = True
nt = TORSO.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.5
geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
def node_math(op, a, b=None):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    for idx, v in enumerate((a, b)):
        if v is None: continue
        if isinstance(v, (int, float)): n.inputs[idx].default_value = v
        else: nt.links.new(v, n.inputs[idx])
    return n.outputs[0]
# skin where z > 1.265 + 9 x^2 (front scoop) or z > 1.39, or the midriff band 1.0..1.10
x2 = node_math('MULTIPLY', node_math('POWER', sep.outputs['X'], 2), 9.0)
scoop = node_math('GREATER_THAN', sep.outputs['Z'], node_math('ADD', x2, 1.268))
front = node_math('LESS_THAN', sep.outputs['Y'], -0.02)
neck = node_math('MAXIMUM', node_math('MULTIPLY', scoop, front), node_math('GREATER_THAN', sep.outputs['Z'], 1.388))
mid = node_math('MULTIPLY', node_math('GREATER_THAN', sep.outputs['Z'], 1.025), node_math('LESS_THAN', sep.outputs['Z'], 1.075))
fac = node_math('MAXIMUM', neck, mid)
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs[6].default_value = (*srgb('#18151a'), 1); mix.inputs[7].default_value = (*srgb('#a8704e'), 1)
nt.links.new(fac, mix.inputs[0]); nt.links.new(mix.outputs[2], bs.inputs['Base Color'])
torso = rings_mesh('torso', [(z, *torso_r(z), 0, 0.0, chest_fn(z)) for z in TZ], 28, [TORSO], None, cap_top=True)

# ---------------- arms: tapered, slight elbow bend; short sleeves; hands ----------------
for sx in (-1, 1):
    sh = Vector((0.165 * sx, 0.005, 1.36)); el = Vector((0.19 * sx, 0.02, 1.115)); wr = Vector((0.185 * sx, -0.03, 0.885))
    up = [sh.lerp(el, u) for u in [k / 5 for k in range(6)]]
    fo = [el.lerp(wr, u) for u in [k / 5 for k in range(6)]][1:]
    pts = up + fo
    rad = [0.047, 0.044, 0.041, 0.039, 0.036, 0.033, 0.031, 0.029, 0.026, 0.023, 0.021]
    tube('arm%d' % sx, pts, rad, 14, SKIN)
    tube('sleeve%d' % sx, [sh + Vector((-0.01 * sx, 0, 0.03)), sh + Vector((0, 0, 0.012)), sh.lerp(el, 0.18), sh.lerp(el, 0.36)], [0.03, 0.054, 0.052, 0.048], 14, BLOUSE)
    h = wr + Vector((0, -0.005, -0.06))
    hb = uvsphere('hand%d' % sx, h, (0.022, 0.012, 0.04), SKIN, 14, 10)
    tube('thumb%d' % sx, [wr + Vector((-0.012 * sx, -0.014, -0.018)), wr + Vector((-0.016 * sx, -0.024, -0.05))], [0.0085, 0.007], 8, SKIN)
    if sx < 0:   # one gold bangle on her right wrist
        bpy.ops.mesh.primitive_torus_add(major_radius=0.03, minor_radius=0.0045, major_segments=20, minor_segments=6, location=wr + Vector((0, 0, 0.02)))
        bpy.context.active_object.data.materials.append(GOLDM); bpy.context.active_object.name = 'bangle'

# ---------------- saree skirt with front pleats and gold border ----------------
SZ = [0.0, 0.035, 0.07, 0.2, 0.45, 0.7, 0.88, 1.0, 1.04]
def skirt_r(z):
    return (0.17 + 0.02 * (1 - z) ** 4 - 0.012 * math.sin(z * 3.0), 0.135 + 0.01 * (1 - z) ** 4) if z < 0.9 else torso_r(max(0.98, z))
def pleats(z):
    return lambda t: 1 + (0.05 * math.sin(t * 26) * gauss(t if t < math.pi else t - 2 * math.pi, 0.55) * (1 - z) if z < 0.95 else 0)
def smat(j, i, f): return 1 if f.calc_center_median().z < 0.075 else 0
skirt = rings_mesh('skirt', [(z, *(r * 1.06 for r in skirt_r(z)), 0, 0.0, pleats(z)) for z in SZ], 40, [BLACK, GOLD], smat)
# waist tuck band
rings_mesh('waist', [(1.0, 0.172, 0.118, 0, 0, None), (1.035, 0.15, 0.104, 0, 0, None)], 24, [BLACK])

# ---------------- pallu: ribbon from her right waist across the chest over her left shoulder, down the back --------
def ribbon(name, centre, width, mats, border=0.18, solid=0.004, outward=None):
    bm = bmesh.new(); rows = []
    W = 10
    for k, p in enumerate(centre):
        d = (centre[min(k + 1, len(centre) - 1)] - centre[max(k - 1, 0)]).normalized()
        n = outward(p) if outward else Vector((0, -1, 0))
        s = d.cross(n).normalized()
        rows.append([bm.verts.new(p + s * width[k] * (j / W - 0.5)) for j in range(W + 1)])
    for k in range(len(rows) - 1):
        for j in range(W):
            f = bm.faces.new((rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j]))
            f.material_index = 1 if (j == 0 or j == W - 1) else 0
    o = obj_from(bm, name, mats)
    o.modifiers.new('sol', 'SOLIDIFY').thickness = solid
    return o
def body_out(p):
    v = Vector((p.x, p.y, 0)); return v.normalized() if v.length > 1e-4 else Vector((0, -1, 0))
C = []
path = [(-0.15, -0.105, 1.0), (-0.10, -0.122, 1.08), (-0.04, -0.128, 1.16), (0.03, -0.125, 1.24), (0.09, -0.112, 1.31), (0.13, -0.085, 1.37), (0.155, -0.03, 1.405), (0.165, 0.03, 1.40), (0.17, 0.08, 1.33), (0.18, 0.11, 1.18), (0.19, 0.12, 0.98), (0.19, 0.125, 0.82)]
from mathutils import geometry
pp = [Vector(p) for p in path]
C = []
for a, b2 in zip(pp, pp[1:]):
    for t in range(3): C.append(a.lerp(b2, t / 3))
C.append(pp[-1])
widths = [0.15 + 0.12 * min(1, abs(c.z - 1.38) * 2.5) for c in C]
pallu = ribbon('pallu', C, widths, [BLACK, GOLD], outward=body_out, solid=0.005)
sw = pallu.modifiers.new('wrap', 'SHRINKWRAP'); sw.target = torso; sw.wrap_mode = 'OUTSIDE_SURFACE'; sw.offset = 0.012
pallu.modifiers.move(1, 0)
# ---------------- lanyard + card ----------------
for sx in (-1, 1):
    lp = [Vector((0.035 * sx, 0.025, 1.40)), Vector((0.06 * sx, -0.05, 1.37)), Vector((0.05 * sx, -0.10, 1.31)), Vector((0.03 * sx, -0.127, 1.24)), Vector((0.012 * sx, -0.14, 1.17))]
    r = ribbon('lanyard%d' % sx, lp, [0.012] * len(lp), [LAN, LAN], outward=body_out, solid=0.0015)
    w = r.modifiers.new('wrap', 'SHRINKWRAP'); w.target = torso; w.wrap_mode = 'OUTSIDE_SURFACE'; w.offset = 0.022; r.modifiers.move(1, 0)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, -0.152, 1.12)); cd = bpy.context.active_object; cd.scale = (0.05, 0.004, 0.072); cd.data.materials.append(CARD); cd.name = 'id_card'
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, -0.155, 1.142)); cb = bpy.context.active_object; cb.scale = (0.046, 0.002, 0.018); cb.data.materials.append(CARDBLUE); cb.name = 'id_band'
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, -0.152, 1.162)); cl = bpy.context.active_object; cl.scale = (0.014, 0.004, 0.012); cl.data.materials.append(GOLDM); cl.name = 'id_clip'

# ---------------- feet peeking under the hem ----------------
for sx in (-1, 1): uvsphere('foot%d' % sx, (0.065 * sx, -0.115, 0.016), (0.03, 0.055, 0.016), SKIN, 10, 6)

# ---------------- stats ----------------
dg = bpy.context.evaluated_depsgraph_get(); tris = 0; per = {}
for o in scn.objects:
    if o.type == 'MESH':
        me = o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); tris += len(me.loop_triangles); per[o.name.rstrip('-0123456789')[:6]] = per.get(o.name.rstrip('-0123456789')[:6], 0) + len(me.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
print('TRIS', tris, sorted(per.items(), key=lambda x: -x[1])[:10])

# ---------------- lighting / world / camera (site palette: lilac -> peach) ----------------
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*srgb('#e9d3dc'), 1); bg.inputs['Strength'].default_value = 0.55
def area(name, loc, rot, energy, size, color):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size; L.color = color
    o = bpy.data.objects.new(name, L); o.location = loc; o.rotation_euler = rot; col.objects.link(o)
area('key', (-1.2, -1.6, 2.2), (math.radians(55), 0, math.radians(-35)), 130, 2.0, srgb('#ffe9d6'))
area('fill', (1.6, -1.2, 1.5), (math.radians(70), 0, math.radians(50)), 55, 2.5, srgb('#e3dcff'))
area('rim', (0.5, 1.6, 2.0), (math.radians(-55), 0, math.radians(165)), 90, 1.2, srgb('#ffd2c4'))
# backdrop
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); fl = bpy.context.active_object; fl.data.materials.append(M('floor', srgb('#efe2e6'), 0.9))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); col.objects.link(cam); scn.camera = cam

scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 900, 1100
scn.view_settings.view_transform = 'Standard'; scn.view_settings.look = 'Medium Contrast'
scn.render.film_transparent = False

def shot(fname, loc, target, lens):
    cam.location = loc; cam.data.lens = lens
    d = Vector(target) - Vector(loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = OUT + '/' + fname; bpy.ops.render.render(write_still=True)
import os; os.makedirs(OUT, exist_ok=True)
shot('front.png', (0, -1.15, 1.47), (0, 0, 1.42), 85)
shot('three_quarter.png', (-0.75, -0.9, 1.5), (0, 0, 1.41), 85)
scn.render.resolution_x, scn.render.resolution_y = 800, 1400
shot('full_body.png', (0.35, -3.6, 1.0), (0, 0, 0.83), 50)
if BLEND: bpy.ops.wm.save_as_mainfile(filepath=BLEND)
