require("dotenv").config();
const { app } = require("./app");
const { webApp } = require("../web/server");
const { prisma } = require("./db");

const PORT = Number(process.env.PORT) || 3000;
const WEB_PORT = Number(process.env.WEB_PORT) || 5173;
const apiOnly = process.argv.includes("--api-only");

app.listen(PORT, () => {
  console.log("============================================================");
  console.log(`[API & SSR Server] đang chạy tại: http://localhost:${PORT}`);
  console.log(`- REST API (Block #6):   http://localhost:${PORT}/api/dishes`);
  console.log(`- SSR WebApp (Block #5): http://localhost:${PORT}/dishes`);
  console.log(`- Database Driver:       ${prisma.$driver}`);
  console.log("============================================================");
});

if (!apiOnly) {
  webApp.listen(WEB_PORT, () => {
    console.log("============================================================");
    console.log(`[SPA Web Server - Block #6] đang chạy tại: http://localhost:${WEB_PORT}`);
    console.log(`- SPA Storefront:        http://localhost:${WEB_PORT}/dishes`);
    console.log(`- SPA Admin CRUD:        http://localhost:${WEB_PORT}/admin/dishes`);
    console.log(`- CORS Origin Allowed:   ${process.env.CORS_ORIGIN || `http://localhost:${WEB_PORT}`}`);
    console.log("============================================================");
  });
}
