// Episode 29 fixture: loopback-only mock checkout.
//   GET  /catalog            -> available products with their current price (what a page would display)
//   GET  /catalog/:id        -> one quote
//   POST /vuln/orders        -> FLAWED: trusts body.unitPriceCents as the unit price
//   POST /orders             -> CORRECTED: body {productId, quantity, expectedUnitPriceCents, confirmPriceCents?}
//   GET  /orders             -> orders with line snapshots (for evidence)
// No payment provider. No authentication (identity is covered in EP 01; not modelled here).
// Status policy (corrected): 201 created; 400 malformed/invalid field; 404 unknown product;
//   409 product_unavailable OR price_changed (no order created); 413 body too large; 422 total_out_of_range; 503 busy.
import http from 'node:http';
import {createStore, validateOrderRequest} from './store.mjs';

const MAX_BODY = 4096;
const json = (res, code, body) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => {
  let d = ''; let over = false;
  req.on('data', (c) => { if (over) return; d += c; if (d.length > MAX_BODY) { over = true; d = ''; } }); // keep draining; never buffer more than the cap
  req.on('end', () => (over ? reject(Object.assign(new Error('too large'), {code: 413})) : resolve(d)));
  req.on('error', reject);
});

export const createApp = (store) => http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const parts = url.pathname.split('/').filter(Boolean);
    if (req.method === 'GET' && url.pathname === '/catalog') return json(res, 200, {products: store.catalog()});
    if (req.method === 'GET' && parts[0] === 'catalog' && parts.length === 2) {
      const q = store.quote(parts[1]);
      return q ? json(res, 200, q) : json(res, 404, {error: 'unknown_product'});
    }
    if (req.method === 'GET' && url.pathname === '/orders') return json(res, 200, {orders: store.listOrders()});
    if (req.method === 'POST' && (url.pathname === '/orders' || url.pathname === '/vuln/orders')) {
      const flawed = url.pathname === '/vuln/orders';
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) {
        if (e.code === 413) return json(res, 413, {error: 'body_too_large'});
        return json(res, 400, {error: 'invalid_json'});
      }
      const v = validateOrderRequest(body, {requirePrice: flawed ? 'unitPriceCents' : 'expectedUnitPriceCents'});
      if (v.error) return json(res, 400, {error: 'invalid_request', detail: v.error, field: v.field});
      const r = flawed ? store.createOrderFlawed(v.fields) : store.createOrderCorrected(v.fields);
      return json(res, r.status, r.body);
    }
    return json(res, 404, {error: 'not_found'});
  } catch (e) {
    return json(res, 500, {error: 'internal_error'});
  }
});

export const listen = (app) => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app.address().port)));
