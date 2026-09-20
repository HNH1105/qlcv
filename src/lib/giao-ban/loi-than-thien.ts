// ĐÍCH: src/lib/giao-ban/loi-than-thien.ts
//
// Dùng ở MỌI catch (e) trong các modal/board của Giao ban. Lý do cần file này: đôi khi lỗi hiện ra
// ở UI không phải message rõ ràng do Server Action throw (VD: "Cuộc giao ban đã chốt...") mà là
// message kỹ thuật khó hiểu kiểu "Minified React error #441; visit https://react.dev/errors/441"
// — đây LÀ message thật của object Error nhưng không có ý nghĩa gì với người dùng cuối. Thay vì cố
// đoán nguyên nhân gốc (có thể do 1 lỗi khác trong cây render, không liên quan trực tiếp tới hành
// động vừa bấm), ta lọc các message dạng kỹ thuật này và thay bằng câu chung dễ hiểu, đồng thời
// GIỮ NGUYÊN các message rõ ràng (tiếng Việt, do chính Server Action ở đây throw).

export function loiThanThien(e: unknown, fallback = "Có lỗi xảy ra, vui lòng thử lại."): string {
  if (!(e instanceof Error)) return fallback;
  const msg = e.message?.trim();
  if (!msg) return fallback;
  // Các dấu hiệu của lỗi kỹ thuật/không phải message nghiệp vụ do ta tự throw:
  const laLoiKyThuat =
    /minified react error/i.test(msg) ||
    /react\.dev\/errors/i.test(msg) ||
    /^\s*$/.test(msg) ||
    msg.length > 300; // message nghiệp vụ luôn ngắn gọn, dài bất thường thường là stack/lỗi lạ
  return laLoiKyThuat ? fallback : msg;
}

// Rút gọn nội dung công việc khi cần nhắc tới trong toast lỗi hàng loạt — chỉ lấy khoảng 10 ký tự
// đầu kèm "…" theo đúng yêu cầu, tránh toast dài dòng khi báo lỗi nhiều dòng cùng lúc.
export function rutGonNoiDung(noiDung: string, soKyTu = 10): string {
  const s = noiDung.trim();
  return s.length <= soKyTu ? s : s.slice(0, soKyTu) + "…";
}
