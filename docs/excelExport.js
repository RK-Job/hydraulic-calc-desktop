"use strict";

(function () {
const { num, clampFloorCount, calcBlRow, sectionLabel } = window.hydraulicCalc;
const ExcelJS = window.ExcelJS;

const THIN = { style: "thin" };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDFE8F2" } };
const CALC_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

function styleCell(cell, opts = {}) {
  cell.border = BORDER_ALL;
  cell.alignment = { vertical: "middle", horizontal: opts.align || "center", wrapText: true };
  if (opts.header) cell.fill = HEADER_FILL;
  if (opts.calc) cell.fill = CALC_FILL;
  if (opts.bold) cell.font = { bold: true };
}

function currentFloorCount(data) {
  return clampFloorCount(data.floorCount);
}

function buildFlowSheet(workbook, data) {
  const sheet = workbook.addWorksheet("①設計流量の算定", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const floors = currentFloorCount(data);
  const totalCols = 2 + (floors + 1) * 2 + 2; // 用途,使用水量, 水栓(floors+計), 流量A, 同時使用(floors+計), 流量E
  sheet.columns = new Array(totalCols).fill({ width: 10 });
  sheet.getColumn(1).width = 16;

  let r = 1;
  sheet.mergeCells(r, 1, r, totalCols);
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = `水理計算書①（設計流量の算定）　工事名称：${data.projectName || ""}`;
  styleCell(titleCell, { header: true, bold: true, align: "left" });
  r++;

  sheet.mergeCells(r, 1, r, Math.floor(totalCols / 2));
  sheet.getCell(r, 1).value = `作成者：${data.author || ""}　　作成日：${data.createdDate || ""}`;
  sheet.getCell(r, 1).alignment = { horizontal: "left" };
  r++;
  sheet.getCell(r, 1).value = `階数：${data.floorCount || ""} 階建て　　用途・規模：${data.condition || ""}`;
  sheet.getCell(r, 1).alignment = { horizontal: "left" };
  r += 2;

  // 水栓個数表
  const headerRow1 = r;
  const headerRow2 = r + 1;
  sheet.mergeCells(headerRow1, 1, headerRow2, 1);
  sheet.getCell(headerRow1, 1).value = "用途";
  sheet.mergeCells(headerRow1, 2, headerRow2, 2);
  sheet.getCell(headerRow1, 2).value = "使用水量(l/分)";

  let c = 3;
  sheet.mergeCells(headerRow1, c, headerRow1, c + floors);
  sheet.getCell(headerRow1, c).value = "水栓個数";
  for (let f = 1; f <= floors; f++) sheet.getCell(headerRow2, c + f - 1).value = `${f}F`;
  sheet.getCell(headerRow2, c + floors).value = "計";
  c += floors + 1;

  sheet.mergeCells(headerRow1, c, headerRow2, c);
  sheet.getCell(headerRow1, c).value = "流量(A)(l/分)";
  c += 1;

  const simulStart = c;
  sheet.mergeCells(headerRow1, c, headerRow1, c + floors);
  sheet.getCell(headerRow1, c).value = "同時使用箇所";
  for (let f = 1; f <= floors; f++) sheet.getCell(headerRow2, c + f - 1).value = `${f}F`;
  sheet.getCell(headerRow2, c + floors).value = "計";
  c += floors + 1;

  sheet.mergeCells(headerRow1, c, headerRow2, c);
  sheet.getCell(headerRow1, c).value = "流量(E)(l/分)";

  for (let row = headerRow1; row <= headerRow2; row++) {
    for (let col = 1; col <= totalCols; col++) styleCell(sheet.getCell(row, col), { header: true, bold: true });
  }
  r = headerRow2 + 1;

  const useFloorSums = new Array(floors).fill(0);
  const simulFloorSums = new Array(floors).fill(0);
  let sumI = 0, sumK = 0, sumM = 0, sumR = 0;

  (data.fixtures || []).forEach((f) => {
    const usage = num(f.usage);
    let colIdx = 1;
    styleCell(sheet.getCell(r, colIdx), { align: "left" });
    sheet.getCell(r, colIdx).value = f.name || "";
    colIdx++;
    styleCell(sheet.getCell(r, colIdx));
    sheet.getCell(r, colIdx).value = f.usage === "" ? "" : usage;
    colIdx++;

    let total = 0;
    for (let i = 0; i < floors; i++) {
      const v = num((f.useValues || [])[i]);
      total += v;
      useFloorSums[i] += v;
      styleCell(sheet.getCell(r, colIdx));
      sheet.getCell(r, colIdx).value = v || "";
      colIdx++;
    }
    styleCell(sheet.getCell(r, colIdx), { calc: true });
    sheet.getCell(r, colIdx).value = total || "";
    colIdx++;

    const flowA = usage * total;
    styleCell(sheet.getCell(r, colIdx), { calc: true });
    sheet.getCell(r, colIdx).value = flowA ? Math.round(flowA * 10) / 10 : "";
    colIdx++;

    let stotal = 0;
    for (let i = 0; i < floors; i++) {
      const v = num((f.simulValues || [])[i]);
      stotal += v;
      simulFloorSums[i] += v;
      styleCell(sheet.getCell(r, colIdx));
      sheet.getCell(r, colIdx).value = v || "";
      colIdx++;
    }
    styleCell(sheet.getCell(r, colIdx), { calc: true });
    sheet.getCell(r, colIdx).value = stotal || "";
    colIdx++;

    const flowE = usage * stotal;
    styleCell(sheet.getCell(r, colIdx), { calc: true });
    sheet.getCell(r, colIdx).value = flowE ? Math.round(flowE * 10) / 10 : "";

    sumI += total; sumK += flowA; sumM += stotal; sumR += flowE;
    r++;
  });

  // 合計行
  sheet.mergeCells(r, 1, r, 2);
  sheet.getCell(r, 1).value = "合　　　計";
  styleCell(sheet.getCell(r, 1), { header: true, bold: true });
  styleCell(sheet.getCell(r, 2), { header: true, bold: true });
  let cc = 3;
  for (let f = 0; f < floors; f++) {
    styleCell(sheet.getCell(r, cc), { header: true, bold: true });
    sheet.getCell(r, cc).value = useFloorSums[f] || "";
    cc++;
  }
  styleCell(sheet.getCell(r, cc), { header: true, bold: true });
  sheet.getCell(r, cc).value = sumI || "";
  cc++;
  styleCell(sheet.getCell(r, cc), { header: true, bold: true });
  sheet.getCell(r, cc).value = Math.round(sumK * 10) / 10;
  cc++;
  for (let f = 0; f < floors; f++) {
    styleCell(sheet.getCell(r, cc), { header: true, bold: true });
    sheet.getCell(r, cc).value = simulFloorSums[f] || "";
    cc++;
  }
  styleCell(sheet.getCell(r, cc), { header: true, bold: true });
  sheet.getCell(r, cc).value = sumM || "";
  cc++;
  styleCell(sheet.getCell(r, cc), { header: true, bold: true });
  sheet.getCell(r, cc).value = Math.round(sumR * 10) / 10;
  r += 2;

  const qLmin = sumM > 0 ? sumR / sumM : 0;
  const qLsec = qLmin / 60;
  const simult = num(data.simultaneousFixtures);
  const totalQ = qLsec * simult;

  sheet.getCell(r, 1).value = "③ 平均使用流量（ｑ）";
  sheet.getCell(r, 1).font = { bold: true };
  r++;
  sheet.getCell(r, 1).value = `Ａ（又はＥ）：${sumR.toFixed(1)} l/分 ÷ ${sumM || 0} ＝ ${qLmin.toFixed(2)} l/分 ÷ 60 ＝ ${qLsec.toFixed(3)} l/秒`;
  r += 2;

  sheet.getCell(r, 1).value = "④ 総流量（Ｑ）";
  sheet.getCell(r, 1).font = { bold: true };
  r++;
  sheet.getCell(r, 1).value = `平均使用流量（ｑ）${qLsec.toFixed(3)} l/秒 × 同時使用水栓（${simult || 0}）＝ ${totalQ.toFixed(3)} l/秒`;
  r += 2;

  sheet.getCell(r, 1).value = `∴ 設計流量　${totalQ.toFixed(3)} l/秒 と決定する`;
  sheet.getCell(r, 1).font = { bold: true, size: 12 };
  r += 2;

  sheet.getCell(r, 1).value = "⑤ メーター口径の判定（25mm以下）";
  sheet.getCell(r, 1).font = { bold: true };
  r++;
  sheet.getCell(r, 1).value = `同時使用水栓数 ${simult || 0} 栓　／　同時使用水量 ${(qLmin * simult).toFixed(1)} l/分`;
}

function buildBlSheet(workbook, data) {
  const sheet = workbook.addWorksheet("②ＢＬ水理計算書", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const headers = [
    "区間", "口径(mm)", "流量(L/S)", "戸数から算定(戸)", "実長(m)",
    "給水栓 個数", "給水栓 換算長", "割丁字管 個数", "割丁字管 換算長",
    "止水栓 個数", "止水栓 換算長", "量水器 個数", "量水器 換算長",
    "逆止弁 個数", "逆止弁 換算長", "仕切弁 個数", "仕切弁 換算長",
    "小計(m)", "動水勾配Ｉ", "損失水頭ｈ(ｍ)",
  ];
  sheet.columns = headers.map((h) => ({ header: h, width: 10 }));
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => styleCell(cell, { header: true, bold: true }));

  let sumLoss = 0;
  (data.blRows || []).forEach((b, idx) => {
    const households = num(b.households);
    const { diameter, flow, lFaucet, lTee, lStopcock, lMeter, lCheck, lGate, subtotalLength, gradient, loss } = calcBlRow(b);
    const nFaucet = num(b.nFaucet), nTee = num(b.nTee), nStopcock = num(b.nStopcock);
    const nMeter = num(b.nMeter), nCheck = num(b.nCheck), nGate = num(b.nGate);
    sumLoss += loss;

    const row = sheet.addRow([
      sectionLabel(idx), diameter || "", flow ? flow.toFixed(3) : "", households || "", num(b.length) || "",
      nFaucet || "", lFaucet || "", nTee || "", lTee || "",
      nStopcock || "", lStopcock || "", nMeter || "", lMeter || "",
      nCheck || "", lCheck || "", nGate || "", lGate || "",
      subtotalLength ? Math.round(subtotalLength * 100) / 100 : "",
      gradient ? Math.round(gradient * 10000) / 10000 : "",
      loss ? Math.round(loss * 1000) / 1000 : "",
    ]);
    row.eachCell((cell) => styleCell(cell));
  });

  const withSafety = sumLoss * 1.1;
  const subtotalRow = sheet.addRow(["損失水頭 小計", ...new Array(18).fill(""), sumLoss.toFixed(3) + " m"]);
  subtotalRow.eachCell((cell) => styleCell(cell, { header: true, bold: true }));
  const safetyRow = sheet.addRow(["安全率(10%)加算後", ...new Array(18).fill(""), withSafety.toFixed(3) + " m"]);
  safetyRow.eachCell((cell) => styleCell(cell, { header: true, bold: true }));

  const minHead = num(data.minHead);
  const maxFixtureHeight = num(data.maxFixtureHeight);
  const minRequiredHead = num(data.minRequiredHead);
  const sum = withSafety + maxFixtureHeight + minRequiredHead;

  sheet.addRow([]);
  const judgeRow = sheet.addRow([
    `判定：最小動水頭 ${minHead} m ≧ 損失水頭 ${withSafety.toFixed(3)} ＋ 最高位給水栓高 ${maxFixtureHeight} ＋ 最低確保水頭 ${minRequiredHead} ＝ ${sum.toFixed(3)} m　→　${minHead >= sum ? "OK（適合）" : "NG（不適合）"}`,
  ]);
  judgeRow.getCell(1).font = { bold: true };
}

async function buildWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "水理計算書作成アプリ";
  workbook.created = new Date();
  buildFlowSheet(workbook, data);
  buildBlSheet(workbook, data);
  return workbook;
}

window.hydraulicExcelExport = { buildWorkbook };
})();
