import { NextResponse } from "next/server";
import { openDb } from "@/lib/db";
import type {
  CreateOrderInput,
  OrderWithCustomerRow,
} from "@/lib/types/database";

const PAYMENT_METHODS = new Set(["card", "paypal", "bank", "crypto"]);
const DEVICE_TYPES = new Set(["mobile", "desktop", "tablet"]);

export async function GET() {
  try {
    const db = await openDb();
    const orders = await db.all<OrderWithCustomerRow[]>(
      `SELECT o.*, c.full_name AS customer_name
       FROM orders o
       JOIN customers c ON c.customer_id = o.customer_id
       ORDER BY o.order_datetime DESC
       LIMIT 50`
    );
    return NextResponse.json(orders);
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

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO orders (
        customer_id,
        order_datetime,
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
        risk_score,
        is_fraud
      ) VALUES (
        ?,
        datetime('now'),
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        0,
        0
      )`,
      [
        customer_id,
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
      ]
    );

    return NextResponse.json({
      success: true,
      order_id: result.lastID,
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
