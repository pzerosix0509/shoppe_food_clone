/**
 * Lớp gọi API tập trung (Centralized API Client Layer - Block #6)
 * - Một nơi duy nhất quản lý URL gốc của API và Header.
 * - Chỉ gắn Content-Type: application/json khi có body (để GET không bị preflight).
 * - Kiểm tra đầy đủ 3 tầng lỗi:
 *   + Tầng 1: Không nhận được response (Lỗi mạng, API tắt, hoặc bị chặn CORS) -> errorType: "technical"
 *   + Tầng 2: HTTP Status khác 200 (404 sai URL API, 500 lỗi DB) hoặc body không theo chuẩn -> errorType: "technical"
 *   + Tầng 3: HTTP 200 nhưng body.ok === false (NOT_FOUND, VALIDATION_FAILED) -> errorType: "business"
 */
(function (global) {
  const DEFAULT_API_BASE = "http://localhost:3000/api";
  const STORAGE_API_KEY = "shopeefood_spa_api_base";

  function getBaseUrl() {
    return (
      sessionStorage.getItem(STORAGE_API_KEY) || DEFAULT_API_BASE
    ).replace(/\/+$/, "");
  }

  function setBaseUrl(url) {
    if (!url || !url.trim()) {
      sessionStorage.removeItem(STORAGE_API_KEY);
    } else {
      sessionStorage.setItem(STORAGE_API_KEY, url.trim().replace(/\/+$/, ""));
    }
  }

  async function request(path, { method = "GET", body, signal } = {}) {
    const url = `${getBaseUrl()}${path}`;
    const options = {
      method,
      signal,
    };

    // Chỉ đặt Content-Type khi thực sự gửi body để tránh preflight không cần thiết cho GET
    if (body !== undefined) {
      options.headers = {
        "Content-Type": "application/json",
      };
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { aborted: true };
      }
      // Tầng 1: Lỗi kết nối / API tắt / CORS chặn
      return {
        ok: false,
        errorType: "technical",
        layer: 1,
        message:
          "Không thể kết nối tới máy chủ API. Vui lòng kiểm tra API đang chạy và cấu hình CORS.",
      };
    }

    // Tầng 2: HTTP status không thành công (ví dụ 404 sai URL /api/bok, 400 JSON lỗi, 500 DB dừng)
    if (response.status !== 200) {
      return {
        ok: false,
        errorType: "technical",
        layer: 2,
        status: response.status,
        message: `Lỗi kỹ thuật từ máy chủ API (HTTP ${response.status}).`,
      };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        errorType: "technical",
        layer: 2,
        status: response.status,
        message: "Phản hồi từ máy chủ không phải là JSON hợp lệ.",
      };
    }

    if (!payload || typeof payload.ok !== "boolean") {
      return {
        ok: false,
        errorType: "technical",
        layer: 2,
        status: response.status,
        message: "Phản hồi không tuân theo Response Shape chuẩn ({ ok }).",
      };
    }

    // Tầng 3: Lỗi nghiệp vụ (status 200 nhưng ok === false)
    if (payload.ok === false) {
      return {
        ok: false,
        errorType: "business",
        layer: 3,
        code: payload.error?.code || "BUSINESS_ERROR",
        message: payload.error?.message || "Yêu cầu không hợp lệ theo nghiệp vụ.",
        fields: payload.error?.fields || {},
      };
    }

    // Thành công (status 200, ok === true)
    return {
      ok: true,
      data: payload.data,
    };
  }

  function createResourceClient(resourceName) {
    return {
      list(params = {}, signal) {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            qs.set(k, String(v).trim());
          }
        });
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request(`/${resourceName}${suffix}`, { method: "GET", signal });
      },
      get(id, signal) {
        return request(`/${resourceName}/${encodeURIComponent(id)}`, {
          method: "GET",
          signal,
        });
      },
      create(data) {
        return request(`/${resourceName}`, { method: "POST", body: data });
      },
      update(id, data) {
        return request(`/${resourceName}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: data,
        });
      },
      remove(id) {
        return request(`/${resourceName}/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      },
    };
  }

  global.apiClient = {
    DEFAULT_API_BASE,
    getBaseUrl,
    setBaseUrl,
    request,
    dishes: createResourceClient("dishes"),
    chefs: createResourceClient("chefs"),
    ingredients: createResourceClient("ingredients"),
    orders: createResourceClient("orders"),
  };
})(window);
