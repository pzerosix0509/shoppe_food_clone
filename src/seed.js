const { prisma } = require("./db");

async function main() {
  console.log(`Đang khởi tạo và seed dữ liệu mẫu qua driver: ${prisma.$driver}...`);
  await prisma.resetAndSeed();
  const dishes = await prisma.dish.findMany();
  const chefs = await prisma.chef.findMany();
  const ingredients = await prisma.ingredient.findMany();
  console.log(
    `Hoàn tất seed! Đã tạo ${dishes.length} món ăn, ${chefs.length} đầu bếp, ${ingredients.length} nguyên liệu.`
  );
}

main().catch((err) => {
  console.error("Lỗi khi chạy seed:", err);
  process.exit(1);
});
