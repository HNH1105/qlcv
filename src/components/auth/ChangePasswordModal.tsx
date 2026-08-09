"use client";

import React, { useActionState, useEffect, useState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/auth/actions";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";

const initialState: ChangePasswordState = {};

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  // Đổi thành công thì tự đóng sau 1.2s, đủ để người dùng kịp thấy thông báo
  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state.success, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Đổi mật khẩu
        </h3>

        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-400">
              Đổi mật khẩu thành công!
            </div>
          )}

          <div>
            <Label>Mật khẩu hiện tại</Label>
            <Input name="matKhauCu" type={showPassword ? "text" : "password"} />
          </div>
          <div>
            <Label>Mật khẩu mới</Label>
            <Input name="matKhauMoi" type={showPassword ? "text" : "password"}  />
          </div>
          <div>
            <Label>Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input name="xacNhanMatKhauMoi" type={showPassword ? "text" : "password"} autoComplete="current-password" />
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Huỷ
            </button>
            <Button className="flex-1" size="sm" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}