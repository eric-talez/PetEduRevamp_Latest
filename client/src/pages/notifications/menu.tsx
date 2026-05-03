import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Calendar, 
  Info, 
  MessageSquare,
  Package, 
  Shield, 
  Star, 
  Tag 
} from "lucide-react";
import { useLocation } from "wouter";

interface NotificationsMenuProps {
  currentPath: string;
}

export default function NotificationsMenu({ currentPath }: NotificationsMenuProps) {
  const [location, navigate] = useLocation();
  
  const isActive = (path: string) => currentPath === path;
  
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">알림 유형</h3>
      
      <div className="space-y-2">
        <Button 
          variant={isActive("/notifications") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-gray-500" />
          전체 알림
        </Button>
        <Button 
          variant={isActive("/notifications/system") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/system")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-blue-500" />
          시스템 알림
        </Button>
        <Button 
          variant={isActive("/notifications/training") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/training")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-primary/50" />
          훈련 피드백
        </Button>
        <Button 
          variant={isActive("/notifications/event") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/event")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-green-500" />
          일정 알림
        </Button>
        <Button 
          variant={isActive("/notifications/payment") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/payment")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-yellow-500" />
          결제 알림
        </Button>
        <Button 
          variant={isActive("/notifications/security") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/security")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-red-500" />
          보안 알림
        </Button>
        <Button 
          variant={isActive("/notifications/order") ? "default" : "ghost"} 
          className="w-full justify-start" 
          onClick={() => navigate("/notifications/order")}
        >
          <div className="mr-2 w-2 h-2 rounded-full bg-indigo-500" />
          주문 알림
        </Button>
      </div>
    </Card>
  );
}