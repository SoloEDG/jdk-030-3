import { createId } from "@/shared/document";
import { buildCube, getPackage } from "@/features/crate/lib/packages";
import type {
  BoxKind,
  Dir,
  FaceKey,
  FloorMorph,
  LevelMode,
  PatternId,
  RuntimeLevel,
  TileKind,
} from "@/shared/types";

export interface BoxBlueprint {
  kind: BoxKind;
  x: number;
  y: number;
  stamp?: string;
  package?: string;
  mirror?: boolean;
  stampFace?: FaceKey;
  spins?: Dir[];
}

export interface ReceiptBlueprint {
  package: string;
  top: PatternId;
  sealDir: Dir;
  stamp?: string;
}

export interface LevelBlueprint {
  id: string;
  title: string;
  blurb: string;
  mode: LevelMode;
  rows: string[];
  player: { x: number; y: number };
  boxes: BoxBlueprint[];
  plates: {
    accept: BoxKind;
    x: number;
    y: number;
    doorIds: string[];
    floorIds: string[];
  }[];
  doors: { id: string; x: number; y: number }[];
  floors: { id: string; x: number; y: number; morph: FloorMorph }[];
  receipts?: ReceiptBlueprint[];
}

function tilesOf(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return "wall";
      if (ch === "*") return "goal";
      if (ch === "~") return "gap";
      return "floor";
    }),
  );
}

export const LEVELS: LevelBlueprint[] = [
  {
    id: "latch-01",
    title: "门闩入门",
    blurb: "木箱压上木踏板才会开门。多出来的箱子用来压住开关。",
    mode: "slide",
    rows: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "###...###",
      "#......*#",
      "#......*#",
      "#########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 3 },
      { kind: "timber", x: 4, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "timber", x: 3, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 4, y: 5 }],
    floors: [],
  },
  {
    id: "latch-02",
    title: "认材",
    blurb: "铁踏板只认铁箱。木箱压上去门不会动。",
    mode: "slide",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "####...###",
      "#.......*#",
      "#.......*#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 5, y: 4 },
      { kind: "iron", x: 6, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "iron", x: 6, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [],
  },
  {
    id: "latch-03",
    title: "架桥",
    blurb: "木踏板升起缺口上的桥板。铁箱过桥后，木箱去压本侧目标。",
    mode: "slide",
    rows: [
      "###########",
      "#........*#",
      "#.........#",
      "#.........#",
      "#~~~~~~~~~#",
      "#.........#",
      "#........*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 2 },
      { kind: "iron", x: 4, y: 3 },
    ],
    plates: [{ accept: "timber", x: 3, y: 3, doorIds: [], floorIds: ["b1", "b2", "b3"] }],
    doors: [],
    floors: [
      { id: "b1", x: 3, y: 4, morph: "bridge" },
      { id: "b2", x: 4, y: 4, morph: "bridge" },
      { id: "b3", x: 5, y: 4, morph: "bridge" },
    ],
  },
  {
    id: "latch-04",
    title: "封廊",
    blurb: "先把一只木箱送进左侧目标，再压踏板。踏板会封住那条廊并打开右侧的门。",
    mode: "slide",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "##.##..###",
      "#*......*#",
      "#........#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 6 },
      { kind: "timber", x: 4, y: 2 },
      { kind: "timber", x: 6, y: 4 },
    ],
    plates: [{ accept: "timber", x: 4, y: 3, doorIds: ["d1"], floorIds: ["s1"] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [{ id: "s1", x: 2, y: 5, morph: "seal" }],
  },
  {
    id: "latch-05",
    title: "双色闸",
    blurb: "玻璃踏板与木踏板各管一扇门。两只箱子都要过闸到达目标。",
    mode: "slide",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "##...#...##",
      "#.........#",
      "#*.......*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 2 },
      { kind: "glass", x: 8, y: 2 },
      { kind: "timber", x: 3, y: 3 },
      { kind: "glass", x: 7, y: 3 },
    ],
    plates: [
      { accept: "timber", x: 2, y: 3, doorIds: ["west"], floorIds: [] },
      { accept: "glass", x: 8, y: 3, doorIds: ["east"], floorIds: [] },
    ],
    doors: [
      { id: "west", x: 3, y: 4 },
      { id: "east", x: 7, y: 4 },
    ],
    floors: [],
  },
  {
    id: "roll-01",
    title: "折起第一只箱",
    blurb: "印花箱推一格就沿棱翻一格。先把箱皮折成立方体，认准回心顶面、封条朝南，再滚上收货位。",
    mode: "roll",
    rows: [
      "#########",
      "#.......#",
      "#.......#",
      "#...*...#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    player: { x: 4, y: 6 },
    boxes: [{ kind: "timber", x: 4, y: 5, package: "ripple", stamp: "甲" }],
    plates: [],
    doors: [],
    floors: [],
    receipts: [{ package: "ripple", top: "ring", sealDir: "s", stamp: "甲" }],
  },
  {
    id: "roll-02",
    title: "双生印记",
    blurb: "两只同花色的箱皮折出来一模一样，只有背面印记不同。两张收件单各要一只，别把同一只箱子按两个角度签两遍。",
    mode: "roll",
    rows: [
      "#########",
      "#.......#",
      "#.*...*.#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    player: { x: 4, y: 6 },
    boxes: [
      { kind: "timber", x: 2, y: 5, package: "ripple", stamp: "甲" },
      { kind: "timber", x: 6, y: 5, package: "ripple", stamp: "乙" },
    ],
    plates: [],
    doors: [],
    floors: [],
    receipts: [
      { package: "ripple", top: "moon", sealDir: "s", stamp: "甲" },
      { package: "ripple", top: "moon", sealDir: "s", stamp: "乙" },
    ],
  },
  {
    id: "roll-03",
    title: "镜像花色",
    blurb: "三只箱里有两只都印着「乙」，但中间那只的箱皮是镜像折法：平铺看差不离，折起来却是反手花纹。收件单只认正手包装，镜像箱签不了。",
    mode: "roll",
    rows: [
      "#########",
      "#.......#",
      "#.*...*.#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    player: { x: 4, y: 6 },
    boxes: [
      { kind: "timber", x: 2, y: 5, package: "ripple", stamp: "甲" },
      { kind: "timber", x: 4, y: 5, package: "ripple", stamp: "乙", mirror: true },
      { kind: "timber", x: 6, y: 5, package: "ripple", stamp: "乙" },
    ],
    plates: [],
    doors: [],
    floors: [],
    receipts: [
      { package: "ripple", top: "moon", sealDir: "s", stamp: "甲" },
      { package: "ripple", top: "moon", sealDir: "s", stamp: "乙" },
    ],
  },
  {
    id: "roll-04",
    title: "磅上翻箱",
    blurb: "木踏板仍按材质认箱：得留一只木箱压住磅，另一只才滚得开门。门开一线，收货单却要那只盖章的箱子顶面朝上、封条朝东。",
    mode: "roll",
    rows: [
      "##########",
      "#........#",
      "#...*....#",
      "#........#",
      "####D#####",
      "#........#",
      "#..P.....#",
      "#........#",
      "#........#",
      "#........#",
      "##########",
    ],
    player: { x: 5, y: 9 },
    boxes: [
      { kind: "timber", x: 2, y: 8, package: "ripple", stamp: "甲" },
      { kind: "timber", x: 6, y: 8, package: "ripple", stamp: "乙", mirror: true },
    ],
    plates: [{ accept: "timber", x: 3, y: 6, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 4, y: 4 }],
    floors: [],
    receipts: [{ package: "ripple", top: "moon", sealDir: "e", stamp: "甲" }],
  },
];

export function getLevel(id: string): LevelBlueprint {
  const found = LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`未知关卡 ${id}`);
  return found;
}

export function hydrate(blueprint: LevelBlueprint): RuntimeLevel {
  return {
    id: blueprint.id,
    title: blueprint.title,
    blurb: blueprint.blurb,
    mode: blueprint.mode,
    width: blueprint.rows[0].length,
    height: blueprint.rows.length,
    tiles: tilesOf(blueprint.rows),
    player: { ...blueprint.player },
    boxes: blueprint.boxes.map((box) => {
      const base = { id: createId(box.kind), kind: box.kind, x: box.x, y: box.y };
      if (!box.package) return base;
      return {
        ...base,
        cube: buildCube(box.package, {
          mirrored: box.mirror,
          stamp: box.stamp,
          stampFace: box.stampFace,
          spins: box.spins,
        }),
      };
    }),
    plates: blueprint.plates.map((plate, index) => ({
      ...plate,
      id: `p-${blueprint.id}-${index}`,
      powered: false,
    })),
    doors: blueprint.doors.map((door) => ({ ...door, open: false })),
    floors: blueprint.floors.map((floor) => ({ ...floor, active: false })),
    receipts: (blueprint.receipts ?? []).map((receipt, index) => ({
      id: `r-${blueprint.id}-${index}`,
      label: `收件单 ${index + 1}`,
      packageId: getPackage(receipt.package).hash,
      top: receipt.top,
      sealDir: receipt.sealDir,
      stamp: receipt.stamp ?? null,
    })),
  };
}
