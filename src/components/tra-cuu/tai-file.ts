// Tải file nhị phân từ 1 Response (fetch) về máy người dùng — dùng chung cho nút "Xuất Word" và
// "Xuất Word" trong giao diện biên tập. Ném lỗi (kèm thông báo server trả về nếu có) khi !res.ok.
export async function taiFileTuResponse(res: Response, tenFileMacDinh: string) {
  if (!res.ok) {
    let msg = "Xuất Word thất bại, vui lòng thử lại";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // body không phải JSON — giữ thông báo mặc định
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const tenFile = match?.[1] ? decodeURIComponent(match[1]) : tenFileMacDinh;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
