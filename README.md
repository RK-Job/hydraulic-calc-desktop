# 水理計算書作成アプリ

給水装置の設計流量算定・ＢＬ水理計算を行い、Excel（.xlsx）で出力するブラウザアプリです。

## アクセス方法

<https://suiri.yonda-key.com/>

- インストール不要。上記URLを開くだけで使えます。
- 計算・入力・印刷・Excel出力（.xlsx）が利用できます。
- 入力内容は自動的にブラウザ内（localStorage）に保存され、再読み込み時に復元されます。

## ディレクトリ構成

| パス | 内容 |
|---|---|
| `src/` | 画面（HTML/CSS/JS） |
| `shared/calc.js` | 画面とExcel出力で共有する計算ロジック |
| `shared/vendor/exceljs.min.js` | ExcelJSのブラウザ用ビルド（同梱） |
| `excelExport.js` | Excel出力処理 |
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

（`scripts/build-pages.js` はNode.js標準機能のみで動作するため、追加の依存パッケージは不要です）
