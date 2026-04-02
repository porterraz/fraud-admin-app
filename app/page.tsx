"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CustomerRow, OrderWithCustomerRow } from "@/lib/types/database";

type CustomerListItem = Pick<
  CustomerRow,
  "customer_id" | "full_name" | "email" | "city" | "state" | "loyalty_tier"
>;

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso.replace(" ", "T")));
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [orders, setOrders] = useState<OrderWithCustomerRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [deviceType, setDeviceType] = useState("desktop");
  const [ipCountry, setIpCountry] = useState("US");
  const [orderSubtotal, setOrderSubtotal] = useState("49.99");
  const [shippingFee, setShippingFee] = useState("5");
  const [taxAmount, setTaxAmount] = useState("2.5");
  const [billingZip, setBillingZip] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [promoUsed, setPromoUsed] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const [toast, setToast] = useState<{
    kind: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (kind: "success" | "error" | "info", message: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ kind, message });
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    },
    []
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      const data = (await res.json()) as CustomerListItem[];
      setCustomers(data);
      setCustomerId((prev) =>
        prev || (data[0] ? String(data[0].customer_id) : "")
      );
    } catch {
      showToast("error", "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to load orders");
      const data = (await res.json()) as OrderWithCustomerRow[];
      setOrders(data);
    } catch {
      showToast("error", "Could not load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: Number(customerId),
          payment_method: paymentMethod,
          device_type: deviceType,
          ip_country: ipCountry,
          order_subtotal: Number(orderSubtotal),
          shipping_fee: Number(shippingFee),
          tax_amount: Number(taxAmount),
          billing_zip: billingZip.trim() || null,
          shipping_zip: shippingZip.trim() || null,
          shipping_state: shippingState.trim() || null,
          promo_used: promoUsed,
          promo_code: promoCode.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; order_id?: number };
      if (!res.ok) {
        showToast("error", data.error ?? "Order failed.");
        return;
      }
      showToast(
        "success",
        `Order #${data.order_id} created successfully.`,
      );
      await loadOrders();
    } catch {
      showToast("error", "Network error while placing order.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRunScoring() {
    showToast(
      "info",
      "Scoring job queued: ML inference would run in production (simulated).",
    );
  }

  const parsedSubtotal = Number(orderSubtotal);
  const parsedShip = Number(shippingFee);
  const parsedTax = Number(taxAmount);
  const previewTotal =
    Number.isFinite(parsedSubtotal) &&
    Number.isFinite(parsedShip) &&
    Number.isFinite(parsedTax)
      ? parsedSubtotal + parsedShip + parsedTax
      : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : toast.kind === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-sky-200 bg-sky-50 text-sky-900"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:flex md:flex-col">
          <div className="border-b border-slate-800 px-5 py-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Operations
            </p>
            <p className="mt-1 font-semibold text-white">Fraud Admin</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
            <span className="rounded-md bg-slate-800 px-3 py-2 font-medium text-white">
              Orders
            </span>
            <span className="rounded-md px-3 py-2 text-slate-400">
              Customers
            </span>
            <span className="rounded-md px-3 py-2 text-slate-400">
              Risk models
            </span>
          </nav>
          <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
            shop.db · SQLite
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Order desk
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Select a customer, place orders, and review recent activity.
            </p>
          </header>

          <div className="mx-auto max-w-6xl space-y-6 p-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                New order
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Creates a row in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">orders</code> with initial risk score 0.
              </p>

              <form
                onSubmit={handlePlaceOrder}
                className="mt-6 grid gap-6 lg:grid-cols-2"
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="customer"
                      className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                    >
                      Select customer
                    </label>
                    <select
                      id="customer"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      disabled={loading || customers.length === 0}
                    >
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.full_name} — {c.email}
                        </option>
                      ))}
                    </select>
                    {loading ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Loading customers…
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="payment"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Payment method
                      </label>
                      <select
                        id="payment"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="card">Card</option>
                        <option value="paypal">PayPal</option>
                        <option value="bank">Bank</option>
                        <option value="crypto">Crypto</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="device"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Device type
                      </label>
                      <select
                        id="device"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={deviceType}
                        onChange={(e) => setDeviceType(e.target.value)}
                      >
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                        <option value="tablet">Tablet</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="country"
                      className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                    >
                      IP country
                    </label>
                    <input
                      id="country"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={ipCountry}
                      onChange={(e) =>
                        setIpCountry(e.target.value.toUpperCase())
                      }
                      maxLength={8}
                      placeholder="US"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label
                        htmlFor="subtotal"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Subtotal
                      </label>
                      <input
                        id="subtotal"
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={orderSubtotal}
                        onChange={(e) => setOrderSubtotal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ship"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Shipping
                      </label>
                      <input
                        id="ship"
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={shippingFee}
                        onChange={(e) => setShippingFee(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tax"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Tax
                      </label>
                      <input
                        id="tax"
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="bzip"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Billing ZIP
                      </label>
                      <input
                        id="bzip"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={billingZip}
                        onChange={(e) => setBillingZip(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="szip"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Shipping ZIP
                      </label>
                      <input
                        id="szip"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sstate"
                        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Ship state
                      </label>
                      <input
                        id="sstate"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={promoUsed}
                        onChange={(e) => setPromoUsed(e.target.checked)}
                        className="size-4 rounded border-slate-300"
                      />
                      Promo applied
                    </label>
                    <input
                      type="text"
                      className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo code"
                      disabled={!promoUsed}
                    />
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="text-sm text-slate-600">
                      Order total preview:{" "}
                      <span className="font-semibold text-slate-900">
                        {previewTotal !== null
                          ? formatMoney(previewTotal)
                          : "—"}
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={
                        submitting || !customerId || customers.length === 0
                      }
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Saving…" : "Place order"}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Order history
                  </h2>
                  <p className="text-xs text-slate-500">
                    Latest 50 orders · administrator view
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadOrders()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleRunScoring}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
                  >
                    Run scoring
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto p-2">
                {ordersLoading ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading orders…
                  </p>
                ) : orders.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders yet.
                  </p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">When</th>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Pay / device</th>
                        <th className="px-3 py-2 font-medium">Country</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Total
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          Risk
                        </th>
                        <th className="px-3 py-2 font-medium">Fraud</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((o) => (
                        <tr
                          key={o.order_id}
                          className="hover:bg-slate-50/80"
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            #{o.order_id}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {formatDateTime(o.order_datetime)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <span className="font-medium text-slate-900">
                              {o.customer_name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {" "}
                              · #{o.customer_id}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {o.payment_method} · {o.device_type}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {o.ip_country}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                            {formatMoney(o.order_total)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                            {o.risk_score.toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                o.is_fraud
                                  ? "bg-red-100 text-red-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {o.is_fraud ? "Flagged" : "Clear"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
