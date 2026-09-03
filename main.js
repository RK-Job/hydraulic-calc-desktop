"use strict";

const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { buildWorkbook } = require("./excelExport");

let mainWindow;

const SUI_FILTER = [{ name: "水理計算書ファイル", extensions: ["sui"] }];
const XLSX_FILTER = [{ name: "Excelブック", extensions: ["xlsx"] }];
const PDF_FILTER = [{ name: "PDFファイル", extensions: ["pdf"] }];

async function saveFileToPath(win, data) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "保存",
    filters: SUI_FILTER,
    defaultPath: "水理計算書.sui",
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return { filePath };
}

async function openFileFromPath(win) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "開く",
    filters: SUI_FILTER,
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  const content = await fs.readFile(filePaths[0], "utf-8");
  return { data: JSON.parse(content) };
}

async function exportExcelToPath(win, data) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Excel出力",
    filters: XLSX_FILTER,
    defaultPath: "水理計算書.xlsx",
  });
  if (canceled || !filePath) return { canceled: true };
  const workbook = await buildWorkbook(data);
  await workbook.xlsx.writeFile(filePath);
  return { filePath };
}

async function exportPdfToPath(win) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "PDF出力",
    filters: PDF_FILTER,
    defaultPath: "水理計算書.pdf",
  });
  if (canceled || !filePath) return { canceled: true };
  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
    margins: { marginType: "none" },
  });
  await fs.writeFile(filePath, pdfBuffer);
  return { filePath };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  const menuTemplate = [
    {
      label: "ファイル",
      submenu: [
        { label: "開く", accelerator: "CmdOrCtrl+O", click: () => mainWindow.webContents.send("menu-open-file") },
        { label: "保存", accelerator: "CmdOrCtrl+S", click: () => mainWindow.webContents.send("menu-save-file") },
        { label: "Excel出力", click: () => mainWindow.webContents.send("menu-export-excel") },
        { type: "separator" },
        { role: "quit", label: "終了" },
      ],
    },
    { role: "editMenu", label: "編集" },
    { role: "viewMenu", label: "表示" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("save-file", async (event, data) => {
  try {
    return await saveFileToPath(mainWindow, data);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("open-file", async () => {
  try {
    return await openFileFromPath(mainWindow);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("export-excel", async (event, data) => {
  try {
    return await exportExcelToPath(mainWindow, data);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("export-pdf", async () => {
  try {
    return await exportPdfToPath(mainWindow);
  } catch (err) {
    return { error: err.message };
  }
});
