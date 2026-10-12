# SvelteKitをCloudflare Workersで動かし、APIが必要になったらHonoを組み込む

フロントエンドはSvelteKitで作り、Cloudflare Workers（静的アセット付き）にデプロイする。Cloudflare Pagesも候補だったが、Cloudflareが新しいプロジェクトにはWorkersをすすめていることと、D1などとの連携がしやすいことから、Workersを選んだ。ログインとサーバー保存を追加するときは、SvelteKitのAPIルートの中にHonoを組み込み、1つのデプロイのまま運用する予定だ。ただし、Honoの具体的な組み込み方は、その段階で改めて決める。

## Considered Options

- Vite + React + TypeScript のSPA：開発者がSvelteKitとHonoを使いたいため採用しなかった。
- Cloudflare Pages：上記の理由でWorkersを選んだ。
