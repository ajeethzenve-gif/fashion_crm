import test from "node:test";
import assert from "node:assert/strict";
import { tokenExpiry, installExpiryFetch } from "./sessionExpiry.js";
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
const valid = () => jwt(Math.floor(Date.now() / 1000) + 60);
test("reads expiry and rejects malformed tokens", () => {
  assert.equal(tokenExpiry(jwt(100)), 100000);
  for (const token of [null, "bad", "a.e30.b", jwt("100")]) assert.equal(tokenExpiry(token), 0);
});
test("expired requests log out before sending", async () => {
  let calls = 0, expired = 0; const token = jwt(1);
  const target = { fetch: async () => { calls++; } };
  installExpiryFetch(target, () => token, () => expired++);
  await assert.rejects(target.fetch("/api/", { headers: { Authorization: `Bearer ${token}` } }), /expired/);
  assert.equal(calls, 0); assert.equal(expired, 1);
});
test("authenticated 401 logs out", async () => {
  const token = valid(); let expired = 0;
  const target = { fetch: async () => new Response(null, { status: 401 }) };
  installExpiryFetch(target, () => token, () => expired++);
  await assert.rejects(target.fetch("/api/", { headers: { Authorization: `Bearer ${token}` } }), /expired/);
  assert.equal(expired, 1);
});
test("403 and login failures preserve the session", async () => {
  const token = valid(); let expired = 0;
  const target = { fetch: async (url) => new Response(null, { status: url === "/login" ? 401 : 403 }) };
  installExpiryFetch(target, () => token, () => expired++);
  assert.equal((await target.fetch("/api/", { headers: { Authorization: `Bearer ${token}` } })).status, 403);
  assert.equal((await target.fetch("/login")).status, 401); assert.equal(expired, 0);
});
test("late 401 does not clear a replacement login", async () => {
  const previous = valid(); let active = previous, expired = 0;
  const target = { fetch: async () => { active = jwt(Math.floor(Date.now() / 1000) + 120); return new Response(null, { status: 401 }); } };
  installExpiryFetch(target, () => active, () => expired++);
  await target.fetch("/api/", { headers: { Authorization: `Bearer ${previous}` } });
  assert.equal(expired, 0);
});
