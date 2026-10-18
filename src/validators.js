function parsePositiveId(rawId) {
  const str = String(rawId ?? "").trim();
  if (!/^\d+$/.test(str)) return null;
  const num = Number(str);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

function normalizeQueryString(rawQuery) {
  if (Array.isArray(rawQuery)) {
    return String(rawQuery[0] || "").trim();
  }
  if (typeof rawQuery === "string") {
    return rawQuery.trim();
  }
  return "";
}

function validateDishInput(body = {}) {
  const errors = {};
  const values = {
    name: String(body.name ?? "").trim(),
    description: String(body.description ?? "").trim(),
    price: String(body.price ?? "").trim(),
    originalPrice: String(body.originalPrice ?? "").trim(),
    category: String(body.category ?? "Món Nước").trim() || "Món Nước",
    imageUrl: String(body.imageUrl ?? "").trim(),
    prepTimeMin: String(body.prepTimeMin ?? "15").trim(),
    available:
      body.available === "true" ||
      body.available === "on" ||
      body.available === "1" ||
      body.available === true,
  };

  if (!values.name) {
    errors.name = "Tên món ăn không được để trống.";
  } else if (values.name.length > 150) {
    errors.name = "Tên món ăn tối đa 150 ký tự.";
  }

  const priceNum = Number(values.price);
  if (!values.price || !Number.isInteger(priceNum) || priceNum <= 0) {
    errors.price = "Giá bán phải là số nguyên dương (VNĐ).";
  }

  let originalPriceNum = null;
  if (values.originalPrice) {
    originalPriceNum = Number(values.originalPrice);
    if (!Number.isInteger(originalPriceNum) || originalPriceNum <= 0) {
      errors.originalPrice = "Giá gốc phải là số nguyên dương.";
    }
  } else if (Number.isInteger(priceNum) && priceNum > 0) {
    originalPriceNum = Math.round(priceNum * 1.18);
  }

  const prepTimeNum = Number(values.prepTimeMin || 15);
  if (!Number.isInteger(prepTimeNum) || prepTimeNum <= 0 || prepTimeNum > 180) {
    errors.prepTimeMin = "Thời gian chuẩn bị phải từ 1 đến 180 phút.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
    data: {
      name: values.name,
      description: values.description,
      price: priceNum,
      originalPrice: originalPriceNum,
      category: values.category,
      imageUrl: values.imageUrl,
      prepTimeMin: prepTimeNum,
      available: values.available,
    },
  };
}

function validateChefInput(body = {}) {
  const errors = {};
  const values = {
    name: String(body.name ?? "").trim(),
    specialty: String(body.specialty ?? "").trim(),
    experience: String(body.experience ?? "5").trim(),
    bio: String(body.bio ?? "").trim(),
    avatarUrl: String(body.avatarUrl ?? "").trim(),
  };

  if (!values.name) {
    errors.name = "Họ tên đầu bếp không được để trống.";
  }
  if (!values.specialty) {
    errors.specialty = "Chuyên môn ẩm thực không được để trống.";
  }

  const expNum = Number(values.experience || 5);
  if (!Number.isInteger(expNum) || expNum < 0 || expNum > 60) {
    errors.experience = "Số năm kinh nghiệm phải là số nguyên từ 0 đến 60.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
    data: {
      name: values.name,
      specialty: values.specialty,
      experience: expNum,
      bio: values.bio,
      avatarUrl: values.avatarUrl,
    },
  };
}

function validateIngredientInput(body = {}) {
  const errors = {};
  const values = {
    name: String(body.name ?? "").trim(),
    unit: String(body.unit ?? "").trim(),
    stock: String(body.stock ?? "100").trim(),
    origin: String(body.origin ?? "Việt Nam").trim(),
  };

  if (!values.name) {
    errors.name = "Tên nguyên liệu không được để trống.";
  }
  if (!values.unit) {
    errors.unit = "Đơn vị tính (kg, gram, lít, hộp...) không được để trống.";
  }

  const stockNum = Number(values.stock ?? 100);
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    errors.stock = "Số lượng tồn kho phải là số nguyên không âm.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
    data: {
      name: values.name,
      unit: values.unit,
      stock: stockNum,
      origin: values.origin || "Việt Nam",
    },
  };
}

module.exports = {
  parsePositiveId,
  normalizeQueryString,
  validateDishInput,
  validateChefInput,
  validateIngredientInput,
};
