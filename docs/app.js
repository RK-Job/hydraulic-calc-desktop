"use strict";

/* ============================================================
   タブ切替
   ============================================================ */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* 印刷時、ＢＬ水理計算書の各ページ先頭タイトル行に工事名称を反映 */
document.getElementById("projectName").addEventListener("input", (e) => {
  document.getElementById("printProjectName").textContent = e.target.value;
});

/* ============================================================
   ①設計流量の算定
   使用水量(l/分)は「表２－４」の標準値をデフォルトとして表示。
   水栓個数・同時使用箇所数はユーザーが入力する。
   ============================================================ */
const FIXTURES = [
  { name: "台所流し", usage: 12 },
  { name: "洗濯機", usage: 12 },
  { name: "大便器（ＬＴ）", usage: 12 },
  { name: "小便器", usage: 3 },
  { name: "浴槽", usage: 20 },
  { name: "シャワー", usage: 8 },
  { name: "洗面器", usage: 8 },
  { name: "散水", usage: 15 },
  { name: "掃除流し", usage: 20 },
  { name: "手洗い", usage: 5 },
  { name: "ガス給湯器", usage: 12 },
  { name: "", usage: "" },
  { name: "", usage: "" },
  { name: "", usage: "" },
];

const fixtureTbody = document.querySelector("#fixtureTable tbody");
const floorCountInput = document.getElementById("floorCount");

function currentFloorCount() {
  return clampFloorCount(floorCountInput.value);
}

/* 階数分の水栓個数／同時使用箇所 入力セルを生成（既存値があれば引き継ぐ） */
function buildFloorCells(groupClass, floors, existingValues) {
  let html = "";
  for (let f = 1; f <= floors; f++) {
    const val = existingValues && existingValues[f - 1] !== undefined ? existingValues[f - 1] : "";
    html += `<td><input type="number" class="${groupClass}" data-floor="${f}" min="0" step="1" value="${val}"></td>`;
  }
  html += `<td class="calc ${groupClass}-total">0</td>`;
  return html;
}

function buildFixtureRow(f, floors, useValues, simulValues) {
  return `
    <td><input type="text" class="f-name" value="${f.name}" placeholder="用途"></td>
    <td><input type="number" class="f-usage" value="${f.usage}" step="0.1"></td>
    ${buildFloorCells("f-use", floors, useValues)}
    <td class="calc f-flowA">0</td>
    ${buildFloorCells("f-simul", floors, simulValues)}
    <td class="calc f-flowE">0</td>
  `;
}

FIXTURES.forEach((f, idx) => {
  const tr = document.createElement("tr");
  tr.dataset.row = idx;
  tr.innerHTML = buildFixtureRow(f, currentFloorCount());
  fixtureTbody.appendChild(tr);
});

/* 見出し行・合計行を現在の階数に合わせて再生成し、入力値は保持する */
function rebuildFixtureFloors() {
  const floors = currentFloorCount();

  document.getElementById("useGroupHeader").colSpan = floors + 1;
  document.getElementById("simulGroupHeader").colSpan = floors + 1;

  let floorHeaderHtml = "";
  for (let g = 0; g < 2; g++) {
    for (let f = 1; f <= floors; f++) floorHeaderHtml += `<th>${f}F</th>`;
    floorHeaderHtml += "<th>計</th>";
  }
  document.getElementById("fixtureFloorHeaderRow").innerHTML = floorHeaderHtml;

  fixtureTbody.querySelectorAll("tr").forEach((tr) => {
    const name = tr.querySelector(".f-name").value;
    const usage = tr.querySelector(".f-usage").value;
    const useValues = Array.from(tr.querySelectorAll(".f-use")).map((el) => el.value);
    const simulValues = Array.from(tr.querySelectorAll(".f-simul")).map((el) => el.value);
    tr.innerHTML = buildFixtureRow({ name, usage }, floors, useValues, simulValues);
  });

  const totalRow = document.getElementById("fixtureTotalRow");
  totalRow.querySelectorAll(".floor-total-cell").forEach((el) => el.remove());
  let footerHtml = "";
  for (let f = 1; f <= floors; f++) footerHtml += `<td class="calc floor-total-cell" data-sum-group="use" data-floor="${f}"></td>`;
  footerHtml += `<td class="calc floor-total-cell" data-sum="I"></td>`;
  footerHtml += `<td class="calc floor-total-cell" data-sum="K">（Ｊ）</td>`;
  for (let f = 1; f <= floors; f++) footerHtml += `<td class="calc floor-total-cell" data-sum-group="simul" data-floor="${f}"></td>`;
  footerHtml += `<td class="calc floor-total-cell" data-sum="M">（Ｍ）</td>`;
  footerHtml += `<td class="calc floor-total-cell" data-sum="R">（Ｑ）</td>`;
  totalRow.insertAdjacentHTML("beforeend", footerHtml);

  recalcFixtureTable();
}

function recalcFixtureTable() {
  const floors = currentFloorCount();
  const useFloorSums = new Array(floors).fill(0);
  const simulFloorSums = new Array(floors).fill(0);
  let sumI = 0, sumK = 0, sumM = 0, sumR = 0;

  fixtureTbody.querySelectorAll("tr").forEach((tr) => {
    const usage = num(tr.querySelector(".f-usage").value);
    const useInputs = Array.from(tr.querySelectorAll(".f-use"));
    const simulInputs = Array.from(tr.querySelectorAll(".f-simul"));

    let total = 0;
    useInputs.forEach((el, i) => {
      const v = num(el.value);
      total += v;
      useFloorSums[i] += v;
    });
    const flowA = usage * total;

    let stotal = 0;
    simulInputs.forEach((el, i) => {
      const v = num(el.value);
      stotal += v;
      simulFloorSums[i] += v;
    });
    const flowE = usage * stotal;

    tr.querySelector(".f-use-total").textContent = total || "";
    tr.querySelector(".f-flowA").textContent = flowA ? flowA.toFixed(1) : "";
    tr.querySelector(".f-simul-total").textContent = stotal || "";
    tr.querySelector(".f-flowE").textContent = flowE ? flowE.toFixed(1) : "";

    sumI += total; sumK += flowA;
    sumM += stotal; sumR += flowE;
  });

  const totalRow = document.getElementById("fixtureTotalRow");
  totalRow.querySelectorAll('[data-sum-group="use"]').forEach((el) => {
    const f = parseInt(el.dataset.floor, 10);
    el.textContent = useFloorSums[f - 1] || "";
  });
  totalRow.querySelectorAll('[data-sum-group="simul"]').forEach((el) => {
    const f = parseInt(el.dataset.floor, 10);
    el.textContent = simulFloorSums[f - 1] || "";
  });
  totalRow.querySelector('[data-sum="I"]').textContent = sumI || "";
  totalRow.querySelector('[data-sum="K"]').textContent = "（Ｊ）" + sumK.toFixed(1);
  totalRow.querySelector('[data-sum="M"]').textContent = "（Ｍ）" + sumM;
  totalRow.querySelector('[data-sum="R"]').textContent = "（Ｑ）" + sumR.toFixed(1);

  // ③ 平均使用流量（ｑ）＝ ΣＲ（Ｅ）÷ ΣＭ（Ｃ）
  document.getElementById("sumA").textContent = sumR.toFixed(1);
  document.getElementById("sumB").textContent = sumM || "0";
  const qLmin = sumM > 0 ? sumR / sumM : 0;
  document.getElementById("qLmin").textContent = qLmin.toFixed(2);
  const qLsec = qLmin / 60;
  document.getElementById("qLsec").textContent = qLsec.toFixed(3);
  document.getElementById("qLsec2").textContent = qLsec.toFixed(3);

  // ④ 総流量（Ｑ）＝ ｑ × 同時使用水栓数
  const simult = num(document.getElementById("simultaneousFixtures").value);
  document.getElementById("simultFixtures2").textContent = simult || "0";
  const totalQ = qLsec * simult;
  document.getElementById("totalQ").textContent = totalQ.toFixed(3);

  document.getElementById("designFlow").textContent = totalQ.toFixed(3);

  updateMeterJudge(simult, qLmin * simult);
  if (typeof recalcPumpTab === "function") recalcPumpTab();
}

/* ============================================================
   ⑤ メーター口径の判定
   ※出典：大分市上下水道局「給水装置テキスト2017」第2章第5節
   　表２－１３ 同時使用水栓数及び同時使用水量における適正メーター口径（P.2-45）
   　25mm以下のみ対応。40mm以上は表２－１４（受水槽式）で個別判定が必要。
   ============================================================ */
const METER_RULES = [
  { taps: 1, diameter: 13, qMax: 12 },
  { taps: 2, diameter: 13, qMax: 24 },
  { taps: 3, diameter: 20, qMax: 36 },
  { taps: 4, diameter: 25, qMax: 48 },
];

function updateMeterJudge(taps, qLmin) {
  document.getElementById("meterTaps").textContent = taps || "0";
  document.getElementById("meterQLmin").textContent = qLmin ? qLmin.toFixed(1) : "0";

  const diameterEl = document.getElementById("meterDiameter");
  const noteEl = document.getElementById("meterNote");

  if (!taps) {
    diameterEl.textContent = "-";
    noteEl.textContent = "";
    return;
  }

  let rule = METER_RULES.find((r) => taps <= r.taps);

  if (!rule) {
    diameterEl.textContent = "要個別判定";
    noteEl.textContent = "同時使用水栓数が5栓以上のため、表２－１４（受水槽式）等により40mm以上のメーターを個別に判定してください。";
    return;
  }

  // 同時使用水栓数の基準は満たすが、水量が基準を超える場合は一段階上のメーターを提案
  while (rule && qLmin > rule.qMax) {
    const next = METER_RULES.find((r) => r.diameter > rule.diameter);
    rule = next || null;
  }

  if (!rule) {
    diameterEl.textContent = "要個別判定";
    noteEl.textContent = "同時使用水量が基準（36〜48 l/分）を超えるため、表２－１４（受水槽式）等により40mm以上のメーターを個別に判定してください。";
    return;
  }

  diameterEl.textContent = rule.diameter + " mm";
  noteEl.textContent = "";
}

fixtureTbody.addEventListener("input", recalcFixtureTable);
document.getElementById("simultaneousFixtures").addEventListener("input", recalcFixtureTable);
floorCountInput.addEventListener("change", rebuildFixtureFloors);

/* ============================================================
   ②ＢＬ水理計算書
   器具換算長リスト・動水勾配・損失水頭の計算ロジックは shared/calc.js を参照。
   ※出典：大分市上下水道局「給水装置テキスト2017」第2章第5節
   　表２－１１ 各種給水器具類の損失水頭の直管換算長（P.2-44）
   　https://www.city.oita.oita.jp/o224/kurashi/suidogesuido/1493008670287.html
   　（給水栓＝表の「給水栓」、割丁字管＝「割丁字管」、止水栓＝「甲止水栓」、
   　　量水器＝「量水器」、逆止弁＝「ボール式止水栓」、仕切弁＝「Ｇ・Ｖ」で読替）
   ============================================================ */
const blTbody = document.querySelector("#blTable tbody");
const diameterOptions = Object.keys(window.hydraulicCalc.EQUIV_LENGTH_LIST)
  .map((d) => `<option value="${d}">${d}</option>`)
  .join("");

function addBlRow(rowIndex) {
  const tr = document.createElement("tr");
  tr.dataset.row = rowIndex;
  tr.innerHTML = `
    <td class="b-label">${sectionLabel(rowIndex)}</td>
    <td><select class="b-diameter"><option value="">-</option>${diameterOptions}</select></td>
    <td><input type="number" class="b-flow" step="0.001" min="0"></td>
    <td><input type="number" class="b-households" min="0" step="1" title="給水戸数を入力すると流量(L/S)にＢＬ算定式の計算結果を自動反映します"></td>
    <td><input type="number" class="b-length" step="0.1" min="0"></td>
    <td><input type="number" class="b-n-faucet" min="0" step="1"></td>
    <td class="calc b-l-faucet">-</td>
    <td><input type="number" class="b-n-tee" min="0" step="1"></td>
    <td class="calc b-l-tee">-</td>
    <td><input type="number" class="b-n-stopcock" min="0" step="1"></td>
    <td class="calc b-l-stopcock">-</td>
    <td><input type="number" class="b-n-meter" min="0" step="1"></td>
    <td class="calc b-l-meter">-</td>
    <td><input type="number" class="b-n-check" min="0" step="1"></td>
    <td class="calc b-l-check">-</td>
    <td><input type="number" class="b-n-gate" min="0" step="1"></td>
    <td class="calc b-l-gate">-</td>
    <td class="calc b-subtotal">-</td>
    <td class="calc b-gradient">-</td>
    <td class="calc b-loss">-</td>
  `;
  blTbody.appendChild(tr);
  return tr;
}

function isBlRowEmpty(tr) {
  const fields = [
    ".b-diameter", ".b-flow", ".b-households", ".b-length",
    ".b-n-faucet", ".b-n-tee", ".b-n-stopcock", ".b-n-meter", ".b-n-check", ".b-n-gate",
  ];
  return fields.every((sel) => !tr.querySelector(sel).value);
}

/* 入力済みの区間＋１行（空行）だけを表示する（区間は事実上無制限） */
function ensureBlRowCount() {
  const rows = Array.from(blTbody.querySelectorAll("tr"));
  let lastFilledIndex = -1;
  rows.forEach((tr, i) => {
    if (!isBlRowEmpty(tr)) lastFilledIndex = i;
  });

  const targetCount = Math.max(lastFilledIndex + 2, 1);

  if (rows.length < targetCount) {
    for (let i = rows.length; i < targetCount; i++) addBlRow(i);
  } else if (rows.length > targetCount) {
    for (let i = rows.length - 1; i >= targetCount; i--) {
      rows[i].remove();
    }
  }
}

addBlRow(0);

function recalcBlTable() {
  let sumLoss = 0;

  blTbody.querySelectorAll("tr").forEach((tr) => {
    const households = num(tr.querySelector(".b-households").value);
    const flowInput = tr.querySelector(".b-flow");
    const result = calcBlRow({
      diameter: tr.querySelector(".b-diameter").value,
      households,
      flow: flowInput.value,
      length: tr.querySelector(".b-length").value,
      nFaucet: tr.querySelector(".b-n-faucet").value,
      nTee: tr.querySelector(".b-n-tee").value,
      nStopcock: tr.querySelector(".b-n-stopcock").value,
      nMeter: tr.querySelector(".b-n-meter").value,
      nCheck: tr.querySelector(".b-n-check").value,
      nGate: tr.querySelector(".b-n-gate").value,
    });

    if (households > 0) flowInput.value = result.flow.toFixed(3);

    tr.querySelector(".b-l-faucet").textContent = result.lFaucet || "-";
    tr.querySelector(".b-l-tee").textContent = result.lTee || "-";
    tr.querySelector(".b-l-stopcock").textContent = result.lStopcock || "-";
    tr.querySelector(".b-l-meter").textContent = result.lMeter || "-";
    tr.querySelector(".b-l-check").textContent = result.lCheck || "-";
    tr.querySelector(".b-l-gate").textContent = result.lGate || "-";
    tr.querySelector(".b-subtotal").textContent = result.subtotalLength ? result.subtotalLength.toFixed(2) : "-";
    tr.querySelector(".b-gradient").textContent = result.gradient ? result.gradient.toFixed(4) : "-";
    tr.querySelector(".b-loss").textContent = result.loss ? result.loss.toFixed(3) : "-";

    sumLoss += result.loss;
  });

  document.getElementById("blSubtotal").textContent = sumLoss.toFixed(3) + " m";
  const withSafety = sumLoss * 1.1;
  document.getElementById("blWithSafety").textContent = withSafety.toFixed(3) + " m";

  document.getElementById("lossHead").textContent = withSafety.toFixed(3);
  updateJudge();
  if (typeof recalcPumpTab === "function") recalcPumpTab();
}

function updateJudge() {
  const minHead = num(document.getElementById("minHead").value);
  const lossHead = num(document.getElementById("lossHead").textContent);
  const maxFixtureHeight = num(document.getElementById("maxFixtureHeight").value);
  const minRequiredHead = num(document.getElementById("minRequiredHead").value);

  const sum = lossHead + maxFixtureHeight + minRequiredHead;
  document.getElementById("judgeSum").textContent = sum.toFixed(3);

  const resultEl = document.getElementById("judgeResult");
  if (minHead >= sum) {
    resultEl.textContent = "OK（適合）";
    resultEl.className = "judge-result ok";
  } else {
    resultEl.textContent = "NG（不適合）";
    resultEl.className = "judge-result ng";
  }
}

function handleBlTableChange() {
  ensureBlRowCount();
  recalcBlTable();
}

blTbody.addEventListener("input", handleBlTableChange);
blTbody.addEventListener("change", handleBlTableChange);
["minHead", "maxFixtureHeight", "minRequiredHead"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateJudge);
});

/* ============================================================
   印刷
   ============================================================ */
document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});

/* ============================================================
   Excel出力(.xlsx)
   ============================================================ */
function collectFormData() {
  const fixtures = Array.from(fixtureTbody.querySelectorAll("tr")).map((tr) => ({
    name: tr.querySelector(".f-name").value,
    usage: tr.querySelector(".f-usage").value,
    useValues: Array.from(tr.querySelectorAll(".f-use")).map((el) => el.value),
    simulValues: Array.from(tr.querySelectorAll(".f-simul")).map((el) => el.value),
  }));

  const blRows = Array.from(blTbody.querySelectorAll("tr")).map((tr) => ({
    diameter: tr.querySelector(".b-diameter").value,
    flow: tr.querySelector(".b-flow").value,
    households: tr.querySelector(".b-households").value,
    length: tr.querySelector(".b-length").value,
    nFaucet: tr.querySelector(".b-n-faucet").value,
    nTee: tr.querySelector(".b-n-tee").value,
    nStopcock: tr.querySelector(".b-n-stopcock").value,
    nMeter: tr.querySelector(".b-n-meter").value,
    nCheck: tr.querySelector(".b-n-check").value,
    nGate: tr.querySelector(".b-n-gate").value,
  }));

  return {
    formatVersion: 1,
    projectName: document.getElementById("projectName").value,
    author: document.getElementById("author").value,
    createdDate: document.getElementById("createdDate").value,
    floorCount: floorCountInput.value,
    condition: document.getElementById("condition").value,
    simultaneousFixtures: document.getElementById("simultaneousFixtures").value,
    fixtures,
    minHead: document.getElementById("minHead").value,
    maxFixtureHeight: document.getElementById("maxFixtureHeight").value,
    minRequiredHead: document.getElementById("minRequiredHead").value,
    blRows,
    pumpFlowSource: document.querySelector('input[name="pumpFlowSource"]:checked').value,
    pumpFlowManual: document.getElementById("pumpFlowManual").value,
    pumpLossFromBl: document.getElementById("pumpLossFromBl").checked,
    pumpLossManual: document.getElementById("pumpLossManual").value,
    pumpStaticHead: document.getElementById("pumpStaticHead").value,
    pumpRequiredPressure: document.getElementById("pumpRequiredPressure").value,
    pumpMargin: document.getElementById("pumpMargin").value,
    fuTotalSource: document.querySelector('input[name="fuTotalSource"]:checked').value,
    fuTotal: document.getElementById("fuTotal").value,
    fuCurve: document.querySelector('input[name="fuCurve"]:checked').value,
    fuFixtures: Array.from(fuFixtureTbody.querySelectorAll("tr")).map((tr) => ({
      name: tr.querySelector(".fu-name").value,
      fuValue: tr.querySelector(".fu-value").value,
      countValues: Array.from(tr.querySelectorAll(".fu-count")).map((el) => el.value),
    })),
  };
}

function applyFormData(data) {
  if (!data) return;

  document.getElementById("projectName").value = data.projectName || "";
  document.getElementById("printProjectName").textContent = data.projectName || "";
  document.getElementById("author").value = data.author || "";
  document.getElementById("createdDate").value = data.createdDate || "";
  document.getElementById("condition").value = data.condition || "";
  document.getElementById("simultaneousFixtures").value = data.simultaneousFixtures || "";

  floorCountInput.value = data.floorCount || 3;
  rebuildFixtureFloors();

  const rows = Array.from(fixtureTbody.querySelectorAll("tr"));
  (data.fixtures || []).forEach((f, i) => {
    const tr = rows[i];
    if (!tr) return;
    tr.querySelector(".f-name").value = f.name || "";
    tr.querySelector(".f-usage").value = f.usage || "";
    Array.from(tr.querySelectorAll(".f-use")).forEach((el, fi) => {
      el.value = (f.useValues && f.useValues[fi]) || "";
    });
    Array.from(tr.querySelectorAll(".f-simul")).forEach((el, fi) => {
      el.value = (f.simulValues && f.simulValues[fi]) || "";
    });
  });

  document.getElementById("minHead").value = data.minHead || 20;
  document.getElementById("maxFixtureHeight").value = data.maxFixtureHeight || 10;
  document.getElementById("minRequiredHead").value = data.minRequiredHead || 5;

  blTbody.innerHTML = "";
  (data.blRows || [{}]).forEach((b, i) => {
    const tr = addBlRow(i);
    tr.querySelector(".b-diameter").value = b.diameter || "";
    tr.querySelector(".b-flow").value = b.flow || "";
    tr.querySelector(".b-households").value = b.households || "";
    tr.querySelector(".b-length").value = b.length || "";
    tr.querySelector(".b-n-faucet").value = b.nFaucet || "";
    tr.querySelector(".b-n-tee").value = b.nTee || "";
    tr.querySelector(".b-n-stopcock").value = b.nStopcock || "";
    tr.querySelector(".b-n-meter").value = b.nMeter || "";
    tr.querySelector(".b-n-check").value = b.nCheck || "";
    tr.querySelector(".b-n-gate").value = b.nGate || "";
  });
  ensureBlRowCount();

  const flowSourceValue = data.pumpFlowSource || "design";
  const flowSourceIdMap = { bl: "pumpFlowSrcBl", fu: "pumpFlowSrcFu", manual: "pumpFlowSrcManual", design: "pumpFlowSrcDesign" };
  document.getElementById(flowSourceIdMap[flowSourceValue] || "pumpFlowSrcDesign").checked = true;
  document.getElementById("pumpFlowManual").value = data.pumpFlowManual || "";
  document.getElementById("pumpLossFromBl").checked = data.pumpLossFromBl !== false;
  document.getElementById("pumpLossManual").value = data.pumpLossManual || 0;
  document.getElementById("pumpStaticHead").value = data.pumpStaticHead || 0;
  document.getElementById("pumpRequiredPressure").value = data.pumpRequiredPressure || 0;
  document.getElementById("pumpMargin").value = data.pumpMargin || 10;

  document.getElementById(data.fuTotalSource === "manual" ? "fuTotalSrcManual" : "fuTotalSrcTable").checked = true;
  document.getElementById("fuTotal").value = data.fuTotal || "";
  document.getElementById(data.fuCurve === "tank" ? "fuCurveTank" : "fuCurveValve").checked = true;

  rebuildFuFixtureFloors();
  const fuRows = Array.from(fuFixtureTbody.querySelectorAll("tr"));
  (data.fuFixtures || []).forEach((f, i) => {
    const tr = fuRows[i];
    if (!tr) return;
    tr.querySelector(".fu-name").value = f.name || "";
    tr.querySelector(".fu-value").value = f.fuValue || "";
    Array.from(tr.querySelectorAll(".fu-count")).forEach((el, fi) => {
      el.value = (f.countValues && f.countValues[fi]) || "";
    });
  });

  recalcFixtureTable();
  recalcBlTable();
  recalcFuTab();
  recalcPumpTab();
}

document.getElementById("exportExcelBtn").addEventListener("click", async () => {
  try {
    const workbook = await hydraulicExcelExport.buildWorkbook(collectFormData());
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "水理計算書.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Excel出力に失敗しました: " + err.message);
  }
});

/* ============================================================
   ③ＦＵ法流量算定
   器具表（タブ①と同じ階数）から合計ＦＵ値を集計し、器具構成
   （洗浄弁／洗浄タンク）に応じて shared/calc.js の換算表
   （fuFlowLmin）から瞬時最大流量を求める。合計ＦＵ値は器具表からの
   集計に代えて直接入力することもできる。
   ============================================================ */
/* ＦＵ初期値（私室用）出典：「建築設備設計基準」（令和6年版）P.37
   器具給水負荷単位表。reference/fu_fixture_units_draft.csv で確認・修正した値。
   タブ①の用途名と対応しないもの（洗濯機・ガス給湯器）は初期値なし（空欄）。 */
const FU_PRESET_BY_NAME = {
  "台所流し": 3,
  "大便器（ＬＴ）": 3,
  "小便器": 3,
  "浴槽": 2,
  "シャワー": 2,
  "洗面器": 1,
  "散水": 5,
  "掃除流し": 3,
  "手洗い": 0.5,
};
const FU_FIXTURE_ROWS = 8;
const fuFixtureTbody = document.querySelector("#fuFixtureTable tbody");

function buildFuFixtureRow(name, fuValue, floors, countValues) {
  return `
    <td><input type="text" class="fu-name" value="${name || ""}" placeholder="用途"></td>
    <td><input type="number" class="fu-value" value="${fuValue || ""}" step="0.1" min="0"></td>
    ${buildFloorCells("fu-count", floors, countValues)}
    <td class="calc fu-subtotal">-</td>
  `;
}

function rebuildFuFixtureFloors() {
  const floors = currentFloorCount();
  document.getElementById("fuFloorCountPreview").textContent = floors;
  document.getElementById("fuGroupHeader").colSpan = floors + 1;

  let floorHeaderHtml = "";
  for (let f = 1; f <= floors; f++) floorHeaderHtml += `<th>${f}F</th>`;
  floorHeaderHtml += "<th>計</th>";
  document.getElementById("fuFloorHeaderRow").innerHTML = floorHeaderHtml;
  document.querySelector("#fuFixtureTotalRow td:first-child").colSpan = floors + 3;

  const rows = fuFixtureTbody.querySelectorAll("tr");
  if (rows.length === 0) {
    FIXTURES.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = buildFuFixtureRow(f.name, FU_PRESET_BY_NAME[f.name] || "", floors);
      fuFixtureTbody.appendChild(tr);
    });
    for (let i = FIXTURES.length; i < FU_FIXTURE_ROWS; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = buildFuFixtureRow("", "", floors);
      fuFixtureTbody.appendChild(tr);
    }
  } else {
    rows.forEach((tr) => {
      const name = tr.querySelector(".fu-name").value;
      const fuValue = tr.querySelector(".fu-value").value;
      const countValues = Array.from(tr.querySelectorAll(".fu-count")).map((el) => el.value);
      tr.innerHTML = buildFuFixtureRow(name, fuValue, floors, countValues);
    });
  }

  recalcFuTab();
}

function recalcFuFixtureTable() {
  let total = 0;
  fuFixtureTbody.querySelectorAll("tr").forEach((tr) => {
    const fuValue = num(tr.querySelector(".fu-value").value);
    let count = 0;
    tr.querySelectorAll(".fu-count").forEach((el) => { count += num(el.value); });
    tr.querySelector(".fu-count-total").textContent = count || "";
    const subtotal = fuValue * count;
    tr.querySelector(".fu-subtotal").textContent = subtotal ? subtotal.toFixed(1) : "-";
    total += subtotal;
  });
  document.getElementById("fuFixtureTotalCell").textContent = total.toFixed(1);
  return total;
}

function recalcFuTab() {
  const tableTotal = recalcFuFixtureTable();
  const source = document.querySelector('input[name="fuTotalSource"]:checked').value;
  const total = source === "manual" ? num(document.getElementById("fuTotal").value) : tableTotal;

  const curve = document.querySelector('input[name="fuCurve"]:checked').value;
  const flowLmin = total > 0 ? fuFlowLmin(total, curve) : 0;

  document.getElementById("fuFlowLmin").textContent = flowLmin ? flowLmin.toFixed(1) : "-";
  document.getElementById("fuFlowLps").textContent = flowLmin ? (flowLmin / 60).toFixed(3) : "-";

  if (typeof recalcPumpTab === "function") recalcPumpTab();
}

fuFixtureTbody.addEventListener("input", recalcFuTab);
document.getElementById("fuTotal").addEventListener("input", recalcFuTab);
document.querySelectorAll('input[name="fuTotalSource"]').forEach((el) => el.addEventListener("change", recalcFuTab));
document.querySelectorAll('input[name="fuCurve"]').forEach((el) => el.addEventListener("change", recalcFuTab));
floorCountInput.addEventListener("change", rebuildFuFixtureFloors);

function currentFuFlowLps() {
  return num(document.getElementById("fuFlowLps").textContent);
}

/* ============================================================
   ④ポンプ算定
   必要流量：①設計流量／②ＢＬ区間①流量／手入力 から選択
   損失水頭：②ＢＬ計算の合計（安全率込み）／手入力 から選択
   全揚程＝（損失水頭＋実揚程＋吐出側必要水頭）×（1＋余裕率）
   ============================================================ */
function currentDesignFlowLps() {
  return num(document.getElementById("designFlow").textContent);
}

function currentBlFirstRowFlowLps() {
  const firstRow = blTbody.querySelector("tr");
  return firstRow ? num(firstRow.querySelector(".b-flow").value) : 0;
}

function currentBlLossWithSafety() {
  return num(document.getElementById("blWithSafety").textContent);
}

function recalcPumpTab() {
  const designFlow = currentDesignFlowLps();
  const blFlow = currentBlFirstRowFlowLps();
  const fuFlow = currentFuFlowLps();
  document.getElementById("pumpFlowDesignPreview").textContent = designFlow ? designFlow.toFixed(3) : "-";
  document.getElementById("pumpFlowBlPreview").textContent = blFlow ? blFlow.toFixed(3) : "-";
  document.getElementById("pumpFlowFuPreview").textContent = fuFlow ? fuFlow.toFixed(3) : "-";

  const flowSource = document.querySelector('input[name="pumpFlowSource"]:checked').value;
  let flowLps;
  if (flowSource === "design") flowLps = designFlow;
  else if (flowSource === "bl") flowLps = blFlow;
  else if (flowSource === "fu") flowLps = fuFlow;
  else flowLps = num(document.getElementById("pumpFlowManual").value);

  const blLoss = currentBlLossWithSafety();
  document.getElementById("pumpLossBlPreview").textContent = blLoss ? blLoss.toFixed(3) : "-";

  const useBlLoss = document.getElementById("pumpLossFromBl").checked;
  const lossHead = useBlLoss ? blLoss : num(document.getElementById("pumpLossManual").value);

  const staticHead = num(document.getElementById("pumpStaticHead").value);
  const requiredPressure = num(document.getElementById("pumpRequiredPressure").value);
  const margin = num(document.getElementById("pumpMargin").value);

  document.getElementById("pumpLossEcho").textContent = lossHead.toFixed(3);
  document.getElementById("pumpStaticEcho").textContent = staticHead.toFixed(3);
  document.getElementById("pumpPressureEcho").textContent = requiredPressure.toFixed(3);
  document.getElementById("pumpMarginEcho").textContent = margin.toFixed(0);

  const totalHead = (lossHead + staticHead + requiredPressure) * (1 + margin / 100);
  document.getElementById("pumpTotalHead").textContent = totalHead.toFixed(3);

  document.getElementById("pumpFlowResultLps").textContent = flowLps.toFixed(3);
  document.getElementById("pumpFlowResultLmin").textContent = (flowLps * 60).toFixed(2);
}

document.querySelectorAll('input[name="pumpFlowSource"]').forEach((el) => el.addEventListener("change", recalcPumpTab));
["pumpFlowManual", "pumpLossFromBl", "pumpLossManual", "pumpStaticHead", "pumpRequiredPressure", "pumpMargin"].forEach((id) => {
  document.getElementById(id).addEventListener("input", recalcPumpTab);
});

/* ============================================================
   自動保存（ブラウザ／デスクトップ共通・localStorage）
   .sui保存/読込やExcel出力とは別に、入力内容を一定間隔で
   ブラウザのlocalStorageへ下書き保存し、再読込・再起動時に復元する。
   ============================================================ */
const AUTOSAVE_KEY = "hydraulicCalcAutosave";
const AUTOSAVE_DELAY_MS = 1000;
const autoSaveStatusEl = document.getElementById("autoSaveStatus");
let autoSaveTimer = null;

function formatClock(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function setAutoSaveStatus(text, statusClass) {
  if (!autoSaveStatusEl) return;
  autoSaveStatusEl.textContent = text;
  autoSaveStatusEl.className = "autosave-status" + (statusClass ? " " + statusClass : "");
}

function runAutoSave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(collectFormData()));
    setAutoSaveStatus("自動保存済み " + formatClock(new Date()), "saved");
  } catch (err) {
    setAutoSaveStatus("自動保存に失敗しました: " + err.message, "error");
  }
}

function scheduleAutoSave() {
  setAutoSaveStatus("編集中…", "pending");
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(runAutoSave, AUTOSAVE_DELAY_MS);
}

function restoreAutoSave() {
  let raw;
  try {
    raw = localStorage.getItem(AUTOSAVE_KEY);
  } catch (err) {
    return;
  }
  if (!raw) return;

  try {
    applyFormData(JSON.parse(raw));
    setAutoSaveStatus("前回の自動保存を復元しました", "saved");
  } catch (err) {
    setAutoSaveStatus("自動保存データの復元に失敗しました: " + err.message, "error");
  }
}

document.addEventListener("input", scheduleAutoSave);
document.addEventListener("change", scheduleAutoSave);

/* 初期計算 */
rebuildFixtureFloors();
ensureBlRowCount();
recalcBlTable();
rebuildFuFixtureFloors();
recalcPumpTab();
restoreAutoSave();
