const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../src/app");
const { prisma } = require("../src/db");

let server;
let baseUrl;

test.before(async () => {
  await prisma.resetAndSeed();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function request(path, { method = "GET", form = null } = {}) {
  const headers = {};
  let body;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body,
    redirect: "manual",
  });
  const text = await res.text();
  return {
    status: res.status,
    location: res.headers.get("location"),
    text,
  };
}

test("Storefront: GET /dishes returns 200 and supports query search ?q=", async () => {
  const allRes = await request("/dishes");
  assert.equal(allRes.status, 200);
  assert.match(allRes.text, /Phở Bò Tái Nạm Đặc Biệt/);

  const searchRes = await request("/dishes?q=Tr%C3%A0%20%C4%90%C3%A0o");
  assert.equal(searchRes.status, 200);
  assert.match(searchRes.text, /Trà Đào Cam Sả Khổng Lồ/);
});

test("Storefront: GET /dishes/:id returns 200 for valid id and 404 for invalid/missing id", async () => {
  const validRes = await request("/dishes/1");
  assert.equal(validRes.status, 200);
  assert.match(validRes.text, /Phở Bò Tái Nạm Đặc Biệt/);

  const missingRes = await request("/dishes/9999");
  assert.equal(missingRes.status, 404);

  const invalidRes = await request("/dishes/abc");
  assert.equal(invalidRes.status, 404);
});

test("Admin Dishes CRUD: POST, validation 400 preserving values, PATCH, DELETE confirmation & 303 redirect", async () => {
  // 1. Validation 400 keeps user input
  const badRes = await request("/admin/dishes", {
    method: "POST",
    form: { name: "Món Thử Nghiệm Lỗi Giá", price: "-5000", category: "Món Nước" },
  });
  assert.equal(badRes.status, 400);
  assert.match(badRes.text, /Món Thử Nghiệm Lỗi Giá/);

  // 2. Valid POST returns 303 redirect
  const createRes = await request("/admin/dishes", {
    method: "POST",
    form: {
      name: "Bún Bò Huế Đặc Biệt",
      description: "Giò heo, chả cua Huế",
      price: "68000",
      category: "Món Nước",
      available: "true",
    },
  });
  assert.equal(createRes.status, 303);
  assert.match(createRes.location, /^\/admin\/dishes\/\d+$/);

  const createdId = createRes.location.split("/").pop();

  // 3. PATCH via method-override updates record and returns 303
  const patchRes = await request(`/admin/dishes/${createdId}?_method=PATCH`, {
    method: "POST",
    form: {
      name: "Bún Bò Huế Thượng Hạng",
      description: "Đã cập nhật",
      price: "75000",
      category: "Món Nước",
      available: "true",
    },
  });
  assert.equal(patchRes.status, 303);
  assert.equal(patchRes.location, `/admin/dishes/${createdId}`);

  // 4. Delete confirmation page is GET 200
  const confirmDelRes = await request(`/admin/dishes/${createdId}/delete`);
  assert.equal(confirmDelRes.status, 200);
  assert.match(confirmDelRes.text, /Bún Bò Huế Thượng Hạng/);

  // 5. DELETE via method-override deletes record and redirects 303 to list
  const delRes = await request(`/admin/dishes/${createdId}?_method=DELETE`, {
    method: "POST",
  });
  assert.equal(delRes.status, 303);
  assert.equal(delRes.location, "/admin/dishes");

  // 6. Verify deleted record returns 404
  const afterDel = await request(`/dishes/${createdId}`);
  assert.equal(afterDel.status, 404);
});

test("Admin Chefs & Ingredients CRUD: full POST, PATCH, DELETE flows with 303 redirects", async () => {
  const chefCreate = await request("/admin/chefs", {
    method: "POST",
    form: { name: "Chef Phạm Tuấn Hải", specialty: "Ẩm thực Âu - Á", experience: "15" },
  });
  assert.equal(chefCreate.status, 303);
  const chefId = chefCreate.location.split("/").pop();

  const chefPatch = await request(`/admin/chefs/${chefId}?_method=PATCH`, {
    method: "POST",
    form: { name: "Chef Phạm Tuấn Hải (MasterChef)", specialty: "Fine Dining", experience: "16" },
  });
  assert.equal(chefPatch.status, 303);

  const chefDel = await request(`/admin/chefs/${chefId}?_method=DELETE`, {
    method: "POST",
  });
  assert.equal(chefDel.status, 303);
  assert.equal(chefDel.location, "/admin/chefs");

  const ingCreate = await request("/admin/ingredients", {
    method: "POST",
    form: { name: "Bánh phở tươi", unit: "kg", stock: "50", origin: "Thủ Đức" },
  });
  assert.equal(ingCreate.status, 303);
  const ingId = ingCreate.location.split("/").pop();

  const ingDel = await request(`/admin/ingredients/${ingId}?_method=DELETE`, {
    method: "POST",
  });
  assert.equal(ingDel.status, 303);
  assert.equal(ingDel.location, "/admin/ingredients");
});

test("ShopeeFood Checkout: POST /orders applies voucher and redirects 303 to order tracking page", async () => {
  const orderRes = await request("/orders", {
    method: "POST",
    form: {
      customerName: "Trần Sinh Viên",
      customerPhone: "0909123456",
      address: "227 Nguyễn Văn Cừ, Q.5",
      voucherCode: "SHOPEE20",
      itemsJson: JSON.stringify([{ id: 1, qty: 2 }]),
    },
  });
  assert.equal(orderRes.status, 303);
  assert.match(orderRes.location, /^\/orders\/\d+$/);

  const showOrder = await request(orderRes.location);
  assert.equal(showOrder.status, 200);
  assert.match(showOrder.text, /Trần Sinh Viên/);
  assert.match(showOrder.text, /SHOPEE20/);
});
