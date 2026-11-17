"""Headless Blender model: modern white-box villa after the coastal reference image.

Project-adapted driver for the dsh-blender modeling pipeline. It keeps the plugin skill's
blockout -> detail -> validate -> export contract and the Blender 5.x defensive shading /
export style, but is self-contained (no DSH injected kernel) so it runs directly under:

  blender --background --python house.py -- --glb <abs.glb> [--blend <abs.blend>] [--rooms 2]

Coordinate note: authored Blender Z-up; the glTF exporter converts to glTF Y-up. The open
front faces +Y in Blender, which maps to +Z in glTF/PixiJS (open half-room, back wall -Z).
"""
from __future__ import annotations

import bpy
import bmesh
import json
import os
import sys
import traceback

# Game world constants (mirror src/game/model.ts)
UNIT = 3.2
DEPTH = 3.6
WALL_H = 3.4
SLAB_TOP = 2.6


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
    transmission: float = 0.0,
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
    if transmission > 0.0:
        set_input("Transmission Weight", transmission)

    if alpha < 1.0:
        # Blender 4.2+/5.x renamed blend_method -> surface_render_method; guard both.
        try:
            mat.surface_render_method = "BLEND"
        except Exception:
            try:
                mat.blend_method = "BLEND"
            except Exception:
                pass
    return mat


def add_box(
    collection: bpy.types.Collection,
    name: str,
    center: tuple[float, float, float],
    size: tuple[float, float, float],
    mat: bpy.types.Material | None,
):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size
    cx, cy, cz = center
    for v in bm.verts:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    mesh = bpy.data.meshes.new("GEO-" + name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if mat is not None:
        mesh.materials.append(mat)
    return obj


def build_villa(rooms: int):
    W = rooms * UNIT
    D = DEPTH
    H = WALL_H
    x0 = -W / 2
    x1 = W / 2

    # Palette (mirror SweetRoom.ts matte colors)
    mat_wall = make_material("WALL", (0.949, 0.937, 0.914), rough=0.92)
    mat_slab = make_material("SLAB", (0.925, 0.914, 0.886), rough=0.9)
    mat_frame = make_material("FRAME", (0.235, 0.263, 0.302), rough=0.55)
    mat_floor = make_material("FLOOR", (0.788, 0.604, 0.420), rough=0.85)
    mat_stair = make_material("STAIR", (0.906, 0.886, 0.847), rough=0.9)
    # No transmission: glTF leaves transmission + BLEND undefined, and the transmission
    # pass needs a back buffer the opaque app canvas does not provide. Alpha blend only.
    mat_glass = make_material(
        "GLASS", (0.620, 0.812, 0.878), rough=0.08, alpha=0.45, transmission=0.0
    )

    coll = bpy.data.collections.new("COL-HOUSE")
    bpy.context.scene.collection.children.link(coll)

    # Floor: top face at z = 0
    add_box(coll, "FLOOR", (0, -D / 2, -0.06), (W, D, 0.12), mat_floor)
    # Back wall, two side walls (front +Y open)
    add_box(coll, "BACK", (0, -D - 0.06, H / 2), (W, 0.12, H), mat_wall)
    add_box(coll, "LEFT", (x0 - 0.06, -D / 2, H / 2), (0.12, D, H), mat_wall)
    add_box(coll, "RIGHT", (x1 + 0.06, -D / 2, H / 2), (0.12, D, H), mat_wall)
    # Broad flat eaves overhanging the walls
    add_box(coll, "ROOF", (0, -D / 2, H + 0.07), (W + 0.5, D + 0.4, 0.14), mat_slab)
    # Skirting along the back wall
    add_box(coll, "SKIRT", (0, -D + 0.05, 0.06), (W, 0.08, 0.12), mat_slab)

    # Offset annex: lower protruding white block. Modelled on the right because the
    # loaded model is rotated 180° about Y in-game, so it reads on the left afterward.
    annex_w = 1.5
    annex_d = D * 0.55
    add_box(
        coll, "ANNEX",
        (x1 + annex_w / 2 - 0.12, -D + annex_d / 2, 1.1),
        (annex_w, annex_d, 2.2), mat_wall,
    )

    # Back-wall glass curtain wall
    win_w = W * 0.88
    win_bottom = 0.35
    win_top = H - 0.3
    win_h = win_top - win_bottom
    win_y = (win_bottom + win_top) / 2
    add_box(coll, "WINDOW_PANE", (0, -D + 0.03, win_y), (win_w, 0.04, win_h), mat_glass)
    # Horizontal transom at the loft level
    add_box(coll, "MULLION_H", (0, -D + 0.045, SLAB_TOP), (win_w, 0.05, 0.07), mat_frame)
    # Vertical mullions, evenly split
    mullions = 5
    for i in range(mullions):
        xi = -win_w / 2 + (win_w * i) / (mullions - 1)
        add_box(coll, f"MULLION_V_{i}", (xi, -D + 0.045, win_y), (0.07, 0.05, win_h), mat_frame)

    # Cantilevered second-floor balcony: slab + front fascia + glass rail + handrail
    slab_thick = 0.16
    slab_depth = D * 0.55
    zf = -D + slab_depth
    add_box(
        coll, "SLAB",
        (0, -D + slab_depth / 2, SLAB_TOP - slab_thick / 2),
        (W, slab_depth, slab_thick), mat_slab,
    )
    add_box(coll, "SLAB_BEAM", (0, zf + 0.05, SLAB_TOP - 0.09), (W, 0.16, 0.18), mat_slab)
    add_box(coll, "RAIL_GLASS", (0, zf + 0.04, SLAB_TOP + 0.31), (W, 0.03, 0.62), mat_glass)
    add_box(coll, "RAIL", (0, zf + 0.04, SLAB_TOP + 0.65), (W, 0.07, 0.07), mat_frame)

    post_xs = [x0 + 0.18, -W / 6, W / 6, x1 - 0.18]
    for i, px in enumerate(post_xs):
        add_box(coll, f"RAIL_POST_{i}", (px, zf + 0.04, SLAB_TOP + 0.325),
                (0.06, 0.06, 0.65), mat_frame)

    # Stair: inclined stringer + 8 treads against the wall. Right side in the model so
    # the 180° in-game Y rotation returns it to the left wall.
    stair_x = x1 - 0.72
    z_start = 0.35
    z_end = zf
    run = z_start - z_end
    rise = SLAB_TOP
    length = (run * run + rise * rise) ** 0.5
    stringer = add_box(
        coll, "STAIR",
        (stair_x, (z_start + z_end) / 2, rise / 2),
        (0.85, length, 0.06), mat_stair,
    )
    stringer.rotation_euler.x = -__import__("math").atan2(rise, run)

    steps = 8
    step_d = run / steps
    step_h = rise / steps
    for i in range(steps):
        add_box(
            coll, f"TREAD_{i}",
            (stair_x, z_start - (i + 0.5) * step_d, (i + 1) * step_h - 0.05),
            (0.85, step_d * 1.12, 0.10), mat_stair,
        )

    return coll


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


def main() -> None:
    cfg = parse_args()
    rooms = max(2, int(cfg["rooms"]))

    # Fresh delivery scene: drop startup content.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    build_villa(rooms)

    glb_path = os.path.abspath(cfg["glb"])
    os.makedirs(os.path.dirname(glb_path), exist_ok=True)

    if cfg["blend"]:
        blend_path = os.path.abspath(cfg["blend"])
        os.makedirs(os.path.dirname(blend_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Guarded glTF export (operator/args stable on 5.2, but probe anyway).
    if not hasattr(bpy.ops.export_scene, "gltf"):
        raise RuntimeError("glTF export operator unavailable in this Blender build")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=False)

    info = {
        "version": bpy.app.version_string,
        "rooms": rooms,
        "objects": sorted(o.name for o in bpy.data.objects if o.type == "MESH"),
        "bounds": scene_bounds(),
        "glb": glb_path,
        "glb_size": os.path.getsize(glb_path),
    }
    print("HOUSE_RESULT " + json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
