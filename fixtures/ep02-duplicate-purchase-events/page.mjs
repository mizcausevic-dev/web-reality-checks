// Episode 02 fixture: a purchase-confirmation "page" simulated in Node.
//
// There is no browser here. The page is an in-process event bus plus three code paths that
// each COULD send a purchase event to the collector:
//   1. app.purchaseHandler            — the application's purchase-completion handler
//   2. tagManager.purchaseTrigger     — a simulated tag-manager listener on the same bus
//   3. ConfirmationComponent.onMount  — the confirmation component's mount handler
//
// mode 'flawed'    : all three paths emit. One order => three envelopes.
// mode 'corrected' : only app.purchaseHandler emits. The tag-manager purchase trigger is removed,
//                    and the confirmation component only renders; mounting it emits nothing.
//
// Deliberately NOT provided (documented in README): order-level idempotency. Replaying the
// completion action for the same order emits again in both modes. That is a separate concern.
export const EMITTERS = {
  app: 'app.purchaseHandler',
  tag: 'tagManager.purchaseTrigger',
  mount: 'ConfirmationComponent.onMount',
};

// One synthetic completed order. One stable transaction id per ORDER (never per emission).
export const ORDER = {transaction_id: 'T-20261025-0001', value: 149.0, currency: 'USD', items: [{item_id: 'SKU-4471', quantity: 1}]};
export const ORDER_2 = {transaction_id: 'T-20261025-0002', value: 39.5, currency: 'USD', items: [{item_id: 'SKU-0918', quantity: 1}]};

// Deterministic clock: fixed epoch, +7 ms per tick. Seeded, no wall-clock reads.
export const makeClock = (start = Date.parse('2026-10-25T09:00:00.000Z'), stepMs = 7) => { let n = 0; return () => new Date(start + stepMs * n++).toISOString(); };

const makeBus = () => {
  const handlers = new Map();
  return {
    on: (name, fn) => { (handlers.get(name) ?? handlers.set(name, []).get(name)).push(fn); return () => handlers.set(name, handlers.get(name).filter((h) => h !== fn)); },
    emit: async (name, payload) => { for (const h of handlers.get(name) ?? []) await h(payload); },
    listenerCount: (name) => (handlers.get(name) ?? []).length,
  };
};

export const createPage = ({collectorBase, mode, clock = makeClock()}) => {
  if (mode !== 'flawed' && mode !== 'corrected') throw new Error('mode must be flawed|corrected');
  const bus = makeBus();
  const sent = []; // local trace of what this page sent, for assertions
  const send = async (emitter, order) => {
    const envelope = {event: 'purchase', transaction_id: order.transaction_id, emitter, ts: clock()};
    const r = await fetch(collectorBase + '/collect', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(envelope)});
    sent.push({...envelope, status: r.status});
    return r.status;
  };

  // --- Path 1: application purchase-completion handler (the ONE authoritative emitter) ---
  bus.on('order:completed', (order) => send(EMITTERS.app, order));

  // --- Path 2: simulated tag-manager listener on the same bus ---
  // Flawed: a "purchase" trigger is configured in the tag container as well as in app code.
  if (mode === 'flawed') bus.on('order:completed', (order) => send(EMITTERS.tag, order));

  // --- Path 3: confirmation component ---
  let mounted = null;
  const ConfirmationComponent = {
    mount: async (order) => {
      mounted = {order, renderedAt: clock(), text: `Thanks! Order ${order.transaction_id} confirmed.`};
      // Flawed: "fire purchase when the thank-you screen appears". Corrected: render only.
      if (mode === 'flawed') await send(EMITTERS.mount, order);
      return mounted;
    },
    unmount: () => { mounted = null; },
    isMounted: () => mounted !== null,
  };

  // The user action: the order completes, then the confirmation screen is shown.
  const completeOrder = async (order) => { await bus.emit('order:completed', order); await ConfirmationComponent.mount(order); };
  // Simulates a re-render / back-forward / layout change that remounts the thank-you component.
  const remountConfirmation = async () => { const o = mounted?.order; if (!o) throw new Error('nothing mounted'); ConfirmationComponent.unmount(); await ConfirmationComponent.mount(o); };

  return {mode, bus, sent, completeOrder, remountConfirmation, ConfirmationComponent, purchaseListeners: () => bus.listenerCount('order:completed')};
};
