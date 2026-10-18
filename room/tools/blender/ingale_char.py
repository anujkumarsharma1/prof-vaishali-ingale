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
PFX = argv[argv.index('--prefix') + 1] if '--prefix' in argv else ''

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
SKIN_HEX = '#9b6a4f'
SKIN = M('skin', srgb(SKIN_HEX), 0.5, sss=0.2)
def add_face_shading(m):
    nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    def blob(pt, radius, color, strength):
        d = nt.nodes.new('ShaderNodeVectorMath'); d.operation = 'DISTANCE'; d.inputs[1].default_value = pt
        nt.links.new(geo.outputs['Position'], d.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0; mr.inputs['From Max'].default_value = radius
        mr.inputs['To Min'].default_value = strength; mr.inputs['To Max'].default_value = 0.0
        nt.links.new(d.outputs['Value'], mr.inputs['Value'])
        return mr.outputs['Result'], color
    return nt, bs, blob
SKIN_SHADE = []   # filled after the head centre is known
LIPS = M('lips', srgb('#9a1c28'), 0.4, coat=0.2)
BLACK = M('saree_black', srgb('#1c191d'), 0.6)
PALLU = bpy.data.materials.new('pallu_body'); PALLU.use_nodes = True
nt = PALLU.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.42; b.inputs['Sheen Weight'].default_value = 0.6
b.inputs['Sheen Tint'].default_value = (*srgb('#6a5a70'), 1)
tc = nt.nodes.new('ShaderNodeTexCoord'); vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 34
nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.17; nt.links.new(vo.outputs['Distance'], lt.inputs[0])
mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = (*srgb('#241d24'), 1); mx.inputs[7].default_value = (*srgb('#c39236'), 1)
nt.links.new(lt.outputs[0], mx.inputs[0]); nt.links.new(mx.outputs[2], b.inputs['Base Color'])
mt = nt.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = 0.6; nt.links.new(lt.outputs[0], mt.inputs[0]); nt.links.new(mt.outputs[0], b.inputs['Metallic'])
BLOUSE = M('blouse_black', srgb('#141116'), 0.55)
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
nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS'; wv.inputs['Scale'].default_value = 140; wv.inputs['Distortion'].default_value = 4
nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; nt.links.new(vor.outputs['Distance'], mm.inputs[0]); nt.links.new(wv.outputs['Fac'], mm.inputs[1])
nt.links.new(mm.outputs[0], ramp.inputs['Fac'])
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.18; nt.links.new(mm.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
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
# ---------------- golden-ratio face proportions (all easy to tweak) ----------------
PHI = 1.618
FACE_L = 0.200                        # hairline -> chin
FACE_W = FACE_L / PHI                 # face length : width = phi  (~0.124 m cheek to cheek)
THIRD = FACE_L / 3                    # equal vertical thirds
Z_CHIN = HC.z - 0.115
CHIN_DROP = float(__import__('os').environ.get('CHIN_DROP', '0.01'))   # how far the front of the jaw is pulled down onto Z_CHIN
JAW_EXT = float(__import__('os').environ.get('JAW_EXT', '0.006'))
Z_NOSE = Z_CHIN + THIRD               # nose base
Z_BROW = Z_CHIN + 2 * THIRD           # brow line
Z_HAIR = Z_CHIN + 3 * THIRD           # hairline
MOUTH_FRAC = 1 / PHI ** 2             # golden split of the lower third: (nose->mouth):(mouth->chin) = 1:phi,
                                      # i.e. mouth->chin = 1/phi of nose->chin. Set to 1/PHI to put the mouth at 0.618 instead.
Z_MOUTH = Z_NOSE - MOUTH_FRAC * THIRD
EYE_W = FACE_W / 5                    # horizontal fifths: face = 5 eye widths
EYE_GAP = EYE_W                       # gap between the eyes = one eye width
EYE_X = (EYE_GAP + EYE_W) / 2         # eye centre offset from the midline
EYE_H = EYE_W / PHI                   # almond: height = width / phi
Z_EYE = Z_BROW - 0.42 * EYE_W - EYE_H / 2
NOSE_W = EYE_GAP                      # nose width = inter-eye distance
MOUTH_W = PHI * NOSE_W                # mouth width = phi x nose width (~ pupil to pupil)
LIP_UP = 0.0042                       # upper lip height
LIP_LO = PHI * LIP_UP                 # lower lip = phi x upper
BROW_PEAK = 1 / PHI                   # brow arch peak at 1/phi along the brow (inner -> outer)
def hz(zw): return (zw - HC.z) / 0.11  # world z -> normalised head-sphere z (for the sculpt)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=26, v_segments=16, radius=1)
for v in bm.verts:
    x, y, z = v.co
    # base skull: width 0.152, depth 0.19, height 0.23
    X, Y, Z = x * 0.08, y * 0.094, z * 0.11
    lower = max(0.0, -z)                                    # 0 at mid, 1 at chin
    if z < 0: Z = z * (0.11 + JAW_EXT * lower ** 1.5)          # lower face length (tuned so the chin silhouette lands on Z_CHIN)
    X *= 1 - 0.27 * lower ** 1.9                            # soft, rounded jaw
    Y *= 1 - 0.12 * lower
    if y < 0: Y *= 1.0 - 0.1 * max(0, z)                    # slightly flatter forehead
    if z < -0.7 and y < 0: Y -= 0.03 * (lower - 0.7)        # chin forward (front of the chin sits on Z_CHIN)
    # cheekbones
    Xs = X + math.copysign(0.009, x) * gauss(z + 0.22, 0.3) * (1 if y < 0 else 0.4)   # full cheeks
    X = Xs
    # eye sockets: gentle inset
    for sx in (-1, 1):
        d = math.hypot(x - EYE_X / 0.08 * sx, z - hz(Z_EYE))
        if y < 0: Y += 0.007 * gauss(d, 0.16) * (-y)
    # nose bridge + tip
    if y < 0:
        nz = gauss(x, 0.10) * gauss(z + 0.05, 0.22)
        Y -= 0.010 * gauss(x, 0.075) * gauss(z - (hz(Z_BROW) + hz(Z_NOSE)) / 2, 0.22) * (-y) ** 4          # bridge
        Y -= 0.011 * gauss(x, 0.11) * gauss(z - hz(Z_NOSE) - 0.06, 0.08) * (-y) ** 4           # soft tip
        Y += 0.0035 * gauss(x, 0.05) * gauss(z - (hz(Z_NOSE) + hz(Z_MOUTH)) / 2, 0.1) * (-y) ** 3  # philtrum groove
        Y -= 0.005 * gauss(abs(x) - 0.35, 0.18) * gauss(z + 0.22, 0.15) * (-y) ** 2  # cheek apples
        # lip mound and mouth line
        Y -= 0.006 * gauss(x, 0.28) * gauss(z - hz(Z_MOUTH), 0.12) * (-y) ** 2
    # rounded jaw: pull the FRONT of the lower face down (and slightly forward) so the chin lands on Z_CHIN;
    # weight fades toward the sides so the cheeks stay full instead of the jaw turning long and pointy
    if y < 0:
        w = max(0.0, min(1.0, (lower - 0.2) / 0.7)); w = w * w * (3 - 2 * w)
        side = gauss(x, 0.75)
        Z -= CHIN_DROP * w * side * min(1, -y * 1.4)
        Y -= 0.012 * w * side * min(1, -y * 1.4)
    v.co = Vector((X, Y, Z)) + HC
head = obj_from(bm, 'head', [SKIN])
head.modifiers.new('sub', 'SUBSURF').levels = 1
# face shading: soft rose on the cheeks, warmer lips area, slightly deeper under the nose/brow
FYc = HC.y - 0.094
nt, bs, blob = add_face_shading(SKIN)
base = nt.nodes.new('ShaderNodeRGB'); base.outputs[0].default_value = (*srgb(SKIN_HEX), 1); col_out = base.outputs[0]
for pt, rad, c, st in [((-0.045, FYc + 0.02, HC.z - 0.03), 0.035, '#a8574f', 0.45), ((0.045, FYc + 0.02, HC.z - 0.03), 0.035, '#a8574f', 0.45),
                       ((0, FYc + 0.03, Z_MOUTH), 0.026, '#8e3e3a', 0.5), ((0, FYc + 0.02, HC.z + 0.0), 0.02, '#87573f', 0.25), ((0, FYc + 0.03, Z_NOSE - 0.002), 0.011, '#6e4433', 0.5)]:
    fac, colr = blob(pt, rad, c, st)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[7].default_value = (*srgb(colr), 1)
    nt.links.new(fac, mx.inputs[0]); nt.links.new(col_out, mx.inputs[6]); col_out = mx.outputs[2]
nt.links.new(col_out, bs.inputs['Base Color'])

# neck
neck = rings_mesh('neck', [(1.34, 0.056, 0.055, 0, 0.004, None), (1.40, 0.047, 0.05, 0, 0.006, None), (1.46, 0.046, 0.05, 0, 0.01, None)], 16, [SKIN])

# ---------------- face details (placed on the sculpted surface by raycast) ----------------
from mathutils.bvhtree import BVHTree
dg0 = bpy.context.evaluated_depsgraph_get(); BVH = BVHTree.FromObject(head, dg0)
def surf_y(x, z):
    hit = BVH.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return hit[0].y if hit[0] else HC.y - 0.09
FY = HC.y - 0.094
for sx in (-1, 1):
    ex, ez = EYE_X * sx, Z_EYE
    ey = surf_y(ex, ez) + 0.0085                      # eyeball centre, set slightly into the socket
    uvsphere('eye_w%d' % sx, (ex, ey, ez), (EYE_W / 2, 0.0085, EYE_H / 2), EYEW, 16, 10)
    front = ey - 0.0085
    uvsphere('iris%d' % sx, (ex, front - 0.0003, ez - 0.0004), (0.0062, 0.0022, 0.0062), IRIS, 12, 8)
    uvsphere('glint%d' % sx, (ex - 0.0022 * sx, front - 0.0022, ez + 0.0022), (0.0014, 0.0008, 0.0014), EYEW, 8, 6)
    # light upper lid: covers only the top sliver so the eyes read open
    bml = bmesh.new(); bmesh.ops.create_uvsphere(bml, u_segments=16, v_segments=8, radius=1)
    bmesh.ops.delete(bml, geom=[v for v in bml.verts if v.co.z < 0.72], context='VERTS')
    for v in bml.verts: v.co = Vector((v.co.x * (EYE_W / 2 + 0.0012) + ex, v.co.y * 0.0092 + ey + 0.0005, v.co.z * (EYE_H / 2 + 0.0012) + ez))
    obj_from(bml, 'lidskin%d' % sx, [SKIN]).modifiers.new('sol', 'SOLIDIFY').thickness = 0.001
    # almond lash line (thicker at the outer end) and a faint lower line
    lid = [Vector((ex + (EYE_W / 2 + 0.0008) * math.cos(a), front - 0.0012 - 0.002 * math.sin(a), ez + (EYE_H / 2 + 0.0004) * math.sin(a))) for a in [math.pi * k / 12 for k in range(13)]]
    tube('lid%d' % sx, lid, [0.0009 + 0.0012 * math.sin(math.pi * k / 12) * (0.6 + 0.4 * ((k / 12) if sx > 0 else 1 - k / 12)) for k in range(13)], 6, INK)
    low = [Vector((ex + (EYE_W / 2) * math.cos(a), front - 0.0006, ez - (EYE_H / 2 + 0.0002) * math.sin(a) * 0.9)) for a in [math.pi * (0.15 + 0.7 * k / 8) for k in range(9)]]
    tube('lidlo%d' % sx, low, [0.0005] * 9, 5, M('lowerlid', srgb('#5a3a30'), 0.6) if sx < 0 else bpy.data.materials['lowerlid'])
    # brow: inner end above the inner eye corner, peak at 1/phi along, tapering to the outer end
    xi, xo = EYE_X - EYE_W / 2 - 0.001, EYE_X + EYE_W / 2 + 0.008
    def arch(u): return math.sin(math.pi / 2 * u / BROW_PEAK) if u < BROW_PEAK else math.cos(math.pi / 2 * (u - BROW_PEAK) / (1 - BROW_PEAK))
    br = []
    for k in range(13):
        u = k / 12; bx = sx * (xi + (xo - xi) * u); bz = Z_BROW + 0.0055 * arch(u) - 0.003 * u
        br.append(Vector((bx, surf_y(bx, bz) - 0.0012, bz)))
    tube('brow%d' % sx, br, [0.0028 - 0.0016 * (k / 12) for k in range(13)], 6, INK, flat=1.9)
    # earrings: gold stud + small red drop; ears mostly under hair
    uvsphere('stud%d' % sx, (0.079 * sx, HC.y + 0.006, HC.z - 0.03), (0.006, 0.006, 0.006), GOLDM, 10, 6)
    uvsphere('drop%d' % sx, (0.08 * sx, HC.y + 0.006, HC.z - 0.047), (0.0055, 0.0055, 0.008), RED, 10, 6)
    uvsphere('ear%d' % sx, (0.075 * sx, HC.y + 0.008, HC.z - 0.008), (0.009, 0.016, 0.024), SKIN, 12, 8)
# nose: tapered form from just below the brow to the nose base; alae span = NOSE_W
ntop, nbot = Z_BROW - 0.027, Z_NOSE + 0.002
NC = Vector((0, surf_y(0, (ntop + nbot) / 2) + 0.005, (ntop + nbot) / 2)); NH = (ntop - nbot) / 2
bmn = bmesh.new(); bmesh.ops.create_uvsphere(bmn, u_segments=16, v_segments=12, radius=1)
for v in bmn.verts:
    x, y, z = v.co; t = (1 - z) / 2                         # 0 at the bridge, 1 at the tip
    wing = max(0.0, (t - 0.68) / 0.32); wing = math.sin(min(1, wing) * math.pi * 0.5)       # flare into the nostril wings
    half_w = 0.0068 * (0.55 + 0.45 * t) + (NOSE_W / 2 - 0.0068) * wing * (1 - 0.35 * max(0, -y))
    tip = 0.0032 * math.sin(min(1, t * 1.05) * math.pi * 0.5) * (1 - 0.6 * wing * abs(x))      # soft, rounded tip
    v.co = NC + Vector((x * half_w, y * (0.0068 + 0.002 * wing) - tip, z * NH))
obj_from(bmn, 'nose', [SKIN]).modifiers.new('sub', 'SUBSURF').levels = 1
# (nostril wings are part of the nose mesh)
# mouth: ONE form (upper + lower lip with a cupid's bow), corners tucked back, a soft parting line; philtrum ridges
bmm = bmesh.new(); bmesh.ops.create_uvsphere(bmm, u_segments=24, v_segments=14, radius=1)
my = surf_y(0, Z_MOUTH)
for v in bmm.verts:
    x, y, z = v.co
    X = x * MOUTH_W / 2
    if z >= 0: Z = z * LIP_UP * (1 - 0.45 * gauss(x, 0.12) * z) + 0.0012 * gauss(abs(x) - 0.22, 0.12) * z   # cupid's bow
    else: Z = z * LIP_LO * (1 - 0.25 * x * x)
    Y = y * 0.0034 + 0.0105 * x * x - 0.0004            # corners wrap back around the face
    v.co = Vector((X, my + Y, Z_MOUTH + Z))
obj_from(bmm, 'mouth', [LIPS])
mline = [Vector((MOUTH_W / 2 * 0.98 * (2 * k / 12 - 1), 0, 0)) for k in range(13)]
mline = [Vector((p.x, my - 0.0004 + 0.0105 * (p.x / (MOUTH_W / 2)) ** 2 - 0.0004 - 0.0034 * math.sqrt(max(0, 1 - (p.x / (MOUTH_W / 2)) ** 2)), Z_MOUTH + 0.0003)) for p in mline]
tube('mouth_line', mline, [0.00045] * 13, 5, M('mouth_line', srgb('#4a1a1e'), 0.5))
# philtrum: carried by the sculpt groove + shading only (separate ridges read as teeth in 3/4)

# ---------------- hair: cap + many wavy locks (curves -> mesh) ----------------
# cap: shell over the skull, open over the face; parting slightly to her right (-X)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=30, v_segments=16, radius=1)
kill = []
for v in bm.verts:
    x, y, z = v.co
    hl = hz(Z_HAIR) * 0.11 / 0.12 - 0.55 * x * x           # smooth hairline arc, lower at the temples
    if z < -0.15 or (y < -0.2 and z < hl): kill.append(v); continue
    groove = 0.007 * gauss(x + 0.16, 0.045) * (1 if z > 0.3 else 0) * min(1, max(0, (y + 0.45) / 0.35))   # parting groove fades out before the hairline
    v.co = Vector((x * 0.084, y * 0.101, z * 0.12 - groove)) + HC + Vector((0, 0.004, 0.006))
bmesh.ops.delete(bm, geom=kill, context='VERTS')
cap = obj_from(bm, 'hair_cap', [HAIR]); cap.modifiers.new('sol', 'SOLIDIFY').thickness = 0.006

def lock(name, pts, r0, r1):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.resolution_u = 2; cu.bevel_depth = 1.0; cu.bevel_resolution = 1; cu.extrude = 0.0; cu.use_fill_caps = True
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1); u = i / (len(pts) - 1)
        sp.points[i].radius = (r0 + (r1 - r0) * u) * (0.45 + 0.55 * math.sin(math.pi * min(0.5, u))) * (1 - 0.85 * max(0, u - 0.8) / 0.2)
    sp.use_endpoint_u = True; sp.order_u = 4
    o = bpy.data.objects.new(name, cu); cu.materials.append(HAIR); col.objects.link(o)
    return o

locks = []
import random
random.seed(7)
N = 34
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
        bulge = 0.09 + 0.085 + 0.012 * random.random() - 0.006 + 0 * 0.075 - 0.085 + 0.085 * math.sin(min(1, u * 1.6) * math.pi * 0.5) + 0.01 * u     # volume grows down to the jaw
        wave = 0.022 * math.sin(u * math.pi * 4.6 + i * 1.7) * min(1, u * 2.2)
        bulge *= 0.84 + 0.16 * min(1, k * 2.5)                                # side locks hug the face
        p = HC + out * (bulge + wave) + Vector((0, 0, z - HC.z))
        if u == 0: p = root
        if k < 0.25 and u > 0: p += Vector((0, 0.025 * u + 0.012, 0))      # front locks sit behind the cheek line
        if u > 0.6: p += Vector((0, 0.03 * (u - 0.6), 0))                   # ends fall onto the shoulders, slightly back
        pts.append(p)
    locks.append(lock('lock%02d' % i, pts, 0.021, 0.017))
# hairline sweep: locks from the parting lying over the hairline toward the temples (no notch or ledge)
for j, (side, off) in enumerate([(-1, 0.0), (-1, 0.012), (1, 0.0), (1, 0.012), (1, 0.024)]):
    P0 = Vector((-0.012 + side * 0.004, HC.y - 0.07 + off, Z_HAIR + 0.016 - off * 0.3))
    pts = [P0 + Vector((side * 0.026 * u + side * 0.045 * u * u, 0.03 * u * u + off * u, -0.018 * u - 0.06 * u * u)) for u in [k / 6 for k in range(7)]]
    pts = [Vector((p.x, min(p.y, surf_y(p.x, p.z) + 0.0) if abs(p.x) < 0.07 else p.y, p.z)) for p in pts]
    locks.append(lock('sweep%d' % j, pts, 0.019, 0.016))
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
    pts = [(0.98, 0.165, 0.11), (1.06, 0.135, 0.095), (1.17, 0.15, 0.105), (1.24, 0.158, 0.112), (1.31, 0.16, 0.098), (1.35, 0.16, 0.09), (1.37, 0.145, 0.083), (1.385, 0.118, 0.073), (1.395, 0.09, 0.063), (1.40, 0.065, 0.055)]
    for a, b in zip(pts, pts[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    return pts[-1][1:]
TZ = [0.98, 1.02, 1.06, 1.11, 1.17, 1.21, 1.24, 1.27, 1.30, 1.33, 1.35, 1.37, 1.385, 1.395, 1.40]
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
mix.inputs[6].default_value = (*srgb('#141116'), 1); mix.inputs[7].default_value = (*srgb(SKIN_HEX), 1)
nt.links.new(fac, mix.inputs[0]); nt.links.new(mix.outputs[2], bs.inputs['Base Color'])
torso = rings_mesh('torso', [(z, *torso_r(z), 0, 0.0, chest_fn(z)) for z in TZ], 28, [TORSO], None, cap_top=True)

# ---------------- arms: tapered, slight elbow bend; short sleeves; hands ----------------
for sx in (-1, 1):
    sh = Vector((0.165 * sx, 0.005, 1.36)); el = Vector((0.19 * sx, 0.02, 1.115)); wr = Vector((0.185 * sx, -0.03, 0.885))
    up = [sh.lerp(el, u) for u in [0, 0.12, 0.25, 0.45, 0.65, 0.82, 0.92, 1.0]]
    fo = [el.lerp(wr, u) for u in [0.08, 0.18, 0.4, 0.62, 0.82, 0.93, 1.0]]
    pts = up + fo
    rad = [0.047, 0.046, 0.044, 0.041, 0.038, 0.035, 0.034, 0.033, 0.032, 0.031, 0.029, 0.026, 0.023, 0.021, 0.0195]
    tube('arm%d' % sx, pts, rad, 14, SKIN)
    tube('sleeve%d' % sx, [sh + Vector((-0.025 * sx, 0, 0.03)), sh + Vector((-0.008 * sx, 0, 0.022)), sh + Vector((0.002 * sx, 0, 0.0)), sh.lerp(el, 0.18), sh.lerp(el, 0.33), sh.lerp(el, 0.37)], [0.02, 0.045, 0.054, 0.052, 0.05, 0.044], 16, BLOUSE)
    h = wr + Vector((0, -0.005, -0.06))
    # palm faces the thigh (-sx); fingers hang down and curl slightly toward the palm
    palm_c = wr + Vector((0, -0.004, -0.04))
    uvsphere('palm%d' % sx, palm_c, (0.012, 0.024, 0.036), SKIN, 12, 8)
    for fi, (fy, flen) in enumerate([(-0.016, 0.052), (-0.0055, 0.058), (0.0055, 0.055), (0.0155, 0.046)]):
        b0 = palm_c + Vector((0, fy, -0.03)); fp = [b0]
        ang = 0.0
        for seg_len in (flen * 0.42, flen * 0.33, flen * 0.25):
            ang += 0.32 + 0.05 * fi
            fp.append(fp[-1] + Vector((-sx * math.sin(ang) * seg_len, 0, -math.cos(ang) * seg_len)))
        tube('finger%d_%d' % (sx, fi), fp, [0.0068, 0.0062, 0.0056, 0.0048], 6, SKIN)
    tb = palm_c + Vector((-0.006 * sx, -0.02, -0.004))
    tube('thumb%d' % sx, [tb, tb + Vector((-0.012 * sx, -0.012, -0.018)), tb + Vector((-0.02 * sx, -0.014, -0.034))], [0.0082, 0.0072, 0.006], 6, SKIN)
    if sx < 0:   # one gold bangle on her right wrist
        bpy.ops.mesh.primitive_torus_add(major_radius=0.03, minor_radius=0.0045, major_segments=20, minor_segments=6, location=wr + Vector((0, 0, 0.02)))
        bpy.context.active_object.data.materials.append(GOLDM); bpy.context.active_object.name = 'bangle'

# ---------------- saree skirt with front pleats and gold border ----------------
SZ = [0.004, 0.012, 0.03, 0.06, 0.09, 0.2, 0.33, 0.45, 0.5, 0.55, 0.7, 0.82, 0.9, 0.96, 1.0, 1.04]
def skirt_r(z):
    roll = 0.012 * (1 - min(1, z / 0.012)) if z < 0.012 else 0
    return (0.165 + 0.075 * (1 - z / 0.9) ** 1.6 - roll, 0.13 + 0.06 * (1 - z / 0.9) ** 1.6 - roll) if z < 0.9 else torso_r(max(0.98, z))
def pleats(z):
    tt = lambda t: t if t < math.pi else t - 2 * math.pi
    return lambda t: 1 + ((0.07 * abs(math.sin(t * 16)) - 0.035) * gauss(tt(t) + 0.15, 0.42) * (1 - z) ** 0.7 + 0.025 * math.sin(t * 7 + 1.3) * (1 - z) if z < 0.95 else 0)
def smat(j, i, f): return 1 if f.calc_center_median().z < 0.09 else 0
skirt = rings_mesh('skirt', [(z, *(r * 1.06 for r in skirt_r(z)), 0, 0.0, pleats(z)) for z in SZ], 48, [BLACK, GOLD], smat)
# waist tuck band
rings_mesh('waist', [(1.0, 0.172, 0.118, 0, 0, None), (1.035, 0.15, 0.104, 0, 0, None)], 24, [BLACK])

# ---------------- pallu: ribbon from her right waist across the chest over her left shoulder, down the back --------
def ribbon(name, centre, width, mats, border=0.18, solid=0.004, outward=None):
    bm = bmesh.new(); rows = []
    W = 12
    for k, p in enumerate(centre):
        d = (centre[min(k + 1, len(centre) - 1)] - centre[max(k - 1, 0)]).normalized()
        n = outward(p) if outward else Vector((0, -1, 0))
        s = d.cross(n).normalized()
        rows.append([bm.verts.new(p + s * width[k] * (j / W - 0.5)) for j in range(W + 1)])
    for k in range(len(rows) - 1):
        for j in range(W):
            f = bm.faces.new((rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j]))
            f.material_index = 1 if (j <= 2 or j == W - 1) else 0
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
widths = [0.19 + 0.12 * min(1, abs(c.z - 1.38) * 2.5) for c in C]
pallu = ribbon('pallu', C, widths, [PALLU, GOLD], outward=body_out, solid=0.005)
sw = pallu.modifiers.new('wrap', 'SHRINKWRAP'); sw.target = torso; sw.wrap_mode = 'OUTSIDE_SURFACE'; sw.offset = 0.012
pallu.modifiers.move(1, 0)
# ---------------- lanyard + card ----------------
for sx in (-1, 1):
    lp = [Vector((0.0, 0.068, 1.405)), Vector((0.05 * sx, 0.052, 1.405)), Vector((0.068 * sx, 0.0, 1.40)), Vector((0.065 * sx, -0.05, 1.375)), Vector((0.05 * sx, -0.10, 1.31)), Vector((0.03 * sx, -0.127, 1.24)), Vector((0.012 * sx, -0.14, 1.17))]
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
bv = BVHTree.FromObject(head, dg); zz = HC.z - 0.05; chin_z = None
while zz > HC.z - 0.2:                       # level ray sweep down the midline: lowest z that still hits the face from the front
    h = bv.ray_cast(Vector((0, -1, zz)), Vector((0, 1, 0)))
    if h[0] is None or h[0].y > HC.y - 0.02: break
    chin_z = zz; zz -= 0.0005
print('CHIN silhouette z = %.4f  guide Z_CHIN = %.4f  diff = %+.4f m' % (chin_z, Z_CHIN, chin_z - Z_CHIN))
if __import__('os').environ.get('NORENDER'): raise SystemExit
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
shot(PFX + 'front.png', (0, -1.15, Z_EYE - 0.02), (0, 0, Z_EYE - 0.02), 85)   # level camera at eye height
from bpy_extras.object_utils import world_to_camera_view
import json
def px(p):
    c = world_to_camera_view(scn, cam, Vector(p)); return [c.x * scn.render.resolution_x, (1 - c.y) * scn.render.resolution_y]
yfront = surf_y(0, Z_EYE) + 0.004       # project guides at the face surface depth
BVHF = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())
def ydepth(z):                       # each guide is drawn at the depth of the face at that height (fair in perspective)
    h = BVHF.ray_cast(Vector((0, -1, z + 0.0015)), Vector((0, 1, 0))); return h[0].y if h[0] else yfront
guides = {'h': {n: [px((-FACE_W / 2 - 0.02, ydepth(z), z)), px((FACE_W / 2 + 0.02, ydepth(z), z))] for n, z in
                [('hairline', Z_HAIR), ('brow', Z_BROW), ('nose base', Z_NOSE), ('mouth (golden split)', Z_MOUTH), ('chin', Z_CHIN), ('eyes', Z_EYE)]},
          'v': {('%+.1f eye' % (x / EYE_W)): [px((x, yfront, Z_HAIR + 0.01)), px((x, yfront, Z_CHIN - 0.01))] for x in [EYE_W * k / 2 for k in (-5, -3, -1, 1, 3, 5)]},
          'box': [px((-FACE_W / 2, ydepth(Z_HAIR), Z_HAIR)), px((FACE_W / 2, ydepth(Z_CHIN), Z_CHIN))],
          'consts': {'PHI': PHI, 'FACE_L': FACE_L, 'FACE_W': round(FACE_W, 4), 'THIRD': round(THIRD, 4), 'EYE_W': round(EYE_W, 4), 'EYE_H': round(EYE_H, 4), 'NOSE_W': round(NOSE_W, 4), 'MOUTH_W': round(MOUTH_W, 4), 'LIP_UP': LIP_UP, 'LIP_LO': round(LIP_LO, 4)}}
json.dump(guides, open(OUT + '/' + PFX + 'front_guides.json', 'w'), indent=1)
shot(PFX + 'three_quarter.png', (-0.75, -0.9, 1.5), (0, 0, 1.41), 85)
scn.render.resolution_x, scn.render.resolution_y = 800, 1400
shot(PFX + 'full_body.png', (0.35, -3.6, 1.0), (0, 0, 0.83), 50)
if BLEND: bpy.ops.wm.save_as_mainfile(filepath=BLEND)
