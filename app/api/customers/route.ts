import { NextResponse } from "next/server";
import { openDb } from "@/lib/db";
import type { CustomerRow } from "@/lib/types/database";

export async function GET() {
  try {
    const db = await openDb();
    const customers = await db.all<CustomerRow[]>(
      `SELECT customer_id, full_name, email, city, state, loyalty_tier
       FROM customers
       WHERE is_active = 1
       ORDER BY full_name ASC`
    );
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
