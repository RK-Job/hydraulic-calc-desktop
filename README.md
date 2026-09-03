# 水理計算書作成アプリ

給水装置の設計流量算定・ＢＬ水理計算を行い、Excel（.xlsx）で出力するアプリです。
ブラウザ版とWindowsデスクトップ版（Electron）の2種類があります。

## アクセス方法

### ブラウザ版（GitHub Pages）

<https://suiri.yonda-key.com/>

- インストール不要。上記URLを開くだけで使えます。
- 計算・入力・印刷・Excel出力（.xlsx）が利用できます。
- 保存 (.sui) / 開く (.sui) はデスクトップ版のみの機能です。

### デスクトップ版（Windows / Electron）

保存 (.sui) ・開く (.sui) を使いたい場合はこちら。

```bash
npm install
npm start
```

Windows用の配布パッケージを作る場合：

```bash
npm run dist
```

`dist/win-unpacked` 以下に実行ファイルが生成されます。

## ディレクトリ構成

| パス | 内容 |
|---|---|
| `main.js` / `preload.js` | Electronのメインプロセス・プリロード |
| `src/` | 画面（HTML/CSS/JS）。デスクトップ版・ブラウザ版共通のソース |
| `shared/calc.js` | 画面とExcel出力で共有する計算ロジック |
| `shared/vendor/exceljs.min.js` | ExcelJSのブラウザ用ビルド（同梱） |
| `excelExport.js` | Excel出力処理（Node/ブラウザ両対応） |
| `docs/` | GitHub Pages公開用に生成した静的ファイル一式（下記参照） |
| `scripts/build-pages.js` | `docs/` を再生成するスクリプト |

## `docs/` の更新方法

`src/` や `shared/`、`excelExport.js` を変更したら、GitHub Pagesに公開している
`docs/` フォルダも再生成してコミット・pushしてください。

```bash
npm run build:pages
git add docs
git commit -m "docs更新"
git push
```
