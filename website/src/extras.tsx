import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Illustrations ---------- */

export function AuthArt() {
  return (
    <div className="auth-visual">
      <img className="auth-illustration" src="/img/auth-basket.svg" alt="" />
      <span className="float-chip chip-a">
        <b>82</b> Basket score
      </span>
      <span className="float-chip chip-b">High protein ✓</span>
      <span className="float-chip chip-c">Low sugar ✓</span>
    </div>
  );
}

export function HeroArt() {
  return <img className="hero-illustration" src="/img/auth-basket.svg" alt="" />;
}

/* ---------- Food thumbnails (photo when we have one, tile otherwise) ---------- */

const PHOTOS: [RegExp, string][] = [
  [/milk|dairy|curd|dahi|paneer|ghee|butter|cheese|lassi|yogurt|yoghurt|cream/i, "milk"],
  [/peanut|groundnut|moongphali|mungfali/i, "peanuts"],
  [/potato|aloo|batata/i, "potatoes"],
  [/vegetable|veggie|sabzi|spinach|palak|tomato|onion|carrot|cabbage|cauliflower|broccoli|peas/i, "vegetables"],
];

const NAME_EMOJI: [RegExp, string][] = [
  [/banana/i, "🍌"], [/apple/i, "🍎"], [/mango/i, "🥭"], [/orange|citrus/i, "🍊"],
  [/egg/i, "🥚"], [/oat|muesli|cereal|corn ?flake/i, "🥣"], [/rice|poha/i, "🍚"],
  [/atta|flour|wheat|maida|besan/i, "🌾"], [/bread|bun|pav|roti|chapati/i, "🍞"],
  [/dal|lentil|chana|rajma|moong|toor|pulse/i, "🍲"], [/almond|cashew|walnut|nuts?/i, "🌰"],
  [/tea|chai|coffee/i, "☕"], [/juice|drink|soda|cola/i, "🥤"], [/biscuit|cookie/i, "🍪"],
  [/chip|namkeen|bhujia|snack|chivda/i, "🍿"], [/oil/i, "🫒"], [/sugar|jaggery|honey/i, "🍯"],
];

const CAT_STYLE: Record<string, [string, string, string]> = {
  dairy: ["#e6f0fb", "#cfe2f5", "🥛"],
  fruit: ["#fde9e4", "#f8d2c8", "🍎"],
  vegetable: ["#e0f1dc", "#c9e6c1", "🥦"],
  rice: ["#f6efd9", "#ede0b4", "🌾"],
  bread: ["#fbeed8", "#f4dcb4", "🍞"],
  pulse: ["#fbe8d6", "#f4d2b2", "🍲"],
  nut: ["#f3e6d8", "#e8d0b6", "🌰"],
  snack: ["#fdf0d4", "#f8e0a8", "🍿"],
  beverage: ["#e1f2f6", "#c8e5ee", "🥤"],
  cereal: ["#fbf1d6", "#f3e1a8", "🥣"],
};

function tileFor(name: string, category?: string) {
  const text = `${name} ${category || ""}`.toLowerCase();
  const key =
    /dairy|milk/.test(text) ? "dairy"
    : /fruit/.test(text) ? "fruit"
    : /vegetable/.test(text) ? "vegetable"
    : /rice|grain|flour/.test(text) ? "rice"
    : /bread|bakery/.test(text) ? "bread"
    : /pulse|legume|dal/.test(text) ? "pulse"
    : /nut|seed/.test(text) ? "nut"
    : /snack/.test(text) ? "snack"
    : /beverage|drink/.test(text) ? "beverage"
    : /cereal|breakfast/.test(text) ? "cereal"
    : "";
  const base = CAT_STYLE[key] || ["#eef2e6", "#dde6cf", "🛒"];
  const emoji = (NAME_EMOJI.find(([re]) => re.test(name)) || [null, base[2]])[1] as string;
  return { from: base[0], to: base[1], emoji };
}

// Photos are only used when the food really IS that thing (not a snack made from it),
// so "Aloo Bhujia" never shows a potato and "Peanut Chikki" never shows plain peanuts.
const NO_PHOTO = /snack|beverage|drink|cereal|breakfast|bread|bakery|biscuit|chip|bhujia|namkeen|chikki|candy|sweet|juice|sauce|ketchup|powder/i;

function photoFor(name: string, category?: string) {
  const text = `${name} ${category || ""}`;
  if (NO_PHOTO.test(text)) return undefined;
  return (PHOTOS.find(([re]) => re.test(name)) || [])[1] ||
    (category === "Vegetables" ? "vegetables" : category === "Dairy" ? "milk" : undefined);
}

export function FoodThumb(props: { name: string; category?: string; small?: boolean }) {
  const { name, category, small } = props;
  const photo = photoFor(name, category);
  const [broken, setBroken] = useState(false);
  const tile = tileFor(name, category);
  const cls = small ? "food-thumb small" : "food-thumb";
  if (photo && !broken) {
    return (
      <div className={cls}>
        <img src={`/food-images/${photo}.webp`} alt="" decoding="async" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`${cls} tile`} style={{ background: `linear-gradient(135deg, ${tile.from}, ${tile.to})` }}>
      <span aria-hidden="true">{tile.emoji}</span>
    </div>
  );
}

/* ---------- Basket image (a shopping list you can save and take to the shop) ---------- */

type Item = { name: string; variant_name?: string; quantity_g: number; calories_kcal?: number };
type Totals = { calories: number; protein: number; carbs: number; fat: number };

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const nice = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 2)} kg` : `${Math.round(g)} g`);

export function drawBasketImage(items: Item[], totals: Totals, score: number | null, userName: string) {
  const W = 1080, P = 56, ROW = 96, HEAD = 230, TITLE = 150, FOOT = 330;
  const H = HEAD + TITLE + Math.max(items.length, 1) * ROW + FOOT;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const FONT = "Manrope, 'Segoe UI', Roboto, Arial, sans-serif";

  x.fillStyle = "#f4f2e9"; x.fillRect(0, 0, W, H);

  // header band
  const g = x.createLinearGradient(0, 0, W, HEAD);
  g.addColorStop(0, "#0f3d2c"); g.addColorStop(1, "#1d5a40");
  x.fillStyle = g; x.fillRect(0, 0, W, HEAD);
  x.fillStyle = "rgba(196,216,142,.16)"; x.beginPath(); x.arc(W - 40, 20, 150, 0, 7); x.fill();
  x.fillStyle = "#e8f0dc"; rr(x, P, 62, 84, 84, 24); x.fill();
  x.fillStyle = "#123b2c"; x.font = `800 58px Georgia, serif`; x.textAlign = "center"; x.fillText("n", P + 42, 124);
  x.textAlign = "left"; x.fillStyle = "#fffdf5"; x.font = `800 46px ${FONT}`;
  x.fillText("nutri", P + 108, 112);
  const nw = x.measureText("nutri").width;
  x.fillStyle = "#c4d88e"; x.fillText("track", P + 108 + nw, 112);
  x.fillStyle = "#a8c0aa"; x.font = `700 19px ${FONT}`; x.fillText("SMART GROCERY COMPANION", P + 110, 146);
  x.textAlign = "right"; x.fillStyle = "#e8f0dc"; x.font = `600 24px ${FONT}`;
  x.fillText(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), W - P, 112);
  x.textAlign = "left";

  // title
  let y = HEAD + 70;
  x.fillStyle = "#143c2c"; x.font = `800 46px ${FONT}`;
  x.fillText(fit(x, `${userName ? userName + "'s" : "My"} shopping list`, W - 2 * P), P, y);
  x.fillStyle = "#6c7d71"; x.font = `500 25px ${FONT}`;
  x.fillText(`${items.length} item${items.length === 1 ? "" : "s"}  ·  tick each one off as you shop`, P, y + 44);

  // rows
  y = HEAD + TITLE;
  items.forEach((it, i) => {
    x.fillStyle = "#fffefa"; rr(x, P, y, W - 2 * P, ROW - 14, 22); x.fill();
    x.strokeStyle = "#e1e6d9"; x.lineWidth = 2; x.stroke();
    x.strokeStyle = "#1d5a40"; x.lineWidth = 3; rr(x, P + 26, y + 20, 40, 40, 11); x.stroke();
    x.fillStyle = "#143c2c"; x.font = `800 29px ${FONT}`;
    x.fillText(fit(x, `${i + 1}. ${it.name}`, 560), P + 92, y + 38);
    x.fillStyle = "#7c8b80"; x.font = `500 21px ${FONT}`;
    x.fillText(fit(x, it.variant_name || "", 560), P + 92, y + 68);
    x.textAlign = "right"; x.fillStyle = "#123b2c"; x.font = `800 32px ${FONT}`;
    x.fillText(nice(Number(it.quantity_g) || 0), W - P - 26, y + 40);
    const kcal = it.calories_kcal != null ? Math.round((Number(it.calories_kcal) * (Number(it.quantity_g) || 0)) / 100) : null;
    if (kcal !== null) { x.fillStyle = "#7c8b80"; x.font = `500 21px ${FONT}`; x.fillText(`${kcal} kcal`, W - P - 26, y + 68); }
    x.textAlign = "left";
    y += ROW;
  });
  if (!items.length) { x.fillStyle = "#7c8b80"; x.font = `500 26px ${FONT}`; x.fillText("Your basket is empty.", P, y + 40); y += ROW; }

  // totals
  y += 20;
  x.fillStyle = "#e8efdc"; rr(x, P, y, W - 2 * P, 200, 28); x.fill();
  const cols: [string, string][] = [
    ["CALORIES", `${Math.round(totals.calories)} kcal`], ["PROTEIN", `${totals.protein.toFixed(1)} g`],
    ["CARBS", `${totals.carbs.toFixed(1)} g`], ["FAT", `${totals.fat.toFixed(1)} g`],
  ];
  cols.forEach(([k, v], i) => {
    const cx = P + 36 + i * 205;
    x.fillStyle = "#6f8e58"; x.font = `800 18px ${FONT}`; x.fillText(k, cx, y + 60);
    x.fillStyle = "#143c2c"; x.font = `800 33px ${FONT}`; x.fillText(v, cx, y + 108);
  });
  // score badge
  const bx = W - P - 92, by = y + 100;
  x.fillStyle = "#123b2c"; x.beginPath(); x.arc(bx, by, 66, 0, 7); x.fill();
  x.fillStyle = "#c4d88e"; x.textAlign = "center"; x.font = `800 44px ${FONT}`; x.fillText(score === null ? "—" : String(score), bx, by + 12);
  x.fillStyle = "#a8c0aa"; x.font = `700 13px ${FONT}`; x.fillText("BASKET SCORE", bx, by + 42);
  x.textAlign = "left";

  x.fillStyle = "#8b988e"; x.font = `500 20px ${FONT}`;
  x.fillText("Nutrition values are estimates for general awareness, not medical advice.", P, y + 262);
  x.fillText("Made with NutriTrack", P, y + 294);
  return c;
}

export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, "image/png");
}

/* ---------- Thank-you page ---------- */

export function ThankYouPage(props: {
  items: Item[]; totals: Totals; score: number | null; userName: string;
  onBack: () => void; onHome: () => void;
}) {
  const { items, totals, score, userName, onBack, onHome } = props;
  const first = (userName || "").split(" ")[0];
  const canvas = useMemo(() => drawBasketImage(items, totals, score, first), [items, totals, score, first]);
  const preview = useMemo(() => canvas.toDataURL("image/png"), [canvas]);
  const [saved, setSaved] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const fileName = `nutritrack-basket-${new Date().toISOString().slice(0, 10)}.png`;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      const f = new File([new Blob([""], { type: "image/png" })], "x.png", { type: "image/png" });
      setCanShare(!!(navigator as any).canShare && (navigator as any).canShare({ files: [f] }));
    } catch { setCanShare(false); }
    return () => window.clearTimeout(timer.current);
  }, []);

  const save = () => {
    downloadCanvas(canvas, fileName);
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 3500);
  };
  const share = () =>
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/png" });
      (navigator as any).share({ files: [file], title: "My NutriTrack shopping list" }).catch(() => {});
    }, "image/png");

  return (
    <div className="thanks">
      <div className="thanks-head">
        <img className="thanks-art" src="/img/thanks.svg" alt="" />
        <span className="eyebrow">YOUR BASKET IS READY</span>
        <h1>
          Thank you{first ? `, ${first}` : ""}<span>.</span>
        </h1>
        <p>
          Your basket is set. Save it as an image, keep it on your phone, and tick items off while you shop.
        </p>
      </div>

      <div className="thanks-grid">
        <div className="thanks-preview">
          <img src={preview} alt="Your basket as a shopping list image" />
        </div>
        <div className="thanks-side">
          <div className="thanks-stats">
            <div><small>ITEMS</small><strong>{items.length}</strong></div>
            <div><small>CALORIES</small><strong>{Math.round(totals.calories)}</strong></div>
            <div><small>BASKET SCORE</small><strong>{score === null ? "—" : score}</strong></div>
          </div>
          <button className="primary wide" onClick={save} disabled={!items.length}>
            {saved ? "Saved to your downloads ✓" : "Download basket image ↓"}
          </button>
          {canShare && (
            <button className="secondary wide" onClick={share} disabled={!items.length}>
              Share image
            </button>
          )}
          <button className="secondary wide" onClick={onBack}>← Back to basket</button>
          <button className="text-button" onClick={onHome}>Go to overview</button>
          <ol className="thanks-steps">
            <li>Download the image.</li>
            <li>Open it on your phone at the shop.</li>
            <li>Tick each item off as it goes in your trolley.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
