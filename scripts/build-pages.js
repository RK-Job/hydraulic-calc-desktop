"use strict";

/* GitHub Pages（docs/）向けに、ブラウザで動く静的ファイル一式を生成する。
   src/, shared/, excelExport.js を単一のソースとして扱い、ここではコピーと
   相対パスの付け替えのみ行う。 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const docs = path.join(root, "docs");

fs.rmSync(docs, { recursive: true, force: true });
fs.mkdirSync(path.join(docs, "vendor"), { recursive: true });

fs.copyFileSync(path.join(root, "src", "style.css"), path.join(docs, "style.css"));
fs.copyFileSync(path.join(root, "src", "app.js"), path.join(docs, "app.js"));
fs.copyFileSync(path.join(root, "shared", "calc.js"), path.join(docs, "calc.js"));
fs.copyFileSync(path.join(root, "excelExport.js"), path.join(docs, "excelExport.js"));
fs.copyFileSync(
  path.join(root, "shared", "vendor", "exceljs.min.js"),
  path.join(docs, "vendor", "exceljs.min.js")
);

let html = fs.readFileSync(path.join(root, "src", "index.html"), "utf-8");
html = html
  .replace('src="../shared/vendor/exceljs.min.js"', 'src="vendor/exceljs.min.js"')
  .replace('src="../shared/calc.js"', 'src="calc.js"')
  .replace('src="../excelExport.js"', 'src="excelExport.js"');
fs.writeFileSync(path.join(docs, "index.html"), html, "utf-8");
fs.writeFileSync(path.join(docs, "CNAME"), "suiri.yonda-key.com\n", "utf-8");

console.log("docs/ を再生成しました。");
