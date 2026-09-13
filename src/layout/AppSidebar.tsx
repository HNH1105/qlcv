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
function getNavItems(quyen?: string): NavItem[] {
  const isLanhDaoPhong = quyen === "LANHDAOPHONG";
  const isLanhDaoCoQuan = quyen === "LANHDAODONVI";
  const isLanhDao = isLanhDaoPhong || isLanhDaoCoQuan;

  return [
    // ---------- CÁ NHÂN ----------
    {
      icon: <UserCircleIcon />,
      name: "Cá nhân",
      subItems: [
        { name: "Kế hoạch", path: "/ca-nhan/ke-hoach", pro: false },
        { name: "Báo cáo", path: "/ca-nhan/bao-cao", pro: false },

        ...(isLanhDao
          ? [
              {
                name: "Kế hoạch (Cả phòng)",
                path: "/ca-nhan/ke-hoach-toan-phong",
                pro: false,
              },
              {
                name: "Báo cáo (Cả phòng)",
                path: "/ca-nhan/bao-cao-toan-phong",
                pro: false,
              },
            ]
          : []),
      ],
    },

    // ---------- PHÒNG ----------
    {
      icon: <GridIcon />,
      name: "Phòng",
      subItems: [
        { name: "Kế hoạch", path: "/phong/ke-hoach", pro: false },
        { name: "Báo cáo", path: "/phong/bao-cao", pro: false },
      ],
    },

    // ---------- NHIỆM VỤ ----------
    {
      icon: <ListIcon />,
      name: "Nhiệm vụ",
      subItems: [
        // Chỉ Lãnh đạo mới được tạo mới & xem đã giao
        ...(isLanhDao
          ? [
              { name: "Thêm mới", path: "/nhiem-vu/tao-moi", pro: false },
              { name: "Đã giao", path: "/nhiem-vu/toi-giao", pro: false },
              { name: "Của phòng", path: "/nhiem-vu/phong", pro: false },
            ]
          : []),

        // Các mục còn lại ai cũng thấy
        { name: "Chờ xử lý", path: "/nhiem-vu", pro: false },
        { name: "Thống kê", path: "/nhiem-vu/thong-ke", pro: false },
        { name: "Tra cứu", path: "/nhiem-vu/tra-cuu", pro: false },
      ],
    },
    {
          icon: <GridIcon />,
          name: "Check list Giao ban (Test)",
          subItems: [
              { name: "Danh sách giao ban tuần", path: "/giao-ban", pro: false },
          ],
        },
  ];
}
// ==========================================================================================
// ====================              MENU "TRA CỨU"                        =================
// ==========================================================================================
const SearchItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Tra cứu",
    subItems: [
      { name: "Kế hoạch", path: "/tra-cuu/ke-hoach", pro: false },
      { name: "Báo cáo", path: "/tra-cuu/bao-cao", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Liên kết công việc",
    subItems: [
      {
        name: "Lịch công tác cơ quan",
        path: "https://soyte-vlg.vercel.app/en/lich-ct",
        pro: false,
      },
      {
        name: "Lịch phòng họp",
        path: "https://soyte-vlg.vercel.app/en/lich-phong-hop",
        pro: false,
      },
      {
        name: "Check list giao ban",
        path: "https://soyte-vlg.vercel.app/en/check-list/giao-ban",
        pro: false,
      },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Liên kết Tiện ích",
    subItems: [
      {
        name: "Tạo mã QR",
        path: "https://www.websiteplanet.com/vi/webtools/free-qr-code-generator/",
        pro: false,
      },
    ],
  },
];

type MenuType = "main" | "others" | "admin";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const user = useAuth();

  // Lấy quyền từ session (đã có trong AuthContext)
  const quyen = user?.quyen; // "USER" | "LANHDAOPHONG" | "LANHDAODONVI"
  const navItems = getNavItems(quyen);

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
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
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
                  <span className="menu-item-text">{nav.name}</span>
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
                {nav.subItems.map((subItem) => {
                  const isExternal = subItem.path.startsWith("http");

                  return (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.path}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
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
                              } menu-dropdown-badge`}
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
                              } menu-dropdown-badge`}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
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

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Tự mở submenu khi vào trang con
  useEffect(() => {
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

  // Tính chiều cao submenu khi mở
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: MenuType) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) {
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
      {/* Logo */}
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" className="hidden lg:block">
          {isExpanded || isHovered || isMobileOpen ? (
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
              Hệ thống QLCV
            </div>
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

      {/* Menu */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* ===== CÔNG VIỆC ===== */}
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

            {/* ===== TRA CỨU - TIỆN ÍCH ===== */}
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Tra cứu - Tiện ích"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(SearchItems, "others")}
            </div>

            {/* ===== QUẢN TRỊ (chỉ Admin) ===== */}
            {user?.isAdmin && (
              <div>
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
      </div>
    </aside>
  );
};

export default AppSidebar;