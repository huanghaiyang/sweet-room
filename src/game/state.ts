import { computed, reactive } from 'vue'
import {
  PlacedItem, ItemDef,
  MIN_ROOMS, MAX_ROOMS, MIN_YARD, MAX_YARD,
  roomExpandPrice, yardExpandPrice
} from './model'
import { defById } from './items'

let seq = 0

export const state = reactive({
  coins: 600,
  rooms: MIN_ROOMS,
  yard: MIN_YARD,
  placed: [] as PlacedItem[],
  selectedId: null as string | null,
  /** 待放置的物件 defId（从面板点选后进入跟随放置模式） */
  placingDef: null as string | null,
  message: '',
  messageAt: 0
})

function say(text: string) {
  state.message = text
  state.messageAt = Date.now()
}

export function addItem(def: ItemDef, x: number, z: number, variant: number): boolean {
  if (state.coins < def.price) {
    say('金币不足，先布置小物件攒满意度吧')
    return false
  }
  state.coins -= def.price
  seq += 1
  state.placed.push({
    id: `item-${seq}`,
    defId: def.id,
    layer: def.layer,
    x, z,
    rotY: 0,
    variant: variant % def.variants.length
  })
  say(`已摆放「${def.name}」`)
  return true
}

export function removeItem(id: string) {
  const idx = state.placed.findIndex(p => p.id === id)
  if (idx < 0) return
  const [it] = state.placed.splice(idx, 1)
  const def = defById(it.defId)
  if (def) state.coins += Math.floor(def.price / 2)
  if (state.selectedId === id) state.selectedId = null
  say(`收回「${def?.name ?? '物件'}」，返还一半金币`)
}

export function moveItem(id: string, x: number, z: number) {
  const it = state.placed.find(p => p.id === id)
  if (!it) return
  it.x = x
  it.z = z
}

export function rotateItem(id: string) {
  const it = state.placed.find(p => p.id === id)
  if (!it) return
  it.rotY += Math.PI / 2
}

export function selectItem(id: string | null) {
  state.selectedId = id
}

export function expandRoom(): boolean {
  if (state.rooms >= MAX_ROOMS) { say('房间已经扩建到最大啦'); return false }
  const price = roomExpandPrice(state.rooms)
  if (state.coins < price) { say(`扩建房间需要 ${price} 金币`); return false }
  state.coins -= price
  state.rooms += 1
  say(`房间扩建为 ${state.rooms} 开间！`)
  return true
}

export function expandYard(): boolean {
  if (state.yard >= MAX_YARD) { say('庭院已经拓展到最大啦'); return false }
  const price = yardExpandPrice(state.yard)
  if (state.coins < price) { say(`拓展庭院需要 ${price} 金币`); return false }
  state.coins -= price
  state.yard += 1
  say('前院拓展完成，可布置更多户外景致')
  return true
}

export const satisfaction = computed(() =>
  state.placed.reduce((sum, p) => sum + (defById(p.defId)?.value ?? 0), 0)
)

export const roomLabel = computed(() => {
  const s = satisfaction.value
  if (s < 30) return '初见雏形'
  if (s < 80) return '温馨小屋'
  if (s < 150) return '雅致雅居'
  return '梦想之家'
})
