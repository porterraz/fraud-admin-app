export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import type { CustomerRow } from "@/lib/types/database";

type CustomerListRow = Pick<
  CustomerRow,
  "customer_id" | "full_name" | "email" | "city" | "state" | "loyalty_tier"
>;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("customer_id, full_name, email, city, state, loyalty_tier")
      .eq("is_active", 1)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    return NextResponse.json((data ?? []) as CustomerListRow[]);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
