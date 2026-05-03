import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, BookOpen, Clock, User, Star, Eye, Play, ChevronRight, Package, Video, VideoOff } from 'lucide-react';
import CourseBannerImage from '@assets/image_1758608058600.png';

export default function Courses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // 실제 커리큘럼 데이터 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('🔥 강의 목록 조회 시작');
        const response = await fetch('/api/admin/curriculums');
        if (response.ok) {
          const data = await response.json();
          console.log('🔥 커리큘럼 데이터:', data);
          
          // 커리큘럼 데이터를 강의 형태로 변환 (발행된 것만)
          const transformedCourses = data.curriculums
            .filter(curriculum => {
              console.log('🔥 커리큘럼 필터링:', curriculum.title, curriculum.status);
              return curriculum.status === 'published';
            })
            .map(curriculum => ({
              id: curriculum.id,
              title: curriculum.title,
              description: curriculum.description,
              trainer: {
                name: curriculum.trainerName || '전문 훈련사',
                image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${curriculum.trainerName || 'trainer'}`
              },
              price: `${curriculum.price?.toLocaleString() || 0}원`,
              level: curriculum.difficulty === 'beginner' ? '초급' : 
                     curriculum.difficulty === 'intermediate' ? '중급' : '고급',
              category: curriculum.category || '기본 훈련',
              duration: Math.floor((curriculum.duration || 0) / 60),
              modules: curriculum.modules?.length || 0,
              badge: { 
                text: curriculum.difficulty === 'beginner' ? '초급' : 
                      curriculum.difficulty === 'intermediate' ? '중급' : '고급',
                variant: curriculum.difficulty === 'beginner' ? 'green' : 
                         curriculum.difficulty === 'intermediate' ? 'blue' : 'purple'
              },
              // 상세 정보를 위한 추가 데이터
              rawData: curriculum
            }));
          console.log('🔥 변환된 강의 목록:', transformedCourses);
          setCourses(transformedCourses);
        } else {
          console.error('🔥 커리큘럼 API 응답 실패:', response.status);
        }
      } catch (error) {
        console.error('🔥 강의 데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.trainer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const handleEnroll = () => {
    // 수강신청 로직
    alert('수강신청이 완료되었습니다!');
    setShowCourseModal(false);
  };

  const handlePlayVideo = (module) => {
    setSelectedModule(module);
    setShowVideoModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">강의 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">강의 찾기</h1>
          <p className="text-gray-600">전문 훈련사들의 검증된 강의로 반려견과 함께 성장하세요</p>
          {courses.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              총 {courses.length}개의 강의가 등록되어 있습니다.
            </div>
          )}
        </div>

        {/* 풍부한 콘텐츠 제공 배너 */}
        <section className="course-content-banner bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <img 
            src={CourseBannerImage} 
            alt="풍부한 콘텐츠 제공 - 테일즈 무제한 감상" 
            className="w-full h-auto max-h-[250px] object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={() => {
              // 서비스 안내 페이지로 이동
              window.location.href = '/services';
            }}
            data-testid="course-content-banner"
          />
        </section>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="강의명, 설명, 강사명으로 검색..."
              className="pl-10 pr-4 py-3 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Course Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id} 
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => handleCourseClick(course)}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={course.badge.variant} className="text-xs">
                      {course.badge.text}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                  
                  <div className="flex items-center mb-4">
                    <img 
                      src={course.trainer.image} 
                      alt={course.trainer.name}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <span className="text-sm text-gray-700">{course.trainer.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}시간</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.modules}강</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">{course.price}</span>
                    <button 
                      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(course);
                      }}
                    >
                      자세히 보기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 강의가 없습니다</h3>
            <p className="text-gray-500">관리자가 커리큘럼을 발행하면 여기에 표시됩니다.</p>
          </div>
        )}

        {filteredCourses.length === 0 && courses.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
            <p className="text-gray-400">다른 검색어를 시도해보세요.</p>
          </div>
        )}
      </div>

      {/* 커리큘럼 상세 정보 모달 */}
      <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-2">
              {selectedCourse?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* 강의 기본 정보 */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedCourse.trainer.image} 
                      alt={selectedCourse.trainer.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCourse.trainer.name}</h3>
                      <p className="text-gray-600">전문 훈련사</p>
                    </div>
                  </div>
                  <Badge variant={selectedCourse.badge.variant} className="text-sm">
                    {selectedCourse.badge.text}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">{selectedCourse.duration}시간</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">{selectedCourse.modules}개 강의</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{selectedCourse.level}</span>
                  </div>
                </div>
              </div>

              {/* 강의 설명 */}
              <div>
                <h4 className="text-lg font-semibold mb-3">강의 소개</h4>
                <p className="text-gray-700 leading-relaxed">{selectedCourse.description}</p>
              </div>

              {/* 커리큘럼 모듈 */}
              {selectedCourse.rawData?.modules && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">커리큘럼</h4>
                  <div className="space-y-3">
                    {selectedCourse.rawData.modules.map((module, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 mb-1">{module.title}</h5>
                            {module.description && (
                              <p className="text-gray-600 text-sm mb-2">{module.description}</p>
                            )}
                            
                            {/* 시간 및 가격 정보 */}
                            <div className="flex items-center gap-4 mb-3">
                              {module.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-500">{module.duration}분</span>
                                </div>
                              )}
                              {module.price !== undefined && (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500">
                                    {module.isFree ? '무료' : `${module.price?.toLocaleString()}원`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 준비물 정보 */}
                            {module.materials && module.materials.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">준비물</span>
                                </div>
                                <div className="flex flex-wrap gap-1 ml-6">
                                  {module.materials.map((material, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {material}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 영상 정보 */}
                            <div className="mt-3">
                              {module.videoUrl || module.attachments?.some(att => att.type === 'video') ? (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                  <Video className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-800">영상 강의 준비됨</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="ml-auto"
                                    onClick={() => handlePlayVideo(module)}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    재생
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                                  <VideoOff className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">영상 강의 준비 중</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 수강 신청 영역 */}
              <div className="bg-white border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedCourse.price}</p>
                    <p className="text-gray-600 text-sm">평생 수강 가능</p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCourseModal(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      onClick={handleEnroll}
                      className="bg-primary hover:bg-primary/90"
                    >
                      수강 신청하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 영상 재생 모달 */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedModule?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedModule && (
            <div className="space-y-4">
              {/* 영상 플레이어 */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                {selectedModule.videoUrl ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={selectedModule.videoUrl}
                  >
                    브라우저에서 비디오를 지원하지 않습니다.
                  </video>
                ) : selectedModule.attachments?.some(att => att.type === 'video') ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={selectedModule.attachments.find(att => att.type === 'video')?.url}
                  >
                    브라우저에서 비디오를 지원하지 않습니다.
                  </video>
                ) : (
                  <div className="text-center text-white">
                    <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">영상 준비 중</p>
                    <p className="text-sm opacity-75">곧 업로드될 예정입니다.</p>
                  </div>
                )}
              </div>

              {/* 모듈 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedModule.title}</h4>
                {selectedModule.description && (
                  <p className="text-gray-600 text-sm mb-3">{selectedModule.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {selectedModule.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{selectedModule.duration}분</span>
                    </div>
                  )}
                  {selectedModule.price !== undefined && (
                    <div className="flex items-center gap-1">
                      <span>{selectedModule.isFree ? '무료' : `${selectedModule.price?.toLocaleString()}원`}</span>
                    </div>
                  )}
                </div>

                {/* 준비물 */}
                {selectedModule.materials && selectedModule.materials.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-700">준비물</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedModule.materials.map((material, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowVideoModal(false)}
                  variant="outline"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}