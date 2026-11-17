# Blender 建模后端（dsh-blender 链路）

本目录是游戏房屋模型的 Blender 生产后端。插件 `dsh-blender` 的 DSH 注入工具
（`blender_python` / `blender_export` 等）由 DSH host 注入，当前会话不可见；因此这里复用
插件 skill 的「blockout → detail → validate → export」流程与 Blender 5.x 防御写法，写成
**自包含 headless 驱动脚本**，由命令行直驱 Blender，等价于插件后端的无 GUI 路线。

## 环境

- Blender：`D:\blender\blender.exe`，5.2.2 LTS（Win64）
- 插件：desktop profile 已装配 `dsh-blender@0.2.4` 与 `@dsh-external/dsh-blender-plugin@2.1.0`
- 导出目标：`public/models/house.glb`（PixiJS `Model3D` 加载），工程源 `house.blend`

## 复现

```powershell
D:\blender\blender.exe --background --python tools\blender\house.py `
  -- --glb public\models\house.glb `
     --blend tools\blender\house.blend `
     --rooms 2
```

- `smoke.py`：后端冒烟用例（建体 + 导出 GLB 头校验），不参与游戏运行。
- 脚本结束打印 `HOUSE_RESULT {...}`：版本、对象清单、包围盒、产物路径与字节数。

## 坐标与朝向约定

- 脚本内按 Blender 习惯 Z-up 建模；glTF 导出自动转 Y-up。
- 导出按 glTF 约定把 Blender `-Y` 作为前向，深度轴取反（`z_gltf = -y_blender`）。
  游戏半开间敞开面朝 `+Z`、后墙在 `-Z`，因此 PixiJS 侧加载后对模型施加
  `rotation.y = π` 校正前后（见 `src/game/SweetRoom.ts` 的 `loadHouseModel`）。
- 左右非对称构件（楼梯、错动体块）在 Blender 里预设到对侧，180° 回转后回到游戏的左侧。

## 材质注意

- 玻璃只做 alpha blend，**不要**加 transmission：glTF 规范未定义 transmission 与
  `alphaMode=BLEND` 组合，且透射通道需要应用画布不提供的 back buffer，会触发大量
  `glCopyTexSubImage2D` WebGL 错误。
- Principled BSDF 输入按名称迭代查找，避免 5.x socket 改名导致取空。

## 已知限制

- `house.glb` 是基础 2 开间的**静态外观**；扩建房间时室内地板与可摆放边界随状态延伸，
  但建筑外立面不随开间数拉伸。后续可按开间数生成多份 GLB，或把外墙段交回积木补建。
- 室内摆件仍由 `src/game/builders.ts` 代码积木生成，尚未迁移到 Blender 模型。
