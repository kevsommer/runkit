import type { ClothingId } from "@/lib/recommendation/types";

type Pt = readonly [number, number];

/* ---------- Pose (side view, facing right, mid-stride) ---------- */
const HEAD: Pt = [139, 42];
const NECK: Pt[] = [[131, 56], [127, 72]];
const TORSO: Pt[] = [[124, 78], [111, 130]];
const ARM_NEAR: Pt[] = [[126, 80], [146, 105], [165, 89]];
const ARM_FAR: Pt[] = [[120, 80], [98, 103], [91, 125]];
const LEG_NEAR: Pt[] = [[110, 140], [142, 166], [134, 206]];
const LEG_FAR: Pt[] = [[106, 140], [92, 184], [64, 205]];
const FOOT_NEAR: Pt[] = [[132, 207], [155, 212]];
const FOOT_FAR: Pt[] = [[62, 206], [76, 221]];

const W = { torso: 34, upperArm: 12, thigh: 18, neck: 12 };

const C = {
  skin: "#CF9A74",
  hair: "#2B2421",
  shoe: "#F4F4F5",
  sole: "#FF5A1F",
  short_sleeve: "#FF5A1F",
  light_long_sleeve: "#3D7BFF",
  thermal_long_sleeve: "#7A5AF8",
  windbreaker: "#B9E35A",
  waterproof_shell: "#FFC531",
  insulated_jacket: "#2F3747",
  shorts: "#1F2531",
  half_tights: "#1F2531",
  light_tights: "#2A3140",
  thermal_tights: "#161B24",
  running_trousers: "#3A4354",
  light_socks: "#FFFFFF",
  medium_socks: "#E3E6EB",
  heavy_socks: "#AEB6C3",
  light_gloves: "#2A3140",
  warm_gloves: "#161B24",
  beanie: "#FF5A1F",
  cap: "#F4F4F5",
  cap_brim: "#1F2531",
  neck_gaiter: "#5B6577",
  sunglasses: "#11151C",
} as const;

/* ---------- Geometry helpers ---------- */
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** The part of a polyline between two fractions (0–1) of its length. */
function partial(points: Pt[], from: number, to: number): Pt[] {
  const lens = points.slice(1).map((p, i) => dist(points[i], p));
  const total = lens.reduce((a, b) => a + b, 0);
  const a = from * total;
  const b = to * total;
  const out: Pt[] = [];
  let acc = 0;
  lens.forEach((len, i) => {
    const s0 = acc;
    const s1 = acc + len;
    acc = s1;
    if (s1 < a || s0 > b) return;
    const p1 = lerp(points[i], points[i + 1], (Math.max(a, s0) - s0) / len);
    const p2 = lerp(points[i], points[i + 1], (Math.min(b, s1) - s0) / len);
    if (!out.length) out.push(p1);
    out.push(p2);
  });
  return out;
}

const pathD = (pts: Pt[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/** Darken (amount < 0) or lighten a hex colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function Stroke({
  pts,
  width,
  color,
  cap = "round",
  className = "rk-garment",
  dash,
}: {
  pts: Pt[];
  width: number;
  color: string;
  cap?: "round" | "butt";
  className?: string;
  dash?: string;
}) {
  return (
    <path
      d={pathD(pts)}
      stroke={color}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      strokeDasharray={dash}
      fill="none"
      className={className}
    />
  );
}

/* ---------- Outfit model ---------- */

export type RunnerOutfit = {
  top: ClothingId;
  outer?: ClothingId;
  bottom: ClothingId;
  socks: ClothingId;
  accessories: ClothingId[];
};

const SLEEVE_END: Partial<Record<ClothingId, number>> = {
  short_sleeve: 0.33,
  light_long_sleeve: 0.9,
  thermal_long_sleeve: 0.93,
};

const LEG_END: Partial<Record<ClothingId, number>> = {
  shorts: 0.27,
  half_tights: 0.44,
  light_tights: 0.95,
  thermal_tights: 0.95,
  running_trousers: 0.97,
};

const LEG_EXTRA: Partial<Record<ClothingId, number>> = {
  shorts: 3,
  half_tights: 1.5,
  light_tights: 1,
  thermal_tights: 1.5,
  running_trousers: 5,
};

const SOCK_START: Partial<Record<ClothingId, number>> = {
  light_socks: 0.95,
  medium_socks: 0.91,
  heavy_socks: 0.87,
};

/* ---------- Body parts ---------- */

function Arm({ pts, far, outfit }: { pts: Pt[]; far: boolean; outfit: RunnerOutfit }) {
  const s = (c: string) => (far ? shade(c, -0.2) : c);
  const hand = pts[pts.length - 1];
  const gloves = outfit.accessories.find((a) => a === "light_gloves" || a === "warm_gloves");
  const sleeveEnd = SLEEVE_END[outfit.top] ?? 0.33;
  return (
    <g>
      <Stroke pts={pts} width={W.upperArm} color={s(C.skin)} className="" />
      <circle cx={hand[0]} cy={hand[1]} r={6.5} fill={s(C.skin)} />
      <Stroke key={outfit.top} pts={partial(pts, 0, sleeveEnd)} width={W.upperArm + 3} color={s(C[outfit.top as keyof typeof C])} />
      {outfit.outer && (
        <Stroke key={outfit.outer} pts={partial(pts, 0, 0.88)} width={W.upperArm + 6} color={s(C[outfit.outer as keyof typeof C])} />
      )}
      {gloves && (
        <circle
          key={gloves}
          className="rk-garment"
          cx={hand[0]}
          cy={hand[1]}
          r={gloves === "warm_gloves" ? 8.6 : 7.6}
          fill={s(C[gloves])}
        />
      )}
    </g>
  );
}

function Leg({ pts, foot, far, outfit }: { pts: Pt[]; foot: Pt[]; far: boolean; outfit: RunnerOutfit }) {
  const s = (c: string) => (far ? shade(c, -0.2) : c);
  const end = LEG_END[outfit.bottom] ?? 0.27;
  const sockStart = SOCK_START[outfit.socks] ?? 0.95;
  const sockWidth = outfit.socks === "heavy_socks" ? W.thigh - 1 : W.thigh - 3;
  return (
    <g>
      <Stroke pts={pts} width={W.thigh} color={s(C.skin)} className="" />
      <Stroke key={outfit.socks} pts={partial(pts, sockStart, 1)} width={sockWidth} color={s(C[outfit.socks as keyof typeof C])} />
      <Stroke
        key={outfit.bottom}
        pts={partial(pts, 0, end)}
        width={W.thigh + (LEG_EXTRA[outfit.bottom] ?? 1)}
        color={s(C[outfit.bottom as keyof typeof C])}
      />
      {/* Shoe */}
      <Stroke pts={foot} width={12} color={s(C.shoe)} className="" />
      <Stroke
        pts={foot.map(([x, y]) => [x, y + 4] as Pt)}
        width={4}
        color={s(C.sole)}
        className=""
      />
    </g>
  );
}

function Torso({ outfit }: { outfit: RunnerOutfit }) {
  const top = C[outfit.top as keyof typeof C];
  const gaiter = outfit.accessories.includes("neck_gaiter");
  return (
    <g>
      <Stroke pts={NECK} width={W.neck} color={C.skin} className="" />
      <Stroke pts={TORSO} width={W.torso} color={C.skin} className="" />
      {/* Waistband of the bottoms */}
      <Stroke
        key={`waist-${outfit.bottom}`}
        pts={[[113, 128], [110, 138]]}
        width={W.torso + 1}
        color={C[outfit.bottom as keyof typeof C]}
      />
      <g key={outfit.top} className="rk-garment">
        <Stroke pts={TORSO} width={W.torso + 2} color={top} className="" />
        {outfit.top === "thermal_long_sleeve" && (
          <Stroke pts={[[131, 60], [128, 72]]} width={W.neck + 2} color={top} className="" />
        )}
      </g>
      {outfit.outer && <Outer id={outfit.outer} />}
      {gaiter && (
        <g key="gaiter" className="rk-garment">
          <Stroke pts={[[132, 57], [128, 70]]} width={W.neck + 6} color={C.neck_gaiter} className="" />
          <path d="M126 61 L136 63 M125 66 L135 68" stroke={shade(C.neck_gaiter, -0.25)} strokeWidth={1.4} />
        </g>
      )}
    </g>
  );
}

function Outer({ id }: { id: ClothingId }) {
  const color = C[id as keyof typeof C];
  const dark = shade(color, -0.22);
  return (
    <g key={id} className="rk-garment">
      {id === "waterproof_shell" && (
        // Hood resting on the back
        <path d="M110 70 Q108 56 122 54 Q130 58 128 70 Z" fill={dark} />
      )}
      <Stroke pts={[[125, 75], [111, 134]]} width={W.torso + 6} color={color} className="" />
      {id === "insulated_jacket" && (
        // Quilted baffles: a dashed wide stroke draws bands across the torso
        <Stroke pts={[[124, 76], [113, 124]]} width={W.torso + 6} color={dark} cap="butt" dash="1.6 9" className="" />
      )}
      {/* Collar + zip */}
      <Stroke pts={[[132, 58], [129, 72]]} width={W.neck + 3} color={color} className="" />
      <path d="M138 70 L124 146" stroke={dark} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      {id === "waterproof_shell" && (
        <path d="M108 112 L132 116" stroke={dark} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      )}
    </g>
  );
}

function Head({ outfit }: { outfit: RunnerOutfit }) {
  const has = (id: ClothingId) => outfit.accessories.includes(id);
  const [hx, hy] = HEAD;
  return (
    <g>
      <circle cx={hx - 5} cy={hy - 5} r={18} fill={C.hair} />
      <circle cx={hx + 1} cy={hy + 2} r={16} fill={C.skin} />
      <circle cx={hx - 5} cy={hy + 4} r={3.6} fill={shade(C.skin, -0.12)} />
      <circle cx={hx + 10} cy={hy} r={1.9} fill={C.hair} />
      {has("beanie") && (
        <g key="beanie" className="rk-garment">
          <path d={`M${hx - 22} ${hy - 1} Q${hx - 22} ${hy - 30} ${hx - 2} ${hy - 29} Q${hx + 18} ${hy - 28} ${hx + 17} ${hy - 6} Z`} fill={C.beanie} />
          <Stroke pts={[[hx - 22, hy - 2], [hx + 17, hy - 7]]} width={8} color={shade(C.beanie, -0.18)} className="" />
          <circle cx={hx - 4} cy={hy - 30} r={4.5} fill={shade(C.beanie, 0.25)} />
        </g>
      )}
      {has("cap") && (
        <g key="cap" className="rk-garment">
          <path d={`M${hx - 20} ${hy - 4} Q${hx - 18} ${hy - 26} ${hx} ${hy - 24} Q${hx + 16} ${hy - 22} ${hx + 16} ${hy - 7} Z`} fill={C.cap} />
          <Stroke pts={[[hx + 10, hy - 8], [hx + 30, hy - 4]]} width={4.5} color={C.cap_brim} className="" />
        </g>
      )}
      {has("sunglasses") && (
        <g key="sunglasses" className="rk-garment">
          <rect x={hx + 4} y={hy - 4} width={13} height={6.5} rx={3} fill={C.sunglasses} />
          <path d={`M${hx + 4} ${hy - 1} L${hx - 4} ${hy}`} stroke={C.sunglasses} strokeWidth={1.6} />
        </g>
      )}
    </g>
  );
}

/* ---------- Component ---------- */

export function outfitLabel(o: RunnerOutfit, names: Record<string, string>): string {
  const ids = [o.outer, o.top, o.bottom, o.socks, ...o.accessories].filter(Boolean) as ClothingId[];
  return `Runner wearing ${ids.map((id) => names[id]?.toLowerCase() ?? id).join(", ")}`;
}

export default function RunnerIllustration({
  outfit,
  label,
  className,
}: {
  outfit: RunnerOutfit;
  label: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 240 250" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <circle cx={118} cy={128} r={104} className="fill-[var(--backdrop)]" />
      <ellipse cx={110} cy={232} rx={62} ry={5} className="fill-[var(--shadow)]" />
      {/* Speed lines */}
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.18}>
        <path d="M30 96 L54 96" />
        <path d="M22 118 L48 118" />
        <path d="M34 140 L54 140" />
      </g>

      <Arm pts={ARM_FAR} far outfit={outfit} />
      <Leg pts={LEG_FAR} foot={FOOT_FAR} far outfit={outfit} />
      <Torso outfit={outfit} />
      <Leg pts={LEG_NEAR} foot={FOOT_NEAR} far={false} outfit={outfit} />
      <Arm pts={ARM_NEAR} far={false} outfit={outfit} />
      <Head outfit={outfit} />
    </svg>
  );
}
