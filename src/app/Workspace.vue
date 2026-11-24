<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { StageView, TileLegend } from "@/features/atlas";
import { CrateInspector, ManifestBoard, PatternLegend, SkinFolder } from "@/features/crate";
import { GadgetPanel } from "@/features/gadget";
import { MoverHud } from "@/features/hauler";
import { StepMeter } from "@/features/ledger";
import { LevelRail, RecordBoard } from "@/features/voyage";
import { dirFromKey, shouldCapture } from "./keys";
import { useWorkshop } from "./useWorkshop";

const shop = useWorkshop();
const { document, notice } = shop;
const { title, blurb } = shop.atlas;
const { counts } = shop.hauler;
const { summary } = shop.gadget;
const { steps, status, coverage } = shop.ledger;
const { catalog, completed } = shop.voyage;
const { focused, view, audit } = shop.crate;

const isRoll = computed(() => document.value.level.mode === "roll");

const foldProgress = computed(() => {
  const raw = shop.crate.fold.value;
  return Math.min(1, Math.max(0, raw.step / 5));
});

const shownSkin = computed(() => {
  const box = focused.value;
  return box?.cube?.skin ?? null;
});

const folder = computed(() => shop.crate.fold.value);

function onKey(event: KeyboardEvent): void {
  if (!shouldCapture(event)) return;
  const action = dirFromKey(event);
  if (!action) return;
  event.preventDefault();
  if (action === "reset") shop.reset();
  else shop.move(action);
}

function startFold(skinId: string): void {
  shop.crate.startFold(skinId);
}

function nudgeFold(delta: number): void {
  shop.crate.foldStep(delta);
}

function foldFully(skinId: string): void {
  shop.crate.foldFully(skinId);
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="workshop">
    <header class="mast">
      <div class="brand">
        <span class="mark" aria-hidden="true">闩</span>
        <div>
          <h1>栈闩工房</h1>
          <p>箱认踏板，板动门廊。滚箱沿棱翻身，收件单要对准顶面与封条。</p>
        </div>
      </div>
      <p class="notice" :data-tone="notice.tone">{{ notice.message }}</p>
    </header>
    <div class="bench" :data-mode="isRoll ? 'roll' : 'slide'">
      <aside class="rail">
        <LevelRail :catalog="catalog" @select="shop.selectLevel" @reset="shop.reset" />
        <RecordBoard :completed="completed" />
        <PatternLegend v-if="isRoll" />
      </aside>
      <main class="stage">
        <div class="stage-head">
          <h2>{{ title }}</h2>
          <p>{{ blurb }}</p>
        </div>
        <StageView :document="document" />
        <MoverHud :counts="counts" />
        <section v-if="isRoll" class="panel crate-under">
          <h2>箱下转角</h2>
          <p class="lede">
            推一次就沿接触棱翻一次；箱底朝下，顶面现花样。绕视角查看相邻三面，封条方向也要对单。
          </p>
          <div class="roll-actions">
            <button type="button" @click="shop.crate.orbit('left')">↺ 绕左看</button>
            <button type="button" @click="shop.crate.orbit('right')">绕右看 ↻</button>
            <button type="button" @click="shop.crate.setFocusToAdjacent()">对准最近箱</button>
          </div>
        </section>
      </main>
      <aside class="side">
        <StepMeter :steps="steps" :status="status" :coverage="coverage" />
        <CrateInspector
          v-if="isRoll"
          :crate="focused"
          :view="view"
          @orbit="shop.crate.orbit"
          @edge="shop.crate.chooseCorner"
        />
        <ManifestBoard
          v-if="isRoll"
          :document="document"
          :checked-id="focused?.id ?? null"
          @check="shop.inspect"
        />
        <GadgetPanel :document="document" :summary="summary" />
        <TileLegend v-if="!isRoll" />
      </aside>
    </div>
    <section v-if="isRoll && shownSkin" class="fold-bench panel" aria-label="平铺箱皮折叠台">
      <header class="fold-head">
        <h2>平铺箱皮</h2>
        <p class="lede">
          这里收到的是平铺的六格箱皮。逐步折起，或按住拖动转看背面；镜像拼错的箱皮折出来是反手花纹。
        </p>
      </header>
      <div class="fold-body">
        <SkinFolder :skin="shownSkin" :progress="foldProgress" />
        <div class="fold-steps">
          <p class="stepper">
            <button type="button" @click="startFold(shownSkin.id)">摊回平铺</button>
            <button type="button" @click="nudgeFold(-1)">折回一格</button>
            <button type="button" @click="nudgeFold(1)">再折一格</button>
            <button type="button" @click="foldFully(shownSkin.id)">一次折成箱</button>
          </p>
          <ol class="fold-log">
            <li>已折起 {{ folder.skinId ? folder.step : 0 }} / 5 格</li>
            <li>封条处必须与一张收件单的朝向导一致。</li>
            <li>同花色的两只箱子若只差背面印记，仍要分开签收。</li>
          </ol>
          <p class="lede">
            已配齐 {{ document.level.receipts.length - audit.remaining.length }} /
            {{ document.level.receipts.length }} 张单。
            交单要求每一张都有不同的箱只对应。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
