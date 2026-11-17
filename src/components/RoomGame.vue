<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { SweetRoom } from '../game/SweetRoom'

const container = ref<HTMLElement>()
const game = ref<SweetRoom | null>(null)

onMounted(async () => {
  const room = new SweetRoom()
  await room.init(container.value!)
  game.value = room
})

onUnmounted(() => {
  game.value?.destroy()
  game.value = null
})

defineExpose({
  room: () => game.value
})
</script>

<template>
  <div ref="container" class="game-container"></div>
</template>

<style scoped>
.game-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.game-container :deep(canvas) {
  display: block;
}
</style>
