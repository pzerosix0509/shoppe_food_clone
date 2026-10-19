(function () {
  const rootEl = document.getElementById("spa-root");
  const navEl = document.getElementById("spa-navbar");
  const apiInputEl = document.getElementById("api-base-url-input");
  const apiResetBtn = document.getElementById("api-base-url-reset");

  let activeAbortController = null;
  const CART_STORAGE_KEY = "shopeefood_spa_cart_v1";
  const SHIPPING_FEE = 16000;

  // ==========================================================================
  // SECURITY & FORMATTING HELPERS (XSS Prevention - Slide 50)
  // ==========================================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatVND(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
  }

  // ==========================================================================
  // SHOPPING CART (Client UI Cart for ShopeeFood Storefront)
  // ==========================================================================

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCountBadges();
  }

  function updateCartCountBadges() {
    const cart = loadCart();
    const count = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    document.querySelectorAll("[data-spa-cart-count]").forEach((el) => {
      el.textContent = String(count);
    });
  }

  // ==========================================================================
  // CLIENT-SIDE ROUTER (History API - Zero Document Reloads)
  // ==========================================================================

  function navigate(url, { replace = false } = {}) {
    if (replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
    renderCurrentRoute();
  }

  function getSearchParam(name) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(name) || "").trim();
  }

  function cancelInFlightRequests() {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    return activeAbortController.signal;
  }

  // ==========================================================================
  // REUSABLE UI STATES: loading, error (technical), notFound, empty
  // ==========================================================================

  function renderNavbar(isAdminRoute) {
    const currentQ = getSearchParam("q");
    if (isAdminRoute) {
      const path = window.location.pathname;
      const active = (prefix) =>
        path === prefix || path.startsWith(prefix + "/") ? "active" : "";
      navEl.innerHTML = `
        <header class="admin-header-bar">
          <div class="container admin-nav">
            <div style="display:flex;align-items:center;gap:14px;">
              <a href="/admin" data-spa-link style="font-weight:800;font-size:1.2rem;color:#fff;">
                🧑‍🍳 ShopeeFood SPA Admin
              </a>
              <span class="sf-badge success">REST API + SPA Router</span>
            </div>
            <nav class="admin-tabs">
              <a href="/admin" data-spa-link class="admin-tab ${path === "/admin" ? "active" : ""}">Tổng quan</a>
              <a href="/admin/dishes" data-spa-link class="admin-tab ${active("/admin/dishes")}">Món ăn (Dishes)</a>
              <a href="/admin/chefs" data-spa-link class="admin-tab ${active("/admin/chefs")}">Đầu bếp (Chefs)</a>
              <a href="/admin/ingredients" data-spa-link class="admin-tab ${active("/admin/ingredients")}">Nguyên liệu (Ingredients)</a>
              <a href="/dishes" data-spa-link class="admin-tab" style="background:#ee4d2d;color:#fff;">↗ Xem Cửa Hàng SPA</a>
            </nav>
          </div>
        </header>
      `;
    } else {
      navEl.innerHTML = `
        <header class="sf-navbar">
          <div class="container sf-navbar-inner">
            <a href="/dishes" data-spa-link class="sf-brand">
              <span>🛍️ ShopeeFood</span>
              <span class="sf-brand-badge">SPA Mode</span>
            </a>

            <form id="spa-global-search" class="sf-search-form">
              <input
                type="text"
                name="q"
                placeholder="Tìm món phở bò, cơm tấm, trà đào..."
                value="${escapeHtml(currentQ)}"
              />
              <button type="submit">Tìm kiếm</button>
            </form>

            <nav class="sf-nav-links">
              <a href="/dishes" data-spa-link class="sf-nav-btn">🍽️ Thực đơn</a>
              <a href="/orders" data-spa-link class="sf-nav-btn">🛵 Đơn hàng</a>
              <a href="/admin/dishes" data-spa-link class="sf-nav-btn">⚙️ Quản trị (SPA CRUD)</a>
            </nav>
          </div>
        </header>
      `;

      const searchForm = document.getElementById("spa-global-search");
      if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const qVal = new FormData(searchForm).get("q") || "";
          const qs = String(qVal).trim()
            ? `?q=${encodeURIComponent(String(qVal).trim())}`
            : "";
          navigate(`/dishes${qs}`);
        });
      }
    }
    updateCartCountBadges();
  }

  function renderLoadingState(label = "Đang tải dữ liệu từ REST API...") {
    rootEl.innerHTML = `
      <main class="container">
        <div class="spa-state-box" data-testid="state-loading">
          <div class="spa-spinner"></div>
          <h3 style="margin:0 0 6px;">${escapeHtml(label)}</h3>
          <p style="margin:0;color:var(--sf-muted);font-size:0.88rem;">SPA đang gửi request tới <code>${escapeHtml(window.apiClient.getBaseUrl())}</code></p>
        </div>
      </main>
    `;
  }

  function renderTechnicalErrorState(err, backUrl = "/dishes") {
    rootEl.innerHTML = `
      <main class="container">
        <div class="spa-state-box" data-testid="state-error">
          <div style="font-size:3rem;margin-bottom:8px;">⚠️</div>
          <span class="sf-badge muted">LỖI KỸ THUẬT (TẦNG ${escapeHtml(err.layer || 1)})</span>
          <h2 style="margin:10px 0 8px;">Không thể tải dữ liệu</h2>
          <p style="color:var(--sf-danger);font-weight:600;margin-bottom:20px;">
            ${escapeHtml(err.message || "Máy chủ API không phản hồi hoặc gặp sự cố kỹ thuật.")}
          </p>
          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <button type="button" id="spa-retry-btn" class="sf-btn sf-btn-primary">🔄 Thử tải lại</button>
            <a href="${escapeHtml(backUrl)}" data-spa-link class="sf-btn sf-btn-outline">← Quay về</a>
          </div>
        </div>
      </main>
    `;
    const retryBtn = document.getElementById("spa-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => renderCurrentRoute());
    }
  }

  function renderNotFoundState(message = "Không tìm thấy bản ghi hoặc trang yêu cầu.", backUrl = "/dishes") {
    rootEl.innerHTML = `
      <main class="container">
        <div class="spa-state-box" data-testid="state-not-found">
          <div style="font-size:3.2rem;margin-bottom:8px;">🍜</div>
          <span class="sf-badge muted">NOT_FOUND</span>
          <h2 style="margin:10px 0 8px;">Không tìm thấy</h2>
          <p style="color:var(--sf-muted);margin-bottom:20px;">${escapeHtml(message)}</p>
          <div style="display:flex;justify-content:center;gap:12px;">
            <a href="${escapeHtml(backUrl)}" data-spa-link class="sf-btn sf-btn-primary">← Quay lại danh sách</a>
            <a href="/dishes" data-spa-link class="sf-btn sf-btn-outline">Trang chủ Thực đơn</a>
          </div>
        </div>
      </main>
    `;
  }

  // ==========================================================================
  // 1. PUBLIC STOREFRONT: /dishes & /dishes/:id
  // ==========================================================================

  async function renderUserDishesList(signal) {
    renderNavbar(false);
    renderLoadingState("Đang tải thực đơn ShopeeFood...");

    const q = getSearchParam("q");
    const category = getSearchParam("category");
    const res = await window.apiClient.dishes.list({ q, category }, signal);
    if (res.aborted) return;
    if (!res.ok) {
      return renderTechnicalErrorState(res, "/dishes");
    }

    const dishes = res.data || [];
    const categories = ["Món Nước", "Cơm Ngon", "Ăn Vặt & Bánh Mì", "Đồ Uống & Tráng Miệng"];

    rootEl.innerHTML = `
      <section class="sf-hero">
        <div class="container sf-hero-grid">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
            alt="ShopeeFood SPA Flagship"
            class="sf-hero-cover"
          />
          <div>
            <div class="sf-tags-row">
              <span class="sf-tag preferred">⚡ Quán Yêu Thích+ (SPA)</span>
              <span class="sf-tag freeship">FREESHIP XTRA</span>
              <span class="sf-tag open">● REST API Connected</span>
            </div>
            <h1 class="sf-hero-title">Bếp Việt Signature — Trải Nghiệm Đặt Món SPA</h1>
            <div class="sf-hero-meta">
              <span>⭐ <strong>4.9</strong> (2.4k+ đánh giá)</span>
              <span>📍 Chạy trên Client-Side Router (Không tải lại trang)</span>
            </div>
            <div class="sf-vouchers">
              <button type="button" class="sf-voucher-pill" data-pick-voucher="SHOPEE20" style="cursor:pointer;">
                🎟️ Mã <strong>SHOPEE20</strong>: Giảm 20% tối đa 35k
              </button>
              <button type="button" class="sf-voucher-pill" data-pick-voucher="FREESHIP" style="cursor:pointer;">
                🛵 Mã <strong>FREESHIP</strong>: Miễn phí ship 16k
              </button>
            </div>
          </div>
        </div>
      </section>

      <main class="container">
        <div class="sf-store-layout">
          <div>
            <div class="sf-categories">
              <a href="/dishes${q ? "?q=" + encodeURIComponent(q) : ""}" data-spa-link class="sf-cat-pill ${!category ? "active" : ""}">
                Tất cả
              </a>
              ${categories
                .map(
                  (cat) => `
                <a href="/dishes?category=${encodeURIComponent(cat)}${q ? "&q=" + encodeURIComponent(q) : ""}" data-spa-link class="sf-cat-pill ${category === cat ? "active" : ""}">
                  ${escapeHtml(cat)}
                </a>
              `
                )
                .join("")}
            </div>

            ${
              q || category
                ? `
              <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                <span>Đang lọc: <strong>${escapeHtml(q || category)}</strong> (${dishes.length} món)</span>
                <a href="/dishes" data-spa-link style="color:var(--sf-primary);font-weight:600;">✕ Xóa bộ lọc</a>
              </div>
            `
                : ""
            }

            ${
              dishes.length === 0
                ? `
              <div class="sf-card" data-testid="state-empty" style="text-align:center;padding:48px 20px;">
                <div style="font-size:2.5rem;margin-bottom:8px;">🔍</div>
                <h3>Danh sách món ăn trống</h3>
                <p style="color:var(--sf-muted);margin-bottom:16px;">Không có món ăn nào khớp với từ khóa tìm kiếm.</p>
                <a href="/dishes" data-spa-link class="sf-btn sf-btn-primary">Xem toàn bộ thực đơn</a>
              </div>
            `
                : `
              <div class="sf-dish-grid" data-testid="state-ok">
                ${dishes
                  .map(
                    (d) => `
                  <article class="sf-dish-card">
                    <a href="/dishes/${d.id}" data-spa-link class="sf-dish-thumb-wrap">
                      <img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.name)}" class="sf-dish-thumb" loading="lazy" />
                      ${!d.available ? `<div class="sf-soldout-overlay">Tạm hết hàng</div>` : ""}
                    </a>
                    <div class="sf-dish-body">
                      <div class="sf-dish-cat">${escapeHtml(d.category)}</div>
                      <a href="/dishes/${d.id}" data-spa-link>
                        <h2 class="sf-dish-title">${escapeHtml(d.name)}</h2>
                      </a>
                      <p class="sf-dish-desc">${escapeHtml(d.description)}</p>
                      <div class="sf-dish-footer">
                        <span class="sf-price-current">${formatVND(d.price)}</span>
                        <button
                          type="button"
                          class="sf-add-btn"
                          data-spa-add-cart
                          data-id="${d.id}"
                          data-name="${escapeHtml(d.name)}"
                          data-price="${d.price}"
                          ${!d.available ? "disabled" : ""}
                        >
                          ${d.available ? "+ Thêm" : "Hết món"}
                        </button>
                      </div>
                    </div>
                  </article>
                `
                  )
                  .join("")}
              </div>
            `
            }
          </div>

          <aside class="sf-cart-panel" id="spa-cart-panel"></aside>
        </div>
      </main>
    `;

    mountInteractiveCart();
  }

  function mountInteractiveCart() {
    const panel = document.getElementById("spa-cart-panel");
    if (!panel) return;

    const cart = loadCart();
    if (cart.length === 0) {
      panel.innerHTML = `
        <div class="sf-cart-header">
          <h3>🛒 Giỏ hàng SPA</h3>
        </div>
        <div style="text-align:center;padding:28px 10px;color:var(--sf-muted);">
          <div style="font-size:2.2rem;margin-bottom:6px;">🥡</div>
          <p style="margin:0;font-size:0.88rem;">Chưa có món nào trong giỏ.<br/>Hãy bấm <strong>"+ Thêm"</strong> ở món bạn thích!</p>
        </div>
      `;
      return;
    }

    const subtotal = cart.reduce((s, item) => s + item.price * item.qty, 0);
    const total = subtotal + SHIPPING_FEE;

    panel.innerHTML = `
      <div class="sf-cart-header">
        <h3>🛒 Giỏ hàng (${cart.reduce((s, i) => s + i.qty, 0)})</h3>
        <button type="button" id="spa-clear-cart" class="sf-cart-clear">Xóa hết</button>
      </div>
      <div>
        ${cart
          .map(
            (item) => `
          <div class="sf-cart-item">
            <div class="sf-cart-item-info">
              <div class="sf-cart-item-name">${escapeHtml(item.name)}</div>
              <div class="sf-cart-item-price">${formatVND(item.price * item.qty)}</div>
            </div>
            <div class="sf-qty-ctrl">
              <button type="button" class="sf-qty-btn" data-cart-delta="-1" data-cart-id="${item.id}">-</button>
              <span>${item.qty}</span>
              <button type="button" class="sf-qty-btn" data-cart-delta="1" data-cart-id="${item.id}">+</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="sf-cart-summary">
        <div class="sf-summary-row"><span>Tạm tính</span><strong>${formatVND(subtotal)}</strong></div>
        <div class="sf-summary-row"><span>Phí giao hàng</span><strong>${formatVND(SHIPPING_FEE)}</strong></div>
        <div class="sf-summary-row total"><span>Tổng cộng</span><span>${formatVND(total)}</span></div>
      </div>
      <form id="spa-order-form" style="margin-top:14px;">
        <div id="spa-order-error" class="sf-field-error" style="margin-bottom:8px;"></div>
        <div class="sf-form-group">
          <label>Mã giảm giá</label>
          <input type="text" name="voucherCode" id="spa-voucher-code" class="sf-input" placeholder="SHOPEE20 / FREESHIP" />
        </div>
        <div class="sf-form-group">
          <label>Họ tên người nhận *</label>
          <input type="text" name="customerName" class="sf-input" placeholder="Nguyễn Văn A" />
          <div class="sf-field-error" data-err-field="customerName"></div>
        </div>
        <div class="sf-form-group">
          <label>Số điện thoại *</label>
          <input type="text" name="customerPhone" class="sf-input" placeholder="0901234567" />
          <div class="sf-field-error" data-err-field="customerPhone"></div>
        </div>
        <div class="sf-form-group">
          <label>Địa chỉ giao hàng *</label>
          <input type="text" name="address" class="sf-input" placeholder="227 Nguyễn Văn Cừ, Q.5" />
          <div class="sf-field-error" data-err-field="address"></div>
        </div>
        <button type="submit" id="spa-order-submit" class="sf-btn sf-btn-primary sf-btn-block">
          🛵 Đặt Đơn Qua REST API
        </button>
      </form>
    `;

    const clearBtn = document.getElementById("spa-clear-cart");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        saveCart([]);
        mountInteractiveCart();
      });
    }

    const orderForm = document.getElementById("spa-order-form");
    if (orderForm) {
      orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("spa-order-submit");
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang gửi đơn...";

        const fd = new FormData(orderForm);
        const res = await window.apiClient.orders.create({
          customerName: fd.get("customerName"),
          customerPhone: fd.get("customerPhone"),
          address: fd.get("address"),
          voucherCode: fd.get("voucherCode"),
          items: loadCart(),
        });

        submitBtn.disabled = false;
        submitBtn.textContent = "🛵 Đặt Đơn Qua REST API";

        if (!res.ok) {
          if (res.errorType === "business" && res.code === "VALIDATION_FAILED") {
            ["customerName", "customerPhone", "address"].forEach((f) => {
              const el = orderForm.querySelector(`[data-err-field="${f}"]`);
              if (el) el.textContent = res.fields?.[f] || "";
            });
          } else {
            const errBox = document.getElementById("spa-order-error");
            if (errBox) errBox.textContent = res.message;
          }
          return;
        }

        saveCart([]);
        navigate(`/orders/${res.data.id}`);
      });
    }
  }

  async function renderUserDishDetail(id, signal) {
    renderNavbar(false);
    renderLoadingState(`Đang tải thông tin món ăn #${id}...`);

    const res = await window.apiClient.dishes.get(id, signal);
    if (res.aborted) return;

    if (!res.ok) {
      if (res.errorType === "business" && res.code === "NOT_FOUND") {
        return renderNotFoundState(`Món ăn có mã #${id} không tồn tại trong thực đơn.`, "/dishes");
      }
      return renderTechnicalErrorState(res, "/dishes");
    }

    const d = res.data;
    rootEl.innerHTML = `
      <main class="container" style="padding-top:28px;padding-bottom:60px;" data-testid="state-ok">
        <div style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
          <a href="/dishes" data-spa-link class="sf-btn sf-btn-outline">← Quay lại Thực đơn</a>
          <a href="/admin/dishes/${d.id}/edit" data-spa-link class="sf-btn sf-btn-outline">✏️ Sửa món này (SPA Admin)</a>
        </div>

        <div class="sf-card" style="display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:32px;align-items:center;">
          <img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.name)}" style="width:100%;height:300px;object-fit:cover;border-radius:12px;" />
          <div>
            <div class="sf-tags-row">
              <span class="sf-tag preferred">Mã món #${d.id}</span>
              <span class="sf-tag open">${escapeHtml(d.category)}</span>
              <span class="sf-badge ${d.available ? "success" : "muted"}">
                ${d.available ? "● Đang mở bán" : "● Tạm hết hàng"}
              </span>
            </div>
            <h1 style="margin:8px 0 12px;font-size:1.8rem;">${escapeHtml(d.name)}</h1>
            <p style="color:var(--sf-muted);margin-bottom:18px;">${escapeHtml(d.description)}</p>
            <div style="font-size:1.7rem;font-weight:800;color:var(--sf-primary);margin-bottom:20px;">
              ${formatVND(d.price)}
            </div>
            <div style="display:flex;gap:12px;">
              <button
                type="button"
                class="sf-btn sf-btn-primary"
                data-spa-add-cart
                data-id="${d.id}"
                data-name="${escapeHtml(d.name)}"
                data-price="${d.price}"
                ${!d.available ? "disabled" : ""}
              >
                ${d.available ? "🛒 Thêm vào giỏ hàng" : "Tạm hết hàng"}
              </button>
              <a href="/dishes" data-spa-link class="sf-btn sf-btn-outline">Xem giỏ hàng & Đặt đơn →</a>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  // ==========================================================================
  // 2. ORDERS PAGES IN SPA: /orders & /orders/:id
  // ==========================================================================

  async function renderOrdersList(signal) {
    renderNavbar(false);
    renderLoadingState("Đang tải danh sách đơn hàng...");
    const res = await window.apiClient.orders.list({}, signal);
    if (res.aborted) return;
    if (!res.ok) return renderTechnicalErrorState(res, "/dishes");

    const orders = res.data || [];
    rootEl.innerHTML = `
      <main class="container" style="padding-top:28px;padding-bottom:60px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h1 style="margin:0;font-size:1.5rem;">🛵 Đơn đặt hàng ShopeeFood</h1>
          <a href="/dishes" data-spa-link class="sf-btn sf-btn-primary">+ Đặt món mới</a>
        </div>
        ${
          orders.length === 0
            ? `<div class="sf-card" style="text-align:center;padding:40px;">Chưa có đơn hàng nào.</div>`
            : orders
                .map(
                  (o) => `
              <div class="sf-card" style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong>Đơn #SF-${o.id}</strong> — <span class="sf-badge success">${escapeHtml(o.status)}</span>
                  <div style="color:var(--sf-muted);font-size:0.88rem;margin-top:4px;">
                    👤 ${escapeHtml(o.customerName)} (${escapeHtml(o.customerPhone)}) • 📍 ${escapeHtml(o.address)}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:800;color:var(--sf-primary);margin-bottom:6px;">${formatVND(o.total)}</div>
                  <a href="/orders/${o.id}" data-spa-link class="sf-btn sf-btn-outline">Xem chi tiết →</a>
                </div>
              </div>
            `
                )
                .join("")
        }
      </main>
    `;
  }

  async function renderOrderDetail(id, signal) {
    renderNavbar(false);
    renderLoadingState(`Đang tải đơn hàng #${id}...`);
    const res = await window.apiClient.orders.get(id, signal);
    if (res.aborted) return;
    if (!res.ok) {
      if (res.errorType === "business" && res.code === "NOT_FOUND") {
        return renderNotFoundState(`Không tìm thấy đơn hàng #${id}.`, "/orders");
      }
      return renderTechnicalErrorState(res, "/orders");
    }
    const o = res.data;
    rootEl.innerHTML = `
      <main class="container" style="padding-top:28px;max-width:740px;">
        <div class="sf-card">
          <span class="sf-badge success">ĐẶT ĐƠN THÀNH CÔNG QUA REST API</span>
          <h1 style="margin:8px 0 12px;">Đơn hàng #SF-${o.id}</h1>
          <p><strong>Người nhận:</strong> ${escapeHtml(o.customerName)} (${escapeHtml(o.customerPhone)})</p>
          <p><strong>Địa chỉ:</strong> ${escapeHtml(o.address)}</p>
          <p><strong>Tổng thanh toán:</strong> <span style="color:var(--sf-primary);font-weight:800;font-size:1.25rem;">${formatVND(o.total)}</span></p>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <a href="/orders" data-spa-link class="sf-btn sf-btn-outline">← Danh sách đơn</a>
            <a href="/dishes" data-spa-link class="sf-btn sf-btn-primary">Tiếp tục mua sắm</a>
          </div>
        </div>
      </main>
    `;
  }

  // ==========================================================================
  // 3. GENERIC ADMIN CRUD VIEWS FOR DISHES, CHEFS, INGREDIENTS (BLOCK #6)
  // ==========================================================================

  const RESOURCE_META = {
    dishes: {
      title: "Món Ăn (Dishes)",
      singular: "món ăn",
      client: () => window.apiClient.dishes,
      columns: ["ID", "Tên món ăn", "Danh mục", "Giá bán", "Trạng thái"],
      renderRowCells: (d) => `
        <td><strong>#${d.id}</strong></td>
        <td><a href="/admin/dishes/${d.id}" data-spa-link style="font-weight:700;color:var(--sf-primary);">${escapeHtml(d.name)}</a></td>
        <td>${escapeHtml(d.category)}</td>
        <td><strong>${formatVND(d.price)}</strong></td>
        <td><span class="sf-badge ${d.available ? "success" : "muted"}">${d.available ? "Đang bán" : "Tạm ngưng"}</span></td>
      `,
      renderDetailBody: (d) => `
        <p><strong>Tên món:</strong> ${escapeHtml(d.name)}</p>
        <p><strong>Mô tả:</strong> ${escapeHtml(d.description || "—")}</p>
        <p><strong>Danh mục:</strong> ${escapeHtml(d.category)}</p>
        <p><strong>Giá bán:</strong> <span style="color:var(--sf-primary);font-weight:800;">${formatVND(d.price)}</span></p>
        <p><strong>Trạng thái:</strong> ${d.available ? "Đang mở bán" : "Tạm hết hàng"}</p>
      `,
      defaultValues: () => ({
        name: "",
        description: "",
        price: "",
        category: "Món Nước",
        imageUrl: "",
        available: true,
      }),
      fromRecord: (d) => ({
        name: d.name || "",
        description: d.description || "",
        price: String(d.price ?? ""),
        category: d.category || "Món Nước",
        imageUrl: d.imageUrl || "",
        available: Boolean(d.available),
      }),
      toPayload: (formEl) => {
        const fd = new FormData(formEl);
        const rawPrice = String(fd.get("price") ?? "").trim();
        const priceNum = rawPrice === "" ? NaN : Number(rawPrice);
        return {
          values: {
            name: String(fd.get("name") ?? ""),
            description: String(fd.get("description") ?? ""),
            price: rawPrice,
            category: String(fd.get("category") ?? "Món Nước"),
            imageUrl: String(fd.get("imageUrl") ?? ""),
            available: formEl.querySelector('[name="available"]')?.checked ?? true,
          },
          payload: {
            name: String(fd.get("name") ?? "").trim(),
            description: String(fd.get("description") ?? "").trim(),
            price: Number.isFinite(priceNum) ? priceNum : -1,
            category: String(fd.get("category") ?? "Món Nước").trim(),
            imageUrl: String(fd.get("imageUrl") ?? "").trim(),
            available: Boolean(formEl.querySelector('[name="available"]')?.checked),
          },
        };
      },
      renderFormFields: (values, fields) => `
        <div class="sf-form-group">
          <label for="f-name">Tên món ăn *</label>
          <input id="f-name" name="name" type="text" class="sf-input" value="${escapeHtml(values.name)}" />
          ${fields.name ? `<div class="sf-field-error" data-field-error="name">${escapeHtml(fields.name)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-price">Giá bán (VNĐ - số nguyên không âm) *</label>
          <input id="f-price" name="price" type="number" class="sf-input" value="${escapeHtml(values.price)}" />
          ${fields.price ? `<div class="sf-field-error" data-field-error="price">${escapeHtml(fields.price)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-category">Danh mục</label>
          <input id="f-category" name="category" type="text" class="sf-input" value="${escapeHtml(values.category)}" />
          ${fields.category ? `<div class="sf-field-error" data-field-error="category">${escapeHtml(fields.category)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-description">Mô tả món ăn</label>
          <textarea id="f-description" name="description" rows="3" class="sf-textarea">${escapeHtml(values.description)}</textarea>
          ${fields.description ? `<div class="sf-field-error" data-field-error="description">${escapeHtml(fields.description)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-imageUrl">URL Hình ảnh</label>
          <input id="f-imageUrl" name="imageUrl" type="text" class="sf-input" value="${escapeHtml(values.imageUrl)}" />
        </div>
        <div class="sf-form-group" style="display:flex;align-items:center;gap:8px;">
          <input id="f-available" name="available" type="checkbox" ${values.available ? "checked" : ""} />
          <label for="f-available" style="margin:0;">Đang mở bán (Available)</label>
        </div>
      `,
    },

    chefs: {
      title: "Đầu Bếp (Chefs)",
      singular: "đầu bếp",
      client: () => window.apiClient.chefs,
      columns: ["ID", "Họ tên đầu bếp", "Chuyên môn (Specialty)", "Kinh nghiệm"],
      renderRowCells: (c) => `
        <td><strong>#${c.id}</strong></td>
        <td><a href="/admin/chefs/${c.id}" data-spa-link style="font-weight:700;color:var(--sf-primary);">${escapeHtml(c.name)}</a></td>
        <td>${escapeHtml(c.specialty)}</td>
        <td>${escapeHtml(c.experience)} năm</td>
      `,
      renderDetailBody: (c) => `
        <p><strong>Họ tên:</strong> ${escapeHtml(c.name)}</p>
        <p><strong>Chuyên môn:</strong> ${escapeHtml(c.specialty)}</p>
        <p><strong>Kinh nghiệm:</strong> ${escapeHtml(c.experience)} năm</p>
        <p><strong>Tiểu sử:</strong> ${escapeHtml(c.bio || "—")}</p>
      `,
      defaultValues: () => ({
        name: "",
        specialty: "",
        experience: "5",
        bio: "",
      }),
      fromRecord: (c) => ({
        name: c.name || "",
        specialty: c.specialty || "",
        experience: String(c.experience ?? 5),
        bio: c.bio || "",
      }),
      toPayload: (formEl) => {
        const fd = new FormData(formEl);
        const expRaw = String(fd.get("experience") ?? "5").trim();
        const expNum = expRaw === "" ? 5 : Number(expRaw);
        return {
          values: {
            name: String(fd.get("name") ?? ""),
            specialty: String(fd.get("specialty") ?? ""),
            experience: expRaw,
            bio: String(fd.get("bio") ?? ""),
          },
          payload: {
            name: String(fd.get("name") ?? "").trim(),
            specialty: String(fd.get("specialty") ?? "").trim(),
            experience: Number.isFinite(expNum) ? expNum : -1,
            bio: String(fd.get("bio") ?? "").trim(),
          },
        };
      },
      renderFormFields: (values, fields) => `
        <div class="sf-form-group">
          <label for="f-name">Họ tên đầu bếp *</label>
          <input id="f-name" name="name" type="text" class="sf-input" value="${escapeHtml(values.name)}" />
          ${fields.name ? `<div class="sf-field-error" data-field-error="name">${escapeHtml(fields.name)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-specialty">Chuyên môn (Specialty) *</label>
          <input id="f-specialty" name="specialty" type="text" class="sf-input" value="${escapeHtml(values.specialty)}" />
          ${fields.specialty ? `<div class="sf-field-error" data-field-error="specialty">${escapeHtml(fields.specialty)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-experience">Số năm kinh nghiệm</label>
          <input id="f-experience" name="experience" type="number" class="sf-input" value="${escapeHtml(values.experience)}" />
          ${fields.experience ? `<div class="sf-field-error" data-field-error="experience">${escapeHtml(fields.experience)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-bio">Tiểu sử</label>
          <textarea id="f-bio" name="bio" rows="3" class="sf-textarea">${escapeHtml(values.bio)}</textarea>
        </div>
      `,
    },

    ingredients: {
      title: "Nguyên Liệu (Ingredients)",
      singular: "nguyên liệu",
      client: () => window.apiClient.ingredients,
      columns: ["ID", "Tên nguyên liệu", "Đơn vị (Unit)", "Tồn kho", "Xuất xứ"],
      renderRowCells: (ing) => `
        <td><strong>#${ing.id}</strong></td>
        <td><a href="/admin/ingredients/${ing.id}" data-spa-link style="font-weight:700;color:var(--sf-primary);">${escapeHtml(ing.name)}</a></td>
        <td><span class="sf-badge muted">${escapeHtml(ing.unit)}</span></td>
        <td>${escapeHtml(ing.stock)}</td>
        <td>${escapeHtml(ing.origin)}</td>
      `,
      renderDetailBody: (ing) => `
        <p><strong>Tên nguyên liệu:</strong> ${escapeHtml(ing.name)}</p>
        <p><strong>Đơn vị tính:</strong> ${escapeHtml(ing.unit)}</p>
        <p><strong>Tồn kho:</strong> ${escapeHtml(ing.stock)} ${escapeHtml(ing.unit)}</p>
        <p><strong>Xuất xứ:</strong> ${escapeHtml(ing.origin || "Việt Nam")}</p>
      `,
      defaultValues: () => ({
        name: "",
        unit: "kg",
        stock: "100",
        origin: "Việt Nam",
      }),
      fromRecord: (ing) => ({
        name: ing.name || "",
        unit: ing.unit || "",
        stock: String(ing.stock ?? 100),
        origin: ing.origin || "Việt Nam",
      }),
      toPayload: (formEl) => {
        const fd = new FormData(formEl);
        const stockRaw = String(fd.get("stock") ?? "100").trim();
        const stockNum = stockRaw === "" ? 100 : Number(stockRaw);
        return {
          values: {
            name: String(fd.get("name") ?? ""),
            unit: String(fd.get("unit") ?? ""),
            stock: stockRaw,
            origin: String(fd.get("origin") ?? ""),
          },
          payload: {
            name: String(fd.get("name") ?? "").trim(),
            unit: String(fd.get("unit") ?? "").trim(),
            stock: Number.isFinite(stockNum) ? stockNum : -1,
            origin: String(fd.get("origin") ?? "Việt Nam").trim(),
          },
        };
      },
      renderFormFields: (values, fields) => `
        <div class="sf-form-group">
          <label for="f-name">Tên nguyên liệu *</label>
          <input id="f-name" name="name" type="text" class="sf-input" value="${escapeHtml(values.name)}" />
          ${fields.name ? `<div class="sf-field-error" data-field-error="name">${escapeHtml(fields.name)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-unit">Đơn vị tính (unit) *</label>
          <input id="f-unit" name="unit" type="text" class="sf-input" value="${escapeHtml(values.unit)}" placeholder="kg, gram, lít, hộp..." />
          ${fields.unit ? `<div class="sf-field-error" data-field-error="unit">${escapeHtml(fields.unit)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-stock">Tồn kho</label>
          <input id="f-stock" name="stock" type="number" class="sf-input" value="${escapeHtml(values.stock)}" />
          ${fields.stock ? `<div class="sf-field-error" data-field-error="stock">${escapeHtml(fields.stock)}</div>` : ""}
        </div>
        <div class="sf-form-group">
          <label for="f-origin">Xuất xứ</label>
          <input id="f-origin" name="origin" type="text" class="sf-input" value="${escapeHtml(values.origin)}" />
        </div>
      `,
    },
  };

  async function renderAdminDashboard(signal) {
    renderNavbar(true);
    renderLoadingState("Đang tải tổng quan quản trị từ REST API...");

    const [dishesRes, chefsRes, ingRes] = await Promise.all([
      window.apiClient.dishes.list({}, signal),
      window.apiClient.chefs.list({}, signal),
      window.apiClient.ingredients.list({}, signal),
    ]);
    if (dishesRes.aborted || chefsRes.aborted || ingRes.aborted) return;
    if (!dishesRes.ok) return renderTechnicalErrorState(dishesRes, "/admin");

    rootEl.innerHTML = `
      <main class="container" style="padding-bottom:60px;" data-testid="state-ok">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="margin:0 0 4px;font-size:1.6rem;">Quản trị Nhà Hàng (SPA Client-Side Routing)</h1>
            <p style="margin:0;color:var(--sf-muted);font-size:0.9rem;">
              Mỗi trang tự tải dữ liệu từ <code>${escapeHtml(window.apiClient.getBaseUrl())}</code> • Không dùng kho trạng thái toàn cục
            </p>
          </div>
          <div style="display:flex;gap:10px;">
            <a href="/admin/dishes/new" data-spa-link class="sf-btn sf-btn-primary">+ Thêm Món Ăn</a>
            <a href="/admin/chefs/new" data-spa-link class="sf-btn sf-btn-outline">+ Thêm Đầu Bếp</a>
            <a href="/admin/ingredients/new" data-spa-link class="sf-btn sf-btn-outline">+ Thêm Nguyên Liệu</a>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;">
          <div class="sf-card">
            <div style="color:var(--sf-muted);font-weight:600;font-size:0.85rem;">MÓN ĂN (/api/dishes)</div>
            <div style="font-size:2.2rem;font-weight:800;color:var(--sf-primary);margin:6px 0;">${dishesRes.data.length}</div>
            <a href="/admin/dishes" data-spa-link style="color:var(--sf-primary);font-weight:600;">Quản lý Món ăn →</a>
          </div>
          <div class="sf-card">
            <div style="color:var(--sf-muted);font-weight:600;font-size:0.85rem;">ĐẦU BẾP (/api/chefs)</div>
            <div style="font-size:2.2rem;font-weight:800;color:#1d4ed8;margin:6px 0;">${chefsRes.ok ? chefsRes.data.length : 0}</div>
            <a href="/admin/chefs" data-spa-link style="color:#1d4ed8;font-weight:600;">Quản lý Đầu bếp →</a>
          </div>
          <div class="sf-card">
            <div style="color:var(--sf-muted);font-weight:600;font-size:0.85rem;">NGUYÊN LIỆU (/api/ingredients)</div>
            <div style="font-size:2.2rem;font-weight:800;color:var(--sf-green);margin:6px 0;">${ingRes.ok ? ingRes.data.length : 0}</div>
            <a href="/admin/ingredients" data-spa-link style="color:var(--sf-green);font-weight:600;">Quản lý Nguyên liệu →</a>
          </div>
        </div>
      </main>
    `;
  }

  async function renderAdminResourceList(resourceKey, signal) {
    const meta = RESOURCE_META[resourceKey];
    renderNavbar(true);
    renderLoadingState(`Đang tải danh sách ${meta.singular}...`);

    const q = getSearchParam("q");
    const res = await meta.client().list({ q }, signal);
    if (res.aborted) return;
    if (!res.ok) return renderTechnicalErrorState(res, `/admin/${resourceKey}`);

    const items = res.data || [];
    rootEl.innerHTML = `
      <main class="container" style="padding-bottom:60px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="margin:0;font-size:1.55rem;">Quản lý ${escapeHtml(meta.title)}</h1>
            <p style="margin:4px 0 0;color:var(--sf-muted);font-size:0.88rem;">Endpoint: <code>GET /api/${resourceKey}</code> (${items.length} bản ghi)</p>
          </div>
          <a href="/admin/${resourceKey}/new" data-spa-link class="sf-btn sf-btn-primary">+ Thêm ${escapeHtml(meta.singular)} mới</a>
        </div>

        ${
          items.length === 0
            ? `
          <div class="sf-card" data-testid="state-empty" style="text-align:center;padding:40px;">
            <h3>Danh sách ${escapeHtml(meta.singular)} đang trống</h3>
            <a href="/admin/${resourceKey}/new" data-spa-link class="sf-btn sf-btn-primary">+ Thêm ${escapeHtml(meta.singular)} đầu tiên</a>
          </div>
        `
            : `
          <div class="sf-card" data-testid="state-ok">
            <div class="sf-table-wrap">
              <table class="sf-table">
                <thead>
                  <tr>
                    ${meta.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
                    <th>Thao tác (SPA Links)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) => `
                    <tr>
                      ${meta.renderRowCells(item)}
                      <td>
                        <div style="display:flex;gap:8px;">
                          <a href="/admin/${resourceKey}/${item.id}" data-spa-link class="sf-btn sf-btn-outline" style="padding:5px 10px;font-size:0.8rem;">Chi tiết</a>
                          <a href="/admin/${resourceKey}/${item.id}/edit" data-spa-link class="sf-btn sf-btn-outline" style="padding:5px 10px;font-size:0.8rem;">Sửa</a>
                          <a href="/admin/${resourceKey}/${item.id}/delete" data-spa-link class="sf-btn sf-btn-danger" style="padding:5px 10px;font-size:0.8rem;">Xóa</a>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        }
      </main>
    `;
  }

  async function renderAdminResourceDetail(resourceKey, id, signal) {
    const meta = RESOURCE_META[resourceKey];
    renderNavbar(true);
    renderLoadingState(`Đang tải chi tiết ${meta.singular} #${id}...`);

    const res = await meta.client().get(id, signal);
    if (res.aborted) return;
    if (!res.ok) {
      if (res.errorType === "business" && res.code === "NOT_FOUND") {
        return renderNotFoundState(
          `Không tìm thấy ${meta.singular} #${id}.`,
          `/admin/${resourceKey}`
        );
      }
      return renderTechnicalErrorState(res, `/admin/${resourceKey}`);
    }

    const item = res.data;
    rootEl.innerHTML = `
      <main class="container" style="max-width:680px;padding-bottom:60px;" data-testid="state-ok">
        <div style="margin-bottom:16px;">
          <a href="/admin/${resourceKey}" data-spa-link class="sf-btn sf-btn-outline">← Quay lại danh sách ${escapeHtml(meta.singular)}</a>
        </div>
        <div class="sf-card">
          <span class="sf-badge success">Bản ghi #${item.id}</span>
          <h1 style="margin:8px 0 14px;font-size:1.5rem;">${escapeHtml(item.name)}</h1>
          ${meta.renderDetailBody(item)}
          <div style="display:flex;gap:10px;margin-top:20px;">
            <a href="/admin/${resourceKey}/${item.id}/edit" data-spa-link class="sf-btn sf-btn-primary">✏️ Sửa</a>
            <a href="/admin/${resourceKey}/${item.id}/delete" data-spa-link class="sf-btn sf-btn-danger">🗑️ Xóa</a>
          </div>
        </div>
      </main>
    `;
  }

  async function renderAdminResourceForm(resourceKey, mode, id, signal) {
    const meta = RESOURCE_META[resourceKey];
    renderNavbar(true);

    let initialValues = meta.defaultValues();
    if (mode === "edit") {
      renderLoadingState(`Đang nạp dữ liệu ${meta.singular} #${id} vào form...`);
      const res = await meta.client().get(id, signal);
      if (res.aborted) return;
      if (!res.ok) {
        if (res.errorType === "business" && res.code === "NOT_FOUND") {
          return renderNotFoundState(
            `Không tìm thấy ${meta.singular} #${id} để chỉnh sửa.`,
            `/admin/${resourceKey}`
          );
        }
        return renderTechnicalErrorState(res, `/admin/${resourceKey}`);
      }
      initialValues = meta.fromRecord(res.data);
    }

    function paintForm(values, fields = {}, topError = "", isSubmitting = false) {
      rootEl.innerHTML = `
        <main class="container" style="max-width:680px;padding-bottom:60px;" data-testid="state-ok">
          <div style="margin-bottom:16px;">
            <a href="/admin/${resourceKey}" data-spa-link class="sf-btn sf-btn-outline">← Quay lại danh sách</a>
          </div>
          <div class="sf-card">
            <h1 style="margin:0 0 6px;font-size:1.45rem;">
              ${mode === "create" ? `➕ Thêm ${escapeHtml(meta.singular)} mới` : `✏️ Sửa ${escapeHtml(meta.singular)} #${escapeHtml(id)}`}
            </h1>
            <p style="margin:0 0 18px;color:var(--sf-muted);font-size:0.86rem;">
              API Request: <code>${mode === "create" ? `POST /api/${resourceKey}` : `PATCH /api/${resourceKey}/${escapeHtml(id)}`}</code>
            </p>

            ${
              topError
                ? `<div class="sf-alert-error" data-testid="form-error-banner">${escapeHtml(topError)}</div>`
                : ""
            }

            <form id="spa-resource-form" novalidate>
              ${meta.renderFormFields(values, fields)}
              <div style="display:flex;gap:12px;margin-top:20px;">
                <button type="submit" id="spa-submit-btn" class="sf-btn sf-btn-primary" ${isSubmitting ? "disabled" : ""}>
                  ${
                    isSubmitting
                      ? "Đang lưu..."
                      : mode === "create"
                        ? "Tạo mới (POST)"
                        : "Lưu thay đổi (PATCH)"
                  }
                </button>
                <a href="/admin/${resourceKey}" data-spa-link class="sf-btn sf-btn-outline">Hủy</a>
              </div>
            </form>
          </div>
        </main>
      `;

      const formEl = document.getElementById("spa-resource-form");
      if (formEl) {
        formEl.addEventListener("submit", async (e) => {
          e.preventDefault();
          const { values: currentValues, payload } = meta.toPayload(formEl);

          // Khóa nút Gửi khi đang chờ API trả lời (chống bấm đúp - Slide 39)
          paintForm(currentValues, {}, "", true);

          const apiRes =
            mode === "create"
              ? await meta.client().create(payload)
              : await meta.client().update(id, payload);

          if (!apiRes.ok) {
            if (apiRes.errorType === "business") {
              if (apiRes.code === "VALIDATION_FAILED") {
                return paintForm(
                  currentValues,
                  apiRes.fields || {},
                  "Dữ liệu chưa hợp lệ (VALIDATION_FAILED). Vui lòng kiểm tra các trường bên dưới.",
                  false
                );
              }
              if (apiRes.code === "NOT_FOUND") {
                return renderNotFoundState(
                  `Bản ghi #${id} không còn tồn tại.`,
                  `/admin/${resourceKey}`
                );
              }
            }
            return paintForm(
              currentValues,
              {},
              apiRes.message || "Lỗi kỹ thuật khi gửi dữ liệu.",
              false
            );
          }

          // Ghi thành công: điều hướng sang trang đích mà không tải lại document (Slide 38 & 47)
          const targetId = apiRes.data?.id || id;
          navigate(`/admin/${resourceKey}/${targetId}`);
        });
      }
    }

    paintForm(initialValues);
  }

  async function renderAdminResourceDelete(resourceKey, id, signal) {
    const meta = RESOURCE_META[resourceKey];
    renderNavbar(true);
    renderLoadingState(`Đang tải thông tin xác nhận xóa #${id}...`);

    const res = await meta.client().get(id, signal);
    if (res.aborted) return;
    if (!res.ok) {
      if (res.errorType === "business" && res.code === "NOT_FOUND") {
        return renderNotFoundState(
          `Không tìm thấy ${meta.singular} #${id} để xóa.`,
          `/admin/${resourceKey}`
        );
      }
      return renderTechnicalErrorState(res, `/admin/${resourceKey}`);
    }

    const item = res.data;
    rootEl.innerHTML = `
      <main class="container" style="max-width:560px;padding-bottom:60px;" data-testid="state-ok">
        <div class="sf-card" style="text-align:center;padding:32px;">
          <div style="font-size:3rem;margin-bottom:8px;">⚠️</div>
          <h1 style="margin:0 0 10px;font-size:1.45rem;">Xác nhận xóa ${escapeHtml(meta.singular)}?</h1>
          <p style="color:var(--sf-muted);margin-bottom:20px;">
            Bạn có chắc chắn muốn xóa <strong>#${item.id} - ${escapeHtml(item.name)}</strong>?<br/>
            Thao tác này sẽ gửi <code>DELETE /api/${resourceKey}/${item.id}</code>.
          </p>
          <div id="spa-delete-error" class="sf-field-error" style="margin-bottom:12px;"></div>
          <div style="display:flex;justify-content:center;gap:12px;">
            <button type="button" id="spa-confirm-delete-btn" class="sf-btn sf-btn-danger">
              Xác nhận Xóa (DELETE)
            </button>
            <a href="/admin/${resourceKey}" data-spa-link class="sf-btn sf-btn-outline">Hủy bỏ</a>
          </div>
        </div>
      </main>
    `;

    const delBtn = document.getElementById("spa-confirm-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        delBtn.disabled = true;
        delBtn.textContent = "Đang xóa...";
        const delRes = await meta.client().remove(item.id);
        if (!delRes.ok) {
          if (delRes.errorType === "business" && delRes.code === "NOT_FOUND") {
            return renderNotFoundState(
              `Bản ghi #${item.id} không tồn tại hoặc đã bị xóa trước đó.`,
              `/admin/${resourceKey}`
            );
          }
          delBtn.disabled = false;
          delBtn.textContent = "Xác nhận Xóa (DELETE)";
          const errEl = document.getElementById("spa-delete-error");
          if (errEl) errEl.textContent = delRes.message;
          return;
        }
        navigate(`/admin/${resourceKey}`);
      });
    }
  }

  // ==========================================================================
  // ROUTE MATCHER & DISPATCHER
  // ==========================================================================

  function renderCurrentRoute() {
    const signal = cancelInFlightRequests();
    const path = window.location.pathname.replace(/\/+$/, "") || "/";

    if (path === "/") {
      return navigate("/dishes", { replace: true });
    }

    if (path === "/dishes") {
      return renderUserDishesList(signal);
    }

    const userDishMatch = path.match(/^\/dishes\/([^/]+)$/);
    if (userDishMatch) {
      return renderUserDishDetail(decodeURIComponent(userDishMatch[1]), signal);
    }

    if (path === "/orders") {
      return renderOrdersList(signal);
    }

    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderMatch) {
      return renderOrderDetail(decodeURIComponent(orderMatch[1]), signal);
    }

    if (path === "/admin") {
      return renderAdminDashboard(signal);
    }

    const adminListMatch = path.match(/^\/admin\/(dishes|chefs|ingredients)$/);
    if (adminListMatch) {
      return renderAdminResourceList(adminListMatch[1], signal);
    }

    const adminNewMatch = path.match(/^\/admin\/(dishes|chefs|ingredients)\/new$/);
    if (adminNewMatch) {
      return renderAdminResourceForm(adminNewMatch[1], "create", null, signal);
    }

    const adminEditMatch = path.match(
      /^\/admin\/(dishes|chefs|ingredients)\/([^/]+)\/edit$/
    );
    if (adminEditMatch) {
      return renderAdminResourceForm(
        adminEditMatch[1],
        "edit",
        decodeURIComponent(adminEditMatch[2]),
        signal
      );
    }

    const adminDeleteMatch = path.match(
      /^\/admin\/(dishes|chefs|ingredients)\/([^/]+)\/delete$/
    );
    if (adminDeleteMatch) {
      return renderAdminResourceDelete(
        adminDeleteMatch[1],
        decodeURIComponent(adminDeleteMatch[2]),
        signal
      );
    }

    const adminDetailMatch = path.match(
      /^\/admin\/(dishes|chefs|ingredients)\/([^/]+)$/
    );
    if (adminDetailMatch) {
      return renderAdminResourceDetail(
        adminDetailMatch[1],
        decodeURIComponent(adminDetailMatch[2]),
        signal
      );
    }

    // Unmatched route inside SPA (e.g. /abc) -> SPA renders Not Found view
    renderNavbar(path.startsWith("/admin"));
    renderNotFoundState(`Đường dẫn "${path}" không khớp với trang nào trong SPA.`, "/dishes");
  }

  // ==========================================================================
  // GLOBAL EVENT LISTENERS (Link Interception, Popstate, Cart & API Config)
  // ==========================================================================

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-spa-link]");
    if (
      link &&
      link.origin === window.location.origin &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      navigate(link.pathname + link.search + link.hash);
      return;
    }

    const addCartBtn = e.target.closest("[data-spa-add-cart]");
    if (addCartBtn) {
      const id = Number(addCartBtn.getAttribute("data-id"));
      const name = addCartBtn.getAttribute("data-name");
      const price = Number(addCartBtn.getAttribute("data-price"));
      const cart = loadCart();
      const existing = cart.find((x) => Number(x.id) === id);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ id, name, price, qty: 1 });
      }
      saveCart(cart);
      mountInteractiveCart();
      return;
    }

    const qtyBtn = e.target.closest("[data-cart-delta]");
    if (qtyBtn) {
      const id = Number(qtyBtn.getAttribute("data-cart-id"));
      const delta = Number(qtyBtn.getAttribute("data-cart-delta"));
      let cart = loadCart();
      const target = cart.find((x) => Number(x.id) === id);
      if (target) {
        target.qty += delta;
        if (target.qty <= 0) {
          cart = cart.filter((x) => Number(x.id) !== id);
        }
        saveCart(cart);
        mountInteractiveCart();
      }
      return;
    }

    const voucherBtn = e.target.closest("[data-pick-voucher]");
    if (voucherBtn) {
      const code = voucherBtn.getAttribute("data-pick-voucher");
      const input = document.getElementById("spa-voucher-code");
      if (input) input.value = code;
    }
  });

  window.addEventListener("popstate", () => {
    renderCurrentRoute();
  });

  if (apiInputEl) {
    apiInputEl.value = window.apiClient.getBaseUrl();
    apiInputEl.addEventListener("change", () => {
      window.apiClient.setBaseUrl(apiInputEl.value);
      apiInputEl.value = window.apiClient.getBaseUrl();
      renderCurrentRoute();
    });
  }

  if (apiResetBtn) {
    apiResetBtn.addEventListener("click", () => {
      window.apiClient.setBaseUrl("");
      if (apiInputEl) apiInputEl.value = window.apiClient.getBaseUrl();
      renderCurrentRoute();
    });
  }

  renderCurrentRoute();
})();
