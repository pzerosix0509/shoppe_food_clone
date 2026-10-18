require("dotenv").config();
const { app } = require("./app");
const { prisma } = require("./db");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log("============================================================");
  console.log(`ShopeeFood WebApp đang chạy tại: http://localhost:${PORT}`);
  console.log(`- Trang đặt món (User):  http://localhost:${PORT}/dishes`);
  console.log(`- Trang quản trị (CRUD): http://localhost:${PORT}/admin`);
  console.log(`- Database Driver:       ${prisma.$driver}`);
  console.log("============================================================");
});
