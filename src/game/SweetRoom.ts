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

  // 环绕相机状态（球坐标，自驱动，不挂 OrbitCamera）
  private camTarget = new Vector3(0, 1.0, -0.6)
  private camAzimuth = 0
  private camPolar = 1.246
  private camRadius = 10.66
  private camDragging = false
  private camLastX = 0
  private camLastY = 0

  // 现代白盒别墅配色：暖白墙体、白色挑檐/阳台、深灰窗框、浅灰白踏步
  private wallMatte = matte('#f2efe9')
  private floorMatte = matte('#c99a6b')
  private slabMatte = matte('#ece9e2')
  private frameMatte = matte('#3c434d')
  private stairMatte = matte('#e7e2d8')

  private hFloor!: Mesh3D
  private hBack!: Mesh3D
  private hLeft!: Mesh3D
  private hRight!: Mesh3D
  private hRoof!: Mesh3D
  private hSkirt!: Mesh3D
  private hAnnex!: Mesh3D
  // 后墙玻璃幕墙：大玻璃 + 竖梃阵列 + 一道横梃
  private hWinPane!: Mesh3D
  private hMullions: Mesh3D[] = []
  private hMullionH!: Mesh3D
  // 二层悬挑阳台：楼板 + 前缘封边 + 玻璃栏板 + 扶手 + 立柱 + 楼梯
  private loftGroup!: Container3D
  private hSlab!: Mesh3D
  private hSlabBeam!: Mesh3D
  private hRail!: Mesh3D
  private hRailGlass!: Mesh3D
  private hRailPost: Mesh3D[] = []
  private hStair!: Mesh3D
  private treads: Mesh3D[] = []

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
    this.applyCamera()
  }

  private applyCamera(): void {
    const h = this.camRadius * Math.sin(this.camPolar)
    this.view.camera.position.set(
      this.camTarget.x + h * Math.sin(this.camAzimuth),
      this.camTarget.y + this.camRadius * Math.cos(this.camPolar),
      this.camTarget.z + h * Math.cos(this.camAzimuth)
    )
    this.view.camera.lookAt(this.camTarget)
  }

  private clampCamera(): void {
    this.camAzimuth = Math.min(0.9, Math.max(-0.9, this.camAzimuth))
    this.camPolar = Math.min(1.35, Math.max(0.55, this.camPolar))
    this.camRadius = Math.min(14, Math.max(7.5, this.camRadius))
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
      this.hRoof = new Mesh3D({ material: this.slabMatte, castShadow: false, receiveShadow: true })
      this.hSkirt = new Mesh3D({ material: this.slabMatte, castShadow: false })
      this.hAnnex = new Mesh3D({ material: this.wallMatte, castShadow: false, receiveShadow: true })
      this.houseGroup.addChild(this.hFloor, this.hBack, this.hLeft, this.hRight, this.hRoof, this.hSkirt, this.hAnnex)

      // 后墙玻璃幕墙：整面玻璃 + 深灰竖梃阵列 + 一道横梃
      this.hWinPane = new Mesh3D({ material: glass(), castShadow: false, receiveShadow: false })
      this.hMullionH = new Mesh3D({ material: this.frameMatte, castShadow: false })
      this.houseGroup.addChild(this.hWinPane, this.hMullionH)
      for (let i = 0; i < 5; i++) {
        const m = new Mesh3D({ material: this.frameMatte, castShadow: false })
        this.hMullions.push(m)
        this.houseGroup.addChild(m)
      }

      // 二层悬挑阳台：白色楼板 + 前缘封边 + 玻璃栏板 + 扶手 + 立柱 + 楼梯
      this.hSlab = new Mesh3D({ material: this.slabMatte, castShadow: true, receiveShadow: true })
      this.hSlabBeam = new Mesh3D({ material: this.slabMatte, castShadow: true })
      this.hRail = new Mesh3D({ material: this.frameMatte, castShadow: false })
      this.hRailGlass = new Mesh3D({ material: glass(), castShadow: false, receiveShadow: false })
      this.hStair = new Mesh3D({ material: this.stairMatte, castShadow: true, receiveShadow: true })
      this.loftGroup.addChild(this.hSlab, this.hSlabBeam, this.hRail, this.hRailGlass, this.hStair)

      for (let i = 0; i < 4; i++) {
        const post = new Mesh3D({ material: this.frameMatte, castShadow: false })
        this.hRailPost.push(post)
        this.loftGroup.addChild(post)
      }
      for (let i = 0; i < 8; i++) {
        const tread = new Mesh3D({ material: this.stairMatte, castShadow: true, receiveShadow: true })
        this.treads.push(tread)
        this.loftGroup.addChild(tread)
      }
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

    // 顶部贯通平直大挑檐，四周挑出墙面（参考图现代白盒檐口）
    this.hRoof.geometry = new CubeGeometry({ width: W + 0.5, height: 0.14, depth: D + 0.4 })
    this.hRoof.position.set(0, H + 0.07, -D / 2)

    this.hSkirt.geometry = new CubeGeometry({ width: W, height: 0.12, depth: 0.08 })
    this.hSkirt.position.set(0, 0.06, -D + 0.05)

    // 左侧错动体块：比主体低矮的凸出白盒，呼应参考图左侧体量
    const annexW = 1.5
    const annexD = D * 0.55
    this.hAnnex.geometry = new CubeGeometry({ width: annexW, height: 2.2, depth: annexD })
    this.hAnnex.position.set(x0 - annexW / 2 + 0.12, 1.1, -D + annexD / 2)

    // ---- 后墙整面玻璃幕墙（深灰分格） ----
    const SLAB_TOP = 2.6
    const winW = W * 0.88
    const winBottom = 0.35
    const winTop = H - 0.3
    const winH = winTop - winBottom
    const winY = (winBottom + winTop) / 2
    this.hWinPane.geometry = new CubeGeometry({ width: winW, height: winH, depth: 0.04 })
    this.hWinPane.position.set(0, winY, -D + 0.03)

    // 二层标高处一道横梃，分隔上下两层玻璃
    this.hMullionH.geometry = new CubeGeometry({ width: winW, height: 0.07, depth: 0.05 })
    this.hMullionH.position.set(0, SLAB_TOP, -D + 0.045)

    // 竖梃沿幕墙宽等分
    this.hMullions.forEach((m, i) => {
      const xi = -winW / 2 + (winW * i) / (this.hMullions.length - 1)
      m.geometry = new CubeGeometry({ width: 0.07, height: winH, depth: 0.05 })
      m.position.set(xi, winY, -D + 0.045)
    })

    // ---- 二层悬挑白色阳台 + 玻璃栏板 ----
    const SLAB_THICK = 0.16
    const SLAB_DEPTH = D * 0.55
    const zf = -D + SLAB_DEPTH
    this.hSlab.geometry = new CubeGeometry({ width: W, height: SLAB_THICK, depth: SLAB_DEPTH })
    this.hSlab.position.set(0, SLAB_TOP - SLAB_THICK / 2, -D + SLAB_DEPTH / 2)

    // 前缘白色封边板
    this.hSlabBeam.geometry = new CubeGeometry({ width: W, height: 0.18, depth: 0.16 })
    this.hSlabBeam.position.set(0, SLAB_TOP - 0.09, zf + 0.05)

    // 玻璃栏板 + 顶部深灰扶手
    this.hRailGlass.geometry = new CubeGeometry({ width: W, height: 0.62, depth: 0.03 })
    this.hRailGlass.position.set(0, SLAB_TOP + 0.31, zf + 0.04)
    this.hRail.geometry = new CubeGeometry({ width: W, height: 0.07, depth: 0.07 })
    this.hRail.position.set(0, SLAB_TOP + 0.65, zf + 0.04)

    // 栏杆立柱：两端与内部分布，沿板宽均分
    const postXs = [x0 + 0.18, -W / 6, W / 6, x1 - 0.18]
    this.hRailPost.forEach((post, i) => {
      post.geometry = new CubeGeometry({ width: 0.06, height: 0.65, depth: 0.06 })
      post.position.set(postXs[i], SLAB_TOP + 0.325, zf + 0.04)
    })

    // 楼梯：斜托板 + 8 级水平踏步，贴左墙落地升至二层前缘
    const stairX = x0 + 0.72
    const zStart = 0.35
    const zEnd = zf
    const run = zStart - zEnd
    const rise = SLAB_TOP
    const len = Math.sqrt(run * run + rise * rise)
    this.hStair.geometry = new CubeGeometry({ width: 0.85, height: 0.06, depth: len })
    this.hStair.position.set(stairX, rise / 2, (zStart + zEnd) / 2)
    this.hStair.rotation.x = -Math.atan2(rise, run)

    const STEPS = 8
    const stepD = run / STEPS
    const stepH = rise / STEPS
    this.treads.forEach((tread, i) => {
      tread.geometry = new CubeGeometry({ width: 0.85, height: 0.1, depth: stepD * 1.12 })
      tread.position.set(stairX, (i + 1) * stepH - 0.05, zStart - (i + 0.5) * stepD)
    })
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
      // 点中物件时由物件自身的拖拽逻辑处理；空地左键拖拽用于环绕视角
      if (!e.target3D) {
        selectItem(null)
        this.camDragging = true
        this.camLastX = e.global.x
        this.camLastY = e.global.y
      }
    })

    this.view.on('globalpointermove', (e: Pointer3DEvent) => {
      if (!this.camDragging) return
      const dx = e.global.x - this.camLastX
      const dy = e.global.y - this.camLastY
      this.camLastX = e.global.x
      this.camLastY = e.global.y
      this.camAzimuth -= dx * 0.005
      this.camPolar -= dy * 0.005
      this.clampCamera()
      this.applyCamera()
    })

    const endCam = () => { this.camDragging = false }
    this.view.on('pointerup', endCam)
    this.view.on('pointerupoutside', endCam)

    this.app.canvas.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private onWheel = (ev: WheelEvent): void => {
    ev.preventDefault()
    this.camRadius += ev.deltaY * 0.01
    this.clampCamera()
    this.applyCamera()
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
      this.app.canvas.removeEventListener('wheel', this.onWheel)
      this.app.destroy(true, { children: true })
    } catch {
      // HMR 卸载时 WebGPU/WebGL buffer 池可能已释放，忽略销毁期异常
    }
  }
}
