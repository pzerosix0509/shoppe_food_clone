function isPlainObject(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function validateApiDishInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return {
      valid: false,
      fields: { _body: "Dữ liệu gửi lên phải là một JSON object." },
    };
  }

  const fields = {};
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      fields.name = "Tên món ăn là bắt buộc và phải là chuỗi ký tự.";
    } else if (body.name.trim().length > 150) {
      fields.name = "Tên món ăn tối đa 150 ký tự.";
    } else {
      data.name = body.name.trim();
    }
  }

  if (!partial || body.price !== undefined) {
    if (
      typeof body.price !== "number" ||
      !Number.isInteger(body.price) ||
      body.price < 0
    ) {
      fields.price = "Giá món ăn phải là số nguyên không âm (kiểu number).";
    } else {
      data.price = body.price;
    }
  }

  if (body.originalPrice !== undefined && body.originalPrice !== null) {
    if (
      typeof body.originalPrice !== "number" ||
      !Number.isInteger(body.originalPrice) ||
      body.originalPrice < 0
    ) {
      fields.originalPrice = "Giá gốc phải là số nguyên không âm.";
    } else {
      data.originalPrice = body.originalPrice;
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      fields.description = "Mô tả phải là chuỗi ký tự.";
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.category !== undefined && body.category !== null) {
    if (typeof body.category !== "string" || body.category.trim().length === 0) {
      fields.category = "Danh mục phải là chuỗi không rỗng.";
    } else {
      data.category = body.category.trim();
    }
  }

  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (typeof body.imageUrl !== "string") {
      fields.imageUrl = "URL hình ảnh phải là chuỗi ký tự.";
    } else {
      data.imageUrl = body.imageUrl.trim();
    }
  }

  if (body.prepTimeMin !== undefined && body.prepTimeMin !== null) {
    if (
      typeof body.prepTimeMin !== "number" ||
      !Number.isInteger(body.prepTimeMin) ||
      body.prepTimeMin <= 0
    ) {
      fields.prepTimeMin = "Thời gian chuẩn bị phải là số nguyên dương.";
    } else {
      data.prepTimeMin = body.prepTimeMin;
    }
  }

  if (body.available !== undefined) {
    if (typeof body.available !== "boolean") {
      fields.available = "Trạng thái available phải là kiểu boolean (true/false).";
    } else {
      data.available = body.available;
    }
  }

  if (partial && Object.keys(data).length === 0 && Object.keys(fields).length === 0) {
    fields.name = "Cần gửi ít nhất một trường hợp lệ để cập nhật.";
  }

  return {
    valid: Object.keys(fields).length === 0,
    fields,
    data,
  };
}

function validateApiChefInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return {
      valid: false,
      fields: { _body: "Dữ liệu gửi lên phải là một JSON object." },
    };
  }

  const fields = {};
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      fields.name = "Họ tên đầu bếp là bắt buộc.";
    } else {
      data.name = body.name.trim();
    }
  }

  if (!partial || body.specialty !== undefined) {
    if (
      typeof body.specialty !== "string" ||
      body.specialty.trim().length === 0
    ) {
      fields.specialty = "Chuyên môn (specialty) là bắt buộc.";
    } else {
      data.specialty = body.specialty.trim();
    }
  }

  if (body.experience !== undefined && body.experience !== null) {
    if (
      typeof body.experience !== "number" ||
      !Number.isInteger(body.experience) ||
      body.experience < 0
    ) {
      fields.experience = "Số năm kinh nghiệm phải là số nguyên không âm.";
    } else {
      data.experience = body.experience;
    }
  }

  if (body.bio !== undefined && body.bio !== null) {
    if (typeof body.bio !== "string") {
      fields.bio = "Tiểu sử phải là chuỗi ký tự.";
    } else {
      data.bio = body.bio.trim();
    }
  }

  if (body.avatarUrl !== undefined && body.avatarUrl !== null) {
    if (typeof body.avatarUrl !== "string") {
      fields.avatarUrl = "URL ảnh đại diện phải là chuỗi ký tự.";
    } else {
      data.avatarUrl = body.avatarUrl.trim();
    }
  }

  if (partial && Object.keys(data).length === 0 && Object.keys(fields).length === 0) {
    fields.name = "Cần gửi ít nhất một trường hợp lệ để cập nhật.";
  }

  return {
    valid: Object.keys(fields).length === 0,
    fields,
    data,
  };
}

function validateApiIngredientInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return {
      valid: false,
      fields: { _body: "Dữ liệu gửi lên phải là một JSON object." },
    };
  }

  const fields = {};
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      fields.name = "Tên nguyên liệu là bắt buộc.";
    } else {
      data.name = body.name.trim();
    }
  }

  if (!partial || body.unit !== undefined) {
    if (typeof body.unit !== "string" || body.unit.trim().length === 0) {
      fields.unit = "Đơn vị tính (unit) là bắt buộc.";
    } else {
      data.unit = body.unit.trim();
    }
  }

  if (body.stock !== undefined && body.stock !== null) {
    if (
      typeof body.stock !== "number" ||
      !Number.isInteger(body.stock) ||
      body.stock < 0
    ) {
      fields.stock = "Tồn kho phải là số nguyên không âm.";
    } else {
      data.stock = body.stock;
    }
  }

  if (body.origin !== undefined && body.origin !== null) {
    if (typeof body.origin !== "string") {
      fields.origin = "Nguồn gốc phải là chuỗi ký tự.";
    } else {
      data.origin = body.origin.trim();
    }
  }

  if (partial && Object.keys(data).length === 0 && Object.keys(fields).length === 0) {
    fields.name = "Cần gửi ít nhất một trường hợp lệ để cập nhật.";
  }

  return {
    valid: Object.keys(fields).length === 0,
    fields,
    data,
  };
}

module.exports = {
  validateApiDishInput,
  validateApiChefInput,
  validateApiIngredientInput,
};
