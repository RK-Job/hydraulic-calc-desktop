"use strict";

/* ============================================================
   画面(src/app.js)とExcel出力(excelExport.js)で共有する計算ロジック。
   DOM に依存しない純粋関数のみを置く。
   ============================================================ */

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function clampFloorCount(v) {
  const n = Math.round(num(v));
  return Math.min(5, Math.max(1, n || 1));
}

/* 器具換算長リスト（口径別・単位ｍ）
   ※出典：大分市上下水道局「給水装置テキスト2017」第2章第5節
   　表２－１１ 各種給水器具類の損失水頭の直管換算長（P.2-44） */
const EQUIV_LENGTH_LIST = {
  13: { faucet: 3, tee: null, stopcock: 4.5, meter: 4, check: 1.2, gate: 0.12 },
  20: { faucet: 8, tee: null, stopcock: 6, meter: 11, check: 1.6, gate: 0.15 },
  25: { faucet: 8, tee: null, stopcock: 7.5, meter: 15, check: 2, gate: 0.18 },
  40: { faucet: null, tee: 2.1, stopcock: 13.5, meter: 26, check: 3.1, gate: 0.3 },
  50: { faucet: null, tee: 3, stopcock: 16.5, meter: 35, check: 4, gate: 0.39 },
  75: { faucet: null, tee: 4.5, stopcock: 24, meter: 30, check: 5.7, gate: 0.63 },
  100: { faucet: null, tee: null, stopcock: null, meter: 40, check: 7.6, gate: 0.81 },
};
const HW_COEFF = 130; // ヘーゼン・ウィリアムス公式の流速係数（新管相当・固定値）

function equivLength(diameter, count, field) {
  const table = EQUIV_LENGTH_LIST[diameter];
  if (!table || !table[field] || !count) return 0;
  return table[field] * count;
}

/* 戸数から同時使用水量を予測する算定式（優良住宅部品認定基準ＢＬ規格）
   Ｑ＝42N^0.33（9戸以下）／Ｑ＝19N^0.67（10〜600戸未満）　Ｑ：l/分 */
function blHouseholdFlowLps(households) {
  if (!households || households <= 0) return 0;
  const qLmin = households <= 9 ? 42 * Math.pow(households, 0.33) : 19 * Math.pow(households, 0.67);
  return qLmin / 60;
}

/* 戸数入力があればＢＬ算定式を優先、なければ手入力流量を採用 */
function resolveBlFlow(households, manualFlow) {
  const h = num(households);
  return h > 0 ? blHouseholdFlowLps(h) : num(manualFlow);
}

/* 動水勾配Ｉ：口径50mm以下はウエストン公式、75mm以上はヘーゼン・ウィリアムス公式 */
function computeGradient(diameter, flowLps) {
  if (!diameter || !(flowLps > 0)) return 0;
  const bM = diameter / 1000;
  if (diameter < 75) {
    const T = (4 * flowLps) / (bM * bM * 3.14152654 * 1000);
    const U = 0.0126 + (0.0179 - 0.0001087 * diameter) / Math.sqrt(T);
    return (U * T * T) / bM / 2 / 9.80665;
  }
  const X = 10.666 * Math.pow(HW_COEFF, -1.85);
  const Z = Math.pow(bM, -4.87);
  const AB = Math.pow(flowLps / 1000, 1.85);
  return X * Z * AB;
}

/* ＢＬ表１区間分の計算をまとめて行う */
function calcBlRow({ diameter, households, flow, length, nFaucet, nTee, nStopcock, nMeter, nCheck, nGate }) {
  const d = parseInt(diameter, 10) || 0;
  const resolvedFlow = resolveBlFlow(households, flow);
  const len = num(length);

  const lFaucet = equivLength(d, num(nFaucet), "faucet");
  const lTee = equivLength(d, num(nTee), "tee");
  const lStopcock = equivLength(d, num(nStopcock), "stopcock");
  const lMeter = equivLength(d, num(nMeter), "meter");
  const lCheck = equivLength(d, num(nCheck), "check");
  const lGate = equivLength(d, num(nGate), "gate");

  const subtotalLength = len + lFaucet + lTee + lStopcock + lMeter + lCheck + lGate;
  const gradient = computeGradient(d, resolvedFlow);
  const loss = subtotalLength * gradient;

  return { diameter: d, flow: resolvedFlow, lFaucet, lTee, lStopcock, lMeter, lCheck, lGate, subtotalLength, gradient, loss };
}

/* 区間ラベル：①、①～②、②～③…と自動採番（21区間目以降は "(21)" のように括弧数字） */
const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
function circledNumber(n) {
  return n >= 1 && n <= CIRCLED_NUMBERS.length ? CIRCLED_NUMBERS[n - 1] : `(${n})`;
}
function sectionLabel(rowIndex) {
  return rowIndex === 0 ? circledNumber(1) : `${circledNumber(rowIndex)}～${circledNumber(rowIndex + 1)}`;
}

const hydraulicCalc = {
  num,
  clampFloorCount,
  EQUIV_LENGTH_LIST,
  HW_COEFF,
  equivLength,
  blHouseholdFlowLps,
  resolveBlFlow,
  computeGradient,
  calcBlRow,
  circledNumber,
  sectionLabel,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = hydraulicCalc;
} else {
  window.hydraulicCalc = hydraulicCalc;
}
