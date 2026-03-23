import { NextResponse } from "next/server";

// TEMPORARY DEBUG ENDPOINT — delete after fixing password issue
export async function GET() {
  const pwd = (process.env.SUPERADMIN_PASSWORD ?? "superadmin-2026").trim();
  return NextResponse.json({
    length: pwd.length,
    first3: pwd.slice(0, 3),
    last3: pwd.slice(-3),
    charCodes: Array.from(pwd).map(c => c.charCodeAt(0)),
  });
}
