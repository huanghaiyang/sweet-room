import {
  Container3D, Mesh3D,
  CubeGeometry, SphereGeometry, CylinderGeometry, ConeGeometry
} from '@pixi/3d'
import { toon, glow, matte } from './materials'

// ---------------------------------------------------------------------------
// 积木 helper：所有物件以底中心为原点、Y-up 立在 y = 0
// ---------------------------------------------------------------------------

interface Place { x?: number; y?: number; z?: number }

function box(w: number, h: number, d: number, color: string | number, place: Place = {}, opts: { cast?: boolean; outline?: boolean; mat?: 'toon' | 'matte' } = {}): Mesh3D {
  const mesh = new Mesh3D({
    geometry: new CubeGeometry({ width: w, height: h, depth: d }),
    material: opts.mat === 'matte' ? matte(color) : toon(color, { outline: opts.outline ?? true }),
    castShadow: opts.cast ?? true,
    receiveShadow: true
  })
  mesh.position.set(place.x ?? 0, place.y ?? 0, place.z ?? 0)
  return mesh
}

function sphere(r: number, color: string | number, place: Place = {}, opts: { cast?: boolean; outline?: boolean; segments?: number } = {}): Mesh3D {
  const mesh = new Mesh3D({
    geometry: new SphereGeometry({ radius: r, widthSegments: 20, heightSegments: 14 }),
    material: toon(color, { outline: opts.outline ?? true }),
    castShadow: opts.cast ?? true,
    receiveShadow: true
  })
  mesh.position.set(place.x ?? 0, place.y ?? 0, place.z ?? 0)
  return mesh
}

function cyl(rt: number, rb: number, h: number, color: string | number, place: Place = {}, opts: { cast?: boolean; outline?: boolean; glow?: boolean } = {}): Mesh3D {
  const mesh = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: rt, radiusBottom: rb, height: h, radialSegments: 18 }),
    material: opts.glow ? glow(color) : toon(color, { outline: opts.outline ?? true }),
    castShadow: opts.cast ?? true,
    receiveShadow: true
  })
  mesh.position.set(place.x ?? 0, place.y ?? 0, place.z ?? 0)
  return mesh
}

function cone(r: number, h: number, color: string | number, place: Place = {}, opts: { cast?: boolean; outline?: boolean } = {}): Mesh3D {
  const mesh = new Mesh3D({
    geometry: new ConeGeometry({ radius: r, height: h, radialSegments: 20 }),
    material: toon(color, { outline: opts.outline ?? true }),
    castShadow: opts.cast ?? true,
    receiveShadow: true
  })
  mesh.position.set(place.x ?? 0, place.y ?? 0, place.z ?? 0)
  return mesh
}

const WOOD = '#8a5a3b'
const WOOD_L = '#c98d5e'
const WOOD_D = '#6f4630'
const CREAM = '#f7f1e6'
const GREEN = '#6fa05a'
const GREEN_D = '#4f7d43'
const STONE = '#9a938a'
const GOLD = '#e6b85c'
const BOOKS = ['#d96c6c', '#e8b04b', '#6fa05a', '#6f8fc9', '#b576b0']

function chair(parent: Container3D, x: number, z: number, fabric: string, rotY = 0) {
  const c = new Container3D()
  c.position.set(x, 0, z)
  c.rotation.y = rotY
  c.addChild(box(0.4, 0.06, 0.4, WOOD_L, { y: 0.42 }))
  c.addChild(box(0.4, 0.45, 0.06, fabric, { y: 0.68, z: -0.18 }))
  for (const sx of [-0.16, 0.16]) for (const sz of [-0.16, 0.16]) {
    c.addChild(cyl(0.025, 0.025, 0.42, WOOD_D, { x: sx, y: 0.21, z: sz }))
  }
  parent.addChild(c)
}

// ---------------------------------------------------------------------------
// 各物件构建：返回以底中心为原点的容器
// ---------------------------------------------------------------------------

function buildSofa(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(2.0, 0.35, 0.85, WOOD, { y: 0.18 }))
  g.addChild(box(1.9, 0.18, 0.7, v, { y: 0.45 }))
  g.addChild(box(2.0, 0.55, 0.18, v, { y: 0.66, z: -0.36 }))
  g.addChild(box(0.18, 0.45, 0.85, v, { x: -0.91, y: 0.5 }))
  g.addChild(box(0.18, 0.45, 0.85, v, { x: 0.91, y: 0.5 }))
  g.addChild(box(0.55, 0.3, 0.12, CREAM, { x: -0.45, y: 0.7, z: -0.28 }))
  g.addChild(box(0.55, 0.3, 0.12, CREAM, { x: 0.45, y: 0.7, z: -0.28 }))
  return g
}

function buildArmchair(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.8, 0.3, 0.75, WOOD, { y: 0.15 }))
  g.addChild(box(0.7, 0.16, 0.6, v, { y: 0.38 }))
  g.addChild(box(0.8, 0.5, 0.16, v, { y: 0.6, z: -0.3 }))
  g.addChild(box(0.14, 0.4, 0.75, v, { x: -0.33, y: 0.42 }))
  g.addChild(box(0.14, 0.4, 0.75, v, { x: 0.33, y: 0.42 }))
  return g
}

function buildCoffeeTable(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.15, 0.08, 0.6, v, { y: 0.42 }))
  g.addChild(box(0.9, 0.05, 0.45, WOOD_D, { y: 0.18 }))
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.23, 0.23]) {
    g.addChild(cyl(0.04, 0.04, 0.42, WOOD_D, { x: sx, y: 0.21, z: sz }))
  }
  return g
}

function buildDiningTable(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.6, 0.09, 1.0, v, { y: 0.72 }))
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) {
    g.addChild(cyl(0.05, 0.05, 0.72, WOOD_D, { x: sx, y: 0.36, z: sz }))
  }
  chair(g, -1.1, 0, v, Math.PI / 2)
  chair(g, 1.1, 0, v, -Math.PI / 2)
  return g
}

function buildBed(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.7, 0.25, 2.1, WOOD, { y: 0.13 }))
  g.addChild(box(1.6, 0.22, 1.95, CREAM, { y: 0.36 }))
  g.addChild(box(1.6, 0.16, 1.2, v, { y: 0.52, z: 0.35 }))
  g.addChild(box(1.7, 0.8, 0.12, WOOD, { y: 0.55, z: -0.98 }))
  g.addChild(box(0.6, 0.14, 0.35, CREAM, { x: -0.4, y: 0.55, z: -0.7 }))
  g.addChild(box(0.6, 0.14, 0.35, CREAM, { x: 0.4, y: 0.55, z: -0.7 }))
  return g
}

function buildNightstand(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.55, 0.5, 0.45, v, { y: 0.25 }))
  g.addChild(box(0.45, 0.18, 0.03, WOOD_L, { y: 0.35, z: 0.235 }))
  g.addChild(sphere(0.03, GOLD, { y: 0.35, z: 0.26 }))
  return g
}

function buildWardrobe(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.35, 1.9, 0.6, v, { y: 0.95 }))
  g.addChild(box(0.02, 1.7, 0.02, WOOD_D, { y: 0.95, z: 0.31 }))
  g.addChild(cyl(0.02, 0.02, 0.3, GOLD, { x: -0.12, y: 0.95, z: 0.32 }))
  g.addChild(cyl(0.02, 0.02, 0.3, GOLD, { x: 0.12, y: 0.95, z: 0.32 }))
  g.addChild(box(1.45, 0.1, 0.68, WOOD_D, { y: 1.93 }))
  return g
}

function buildBookshelf(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.08, 1.7, 0.4, v, { x: -0.56, y: 0.85 }))
  g.addChild(box(0.08, 1.7, 0.4, v, { x: 0.56, y: 0.85 }))
  g.addChild(box(1.12, 1.7, 0.04, WOOD_D, { y: 0.85, z: -0.18 }))
  const shelves = [0.35, 0.75, 1.15, 1.55]
  shelves.forEach((sy, si) => {
    g.addChild(box(1.12, 0.05, 0.36, WOOD_L, { y: sy }))
    for (let i = 0; i < 4; i++) {
      const bh = 0.22 + ((si + i) % 3) * 0.05
      g.addChild(box(0.12, bh, 0.24, BOOKS[(si + i) % BOOKS.length], {
        x: -0.4 + i * 0.24, y: sy + 0.03 + bh / 2, z: 0.02
      }))
    }
  })
  return g
}

function buildSideboard(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.5, 0.7, 0.5, v, { y: 0.45 }))
  for (const sx of [-0.65, 0.65]) for (const sz of [-0.18, 0.18]) {
    g.addChild(cyl(0.03, 0.03, 0.18, WOOD_D, { x: sx, y: 0.09, z: sz }))
  }
  for (let i = 0; i < 3; i++) {
    g.addChild(box(0.44, 0.5, 0.03, WOOD_L, { x: -0.48 + i * 0.48, y: 0.45, z: 0.26 }))
  }
  return g
}

function buildTableLamp(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.12, 0.15, 0.05, WOOD_D, { y: 0.025 }))
  g.addChild(cyl(0.02, 0.02, 0.35, GOLD, { y: 0.22 }))
  g.addChild(cone(0.16, 0.22, v, { y: 0.45 }))
  g.addChild(sphere(0.07, '#ffd98a', { y: 0.38 }, { outline: false }))
  return g
}

function buildFloorLamp(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.18, 0.2, 0.05, WOOD_D, { y: 0.025 }))
  g.addChild(cyl(0.025, 0.025, 1.5, GOLD, { y: 0.78 }))
  g.addChild(cone(0.22, 0.3, v, { y: 1.6 }))
  g.addChild(sphere(0.09, '#ffd98a', { y: 1.5 }, { outline: false }))
  return g
}

function buildRug(v: string): Container3D {
  const g = new Container3D()
  const rug = cyl(1.0, 1.0, 0.03, v, { y: 0.015 }, { cast: false, outline: false })
  rug.scale.z = 0.7
  g.addChild(rug)
  const inner = cyl(0.7, 0.7, 0.034, CREAM, { y: 0.018 }, { cast: false, outline: false })
  inner.scale.z = 0.7
  g.addChild(inner)
  // 边缘流苏
  for (let i = -3; i <= 3; i++) {
    g.addChild(box(0.05, 0.012, 0.16, CREAM, { x: i * 0.24, y: 0.012, z: 0.72 }, { cast: false, outline: false }))
  }
  return g
}

function buildPainting(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.95, 0.65, 0.06, WOOD_D, { y: 0 }))
  g.addChild(box(0.83, 0.53, 0.02, v, { y: 0, z: 0.02 }))
  g.addChild(sphere(0.09, '#fff3d6', { x: 0.22, y: 0.12, z: 0.04 }, { outline: false }))
  g.addChild(cone(0.18, 0.22, GREEN, { x: -0.18, y: -0.12, z: 0.04 }, { outline: false }))
  return g
}

function buildFireplace(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.5, 1.2, 0.6, v, { y: 0.6 }))
  g.addChild(box(0.5, 0.8, 0.4, v, { y: 1.6, z: -0.1 }))
  g.addChild(box(0.8, 0.6, 0.12, '#3a2a22', { y: 0.45, z: 0.28 }))
  g.addChild(sphere(0.1, '#ff7a3c', { x: -0.15, y: 0.25, z: 0.25 }, { outline: false }))
  g.addChild(sphere(0.12, '#ff5a2c', { x: 0.1, y: 0.22, z: 0.25 }, { outline: false }))
  g.addChild(box(1.6, 0.12, 0.68, STONE, { y: 1.25 }))
  return g
}

function buildPlantPot(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.18, 0.14, 0.3, '#b5654a', { y: 0.15 }))
  g.addChild(sphere(0.28, v, { y: 0.55 }))
  g.addChild(sphere(0.18, GREEN_D, { x: 0.18, y: 0.45, z: 0.1 }))
  g.addChild(sphere(0.16, GREEN, { x: -0.16, y: 0.47, z: -0.08 }))
  return g
}

function buildFlowers(v: string): Container3D {
  const g = new Container3D()
  const stems: Array<[number, number]> = [[-0.15, 0.05], [0, -0.08], [0.15, 0.05]]
  stems.forEach(([sx, sz], i) => {
    g.addChild(cyl(0.015, 0.015, 0.35, GREEN, { x: sx, y: 0.18, z: sz }, { outline: false }))
    g.addChild(sphere(0.09, v, { x: sx, y: 0.38 + (i % 2) * 0.05, z: sz }))
    g.addChild(sphere(0.04, GOLD, { x: sx, y: 0.39 + (i % 2) * 0.05, z: sz + 0.02 }, { outline: false }))
  })
  return g
}

function buildBush(v: string): Container3D {
  const g = new Container3D()
  g.addChild(sphere(0.45, v, { y: 0.35 }))
  g.addChild(sphere(0.3, v, { x: 0.3, y: 0.28, z: 0.1 }))
  g.addChild(sphere(0.28, GREEN_D, { x: -0.28, y: 0.26, z: -0.08 }))
  return g
}

function buildGrassTuft(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cone(0.08, 0.25, v, { x: -0.08, y: 0.125 }))
  g.addChild(cone(0.09, 0.3, v, { y: 0.15 }))
  g.addChild(cone(0.07, 0.22, GREEN_D, { x: 0.1, y: 0.11 }))
  return g
}

function buildTree(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.08, 0.12, 0.9, WOOD, { y: 0.45 }))
  g.addChild(sphere(0.6, v, { y: 1.2 }))
  g.addChild(sphere(0.4, v, { x: 0.35, y: 1.0, z: 0.15 }))
  g.addChild(sphere(0.36, GREEN_D, { x: -0.3, y: 1.05, z: -0.12 }))
  return g
}

function buildBigTree(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.14, 0.2, 1.6, WOOD_D, { y: 0.8 }))
  g.addChild(sphere(1.0, v, { y: 2.1 }))
  g.addChild(sphere(0.65, v, { x: 0.6, y: 1.8, z: 0.25 }))
  g.addChild(sphere(0.6, GREEN_D, { x: -0.55, y: 1.85, z: -0.2 }))
  return g
}

function buildFence(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.1, 0.7, 0.1, v, { x: -0.75, y: 0.35 }))
  g.addChild(box(0.1, 0.7, 0.1, v, { x: 0.75, y: 0.35 }))
  g.addChild(box(1.6, 0.08, 0.05, WOOD_L, { y: 0.3 }))
  g.addChild(box(1.6, 0.08, 0.05, WOOD_L, { y: 0.55 }))
  return g
}

function buildPatioSet(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.5, 0.5, 0.06, v, { y: 0.72 }))
  g.addChild(cyl(0.06, 0.06, 0.72, WOOD_D, { y: 0.36 }))
  g.addChild(cyl(0.3, 0.34, 0.05, STONE, { y: 0.025 }))
  chair(g, -1.0, 0.3, v, Math.PI / 2)
  chair(g, 1.0, 0.3, v, -Math.PI / 2)
  chair(g, 0, -0.9, v, Math.PI)
  return g
}

function buildStoneLantern(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.25, 0.28, 0.12, v, { y: 0.06 }))
  g.addChild(cyl(0.1, 0.12, 0.5, v, { y: 0.37 }))
  g.addChild(box(0.4, 0.3, 0.4, v, { y: 0.7 }))
  g.addChild(box(0.2, 0.18, 0.04, '#ffd98a', { y: 0.7, z: 0.21 }, { cast: false, outline: false }))
  g.addChild(cone(0.32, 0.25, v, { y: 0.95 }))
  g.addChild(sphere(0.08, v, { y: 1.1 }))
  return g
}

function buildSteppingStone(v: string): Container3D {
  const g = new Container3D()
  const pts: Array<[number, number]> = [[-0.4, -0.2], [0, 0.05], [0.4, 0.25]]
  pts.forEach(([px, pz], i) => {
    const s = cyl(0.28 - i * 0.02, 0.28 - i * 0.02, 0.05, v, { x: px, y: 0.025, z: pz }, { cast: false })
    g.addChild(s)
  })
  return g
}

function buildParasol(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.3, 0.34, 0.06, STONE, { y: 0.03 }))
  g.addChild(cyl(0.03, 0.03, 2.0, WOOD, { y: 1.0 }))
  g.addChild(cone(1.0, 0.5, v, { y: 2.05 }))
  g.addChild(sphere(0.06, WOOD_D, { y: 2.35 }))
  return g
}

// ---------------------------------------------------------------------------
// 扩充摆件
// ---------------------------------------------------------------------------

function buildLoveseat(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.4, 0.35, 0.85, WOOD, { y: 0.18 }))
  g.addChild(box(1.3, 0.18, 0.7, v, { y: 0.45 }))
  g.addChild(box(1.4, 0.55, 0.18, v, { y: 0.66, z: -0.36 }))
  g.addChild(box(0.16, 0.45, 0.85, v, { x: -0.59, y: 0.5 }))
  g.addChild(box(0.16, 0.45, 0.85, v, { x: 0.59, y: 0.5 }))
  return g
}

function buildRecliner(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.4, 0.3, 0.75, WOOD, { y: 0.15 }))
  g.addChild(box(1.3, 0.16, 0.65, v, { y: 0.36 }))
  g.addChild(box(0.16, 0.4, 0.75, v, { x: -0.62, y: 0.4 }))
  g.addChild(box(1.0, 0.16, 0.45, v, { y: 0.3, z: 0.5 }))
  g.addChild(box(1.3, 0.5, 0.16, v, { y: 0.6, z: -0.3 }))
  return g
}

function buildOfficeChair(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.22, 0.22, 0.05, WOOD_D, { y: 0.025 }))
  g.addChild(cyl(0.03, 0.03, 0.45, WOOD_D, { y: 0.25 }))
  g.addChild(box(0.42, 0.08, 0.42, v, { y: 0.48 }))
  g.addChild(box(0.42, 0.5, 0.08, v, { y: 0.75, z: -0.18 }))
  return g
}

function buildSideTable(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.28, 0.28, 0.06, WOOD_L, { y: 0.5 }))
  g.addChild(cyl(0.04, 0.04, 0.5, v, { y: 0.25 }))
  g.addChild(cyl(0.22, 0.22, 0.05, WOOD_D, { y: 0.025 }))
  return g
}

function buildDesk(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.5, 0.08, 0.7, v, { y: 0.75 }))
  g.addChild(box(0.4, 0.7, 0.6, WOOD_D, { x: -0.55, y: 0.36 }))
  g.addChild(box(0.4, 0.7, 0.6, WOOD_D, { x: 0.55, y: 0.36 }))
  g.addChild(box(0.3, 0.16, 0.2, CREAM, { x: 0.3, y: 0.83, z: -0.1 }))
  return g
}

function buildTvStand(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.6, 0.45, 0.45, v, { y: 0.25 }))
  for (const sx of [-0.7, 0.7]) g.addChild(cyl(0.03, 0.03, 0.15, WOOD_D, { x: sx, y: 0.075 }))
  g.addChild(box(1.1, 0.65, 0.06, '#2a2a2a', { y: 0.85, z: 0.05 }))
  g.addChild(box(0.2, 0.1, 0.1, '#3a3230', { x: -0.5, y: 0.5, z: 0.2 }))
  return g
}

function buildDresser(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.1, 0.7, 0.5, v, { y: 0.35 }))
  for (let i = 0; i < 3; i++) {
    g.addChild(box(0.3, 0.18, 0.03, WOOD_L, { x: -0.35 + i * 0.35, y: 0.4, z: 0.26 }))
  }
  g.addChild(box(0.7, 0.8, 0.05, '#cfd8dc', { y: 1.15, z: -0.18 }))
  g.addChild(box(0.78, 0.88, 0.04, WOOD_D, { y: 1.15, z: -0.2 }))
  return g
}

function buildShelf(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.06, 1.6, 0.35, v, { x: -0.47, y: 0.8 }))
  g.addChild(box(0.06, 1.6, 0.35, v, { x: 0.47, y: 0.8 }))
  const shelves = [0.3, 0.7, 1.1, 1.5]
  shelves.forEach((sy, si) => {
    g.addChild(box(1.0, 0.05, 0.32, WOOD_L, { y: sy }))
    for (let i = 0; i < 3; i++) {
      g.addChild(box(0.12, 0.2 + ((si + i) % 2) * 0.06, 0.22, BOOKS[(si + i) % BOOKS.length], {
        x: -0.3 + i * 0.28, y: sy + 0.03 + 0.1, z: 0.02
      }))
    }
  })
  return g
}

function buildSingleBed(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.0, 0.25, 1.9, WOOD, { y: 0.13 }))
  g.addChild(box(0.9, 0.2, 1.75, CREAM, { y: 0.35 }))
  g.addChild(box(0.86, 0.14, 1.1, v, { y: 0.5, z: 0.3 }))
  g.addChild(box(1.0, 0.75, 0.12, WOOD, { y: 0.5, z: -0.88 }))
  g.addChild(box(0.5, 0.13, 0.32, CREAM, { y: 0.52, z: -0.65 }))
  return g
}

function buildWallLamp(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.12, 0.12, 0.05, WOOD_D, { y: 0 }))
  g.addChild(cyl(0.02, 0.02, 0.18, GOLD, { y: 0.05, z: 0.08 }))
  g.addChild(cone(0.14, 0.18, v, { y: 0.16, z: 0.08 }))
  g.addChild(sphere(0.06, '#ffd98a', { y: 0.1, z: 0.08 }, { outline: false }))
  return g
}

function buildRoundRug(v: string): Container3D {
  const g = new Container3D()
  const rug = cyl(0.75, 0.75, 0.03, v, { y: 0.015 }, { cast: false, outline: false })
  g.addChild(rug)
  const inner = cyl(0.5, 0.5, 0.034, CREAM, { y: 0.018 }, { cast: false, outline: false })
  g.addChild(inner)
  return g
}

function buildMirror(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.8, 1.0, 0.06, WOOD_D, { y: 0 }))
  g.addChild(box(0.68, 0.88, 0.02, v, { y: 0, z: 0.02 }))
  return g
}

function buildClock(v: string): Container3D {
  const g = new Container3D()
  const face = cyl(0.22, 0.22, 0.05, CREAM, { y: 0 }, { outline: false })
  face.rotation.x = Math.PI / 2
  g.addChild(face)
  g.addChild(box(0.02, 0.13, 0.02, WOOD_D, { y: 0.03, z: 0.04 }))
  g.addChild(box(0.09, 0.02, 0.02, WOOD_D, { y: -0.02, z: 0.04 }))
  g.addChild(box(0.46, 0.46, 0.03, v, { y: 0, z: -0.01 }, { outline: false }))
  return g
}

function buildVase(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.12, 0.16, 0.3, v, { y: 0.15 }))
  g.addChild(cyl(0.09, 0.12, 0.1, v, { y: 0.35 }))
  g.addChild(cone(0.06, 0.3, GREEN, { y: 0.55 }))
  g.addChild(sphere(0.08, '#e87a90', { y: 0.72 }))
  return g
}

function buildCushion(v: string): Container3D {
  const g = new Container3D()
  const c = box(0.45, 0.45, 0.15, v, { y: 0.25 })
  c.rotation.z = 0.12
  g.addChild(c)
  return g
}

function buildAquarium(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.0, 0.3, 0.4, WOOD_D, { y: 0.15 }))
  g.addChild(box(1.1, 0.6, 0.45, v, { y: 0.62 }, { cast: false, outline: false }))
  g.addChild(sphere(0.07, '#ff9a3c', { x: -0.25, y: 0.62, z: 0.05 }, { outline: false }))
  g.addChild(sphere(0.06, '#ffd93c', { x: 0.2, y: 0.55, z: 0.08 }, { outline: false }))
  g.addChild(cone(0.08, 0.3, GREEN, { x: 0.3, y: 0.5, z: -0.05 }, { outline: false }))
  return g
}

function buildIndoorTree(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.07, 0.1, 0.9, WOOD, { y: 0.45 }))
  g.addChild(sphere(0.5, v, { y: 1.15 }))
  g.addChild(sphere(0.32, GREEN_D, { x: 0.3, y: 0.95, z: 0.12 }))
  g.addChild(sphere(0.3, v, { x: -0.28, y: 1.0, z: -0.1 }))
  return g
}

function buildCactus(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.16, 0.18, 0.2, '#b5654a', { y: 0.1 }))
  g.addChild(cyl(0.11, 0.12, 0.5, v, { y: 0.45 }))
  g.addChild(cyl(0.06, 0.06, 0.25, v, { x: 0.16, y: 0.5 }))
  g.addChild(cyl(0.05, 0.05, 0.18, v, { x: -0.15, y: 0.42 }))
  return g
}

function buildMapleTree(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.09, 0.13, 1.0, WOOD, { y: 0.5 }))
  g.addChild(sphere(0.65, v, { y: 1.35 }))
  g.addChild(sphere(0.4, v, { x: 0.38, y: 1.15, z: 0.15 }))
  g.addChild(sphere(0.36, '#ffffff', { x: -0.32, y: 1.2, z: -0.12 }))
  return g
}

function buildShrubBall(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.3, 0.34, 0.12, STONE, { y: 0.06 }))
  g.addChild(sphere(0.42, v, { y: 0.55 }))
  return g
}

function buildFlowerBed(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.3, 0.25, 0.7, WOOD_L, { y: 0.125 }))
  g.addChild(box(1.15, 0.08, 0.55, '#5a4632', { y: 0.26 }))
  const spots: Array<[number, number, string]> = [[-0.4, 0, v], [0, -0.1, '#ffffff'], [0.4, 0.1, '#f2c14e']]
  spots.forEach(([sx, sz, col]) => {
    g.addChild(cyl(0.015, 0.015, 0.25, GREEN, { x: sx, y: 0.38, z: sz }, { outline: false }))
    g.addChild(sphere(0.08, col, { x: sx, y: 0.52, z: sz }))
  })
  return g
}

function buildBench(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.5, 0.08, 0.5, WOOD_L, { y: 0.45 }))
  g.addChild(box(1.5, 0.08, 0.08, v, { y: 0.8, z: -0.22 }))
  for (const sx of [-0.65, 0.65]) {
    g.addChild(box(0.08, 0.45, 0.5, WOOD_D, { x: sx, y: 0.22 }))
  }
  return g
}

function buildSwing(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.1, 2.0, 0.1, WOOD, { x: -0.7, y: 1.0 }))
  g.addChild(box(0.1, 2.0, 0.1, WOOD, { x: 0.7, y: 1.0 }))
  g.addChild(box(1.5, 0.1, 0.12, WOOD, { y: 2.0 }))
  g.addChild(box(0.03, 1.0, 0.03, WOOD_D, { x: -0.4, y: 1.3 }))
  g.addChild(box(0.03, 1.0, 0.03, WOOD_D, { x: 0.4, y: 1.3 }))
  g.addChild(box(1.0, 0.06, 0.4, v, { y: 0.75 }))
  return g
}

function buildPlanterBox(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(1.2, 0.3, 0.4, v, { y: 0.15 }))
  for (let i = -1; i <= 1; i++) {
    g.addChild(cyl(0.015, 0.015, 0.28, GREEN, { x: i * 0.35, y: 0.4, z: 0 }, { outline: false }))
    g.addChild(sphere(0.08, i === 0 ? '#e87a90' : '#f2c14e', { x: i * 0.35, y: 0.55 }))
  }
  return g
}

function buildGardenLamp(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.07, 0.09, 0.9, v, { y: 0.45 }))
  g.addChild(box(0.26, 0.26, 0.26, '#ffd98a', { y: 1.05 }, { cast: false, outline: false }))
  g.addChild(cone(0.2, 0.18, v, { y: 1.28 }))
  return g
}

function buildFountain(v: string): Container3D {
  const g = new Container3D()
  g.addChild(cyl(0.6, 0.65, 0.15, STONE, { y: 0.075 }))
  g.addChild(cyl(0.35, 0.4, 0.12, STONE, { y: 0.28 }))
  g.addChild(cyl(0.1, 0.1, 0.5, STONE, { y: 0.55 }))
  g.addChild(sphere(0.12, v, { y: 0.85 }, { outline: false }))
  g.addChild(sphere(0.45, v, { y: 0.18 }, { outline: false, cast: false }))
  return g
}

function buildHammock(v: string): Container3D {
  const g = new Container3D()
  g.addChild(box(0.1, 1.6, 0.1, WOOD, { x: -0.8, y: 0.8 }))
  g.addChild(box(0.1, 1.6, 0.1, WOOD, { x: 0.8, y: 0.8 }))
  g.addChild(box(1.5, 0.06, 0.6, v, { y: 0.7 }))
  g.addChild(box(0.04, 0.6, 0.04, WOOD_D, { x: -0.72, y: 1.0 }))
  g.addChild(box(0.04, 0.6, 0.04, WOOD_D, { x: 0.72, y: 1.0 }))
  return g
}

const BUILDERS: Record<string, (v: string) => Container3D> = {
  sofa: buildSofa,
  armchair: buildArmchair,
  'coffee-table': buildCoffeeTable,
  'dining-table': buildDiningTable,
  bed: buildBed,
  nightstand: buildNightstand,
  wardrobe: buildWardrobe,
  bookshelf: buildBookshelf,
  sideboard: buildSideboard,
  'table-lamp': buildTableLamp,
  'floor-lamp': buildFloorLamp,
  rug: buildRug,
  painting: buildPainting,
  fireplace: buildFireplace,
  'plant-pot': buildPlantPot,
  flowers: buildFlowers,
  bush: buildBush,
  'grass-tuft': buildGrassTuft,
  tree: buildTree,
  'big-tree': buildBigTree,
  fence: buildFence,
  'patio-set': buildPatioSet,
  'stone-lantern': buildStoneLantern,
  'stepping-stone': buildSteppingStone,
  parasol: buildParasol,
  loveseat: buildLoveseat,
  recliner: buildRecliner,
  'office-chair': buildOfficeChair,
  'side-table': buildSideTable,
  desk: buildDesk,
  'tv-stand': buildTvStand,
  dresser: buildDresser,
  shelf: buildShelf,
  'single-bed': buildSingleBed,
  'wall-lamp': buildWallLamp,
  'round-rug': buildRoundRug,
  mirror: buildMirror,
  clock: buildClock,
  vase: buildVase,
  cushion: buildCushion,
  aquarium: buildAquarium,
  'indoor-tree': buildIndoorTree,
  cactus: buildCactus,
  'maple-tree': buildMapleTree,
  'shrub-ball': buildShrubBall,
  'flower-bed': buildFlowerBed,
  bench: buildBench,
  swing: buildSwing,
  'planter-box': buildPlanterBox,
  'garden-lamp': buildGardenLamp,
  fountain: buildFountain,
  hammock: buildHammock
}

/** 根据目录 id 与变体号构建物件容器（底中心在原点） */
export function buildItem(defId: string, variant: number, variants: string[]): Container3D {
  const v = variants[variant % variants.length]
  const fn = BUILDERS[defId]
  if (!fn) throw new Error(`未知物件: ${defId}`)
  return fn(v)
}
