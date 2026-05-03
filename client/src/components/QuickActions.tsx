import React, { useContext } from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarContext } from "./Sidebar";
import { useLocation } from "wouter";
import {
  Plus,
  BookOpen,
  PawPrint,
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  Settings,
  Zap,
  BarChart3
} from "lucide-react";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}

interface QuickActionsProps {
  userRole: string | null;
  onClick: (path: string) => void;
}

export function QuickActions({ userRole, onClick }: QuickActionsProps) {
  const { expanded } = useContext(SidebarContext);
  const [location, setLocation] = useLocation();

  const getQuickActions = (): QuickAction[] => {
    switch (userRole) {
      case 'pet-owner':
        return [
          { icon: <PawPrint className="w-4 h-4" />, label: "반려동물 추가", href: "/my-pets/add", color: "bg-secondary/100" },
          { icon: <BookOpen className="w-4 h-4" />, label: "강의 신청", href: "/courses", color: "bg-blue-500" },
          { icon: <Calendar className="w-4 h-4" />, label: "일정 확인", href: "/education-schedule", color: "bg-green-500" },
        ];
      case 'trainer':
        return [
          { icon: <Plus className="w-4 h-4" />, label: "강의 등록", href: "/trainer/courses/new", color: "bg-blue-500" },
          { icon: <MessageSquare className="w-4 h-4" />, label: "알림장 작성", href: "/trainer/notebook", color: "bg-primary/50" },
          { icon: <DollarSign className="w-4 h-4" />, label: "수익 확인", href: "/trainer/earnings", color: "bg-green-500" },
        ];
      case 'institute-admin':
        return [
          { icon: <Users className="w-4 h-4" />, label: "강사 추가", href: "/institute/trainers/add", color: "bg-blue-500" },
          { icon: <BarChart3 className="w-4 h-4" />, label: "현황 확인", href: "/institute/dashboard", color: "bg-primary/50" },
          { icon: <Settings className="w-4 h-4" />, label: "시설 관리", href: "/institute/facility", color: "bg-orange-500" },
        ];
      case 'admin':
        return [
          { icon: <BarChart3 className="w-4 h-4" />, label: "대시보드", href: "/admin/dashboard", color: "bg-blue-500" },
          { icon: <Users className="w-4 h-4" />, label: "사용자", href: "/admin/users", color: "bg-primary/50" },
          { icon: <Settings className="w-4 h-4" />, label: "설정", href: "/admin/settings", color: "bg-gray-500" },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  if (quickActions.length === 0) return null;

  const handleClick = (href: string) => {
    onClick(href);
  };

  if (!expanded) {
    return (
      <div className="px-2 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center gap-2">
          {quickActions.map((action, index) => (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleClick(action.href)}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110",
                      action.color
                    )}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
