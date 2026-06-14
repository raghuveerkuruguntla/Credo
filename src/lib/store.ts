import { promises as fs } from "fs";
import path from "path";
import { getPrisma, databaseConfigured } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// Plaid item storage, keyed by Clerk user id.
// Uses Postgres (Neon) via Prisma when DATABASE_URL is set;
// falls back to a local JSON file for keyless local development.

export interface PlaidItem {
  itemId: string;
  accessToken: string;
  institutionName: string;
  connectedAt: string;
}

// ── File fallback (dev only) ────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), ".data");
const ITEMS_FILE = path.join(DATA_DIR, "plaid-items.json");

type ItemsByUser = Record<string, PlaidItem[]>;

async function readFileItems(): Promise<ItemsByUser> {
  try {
    const raw = await fs.readFile(ITEMS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeFileItems(items: ItemsByUser): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

// ── Public API ──────────────────────────────────────────────────────
export async function getItemsForUser(userId: string): Promise<PlaidItem[]> {
  if (databaseConfigured()) {
    const rows = await getPrisma().plaidItem.findMany({ where: { userId } });
    return rows.map((r) => ({
      itemId: r.itemId,
      accessToken: decrypt(r.accessToken),
      institutionName: r.institutionName,
      connectedAt: r.createdAt.toISOString(),
    }));
  }
  const items = await readFileItems();
  return items[userId] ?? [];
}

export async function addItemForUser(userId: string, item: PlaidItem): Promise<void> {
  if (databaseConfigured()) {
    const encToken = encrypt(item.accessToken);
    await getPrisma().plaidItem.upsert({
      where: { itemId: item.itemId },
      update: { accessToken: encToken, institutionName: item.institutionName },
      create: {
        userId,
        itemId: item.itemId,
        accessToken: encToken,
        institutionName: item.institutionName,
      },
    });
    return;
  }
  const items = await readFileItems();
  items[userId] = [...(items[userId] ?? []), item];
  await writeFileItems(items);
}

export async function removeItemForUser(userId: string, itemId: string): Promise<void> {
  if (databaseConfigured()) {
    await getPrisma().plaidItem.deleteMany({ where: { userId, itemId } });
    return;
  }
  const items = await readFileItems();
  items[userId] = (items[userId] ?? []).filter((i) => i.itemId !== itemId);
  await writeFileItems(items);
}
