import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const types = readFileSync(path.join(root, "src/types/db.ts"), "utf8");
const initialMigration = readFileSync(
  path.join(root, "supabase/migrations/0001_init.sql"),
  "utf8",
);
const paymentStatusMigration = readFileSync(
  path.join(root, "supabase/migrations/0006_payment_status_extra.sql"),
  "utf8",
);

function typeScriptEnumValues(typeName: string): string[] {
  const definition = types.match(
    new RegExp(`export type ${typeName}\\s*=([\\s\\S]*?);`),
  )?.[1];
  if (!definition) throw new Error(`Missing TypeScript type ${typeName}`);
  return [...definition.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function migrationEnumValues(enumName: string): string[] {
  const definition = initialMigration.match(
    new RegExp(`create type ${enumName} as enum\\s*\\(([\\s\\S]*?)\\);`),
  )?.[1];
  if (!definition) throw new Error(`Missing SQL enum ${enumName}`);

  const values = [...definition.matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
  if (enumName === "payment_status") {
    values.push(
      ...[...paymentStatusMigration.matchAll(/add value if not exists '([^']+)'/g)]
        .map((match) => match[1]),
    );
  }
  return values;
}

describe("database status types", () => {
  it("keeps OrderStatus aligned with the SQL migration enum", () => {
    expect(typeScriptEnumValues("OrderStatus").sort()).toEqual(
      migrationEnumValues("order_status").sort(),
    );
  });

  it("keeps PaymentStatus aligned with migrations 0001 and 0006", () => {
    expect(typeScriptEnumValues("PaymentStatus").sort()).toEqual(
      migrationEnumValues("payment_status").sort(),
    );
  });
});
