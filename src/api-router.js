const express = require("express");
const { prisma } = require("./db");
const { parsePositiveId, normalizeQueryString } = require("./validators");
const {
  validateApiDishInput,
  validateApiChefInput,
  validateApiIngredientInput,
} = require("./api-validators");

const apiRouter = express.Router();

// ============================================================================
// RESPONSE SHAPE HELPERS (BLOCK #6 CONTRACT)
// ============================================================================

function sendOk(res, data) {
  return res.status(200).json({
    ok: true,
    data,
  });
}

function sendNotFound(res, message = "Không tìm thấy bản ghi yêu cầu.") {
  return res.status(200).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message,
    },
  });
}

function sendValidationFailed(
  res,
  fields,
  message = "Dữ liệu đầu vào không hợp lệ."
) {
  return res.status(200).json({
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message,
      fields,
    },
  });
}

// ============================================================================
// CORS MIDDLEWARE (Strict Origin from Config, Never '*', Preflight 204)
// ============================================================================

apiRouter.use((req, res, next) => {
  const allowedOrigin = (
    process.env.CORS_ORIGIN || "http://localhost:5173"
  ).replace(/\/+$/, "");

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept"
    );
    return res.status(204).end();
  }

  next();
});

// JSON body parser exclusively for /api with technical 400 on malformed JSON
apiRouter.use(express.json());
apiRouter.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    // Technical error: malformed JSON body -> HTTP 400 without { ok } shape
    return res.status(400).json({
      message: "Malformed JSON in request body.",
    });
  }
  next(err);
});

// ============================================================================
// 1. RESOURCE: /api/dishes
// ============================================================================

apiRouter.get("/dishes", async (req, res, next) => {
  try {
    const q = normalizeQueryString(req.query.q);
    const category = normalizeQueryString(req.query.category);
    const dishes = await prisma.dish.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { id: "asc" },
    });
    return sendOk(res, dishes);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID món ăn không hợp lệ hoặc không tồn tại.");
    }
    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) {
      return sendNotFound(res, `Không tìm thấy món ăn #${id}.`);
    }
    return sendOk(res, dish);
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/dishes", async (req, res, next) => {
  try {
    const { valid, fields, data } = validateApiDishInput(req.body, {
      partial: false,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const created = await prisma.dish.create({ data });
    return sendOk(res, created);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch("/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID món ăn không hợp lệ.");
    }
    const { valid, fields, data } = validateApiDishInput(req.body, {
      partial: true,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) {
      return sendNotFound(res, `Không tìm thấy món ăn #${id}.`);
    }
    const updated = await prisma.dish.update({ where: { id }, data });
    return sendOk(res, updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.delete("/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID món ăn không hợp lệ.");
    }
    const deleted = await prisma.dish.delete({ where: { id } });
    if (!deleted) {
      return sendNotFound(res, `Không tìm thấy món ăn #${id}.`);
    }
    return sendOk(res, null);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. RESOURCE: /api/chefs
// ============================================================================

apiRouter.get("/chefs", async (req, res, next) => {
  try {
    const q = normalizeQueryString(req.query.q);
    let chefs = await prisma.chef.findMany({ orderBy: { id: "asc" } });
    if (q) {
      const needle = q.toLowerCase();
      chefs = chefs.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.specialty.toLowerCase().includes(needle)
      );
    }
    return sendOk(res, chefs);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID đầu bếp không hợp lệ.");
    }
    const chef = await prisma.chef.findUnique({ where: { id } });
    if (!chef) {
      return sendNotFound(res, `Không tìm thấy đầu bếp #${id}.`);
    }
    return sendOk(res, chef);
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/chefs", async (req, res, next) => {
  try {
    const { valid, fields, data } = validateApiChefInput(req.body, {
      partial: false,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const created = await prisma.chef.create({ data });
    return sendOk(res, created);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch("/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID đầu bếp không hợp lệ.");
    }
    const { valid, fields, data } = validateApiChefInput(req.body, {
      partial: true,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const existing = await prisma.chef.findUnique({ where: { id } });
    if (!existing) {
      return sendNotFound(res, `Không tìm thấy đầu bếp #${id}.`);
    }
    const updated = await prisma.chef.update({ where: { id }, data });
    return sendOk(res, updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.delete("/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID đầu bếp không hợp lệ.");
    }
    const deleted = await prisma.chef.delete({ where: { id } });
    if (!deleted) {
      return sendNotFound(res, `Không tìm thấy đầu bếp #${id}.`);
    }
    return sendOk(res, null);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. RESOURCE: /api/ingredients
// ============================================================================

apiRouter.get("/ingredients", async (req, res, next) => {
  try {
    const q = normalizeQueryString(req.query.q);
    let ingredients = await prisma.ingredient.findMany({
      orderBy: { id: "asc" },
    });
    if (q) {
      const needle = q.toLowerCase();
      ingredients = ingredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(needle) ||
          ing.unit.toLowerCase().includes(needle)
      );
    }
    return sendOk(res, ingredients);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID nguyên liệu không hợp lệ.");
    }
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      return sendNotFound(res, `Không tìm thấy nguyên liệu #${id}.`);
    }
    return sendOk(res, ingredient);
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/ingredients", async (req, res, next) => {
  try {
    const { valid, fields, data } = validateApiIngredientInput(req.body, {
      partial: false,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const created = await prisma.ingredient.create({ data });
    return sendOk(res, created);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch("/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID nguyên liệu không hợp lệ.");
    }
    const { valid, fields, data } = validateApiIngredientInput(req.body, {
      partial: true,
    });
    if (!valid) {
      return sendValidationFailed(res, fields);
    }
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return sendNotFound(res, `Không tìm thấy nguyên liệu #${id}.`);
    }
    const updated = await prisma.ingredient.update({ where: { id }, data });
    return sendOk(res, updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.delete("/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendNotFound(res, "ID nguyên liệu không hợp lệ.");
    }
    const deleted = await prisma.ingredient.delete({ where: { id } });
    if (!deleted) {
      return sendNotFound(res, `Không tìm thấy nguyên liệu #${id}.`);
    }
    return sendOk(res, null);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. BONUS RESOURCE: /api/orders (For ShopeeFood SPA Ordering Flow)
// ============================================================================

apiRouter.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { id: "desc" } });
    return sendOk(res, orders);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/orders/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return sendNotFound(res, "ID đơn hàng không hợp lệ.");
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return sendNotFound(res, `Không tìm thấy đơn hàng #${id}.`);
    return sendOk(res, order);
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/orders", async (req, res, next) => {
  try {
    const body = req.body || {};
    const fields = {};
    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone =
      typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const voucherCode =
      typeof body.voucherCode === "string"
        ? body.voucherCode.trim().toUpperCase()
        : "";

    if (!customerName) fields.customerName = "Vui lòng nhập họ tên người nhận.";
    if (!customerPhone) fields.customerPhone = "Vui lòng nhập số điện thoại.";
    if (!address) fields.address = "Vui lòng nhập địa chỉ giao hàng.";
    if (!Array.isArray(body.items) || body.items.length === 0) {
      fields.items = "Giỏ hàng phải có ít nhất 1 món ăn.";
    }

    if (Object.keys(fields).length > 0) {
      return sendValidationFailed(res, fields);
    }

    let subtotal = 0;
    const validItems = [];
    for (const item of body.items) {
      const dishId = parsePositiveId(item?.id);
      const qty = Math.max(1, Math.min(50, Number(item?.qty) || 1));
      if (!dishId) continue;
      const dish = await prisma.dish.findUnique({ where: { id: dishId } });
      if (dish && dish.available) {
        subtotal += dish.price * qty;
        validItems.push({
          id: dish.id,
          name: dish.name,
          price: dish.price,
          imageUrl: dish.imageUrl,
          qty,
        });
      }
    }

    if (validItems.length === 0) {
      return sendValidationFailed(res, {
        items: "Các món trong giỏ không hợp lệ hoặc đã hết hàng.",
      });
    }

    const shippingFee = 16000;
    let discount = 0;
    if (voucherCode === "SHOPEE20") {
      discount = Math.min(35000, Math.round(subtotal * 0.2));
    } else if (voucherCode === "FREESHIP") {
      discount = shippingFee;
    } else if (voucherCode === "KTPM3") {
      discount = 25000;
    }

    const total = Math.max(0, subtotal + shippingFee - discount);
    const createdOrder = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        address,
        note,
        voucherCode,
        subtotal,
        shippingFee,
        discount,
        total,
        status: "Bếp đang chuẩn bị món",
        items: validItems,
      },
    });

    return sendOk(res, createdOrder);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// TECHNICAL ERRORS FOR /api/* (404 and 500 MUST NOT HAVE { ok } SHAPE)
// ============================================================================

apiRouter.use((req, res) => {
  return res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

apiRouter.use((err, req, res, next) => {
  console.error("[API Technical Error 500]:", err);
  return res.status(500).json({
    message: "Internal Server Error",
  });
});

module.exports = { apiRouter };
