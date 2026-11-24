<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PatternId } from "@/shared/types";
import { PATTERN_LABEL } from "../lib/cube";
import { paintPattern, sealMark } from "../lib/pattern";

const patterns: PatternId[] = ["ring", "wave", "leaf", "star", "spiral", "moon"];
const cells = ref<Record<string, HTMLCanvasElement | null>>({});

function paint(name: PatternId): void {
  const el = cells.value[name];
  if (!el) return;
  const size = 46;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  el.width = Math.floor(size * dpr);
  el.height = Math.floor(size * dpr);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  paintPattern(ctx, name, size);
}

const sealCanvas = ref<HTMLCanvasElement | null>(null);

function paintSeal(): void {
  const el = sealCanvas.value;
  if (!el) return;
  const size = 46;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  el.width = size;
  el.height = size;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  ctx.clearRect(0, 0, size, size);
  sealMark(ctx, "#8f2f1d", size);
}

onMounted(() => {
  for (const name of patterns) paint(name);
  paintSeal();
});

</script>

<template>
  <section class="panel patterns" aria-label="花纹图例">
    <h2>箱皮花纹</h2>
    <ul class="swatches">
      <li v-for="name in patterns" :key="name">
        <canvas :ref="(el) => (cells[name] = el as HTMLCanvasElement | null)" aria-hidden="true" />
        <span>{{ PATTERN_LABEL[name] }}</span>
      </li>
      <li>
        <canvas ref="sealCanvas" aria-hidden="true" />
        <span>封条</span>
      </li>
    </ul>
    <p class="lede">花样有正反：同一张箱皮镜像拼起来，折出的花纹就反手，不能算同一包装。</p>
  </section>
</template>
