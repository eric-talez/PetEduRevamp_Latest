import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  HelpCircle, 
  MessageSquare, 
  Home,
  Settings,
  CreditCard,
  Star,
  Rocket,
  UserCheck,
  Building,
  Target,
  Users
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpSectionProps {
  expanded: boolean;
  handleItemClick: (path: string) => void;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: (path: string) => void;
}

// 내비게이션 아이템 컴포넌트
const NavItem: React.FC<NavItemProps> = ({ href, icon, children, active, onClick }) => {
  const [location] = useLocation();

  const isActive = active !== undefined ? active : location === href;
  
  return (
    <a
      href={href}
      className={`
        flex items-center gap-3 px-4 py-2 text-sm 
        transition-colors duration-200
        ${isActive ? 'text-primary font-medium' : 'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary'}
      `}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(href);
      }}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
};

// 메인 메뉴 그룹 컴포넌트
interface MenuGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const MenuGroup: React.FC<MenuGroupProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <div
        className="flex items-center justify-between cursor-pointer px-3 py-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon}
          <span className="ml-2 text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>
      {isOpen && <div className="ml-2">{children}</div>}
    </div>
  );
};

// 도움말 섹션 주 컴포넌트
export function HelpSection({ expanded, handleItemClick }: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 사이드바가 축소되었을 때는 아이콘만 표시
  if (!expanded) {
    return (
      <div className="mt-6 px-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 flex justify-center cursor-pointer" 
                onClick={() => handleItemClick('/help')}
              >
                <HelpCircle className="w-5 h-5 text-primary" aria-label="도움말" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>도움말 및 지원</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div>
      {/* 도움말 섹션 헤더 */}
      <div
        className="px-3 py-2 mt-6 flex items-center justify-between cursor-pointer bg-gray-100 dark:bg-gray-700 mx-2 rounded"
        onClick={() => {
          console.log('도움말 섹션 토글:', !isOpen);
          setIsOpen(!isOpen);
        }}
      >
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          도움말
        </h3>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* 도움말 메뉴 컨텐츠 */}
      {isOpen && (
        <div className="px-2 pt-2 pb-4">
          <MenuGroup title="사용자 가이드" icon={<BookOpen className="h-4 w-4 text-primary" />} defaultOpen={true}>
            <NavItem
              href="/help/getting-started"
              icon={<Rocket className="h-4 w-4 text-blue-500" />}
              onClick={handleItemClick}
            >
              시작하기
            </NavItem>
            <NavItem
              href="/help/trainer-guides"
              icon={<UserCheck className="h-4 w-4 text-green-500" />}
              onClick={handleItemClick}
            >
              훈련사 가이드
            </NavItem>
            <NavItem
              href="/help/institute-guides"
              icon={<Building className="h-4 w-4 text-amber-500" />}
              onClick={handleItemClick}
            >
              기관 가이드
            </NavItem>
          </MenuGroup>

          <MenuGroup title="자주 묻는 질문" icon={<Target className="h-4 w-4 text-primary" />}>
            <NavItem
              href="/help/faq/general"
              icon={<Star className="h-4 w-4 text-primary" />}
              onClick={handleItemClick}
            >
              일반 질문
            </NavItem>
            <NavItem
              href="/help/faq/payment"
              icon={<CreditCard className="h-4 w-4 text-red-500" />}
              onClick={handleItemClick}
            >
              결제 관련
            </NavItem>
          </MenuGroup>

          <MenuGroup title="지원 받기" icon={<Users className="h-4 w-4 text-primary" />}>
            <NavItem
              href="/help/contact"
              icon={<MessageSquare className="h-4 w-4 text-indigo-500" />}
              onClick={handleItemClick}
            >
              문의하기
            </NavItem>
            <NavItem
              href="/help/settings"
              icon={<Settings className="h-4 w-4 text-gray-500" />}
              onClick={handleItemClick}
            >
              설정
            </NavItem>
          </MenuGroup>
        </div>
      )}
    </div>
  );
}