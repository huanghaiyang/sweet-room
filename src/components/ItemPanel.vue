<script setup lang="ts">
import { ref, computed } from 'vue'
import { DEFS, CATEGORY_LABEL, LAYER_LABEL, Category } from '../game/items'
import { state } from '../game/state'

const emit = defineEmits<{ (e: 'select', id: string): void }>()

const cat = ref<'all' | Category>('all')
const cats = computed(() => Array.from(new Set(DEFS.map(d => d.category))))
const list = computed(() =>
  DEFS.filter(d => cat.value === 'all' || d.category === cat.value)
)

function onClick(id: string) {
  emit('select', id)
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">摆件目录</div>
    <div class="chips">
      <button
        class="chip"
        :class="{ active: cat === 'all' }"
        @click="cat = 'all'"
      >全部</button>
      <button
        v-for="c in cats"
        :key="c"
        class="chip"
        :class="{ active: cat === c }"
        @click="cat = c"
      >{{ CATEGORY_LABEL[c] }}</button>
    </div>
    <div class="grid">
      <button
        v-for="d in list"
        :key="d.id"
        class="card"
        :class="{ active: state.placingDef === d.id, poor: state.coins < d.price }"
        @click="onClick(d.id)"
      >
        <div class="card-preview" :style="{ background: d.swatch || '#f3e4cd' }">
          <span class="card-icon">{{ d.icon || '🪑' }}</span>
        </div>
        <div class="card-head">
          <span class="card-name">{{ d.name }}</span>
          <span class="card-layer">{{ LAYER_LABEL[d.layer] }}</span>
        </div>
        <div class="card-foot">
          <span class="price">🪙 {{ d.price }}</span>
          <span class="value">好感 +{{ d.value }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.panel-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid #d9b98f;
  background: #fff7ec;
  color: var(--ink);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.chip.active {
  background: var(--warm-wood);
  color: #fff;
  border-color: var(--warm-wood);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
}
.card {
  text-align: left;
  border: 1px solid #e6cfa9;
  background: #fffaf1;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.12s, background 0.12s;
}
.card:hover { transform: translateY(-2px); background: #fff3df; }
.card.active { background: #ffe3bd; border-color: var(--warm-wood); }
.card.poor { opacity: 0.55; }
.card-preview {
  height: 46px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3e4cd;
}
.card-icon { font-size: 24px; line-height: 1; }
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}
.card-name { font-size: 13px; font-weight: 600; }
.card-layer {
  font-size: 10px;
  color: #8a6a4a;
  background: #f3e4cd;
  border-radius: 6px;
  padding: 1px 6px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #7a5c3e;
}
</style>
