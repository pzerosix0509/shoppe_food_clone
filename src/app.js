const path = require("node:path");
const express = require("express");
const methodOverride = require("method-override");
const { prisma } = require("./db");
const { apiRouter } = require("./api-router");
const {
  parsePositiveId,
  normalizeQueryString,
  validateDishInput,
  validateChefInput,
  validateIngredientInput,
} = require("./validators");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Mount Block #6 REST API at /api (handles its own CORS, JSON parsing, and 404/500)
app.use("/api", apiRouter);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use("/public", express.static(path.join(__dirname, "public")));

app.locals.formatVND = (amount) => {
  return Number(amount || 0).toLocaleString("vi-VN") + "đ";
};

function render404(res, message = "Trang hoặc bản ghi bạn tìm kiếm không tồn tại.") {
  return res.status(404).render("404", { message });
}

// ============================================================================
// 1. TRANG NGƯỜI DÙNG (PUBLIC STOREFRONT - SHOPEEFOOD EXPERIENCE)
// ============================================================================

app.get("/", (req, res) => {
  res.redirect(302, "/dishes");
});

app.get("/dishes", async (req, res, next) => {
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

    const allDishes = await prisma.dish.findMany({ orderBy: { id: "asc" } });
    const chefs = await prisma.chef.findMany({ orderBy: { id: "asc" } });
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { id: "asc" },
    });

    const categories = Array.from(
      new Set(allDishes.map((d) => d.category).filter(Boolean))
    );

    res.status(200).render("dishes/index", {
      dishes,
      allDishes,
      chefs,
      ingredients,
      categories,
      q,
      selectedCategory: category,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return render404(res, "Mã món ăn không hợp lệ.");
    }

    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) {
      return render404(res, `Không tìm thấy món ăn có mã #${id}.`);
    }

    const allDishes = await prisma.dish.findMany({ orderBy: { id: "asc" } });
    const relatedDishes = allDishes
      .filter((d) => d.id !== dish.id && d.category === dish.category)
      .slice(0, 4);

    res.status(200).render("dishes/show", { dish, relatedDishes });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. ĐẶT MÓN & THEO DÕI ĐƠN HÀNG (SHOPEEFOOD ORDERING FLOW)
// ============================================================================

app.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { id: "desc" } });
    res.status(200).render("orders/index", { orders });
  } catch (err) {
    next(err);
  }
});

app.get("/orders/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return render404(res, "Mã đơn hàng không hợp lệ.");
    }
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return render404(res, `Không tìm thấy đơn hàng #${id}.`);
    }
    res.status(200).render("orders/show", { order });
  } catch (err) {
    next(err);
  }
});

app.post("/orders", async (req, res, next) => {
  try {
    const customerName = String(req.body.customerName ?? "").trim();
    const customerPhone = String(req.body.customerPhone ?? "").trim();
    const address = String(req.body.address ?? "").trim();
    const note = String(req.body.note ?? "").trim();
    const voucherCode = String(req.body.voucherCode ?? "")
      .trim()
      .toUpperCase();

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(req.body.itemsJson || "[]");
    } catch {
      parsedItems = [];
    }

    if (!customerName || !customerPhone || !address || parsedItems.length === 0) {
      return res.status(400).render("orders/error", {
        message:
          "Vui lòng điền đầy đủ Họ tên, Số điện thoại, Địa chỉ giao hàng và chọn ít nhất 1 món ăn.",
      });
    }

    let subtotal = 0;
    const validItems = [];
    for (const item of parsedItems) {
      const dishId = parsePositiveId(item.id);
      const qty = Math.max(1, Math.min(50, Number(item.qty) || 1));
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
      return res.status(400).render("orders/error", {
        message: "Giỏ hàng không có món ăn hợp lệ hoặc món đã hết hàng.",
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

    res.redirect(303, `/orders/${createdOrder.id}`);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. TRANG QUẢN TRỊ (SSR ADMIN PORTAL - BLOCK #5 CONTRACT)
//    Tuyệt đối không dùng fetch/AJAX trong /admin; dùng POST/PATCH/DELETE + 303
// ============================================================================

app.get("/admin", async (req, res, next) => {
  try {
    const [dishes, chefs, ingredients, orders] = await Promise.all([
      prisma.dish.findMany(),
      prisma.chef.findMany(),
      prisma.ingredient.findMany(),
      prisma.order.findMany(),
    ]);
    res.status(200).render("admin/dashboard", {
      dishes,
      chefs,
      ingredients,
      orders,
      dbDriver: prisma.$driver,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------- CRUD: DISHES ----------------------------------

app.get("/admin/dishes", async (req, res, next) => {
  try {
    const q = normalizeQueryString(req.query.q);
    const dishes = await prisma.dish.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      orderBy: { id: "asc" },
    });
    res.status(200).render("admin/dishes/index", { dishes, q });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/dishes/new", (req, res) => {
  res.status(200).render("admin/dishes/form", {
    mode: "create",
    dishId: null,
    values: {
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      category: "Món Nước",
      imageUrl: "",
      prepTimeMin: "15",
      available: true,
    },
    errors: {},
  });
});

app.post("/admin/dishes", async (req, res, next) => {
  try {
    const { valid, errors, values, data } = validateDishInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/dishes/form", {
        mode: "create",
        dishId: null,
        values,
        errors,
      });
    }
    const created = await prisma.dish.create({ data });
    return res.redirect(303, `/admin/dishes/${created.id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID món ăn không hợp lệ.");

    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) return render404(res, `Không tìm thấy món ăn #${id}.`);

    res.status(200).render("admin/dishes/show", { dish });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/dishes/:id/edit", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID món ăn không hợp lệ.");

    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) return render404(res, `Không tìm thấy món ăn #${id}.`);

    res.status(200).render("admin/dishes/form", {
      mode: "edit",
      dishId: dish.id,
      values: {
        name: dish.name,
        description: dish.description,
        price: String(dish.price),
        originalPrice: String(dish.originalPrice || ""),
        category: dish.category,
        imageUrl: dish.imageUrl,
        prepTimeMin: String(dish.prepTimeMin || 15),
        available: dish.available,
      },
      errors: {},
    });
  } catch (err) {
    next(err);
  }
});

app.patch("/admin/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID món ăn không hợp lệ.");

    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) return render404(res, `Không tìm thấy món ăn #${id}.`);

    const { valid, errors, values, data } = validateDishInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/dishes/form", {
        mode: "edit",
        dishId: id,
        values,
        errors,
      });
    }

    await prisma.dish.update({ where: { id }, data });
    return res.redirect(303, `/admin/dishes/${id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/dishes/:id/delete", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID món ăn không hợp lệ.");

    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) return render404(res, `Không tìm thấy món ăn #${id}.`);

    res.status(200).render("admin/dishes/delete", { dish });
  } catch (err) {
    next(err);
  }
});

app.delete("/admin/dishes/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID món ăn không hợp lệ.");

    const deleted = await prisma.dish.delete({ where: { id } });
    if (!deleted) return render404(res, `Không tìm thấy món ăn #${id}.`);

    return res.redirect(303, "/admin/dishes");
  } catch (err) {
    next(err);
  }
});

// ---------------------------- CRUD: CHEFS -----------------------------------

app.get("/admin/chefs", async (req, res, next) => {
  try {
    const chefs = await prisma.chef.findMany({ orderBy: { id: "asc" } });
    res.status(200).render("admin/chefs/index", { chefs });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/chefs/new", (req, res) => {
  res.status(200).render("admin/chefs/form", {
    mode: "create",
    chefId: null,
    values: {
      name: "",
      specialty: "",
      experience: "5",
      bio: "",
      avatarUrl: "",
    },
    errors: {},
  });
});

app.post("/admin/chefs", async (req, res, next) => {
  try {
    const { valid, errors, values, data } = validateChefInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/chefs/form", {
        mode: "create",
        chefId: null,
        values,
        errors,
      });
    }
    const created = await prisma.chef.create({ data });
    return res.redirect(303, `/admin/chefs/${created.id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID đầu bếp không hợp lệ.");

    const chef = await prisma.chef.findUnique({ where: { id } });
    if (!chef) return render404(res, `Không tìm thấy đầu bếp #${id}.`);

    res.status(200).render("admin/chefs/show", { chef });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/chefs/:id/edit", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID đầu bếp không hợp lệ.");

    const chef = await prisma.chef.findUnique({ where: { id } });
    if (!chef) return render404(res, `Không tìm thấy đầu bếp #${id}.`);

    res.status(200).render("admin/chefs/form", {
      mode: "edit",
      chefId: chef.id,
      values: {
        name: chef.name,
        specialty: chef.specialty,
        experience: String(chef.experience),
        bio: chef.bio,
        avatarUrl: chef.avatarUrl,
      },
      errors: {},
    });
  } catch (err) {
    next(err);
  }
});

app.patch("/admin/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID đầu bếp không hợp lệ.");

    const existing = await prisma.chef.findUnique({ where: { id } });
    if (!existing) return render404(res, `Không tìm thấy đầu bếp #${id}.`);

    const { valid, errors, values, data } = validateChefInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/chefs/form", {
        mode: "edit",
        chefId: id,
        values,
        errors,
      });
    }

    await prisma.chef.update({ where: { id }, data });
    return res.redirect(303, `/admin/chefs/${id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/chefs/:id/delete", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID đầu bếp không hợp lệ.");

    const chef = await prisma.chef.findUnique({ where: { id } });
    if (!chef) return render404(res, `Không tìm thấy đầu bếp #${id}.`);

    res.status(200).render("admin/chefs/delete", { chef });
  } catch (err) {
    next(err);
  }
});

app.delete("/admin/chefs/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID đầu bếp không hợp lệ.");

    const deleted = await prisma.chef.delete({ where: { id } });
    if (!deleted) return render404(res, `Không tìm thấy đầu bếp #${id}.`);

    return res.redirect(303, "/admin/chefs");
  } catch (err) {
    next(err);
  }
});

// ------------------------- CRUD: INGREDIENTS --------------------------------

app.get("/admin/ingredients", async (req, res, next) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { id: "asc" },
    });
    res.status(200).render("admin/ingredients/index", { ingredients });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/ingredients/new", (req, res) => {
  res.status(200).render("admin/ingredients/form", {
    mode: "create",
    ingredientId: null,
    values: {
      name: "",
      unit: "kg",
      stock: "100",
      origin: "Việt Nam",
    },
    errors: {},
  });
});

app.post("/admin/ingredients", async (req, res, next) => {
  try {
    const { valid, errors, values, data } = validateIngredientInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/ingredients/form", {
        mode: "create",
        ingredientId: null,
        values,
        errors,
      });
    }
    const created = await prisma.ingredient.create({ data });
    return res.redirect(303, `/admin/ingredients/${created.id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID nguyên liệu không hợp lệ.");

    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient)
      return render404(res, `Không tìm thấy nguyên liệu #${id}.`);

    res.status(200).render("admin/ingredients/show", { ingredient });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/ingredients/:id/edit", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID nguyên liệu không hợp lệ.");

    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient)
      return render404(res, `Không tìm thấy nguyên liệu #${id}.`);

    res.status(200).render("admin/ingredients/form", {
      mode: "edit",
      ingredientId: ingredient.id,
      values: {
        name: ingredient.name,
        unit: ingredient.unit,
        stock: String(ingredient.stock),
        origin: ingredient.origin,
      },
      errors: {},
    });
  } catch (err) {
    next(err);
  }
});

app.patch("/admin/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID nguyên liệu không hợp lệ.");

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) return render404(res, `Không tìm thấy nguyên liệu #${id}.`);

    const { valid, errors, values, data } = validateIngredientInput(req.body);
    if (!valid) {
      return res.status(400).render("admin/ingredients/form", {
        mode: "edit",
        ingredientId: id,
        values,
        errors,
      });
    }

    await prisma.ingredient.update({ where: { id }, data });
    return res.redirect(303, `/admin/ingredients/${id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/ingredients/:id/delete", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID nguyên liệu không hợp lệ.");

    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient)
      return render404(res, `Không tìm thấy nguyên liệu #${id}.`);

    res.status(200).render("admin/ingredients/delete", { ingredient });
  } catch (err) {
    next(err);
  }
});

app.delete("/admin/ingredients/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) return render404(res, "ID nguyên liệu không hợp lệ.");

    const deleted = await prisma.ingredient.delete({ where: { id } });
    if (!deleted) return render404(res, `Không tìm thấy nguyên liệu #${id}.`);

    return res.redirect(303, "/admin/ingredients");
  } catch (err) {
    next(err);
  }
});

// Fallback 404 & Error Handler (Không lộ err.message của DB ra client)
app.use((req, res) => {
  render404(res, `Không tìm thấy đường dẫn ${req.originalUrl}`);
});

app.use((err, req, res, next) => {
  console.error("[Server Error]:", err);
  res.status(500).render("500");
});

module.exports = { app };
