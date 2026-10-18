const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");
require("dotenv").config();

const {
  INITIAL_DISHES,
  INITIAL_CHEFS,
  INITIAL_INGREDIENTS,
} = require("./seed-data");

const databaseUrl = process.env.DATABASE_URL || "file:./data/shopeefood.db";
const isPostgres =
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://");

let sqliteDb = null;
let pgPool = null;

function normalizeDish(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    originalPrice:
      row.originalPrice !== null && row.originalPrice !== undefined
        ? Number(row.originalPrice)
        : Math.round(Number(row.price) * 1.18),
    category: row.category || "Món Chính",
    imageUrl:
      row.imageUrl ||
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    rating: Number(row.rating || 4.8),
    soldCount: Number(row.soldCount || 0),
    prepTimeMin: Number(row.prepTimeMin || 15),
    available: Boolean(row.available === true || row.available === 1),
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

function normalizeChef(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    specialty: row.specialty,
    experience: Number(row.experience ?? 3),
    bio: row.bio || "",
    avatarUrl:
      row.avatarUrl ||
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80",
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

function normalizeIngredient(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    unit: row.unit,
    stock: Number(row.stock ?? 100),
    origin: row.origin || "Việt Nam",
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

function normalizeOrder(row) {
  if (!row) return null;
  let items = [];
  try {
    items = JSON.parse(row.itemsJson || "[]");
  } catch {
    items = [];
  }
  return {
    id: Number(row.id),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    address: row.address,
    note: row.note || "",
    voucherCode: row.voucherCode || "",
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shippingFee),
    discount: Number(row.discount || 0),
    total: Number(row.total),
    status: row.status || "Đang chuẩn bị món",
    items,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

function initSqlite() {
  if (sqliteDb) return sqliteDb;

  let filePath = databaseUrl.replace(/^file:/, "");
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(__dirname, "..", filePath);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  sqliteDb = new DatabaseSync(filePath);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      originalPrice INTEGER,
      category TEXT,
      imageUrl TEXT,
      rating REAL DEFAULT 4.8,
      soldCount INTEGER DEFAULT 0,
      prepTimeMin INTEGER DEFAULT 15,
      available INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      experience INTEGER DEFAULT 3,
      bio TEXT,
      avatarUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER DEFAULT 100,
      origin TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      address TEXT NOT NULL,
      note TEXT,
      voucherCode TEXT,
      subtotal INTEGER NOT NULL,
      shippingFee INTEGER NOT NULL,
      discount INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      status TEXT DEFAULT 'Đang chuẩn bị món',
      itemsJson TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  const dishCount = sqliteDb
    .prepare("SELECT COUNT(*) as cnt FROM dishes")
    .get().cnt;
  if (Number(dishCount) === 0) {
    seedSqliteSync(sqliteDb);
  }

  return sqliteDb;
}

function seedSqliteSync(db) {
  db.exec(`
    DELETE FROM dishes;
    DELETE FROM chefs;
    DELETE FROM ingredients;
    DELETE FROM sqlite_sequence WHERE name IN ('dishes', 'chefs', 'ingredients');
  `);

  const insertDish = db.prepare(`
    INSERT INTO dishes (name, description, price, originalPrice, category, imageUrl, rating, soldCount, prepTimeMin, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of INITIAL_DISHES) {
    insertDish.run(
      d.name,
      d.description,
      d.price,
      d.originalPrice,
      d.category,
      d.imageUrl,
      d.rating,
      d.soldCount,
      d.prepTimeMin,
      d.available ? 1 : 0
    );
  }

  const insertChef = db.prepare(`
    INSERT INTO chefs (name, specialty, experience, bio, avatarUrl)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const c of INITIAL_CHEFS) {
    insertChef.run(c.name, c.specialty, c.experience, c.bio, c.avatarUrl);
  }

  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (name, unit, stock, origin)
    VALUES (?, ?, ?, ?)
  `);
  for (const ing of INITIAL_INGREDIENTS) {
    insertIngredient.run(ing.name, ing.unit, ing.stock, ing.origin);
  }
}

async function initPostgres() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pgPool;
}

const prisma = {
  $driver: isPostgres ? "postgresql (Supabase)" : "sqlite (Local Dev)",

  dish: {
    async findMany({ where = {}, orderBy = { id: "asc" } } = {}) {
      const q = where?.name?.contains ? String(where.name.contains).trim() : "";
      const category = where?.category ? String(where.category).trim() : "";
      const availableOnly =
        where?.available !== undefined ? Boolean(where.available) : undefined;
      const sortDir =
        String(orderBy?.id || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

      if (isPostgres) {
        const pool = await initPostgres();
        const conditions = [];
        const params = [];
        if (q) {
          params.push(`%${q}%`);
          conditions.push(
            `(name ILIKE $${params.length} OR COALESCE(description, '') ILIKE $${params.length} OR COALESCE(category, '') ILIKE $${params.length})`
          );
        }
        if (category) {
          params.push(category);
          conditions.push(`category = $${params.length}`);
        }
        if (availableOnly !== undefined) {
          params.push(availableOnly);
          conditions.push(`available = $${params.length}`);
        }
        const whereClause = conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : "";
        const { rows } = await pool.query(
          `SELECT * FROM dishes ${whereClause} ORDER BY id ${sortDir}`,
          params
        );
        return rows.map(normalizeDish);
      }

      const db = initSqlite();
      const rows = db
        .prepare(`SELECT * FROM dishes ORDER BY id ${sortDir}`)
        .all()
        .map(normalizeDish);

      return rows.filter((item) => {
        if (q) {
          const needle = q.toLowerCase();
          const hay =
            `${item.name} ${item.description} ${item.category}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        if (category && item.category !== category) return false;
        if (availableOnly !== undefined && item.available !== availableOnly)
          return false;
        return true;
      });
    },

    async findUnique({ where }) {
      const id = Number(where?.id);
      if (!Number.isInteger(id) || id <= 0) return null;

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          "SELECT * FROM dishes WHERE id = $1",
          [id]
        );
        return normalizeDish(rows[0]);
      }

      const db = initSqlite();
      const row = db.prepare("SELECT * FROM dishes WHERE id = ?").get(id);
      return normalizeDish(row);
    },

    async create({ data }) {
      const originalPrice =
        data.originalPrice || Math.round(Number(data.price) * 1.18);
      const category = data.category || "Món Chính";
      const imageUrl =
        data.imageUrl ||
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
      const rating = data.rating ?? 4.8;
      const soldCount = data.soldCount ?? 0;
      const prepTimeMin = data.prepTimeMin ?? 15;
      const available = data.available !== undefined ? Boolean(data.available) : true;

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `INSERT INTO dishes (name, description, price, "originalPrice", category, "imageUrl", rating, "soldCount", "prepTimeMin", available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            data.name,
            data.description || null,
            Number(data.price),
            originalPrice,
            category,
            imageUrl,
            rating,
            soldCount,
            prepTimeMin,
            available,
          ]
        );
        return normalizeDish(rows[0]);
      }

      const db = initSqlite();
      const info = db
        .prepare(
          `INSERT INTO dishes (name, description, price, originalPrice, category, imageUrl, rating, soldCount, prepTimeMin, available)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.name,
          data.description || null,
          Number(data.price),
          originalPrice,
          category,
          imageUrl,
          rating,
          soldCount,
          prepTimeMin,
          available ? 1 : 0
        );
      return this.findUnique({ where: { id: Number(info.lastInsertRowid) } });
    },

    async update({ where, data }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = {
        name: data.name ?? existing.name,
        description:
          data.description !== undefined
            ? data.description
            : existing.description,
        price: data.price !== undefined ? Number(data.price) : existing.price,
        originalPrice:
          data.originalPrice !== undefined
            ? Number(data.originalPrice)
            : existing.originalPrice,
        category: data.category ?? existing.category,
        imageUrl: data.imageUrl || existing.imageUrl,
        prepTimeMin:
          data.prepTimeMin !== undefined
            ? Number(data.prepTimeMin)
            : existing.prepTimeMin,
        available:
          data.available !== undefined
            ? Boolean(data.available)
            : existing.available,
      };

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `UPDATE dishes
           SET name = $1, description = $2, price = $3, "originalPrice" = $4, category = $5, "imageUrl" = $6, "prepTimeMin" = $7, available = $8
           WHERE id = $9 RETURNING *`,
          [
            updated.name,
            updated.description,
            updated.price,
            updated.originalPrice,
            updated.category,
            updated.imageUrl,
            updated.prepTimeMin,
            updated.available,
            id,
          ]
        );
        return normalizeDish(rows[0]);
      }

      const db = initSqlite();
      db.prepare(
        `UPDATE dishes
         SET name = ?, description = ?, price = ?, originalPrice = ?, category = ?, imageUrl = ?, prepTimeMin = ?, available = ?
         WHERE id = ?`
      ).run(
        updated.name,
        updated.description,
        updated.price,
        updated.originalPrice,
        updated.category,
        updated.imageUrl,
        updated.prepTimeMin,
        updated.available ? 1 : 0,
        id
      );
      return this.findUnique({ where: { id } });
    },

    async delete({ where }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      if (isPostgres) {
        const pool = await initPostgres();
        await pool.query("DELETE FROM dishes WHERE id = $1", [id]);
        return existing;
      }

      const db = initSqlite();
      db.prepare("DELETE FROM dishes WHERE id = ?").run(id);
      return existing;
    },
  },

  chef: {
    async findMany({ orderBy = { id: "asc" } } = {}) {
      const sortDir =
        String(orderBy?.id || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `SELECT * FROM chefs ORDER BY id ${sortDir}`
        );
        return rows.map(normalizeChef);
      }
      const db = initSqlite();
      return db
        .prepare(`SELECT * FROM chefs ORDER BY id ${sortDir}`)
        .all()
        .map(normalizeChef);
    },

    async findUnique({ where }) {
      const id = Number(where?.id);
      if (!Number.isInteger(id) || id <= 0) return null;
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query("SELECT * FROM chefs WHERE id = $1", [
          id,
        ]);
        return normalizeChef(rows[0]);
      }
      const db = initSqlite();
      return normalizeChef(
        db.prepare("SELECT * FROM chefs WHERE id = ?").get(id)
      );
    },

    async create({ data }) {
      const experience = Number(data.experience ?? 3);
      const bio = data.bio || "";
      const avatarUrl =
        data.avatarUrl ||
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80";

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `INSERT INTO chefs (name, specialty, experience, bio, "avatarUrl")
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [data.name, data.specialty, experience, bio, avatarUrl]
        );
        return normalizeChef(rows[0]);
      }

      const db = initSqlite();
      const info = db
        .prepare(
          `INSERT INTO chefs (name, specialty, experience, bio, avatarUrl)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(data.name, data.specialty, experience, bio, avatarUrl);
      return this.findUnique({ where: { id: Number(info.lastInsertRowid) } });
    },

    async update({ where, data }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = {
        name: data.name ?? existing.name,
        specialty: data.specialty ?? existing.specialty,
        experience:
          data.experience !== undefined
            ? Number(data.experience)
            : existing.experience,
        bio: data.bio !== undefined ? data.bio : existing.bio,
        avatarUrl: data.avatarUrl || existing.avatarUrl,
      };

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `UPDATE chefs SET name = $1, specialty = $2, experience = $3, bio = $4, "avatarUrl" = $5 WHERE id = $6 RETURNING *`,
          [
            updated.name,
            updated.specialty,
            updated.experience,
            updated.bio,
            updated.avatarUrl,
            id,
          ]
        );
        return normalizeChef(rows[0]);
      }

      const db = initSqlite();
      db.prepare(
        `UPDATE chefs SET name = ?, specialty = ?, experience = ?, bio = ?, avatarUrl = ? WHERE id = ?`
      ).run(
        updated.name,
        updated.specialty,
        updated.experience,
        updated.bio,
        updated.avatarUrl,
        id
      );
      return this.findUnique({ where: { id } });
    },

    async delete({ where }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      if (isPostgres) {
        const pool = await initPostgres();
        await pool.query("DELETE FROM chefs WHERE id = $1", [id]);
        return existing;
      }

      const db = initSqlite();
      db.prepare("DELETE FROM chefs WHERE id = ?").run(id);
      return existing;
    },
  },

  ingredient: {
    async findMany({ orderBy = { id: "asc" } } = {}) {
      const sortDir =
        String(orderBy?.id || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `SELECT * FROM ingredients ORDER BY id ${sortDir}`
        );
        return rows.map(normalizeIngredient);
      }
      const db = initSqlite();
      return db
        .prepare(`SELECT * FROM ingredients ORDER BY id ${sortDir}`)
        .all()
        .map(normalizeIngredient);
    },

    async findUnique({ where }) {
      const id = Number(where?.id);
      if (!Number.isInteger(id) || id <= 0) return null;
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          "SELECT * FROM ingredients WHERE id = $1",
          [id]
        );
        return normalizeIngredient(rows[0]);
      }
      const db = initSqlite();
      return normalizeIngredient(
        db.prepare("SELECT * FROM ingredients WHERE id = ?").get(id)
      );
    },

    async create({ data }) {
      const stock = Number(data.stock ?? 100);
      const origin = data.origin || "Việt Nam";

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `INSERT INTO ingredients (name, unit, stock, origin) VALUES ($1, $2, $3, $4) RETURNING *`,
          [data.name, data.unit, stock, origin]
        );
        return normalizeIngredient(rows[0]);
      }

      const db = initSqlite();
      const info = db
        .prepare(
          `INSERT INTO ingredients (name, unit, stock, origin) VALUES (?, ?, ?, ?)`
        )
        .run(data.name, data.unit, stock, origin);
      return this.findUnique({ where: { id: Number(info.lastInsertRowid) } });
    },

    async update({ where, data }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = {
        name: data.name ?? existing.name,
        unit: data.unit ?? existing.unit,
        stock: data.stock !== undefined ? Number(data.stock) : existing.stock,
        origin: data.origin !== undefined ? data.origin : existing.origin,
      };

      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `UPDATE ingredients SET name = $1, unit = $2, stock = $3, origin = $4 WHERE id = $5 RETURNING *`,
          [updated.name, updated.unit, updated.stock, updated.origin, id]
        );
        return normalizeIngredient(rows[0]);
      }

      const db = initSqlite();
      db.prepare(
        `UPDATE ingredients SET name = ?, unit = ?, stock = ?, origin = ? WHERE id = ?`
      ).run(updated.name, updated.unit, updated.stock, updated.origin, id);
      return this.findUnique({ where: { id } });
    },

    async delete({ where }) {
      const id = Number(where?.id);
      const existing = await this.findUnique({ where: { id } });
      if (!existing) return null;

      if (isPostgres) {
        const pool = await initPostgres();
        await pool.query("DELETE FROM ingredients WHERE id = $1", [id]);
        return existing;
      }

      const db = initSqlite();
      db.prepare("DELETE FROM ingredients WHERE id = ?").run(id);
      return existing;
    },
  },

  order: {
    async findMany({ orderBy = { id: "desc" } } = {}) {
      const sortDir =
        String(orderBy?.id || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `SELECT * FROM orders ORDER BY id ${sortDir}`
        );
        return rows.map(normalizeOrder);
      }
      const db = initSqlite();
      return db
        .prepare(`SELECT * FROM orders ORDER BY id ${sortDir}`)
        .all()
        .map(normalizeOrder);
    },

    async findUnique({ where }) {
      const id = Number(where?.id);
      if (!Number.isInteger(id) || id <= 0) return null;
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          "SELECT * FROM orders WHERE id = $1",
          [id]
        );
        return normalizeOrder(rows[0]);
      }
      const db = initSqlite();
      return normalizeOrder(
        db.prepare("SELECT * FROM orders WHERE id = ?").get(id)
      );
    },

    async create({ data }) {
      const itemsJson = JSON.stringify(data.items || []);
      if (isPostgres) {
        const pool = await initPostgres();
        const { rows } = await pool.query(
          `INSERT INTO orders ("customerName", "customerPhone", address, note, "voucherCode", subtotal, "shippingFee", discount, total, status, "itemsJson")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            data.customerName,
            data.customerPhone,
            data.address,
            data.note || "",
            data.voucherCode || "",
            Number(data.subtotal),
            Number(data.shippingFee),
            Number(data.discount || 0),
            Number(data.total),
            data.status || "Đang chuẩn bị món",
            itemsJson,
          ]
        );
        return normalizeOrder(rows[0]);
      }

      const db = initSqlite();
      const info = db
        .prepare(
          `INSERT INTO orders (customerName, customerPhone, address, note, voucherCode, subtotal, shippingFee, discount, total, status, itemsJson)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.customerName,
          data.customerPhone,
          data.address,
          data.note || "",
          data.voucherCode || "",
          Number(data.subtotal),
          Number(data.shippingFee),
          Number(data.discount || 0),
          Number(data.total),
          data.status || "Đang chuẩn bị món",
          itemsJson
        );
      return this.findUnique({ where: { id: Number(info.lastInsertRowid) } });
    },
  },

  async resetAndSeed() {
    if (isPostgres) {
      const pool = await initPostgres();
      const sqlScript = fs.readFileSync(
        path.resolve(__dirname, "..", "db", "supabase-init.sql"),
        "utf8"
      );
      await pool.query(sqlScript);
      return;
    }
    const db = initSqlite();
    seedSqliteSync(db);
  },
};

module.exports = { prisma };
