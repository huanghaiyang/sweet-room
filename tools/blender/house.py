"""Headless Blender model: coastal white-box villa + terrain, rebuilt to the references.

Runs through the dsh-blender backend (`/headless`, preload geo) when the geo helpers are
injected, and falls back to a self-contained bmesh implementation for a direct run:

  blender --background --python house.py -- --glb <abs.glb> [--blend <abs.blend>] [--rooms 2]

Coordinate contract (measured against the exported GLB and the in-game Y-up scene):
  helper converts game-world (X right, Y up, Z toward open front) to Blender
  (x=-X, y=Z, z=Y) and bakes it into vertices. The glTF exporter maps
  x_gltf=x_b, y_gltf=z_b, z_gltf=-y_b; the loaded model is then rotated 180° about Y in
  game code. The two transforms cancel, so meshes land at the passed game coordinates:
  gameX=gx, gameY=gy, gameZ=gz. Half-room: open front z=0, back wall z=-D, floor y=0.
"""

import bpy
import bmesh
import json
import math
import mathutils
import os
import sys
import traceback

UNIT = 3.2
DEPTH = 3.6
WALL_H = 3.4
SLAB_TOP = 2.6

PROJECT_ROOT = r"D:\sgames\sweet-room"

# Backend (dsh headless, preload geo) injects geo public names into globals.
_HAS_GEO = "box" in globals()


def parse_args() -> dict:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    cfg = {"glb": "public/models/house.glb", "blend": "", "rooms": "2"}
    for i, a in enumerate(argv):
        if a == "--glb" and i + 1 < len(argv):
            cfg["glb"] = argv[i + 1]
        elif a == "--blend" and i + 1 < len(argv):
            cfg["blend"] = argv[i + 1]
        elif a == "--rooms" and i + 1 < len(argv):
            cfg["rooms"] = argv[i + 1]
    return cfg


def make_material(
    name: str,
    rgb: tuple[float, float, float],
    rough: float = 0.95,
    metallic: float = 0.0,
    alpha: float = 1.0,
):
    mat = bpy.data.materials.new("MAT-" + name)
    mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)

    def set_input(socket_name: str, value):
        if bsdf is None:
            return
        sock = next((s for s in bsdf.inputs if s.name == socket_name), None)
        if sock is not None:
            sock.default_value = value

    set_input("Base Color", (*rgb, alpha))
    set_input("Roughness", rough)
    set_input("Metallic", metallic)
    set_input("Alpha", alpha)
    # No transmission: glTF leaves transmission + BLEND undefined, and the transmission
    # pass needs a back buffer the opaque app canvas does not provide.

    if alpha < 1.0:
        try:
            mat.surface_render_method = "BLEND"
        except Exception:
            try:
                mat.blend_method = "BLEND"
            except Exception:
                pass
    return mat


def _bx(gx: float) -> float:
    return -gx


def _to_blender(gx: float, gy: float, gz: float) -> tuple[float, float, float]:
    return -gx, gz, gy


def _attach(ob, mat):
    if mat is not None and ob.type == "MESH":
        ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------------------
# Geometry helpers (geo backend when present, bmesh fallback otherwise)
# ---------------------------------------------------------------------------

def gbox(name: str, center_g, size_g, mat, bevel_mm: float = 0.0, seg: int = 2):
    """Axis-aligned box from game center/size. Blender ranges x=[-gx], y=gz, z=gy."""
    gx, gy, gz = center_g
    sx, sy, sz = size_g
    x0, x1 = _bx(gx + sx / 2), _bx(gx - sx / 2)
    y0, y1 = gz - sz / 2, gz + sz / 2
    z0, z1 = gy - sy / 2, gy + sy / 2
    if _HAS_GEO:
        ob = box(name, (x0, x1), (y0, y1), (z0, z1), bevel_mm=bevel_mm, seg=seg)
        return _attach(ob, mat)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = v.co.x * sx + _bx(gx)
        v.co.y = v.co.y * sz + gz
        v.co.z = v.co.z * sy + gy
    me = bpy.data.meshes.new("GEO-" + name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if bevel_mm > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel_mm / 1000.0
        m.segments = seg
        m.limit_method = "ANGLE"
    return _attach(ob, mat)


def gcyl(name: str, p0_g, p1_g, r: float, mat, segs: int = 18):
    """Two-point cylinder in game coords."""
    a = _to_blender(*p0_g)
    b = _to_blender(*p1_g)
    if _HAS_GEO:
        ob = cyl(name, a, b, r, segs=segs)
        return _attach(ob, mat)
    bm = bmesh.new()
    d = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    L = math.sqrt(sum(c * c for c in d)) or 1.0
    bmesh.ops.create_cone(bm, radius1=r, radius2=r, depth=L, segments=segs, cap_ends=True)
    q = mathutils.Vector((0, 0, 1)).rotation_difference(mathutils.Vector(d).normalized())
    mid = mathutils.Vector(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2))
    M = mathutils.Matrix.Translation(mid) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    me = bpy.data.meshes.new("GEO-" + name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return _attach(ob, mat)


def gsphere(name: str, center_g, radius: float, mat, detail: int = 1):
    gx, gy, gz = center_g
    cx, cy, cz = _to_blender(gx, gy, gz)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=radius)
    bmesh.ops.translate(bm, vec=mathutils.Vector((cx, cy, cz)))
    me = bpy.data.meshes.new("GEO-" + name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return _attach(ob, mat)


def gprism_x(name: str, profile_z_y, x0_g: float, x1_g: float, mat, bevel_mm: float = 0.0):
    """Extrude a (gameZ, gameY) polygon along Blender X between two game-x planes."""
    if _HAS_GEO:
        prof = [(z, y) for (z, y) in profile_z_y]
        ob = prism(name, prof, "X", _bx(x1_g), _bx(x0_g), bevel_mm=bevel_mm)
        return _attach(ob, mat)
    # Fallback: real extruded polygon via bmesh, Blender coords (x, y=z, z=y).
    a0, a1 = _bx(x1_g), _bx(x0_g)
    bm = bmesh.new()
    vs = [bm.verts.new((a0, z, y)) for (z, y) in profile_z_y]
    face = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    nv = [e for e in res["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=mathutils.Vector((a1 - a0, 0.0, 0.0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("GEO-" + name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if bevel_mm > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel_mm / 1000.0
        m.segments = 2
        m.limit_method = "ANGLE"
    return _attach(ob, mat)


# ---------------------------------------------------------------------------
# Building
# ---------------------------------------------------------------------------

def build_house(rooms: int, m: dict) -> None:
    W = rooms * UNIT
    D = DEPTH
    H = WALL_H
    x0, x1 = -W / 2, W / 2
    zb = -D  # back wall game z

    # Floor: top face at y = 0
    gbox("FLOOR", (0, -0.06, -D / 2), (W, 0.12, D), m["floor"], bevel_mm=6)

    # Side walls: only short rear corner piers; the open front half exposes gallery/stair.
    gbox("LEFT_PIER", (x0 - 0.06, H / 2, zb + 0.5), (0.12, H, 1.0), m["wall"], bevel_mm=8)
    gbox("RIGHT_PIER", (x1 + 0.06, H / 2, zb + 0.5), (0.12, H, 1.0), m["wall"], bevel_mm=8)

    # Back wall frame: slim piers + thin head beam + sill + large glazed panel.
    pier = 0.25
    gbox("BACK_PIER_L", (x0 + pier / 2, H / 2, zb - 0.06), (pier, H, 0.12), m["wall"])
    gbox("BACK_PIER_R", (x1 - pier / 2, H / 2, zb - 0.06), (pier, H, 0.12), m["wall"])
    gbox("BACK_HEAD", (0, H - 0.125, zb - 0.06), (W, 0.25, 0.12), m["wall"])
    gbox("BACK_SILL", (0, 0.15, zb - 0.06), (W, 0.3, 0.12), m["wall"])

    win_w = W - 2 * pier
    win_bottom, win_top = 0.3, H - 0.25
    win_h = win_top - win_bottom
    win_y = (win_bottom + win_top) / 2
    gbox("WINDOW_PANE", (0, win_y, zb + 0.03), (win_w, win_h, 0.04), m["glass"])
    gbox("MULLION_H", (0, SLAB_TOP, zb + 0.045), (win_w, 0.07, 0.05), m["frame"])
    for i in range(5):
        xi = -win_w / 2 + (win_w * i) / 4
        gbox(f"MULLION_V_{i}", (xi, win_y, zb + 0.045), (0.07, win_h, 0.05), m["frame"])

    # Roof slab, thin and modest overhang, soft corner.
    gbox("ROOF", (0, H + 0.06, -D / 2), (W + 0.25, 0.12, D + 0.2), m["slab"], bevel_mm=10)

    # Second-floor gallery: slab + fascia + glass rail + handrail + posts.
    slab_thick = 0.16
    gallery_depth = 2.0
    zf = zb + gallery_depth
    gbox("SLAB", (0, SLAB_TOP - slab_thick / 2, zb + gallery_depth / 2),
         (W, slab_thick, gallery_depth), m["slab"], bevel_mm=6)
    gbox("SLAB_BEAM", (0, SLAB_TOP - 0.09, zf + 0.05), (W, 0.18, 0.16), m["slab"])
    gbox("RAIL_GLASS", (0, SLAB_TOP + 0.31, zf + 0.04), (W, 0.62, 0.03), m["glass"])
    gbox("RAIL", (0, SLAB_TOP + 0.65, zf + 0.04), (W, 0.07, 0.07), m["frame"])
    for i, px in enumerate([x0 + 0.18, -W / 6, W / 6, x1 - 0.18]):
        gcyl(f"RAIL_POST_{i}", (px, SLAB_TOP, zf + 0.04), (px, SLAB_TOP + 0.62, zf + 0.04),
             0.035, m["frame"], segs=12)

    # Offset annex, game-left: low protruding white block with a ribbon window.
    annex_w, annex_d, annex_h = 1.5, D * 0.55, 2.2
    gbox("ANNEX", (x0 - annex_w / 2 + 0.12, annex_h / 2, zb + annex_d / 2),
         (annex_w, annex_h, annex_d), m["wall"], bevel_mm=12)
    gbox("ANNEX_WIN", (x0 - annex_w + 0.18, 1.35, zb + annex_d / 2),
         (0.04, 0.7, 0.9), m["glass"])

    # Stair, game-right: two closed triangular stringer panels + wood treads.
    stair_x = x1 - 0.65
    z_start, z_end = 0.35, zf
    rise = SLAB_TOP
    # Side panels as extruded triangles, from floor to gallery, fully closed.
    tri = [(z_start, 0.0), (z_end, 0.0), (z_end, rise)]
    gprism_x("STAIR_SIDE_L", tri, stair_x - 0.39, stair_x - 0.30, m["frame"])
    gprism_x("STAIR_SIDE_R", tri, stair_x + 0.30, stair_x + 0.39, m["frame"])
    steps = 8
    step_d = (z_start - z_end) / steps
    step_h = rise / steps
    for i in range(steps):
        gbox(f"TREAD_{i}",
             (stair_x, (i + 1) * step_h - 0.05, z_start - (i + 0.5) * step_d),
             (0.60, 0.10, step_d * 1.12), m["wood"], bevel_mm=4)

    # Entrance steps, game-left front.
    for i in range(3):
        gbox(f"STEP_{i}",
             (x0 - 0.55, 0.06 * (i + 1), 0.15 - i * 0.32),
             (1.1, 0.12, 0.30), m["slab"], bevel_mm=4)


def build_terrain(m: dict) -> None:
    # Sea behind the house, below lawn level; two depth bands reaching the cliff foot.
    gbox("SEA_DEEP", (0, -2.0, -10.0), (24, 0.2, 5.0), m["sea_deep"])
    gbox("SEA", (0, -1.75, -5.4), (24, 0.12, 3.4), m["sea"])

    # Cliff: one consolidated rock platform on the game-right. Top flush with lawn (y=0);
    # the mass drops to the sea, with a darker cut face toward the house.
    gbox("CLIFF", (6.8, -1.0, -1.5), (5.6, 2.0, 6.0), m["cliff_dark"])
    gbox("CLIFF_FACE", (4.25, -0.9, -1.5), (0.5, 1.8, 6.0), m["cliff"])
    gbox("CLIFF_TOP", (6.8, 0.04, -1.5), (5.6, 0.10, 6.0), m["grass_lime"])

    # Foam flecks at the cliff foot, along the sea edge.
    for i, (fx, fz) in enumerate([(4.6, -4.6), (6.6, -5.0), (8.6, -4.4)]):
        gbox(f"FOAM_{i}", (fx, -1.7, fz), (0.9, 0.06, 0.3), m["foam"])

    # Shrubs: rounded crowns on short trunks, on the left lawn and cliff top only.
    shrubs = [
        (-5.2, -2.6, 0.5),
        (-4.7, -1.0, 0.42),
        (5.4, -3.2, 0.5),
        (7.0, -1.0, 0.58),
        (8.2, -3.4, 0.46),
    ]
    for i, (sx, sz, r) in enumerate(shrubs):
        gcyl(f"BUSH_STEM_{i}", (sx, 0, sz), (sx, 0.25, sz), r * 0.16, m["bush"], segs=10)
        gsphere(f"BUSH_CROWN_{i}", (sx, 0.25 + r * 0.55, sz), r, m["bush"], detail=1)


def build_materials() -> dict:
    return {
        "wall": make_material("WALL", (0.949, 0.937, 0.914), rough=0.92),
        "slab": make_material("SLAB", (0.925, 0.914, 0.886), rough=0.9),
        "frame": make_material("FRAME", (0.235, 0.263, 0.302), rough=0.55),
        "floor": make_material("FLOOR", (0.788, 0.604, 0.420), rough=0.85),
        "wood": make_material("WOOD", (0.725, 0.541, 0.369), rough=0.8),
        "glass": make_material("GLASS", (0.36, 0.62, 0.78), rough=0.1, alpha=0.62),
        "grass": make_material("GRASS", (0.541, 0.659, 0.400), rough=0.95),
        "grass_lime": make_material("GRASS_LIME", (0.659, 0.776, 0.427), rough=0.95),
        "cliff": make_material("CLIFF", (0.851, 0.706, 0.549), rough=0.95),
        "cliff_dark": make_material("CLIFF_DARK", (0.541, 0.482, 0.420), rough=0.95),
        "sea": make_material("SEA", (0.247, 0.561, 0.769), rough=0.35),
        "sea_deep": make_material("SEA_DEEP", (0.184, 0.455, 0.663), rough=0.35),
        "foam": make_material("FOAM", (0.957, 0.973, 0.984), rough=0.7),
        "bush": make_material("BUSH", (0.290, 0.420, 0.227), rough=0.95),
    }


def scene_bounds():
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for v in obj.data.vertices:
            co = obj.matrix_world @ v.co
            for k in range(3):
                mins[k] = min(mins[k], co[k])
                maxs[k] = max(maxs[k], co[k])
    return {"min": [round(x, 4) for x in mins], "max": [round(x, 4) for x in maxs]}


def resolve_path(p: str) -> str:
    if os.path.isabs(p):
        return p
    return os.path.abspath(os.path.join(PROJECT_ROOT, p))


def main() -> None:
    cfg = parse_args()
    rooms = max(2, int(cfg["rooms"]))

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    mats = build_materials()
    bpy.data.collections.new("COL-HOUSE")
    bpy.data.collections.new("COL-TERRAIN")

    build_house(rooms, mats)
    build_terrain(mats)

    glb_path = resolve_path(cfg["glb"])
    os.makedirs(os.path.dirname(glb_path), exist_ok=True)

    if cfg["blend"]:
        blend_path = resolve_path(cfg["blend"])
        os.makedirs(os.path.dirname(blend_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    if not hasattr(bpy.ops.export_scene, "gltf"):
        raise RuntimeError("glTF export operator unavailable in this Blender build")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=False)

    info = {
        "version": bpy.app.version_string,
        "geo": _HAS_GEO,
        "rooms": rooms,
        "objects": sorted(o.name for o in bpy.data.objects if o.type == "MESH"),
        "bounds": scene_bounds(),
        "glb": glb_path,
        "glb_size": os.path.getsize(glb_path),
    }
    print("HOUSE_RESULT " + json.dumps(info, ensure_ascii=False))


try:
    main()
except Exception:
    traceback.print_exc()
    sys.exit(1)
