import type { Box, CubeState, Dir, FoldedCube, GameDocument, Receipt } from "@/shared/types";
import {
  foldSkin,
  packageHash,
  receiptVerdict,
  sealHint,
  sealTopDir,
  topPattern,
  type ReceiptVerdict,
  type SealHint,
} from "./cube";
import { goalCells } from "@/features/atlas/lib/grid";
import { sameCell } from "@/shared/document";

export type SlotVerdict =
  | { kind: "ok"; receipt: Receipt; crate: Box }
  | { kind: "wrong-top"; receipt: Receipt; crate: Box; observed: string }
  | { kind: "wrong-seal"; receipt: Receipt; crate: Box; hint: SealHint }
  | { kind: "wrong-package"; receipt: Receipt; crate: Box }
  | { kind: "wrong-stamp"; receipt: Receipt; crate: Box }
  | { kind: "no-seal"; receipt: Receipt; crate: Box }
  | { kind: "not-on-goal"; receipt: Receipt; crate: Box }
  | { kind: "empty"; receipt: Receipt };

export function cratesOnGoals(document: GameDocument): Box[] {
  const goals = goalCells(document.level);
  return document.level.boxes.filter(
    (box) => box.cube !== undefined && goals.some((goal) => sameCell(goal, box)),
  );
}

function foldedOf(box: Box): FoldedCube | null {
  if (!box.cube) return null;
  try {
    return foldSkin(box.cube.skin);
  } catch {
    return null;
  }
}

export type CaptureVerdict = ReceiptVerdict;

/** Can this crate, as it currently rests, satisfy this receipt? */
export function crateVerdict(box: Box, receipt: Receipt): CaptureVerdict {
  if (!box.cube) return "wrong-package";
  const folded = foldedOf(box);
  if (!folded) return "wrong-package";
  return receiptVerdict(box.cube, receipt, folded);
}

export interface AuditResult {
  matched: { receipt: Receipt; crate: Box }[];
  slots: SlotVerdict[];
  remaining: Receipt[];
  satisfied: boolean;
}

/**
 * Match every receipt to a distinct crate by its current observation angle.
 * A crate can only be signed once, even when several receipts agree with it.
 */
export function auditReceipts(document: GameDocument): AuditResult {
  const receipts = document.level.receipts;
  const allCrates = document.level.boxes.filter((box) => box.cube !== undefined);
  const crates = cratesOnGoals(document);
  const verdicts = new Map<string, Map<string, CaptureVerdict>>();
  for (const crate of allCrates) {
    const row = new Map<string, CaptureVerdict>();
    for (const receipt of receipts) row.set(receipt.id, crateVerdict(crate, receipt));
    verdicts.set(crate.id, row);
  }
  const crateIndex = new Map(crates.map((crate, index) => [crate.id, index]));
  const partner = new Array<number>(receipts.length).fill(-1);
  const owner = new Array<number>(crates.length).fill(-1);

  function augment(receiptIndex: number, visited: boolean[]): boolean {
    for (const crate of crates) {
      const cratePos = crateIndex.get(crate.id) as number;
      const row = verdicts.get(crate.id);
      if (!row || visited[cratePos]) continue;
      if (row.get(receipts[receiptIndex].id) !== "ok") continue;
      visited[cratePos] = true;
      if (owner[cratePos] === -1 || augment(owner[cratePos], visited)) {
        owner[cratePos] = receiptIndex;
        partner[receiptIndex] = cratePos;
        return true;
      }
    }
    return false;
  }

  let matchedCount = 0;
  for (let index = 0; index < receipts.length; index += 1) {
    if (augment(index, new Array<boolean>(crates.length).fill(false))) matchedCount += 1;
  }

  const matched: { receipt: Receipt; crate: Box }[] = [];
  for (let index = 0; index < receipts.length; index += 1) {
    const cratePos = partner[index];
    if (cratePos >= 0) matched.push({ receipt: receipts[index], crate: crates[cratePos] });
  }

  const onGoal = new Set(crates.map((crate) => crate.id));
  const faultOrder: CaptureVerdict[] = ["wrong-seal", "wrong-top", "wrong-stamp", "wrong-package"];
  const slots = receipts.map<SlotVerdict>((receipt) => {
    const linked = matched.find((entry) => entry.receipt.id === receipt.id);
    if (linked) return { kind: "ok", receipt, crate: linked.crate };
    // A crate resting on a delivery cell explains the mismatch best, then a
    // crate that would agree if only it were rolled onto a cell.
    for (const verdict of faultOrder) {
      const crate = crates.find(
        (item) => verdicts.get(item.id)?.get(receipt.id) === verdict,
      );
      if (crate) return describeFailure(receipt, crate, verdict);
    }
    const offGoal = allCrates.find(
      (crate) => !onGoal.has(crate.id) && verdicts.get(crate.id)?.get(receipt.id) === "ok",
    );
    if (offGoal) return { kind: "not-on-goal", receipt, crate: offGoal };
    for (const verdict of faultOrder) {
      const crate = allCrates.find(
        (item) => verdicts.get(item.id)?.get(receipt.id) === verdict,
      );
      if (crate) return describeFailure(receipt, crate, verdict);
    }
    return { kind: "empty", receipt };
  });

  const remaining = receipts.filter(
    (receipt) => !matched.some((entry) => entry.receipt.id === receipt.id),
  );
  return { matched, slots, remaining, satisfied: remaining.length === 0 };
}

function describeFailure(receipt: Receipt, crate: Box, verdict: CaptureVerdict): SlotVerdict {
  const folded = foldedOf(crate);
  const cube = crate.cube as CubeState;
  if (verdict === "wrong-seal" && folded) {
    return { kind: "wrong-seal", receipt, crate, hint: sealHint(cube, receipt, folded) };
  }
  if (verdict === "wrong-top") {
    const observed = folded ? topPattern(folded, cube.orientation) : "?";
    return { kind: "wrong-top", receipt, crate, observed };
  }
  if (verdict === "wrong-stamp") return { kind: "wrong-stamp", receipt, crate };
  if (verdict === "no-seal") return { kind: "no-seal", receipt, crate };
  return { kind: "wrong-package", receipt, crate };
}



export function sealAdvice(hint: SealHint): string {
  if (hint.current === null) return "封条此刻不在顶棱上，得先把封条所在的那条棱翻到顶面。";
  const names: Record<Dir, string> = { n: "北", e: "东", s: "南", w: "西" };
  const edgeName = EDGE_NAME[hint.edge];
  return `封条现在朝${names[hint.current]}，收货单要朝${names[hint.target]}。把箱子往${names[hint.target]}侧滚，或绕到${edgeName}面那一侧再翻一格。`;
}
const EDGE_NAME: Record<string, string> = { up: "顶", down: "底", north: "北", south: "南", east: "东", west: "西" };



export interface BoardHint {
  x: number;
  y: number;
  dir: Dir;
}

/**
 * Crates resting on a delivery cell whose only remaining mismatch is the seal
 * direction get an on-board marker pointing at the edge that must be turned.
 */
export function boardHints(document: GameDocument): BoardHint[] {
  const hints: BoardHint[] = [];
  for (const crate of cratesOnGoals(document)) {
    if (!crate.cube) continue;
    const folded = foldedOf(crate);
    if (!folded) continue;
    for (const receipt of document.level.receipts) {
      if (receipt.stamp != null && receipt.stamp !== "" && receipt.stamp !== crate.cube.stamp) continue;
      if (receipt.packageId && receipt.packageId !== packageHash(crate.cube.skin)) continue;
      if (topPattern(folded, crate.cube.orientation) !== receipt.top) continue;
      const dir = sealTopDir(folded, crate.cube.orientation);
      if (dir === receipt.sealDir) break;
      hints.push({ x: crate.x, y: crate.y, dir: receipt.sealDir });
      break;
    }
  }
  return hints;
}

