import { goalCells } from "@/features/atlas";
import { auditReceipts } from "@/features/crate/lib/delivery";
import { sameCell } from "@/shared/document";
import type { GameDocument, Vec } from "@/shared/types";

export function filledGoals(document: GameDocument): Vec[] {
  return goalCells(document.level).filter((cell) =>
    document.level.boxes.some((box) => sameCell(box, cell)),
  );
}

export function goalsSatisfied(document: GameDocument): boolean {
  const goals = goalCells(document.level);
  if (goals.length === 0) return false;
  if (document.level.mode === "roll") {
    if (document.level.receipts.length === 0) return false;
    return auditReceipts(document).satisfied;
  }
  return goals.every((cell) => document.level.boxes.some((box) => sameCell(box, cell)));
}

export function coverageLine(document: GameDocument): string {
  if (document.level.mode === "roll") {
    const audit = auditReceipts(document);
    const signed = document.level.receipts.length - audit.remaining.length;
    return `${signed} / ${document.level.receipts.length} 张收件单已配齐`;
  }
  const total = goalCells(document.level).length;
  const filled = filledGoals(document).length;
  return `${filled} / ${total} 个目标格已有箱子`;
}
