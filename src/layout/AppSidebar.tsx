"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// ==========================================================================================
// ====================              MENU "QUẢN TRỊ" — GIỮ NGUYÊN          =================
// ==========================================================================================
// Chưa bắt đầu viết phần này — giữ nguyên làm tham khảo UI, chưa dọn lại tên/đường dẫn.
const adminItems: NavItem[] = [
  {
    icon: <UserCircleIcon />,
    name: "Quản lý người dùng",
    path: "/admin/nguoi-dung",
  },
  {
    icon: <TableIcon />,
    name: "Quản lý danh mục",
    path: "/admin/danh-muc",
  },
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircleIcon />,
    name: "User Profile",
    path: "/profile",
  },
  {
    name: "Forms",
    icon: <ListIcon />,
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Tables",
    icon: <TableIcon />,
    subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
];

// ==========================================================================================
// ====================              MENU "CÔNG VIỆC"                      =================
// ==========================================================================================
// Mỗi mục dẫn thẳng tới 1 TRANG DUY NHẤT — trang đó tự quản lý tab con "Nhập" / "Xem lại"
// bên trong (giống bản Apps Script cũ dùng subTab), KHÔNG tách thành nhiều route riêng.
// Lý do: sidebar gọn hơn nhiều (3 mục thay vì 8), và giữ đúng luồng thao tác người dùng
// đã quen (chuyển tab tại chỗ, không load lại trang / mất ngữ cảnh tuần đang chọn).
// "Toàn bộ phòng" (trước đây là tab "Toàn bộ" bên trong board Kế hoạch/Báo cáo cá nhân, chỉ lãnh
// đạo phòng/đơn vị thấy) — nay CHUYỂN RA thành 2 mục menu riêng, bắt vào menu trái thay vì bắt
// theo tab, và chỉ hiện với người có quyen LANHDAOPHONG/LANHDAODONVI. Đặt là hàm (thay vì const
// tĩnh) vì cần biết quyen của người đang đăng nhập mới quyết định được có thêm 2 mục này hay
// không.
function getNavItems(isLanhDao: boolean): NavItem[] {
  return [
    {
      icon: <GridIcon />,
      name: "Cá nhân",
      subItems: [
        { name: "Kế hoạch", path: "/ca-nhan/ke-hoach", pro: false },
        { name: "Báo cáo", path: "/ca-nhan/bao-cao", pro: false },
        ...(isLanhDao
          ? [
              { name: "Kế hoạch (Toàn bộ phòng)", path: "/ca-nhan/ke-hoach-toan-phong", pro: false },
              { name: "Báo cáo (Toàn bộ phòng)", path: "/ca-nhan/bao-cao-toan-phong", pro: false },
            ]
          : []),
      ],
    },
    {
      icon: <GridIcon />,
      name: "Phòng",
      subItems: [
        { name: "Kế hoạch", path: "/phong/ke-hoach", pro: false },
        { name: "Báo cáo", path: "/phong/bao-cao", pro: false },
      ],
    },
    {
      icon: <GridIcon />,
      name: "Nhiệm vụ",
      // Không có subItems: trang /nhiem-vu tự có tab "Danh sách" / "+ Tạo nhiệm vụ" bên trong,
      // đúng như NhiemVu_Markup.html bản cũ (nvTabDS / nvTabTAO cùng 1 container).
      path: "/nhiem-vu",
    },
  ];
}

// ==========================================================================================
// ====================              MENU "TRA CỨU"                        =================
// ==========================================================================================
const SearchItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Tra cứu",
    subItems: [
      { name: "Kế hoạch Phòng", path: "/tra-cuu/ke-hoach-phong", pro: false },
      { name: "Kế hoạch cá nhân", path: "/tra-cuu/ke-hoach-ca-nhan", pro: false },
      { name: "Báo cáo cá nhân", path: "/tra-cuu/bao-cao-ca-nhan", pro: false },
      { name: "Nhiệm vụ", path: "/tra-cuu/nhiem-vu", pro: false },
    ],
  },
];

// Tra theo menuType -> đúng mảng dữ liệu đang được render cho menuType đó. Dùng object thay vì
// if/else rải rác để useEffect bên dưới không bao giờ lệch với những gì renderMenuItems() đang
// hiển thị thật (lỗi cũ: useEffect tự dò theo biến "othersItems" trong khi màn hình lại render
// "SearchItems" cho menuType "others" — 2 nguồn dữ liệu khác nhau nên tự-mở-submenu bị sai).
type MenuType = "main" | "others" | "admin";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const user = useAuth();

  // Giả định user.quyen tồn tại trên đối tượng trả về từ useAuth() (đã được lưu ý ở lần sửa
  // trước, dùng chung cho tab "Toàn bộ" cũ) — nếu chưa có field này trên context thì 2 mục menu
  // "Toàn bộ phòng" sẽ không hiện cho ai cả, cần bổ sung field quyen vào AuthContext.
  const isLanhDao = user?.quyen === "LANHDAOPHONG" || user?.quyen === "LANHDAODONVI";
  const navItems = getNavItems(isLanhDao);
  const allMenus: Record<MenuType, NavItem[]> = {
    main: navItems,
    others: SearchItems,
    admin: adminItems,
  };

  const renderMenuItems = (items: NavItem[], menuType: MenuType) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: MenuType;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Tự bung đúng submenu tương ứng khi vào thẳng 1 trang con bằng URL (VD: bookmark, F5,
    // hoặc điều hướng từ nơi khác) — dò trên ĐÚNG dữ liệu đang render (allMenus), không dò
    // trên biến rời rạc dễ lệch như trước.
    let submenuMatched = false;
    (Object.keys(allMenus) as MenuType[]).forEach((menuType) => {
      allMenus[menuType].forEach((nav, index) => {
        nav.subItems?.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({ type: menuType, index });
            submenuMatched = true;
          }
        });
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: MenuType) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
              ? "w-[290px]"
              : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              
              <div className="flex items-center gap-3 text-[20px] font-semibold text-gray-900 dark:text-white">
                <Image
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={40}
                height={40}
              />
              <Image
                className="hidden dark:block"
               src="/images/logo/logo.png"
                alt="Logo"
                width={40}
                height={40}
              />
                Hệ thống QLCV</div>
              
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Công việc"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Tra cứu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(SearchItems, "others")}
            </div>

            {user?.isAdmin && (
              <div className="">
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Quản trị"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(adminItems, "admin")}
              </div>
            )}
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
