import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Eye, Edit, Trash2, GraduationCap, MapPin, Star, Trophy, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { getCSRFToken } from "@/lib/csrf";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

export default function AdminTrainers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTrainer, setNewTrainer] = useState({
    name: "",
    email: "",
    phone: "",
    institute: "",
    certification: "",
    experience: "",
    specialties: ""
  });

  // 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 기관 목록과 훈련사 목록을 동시에 가져오기
        const [institutesResponse, trainersResponse] = await Promise.all([
          fetch('/api/institutes'),
          fetch('/api/trainers')
        ]);
        
        // 기관 데이터 처리
        const institutesData = await institutesResponse.json();
        if (Array.isArray(institutesData)) {
          setInstitutes(institutesData);
        } else if (institutesData && institutesData.success && Array.isArray(institutesData.data)) {
          setInstitutes(institutesData.data);
        } else {
          setInstitutes([]);
        }

        // 훈련사 데이터 처리
        const trainersData = await trainersResponse.json();
        console.log('훈련사 API 응답:', trainersData);
        if (Array.isArray(trainersData)) {
          setTrainers(trainersData);
        } else if (trainersData && trainersData.trainers && Array.isArray(trainersData.trainers)) {
          // API가 { trainers: [...], pagination: {...} } 형식으로 반환
          setTrainers(trainersData.trainers);
        } else if (trainersData && trainersData.success && Array.isArray(trainersData.data)) {
          setTrainers(trainersData.data);
        } else {
          setTrainers([]);
        }

      } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        setInstitutes([]);
        setTrainers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 훈련사 추가 함수
  const handleAddTrainer = async () => {
    if (!newTrainer.name || !newTrainer.email || !newTrainer.institute || !newTrainer.certification) {
      alert("필수 필드를 모두 입력해주세요.");
      return;
    }
    
    try {
      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/trainers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(newTrainer),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("훈련사가 성공적으로 등록되었습니다!");
        // 훈련사 목록 새로고침
        const trainersResponse = await fetch('/api/trainers');
        const trainersData = await trainersResponse.json();
        if (Array.isArray(trainersData)) {
          setTrainers(trainersData);
        } else if (trainersData && trainersData.trainers && Array.isArray(trainersData.trainers)) {
          setTrainers(trainersData.trainers);
        } else if (trainersData && trainersData.success && Array.isArray(trainersData.data)) {
          setTrainers(trainersData.data);
        }
      } else {
        throw new Error(result.error || '훈련사 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('훈련사 등록 오류:', error);
      alert(error.message || "훈련사 등록 중 오류가 발생했습니다.");
    }
    
    // 폼 초기화
    setNewTrainer({
      name: "",
      email: "",
      phone: "",
      institute: "",
      certification: "",
      experience: "",
      specialties: ""
    });
    setIsAddTrainerOpen(false);
  };

  // 필터링된 훈련사 목록
  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch = trainer.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         trainer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trainer.institute?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || trainer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="ml-1 text-sm font-medium">{rating}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">훈련사 관리</h1>
          <p className="text-muted-foreground">등록된 훈련사들을 관리합니다</p>
        </div>
        <Dialog open={isAddTrainerOpen} onOpenChange={setIsAddTrainerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 훈련사 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 훈련사 등록</DialogTitle>
              <DialogDescription>
                새로운 훈련사를 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-name" className="text-right">
                  이름 *
                </Label>
                <Input
                  id="trainer-name"
                  value={newTrainer.name}
                  onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                  className="col-span-3"
                  placeholder="김훈련사"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-email" className="text-right">
                  이메일 *
                </Label>
                <Input
                  id="trainer-email"
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="col-span-3"
                  placeholder="trainer@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-phone" className="text-right">
                  연락처
                </Label>
                <Input
                  id="trainer-phone"
                  value={newTrainer.phone}
                  onChange={(e) => setNewTrainer({ ...newTrainer, phone: e.target.value })}
                  className="col-span-3"
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-institute" className="text-right">
                  소속 기관 *
                </Label>
                <Select
                  value={newTrainer.institute}
                  onValueChange={(value) => setNewTrainer({ ...newTrainer, institute: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="소속 기관을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(institutes) && institutes.map((institute: any) => (
                      <SelectItem key={institute.id} value={institute.name}>
                        {institute.name}
                      </SelectItem>
                    ))}
                    {(!Array.isArray(institutes) || institutes.length === 0) && (
                      <SelectItem value="no-institutes" disabled>
                        등록된 기관이 없습니다
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-certification" className="text-right">
                  자격증 *
                </Label>
                <Input
                  id="trainer-certification"
                  value={newTrainer.certification}
                  onChange={(e) => setNewTrainer({ ...newTrainer, certification: e.target.value })}
                  className="col-span-3"
                  placeholder="국제반려견훈련사 1급"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-experience" className="text-right">
                  경력
                </Label>
                <Input
                  id="trainer-experience"
                  value={newTrainer.experience}
                  onChange={(e) => setNewTrainer({ ...newTrainer, experience: e.target.value })}
                  className="col-span-3"
                  placeholder="5년"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-specialties" className="text-right">
                  전문 분야
                </Label>
                <Textarea
                  id="trainer-specialties"
                  value={newTrainer.specialties}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialties: e.target.value })}
                  className="col-span-3"
                  placeholder="기본 순종, 문제행동 교정, 어질리티"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddTrainer}>
                훈련사 등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 {trainers.filter(t => t.status === 'active').length}명
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 교육생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainers.reduce((total, trainer) => total + trainer.studentsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 훈련사 담당
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(trainers.reduce((total, trainer) => total + trainer.rating, 0) / trainers.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              5점 만점 기준
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 경력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(trainers.reduce((total, trainer) => total + parseInt(trainer.experience), 0) / trainers.length)}년
            </div>
            <p className="text-xs text-muted-foreground">
              전체 평균
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 기반 관리 */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">훈련사 목록</TabsTrigger>
          <TabsTrigger value="performance">성과 순위</TabsTrigger>
          <TabsTrigger value="reviews">리뷰 및 평가</TabsTrigger>
        </TabsList>

        {/* 훈련사 목록 탭 */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>훈련사 목록</CardTitle>
            </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="훈련사명, 기관명, 전문분야로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 훈련사 테이블 */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>훈련사</div>
              <div>소속 기관</div>
              <div>자격증</div>
              <div>경력</div>
              <div>전문분야</div>
              <div>평점</div>
              <div>상태</div>
              <div>작업</div>
            </div>
            {isLoading ? (
              <PageSkeleton header={false} variant="list" count={5} className="p-4" />
            ) : filteredTrainers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">등록된 훈련사가 없습니다.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsAddTrainerOpen(true)}
                >
                  첫 번째 훈련사 등록하기
                </Button>
              </div>
            ) : filteredTrainers.map((trainer) => (
              <div key={trainer.id} className="grid grid-cols-8 gap-4 p-4 border-b last:border-b-0">
                <div>
                  <div className="font-medium">{trainer.name || '이름 없음'}</div>
                  <div className="text-sm text-muted-foreground">{trainer.email || '-'}</div>
                  <div className="text-sm text-muted-foreground">{trainer.phone || '-'}</div>
                </div>
                <div className="text-sm">{trainer.institute || '-'}</div>
                <div>
                  <div className="text-sm font-medium">{trainer.certification || '자격증 정보 없음'}</div>
                  <div className="text-xs text-muted-foreground">경력 {trainer.experience || '정보 없음'}</div>
                </div>
                <div className="text-center font-medium">{trainer.experience || '-'}</div>
                <div className="text-xs">
                  {trainer.specialties && Array.isArray(trainer.specialties) && trainer.specialties.length > 0 ? (
                    <>
                      {trainer.specialties.slice(0, 2).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="mr-1 mb-1 text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {trainer.specialties.length > 2 && (
                        <span className="text-muted-foreground">+{trainer.specialties.length - 2}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">전문분야 미설정</span>
                  )}
                </div>
                <div>{getRatingStars(trainer.rating || 0)}</div>
                <div>{getStatusBadge(trainer.status || 'active')}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      alert(`훈련사 상세 정보: ${trainer.name}\n이메일: ${trainer.email}\n전화: ${trainer.phone}\n기관: ${trainer.institute}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => {
                      const newName = prompt('훈련사 이름 수정:', trainer.name);
                      if (newName && newName !== trainer.name) {
                        alert(`훈련사 이름이 "${newName}"로 변경되었습니다.`);
                      }
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      if (confirm(`정말로 "${trainer.name}" 훈련사를 삭제하시겠습니까?`)) {
                        alert(`${trainer.name} 훈련사가 삭제되었습니다.`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* 성과 순위 탭 */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                훈련사 성과 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 성과 순위 테이블 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-7 gap-4 p-4 font-medium border-b bg-muted/50">
                    <div>순위</div>
                    <div>훈련사</div>
                    <div className="text-center">수강생 수</div>
                    <div className="text-center">완료 강좌</div>
                    <div className="text-center">평균 평점</div>
                    <div className="text-center">리뷰 수</div>
                    <div className="text-center">성과 점수</div>
                  </div>
                  {trainers
                    .map((trainer: any) => ({
                      ...trainer,
                      performanceScore: (trainer.studentsCount * 10) + (trainer.rating * 20) + ((trainer.reviewsCount || 0) * 5)
                    }))
                    .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
                    .slice(0, 10)
                    .map((trainer: any, index: number) => (
                      <div key={trainer.id} className="grid grid-cols-7 gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                          {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <Trophy className="h-5 w-5 text-amber-600" />}
                          <span className="font-bold">{index + 1}위</span>
                        </div>
                        <div>
                          <div className="font-medium">{trainer.name || '이름 없음'}</div>
                          <div className="text-xs text-muted-foreground">{trainer.institute || '-'}</div>
                        </div>
                        <div className="text-center font-medium">{trainer.studentsCount || 0}명</div>
                        <div className="text-center">{trainer.coursesCompleted || 0}개</div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {(trainer.rating || 0).toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">{trainer.reviewsCount || 0}개</div>
                        <div className="text-center">
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {trainer.performanceScore}점
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 리뷰 및 평가 탭 */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                훈련사 리뷰 및 평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 리뷰 요약 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ThumbsUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">긍정 리뷰</p>
                          <p className="text-xl font-bold text-green-600">85%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <ThumbsDown className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">개선 필요</p>
                          <p className="text-xl font-bold text-red-600">15%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Star className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">전체 평균</p>
                          <p className="text-xl font-bold text-yellow-600">
                            {trainers.length > 0 ? (trainers.reduce((t: number, trainer: any) => t + (trainer.rating || 0), 0) / trainers.length).toFixed(1) : '0.0'}점
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">총 리뷰 수</p>
                          <p className="text-xl font-bold text-blue-600">
                            {trainers.reduce((t: number, trainer: any) => t + (trainer.reviewsCount || 0), 0)}개
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 훈련사별 리뷰 목록 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-6 gap-4 p-4 font-medium border-b bg-muted/50">
                    <div>훈련사</div>
                    <div className="text-center">평점</div>
                    <div className="text-center">리뷰 수</div>
                    <div className="text-center">긍정</div>
                    <div className="text-center">부정</div>
                    <div>평가 상태</div>
                  </div>
                  {trainers.map((trainer: any) => {
                    const positiveRate = Math.round((trainer.rating || 0) / 5 * 100);
                    return (
                      <div key={trainer.id} className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30">
                        <div>
                          <div className="font-medium">{trainer.name || '이름 없음'}</div>
                          <div className="text-xs text-muted-foreground">{trainer.institute || '-'}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {(trainer.rating || 0).toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">{trainer.reviewsCount || 0}개</div>
                        <div className="text-center text-green-600">{positiveRate}%</div>
                        <div className="text-center text-red-600">{100 - positiveRate}%</div>
                        <div>
                          {(trainer.rating || 0) >= 4.5 ? (
                            <Badge className="bg-green-100 text-green-700">우수</Badge>
                          ) : (trainer.rating || 0) >= 3.5 ? (
                            <Badge className="bg-blue-100 text-blue-700">양호</Badge>
                          ) : (trainer.rating || 0) >= 2.5 ? (
                            <Badge className="bg-yellow-100 text-yellow-700">보통</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">개선 필요</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}