// Thanh tiến độ kiểu "năng lượng" — track bo tròn dày hơn bản cũ, phần fill có gradient
// xanh-dương -> xanh-lá (nhìn giống thanh pin/năng lượng đang sạc thay vì thanh progress phẳng
// đơn sắc trước đây).
export default function ProgressBar({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-400">
        <span>Tiến độ</span>
        <span className="font-medium text-gray-500 dark:text-gray-300">{value}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-success-500 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// Biến thể FULL-BLEED — dải ngang chạy hết chiều rộng thẻ (card), đặt ở mép dưới cùng, không có
// padding/label riêng. Tự bo góc dưới + overflow-hidden NGAY TRÊN CHÍNH NÓ (không phải trên card
// cha) — trước đây bo góc bằng overflow-hidden ở card cha, nhưng làm vậy lại cắt luôn menu 3 chấm
// (dropdown) mỗi khi nó cần tràn ra ngoài rìa card, khiến menu bị che mất. Card cha giờ không còn
// overflow-hidden nữa.
export function ProgressStrip({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-b-xl bg-gray-100 dark:bg-white/10">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-success-500 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
