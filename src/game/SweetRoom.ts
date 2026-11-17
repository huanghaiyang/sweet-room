import { Application } from 'pixi.js'
import {
  View3D, Mesh3D, Container3D, Plane, Vector3,
  CubeGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, ConeGeometry,
  DirectionalLight, AmbientLight, PointLight,
  Pointer3DEvent
} from '@pixi/3d'
import { OutlinePass } from '@pixi/3d/extras'
import {
  state, addItem, removeItem, moveItem, selectItem,
  rotateItem, expandRoom, expandYard
} from './state'
import { defById } from './items'
import { buildItem } from './builders'
import { matte, invisible, glass, glow } from './materials'
import * as M from './model'
import type { ItemDef } from './model'

export class SweetRoom {
  private app!: Application
  private view!: View3D

  private houseGroup!: Container3D
  private itemsGroup!: Container3D
  private nodeMap = new Map<string, Container3D>()

  private ghost: Container3D | null = null
  private ring!: Mesh3D

  private groundPlane = new Plane(new Vector3(0, 1, 0), 0)
  private out = new Vector3()
  private dragPlane = new Plane()
  private grabOffset = new Vector3()

  private wallMatte = matte('#f6e3c8')
  private floorMatte = matte('#c99a6b')
  private trimMatte = matte('#8a5a3b')

  private hFloor!: Mesh3D
  private hBack!: Mesh3D
  private hLeft!: Mesh3D
  private hRight!: Mesh3D
  private hCornice!: Mesh3D
  private hSkirt!: Mesh3D
  // 窗户
  private hWinFrame!: Mesh3D
  private hWinPane!: Mesh3D
  private hMullion!: Mesh3D
  // 二层格局
  private loftGroup!: Container3D
  private hSlab!: Mesh3D
  private hRail!: Mesh3D
  private hStair!: Mesh3D

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application()
    await this.app.init({
      preference: 'webgl',
      resizeTo: container,
      antialias: true,
      background: 0xf3dfc4
    })
    container.appendChild(this.app.canvas)

    this.view = new View3D({
      autoResize: true,
      shadowQuality: 'medium',
      shadowFilter: 'pcf',
      toneMapping: 'aces',
      exposure: 1.1,
      environment: { skyColor: 0xffe9c9, groundColor: 0x7d8a5e, intensity: 0.6 },
      passes: [new OutlinePass({ width: 0.045, color: 0x4a3527 })]
    })
    this.app.stage.addChild(this.view)

    this.setupLights()
    this.setupGround()

    this.houseGroup = new Container3D()
    this.itemsGroup = new Container3D()
    this.loftGroup = new Container3D()
    this.view.root.addChild(this.houseGroup, this.loftGroup, this.itemsGroup)

    this.rebuildHouse()
    this.setupCamera()
    this.setupPicking()
    this.setupRing()
    this.syncItems()
  }

  // -------------------------------------------------------------------------
  // 基础场景
  // -------------------------------------------------------------------------

  private setupLights(): void {
    const sun = new DirectionalLight({
      color: 0xfff0d8,
      intensity: 2.6,
      castShadow: true,
      position: { x: 6, y: 9, z: 5 }
    })
    sun.lookAt({ x: 0, y: 0, z: 0 })
    this.view.root.addChild(sun)

    const ambient = new AmbientLight({ color: 0xffe6cf, intensity: 0.55 })
    this.view.root.addChild(ambient)

    // 室内暖光吊灯氛围
    const bulb = new PointLight({
      color: 0xffb36b,
      intensity: 10,
      range: 7,
      position: { x: 0, y: 2.7, z: -1.6 }
    })
    this.view.root.addChild(bulb)

    // 吊灯造型：吊线 + 倒锥灯罩 + 发光灯泡
    const cord = new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.015, radiusBottom: 0.015, height: 0.8 }),
      material: matte('#6f4630'),
      position: { x: 0, y: 3.05, z: -1.6 },
      castShadow: false
    })
    const shade = new Mesh3D({
      geometry: new ConeGeometry({ radius: 0.34, height: 0.32 }),
      material: matte('#c98d5e'),
      position: { x: 0, y: 2.62, z: -1.6 },
      castShadow: false
    })
    shade.rotation.x = Math.PI
    const bulbMesh = new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.09 }),
      material: glow('#ffd98a'),
      position: { x: 0, y: 2.5, z: -1.6 },
      castShadow: false
    })
    this.view.root.addChild(cord, shade, bulbMesh)
  }

  private setupGround(): void {
    const ground = new Mesh3D({
      geometry: new PlaneGeometry({ width: 26, height: 20 }),
      material: matte('#8aa866'),
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 2 },
      castShadow: false,
      receiveShadow: true
    })
    this.view.root.addChild(ground)
  }

  private setupCamera(): void {
    // 固定半开间视角，不挂轨道控制器，避免其指针订阅干扰摆放拾取
    this.view.camera.position.set(0, 4.4, 9.5)
    this.view.camera.lookAt({ x: 0, y: 1.0, z: -0.6 })
  }

  private setupRing(): void {
    this.ring = new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.55, radiusBottom: 0.55, height: 0.03 }),
      material: matte('#f2c14e'),
      castShadow: false,
      receiveShadow: false
    })
    this.ring.visible = false
    this.view.root.addChild(this.ring)
  }

  // -------------------------------------------------------------------------
  // 房屋（半开间）：后墙 + 两山墙 + 地板 + 檐口 / 踢脚线
  // -------------------------------------------------------------------------

  private rebuildHouse(): void {
    const rooms = state.rooms
    const W = M.houseWidth(rooms)
    const x0 = M.houseX0(rooms)
    const x1 = M.houseX1(rooms)
    const D = M.DEPTH
    const H = M.WALL_H

    // 网格实例常驻场景，扩建只替换几何体与位置，避免卸载/重建导致渲染批次状态失效
    if (!this.hFloor) {
      this.hFloor = new Mesh3D({ material: this.floorMatte, castShadow: false, receiveShadow: true })
      this.hBack = new Mesh3D({ material: this.wallMatte, castShadow: false, receiveShadow: true })
      this.hLeft = new Mesh3D({ material: this.wallMatte, castShadow: false, receiveShadow: true })
      this.hRight = new Mesh3D({ material: this.wallMatte, castShadow: false, receiveShadow: true })
      this.hCornice = new Mesh3D({ material: this.trimMatte, castShadow: false })
      this.hSkirt = new Mesh3D({ material: this.trimMatte, castShadow: false })
      this.houseGroup.addChild(this.hFloor, this.hBack, this.hLeft, this.hRight, this.hCornice, this.hSkirt)

      // 后墙大窗：木框背板 + 半透明玻璃 + 中竖梃
      this.hWinFrame = new Mesh3D({ material: this.trimMatte, castShadow: false, receiveShadow: true })
      this.hWinPane = new Mesh3D({ material: glass(), castShadow: false, receiveShadow: false })
      this.hMullion = new Mesh3D({ material: this.trimMatte, castShadow: false })
      this.houseGroup.addChild(this.hWinFrame, this.hWinPane, this.hMullion)

      // 二层：悬挑楼板 + 前缘栏杆 + 楼梯
      this.hSlab = new Mesh3D({ material: this.floorMatte, castShadow: true, receiveShadow: true })
      this.hRail = new Mesh3D({ material: this.trimMatte, castShadow: false })
      this.hStair = new Mesh3D({ material: this.trimMatte, castShadow: true, receiveShadow: true })
      this.loftGroup.addChild(this.hSlab, this.hRail, this.hStair)
    }

    this.hFloor.geometry = new CubeGeometry({ width: W, height: 0.12, depth: D })
    // 顶面对齐 y = 0，使家具与地毯正好落在地板面上
    this.hFloor.position.set(0, -0.06, -D / 2)

    this.hBack.geometry = new CubeGeometry({ width: W, height: H, depth: 0.12 })
    this.hBack.position.set(0, H / 2, -D - 0.06)

    this.hLeft.geometry = new CubeGeometry({ width: 0.12, height: H, depth: D })
    this.hLeft.position.set(x0 - 0.06, H / 2, -D / 2)

    this.hRight.geometry = new CubeGeometry({ width: 0.12, height: H, depth: D })
    this.hRight.position.set(x1 + 0.06, H / 2, -D / 2)

    this.hCornice.geometry = new CubeGeometry({ width: W + 0.24, height: 0.18, depth: 0.26 })
    this.hCornice.position.set(0, H + 0.06, -D + 0.04)

    this.hSkirt.geometry = new CubeGeometry({ width: W, height: 0.14, depth: 0.08 })
    this.hSkirt.position.set(0, 0.07, -D + 0.05)

    // ---- 后墙大窗 ----
    const winW = W * 0.72
    const winH = 1.5
    const winY = 1.85
    this.hWinFrame.geometry = new CubeGeometry({ width: winW + 0.18, height: winH + 0.18, depth: 0.05 })
    this.hWinFrame.position.set(0, winY, -D + 0.005)
    this.hWinPane.geometry = new CubeGeometry({ width: winW, height: winH, depth: 0.04 })
    this.hWinPane.position.set(0, winY, -D + 0.03)
    this.hMullion.geometry = new CubeGeometry({ width: 0.08, height: winH, depth: 0.05 })
    this.hMullion.position.set(0, winY, -D + 0.04)

    // ---- 二层悬挑平台 + 栏杆 + 楼梯 ----
    const SLAB_TOP = 2.6
    const SLAB_THICK = 0.16
    const SLAB_DEPTH = D * 0.55
    const zf = -D + SLAB_DEPTH
    this.hSlab.geometry = new CubeGeometry({ width: W, height: SLAB_THICK, depth: SLAB_DEPTH })
    this.hSlab.position.set(0, SLAB_TOP - SLAB_THICK / 2, -D + SLAB_DEPTH / 2)
    this.hRail.geometry = new CubeGeometry({ width: W, height: 0.08, depth: 0.08 })
    this.hRail.position.set(0, SLAB_TOP + 0.72, zf + 0.04)

    const run = 0.3 - zf
    const rise = SLAB_TOP
    const len = Math.sqrt(run * run + rise * rise)
    this.hStair.geometry = new CubeGeometry({ width: 0.95, height: 0.08, depth: len })
    this.hStair.position.set(x0 + 1.05, rise / 2, (0.3 + zf) / 2)
    this.hStair.rotation.x = -Math.atan2(rise, run)
  }

  // -------------------------------------------------------------------------
  // 物件同步
  // -------------------------------------------------------------------------

  private attachItemEvents(node: Container3D, id: string, def: ItemDef): void {
    node.eventMode = 'static'
    node.cursor = 'pointer'
    // 拾取列表只收录 interactive 节点；容器自身无几何命中体，
    // 需把内部子网格也置为 static，射线命中子网格后事件再冒泡到容器。
    node.traverse(child => {
      if (child instanceof Mesh3D) child.eventMode = 'static'
    })
    // 小部件（花枝、凳腿等）命中体过窄，补一块接地透明代理，方便点选。
    if (!def.wallMounted) {
      const r = Math.max(def.footprint.w, def.footprint.d) * 0.5 * 0.8
      const proxy = new Mesh3D({
        geometry: new CylinderGeometry({ radiusTop: r, radiusBottom: r, height: 0.1, radialSegments: 14 }),
        material: invisible(),
        position: { x: 0, y: 0.05, z: 0 },
        castShadow: false,
        receiveShadow: false
      })
      proxy.eventMode = 'static'
      node.addChild(proxy)
    }
    node.on('pointerdown', (e: Pointer3DEvent) => this.onItemDown(e, id, node))
  }

  private syncItems(): void {
    for (const [id, node] of this.nodeMap) {
      if (!state.placed.find(p => p.id === id)) {
        this.itemsGroup.removeChild(node)
        this.nodeMap.delete(id)
      }
    }
    for (const p of state.placed) {
      const def = defById(p.defId)
      let node = this.nodeMap.get(p.id)
      if (!node) {
        node = buildItem(p.defId, p.variant, def.variants)
        this.attachItemEvents(node, p.id, def)
        this.itemsGroup.addChild(node)
        this.nodeMap.set(p.id, node)
      }
      if (def.wallMounted) {
        node.position.set(p.x, 1.75, -M.DEPTH + 0.1)
      } else {
        node.position.set(p.x, 0, p.z)
      }
      node.rotation.y = p.rotY
    }
    this.updateRing()
  }

  private updateRing(): void {
    const p = state.placed.find(i => i.id === state.selectedId)
    if (!p) { this.ring.visible = false; return }
    const def = defById(p.defId)
    const r = Math.max(def.footprint.w, def.footprint.d) * 0.55
    this.ring.scale.set(r / 0.55, 1, r / 0.55)
    this.ring.position.set(p.x, 0.02, p.z)
    this.ring.visible = true
  }

  // -------------------------------------------------------------------------
  // 摆放校验
  // -------------------------------------------------------------------------

  private canPlace(defId: string, x: number, z: number): boolean {
    const def = defById(defId)
    if (def.layer === 'indoor') {
      const b = M.indoorBounds(state.rooms)
      return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1
    }
    const b = M.outdoorBounds(state.yard)
    return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && !M.insideHouse(x, z, state.rooms)
  }

  private clampToLayer(defId: string, v: Vector3): void {
    const def = defById(defId)
    if (def.layer === 'indoor') {
      const b = M.indoorBounds(state.rooms)
      v.x = Math.min(b.x1, Math.max(b.x0, v.x))
      v.z = Math.min(b.z1, Math.max(b.z0, v.z))
    } else {
      const b = M.outdoorBounds(state.yard)
      v.x = Math.min(b.x1, Math.max(b.x0, v.x))
      v.z = Math.min(b.z1, Math.max(b.z0, v.z))
      if (M.insideHouse(v.x, v.z, state.rooms)) v.z = 0.4
    }
  }

  // -------------------------------------------------------------------------
  // 拾取 / 拖拽 / 放置
  // -------------------------------------------------------------------------

  private setupPicking(): void {
    this.view.on('pointermove', (e: Pointer3DEvent) => {
      if (state.placingDef) this.updateGhost(e)
    })

    this.view.on('pointerdown', (e: Pointer3DEvent) => {
      if (e.button !== 0) return
      if (state.placingDef) {
        this.placeFromGhost(e)
        return
      }
      if (!e.target3D) selectItem(null)
    })
  }

  private updateGhost(e: Pointer3DEvent): void {
    const defId = state.placingDef!
    if (!this.ghost) {
      const def = defById(defId)
      this.ghost = buildItem(defId, 0, def.variants)
      this.itemsGroup.addChild(this.ghost)
    }
    const hit = this.view.screenToWorld(e.global, this.groundPlane, this.out)
    if (!hit) { this.ghost.visible = false; return }
    const valid = this.canPlace(defId, hit.x, hit.z)
    this.ghost.visible = valid
    if (valid) this.ghost.position.set(hit.x, 0, hit.z)
  }

  private placeFromGhost(e: Pointer3DEvent): void {
    const defId = state.placingDef!
    const hit = this.view.screenToWorld(e.global, this.groundPlane, this.out)
    if (!hit || !this.canPlace(defId, hit.x, hit.z)) return
    const def = defById(defId)
    if (addItem(def, hit.x, hit.z, 0)) {
      this.syncItems()
      // 摆放一件后退出连续摆放模式
      state.placingDef = null
      if (this.ghost) {
        this.itemsGroup.removeChild(this.ghost)
        this.ghost = null
      }
    }
  }

  private onItemDown(e: Pointer3DEvent, id: string, node: Container3D): void {
    if (e.button !== 0) return
    e.stopPropagation()
    selectItem(id)
    this.updateRing()

    const def = defById(state.placed.find(p => p.id === id)!.defId)
    this.dragPlane.setFromNormalAndCoplanarPoint({ x: 0, y: 1, z: 0 }, e.hit3D!.point)
    this.grabOffset.copyFrom(e.hit3D!.point).subtract(node.position)

    const move = (ev: Pointer3DEvent): void => {
      const hit = this.view.screenToWorld(ev.global, this.dragPlane, this.out)
      if (!hit) return
      hit.subtract(this.grabOffset)
      this.clampToLayer(def.id, hit)
      node.position.x = hit.x
      node.position.z = hit.z
      moveItem(id, hit.x, hit.z)
      this.updateRing()
    }
    const end = (): void => {
      node.off('globalpointermove', move)
      node.off('pointerup', end)
      node.off('pointerupoutside', end)
    }
    node.on('globalpointermove', move)
    node.on('pointerup', end)
    node.on('pointerupoutside', end)
  }

  // -------------------------------------------------------------------------
  // 外部动作（供 Vue 面板调用）
  // -------------------------------------------------------------------------

  startPlacing(defId: string): void {
    state.placingDef = defId
    if (this.ghost) {
      this.itemsGroup.removeChild(this.ghost)
      this.ghost = null
    }
  }

  cancelPlacing(): void {
    state.placingDef = null
    if (this.ghost) {
      this.itemsGroup.removeChild(this.ghost)
      this.ghost = null
    }
  }

  rotateSelected(): void {
    if (state.selectedId) {
      rotateItem(state.selectedId)
      this.syncItems()
    }
  }

  removeSelected(): void {
    if (state.selectedId) {
      removeItem(state.selectedId)
      this.syncItems()
    }
  }

  doExpandRoom(): void {
    if (expandRoom()) {
      this.rebuildHouse()
      this.clampIndoor()
      this.syncItems()
    }
  }

  doExpandYard(): void {
    if (expandYard()) this.syncItems()
  }

  private clampIndoor(): void {
    for (const p of state.placed) {
      const def = defById(p.defId)
      if (def.layer !== 'indoor') continue
      const b = M.indoorBounds(state.rooms)
      p.x = Math.min(b.x1, Math.max(b.x0, p.x))
      p.z = Math.min(b.z1, Math.max(b.z0, p.z))
    }
  }

  destroy(): void {
    try {
      this.app.destroy(true, { children: true })
    } catch {
      // HMR 卸载时 WebGPU/WebGL buffer 池可能已释放，忽略销毁期异常
    }
  }
}
