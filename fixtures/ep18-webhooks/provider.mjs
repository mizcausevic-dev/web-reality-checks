// Episode 18 fixture: a FICTIONAL subscription provider ("SubHub") that emits webhook events.
// Synthetic data only. Nothing here talks to a real provider.
//
// Guarantees THIS fictional provider makes (do not assume real providers make them):
//   - every event has a unique event_id
//   - every event carries the FULL subscription snapshot (not a delta)
//   - version is a monotonically increasing integer per subscription
//
// Signing scheme (documented concatenation):
//   signed_payload = `${delivery_ts}.${rawBody}`         // delivery_ts = unix seconds, rawBody = exact bytes sent
//   signature      = hex( HMAC-SHA256(secret, signed_payload) )
//   headers: X-SubHub-Timestamp: <delivery_ts>, X-SubHub-Signature: v1=<signature>
// Each delivery attempt (including a legitimate retry of the same event) gets a FRESH delivery_ts
// and therefore a fresh signature. The event body is byte-identical across retries.
import crypto from 'node:crypto';

export const PROVIDER = 'subhub';
// Synthetic secret, generated for this fixture. Not a real credential.
export const SECRET = 'subhub_whsec_fixture_0f3a9c7e2b1d4e6f8a5c3b7d9e1f2a4c';

export const sign = (secret, deliveryTs, rawBody) =>
  crypto.createHmac('sha256', secret).update(`${deliveryTs}.`).update(rawBody).digest('hex');

/** Deterministic event factory for one provider account. `seed` keeps ids reproducible. */
export const createProvider = ({seed = 18, baseEventTs = Date.UTC(2026, 0, 15, 9, 0, 0)} = {}) => {
  const versions = new Map(); // subscription_id -> last version
  let n = 0;
  const makeEvent = (subscriptionId, type, snapshotFields) => {
    const version = (versions.get(subscriptionId) ?? 0) + 1;
    versions.set(subscriptionId, version);
    n += 1;
    const event_id = `evt_${crypto.createHash('sha256').update(`${seed}:${subscriptionId}:${version}`).digest('hex').slice(0, 12)}`;
    return {
      event_id,
      subscription_id: subscriptionId,
      type,
      version,
      // FULL snapshot: the receiver can set state from this alone.
      snapshot: {subscription_id: subscriptionId, version, ...snapshotFields},
      event_ts: new Date(baseEventTs + n * 60_000).toISOString(),
    };
  };
  return {makeEvent};
};

/**
 * Build one delivery attempt for an event. Returns {headers, body}, where body is the exact
 * byte string that is signed. Call again for a retry: you get a new timestamp + signature.
 */
export const makeDelivery = (event, {secret = SECRET, deliveryTs = Math.floor(Date.now() / 1000), rawBody} = {}) => {
  const body = rawBody ?? JSON.stringify(event);
  return {
    headers: {
      'content-type': 'application/json',
      'x-subhub-timestamp': String(deliveryTs),
      'x-subhub-signature': `v1=${sign(secret, deliveryTs, body)}`,
    },
    body,
  };
};

/** POST a delivery to a receiver base URL. Returns {status, body}. */
export const deliver = async (base, delivery, extraHeaders = {}) => {
  const r = await fetch(`${base}/webhooks/${PROVIDER}`, {method: 'POST', headers: {...delivery.headers, ...extraHeaders}, body: delivery.body});
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  return {status: r.status, body: json ?? text};
};
