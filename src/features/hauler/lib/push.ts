import { boxAt } from "./occupancy";
import { isPassable } from "@/features/gadget";
import { addVec } from "@/shared/document";
import { rollOrientation } from "@/features/crate/lib/cube";
import { DIR_VEC, type Dir, type GameDocument, type MoveResult } from "@/shared/types";

export function applyMove(document: GameDocument, dir: Dir): MoveResult {
  if (document.attempt.status === "cleared") return { moved: false, pushed: false, reason: "cleared" };
  const delta = DIR_VEC[dir];
  const next = addVec(document.level.player, delta);
  const box = boxAt(document, next);
  if (box) {
    const beyond = addVec(box, delta);
    if (!isPassable(document, beyond, { ignoreBoxId: box.id, ignorePlayer: true })) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    const rolling = document.level.mode === "roll" && box.cube !== undefined;
    box.x = beyond.x;
    box.y = beyond.y;
    if (rolling && box.cube) {
      box.cube.orientation = rollOrientation(box.cube.orientation, dir);
    }
    document.level.player = next;
    return { moved: true, pushed: true, rolled: rolling, boxId: box.id };
  }
  if (!isPassable(document, next)) return { moved: false, pushed: false, reason: "blocked" };
  document.level.player = next;
  return { moved: true, pushed: false };
}
