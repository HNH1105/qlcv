import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hệ thống quản lý công việc - Đăng nhập",
  description: "Đăng nhập vào hệ thống quản lý công việc Sở Y tế Vĩnh Long",
};

export default function SignIn() {
  return <SignInForm />;
}
