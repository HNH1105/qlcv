import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("Thiếu biến môi trường SESSION_SECRET trong file .env");
}
const encodedKey = new TextEncoder().encode(secretKey);

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 ngày

export type SessionPayload = {
  maNV: string;
  hoTen: string;
  tenDangNhap: string;
  maPhong: string;
  tenPhong: string;
  quyen: string; // giá trị enum Quyen dạng string: USER | LANHDAOPHONG | LANHDAODONVI
  isAdmin: boolean;
};

async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey);
}

// Tách riêng (không phải server-only) vì hàm này chỉ đọc chuỗi + xác minh chữ ký, không đụng
// tới cookies() — nếu sau này cần bảo vệ route ở tầng middleware (chạy Edge runtime), có thể
// import thẳng hàm này mà không kéo theo phần dùng next/headers.
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt(payload, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Đọc session hiện tại — KHÔNG throw nếu chưa đăng nhập, trả null để nơi gọi tự quyết định
// (VD: layout.tsx tự redirect, hoặc component chỉ ẩn phần nội dung liên quan).
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decrypt(token);
}

// Dùng khi BẮT BUỘC phải có session (đặt ở đầu mỗi Server Action nghiệp vụ sau này)
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  return session;
}