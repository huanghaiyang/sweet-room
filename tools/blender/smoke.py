"""Headless smoke test: prove Blender 5.2 can build a mesh and export a GLB.

Run:
  blender --background --python smoke.py -- --out <abs/rel glb path>
Defensive 5.x style: probe version, use bpy.data where possible, keep export guarded.
"""
import bpy
import json
import os
import sys
import traceback


def parse_out() -> str:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = "public/models/smoke.glb"
    for i, a in enumerate(argv):
        if a == "--out" and i + 1 < len(argv):
            out = argv[i + 1]
    return out


def main() -> None:
    out = parse_out()

    # Clear startup content (this smoke scene is ours to reset).
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    cube = bpy.context.active_object
    cube.name = "SMOKE_CUBE"

    mat = bpy.data.materials.new("MAT_SMOKE")
    mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (0.9, 0.8, 0.7, 1.0)
    cube.data.materials.append(mat)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")

    info = {
        "version": bpy.app.version_string,
        "objects": [o.name for o in bpy.data.objects],
        "out": os.path.abspath(out),
        "size": os.path.getsize(out),
    }
    print("SMOKE_RESULT " + json.dumps(info))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
