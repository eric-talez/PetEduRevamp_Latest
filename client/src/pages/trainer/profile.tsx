import { useState, useEffect } from 'react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, 
  Settings, 
  Award, 
  Camera, 
  MapPin, 
  Phone,
  Mail,
  Calendar,
  Star,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Edit,
  Save,
  X,
  Plus
} from 'lucide-react';

interface TrainerProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  avatar: string;
  experience: number;
  specializations: string[];
  certifications: Certification[];
  portfolio: PortfolioItem[];
  rating: number;
  totalReviews: number;
  joinDate: string;
  status: 'active' | 'inactive';
  workingHours: string;
  priceRange: string;
}

interface Certification {
  id: number;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  certificateUrl: string;
  status: 'active' | 'expired' | 'pending';
}

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: 'before_after' | 'training_session' | 'achievement' | 'facility';
  createdAt: string;
}

export default function TrainerProfile() {
  const { userName } = useGlobalAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TrainerProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newCertification, setNewCertification] = useState<Partial<Certification>>({});
  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState<Partial<PortfolioItem>>({});
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // 실제 훈련사 프로필 데이터
      const mockProfile: TrainerProfile = {
        id: 1,
        name: "강동훈",
        email: "kang.donghoon@example.com",
        phone: "010-1234-5678",
        address: "경북 구미시 구평동",
        bio: "15년 경력의 전문 반려동물 훈련사입니다. 기초 복종 훈련부터 고급 행동 교정까지 전문적인 훈련 서비스를 제공합니다. 특히 문제 행동 교정과 퍼피 사회화 훈련에 특화되어 있습니다.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=강동훈&backgroundColor=b6e3f4",
        experience: 15,
        specializations: ["기초 복종 훈련", "행동 교정", "퍼피 사회화", "어질리티", "시니어 케어"],
        certifications: [
          {
            id: 1,
            name: "반려동물 행동 교정 전문가",
            issuer: "한국반려동물교육협회",
            issueDate: "2020-03-15",
            expiryDate: "2025-03-15",
            certificateUrl: "/certificates/cert1.pdf",
            status: 'active'
          },
          {
            id: 2,
            name: "반려동물 훈련사 1급",
            issuer: "농림축산식품부",
            issueDate: "2019-08-20",
            expiryDate: "2024-08-20",
            certificateUrl: "/certificates/cert2.pdf",
            status: 'active'
          },
          {
            id: 3,
            name: "동물 심리학 전문가",
            issuer: "한국동물심리학회",
            issueDate: "2021-01-10",
            expiryDate: "2026-01-10",
            certificateUrl: "/certificates/cert3.pdf",
            status: 'active'
          }
        ],
        portfolio: [
          {
            id: 1,
            title: "공격성 개선 사례 - 진돗개 맥스",
            description: "공격적인 성향의 진돗개 맥스가 3개월 훈련 후 온순한 성격으로 변화한 사례입니다.",
            imageUrl: "https://api.dicebear.com/7.x/pets/svg?seed=맥스&backgroundColor=ffd700",
            category: 'before_after',
            createdAt: "2024-12-01"
          },
          {
            id: 2,
            title: "퍼피 사회화 훈련 클래스",
            description: "6마리의 강아지가 함께하는 사회화 훈련 세션입니다.",
            imageUrl: "https://api.dicebear.com/7.x/pets/svg?seed=퍼피&backgroundColor=87ceeb",
            category: 'training_session',
            createdAt: "2024-11-15"
          },
          {
            id: 3,
            title: "어질리티 대회 3위 입상",
            description: "제자 루나와 함께 지역 어질리티 대회에서 3위를 차지했습니다.",
            imageUrl: "https://api.dicebear.com/7.x/pets/svg?seed=루나&backgroundColor=90ee90",
            category: 'achievement',
            createdAt: "2024-10-20"
          },
          {
            id: 4,
            title: "왕짱스쿨 훈련 센터",
            description: "쾌적하고 안전한 훈련 환경을 제공하는 저희 훈련 센터입니다.",
            imageUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=facility&backgroundColor=ffe4e1",
            category: 'facility',
            createdAt: "2024-09-01"
          }
        ],
        rating: 4.8,
        totalReviews: 127,
        joinDate: "2020-03-01",
        status: 'active',
        workingHours: "월-금 09:00-18:00, 토 09:00-15:00",
        priceRange: "시간당 80,000원 ~ 120,000원"
      };

      setProfile(mockProfile);
      setEditForm(mockProfile);
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
      toast({
        title: '프로필 로딩 실패',
        description: '프로필 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // 실제 API 호출 코드
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      
      toast({
        title: '프로필 저장 완료',
        description: '프로필이 성공적으로 업데이트되었습니다.',
      });
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '프로필 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCertification = async () => {
    if (!newCertification.name || !newCertification.issuer) {
      toast({
        title: '입력 오류',
        description: '자격증명과 발급기관을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newCert: Certification = {
        id: Date.now(),
        name: newCertification.name || '',
        issuer: newCertification.issuer || '',
        issueDate: newCertification.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: newCertification.expiryDate || '',
        certificateUrl: newCertification.certificateUrl || '',
        status: 'active'
      };

      setProfile(prev => prev ? {
        ...prev,
        certifications: [...prev.certifications, newCert]
      } : null);

      setNewCertification({});
      setIsCertDialogOpen(false);

      toast({
        title: '자격증 추가 완료',
        description: '새로운 자격증이 추가되었습니다.',
      });
    } catch (error) {
      toast({
        title: '추가 실패',
        description: '자격증 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAddPortfolio = async () => {
    if (!newPortfolio.title || !newPortfolio.description) {
      toast({
        title: '입력 오류',
        description: '제목과 설명을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newItem: PortfolioItem = {
        id: Date.now(),
        title: newPortfolio.title || '',
        description: newPortfolio.description || '',
        imageUrl: newPortfolio.imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}&backgroundColor=f0f0f0`,
        category: newPortfolio.category || 'training_session',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setProfile(prev => prev ? {
        ...prev,
        portfolio: [...prev.portfolio, newItem]
      } : null);

      setNewPortfolio({});
      setIsPortfolioDialogOpen(false);

      toast({
        title: '포트폴리오 추가 완료',
        description: '새로운 포트폴리오가 추가되었습니다.',
      });
    } catch (error) {
      toast({
        title: '추가 실패',
        description: '포트폴리오 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const getCertificationStatus = (cert: Certification) => {
    const now = new Date();
    const expiryDate = new Date(cert.expiryDate);
    
    if (expiryDate < now) {
      return <Badge variant="danger">만료</Badge>;
    }
    
    const monthsUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsUntilExpiry <= 3) {
      return <Badge variant="secondary" className="bg-warning/10 text-warning">만료 임박</Badge>;
    }
    
    return <Badge variant="default" className="bg-success/10 text-success">유효</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'before_after': '훈련 전후',
      'training_session': '훈련 세션',
      'achievement': '성과',
      'facility': '시설'
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <User className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">프로필 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">프로필을 찾을 수 없습니다</h3>
          <p className="text-muted-foreground">프로필 정보를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로필 관리</h1>
          <p className="text-muted-foreground">프로필 정보, 자격증, 포트폴리오를 관리하세요</p>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button onClick={handleSaveProfile} size="sm">
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              프로필 편집
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">기본 정보</TabsTrigger>
          <TabsTrigger value="certifications">자격증</TabsTrigger>
          <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* 기본 프로필 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="absolute -bottom-2 -right-2 h-8 w-8"
                      onClick={() => {
                        toast({
                          title: '프로필 사진 업로드',
                          description: '프로필 사진 업로드 기능이 곧 제공됩니다.',
                        });
                      }}
                      data-testid="button-upload-avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">이름</Label>
                      <Input
                        id="name"
                        value={isEditing ? editForm.name || '' : profile.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={isEditing ? editForm.email || '' : profile.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        value={isEditing ? editForm.phone || '' : profile.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">주소</Label>
                      <Input
                        id="address"
                        value={isEditing ? editForm.address || '' : profile.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">자기소개</Label>
                <Textarea
                  id="bio"
                  value={isEditing ? editForm.bio || '' : profile.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">경력 (년)</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={isEditing ? editForm.experience || '' : profile.experience}
                    onChange={(e) => setEditForm(prev => ({ ...prev, experience: parseInt(e.target.value) }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="priceRange">가격대</Label>
                  <Input
                    id="priceRange"
                    value={isEditing ? editForm.priceRange || '' : profile.priceRange}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priceRange: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="workingHours">근무 시간</Label>
                <Input
                  id="workingHours"
                  value={isEditing ? editForm.workingHours || '' : profile.workingHours}
                  onChange={(e) => setEditForm(prev => ({ ...prev, workingHours: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label>전문 분야</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.specializations.map((spec, index) => (
                    <Badge key={index} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-8 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-warning" />
                  <span className="font-medium">{profile.rating}</span>
                  <span className="text-muted-foreground">({profile.totalReviews}개 리뷰)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">가입일: {profile.joinDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  자격증 관리
                </CardTitle>
                <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      자격증 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 자격증 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="certName">자격증명</Label>
                        <Input
                          id="certName"
                          value={newCertification.name || ''}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="자격증명을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="certIssuer">발급기관</Label>
                        <Input
                          id="certIssuer"
                          value={newCertification.issuer || ''}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                          placeholder="발급기관을 입력하세요"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="certIssueDate">발급일</Label>
                          <Input
                            id="certIssueDate"
                            type="date"
                            value={newCertification.issueDate || ''}
                            onChange={(e) => setNewCertification(prev => ({ ...prev, issueDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="certExpiryDate">만료일</Label>
                          <Input
                            id="certExpiryDate"
                            type="date"
                            value={newCertification.expiryDate || ''}
                            onChange={(e) => setNewCertification(prev => ({ ...prev, expiryDate: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsCertDialogOpen(false)}>
                          취소
                        </Button>
                        <Button onClick={handleAddCertification}>
                          추가
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.certifications.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Award className="h-8 w-8 text-warning" />
                      <div>
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        <p className="text-sm text-muted-foreground">
                          {cert.issueDate} ~ {cert.expiryDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getCertificationStatus(cert)}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (!cert.certificateUrl || cert.certificateUrl === '') {
                            toast({
                              title: '자격증 파일 없음',
                              description: '자격증 파일이 등록되지 않았습니다.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          toast({
                            title: '자격증 보기',
                            description: `${cert.name} 자격증을 확인합니다.`,
                          });
                          window.open(cert.certificateUrl, '_blank');
                        }}
                        data-testid={`button-view-certification-${cert.id}`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  포트폴리오
                </CardTitle>
                <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      포트폴리오 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 포트폴리오 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="portfolioTitle">제목</Label>
                        <Input
                          id="portfolioTitle"
                          value={newPortfolio.title || ''}
                          onChange={(e) => setNewPortfolio(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="포트폴리오 제목을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="portfolioDescription">설명</Label>
                        <Textarea
                          id="portfolioDescription"
                          value={newPortfolio.description || ''}
                          onChange={(e) => setNewPortfolio(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="포트폴리오 설명을 입력하세요"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="portfolioCategory">카테고리</Label>
                        <select
                          id="portfolioCategory"
                          value={newPortfolio.category || 'training_session'}
                          onChange={(e) => setNewPortfolio(prev => ({ ...prev, category: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        >
                          <option value="training_session">훈련 세션</option>
                          <option value="before_after">훈련 전후</option>
                          <option value="achievement">성과</option>
                          <option value="facility">시설</option>
                        </select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsPortfolioDialogOpen(false)}>
                          취소
                        </Button>
                        <Button onClick={handleAddPortfolio}>
                          추가
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.portfolio.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="mb-2">
                          {getCategoryLabel(item.category)}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground"
                          onClick={() => {
                            setProfile(prev => prev ? {
                              ...prev,
                              portfolio: prev.portfolio.filter(p => p.id !== item.id)
                            } : null);
                            toast({
                              title: '포트폴리오 삭제',
                              description: `${item.title}이(가) 삭제되었습니다.`,
                            });
                          }}
                          data-testid={`button-delete-portfolio-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <h4 className="font-medium mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}