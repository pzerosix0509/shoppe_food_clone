(function () {
  const STORAGE_KEY = "shopeefood_cart_v1";
  const SHIPPING_FEE = 16000;

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCart();
  }

  function formatVND(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "đ";
  }

  function addToCart(item) {
    const cart = loadCart();
    const existing = cart.find((x) => Number(x.id) === Number(item.id));
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: Number(item.id),
        name: item.name,
        price: Number(item.price),
        qty: 1,
      });
    }
    saveCart(cart);
  }

  function updateQty(id, delta) {
    let cart = loadCart();
    const target = cart.find((x) => Number(x.id) === Number(id));
    if (!target) return;
    target.qty += delta;
    if (target.qty <= 0) {
      cart = cart.filter((x) => Number(x.id) !== Number(id));
    }
    saveCart(cart);
  }

  function clearCart() {
    saveCart([]);
  }

  function computeDiscount(subtotal, code) {
    const clean = String(code || "").trim().toUpperCase();
    if (!subtotal) return 0;
    if (clean === "SHOPEE20") return Math.min(35000, Math.round(subtotal * 0.2));
    if (clean === "FREESHIP") return SHIPPING_FEE;
    if (clean === "KTPM3") return 25000;
    return 0;
  }

  function renderCart() {
    const cart = loadCart();
    const countBadges = document.querySelectorAll("[data-cart-count]");
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    countBadges.forEach((el) => {
      el.textContent = String(totalCount);
    });

    const listEl = document.getElementById("sf-cart-items");
    const emptyEl = document.getElementById("sf-cart-empty");
    const formEl = document.getElementById("sf-checkout-form");
    const itemsInput = document.getElementById("sf-items-json");
    const subtotalEl = document.getElementById("sf-cart-subtotal");
    const discountEl = document.getElementById("sf-cart-discount");
    const totalEl = document.getElementById("sf-cart-total");
    const voucherInput = document.getElementById("sf-voucher-input");

    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (formEl) formEl.style.display = "none";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (formEl) formEl.style.display = "block";

    listEl.innerHTML = cart
      .map(
        (item) => `
      <div class="sf-cart-item">
        <div class="sf-cart-item-info">
          <div class="sf-cart-item-name">${item.name}</div>
          <div class="sf-cart-item-price">${formatVND(item.price * item.qty)}</div>
        </div>
        <div class="sf-qty-ctrl">
          <button type="button" class="sf-qty-btn" data-qty-id="${item.id}" data-qty-delta="-1">-</button>
          <span>${item.qty}</span>
          <button type="button" class="sf-qty-btn" data-qty-id="${item.id}" data-qty-delta="1">+</button>
        </div>
      </div>
    `
      )
      .join("");

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const voucherCode = voucherInput ? voucherInput.value : "";
    const discount = computeDiscount(subtotal, voucherCode);
    const total = Math.max(0, subtotal + SHIPPING_FEE - discount);

    if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);
    if (discountEl) discountEl.textContent = "-" + formatVND(discount);
    if (totalEl) totalEl.textContent = formatVND(total);
    if (itemsInput) itemsInput.value = JSON.stringify(cart);
  }

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-dish]");
    if (addBtn) {
      addToCart({
        id: addBtn.getAttribute("data-id"),
        name: addBtn.getAttribute("data-name"),
        price: addBtn.getAttribute("data-price"),
      });
      const originalText = addBtn.textContent;
      addBtn.textContent = "Đã thêm ✓";
      setTimeout(() => {
        addBtn.textContent = originalText;
      }, 700);
      return;
    }

    const qtyBtn = e.target.closest("[data-qty-id]");
    if (qtyBtn) {
      updateQty(
        qtyBtn.getAttribute("data-qty-id"),
        Number(qtyBtn.getAttribute("data-qty-delta"))
      );
      return;
    }

    const clearBtn = e.target.closest("#sf-cart-clear-btn");
    if (clearBtn) {
      clearCart();
      return;
    }

    const voucherPill = e.target.closest("[data-voucher-code]");
    if (voucherPill) {
      const voucherInput = document.getElementById("sf-voucher-input");
      if (voucherInput) {
        voucherInput.value = voucherPill.getAttribute("data-voucher-code");
        renderCart();
      }
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "sf-voucher-input") {
      renderCart();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    const formEl = document.getElementById("sf-checkout-form");
    if (formEl) {
      formEl.addEventListener("submit", () => {
        setTimeout(() => localStorage.removeItem(STORAGE_KEY), 100);
      });
    }
  });
})();
