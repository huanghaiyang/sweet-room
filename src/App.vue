<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import RoomGame from './components/RoomGame.vue'
import ItemPanel from './components/ItemPanel.vue'
import { state, satisfaction, roomLabel } from './game/state'
import { defById } from './game/items'
import {
  roomExpandPrice, yardExpandPrice, MAX_ROOMS, MAX_YARD
} from './game/model'

const gameEl = ref<InstanceType<typeof RoomGame> | null>(null)
const room = () => gameEl.value?.room()

const selectedDef = computed(() =>
  state.selectedId ? defById(state.placed.find(p => p.id === state.selectedId)?.defId ?? '') : null
)

const canRoom = computed(() => state.rooms < MAX_ROOMS && state.coins >= roomExpandPrice(state.rooms))
const canYard = computed(() => state.yard < MAX_YARD && state.coins >= yardExpandPrice(state.yard))

function onSelect(id: string) {
  if (state.placingDef === id) {
    room()?.cancelPlacing()
    return
  }
  room()?.startPlacing(id)
}

function onExpandRoom() { room()?.doExpandRoom() }
function onExpandYard() { room()?.doExpandYard() }
function onRotate() { room()?.rotateSelected() }
function onRemove() { room()?.removeSelected() }
function onCancelPlacing() { room()?.cancelPlacing() }

watch(() => state.messageAt, () => {
  setTimeout(() => {
    if (Date.now() - state.messageAt >= 2000) state.message = ''
  }, 2200)
})
</script>

<template>
  <div class="app">
    <RoomGame ref="gameEl" />

    <header class="hud">
      <div class="hud-left">
        <div class="title">Sweet Room · 赛璐璐小屋</div>
        <div class="label">✨ {{ roomLabel }}</div>
      </div>
      <div class="hud-right">
        <div class="stat">🪙 金币 <b>{{ state.coins }}</b></div>
        <div class="stat">💛 好感 <b>{{ satisfaction }}</b></div>
        <div class="stat">🛏 {{ state.rooms }} 开间 · 🌿 庭院 {{ state.yard }} 档</div>
      </div>
    </header>

    <aside class="side">
      <ItemPanel @select="onSelect" />
    </aside>

    <div class="toolbar">
      <button class="btn primary" :disabled="!canRoom" @click="onExpandRoom">
        扩建房间 · {{ roomExpandPrice(state.rooms) }} 🪙
      </button>
      <button class="btn primary" :disabled="!canYard" @click="onExpandYard">
        拓展庭院 · {{ yardExpandPrice(state.yard) }} 🪙
      </button>
      <span class="divider" />
      <button class="btn" :disabled="!selectedDef" @click="onRotate">⟳ 旋转</button>
      <button class="btn danger" :disabled="!selectedDef" @click="onRemove">🗑 删除</button>
      <button v-if="state.placingDef" class="btn" @click="onCancelPlacing">取消摆放</button>
    </div>

    <transition name="toast">
      <div v-if="state.message" class="toast">{{ state.message }}</div>
    </transition>
  </div>
</template>

<style scoped>
.app {
  position: absolute;
  inset: 0;
}

.hud {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}
.hud-left, .hud-right {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--panel);
  border: 1px solid #e6cfa9;
  border-radius: 14px;
  padding: 10px 16px;
  box-shadow: 0 6px 18px rgba(120, 80, 40, 0.15);
}
.title { font-size: 18px; font-weight: 800; }
.label { font-size: 13px; color: #8a6a4a; }
.stat { font-size: 14px; color: var(--ink); }
.stat b { color: #b5762f; }

.side {
  position: absolute;
  top: 86px;
  left: 16px;
  bottom: 86px;
  width: 272px;
  background: var(--panel);
  border: 1px solid #e6cfa9;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 6px 18px rgba(120, 80, 40, 0.15);
}

.toolbar {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--panel);
  border: 1px solid #e6cfa9;
  border-radius: 16px;
  padding: 10px 14px;
  box-shadow: 0 6px 18px rgba(120, 80, 40, 0.18);
}
.divider { width: 1px; height: 22px; background: #d9b98f; }
.btn {
  border: 1px solid #d9b98f;
  background: #fff7ec;
  color: var(--ink);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { background: #fff3df; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { background: var(--warm-wood); color: #fff; border-color: var(--warm-wood); }
.btn.danger { color: #b0472f; }

.toast {
  position: absolute;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(74, 53, 39, 0.88);
  color: #fff;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
