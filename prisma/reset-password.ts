
// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// const NEW_PASSWORD = "222";

// async function main() {
//   console.log("==============================================");
//   console.log("RESET PASSWORD TOAN BO TAI KHOAN");
//   console.log("==============================================");

//   console.log("\n[1/3] Dang hash password...");

//   const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

//   console.log("[2/3] Dang reset tai khoan...");

//   const result = await prisma.taiKhoan.updateMany({
//     data: {
//       matKhauHash: passwordHash,
//       biKhoa: false,
//       soLanDangNhapSaiLienTiep: 0,
//     },
//   });

//   console.log("[3/3] Hoan tat.");

//   console.log("\n==============================================");
//   console.log("RESET PASSWORD THANH CONG");
//   console.log("==============================================");
//   console.log(`So tai khoan: ${result.count}`);
//   console.log(`Password moi: ${NEW_PASSWORD}`);
//   console.log("==============================================");
// }

// main()
//   .catch((error) => {
//     console.error("\nRESET PASSWORD THAT BAI:");
//     console.error(error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

