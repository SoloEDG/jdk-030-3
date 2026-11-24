<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Box, CubeSkin } from "@/shared/types";
import {
  FACE_LABEL,
  PATTERN_LABEL,
  cornerFrom,
  cubeView,
  foldSkin,
  type CornerView,
} from "../lib/cube";
import { cameraForCorner, cameraForOrbit, drawFoldedCube } from "../lib/render3d";

const props = defineProps<{
  crate: Box | null;
  view: CornerView;
}>();

const emit = defineEmits<{ orbit: [turn: "left" | "right"]; edge: [edge: CornerView] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
const yaw = ref(0);
const pitch = ref(0.35);
const dragging = ref(false);
let lastX = 0;
let lastY = 0;

const cube = computed(() => {
  const state = props.crate?.cube;
  if (!state) return null;
  try {
    return foldSkin(state.skin);
  } catch {
    return null;
  }
});

const info = computed(() => {
  if (!props.crate?.cube) return null;
  return cubeView(
    cube.value as ReturnType<typeof foldSkin>,
    props.crate.cube.orientation,
    props.view,
    props.crate.cube.stamp,
    props.crate.cube.stampFace,
  );
});

function render(): void {
  const el = canvas.value;
  if (!el) return;
  const size = 232;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  el.width = Math.floor(size * dpr);
  el.height = Math.floor(size * dpr);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  if (!cube.value || !props.crate?.cube) return;
  const camera =
    yaw.value === 0 && pitch.value === 0.35
      ? cameraForCorner(props.view)
      : cameraForOrbit(yaw.value, pitch.value);
  drawFoldedCube(ctx, cube.value, props.crate.cube.orientation, camera, {
    size,
    centerX: size / 2,
    centerY: size / 2,
    stamp: props.crate.cube.stamp,
    stampFace: props.crate.cube.stampFace,
  });
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.value?.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  yaw.value += (event.clientX - lastX) * 0.012;
  pitch.value = Math.max(-1.2, Math.min(1.3, pitch.value - (event.clientY - lastY) * 0.01));
  lastX = event.clientX;
  lastY = event.clientY;
}

function onPointerUp(): void {
  dragging.value = false;
}

function reset(): void {
  yaw.value = 0;
  pitch.value = 0.35;
}

const visibleCards = computed(() => {
  if (!info.value) return [];
  return info.value.faces.map((face) => ({
    slot: face.slot === "top" ? "顶" : face.slot === "front" ? "前" : "右",
    world: FACE_LABEL[face.world],
    pattern: PATTERN_LABEL[face.face.pattern],
    north: FACE_LABEL[face.face.north],
    east: FACE_LABEL[face.face.east],
  }));
});

const hiddenWords = computed(() => {
  if (!info.value) return "";
  return info.value.hidden.map((face) => FACE_LABEL[face]).join("、");
});

const stampLine = computed(() => {
  if (!props.crate?.cube) return "";
  if (info.value?.stampVisibleWorld) {
    return `背面印记「${props.crate.cube.stamp}」正露出在${FACE_LABEL[info.value.stampVisibleWorld]}面。`;
  }
  return "背面印记此刻藏在看不见的一面，翻一翻才能确认。";
});

const sealLine = computed(() => {
  if (!info.value) return "";
  if (info.value.sealBetween) {
    const [a, b] = info.value.sealBetween;
    const from = a === "up" ? b : a;
    return `封条从顶面接到${FACE_LABEL[from]}侧，朝${FACE_LABEL[from]}。`;
  }
  return "封条此刻不在这三面之间，绕到别的棱再看看。";
});

function orbit(turn: "left" | "right"): void {
  emit("orbit", turn);
  yaw.value = 0;
  pitch.value = 0.35;
}

function chooseEdge(edge: CornerView): void {
  emit("edge", edge);
  yaw.value = 0;
  pitch.value = 0.35;
}

watch(
  () => [props.crate?.id, props.crate?.cube?.orientation, props.view],
  render,
  { deep: true },
);
onMounted(render);

const facing = computed(() => {
  const names: Record<string, string> = {
    up: "顶",
    down: "底",
    north: "北",
    south: "南",
    east: "东",
    west: "西",
  };
  return names[props.view.front] ?? props.view.front;
});

const skin = computed<CubeSkin | null>(() => props.crate?.cube?.skin ?? null);
</script>

<template>
  <section class="panel inspector" aria-label="货箱查看">
    <h2>看货</h2>
    <p v-if="!crate || !cube" class="lede">这一关没有印花箱。切到滚箱关卡再看货。</p>
    <template v-else>
      <div class="look-row">
        <div class="look-screen">
          <canvas
            ref="canvas"
            role="img"
            :aria-label="`正在查看 ${skin?.name ?? '箱皮'} 折成立方体的一面`"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />
        </div>
        <div class="look-side">
          <p class="seam">朝{{ facing }}看，见三面</p>
          <ul class="seen">
            <li v-for="card in visibleCards" :key="card.slot">
              <b>{{ card.slot }}面</b>（{{ card.world }}）
              <span>{{ card.pattern }}</span>
              <small>花样北 {{ card.north }} · 东 {{ card.east }}</small>
            </li>
          </ul>
          <p class="lede">背过身的三面：{{ hiddenWords }}。</p>
          <p class="seal-line">{{ sealLine }}</p>
          <p class="stamp-line">{{ stampLine }}</p>
        </div>
      </div>
      <div class="look-tools">
        <button type="button" @click="orbit('left')">↺ 绕左</button>
        <button type="button" @click="orbit('right')">绕右 ↻</button>
        <button type="button" @click="reset">摆正</button>
      </div>
      <div class="edge-picks" aria-label="选视角棱">
        <button
          v-for="edge in [cornerFrom('s'), cornerFrom('e'), cornerFrom('n'), cornerFrom('w')]"
          :key="edge.front"
          type="button"
          :class="{ on: edge.front === view.front }"
          @click="chooseEdge(edge)"
        >
          从{{ FACE_LABEL[edge.front] }}侧看
        </button>
      </div>
    </template>
  </section>
</template>
