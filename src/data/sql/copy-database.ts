import type { SqlClient } from "./sql-client";

/**
 * データベースの引っ越し（1回だけ）。古いデータベースの中身を、新しいデータベースへそのまま写す。
 *
 * - 新しい側に会員が1人もいないときだけ動く（2回目以降のビルドでは何もしない。新しい側のデータを上書きしない）
 * - 表の並びは外部キーの順（親の表から先に入れる）
 * - 値の形を崩さないよう、行を JSON にして渡し、新しい側で json_populate_record で表の型に戻す
 * - 自動採番の列（identity）は、写したあとで続きの番号から振られるように合わせる
 */
export interface CopyResult {
  copied: boolean;
  reason?: string;
  tables: { table: string; rows: number }[];
}

const SKIP_TABLES = new Set(["schema_migrations"]);

async function listTables(client: SqlClient): Promise<string[]> {
  const rows = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
  );
  return rows.map((row) => row.table_name).filter((name) => !SKIP_TABLES.has(name));
}

/** 外部キーをたどって、参照される表が先に来る順に並べる */
async function orderByDependencies(client: SqlClient, tables: string[]): Promise<string[]> {
  const edges = await client.query<{ child: string; parent: string }>(
    `select tc.relname as child, tp.relname as parent
       from pg_constraint c
       join pg_class tc on tc.oid = c.conrelid
       join pg_class tp on tp.oid = c.confrelid
       join pg_namespace n on n.oid = tc.relnamespace
      where c.contype = 'f' and n.nspname = 'public'`,
  );
  const parents = new Map<string, Set<string>>(tables.map((table) => [table, new Set<string>()]));
  for (const edge of edges) if (edge.child !== edge.parent) parents.get(edge.child)?.add(edge.parent);
  const ordered: string[] = [];
  const done = new Set<string>();
  const visit = (table: string, path: Set<string>): void => {
    if (done.has(table) || path.has(table)) return;
    path.add(table);
    for (const parent of parents.get(table) ?? []) visit(parent, path);
    path.delete(table);
    done.add(table);
    ordered.push(table);
  };
  for (const table of tables) visit(table, new Set());
  return ordered;
}

const quote = (name: string): string => `"${name.replace(/"/g, '""')}"`;

export async function copyDatabase(source: SqlClient, target: SqlClient): Promise<CopyResult> {
  const [targetMembers] = await target.query<{ count: number }>("select count(*)::int as count from members");
  if ((targetMembers?.count ?? 0) > 0) return { copied: false, reason: "新しいデータベースにすでに会員がいる", tables: [] };
  const [sourceMembers] = await source.query<{ count: number }>("select count(*)::int as count from members");
  if ((sourceMembers?.count ?? 0) === 0) return { copied: false, reason: "古いデータベースに会員がいない", tables: [] };

  const sourceTables = new Set(await listTables(source));
  const tables = (await orderByDependencies(target, await listTables(target))).filter((table) => sourceTables.has(table));
  const result: CopyResult = { copied: true, tables: [] };

  await target.transaction(async (tx) => {
    for (const table of tables) {
      const rows = await source.query<{ j: string }>(`select row_to_json(t)::text as j from ${quote(table)} t`);
      for (const row of rows) {
        await tx.query(
          `insert into ${quote(table)} overriding system value select * from json_populate_record(null::${quote(table)}, $1::json) on conflict do nothing`,
          [row.j],
        );
      }
      result.tables.push({ table, rows: rows.length });
    }
    // 自動採番の続きを合わせる
    const identities = await tx.query<{ table_name: string; column_name: string }>(
      "select table_name, column_name from information_schema.columns where table_schema = 'public' and is_identity = 'YES'",
    );
    for (const column of identities) {
      if (!tables.includes(column.table_name)) continue;
      await tx.query(
        `select setval(pg_get_serial_sequence($1, $2), coalesce((select max(${quote(column.column_name)}) from ${quote(column.table_name)}), 0) + 1, false)`,
        [column.table_name, column.column_name],
      );
    }
  });
  return result;
}
