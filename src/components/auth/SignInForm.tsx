"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Đăng nhập
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nhập tên đăng nhập và mật khẩu để vào hệ thống
            </p>
          </div>

          <form action={formAction}>
            <div className="space-y-6">
              {state.error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  {state.error}
                </div>
              )}

              <div>
                <Label>
                  Tên đăng nhập <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="tenDangNhap"
                  type="text"
                  placeholder="vd: nhhue.syt"
                 // autoComplete="username"
                />
              </div>

              <div>
                <Label>
                  Mật khẩu <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    name="matKhau"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    //autoComplete="current-password"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>

              <div>
                <Button className="w-full" size="sm" disabled={isPending}>
                  {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}