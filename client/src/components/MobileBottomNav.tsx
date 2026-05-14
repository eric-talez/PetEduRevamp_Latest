import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-compat";
import {
  Home,
  BookOpen,
  ShoppingBag,
  MapPin,
  LogIn,
  GraduationCap,
  PawPrint,
  MoreHorizontal,
  Users,
  DollarSign,
  Settings,
  UserCog,
  CalendarDays
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, userRole } = useAuth();

  const getNavItems = (): NavItem[] => {
    if (!isAuthenticated) {
      return [
        { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
        { href: "/courses", icon: <BookOpen className="w-5 h-5" />, label: "강의" },
        { href: "/shop", icon: <ShoppingBag className="w-5 h-5" />, label: "쇼핑" },
        { href: "/locations", icon: <MapPin className="w-5 h-5" />, label: "시설 찾기" },
        { href: "/pet-events-map", icon: <CalendarDays className="w-5 h-5" />, label: "행사 지도" },
        { href: "/auth", icon: <LogIn className="w-5 h-5" />, label: "로그인" },
      ];
    }

    switch (userRole) {
      case "pet-owner":
        return [
          { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
          { href: "/my-courses", icon: <GraduationCap className="w-5 h-5" />, label: "내 강의" },
          { href: "/shop", icon: <ShoppingBag className="w-5 h-5" />, label: "쇼핑" },
          { href: "/my-pets", icon: <PawPrint className="w-5 h-5" />, label: "내 반려동물" },
          { href: "/profile", icon: <MoreHorizontal className="w-5 h-5" />, label: "더보기" },
        ];
      case "trainer":
        return [
          { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
          { href: "/trainer/courses", icon: <GraduationCap className="w-5 h-5" />, label: "내 강의" },
          { href: "/trainer/students", icon: <Users className="w-5 h-5" />, label: "수강생" },
          { href: "/trainer/revenue", icon: <DollarSign className="w-5 h-5" />, label: "수익" },
          { href: "/profile", icon: <MoreHorizontal className="w-5 h-5" />, label: "더보기" },
        ];
      case "institute-admin":
        return [
          { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
          { href: "/institute/trainers", icon: <Users className="w-5 h-5" />, label: "훈련사" },
          { href: "/institute/courses", icon: <BookOpen className="w-5 h-5" />, label: "강의" },
          { href: "/institute/revenue", icon: <DollarSign className="w-5 h-5" />, label: "수익" },
          { href: "/institute/settings", icon: <Settings className="w-5 h-5" />, label: "설정" },
        ];
      case "admin":
        return [
          { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
          { href: "/admin/users", icon: <UserCog className="w-5 h-5" />, label: "사용자" },
          { href: "/admin/courses", icon: <BookOpen className="w-5 h-5" />, label: "강의" },
          { href: "/admin/settings", icon: <Settings className="w-5 h-5" />, label: "설정" },
          { href: "/admin", icon: <MoreHorizontal className="w-5 h-5" />, label: "더보기" },
        ];
      default:
        return [
          { href: "/", icon: <Home className="w-5 h-5" />, label: "홈" },
          { href: "/courses", icon: <BookOpen className="w-5 h-5" />, label: "강의" },
          { href: "/shop", icon: <ShoppingBag className="w-5 h-5" />, label: "쇼핑" },
          { href: "/locations", icon: <MapPin className="w-5 h-5" />, label: "시설 찾기" },
          { href: "/pet-events-map", icon: <CalendarDays className="w-5 h-5" />, label: "행사 지도" },
          { href: "/profile", icon: <MoreHorizontal className="w-5 h-5" />, label: "더보기" },
        ];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const handleNavClick = (href: string) => {
    setLocation(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
      role="navigation"
      aria-label="모바일 하단 네비게이션"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-2 px-1 rounded-lg transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                active
                  ? "text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              <div
                className={cn(
                  "transition-transform duration-200",
                  active && "scale-110"
                )}
              >
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 font-medium truncate max-w-full",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-900" />
    </nav>
  );
}
