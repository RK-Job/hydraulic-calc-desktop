"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  openFile: () => ipcRenderer.invoke("open-file"),
  exportExcel: (data) => ipcRenderer.invoke("export-excel", data),
  exportPdf: () => ipcRenderer.invoke("export-pdf"),
});

ipcRenderer.on("menu-save-file", () => {
  document.getElementById("saveBtn")?.click();
});
ipcRenderer.on("menu-open-file", () => {
  document.getElementById("openBtn")?.click();
});
ipcRenderer.on("menu-export-excel", () => {
  document.getElementById("exportExcelBtn")?.click();
});
