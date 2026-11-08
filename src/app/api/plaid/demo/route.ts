import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DEMO_COOKIE } from "@/lib/demoData";

// Switches the sample household on or off for this browser. Real connected
// accounts are untouched; they come back as soon as sample data is off.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let enabled = false;
  try { enabled = Boolean((await req.json())?.enabled); } catch {}
  const res = NextResponse.json({ demo: enabled });
  if (enabled) {
    res.cookies.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  } else {
    res.cookies.set(DEMO_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
  }
  return res;
}
