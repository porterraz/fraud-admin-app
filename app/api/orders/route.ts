export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import type {
  CreateOrderInput,
  OrderRow,
  OrderWithCustomerRow,
} from "@/lib/types/database";

const PAYMENT_METHODS = new Set(["card", "paypal", "bank", "crypto"]);
const DEVICE_TYPES = new Set(["mobile", "desktop", "tablet"]);

export async function GET() {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        [
          "order_id",
          "customer_id",
          "order_datetime",
          "billing_zip",
          "shipping_zip",
          "shipping_state",
          "payment_method",
          "device_type",
          "ip_country",
          "promo_used",
          "promo_code",
          "order_subtotal",
          "shipping_fee",
          "tax_amount",
          "order_total",
          "risk_score",
          "is_fraud",
        ].join(", ")
      )
      .order("order_datetime", { ascending: false })
      .limit(50);

    if (ordersError) {
      console.error("Supabase Error:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const list = (orders ?? []) as unknown as OrderRow[];
    const customerIds = [...new Set(list.map((o) => o.customer_id))];

    let nameByCustomerId: Record<number, string> = {};
    if (customerIds.length > 0) {
      const { data: customers, error: custError } = await supabase
        .from("customers")
        .select("customer_id, full_name")
        .in("customer_id", customerIds);

      if (custError) {
        console.error("Supabase Error:", custError);
        return NextResponse.json(
          { error: "Failed to fetch orders" },
          { status: 500 }
        );
      }

      const custRows = (customers ?? []) as {
        customer_id: number;
        full_name: string;
      }[];
      nameByCustomerId = Object.fromEntries(
        custRows.map((c) => [Number(c.customer_id), c.full_name])
      );
    }

    const payload: OrderWithCustomerRow[] = list.map((o) => ({
      order_id: Number(o.order_id),
      customer_id: Number(o.customer_id),
      order_datetime: String(o.order_datetime),
      billing_zip: o.billing_zip ?? null,
      shipping_zip: o.shipping_zip ?? null,
      shipping_state: o.shipping_state ?? null,
      payment_method: String(o.payment_method),
      device_type: String(o.device_type),
      ip_country: String(o.ip_country),
      promo_used: Number(o.promo_used),
      promo_code: o.promo_code ?? null,
      order_subtotal: Number(o.order_subtotal),
      shipping_fee: Number(o.shipping_fee),
      tax_amount: Number(o.tax_amount),
      order_total: Number(o.order_total),
      risk_score: Number(o.risk_score),
      is_fraud: Number(o.is_fraud),
      customer_name: nameByCustomerId[Number(o.customer_id)] ?? "",
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateOrderInput>;

    const customer_id = Number(body.customer_id);
    const order_subtotal = Number(body.order_subtotal);
    const shipping_fee =
      body.shipping_fee !== undefined ? Number(body.shipping_fee) : 5;
    const tax_amount =
      body.tax_amount !== undefined ? Number(body.tax_amount) : 2.5;
    const payment_method = String(body.payment_method ?? "");
    const device_type = String(body.device_type ?? "");
    const ip_country = String(body.ip_country ?? "").trim().toUpperCase();

    if (!Number.isFinite(customer_id) || customer_id < 1) {
      return NextResponse.json(
        { error: "Valid customer_id is required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(order_subtotal) || order_subtotal < 0) {
      return NextResponse.json(
        { error: "Valid order_subtotal is required" },
        { status: 400 }
      );
    }
    if (!PAYMENT_METHODS.has(payment_method)) {
      return NextResponse.json(
        {
          error:
            "payment_method must be one of: card, paypal, bank, crypto",
        },
        { status: 400 }
      );
    }
    if (!DEVICE_TYPES.has(device_type)) {
      return NextResponse.json(
        {
          error:
            "device_type must be one of: mobile, desktop, tablet",
        },
        { status: 400 }
      );
    }
    if (!ip_country || ip_country.length < 2) {
      return NextResponse.json(
        { error: "ip_country is required (e.g. US)" },
        { status: 400 }
      );
    }

    const order_total = order_subtotal + shipping_fee + tax_amount;
    const promo_used = body.promo_used ? 1 : 0;
    const promo_code =
      typeof body.promo_code === "string" && body.promo_code.trim()
        ? body.promo_code.trim()
        : null;
    const billing_zip = body.billing_zip ?? null;
    const shipping_zip = body.shipping_zip ?? null;
    const shipping_state = body.shipping_state ?? null;

    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        customer_id,
        order_datetime: new Date().toISOString(),
        billing_zip,
        shipping_zip,
        shipping_state,
        payment_method,
        device_type,
        ip_country,
        promo_used,
        promo_code,
        order_subtotal,
        shipping_fee,
        tax_amount,
        order_total,
        risk_score: 0,
        is_fraud: 0,
      })
      .select("order_id")
      .single();

    if (error || !inserted) {
      console.error("Supabase Error:", error);
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: Number((inserted as unknown as { order_id: number }).order_id),
      order_total,
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to save order" },
      { status: 500 }
    );
  }
}
