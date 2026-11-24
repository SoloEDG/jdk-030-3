import { computed, ref, type Ref } from "vue";
import { auditReceipts, type AuditResult } from "../lib/delivery";
import { cornerFrom, orbitCorner, type CornerView } from "../lib/cube";
import type { Box, Dir, GameDocument } from "@/shared/types";
import { sameCell } from "@/shared/document";

interface FoldState {
  skinId: string;
  step: number;
}

export function useCrate(document: Ref<GameDocument>) {
  const activeId = ref<string | null>(null);
  const view = ref<CornerView>(cornerFrom("s"));
  const fold = ref<FoldState>({ skinId: "", step: 0 });

  const rollCrates = computed(() =>
    document.value.level.mode === "roll"
      ? document.value.level.boxes.filter((box) => box.cube !== undefined)
      : [],
  );

  const audit = computed<AuditResult>(() => auditReceipts(document.value));

  const focused = computed<Box | null>(() => {
    const boxes = rollCrates.value;
    if (boxes.length === 0) return null;
    const chosen = boxes.find((box) => box.id === activeId.value);
    if (chosen) return chosen;
    return nearestBox(boxes, document.value.level.player) ?? boxes[0];
  });

  function nearestBox(boxes: Box[], player: { x: number; y: number }): Box | null {
    let best: Box | null = null;
    let bestDistance = Infinity;
    for (const box of boxes) {
      const distance = Math.abs(box.x - player.x) + Math.abs(box.y - player.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = box;
      }
    }
    return best;
  }

  function edgeTo(box: Box, player: { x: number; y: number }): Dir {
    const dx = player.x - box.x;
    const dy = player.y - box.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "e" : "w";
    return dy >= 0 ? "s" : "n";
  }

  function select(id: string): void {
    const boxes = rollCrates.value;
    const box = boxes.find((item) => item.id === id);
    if (!box) return;
    const changed = activeId.value !== id;
    activeId.value = id;
    if (changed) view.value = cornerFrom(edgeTo(box, document.value.level.player));
    if (fold.value.skinId !== (box.cube?.skin.id ?? "")) {
      fold.value = { skinId: box.cube?.skin.id ?? "", step: 0 };
    }
  }

  function setFocusToAdjacent(): void {
    const player = document.value.level.player;
    const boxes = rollCrates.value;
    const adjacent = boxes.find(
      (box) => Math.abs(box.x - player.x) + Math.abs(box.y - player.y) === 1,
    );
    const target = adjacent ?? boxes.find((box) => sameCell(box, player)) ?? nearestBox(boxes, player);
    if (target) select(target.id);
  }

  function orbit(turn: "left" | "right"): void {
    view.value = orbitCorner(view.value, turn);
  }

  function chooseCorner(corner: CornerView): void {
    view.value = corner;
  }

  function check(id: string | null): void {
    if (id === null) {
      activeId.value = null;
      fold.value = { skinId: "", step: 0 };
      return;
    }
    select(id);
  }

  function startFold(skinId: string): void {
    fold.value = { skinId, step: 0 };
  }

  function foldStep(delta: number): void {
    const max = fold.value.skinId ? 5 : 0;
    fold.value = {
      ...fold.value,
      step: Math.max(0, Math.min(max, fold.value.step + delta)),
    };
  }

  function foldFully(skinId: string): void {
    fold.value = { skinId, step: 5 };
  }

  return {
    view,
    fold,
    rollCrates,
    audit,
    focused,
    select,
    orbit,
    chooseCorner,
    setFocusToAdjacent,
    check,
    startFold,
    foldStep,
    foldFully,
  };
}
