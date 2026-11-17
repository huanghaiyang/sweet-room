"""Headless Blender model: coastal white-box villa + terrain, after the two references.

Project-adapted driver for the dsh-blender modeling pipeline. It keeps the plugin skill's
blockout -> detail -> validate -> export contract and the Blender 5.x defensive shading /
export style, but is self-contained (no DSH injected kernel) so it runs directly under:

  blender --background --python house.py -- --glb <abs.glb> [--blend <abs.blend>] [--rooms 2]

Coordinate contract (measured against the exported GLB and the in-game Y-up scene):
  glTF x = Blender x,  glTF y = Blender z (height),  glTF z = -Blender y.
  The loaded model is rotated 180° about Y in-game (see SweetRoom.ts), so the final world
  mapping is:  game X = -Blender x,  game Y = Blender z,  game Z = Blender y.
  Helpers below therefore take GAME coordinates (X right, Y up, Z toward the camera/open
  front) and convert internally. Half-room: open front at game z = 0, back wall at z = -D.
"""
from __future__ import annotations

import bpy
import bmesh
import json
import math
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
    # pass needs a back buffer the opaque app canvas does not provide. Alpha blend only.

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


def _to_blender(gx: float, gy: float, gz: float) -> tuple[float, float, float]:
    """Game world (X right, Y up, Z front) -> Blender (x, y rearward, z up)."""
    return -gx, gz, gy


def add_box(
    collection: bpy.types.Collection,
    name: str,
    center_g: tuple[float, float, float],
    size_g: tuple[float, float, float],
    mat: bpy.types.Material | None,
):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size_g
    cx, cy, cz = _to_blender(*center_g)
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


def build_house(rooms: int, house: bpy.types.Collection, mats: dict) -> None:
    W = rooms * UNIT
    D = DEPTH
    H = WALL_H
    x0 = -W / 2
    x1 = W / 2

    wall = mats["wall"]
    slab = mats["slab"]
    frame = mats["frame"]
    floor = mats["floor"]
    glass = mats["glass"]
    stair = mats["stair"]
    wood = mats["wood"]

    # ---- Structural shell: floor, back wall, two side walls, flat eaves ----
    add_box(house, "FLOOR", (0, -0.06, -D / 2), (W, 0.12, D), floor)
    add_box(house, "BACK", (0, H / 2, -D - 0.06), (W, 0.12, H), wall)
    add_box(house, "LEFT", (x0 - 0.06, H / 2, -D / 2), (0.12, D, H), wall)
    add_box(house, "RIGHT", (x1 + 0.06, H / 2, -D / 2), (0.12, D, H), wall)
    # Broad flat roof slab, overhanging on every side
    add_box(house, "ROOF", (0, H + 0.07, -D / 2), (W + 0.5, 0.14, D + 0.4), slab)
    # Skirting along the back wall
    add_box(house, "SKIRT", (0, 0.06, -D + 0.05), (W, 0.12, 0.08), slab)

    # ---- Offset annex: lower protruding white block on the game-left side ----
    # Coordinates below are final game-world positions (the helper + in-game Y rotation
    # cancel out, so pass the game target directly).
    annex_w, annex_d, annex_h = 1.5, D * 0.55, 2.2
    add_box(
        house, "ANNEX",
        (x0 - annex_w / 2 + 0.12, annex_h / 2, -D + annex_d / 2),
        (annex_w, annex_d, annex_h), wall,
    )
    # Small ribbon window on the annex outer face
    add_box(
        house, "ANNEX_WIN",
        (x0 - annex_w + 0.18, 1.35, -D + annex_d / 2),
        (0.04, 0.9, 0.7), glass,
    )

    # ---- Back-wall curtain wall: glass + vertical mullions + one transom ----
    win_w = W * 0.88
    win_bottom = 0.35
    win_top = H - 0.3
    win_h = win_top - win_bottom
    win_y = (win_bottom + win_top) / 2
    add_box(house, "WINDOW_PANE", (0, win_y, -D + 0.03), (win_w, win_h, 0.04), glass)
    add_box(house, "MULLION_H", (0, SLAB_TOP, -D + 0.045), (win_w, 0.07, 0.05), frame)
    mullions = 5
    for i in range(mullions):
        xi = -win_w / 2 + (win_w * i) / (mullions - 1)
        add_box(house, f"MULLION_V_{i}", (xi, win_y, -D + 0.045),
                (0.07, win_h, 0.05), frame)

    # ---- Cantilevered second-floor gallery: slab + fascia + glass rail + handrail ----
    slab_thick = 0.16
    gallery_depth = 2.0
    zf = -D + gallery_depth  # gallery front edge (game z)
    add_box(
        house, "SLAB",
        (0, SLAB_TOP - slab_thick / 2, -D + gallery_depth / 2),
        (W, slab_thick, gallery_depth), slab,
    )
    add_box(house, "SLAB_BEAM", (0, SLAB_TOP - 0.09, zf + 0.05),
            (W, 0.18, 0.16), slab)
    add_box(house, "RAIL_GLASS", (0, SLAB_TOP + 0.31, zf + 0.04),
            (W, 0.62, 0.03), glass)
    add_box(house, "RAIL", (0, SLAB_TOP + 0.65, zf + 0.04),
            (W, 0.07, 0.07), frame)

    post_xs = [x0 + 0.18, -W / 6, W / 6, x1 - 0.18]
    for i, px in enumerate(post_xs):
        add_box(house, f"RAIL_POST_{i}", (px, SLAB_TOP + 0.325, zf + 0.04),
                (0.06, 0.65, 0.06), frame)

    # ---- Stair: game-right side (reference interior), double dark stringers + wood treads ----
    stair_x = x1 - 0.72
    z_start = 0.35
    z_end = zf
    run = z_start - z_end
    rise = SLAB_TOP
    length = (run * run + rise * rise) ** 0.5
    mid_z = (z_start + z_end) / 2

    # Two dark inclined stringers flanking the treads
    for side, off in (("L", -0.34), ("R", 0.34)):
        stringer = add_box(
            house, f"STAIR_{side}",
            (stair_x + off, rise / 2, mid_z),
            (0.08, length, 0.10), frame,
        )
        # In Blender the stair runs along y (game z); pitch about the Blender x axis.
        stringer.rotation_euler.x = -math.atan2(rise, run)

    steps = 8
    step_d = run / steps
    step_h = rise / steps
    for i in range(steps):
        add_box(
            house, f"TREAD_{i}",
            (stair_x, (i + 1) * step_h - 0.05, z_start - (i + 0.5) * step_d),
            (0.85, 0.10, step_d * 1.12), wood,
        )

    # ---- Entrance steps on the game-left front side ----
    for i in range(3):
        add_box(
            house, f"STEP_{i}",
            (x0 - 0.55, 0.06 * (i + 1), 0.15 - i * 0.32),
            (1.1, 0.12, 0.30), slab,
        )


def build_terrain(terrain: bpy.types.Collection, mats: dict) -> None:
    grass_lime = mats["grass_lime"]
    cliff = mats["cliff"]
    cliff_dark = mats["cliff_dark"]
    sea = mats["sea"]
    sea_deep = mats["sea_deep"]
    foam = mats["foam"]
    bush = mats["bush"]

    # Sea: broad flat plane behind the house (game -Z), below lawn level; the near band
    # reaches the cliff foot on the game-right side.
    add_box(terrain, "SEA_DEEP", (0, -2.1, -7.2), (22, 0.2, 4.2), sea_deep)
    add_box(terrain, "SEA", (0, -1.9, -4.1), (22, 0.12, 2.6), sea)

    # Cliff on the game-right/rear: blocks whose top face sits flush with the lawn (y=0)
    # and whose sides drop toward the sea. Low-poly stepped masses, light and shadow rock.
    # (center_x, center_z, size_x, size_z, drop, material)  top at y = 0
    cliff_blocks = [
        (4.7, -3.0, 1.5, 3.0, 1.9, cliff),
        (5.9, -2.4, 1.7, 2.6, 2.3, cliff_dark),
        (7.3, -3.2, 1.9, 3.2, 1.7, cliff),
        (5.1, -0.7, 1.5, 1.5, 2.1, cliff),
        (7.1, -0.9, 1.9, 1.7, 2.5, cliff_dark),
        (8.6, -2.2, 1.6, 2.8, 2.0, cliff),
    ]
    for i, (cx, cz, sx, sz, drop, mat) in enumerate(cliff_blocks):
        add_box(terrain, f"CLIFF_{i}", (cx, -drop / 2, cz), (sx, drop, sz), mat)

    # Cliff-top lawn cap, flush with the ground plane.
    add_box(terrain, "CLIFF_TOP", (6.3, 0.04, -2.0), (4.6, 0.10, 4.2), grass_lime)

    # Foam flecks where cliff meets sea.
    foam_spots = [(4.9, -1.8, -3.9), (6.6, -1.77, -4.3), (8.4, -1.81, -3.6)]
    for i, (fx, fy, fz) in enumerate(foam_spots):
        add_box(terrain, f"FOAM_{i}", (fx, fy, fz), (0.9, 0.06, 0.35), foam)

    # Shrubs: low rounded blocks along the lawn edges and cliff top; centers sit on y=0.
    shrubs = [
        (-4.4, -2.8, 0.9, 0.7, 0.8),
        (-5.0, -1.2, 0.7, 0.6, 0.7),
        (4.4, -3.6, 0.8, 0.6, 0.8),
        (6.2, -0.5, 1.0, 0.7, 0.9),
        (-3.9, 0.8, 0.6, 0.55, 0.6),
    ]
    for i, (sx, sz, w, h, d) in enumerate(shrubs):
        add_box(terrain, f"BUSH_{i}", (sx, h / 2, sz), (w, h, d), bush)


def build_materials() -> dict:
    return {
        "wall": make_material("WALL", (0.949, 0.937, 0.914), rough=0.92),
        "slab": make_material("SLAB", (0.925, 0.914, 0.886), rough=0.9),
        "frame": make_material("FRAME", (0.235, 0.263, 0.302), rough=0.55),
        "floor": make_material("FLOOR", (0.788, 0.604, 0.420), rough=0.85),
        "stair": make_material("STAIR", (0.906, 0.886, 0.847), rough=0.9),
        "glass": make_material("GLASS", (0.553, 0.776, 0.863), rough=0.08, alpha=0.55),
        "wood": make_material("WOOD", (0.725, 0.541, 0.369), rough=0.8),
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


def main() -> None:
    cfg = parse_args()
    rooms = max(2, int(cfg["rooms"]))

    # Fresh delivery scene: drop startup content.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    mats = build_materials()
    house = bpy.data.collections.new("COL-HOUSE")
    terrain = bpy.data.collections.new("COL-TERRAIN")
    bpy.context.scene.collection.children.link(house)
    bpy.context.scene.collection.children.link(terrain)

    build_house(rooms, house, mats)
    build_terrain(terrain, mats)

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
