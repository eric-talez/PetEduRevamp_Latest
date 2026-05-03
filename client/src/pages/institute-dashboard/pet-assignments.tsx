import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../SimpleApp';
import { 
  Search, 
  Users, 
  PawPrint, 
  ChevronRight, 
  UserPlus, 
  Check, 
  X, 
  ChevronDown,
  Filter,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// 회원(반려인) 타입 정의
interface PetOwner {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  pets: Pet[];
  phone?: string;
  registrationDate: string;
}

// 반려견 타입 정의
interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  image?: string;
  trainerId?: number;
  assignedTrainerName?: string;
  assignmentDate?: string;
  notebookEnabled: boolean;
}

// 훈련사 타입 정의
interface Trainer {
  id: number;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  position: string;
  specialties: string[];
  status: 'active' | 'pending' | 'inactive';
  verified: boolean;
  studentCount: number;
  rating: number;
}

export default function PetAssignmentsPage() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, userRole } = useAuth();
  const { toast } = useToast();

  // 인증되지 않은 사용자 또는 기관 관리자가 아닌 사용자 리디렉션
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'institute-admin') {
      toast({
        title: "접근 권한이 없습니다",
        description: "기관 관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAuthenticated, userRole, navigate, toast]);

  // 데모 데이터
  const [petOwners, setPetOwners] = useState<PetOwner[]>([
    {
      id: 1,
      username: "hong_gildong",
      name: "홍길동",
      email: "hong@example.com",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      phone: "010-1234-5678",
      registrationDate: "2023-01-15",
      pets: [
        {
          id: "pet1",
          name: "몽이",
          breed: "골든리트리버",
          age: 2,
          image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          trainerId: 1,
          assignedTrainerName: "김훈련",
          assignmentDate: "2023-03-10",
          notebookEnabled: true
        },
        {
          id: "pet2",
          name: "해피",
          breed: "비숑프리제",
          age: 1,
          image: "https://images.unsplash.com/photo-1626678206967-c38e55344af4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          notebookEnabled: false
        }
      ]
    },
    {
      id: 2,
      username: "kim_trainer",
      name: "김철수",
      email: "kim@example.com",
      phone: "010-2345-6789",
      registrationDate: "2023-02-20",
      pets: [
        {
          id: "pet3",
          name: "초코",
          breed: "푸들",
          age: 3,
          image: "https://images.unsplash.com/photo-1594149452924-4c3958c6320e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          trainerId: 2,
          assignedTrainerName: "박민첩",
          assignmentDate: "2023-04-15",
          notebookEnabled: true
        }
      ]
    },
    {
      id: 3,
      username: "park_somi",
      name: "박소미",
      email: "park@example.com",
      avatar: "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      phone: "010-3456-7890",
      registrationDate: "2023-03-05",
      pets: [
        {
          id: "pet4",
          name: "콩이",
          breed: "시츄",
          age: 4,
          image: "https://images.unsplash.com/photo-1588269965622-459cab25ecba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          notebookEnabled: false
        },
        {
          id: "pet5",
          name: "루시",
          breed: "말티즈",
          age: 2,
          image: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          notebookEnabled: false
        }
      ]
    }
  ]);

  const [trainers, setTrainers] = useState<Trainer[]>([
    {
      id: 1,
      name: "김훈련",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.kim@example.com",
      phone: "010-1234-5678",
      position: "수석 트레이너",
      specialties: ["기본 훈련", "공격성 교정", "어질리티"],
      status: "active",
      verified: true,
      studentCount: 15,
      rating: 4.9
    },
    {
      id: 2,
      name: "박민첩",
      avatar: "https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.park@example.com",
      phone: "010-2345-6789",
      position: "어질리티 전문 트레이너",
      specialties: ["어질리티", "프리스비", "스포츠 독"],
      status: "active",
      verified: true,
      studentCount: 12,
      rating: 4.7
    },
    {
      id: 3,
      name: "이사회",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.lee@example.com",
      phone: "010-3456-7890",
      position: "행동교정 전문가",
      specialties: ["문제행동 교정", "사회화 훈련", "심리 상담"],
      status: "active",
      verified: true,
      studentCount: 8,
      rating: 4.8
    }
  ]);

  // 상태 관리
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState<boolean>(false);

  // 회원 검색 처리
  const filteredPetOwners = petOwners.filter(owner => {
    const matchesSearch = searchQuery === '' || 
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (filterAssigned === 'all') return matchesSearch;
    if (filterAssigned === 'assigned') {
      return matchesSearch && owner.pets.some(pet => pet.trainerId !== undefined);
    }
    if (filterAssigned === 'unassigned') {
      return matchesSearch && owner.pets.some(pet => pet.trainerId === undefined);
    }
    
    return matchesSearch;
  });

  // 모든 반려견 목록
  const allPets = petOwners.flatMap(owner => owner.pets.map(pet => ({
    ...pet,
    ownerName: owner.name,
    ownerUsername: owner.username
  })));

  // 필터링된 반려견 목록
  const filteredPets = allPets.filter(pet => {
    if (filterAssigned === 'all') return true;
    if (filterAssigned === 'assigned') return pet.trainerId !== undefined;
    if (filterAssigned === 'unassigned') return pet.trainerId === undefined;
    return true;
  });

  // 매칭 다이얼로그 열기
  const openAssignmentDialog = (pet: Pet) => {
    setSelectedPet(pet);
    setSelectedTrainer(null);
    setIsAssignmentDialogOpen(true);
  };

  // 훈련사 선택
  const selectTrainer = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
  };

  // 훈련사 매칭 처리
  const assignTrainer = () => {
    if (!selectedPet || !selectedTrainer) {
      toast({
        title: "매칭 실패",
        description: "반려견과 훈련사를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 반려견에 훈련사 매칭
    const updatedPetOwners = petOwners.map(owner => {
      const updatedPets = owner.pets.map(pet => {
        if (pet.id === selectedPet.id) {
          return {
            ...pet,
            trainerId: selectedTrainer.id,
            assignedTrainerName: selectedTrainer.name,
            assignmentDate: new Date().toISOString().split('T')[0],
            notebookEnabled: true
          };
        }
        return pet;
      });

      return {
        ...owner,
        pets: updatedPets
      };
    });

    setPetOwners(updatedPetOwners);
    setIsAssignmentDialogOpen(false);

    toast({
      title: "훈련사 매칭 완료",
      description: `${selectedPet.name}에게 ${selectedTrainer.name} 훈련사가 매칭되었습니다.`,
    });
  };

  // 훈련사 매칭 해제
  const unassignTrainer = (petId: string) => {
    // 반려견의 훈련사 매칭 해제
    const updatedPetOwners = petOwners.map(owner => {
      const updatedPets = owner.pets.map(pet => {
        if (pet.id === petId) {
          return {
            ...pet,
            trainerId: undefined,
            assignedTrainerName: undefined,
            assignmentDate: undefined,
            notebookEnabled: false
          };
        }
        return pet;
      });

      return {
        ...owner,
        pets: updatedPets
      };
    });

    setPetOwners(updatedPetOwners);

    toast({
      title: "훈련사 매칭 해제",
      description: "반려견과 훈련사의 매칭이 해제되었습니다.",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/institute/dashboard" className="hover:text-primary">기관 대시보드</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-700 font-medium">알림장 관리</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">반려견-훈련사 매칭 관리</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>알림장 시스템</CardTitle>
          <CardDescription>
            반려견과 훈련사를 매칭하여 알림장 기능을 활성화합니다. 매칭이 완료된 반려견의 보호자와 훈련사는 알림장을 통해 소통할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 rounded-md p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <PawPrint className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-primary dark:text-primary">알림장 사용 방법</h3>
                <div className="mt-2 text-sm text-primary dark:text-primary">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>회원을 검색하여 반려견 확인</li>
                    <li>반려견에게 적합한 훈련사 매칭</li>
                    <li>매칭 완료 시 알림장 자동 활성화</li>
                    <li>보호자와 훈련사는 매칭된 반려견의 훈련 일지, 식사, 건강 상태 등을 기록하고 확인 가능</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="회원 이름, 아이디 또는 이메일 검색..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={filterAssigned}
                onValueChange={setFilterAssigned}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="모든 반려견" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 반려견</SelectItem>
                  <SelectItem value="assigned">훈련사 매칭 완료</SelectItem>
                  <SelectItem value="unassigned">훈련사 미매칭</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>반려견</TableHead>
                  <TableHead>보호자</TableHead>
                  <TableHead>품종</TableHead>
                  <TableHead>나이</TableHead>
                  <TableHead>매칭된 훈련사</TableHead>
                  <TableHead>알림장 상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      검색 결과가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPets.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={pet.image}
                            fallback={pet.name[0]}
                            alt={pet.name}
                          />
                          <div>
                            <div className="font-medium">{pet.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{pet.ownerName}</TableCell>
                      <TableCell>{pet.breed}</TableCell>
                      <TableCell>{pet.age}세</TableCell>
                      <TableCell>
                        {pet.assignedTrainerName ? (
                          <div className="flex items-center">
                            <span className="font-medium">{pet.assignedTrainerName}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({pet.assignmentDate})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">미지정</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pet.notebookEnabled ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <Check className="w-3.5 h-3.5 mr-1" />
                            활성화
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            <X className="w-3.5 h-3.5 mr-1" />
                            비활성화
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {pet.trainerId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unassignTrainer(pet.id)}
                              className="h-8 text-xs text-destructive hover:text-destructive/90"
                            >
                              매칭 해제
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignmentDialog(pet)}
                              className="h-8 text-xs"
                            >
                              훈련사 매칭
                            </Button>
                          )}
                          
                          {pet.notebookEnabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/notebook/${pet.id}`)}
                              className="h-8 text-xs"
                            >
                              알림장 보기
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 훈련사 매칭 다이얼로그 */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>훈련사 매칭</DialogTitle>
            <DialogDescription>
              {selectedPet && (
                <div className="mt-2">
                  <span className="font-medium">{selectedPet.name}</span>에게 매칭할 훈련사를 선택하세요.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            {selectedPet && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <Avatar
                  src={selectedPet.image}
                  fallback={selectedPet.name[0]}
                  alt={selectedPet.name}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">{selectedPet.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedPet.breed}, {selectedPet.age}세
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label>훈련사 선택</Label>
              {trainers.map((trainer) => (
                <div
                  key={trainer.id}
                  className={`flex items-center p-3 border rounded-md cursor-pointer ${
                    selectedTrainer?.id === trainer.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => selectTrainer(trainer)}
                >
                  <Avatar
                    src={trainer.avatar}
                    fallback={trainer.name[0]}
                    alt={trainer.name}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{trainer.name}</div>
                    <div className="text-sm text-gray-500">
                      {trainer.position}
                    </div>
                  </div>
                  {selectedTrainer?.id === trainer.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>취소</Button>
            <Button onClick={assignTrainer} disabled={!selectedTrainer}>
              매칭하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}