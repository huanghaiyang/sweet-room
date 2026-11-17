// ---------------------------------------------------------------------------
// 3D 世界常量、类型与场景几何（Y-up，单位为世界坐标）
// 半开间：房屋前侧（+Z 方向）敞开，室内可见；后墙在 z = -DEPTH。
// ---------------------------------------------------------------------------

/** 房屋进深（后墙 z 坐标为 -DEPTH，室内前缘 z = 0） */
export const DEPTH = 3.6
/** 单个开间宽度 */
export const UNIT = 3.2
/** 墙高 */
export const WALL_H = 3.4
/** 室外世界半宽（草地平面） */
export const WORLD_HALF_X = 10
export const WORLD_HALF_Z = 9

export const MIN_ROOMS = 2
export const MAX_ROOMS = 5
export const MIN_YARD = 1
export const MAX_YARD = 3

/** 前院纵深：基础值 + 每档增量 */
export const YARD_BASE = 4.2
export const YARD_STEP = 1.6

export type Layer = 'indoor' | 'outdoor'
export type Category =
  | 'seat' | 'table' | 'storage' | 'bed' | 'decor' | 'light'
  | 'plant' | 'outdoor'

export interface PlacedItem {
  id: string
  defId: string
  layer: Layer
  /** 世界坐标 x（底中心） */
  x: number
  /** 世界坐标 z（落地） */
  z: number
  /** 绕 Y 旋转（弧度） */
  rotY: number
  variant: number
}

export interface ItemDef {
  id: string
  name: string
  category: Category
  layer: Layer
  /** 占位宽（x 方向）与深（z 方向），用于摆放碰撞与边界提示 */
  footprint: { w: number; d: number }
  price: number
  /** 满意度贡献 */
  value: number
  /** 挂墙物件（挂画等），落地基准抬高并贴后墙 */
  wallMounted?: boolean
  /** 卡片预览图标（emoji） */
  icon?: string
  /** 卡片预览底色（代表色 hex） */
  swatch?: string
  variants: string[]
}

export function houseWidth(rooms: number): number {
  return rooms * UNIT
}

/** 房屋左边界 x（居中） */
export function houseX0(rooms: number): number {
  return -houseWidth(rooms) / 2
}

export function houseX1(rooms: number): number {
  return houseWidth(rooms) / 2
}

export interface Bounds { x0: number; z0: number; x1: number; z1: number }

/** 室内可摆放地面范围 */
export function indoorBounds(rooms: number): Bounds {
  const pad = 0.35
  return {
    x0: houseX0(rooms) + pad,
    z0: -DEPTH + pad,
    x1: houseX1(rooms) - pad,
    z1: -0.25
  }
}

/** 前院纵深（z 最大值） */
export function yardFront(yard: number): number {
  return YARD_BASE + (yard - MIN_YARD) * YARD_STEP
}

/** 室外可摆放范围（前院 + 房屋两侧草地） */
export function outdoorBounds(yard: number): Bounds {
  return {
    x0: -WORLD_HALF_X + 0.6,
    z0: 0.35,
    x1: WORLD_HALF_X - 0.6,
    z1: yardFront(yard) - 0.3
  }
}

/** 点是否落在房屋 footprint 内（室外物件不可压进屋） */
export function insideHouse(x: number, z: number, rooms: number): boolean {
  return x > houseX0(rooms) - 0.2 && x < houseX1(rooms) + 0.2 && z > -DEPTH - 0.2 && z < 0.2
}

export function roomExpandPrice(rooms: number): number {
  return 120 + (rooms - MIN_ROOMS) * 100
}

export function yardExpandPrice(yard: number): number {
  return 80 + (yard - MIN_YARD) * 70
}
