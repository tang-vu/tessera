import { keccak256, stringToHex } from "viem";

// ─────────────────────────────────────────────────────────────────────────────
// AP2 (Agent Payments Protocol) mandate shapes, modeled as typed objects.
// Tessera models the AP2 data shapes only (it does not run AP2 infra); the chain
// is Intent → Cart → Payment, each binding the prior by hash. See docs/ARCHITECTURE.md.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntentMandate {
  vct: "mandate.intent.1";
  natural_language_description: string;
  merchants: { id: string; name: string }[];
  user_cart_confirmation_required: boolean;
  intent_expiry: string; // ISO8601
  iat: number; // unix seconds
}

export interface CartItem {
  id: string;
  title: string;
  quantity: number;
  unitAmount: string; // base units as string
}

export interface CartMandate {
  vct: "mandate.cart.1";
  cartId: string;
  merchant: { id: string; name: string };
  items: CartItem[];
  total: { amount: string; currency: string };
  cart_expiry: string;
  cartHash: `0x${string}`; // keccak256 of the cart body
}

export interface PaymentMandate {
  vct: "mandate.payment.1";
  transaction_id: `0x${string}`; // bound to cartHash
  payee: `0x${string}`;
  payment_amount: { amount: string; currency: string };
  payment_instrument: { id: string; type: string };
  execution: "immediate" | string;
  iat: number;
}

export interface MandateChain {
  intent: IntentMandate;
  cart: CartMandate;
  payment: PaymentMandate;
  settlementId: `0x${string}`; // deterministic on-chain settlement key
}

export interface BuildMandateParams {
  description: string;
  merchantId: string;
  merchantName: string;
  payee: `0x${string}`;
  amount: bigint; // stablecoin base units (6 decimals)
  currency?: string;
  items?: { title: string; quantity: number; unitAmount: bigint }[];
  nonce?: string | number; // ensures a unique settlementId per settlement
  ttlSeconds?: number;
}

function hashJson(value: unknown): `0x${string}` {
  return keccak256(stringToHex(JSON.stringify(value)));
}

/** Build a full AP2 mandate chain and derive the deterministic on-chain settlementId. */
export function buildMandateChain(p: BuildMandateParams): MandateChain {
  const currency = p.currency ?? "USDC";
  const now = Math.floor(Date.now() / 1000);
  const expiry = new Date((now + (p.ttlSeconds ?? 3600)) * 1000).toISOString();
  const nonce = String(p.nonce ?? now);

  const items: CartItem[] =
    p.items?.map((it, i) => ({
      id: `${p.merchantId}-item-${i}`,
      title: it.title,
      quantity: it.quantity,
      unitAmount: it.unitAmount.toString(),
    })) ?? [
      { id: `${p.merchantId}-item-0`, title: p.description, quantity: 1, unitAmount: p.amount.toString() },
    ];

  const intent: IntentMandate = {
    vct: "mandate.intent.1",
    natural_language_description: p.description,
    merchants: [{ id: p.merchantId, name: p.merchantName }],
    user_cart_confirmation_required: false,
    intent_expiry: expiry,
    iat: now,
  };

  const cartBody = {
    cartId: `cart-${p.merchantId}-${nonce}`,
    merchant: { id: p.merchantId, name: p.merchantName },
    items,
    total: { amount: p.amount.toString(), currency },
    cart_expiry: expiry,
  };
  const cartHash = hashJson(cartBody);
  const cart: CartMandate = { vct: "mandate.cart.1", ...cartBody, cartHash };

  const payment: PaymentMandate = {
    vct: "mandate.payment.1",
    transaction_id: cartHash,
    payee: p.payee,
    payment_amount: { amount: p.amount.toString(), currency },
    payment_instrument: { id: "tessera-stablecoin", type: "stablecoin" },
    execution: "immediate",
    iat: now,
  };

  const settlementId = hashJson({
    transaction_id: payment.transaction_id,
    payee: p.payee,
    amount: p.amount.toString(),
    nonce,
  });

  return { intent, cart, payment, settlementId };
}
