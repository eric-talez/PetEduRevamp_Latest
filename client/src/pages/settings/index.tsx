import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ThemeSettings } from "@/components/ThemeSettings";
import { AccessibilitySettings } from "@/components/ui/AccessibilityControls";
import { SecuritySessionsPanel } from "@/components/SecuritySessionsPanel";

interface SettingsPageProps {
  userRole?: string;
}

export default function SettingsPage({ userRole: propUserRole }: SettingsPageProps = {}) {
  const auth = useAuth();
  const { toast } = useToast();
  
  // 권한 체크
  const checkAccess = (allowedRoles: string[]) => {
    return auth.isAuthenticated && auth.userRole && allowedRoles.includes(auth.userRole);
  };
  
  // 훈련사 설정 접근은 훈련사와 관리자만 가능
  if (propUserRole === "trainer" && !checkAccess(['trainer', 'admin'])) {
    return <Redirect to="/" />;
  }
  
  // 기관 관리자 설정 접근은 기관 관리자와 관리자만 가능
  if (propUserRole === "institute-admin" && !checkAccess(['institute-admin', 'admin'])) {
    return <Redirect to="/" />;
  }
  
  // props로 전달된 userRole이 있으면 그것을 사용하고, 없으면 auth에서 가져옴
  const userRole = propUserRole || auth.userRole;
  const userName = auth.userName;
  const [activeTab, setActiveTab] = useState("account");
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    username: userName || "",
    email: "user@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // 프로필 이미지 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
        toast({
          title: "프로필 이미지 업로드",
          description: "프로필 이미지가 선택되었습니다. 저장 버튼을 클릭하여 변경사항을 저장하세요.",
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 비밀번호 변경 핸들러
  const handlePasswordChange = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "비밀번호 변경 실패",
        description: "모든 비밀번호 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "비밀번호 변경 실패",
        description: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "비밀번호 변경 완료",
          description: "비밀번호가 성공적으로 변경되었습니다.",
        });
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
      } else {
        const error = await response.json();
        toast({
          title: "비밀번호 변경 실패",
          description: error.message || "비밀번호 변경 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "비밀번호 변경 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 설정 저장 핸들러
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          profileImage: profileImage,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "설정 저장 완료",
          description: "설정이 성공적으로 저장되었습니다.",
        });
      } else {
        toast({
          title: "설정 저장 실패",
          description: "설정 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "설정 저장 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">설정</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* 사이드바 메뉴 */}
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setActiveTab("account")}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === "account" 
                    ? "bg-primary text-white" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                계정 설정
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("notifications")}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === "notifications" 
                    ? "bg-primary text-white" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                알림 설정
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("privacy")}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === "privacy" 
                    ? "bg-primary text-white" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                개인정보 설정
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("theme")}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === "theme" 
                    ? "bg-primary text-white" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                테마 및 화면 설정
              </button>
            </li>
            {userRole === 'trainer' && (
              <li>
                <button 
                  onClick={() => setActiveTab("trainer")}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === "trainer" 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  훈련사 설정
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === "security"
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                data-testid="tab-security"
              >
                보안 / 활성 세션
              </button>
            </li>
            {userRole === 'institute-admin' && (
              <li>
                <button 
                  onClick={() => setActiveTab("institute")}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === "institute" 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  기관 설정
                </button>
              </li>
            )}
          </ul>
        </div>
        
        {/* 컨텐츠 영역 */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {activeTab === "account" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">계정 설정</h2>
              <div className="space-y-6">
                {/* 프로필 이미지 업로드 */}
                <div>
                  <label className="block text-sm font-medium mb-3">프로필 이미지</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="프로필 이미지" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-2xl text-gray-500 dark:text-gray-400">
                            {userName ? userName.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="profile-image"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('profile-image')?.click()}
                      >
                        이미지 선택
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG 파일만 업로드 가능</p>
                    </div>
                  </div>
                </div>

                {/* 기본 정보 */}
                <div>
                  <label className="block text-sm font-medium mb-1">사용자 이름</label>
                  <Input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">이메일</label>
                  <Input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  />
                </div>

                {/* 비밀번호 변경 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">비밀번호 변경</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">현재 비밀번호</label>
                      <Input 
                        type="password" 
                        placeholder="현재 비밀번호를 입력하세요"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({...prev, currentPassword: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">새 비밀번호</label>
                      <Input 
                        type="password" 
                        placeholder="새 비밀번호를 입력하세요"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({...prev, newPassword: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">새 비밀번호 확인</label>
                      <Input 
                        type="password" 
                        placeholder="새 비밀번호를 다시 입력하세요"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        onClick={handlePasswordChange}
                        disabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                      >
                        비밀번호 변경
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 저장 버튼 */}
                <div className="border-t pt-6 flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => {
                    setFormData({
                      username: userName || "",
                      email: "user@example.com",
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                    setProfileImage(null);
                  }}>
                    초기화
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    변경사항 저장
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">알림 설정</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">이메일 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">중요 소식 및 업데이트를 이메일로 받기</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="email-toggle" className="sr-only" defaultChecked />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-6"></span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">SMS 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">중요 알림을 SMS로 받기</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="sms-toggle" className="sr-only" defaultChecked />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-6"></span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">앱 푸시 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">모바일 앱 푸시 알림 허용</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="push-toggle" className="sr-only" defaultChecked />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-6"></span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    변경사항 저장
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "privacy" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">개인정보 설정</h2>
              <p className="mb-4">개인정보 공개 설정을 관리합니다.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">프로필 공개</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">내 프로필을 다른 사용자에게 공개</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="profile-toggle" className="sr-only" defaultChecked />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-6"></span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">연락처 공개</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">내 연락처 정보를 다른 사용자에게 공개</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="contact-toggle" className="sr-only" />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200"></span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium">위치 정보 사용</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">내 위치 정보를 서비스 이용에 활용</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                    <input type="checkbox" id="location-toggle" className="sr-only" defaultChecked />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-6"></span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    변경사항 저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "theme" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">테마 및 화면 설정</h2>
              <div className="space-y-6">
                <ThemeSettings />
              </div>
            </div>
          )}
          
          {activeTab === "trainer" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">훈련사 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">전문 분야</label>
                  <select className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>문제행동 교정</option>
                    <option>기본 복종훈련</option>
                    <option>어질리티</option>
                    <option>탐지견 훈련</option>
                    <option>공격성 교정</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">자격증 정보</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="자격증 번호 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">자기소개</label>
                  <textarea 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                    placeholder="훈련사 소개글을 작성해주세요"
                  ></textarea>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    변경사항 저장
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "security" && (
            <div data-testid="settings-security-panel">
              <SecuritySessionsPanel />
            </div>
          )}

          {activeTab === "institute" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">기관 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">기관명</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="기관 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">사업자 등록번호</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="000-00-00000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">주소</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    placeholder="기본 주소"
                  />
                  <input 
                    type="text" 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="상세 주소"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">기관 소개</label>
                  <textarea 
                    className="w-full p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                    placeholder="기관 소개글을 작성해주세요"
                  ></textarea>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    변경사항 저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}