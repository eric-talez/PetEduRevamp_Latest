import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Plus, Calendar, Book, Award, CheckCircle, AlertCircle, Heart } from 'lucide-react';

export default function MyPets() {
  const [selectedPet, setSelectedPet] = useState("tori");
  
  // Mock pets data
  const pets = [
    {
      id: "tori",
      name: "토리",
      breed: "포메라니안",
      age: "3세",
      gender: "여아",
      weight: "3.2kg",
      image: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      description: "활발하고 친근한 성격이에요. 새로운 사람들을 만나는 것을 좋아하지만, 큰 소리에 예민한 편입니다.",
      vaccinations: [
        { name: "종합백신", date: "2023.10.15", due: "2024.10.15" },
        { name: "광견병", date: "2023.11.02", due: "2024.11.02" },
        { name: "코로나장염", date: "2023.10.15", due: "2024.10.15" }
      ],
      trainings: [
        { name: "기본 훈련", progress: 100, status: "완료" },
        { name: "사회화 훈련", progress: 45, status: "진행 중" },
        { name: "트릭 훈련", progress: 0, status: "예정" }
      ],
      healthIssues: ["견과류 알레르기", "산책 시 다른 강아지를 보면 흥분함"],
      badges: ["기본훈련 마스터", "사교왕", "달리기 챔피언"]
    },
    {
      id: "mongi",
      name: "몽이",
      breed: "비숑 프리제",
      age: "1.5세",
      gender: "남아",
      weight: "4.5kg",
      image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      description: "호기심이 많고 활발한 성격입니다. 물건을 물어오는 것을 좋아하고, 다른 강아지와 놀기를 즐깁니다.",
      vaccinations: [
        { name: "종합백신", date: "2023.12.10", due: "2024.12.10" },
        { name: "광견병", date: "2023.12.10", due: "2024.12.10" },
        { name: "켄넬코프", date: "2023.12.10", due: "2024.06.10" }
      ],
      trainings: [
        { name: "기본 훈련", progress: 65, status: "진행 중" },
        { name: "어질리티 입문", progress: 30, status: "진행 중" }
      ],
      healthIssues: ["분리불안 초기 증상"],
      badges: ["새싹 훈련생", "친절한 친구"]
    }
  ];
  
  const selectedPetData = pets.find(pet => pet.id === selectedPet);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">내 반려견</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>내 반려견 목록</span>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {pets.map(pet => (
                  <div 
                    key={pet.id} 
                    className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${
                      selectedPet === pet.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedPet(pet.id)}
                  >
                    <Avatar 
                      src={pet.image} 
                      alt={pet.name}
                      size="md"
                      border
                      className="flex-shrink-0"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium">{pet.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{pet.breed}, {pet.age}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>다가오는 일정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {selectedPetData?.id === "tori" && (
                  <>
                    <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-sm">사회화 훈련 8주차</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">수요일 15:30</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-sm">동물병원 검진</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">다음주 금요일 14:00</div>
                      </div>
                    </div>
                  </>
                )}
                
                {selectedPetData?.id === "mongi" && (
                  <>
                    <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-sm">기본 훈련 12주차</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">오늘 17:00</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="bg-primary/20 text-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-sm">어질리티 훈련 6주차</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">내일 14:00</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                전체 일정 보기
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {selectedPetData && (
          <div className="w-full md:w-2/3">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span>{selectedPetData.name} 정보</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedPetData.breed}
                    </Badge>
                  </div>
                  <Button variant="outline" size="icon">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar 
                      src={selectedPetData.image} 
                      alt={selectedPetData.name}
                      className="w-32 h-32 rounded-full"
                      border
                    />
                    
                    <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">나이</div>
                        <div className="font-medium">{selectedPetData.age}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">성별</div>
                        <div className="font-medium">{selectedPetData.gender}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">체중</div>
                        <div className="font-medium">{selectedPetData.weight}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">중성화</div>
                        <div className="font-medium">완료</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">성격 및 특징</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedPetData.description}
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">건강 이슈</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPetData.healthIssues.map((issue, idx) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">획득한 배지</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPetData.badges.map((badge, idx) => (
                          <Badge key={idx} variant="accent" className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Tabs defaultValue="training" className="mt-6">
              <TabsList>
                <TabsTrigger value="training">
                  <Book className="w-4 h-4 mr-2" />
                  훈련 현황
                </TabsTrigger>
                <TabsTrigger value="health">
                  <Heart className="w-4 h-4 mr-2" />
                  건강 관리
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="training" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {selectedPetData.trainings.map((training, idx) => (
                        <div key={idx} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <h4 className="font-medium">{training.name}</h4>
                              {training.status === "완료" && (
                                <Badge variant="green" className="ml-2">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  완료
                                </Badge>
                              )}
                              {training.status === "진행 중" && (
                                <Badge variant="blue" className="ml-2">진행 중</Badge>
                              )}
                              {training.status === "예정" && (
                                <Badge variant="outline" className="ml-2">예정</Badge>
                              )}
                            </div>
                            
                            {training.status !== "예정" && (
                              <div className="text-sm">
                                진도율 <span className="font-medium">{training.progress}%</span>
                              </div>
                            )}
                          </div>
                          
                          {training.status !== "예정" && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${training.progress}%` }}
                              ></div>
                            </div>
                          )}
                          
                          {training.status === "예정" && (
                            <Button variant="outline" size="sm" className="mt-2">
                              강의 시작하기
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="health" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium mb-4">예방접종 기록</h3>
                    <div className="space-y-3">
                      {selectedPetData.vaccinations.map((vaccination, idx) => (
                        <div key={idx} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="font-medium">{vaccination.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              접종일: {vaccination.date}
                            </div>
                          </div>
                          <div>
                            <Badge variant="outline">
                              다음 접종: {vaccination.due}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        기록 추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
