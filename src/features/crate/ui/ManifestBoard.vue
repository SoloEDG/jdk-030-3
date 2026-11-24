<script setup lang="ts">
import { computed } from "vue";
import type { Box, GameDocument } from "@/shared/types";
import {
  DIR_LABEL,
  PATTERN_LABEL,
  foldSkin,
  receiptVerdict,
  sealHint,
} from "../lib/cube";
import { auditReceipts, sealAdvice, type SlotVerdict } from "../lib/delivery";
import { packageNameOf } from "../lib/packages";

const props = defineProps<{
  document: GameDocument;
  checkedId: string | null;
}>();

const emit = defineEmits<{ check: [boxId: string | null] }>();

const audit = computed(() => auditReceipts(props.document));

const checked = computed(() => {
  const boxes = props.document.level.boxes.filter((box) => box.cube);
  if (boxes.length === 0) return null;
  return boxes.find((box) => box.id === props.checkedId) ?? boxes[0];
});

const rows = computed(() => {
  const box = checked.value;
  const state = box?.cube;
  if (!box || !state) return [];
  const folded = safeFold(box);
  return props.document.level.receipts.map((receipt) => {
    const match = audit.value.matched.find((entry) => entry.receipt.id === receipt.id);
    const slot = audit.value.slots.find((entry) => entry.receipt.id === receipt.id) as SlotVerdict;
    const verdict = folded ? receiptVerdict(state, receipt, folded) : "wrong-package";
    return {
      receipt,
      verdict,
      forMe: match?.crate.id === box.id,
      signedBy: match?.crate.id ?? null,
      slot,
      hint: verdict === "wrong-seal" && folded ? sealHint(state, receipt, folded) : null,
      maybe: verdict !== "ok" && slot.kind === "ok",
    };
  });
});

function safeFold(box: Box | null) {
  if (!box?.cube) return null;
  try {
    return foldSkin(box.cube.skin);
  } catch {
    return null;
  }
}

function faultText(slot: SlotVerdict): string {
  switch (slot.kind) {
    case "ok":
      return "";
    case "wrong-top":
      return `顶面现在是「${PATTERN_LABEL[slot.observed as keyof typeof PATTERN_LABEL] ?? slot.observed}」，单上要「${PATTERN_LABEL[slot.receipt.top]}」。`;
    case "wrong-seal":
      return sealAdvice(slot.hint);
    case "wrong-package":
      return "这张单要的是正手折法；镜像拼错的箱皮不能冒充同一包装。";
    case "wrong-stamp":
      return "背面印记对不上，不能拿它代签。";
    case "no-seal":
      return "这只箱的封条不在顶面，先翻到能露出封条的一面。";
    case "not-on-goal":
      return "这只箱的顶面与封条都对，但人还没把它滚进收货位。";
    case "empty":
      return "还没有箱子在这个角度配上这张单。";
  }
}

const checkedLabel = computed(() => {
  if (!checked.value?.cube) return "";
  return `${packageNameOf(checked.value.cube.packageId)} · 印记${checked.value.cube.stamp || "无"}`;
});

const signedCount = computed(
  () => props.document.level.receipts.length - audit.value.remaining.length,
);

function select(id: string): void {
  emit("check", props.checkedId === id ? null : id);
}
</script>

<template>
  <section class="panel manifest" aria-label="收货单">
    <h2>收货单</h2>
    <p class="lede">
      {{ signedCount }} / {{ document.level.receipts.length }} 张已配齐。每只箱子只能签一次，
      别把同一只箱按两个角度算两单。
    </p>
    <div v-if="document.level.boxes.some((box) => box.cube)" class="batch">
      <span>核看</span>
      <button
        v-for="box in document.level.boxes.filter((item) => item.cube)"
        :key="box.id"
        type="button"
        :class="{ on: checked?.id === box.id }"
        @click="select(box.id)"
      >
        {{ box.cube?.stamp || "无印" }}
      </button>
      <small v-if="checkedLabel">{{ checkedLabel }}</small>
    </div>
    <ul class="slips">
      <li v-for="row in rows" :key="row.receipt.id" :class="{ ok: row.verdict === 'ok', mine: row.forMe }">
        <div class="slip-head">
          <b>{{ row.receipt.label }}</b>
          <span :class="['tone', row.verdict]">{{ row.forMe ? "可签收" : row.verdict === "ok" ? "他箱签收" : "未配" }}</span>
        </div>
        <p class="spec">
          顶面 {{ PATTERN_LABEL[row.receipt.top] }} · 封条接
          {{ DIR_LABEL[row.receipt.sealDir] }}侧
          <template v-if="row.receipt.stamp">· 印记 {{ row.receipt.stamp }}</template>
        </p>
        <p class="pack">包装 {{ packageNameOf(row.receipt.packageId) }}</p>
        <p v-if="row.forMe" class="okline">当前这只箱按这个角度能签。</p>
        <p v-else-if="row.verdict === 'ok' && row.maybe" class="fault">
          当前这只箱也够得上这张单，但同一只只能签一次——它已被用来配另一张。
        </p>
        <p v-else-if="row.verdict === 'ok'" class="fault">
          这一单已由另一只箱签收，当前这只不要重复计。
        </p>
        <p v-else-if="faultText(row.slot)" class="fault">{{ faultText(row.slot) }}</p>
      </li>
    </ul>
    <p v-if="audit.remaining.length === 0" class="cleared">单货齐全，可以交单了。</p>
  </section>
</template>
