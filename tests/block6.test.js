const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../src/app");
const { webApp } = require("../web/server");
const { prisma } = require("../src/db");

let apiServer;
let webServer;
let apiUrl;
let webUrl;

test.before(async () => {
  process.env.CORS_ORIGIN = "http://localhost:5173";
  await prisma.resetAndSeed();

  apiServer = http.createServer(app);
  await new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve));
  apiUrl = `http://127.0.0.1:${apiServer.address().port}`;

  webServer = http.createServer(webApp);
  await new Promise((resolve) => webServer.listen(0, "127.0.0.1", resolve));
  webUrl = `http://127.0.0.1:${webServer.address().port}`;
});

test.after(async () => {
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  if (webServer) await new Promise((resolve) => webServer.close(resolve));
});

async function callApi(path, { method = "GET", body, rawBody, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  let payload = rawBody;
  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: payload,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    status: res.status,
    headers: res.headers,
    json,
    text,
  };
}

test("Block #6 CORS: Access-Control-Allow-Origin matches SPA origin (not *) and OPTIONS preflight returns 204", async () => {
  const preflight = await callApi("/api/dishes/1", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.NotEqual?.(preflight.headers.get("access-control-allow-origin"), "*");
  assert.match(
    preflight.headers.get("access-control-allow-methods") || "",
    /PATCH/
  );
  assert.match(
    preflight.headers.get("access-control-allow-headers") || "",
    /Content-Type/i
  );

  const getRes = await callApi("/api/dishes");
  assert.equal(
    getRes.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
});

test("Block #6 Technical vs Business Errors: /api/bok -> 404 without {ok}, malformed JSON -> 400 without {ok}", async () => {
  const wrongUrl = await callApi("/api/bok");
  assert.equal(wrongUrl.status, 404);
  assert.equal(wrongUrl.json?.ok, undefined);

  const badJson = await callApi("/api/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    rawBody: "{ invalid json ",
  });
  assert.equal(badJson.status, 400);
  assert.equal(badJson.json?.ok, undefined);
});

test("Block #6 REST API /api/dishes: Full CRUD + Response Shape + Business Errors (NOT_FOUND, VALIDATION_FAILED)", async () => {
  // 1. GET list & search ?q=
  const listRes = await callApi("/api/dishes?q=Ph%E1%BB%9F");
  assert.equal(listRes.status, 200);
  assert.equal(listRes.json.ok, true);
  assert.ok(Array.isArray(listRes.json.data));
  assert.ok(listRes.json.data.length >= 1);

  // 2. GET detail non-existent or invalid ID -> status 200, ok: false, NOT_FOUND
  const notFoundNum = await callApi("/api/dishes/9999");
  assert.equal(notFoundNum.status, 200);
  assert.equal(notFoundNum.json.ok, false);
  assert.equal(notFoundNum.json.error.code, "NOT_FOUND");

  const notFoundAbc = await callApi("/api/dishes/abc");
  assert.equal(notFoundAbc.status, 200);
  assert.equal(notFoundAbc.json.ok, false);
  assert.equal(notFoundAbc.json.error.code, "NOT_FOUND");

  // 3. POST validation failed (empty name, negative price, or string price) -> status 200, ok: false, VALIDATION_FAILED with fields
  const invalidPost = await callApi("/api/dishes", {
    method: "POST",
    body: { name: "", price: -100 },
  });
  assert.equal(invalidPost.status, 200);
  assert.equal(invalidPost.json.ok, false);
  assert.equal(invalidPost.json.error.code, "VALIDATION_FAILED");
  assert.ok(invalidPost.json.error.fields.name);
  assert.ok(invalidPost.json.error.fields.price);

  const stringPricePost = await callApi("/api/dishes", {
    method: "POST",
    body: { name: "Món Giá Chuỗi", price: "50000" },
  });
  assert.equal(stringPricePost.status, 200);
  assert.equal(stringPricePost.json.ok, false);
  assert.equal(stringPricePost.json.error.code, "VALIDATION_FAILED");

  // 4. POST valid -> status 200, ok: true, data has id
  const created = await callApi("/api/dishes", {
    method: "POST",
    body: {
      name: "Mì Quảng Tôm Thịt Đặc Biệt",
      description: "Chuẩn vị Quảng Nam",
      price: 55000,
      category: "Món Nước",
      available: true,
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.json.ok, true);
  const newId = created.json.data.id;
  assert.ok(newId > 0);

  // 5. PATCH valid -> status 200, ok: true
  const patched = await callApi(`/api/dishes/${newId}`, {
    method: "PATCH",
    body: { price: 62000, name: "Mì Quảng Thượng Hạng" },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.ok, true);
  assert.equal(patched.json.data.price, 62000);
  assert.equal(patched.json.data.name, "Mì Quảng Thượng Hạng");

  // 6. DELETE valid -> status 200, ok: true, data: null
  const deleted = await callApi(`/api/dishes/${newId}`, {
    method: "DELETE",
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.json.ok, true);
  assert.equal(deleted.json.data, null);

  // 7. DELETE again -> status 200, ok: false, NOT_FOUND
  const deletedAgain = await callApi(`/api/dishes/${newId}`, {
    method: "DELETE",
  });
  assert.equal(deletedAgain.status, 200);
  assert.equal(deletedAgain.json.ok, false);
  assert.equal(deletedAgain.json.error.code, "NOT_FOUND");
});

test("Block #6 REST API /api/chefs and /api/ingredients: Full CRUD + Validation + NOT_FOUND", async () => {
  // Chefs CRUD
  const badChef = await callApi("/api/chefs", {
    method: "POST",
    body: { name: "", specialty: "" },
  });
  assert.equal(badChef.status, 200);
  assert.equal(badChef.json.ok, false);
  assert.equal(badChef.json.error.code, "VALIDATION_FAILED");

  const createdChef = await callApi("/api/chefs", {
    method: "POST",
    body: { name: "Chef Luke Nguyễn", specialty: "Modern Vietnamese", experience: 20 },
  });
  assert.equal(createdChef.status, 200);
  assert.equal(createdChef.json.ok, true);
  const chefId = createdChef.json.data.id;

  const patchedChef = await callApi(`/api/chefs/${chefId}`, {
    method: "PATCH",
    body: { specialty: "Heritage Cuisine" },
  });
  assert.equal(patchedChef.status, 200);
  assert.equal(patchedChef.json.ok, true);
  assert.equal(patchedChef.json.data.specialty, "Heritage Cuisine");

  const delChef = await callApi(`/api/chefs/${chefId}`, { method: "DELETE" });
  assert.equal(delChef.status, 200);
  assert.equal(delChef.json.ok, true);
  assert.equal(delChef.json.data, null);

  // Ingredients CRUD
  const badIng = await callApi("/api/ingredients", {
    method: "POST",
    body: { name: "", unit: "" },
  });
  assert.equal(badIng.status, 200);
  assert.equal(badIng.json.ok, false);
  assert.equal(badIng.json.error.code, "VALIDATION_FAILED");

  const createdIng = await callApi("/api/ingredients", {
    method: "POST",
    body: { name: "Nước mắm Phú Quốc 40 độ đạm", unit: "lít", stock: 30 },
  });
  assert.equal(createdIng.status, 200);
  assert.equal(createdIng.json.ok, true);
  const ingId = createdIng.json.data.id;

  const patchedIng = await callApi(`/api/ingredients/${ingId}`, {
    method: "PATCH",
    body: { stock: 45 },
  });
  assert.equal(patchedIng.status, 200);
  assert.equal(patchedIng.json.ok, true);
  assert.equal(patchedIng.json.data.stock, 45);

  const delIng = await callApi(`/api/ingredients/${ingId}`, {
    method: "DELETE",
  });
  assert.equal(delIng.status, 200);
  assert.equal(delIng.json.ok, true);
  assert.equal(delIng.json.data, null);
});

test("Block #6 SPA Server (web): Deep links & Reload return 200 index.html fallback", async () => {
  const paths = [
    "/dishes",
    "/dishes/2",
    "/admin/dishes",
    "/admin/dishes/new",
    "/admin/dishes/2/edit",
    "/admin/dishes/2/delete",
    "/admin/chefs",
    "/admin/ingredients",
    "/abc-non-existent-route",
  ];

  for (const p of paths) {
    const res = await fetch(`${webUrl}${p}`);
    const html = await res.text();
    assert.equal(res.status, 200, `Expected 200 fallback for ${p}`);
    assert.match(html, /<div id="spa-root"><\/div>/);
  }
});
