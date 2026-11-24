<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { CubeSkin, Dir, NetPos } from "@/shared/types";
import { cameraForOrbit, drawSkinNet, foldFrames, netFoldTree } from "../lib/render3d";

const props = defineProps<{
  skin: CubeSkin;
  progress: number;
  sealColor?: string;
}>();

const root = ref<NetPos>({ x: 0, y: 0 });
const yaw = ref(-0.62);
const pitch = ref(0.82);
const canvas = ref<HTMLCanvasElement | null>(null);
const dragging = ref(false);
let lastX = 0;
let lastY = 0;

watch(
  () => props.skin,
  () => {
    root.value = props.skin.root ?? { x: props.skin.cells[0].x, y: props.skin.cells[0].y };
  },
  { immediate: true },
);

function render(): void {
  const el = canvas.value;
  if (!el) return;
  const size = 236;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  el.width = Math.floor(size * dpr);
  el.height = Math.floor(size * dpr);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const camera = cameraForOrbit(yaw.value, pitch.value);
  drawSkinNet(ctx, props.skin, {
    size,
    centerX: size / 2,
    centerY: size / 2,
    camera,
    progress: props.progress,
    root: root.value,
    sealColor: props.sealColor,
  });
}

function onPointerDown(event: PointerEvent): void {
  const el = canvas.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const cell = cellFromPoint(x, y);
  if (cell) root.value = { x: cell.x, y: cell.y };
  dragging.value = true;
  lastX = event.clientX;
  lastY = event.clientY;
  el.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  yaw.value -= (event.clientX - lastX) * 0.012;
  pitch.value = Math.max(-1.32, Math.min(1.32, pitch.value + (event.clientY - lastY) * 0.009));
  lastX = event.clientX;
  lastY = event.clientY;
}

function onPointerUp(): void {
  dragging.value = false;
}

function cellFromPoint(x: number, y: number): NetPos | null {
  // Pick the cell whose projected centre is closest to the pointer, using the
  // same camera as the drawing so tilted views still pick correctly.
  const size = 236;
  const camera = cameraForOrbit(yaw.value, pitch.value);
  const scale = size * 0.19;
  const tree = netFoldTree(props.skin, root.value);
  const frames = foldFrames(props.skin, tree, props.progress);
  const center = { x: size / 2, y: size / 2 };
  let best: NetPos | null = null;
  let bestDistance = scale * 0.7;
  props.skin.cells.forEach((cell, index) => {
    const frame = frames[index];
    const sx = center.x + dot3(frame.center, camera.right) * scale;
    const sy = center.y - dot3(frame.center, camera.up) * scale;
    const distance = Math.hypot(sx - x, sy - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: cell.x, y: cell.y };
    }
  });
  return best;
}

function dot3(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function spin(delta: number): void {
  yaw.value += delta;
}

function tilt(delta: number): void {
  pitch.value = Math.max(-1.32, Math.min(1.32, pitch.value + delta));
}

function resetView(): void {
  yaw.value = -0.62;
  pitch.value = 0.82;
}

const sealDirLabel: Record<Dir, string> = { n: "北", e: "东", s: "南", w: "西" };

onMounted(render);
watch([() => props.progress, () => props.skin, yaw, pitch, root], render, { deep: true });

defineExpose({ resetView, spin, tilt });
</script>

<template>
  <div class="skin-folder">
    <div class="fold-screen">
      <canvas
        ref="canvas"
        role="img"
        :aria-label="`${skin.name} 平铺箱皮，当前折起 ${Math.round(progress * 100)}%`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
    </div>
    <div class="fold-tools">
      <button type="button" @click="spin(-0.28)" aria-label="向左转看">← 转</button>
      <button type="button" @click="spin(0.28)" aria-label="向右转看">转 →</button>
      <button type="button" @click="tilt(0.18)" aria-label="抬高视角">抬</button>
      <button type="button" @click="tilt(-0.18)" aria-label="压低视角">压</button>
      <button type="button" @click="resetView">正视角</button>
    </div>
    <p class="fold-note">
      点一格当作折起点；按住拖动可转看箱皮背面。折起点在 ({{ root.x }},{{ root.y }})。
      <template v-if="skin.seal">
        封条画在第 ({{ skin.seal.x }},{{ skin.seal.y }}) 格的{{ sealDirLabel[skin.seal.dir] }}棱。
      </template>
      <template v-else>这张箱皮没有封条。</template>
    </p>
  </div>
</template>
