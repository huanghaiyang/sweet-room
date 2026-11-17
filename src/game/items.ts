import { Category, ItemDef, Layer } from './model'

export const CATEGORY_LABEL: Record<Category, string> = {
  seat: '坐具',
  table: '桌几',
  storage: '柜架',
  bed: '床榻',
  decor: '装饰',
  light: '灯具',
  plant: '植物',
  outdoor: '庭院'
}

export const LAYER_LABEL: Record<Layer, string> = {
  indoor: '室内',
  outdoor: '室外'
}

/** 目录：footprint 为占位宽(x)/深(z)；variants 为布艺/主色变体 hex；icon/swatch 用于卡片预览 */
export const DEFS: ItemDef[] = [
  // ---- 室内 · 坐具 ----
  { id: 'sofa', name: '三人沙发', category: 'seat', layer: 'indoor', footprint: { w: 2.2, d: 0.95 }, price: 120, value: 14, icon: '🛋️', swatch: '#e8926b', variants: ['#e8926b', '#a8c69f', '#8fb7c9'] },
  { id: 'armchair', name: '扶手椅', category: 'seat', layer: 'indoor', footprint: { w: 0.95, d: 0.95 }, price: 60, value: 7, icon: '🪑', swatch: '#f2d8a7', variants: ['#f2d8a7', '#e8926b', '#a8c69f'] },
  { id: 'loveseat', name: '双人沙发', category: 'seat', layer: 'indoor', footprint: { w: 1.6, d: 0.9 }, price: 90, value: 10, icon: '🛋️', swatch: '#8fb7c9', variants: ['#8fb7c9', '#d96ca0', '#a8c69f'] },
  { id: 'recliner', name: '贵妃榻', category: 'seat', layer: 'indoor', footprint: { w: 1.5, d: 0.8 }, price: 70, value: 8, icon: '🛋️', swatch: '#e8b08a', variants: ['#e8b08a', '#8fb7c9'] },
  { id: 'office-chair', name: '办公椅', category: 'seat', layer: 'indoor', footprint: { w: 0.55, d: 0.55 }, price: 45, value: 5, icon: '💺', swatch: '#5f6b7a', variants: ['#5f6b7a', '#3a4a5a'] },
  // ---- 室内 · 桌几 ----
  { id: 'coffee-table', name: '矮茶几', category: 'table', layer: 'indoor', footprint: { w: 1.15, d: 0.6 }, price: 40, value: 5, icon: '☕', swatch: '#c98d5e', variants: ['#c98d5e', '#8a5a3b'] },
  { id: 'dining-table', name: '餐桌椅组', category: 'table', layer: 'indoor', footprint: { w: 1.7, d: 1.1 }, price: 90, value: 10, icon: '🍽️', swatch: '#c98d5e', variants: ['#c98d5e', '#b5764a'] },
  { id: 'side-table', name: '边几', category: 'table', layer: 'indoor', footprint: { w: 0.5, d: 0.5 }, price: 25, value: 3, icon: '🕯️', swatch: '#8a5a3b', variants: ['#8a5a3b', '#6f4630'] },
  { id: 'desk', name: '书桌', category: 'table', layer: 'indoor', footprint: { w: 1.5, d: 0.7 }, price: 80, value: 8, icon: '🖥️', swatch: '#c98d5e', variants: ['#c98d5e', '#8a5a3b'] },
  // ---- 室内 · 柜架 ----
  { id: 'nightstand', name: '床头柜', category: 'storage', layer: 'indoor', footprint: { w: 0.55, d: 0.45 }, price: 30, value: 3, icon: '🗄️', swatch: '#8a5a3b', variants: ['#8a5a3b', '#6f4630'] },
  { id: 'wardrobe', name: '衣柜', category: 'storage', layer: 'indoor', footprint: { w: 1.35, d: 0.6 }, price: 100, value: 10, icon: '🚪', swatch: '#c98d5e', variants: ['#c98d5e', '#8a5a3b'] },
  { id: 'bookshelf', name: '书架', category: 'storage', layer: 'indoor', footprint: { w: 1.2, d: 0.4 }, price: 80, value: 9, icon: '📚', swatch: '#8a5a3b', variants: ['#8a5a3b', '#6f4630'] },
  { id: 'sideboard', name: '边柜', category: 'storage', layer: 'indoor', footprint: { w: 1.5, d: 0.5 }, price: 70, value: 8, icon: '🗄️', swatch: '#c98d5e', variants: ['#c98d5e', '#a8763f'] },
  { id: 'tv-stand', name: '电视柜', category: 'storage', layer: 'indoor', footprint: { w: 1.6, d: 0.45 }, price: 85, value: 9, icon: '📺', swatch: '#6f4630', variants: ['#6f4630', '#3a3230'] },
  { id: 'dresser', name: '梳妆台', category: 'storage', layer: 'indoor', footprint: { w: 1.1, d: 0.5 }, price: 75, value: 7, icon: '🪞', swatch: '#d9b8a0', variants: ['#d9b8a0', '#c98d5e'] },
  { id: 'shelf', name: '置物架', category: 'storage', layer: 'indoor', footprint: { w: 1.0, d: 0.35 }, price: 55, value: 6, icon: '🗂️', swatch: '#a8763f', variants: ['#a8763f', '#8a5a3b'] },
  // ---- 室内 · 床榻 ----
  { id: 'bed', name: '双人床', category: 'bed', layer: 'indoor', footprint: { w: 1.7, d: 2.1 }, price: 150, value: 16, icon: '🛏️', swatch: '#e8926b', variants: ['#e8926b', '#8fb7c9', '#f2d8a7'] },
  { id: 'single-bed', name: '单人床', category: 'bed', layer: 'indoor', footprint: { w: 1.0, d: 1.9 }, price: 110, value: 11, icon: '🛏️', swatch: '#8fb7c9', variants: ['#8fb7c9', '#a8c69f'] },
  // ---- 室内 · 灯具 ----
  { id: 'table-lamp', name: '台灯', category: 'light', layer: 'indoor', footprint: { w: 0.34, d: 0.34 }, price: 25, value: 4, icon: '💡', swatch: '#f2c14e', variants: ['#f2c14e', '#e87a90'] },
  { id: 'floor-lamp', name: '落地灯', category: 'light', layer: 'indoor', footprint: { w: 0.42, d: 0.42 }, price: 35, value: 5, icon: '🕯️', swatch: '#f2c14e', variants: ['#f2c14e', '#a8c69f'] },
  { id: 'wall-lamp', name: '壁灯', category: 'light', layer: 'indoor', footprint: { w: 0.3, d: 0.12 }, price: 20, value: 3, wallMounted: true, icon: '💡', swatch: '#f2c14e', variants: ['#f2c14e', '#e87a90'] },
  // ---- 室内 · 装饰 ----
  { id: 'rug', name: '编织地毯', category: 'decor', layer: 'indoor', footprint: { w: 2.0, d: 1.4 }, price: 30, value: 4, icon: '🧶', swatch: '#e8b08a', variants: ['#e8b08a', '#a8c69f', '#d96ca0'] },
  { id: 'round-rug', name: '圆形地毯', category: 'decor', layer: 'indoor', footprint: { w: 1.5, d: 1.5 }, price: 25, value: 3, icon: '🌀', swatch: '#d96ca0', variants: ['#d96ca0', '#8fb7c9', '#a8c69f'] },
  { id: 'painting', name: '风景挂画', category: 'decor', layer: 'indoor', footprint: { w: 0.95, d: 0.08 }, price: 20, value: 3, wallMounted: true, icon: '🖼️', swatch: '#8fb7c9', variants: ['#8fb7c9', '#e8926b'] },
  { id: 'mirror', name: '梳妆镜', category: 'decor', layer: 'indoor', footprint: { w: 0.8, d: 0.08 }, price: 30, value: 4, wallMounted: true, icon: '🪞', swatch: '#cfd8dc', variants: ['#cfd8dc', '#e6b85c'] },
  { id: 'clock', name: '挂钟', category: 'decor', layer: 'indoor', footprint: { w: 0.45, d: 0.08 }, price: 25, value: 3, wallMounted: true, icon: '🕰️', swatch: '#f2d8a7', variants: ['#f2d8a7', '#8a5a3b'] },
  { id: 'fireplace', name: '壁炉', category: 'decor', layer: 'indoor', footprint: { w: 1.5, d: 0.6 }, price: 130, value: 15, icon: '🔥', swatch: '#b08968', variants: ['#b08968', '#8d6e5a'] },
  { id: 'vase', name: '陶艺花瓶', category: 'decor', layer: 'indoor', footprint: { w: 0.4, d: 0.4 }, price: 20, value: 3, icon: '🏺', swatch: '#b5654a', variants: ['#b5654a', '#6f8fc9'] },
  { id: 'cushion', name: '抱枕', category: 'decor', layer: 'indoor', footprint: { w: 0.5, d: 0.3 }, price: 12, value: 2, icon: '🧸', swatch: '#d96ca0', variants: ['#d96ca0', '#f2c14e', '#a8c69f'] },
  { id: 'aquarium', name: '鱼缸', category: 'decor', layer: 'indoor', footprint: { w: 1.2, d: 0.5 }, price: 90, value: 10, icon: '🐠', swatch: '#6f8fc9', variants: ['#6f8fc9', '#4f7d8c'] },
  // ---- 室内 · 植物 ----
  { id: 'plant-pot', name: '室内盆栽', category: 'plant', layer: 'indoor', footprint: { w: 0.55, d: 0.55 }, price: 35, value: 5, icon: '🪴', swatch: '#6fa05a', variants: ['#6fa05a', '#4f7d43'] },
  { id: 'indoor-tree', name: '室内榕树立', category: 'plant', layer: 'indoor', footprint: { w: 0.9, d: 0.9 }, price: 50, value: 7, icon: '🌿', swatch: '#5f9448', variants: ['#5f9448', '#6fa05a'] },
  { id: 'cactus', name: '仙人掌', category: 'plant', layer: 'indoor', footprint: { w: 0.4, d: 0.4 }, price: 18, value: 3, icon: '🌵', swatch: '#4f7d43', variants: ['#4f7d43', '#6fa05a'] },
  // ---- 室外 · 植物 ----
  { id: 'flowers', name: '小花簇', category: 'plant', layer: 'outdoor', footprint: { w: 0.75, d: 0.75 }, price: 12, value: 2, icon: '🌸', swatch: '#e87a90', variants: ['#e87a90', '#f2c14e', '#ffffff'] },
  { id: 'bush', name: '圆灌木', category: 'plant', layer: 'outdoor', footprint: { w: 0.95, d: 0.95 }, price: 18, value: 3, icon: '🌳', swatch: '#6fa05a', variants: ['#6fa05a', '#4f7d43'] },
  { id: 'grass-tuft', name: '草丛', category: 'plant', layer: 'outdoor', footprint: { w: 0.5, d: 0.5 }, price: 6, value: 1, icon: '🌱', swatch: '#7fae5f', variants: ['#7fae5f', '#5f9448'] },
  { id: 'tree', name: '小树', category: 'plant', layer: 'outdoor', footprint: { w: 1.25, d: 1.25 }, price: 45, value: 6, icon: '🌲', swatch: '#6fa05a', variants: ['#6fa05a', '#8fb86a'] },
  { id: 'big-tree', name: '大树', category: 'plant', layer: 'outdoor', footprint: { w: 2.1, d: 2.1 }, price: 80, value: 10, icon: '🌳', swatch: '#4f7d43', variants: ['#4f7d43', '#6fa05a'] },
  { id: 'maple-tree', name: '樱花树', category: 'plant', layer: 'outdoor', footprint: { w: 1.6, d: 1.6 }, price: 70, value: 8, icon: '🌸', swatch: '#f2a8c0', variants: ['#f2a8c0', '#e87a90'] },
  { id: 'shrub-ball', name: '造型球', category: 'plant', layer: 'outdoor', footprint: { w: 0.8, d: 0.8 }, price: 16, value: 3, icon: '🌳', swatch: '#5f9448', variants: ['#5f9448', '#7fae5f'] },
  { id: 'flower-bed', name: '花坛', category: 'plant', layer: 'outdoor', footprint: { w: 1.3, d: 0.7 }, price: 25, value: 4, icon: '🌼', swatch: '#f2c14e', variants: ['#f2c14e', '#e87a90', '#ffffff'] },
  // ---- 室外 · 庭院 ----
  { id: 'fence', name: '木栅栏', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.7, d: 0.22 }, price: 25, value: 3, icon: '🪵', swatch: '#a8763f', variants: ['#a8763f', '#8a5a3b'] },
  { id: 'patio-set', name: '户外桌椅', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.9, d: 1.5 }, price: 95, value: 10, icon: '🪑', swatch: '#c98d5e', variants: ['#c98d5e', '#a8763f'] },
  { id: 'stone-lantern', name: '石灯笼', category: 'outdoor', layer: 'outdoor', footprint: { w: 0.6, d: 0.6 }, price: 40, value: 5, icon: '🏮', swatch: '#9a938a', variants: ['#9a938a', '#7d766e'] },
  { id: 'stepping-stone', name: '石板路', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.3, d: 0.85 }, price: 15, value: 2, icon: '🪨', swatch: '#b8b0a4', variants: ['#b8b0a4', '#9a938a'] },
  { id: 'parasol', name: '遮阳伞', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.9, d: 1.9 }, price: 60, value: 6, icon: '☂️', swatch: '#e8926b', variants: ['#e8926b', '#8fb7c9'] },
  { id: 'bench', name: '户外长椅', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.6, d: 0.6 }, price: 55, value: 6, icon: '🪑', swatch: '#8a5a3b', variants: ['#8a5a3b', '#6f4630'] },
  { id: 'swing', name: '秋千', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.6, d: 1.0 }, price: 70, value: 7, icon: '🪅', swatch: '#a8763f', variants: ['#a8763f', '#8fb7c9'] },
  { id: 'planter-box', name: '花箱', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.2, d: 0.4 }, price: 22, value: 3, icon: '🌷', swatch: '#b5764a', variants: ['#b5764a', '#8a5a3b'] },
  { id: 'garden-lamp', name: '庭院灯', category: 'outdoor', layer: 'outdoor', footprint: { w: 0.4, d: 0.4 }, price: 20, value: 3, icon: '🏮', swatch: '#7d766e', variants: ['#7d766e', '#5f6b7a'] },
  { id: 'fountain', name: '小喷泉', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.4, d: 1.4 }, price: 110, value: 12, icon: '⛲', swatch: '#9ab8c9', variants: ['#9ab8c9', '#6f8fc9'] },
  { id: 'hammock', name: '吊床', category: 'outdoor', layer: 'outdoor', footprint: { w: 1.8, d: 1.0 }, price: 50, value: 5, icon: '🏕️', swatch: '#a8c69f', variants: ['#a8c69f', '#d96ca0'] }
]

export const DEF_MAP: Record<string, ItemDef> = Object.fromEntries(DEFS.map(d => [d.id, d]))

export function defById(id: string): ItemDef {
  return DEF_MAP[id]
}
