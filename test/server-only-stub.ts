// Vitest は React Server の実行環境ではないので、"server-only" を空のモジュールに差し替える。
// 本番ビルドでは本物の "server-only" が効き、クライアントからの import を止める。
export {};
