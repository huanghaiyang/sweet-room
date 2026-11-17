# Blender 建模后端（dsh-blender 链路）

本目录是游戏房屋模型的 Blender 生产后端。驱动脚本 `house.py` 为**双轨**：经 dsh-blender
后端 headless 执行时复用其注入的 `geo` helper（box/cyl/prism/放样/布尔等）；直驱 Blender
时回退到本地 bmesh 构造。两种环境共用同一套游戏坐标映射与材质/导出逻辑。脚本按插件 skill
的「blockout → detail → validate → export」流程组织，并采用 Blender 5.x 防御写法。

## 环境

- Blender：`D:\blender\blender.exe`，5.2.2 LTS（Win64）
- 插件：desktop profile 已装配 `dsh-blender@0.2.4` 与 `@dsh-external/dsh-blender-plugin@2.1.0`
- 导出目标：`public/models/house.glb`（PixiJS `Model3D` 加载），工程源 `house.blend`

## 复现

直驱 Blender（bmesh fallback）：

```powershell
D:\blender\blender.exe --background --python tools\blender\house.py `
  -- --glb public\models\house.glb `
     --blend tools\blender\house.blend `
     --rooms 2
```

dsh-blender 后端 headless（`geo` helper 路线，推荐）：先拉起后端
`node "<插件>\runtime\server.mjs" --port 9877`，再 POST `/headless`，用 `scriptFile`
传脚本绝对路径、`preload:["geo"]`、`args` 传 `--glb/--blend/--rooms`（大脚本勿走内联
`script` body，避免 HTTP 接收中断）。

- `smoke.py`：后端冒烟用例（建体 + 导出 GLB 头校验），不参与游戏运行。
- 脚本结束打印 `HOUSE_RESULT {...}`：版本、是否走 geo、对象清单、整体与逐对象包围盒、产物路径与字节数。

## 坐标与朝向约定

- 脚本 helper `_to_blender` 接收**游戏世界坐标**（X 右、Y 上、Z 朝相机敞开面），
  换算成 Blender（`x=-X`、`y=Z`、`z=Y`）后把顶点烘焙进网格。
- 导出 glTF：`x_gltf=x_b`、`y_gltf=z_b`（高度）、`z_gltf=-y_b`；PixiJS 侧加载后再施加
  `rotation.y = π`（见 `src/game/SweetRoom.ts` 的 `loadHouseModel`）。两层变换叠加后相互
  抵消，模型最终按脚本传入的游戏坐标落位：`gameX=gx`、`gameY=gy`、`gameZ=gz`。
  因此左右非对称构件（楼梯、错动体块、悬崖）直接写游戏目标侧，无需再预设镜像对侧。
- 半开间：敞开面在游戏 `z=0`，后墙在 `z=-DEPTH`，地板顶面 `y=0`。

## 建模内容

- 建筑：地板、后墙窄垛 + 顶梁 + 踢脚 + 大玻璃幕墙（竖梃/横梃）、两侧仅留后角短垛、
  平直挑檐、左侧错动体块带小窗、二层悬挑回廊（楼板、前缘封边、玻璃栏板、扶手、立柱）、
  右侧双侧板闭合 + 木踏步楼梯、入口台阶。
- 地形（`COL-TERRAIN`）：右后侧低多边形崖体（深岩体 + 朝家岩切面 + 崖顶草皮，收回前院）、
  后侧海面（近岸 + 深海两层）、崖脚浪沫、左草坪与崖顶灌木（短干 + 低多边形冠球）。
  场景侧草地平面只铺前院与建筑左侧，右侧与后侧留给 GLB 地形。

## 材质注意

- 玻璃只做 alpha blend，**不要**加 transmission：glTF 规范未定义 transmission 与
  `alphaMode=BLEND` 组合，且透射通道需要应用画布不提供的 back buffer，会触发大量
  `glCopyTexSubImage2D` WebGL 错误。
- Principled BSDF 输入按名称迭代查找，避免 5.x socket 改名导致取空。

## 已知限制

- `house.glb` 是基础 2 开间的**静态外观**；扩建房间时室内地板与可摆放边界随状态延伸，
  但建筑外立面不随开间数拉伸。后续可按开间数生成多份 GLB，或把外墙段交回积木补建。
- 悬崖、海面为低多边形块面占位：无连续地形起伏、无海浪/浪花动画；海面位于房屋后侧，
  默认正面相机（方位角限幅 ±0.9）不易看到，需右转或后续放开相机角度。
- 室内摆件仍由 `src/game/builders.ts` 代码积木生成，尚未迁移到 Blender 模型。
- 几何为程序化盒体/倒角/棱柱/圆柱/截面放样，属中低模，非雕刻或扫描级高精度；参考图是
  AI 插画，含手绘质感与贴图，程序化几何无法等价复刻。冠球为低面 icosphere；玻璃仅 alpha
  blend、无透射，叠在浅色环境上仍偏灰。
- dsh-blender 是 Blender 执行后端，本身不内置、也不选择对话 LLM；「切换 deepseek 模型」
  属于宿主 App 的模型设置，agent 侧无法代切。
