import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  Clock,
  Star,
  Eye,
  Save,
  X,
  Building,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Settings,
  Edit2
} from 'lucide-react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { NaverMapView } from '@/components/NaverMapView';
import { LocationDetailModal } from '@/components/LocationDetailModal';
import LocationServiceBannerImage from '@assets/image_1758608093240.png';

interface LocationItem {
  id: number;
  name: string;
  type: 'training' | 'grooming' | 'hospital' | 'hotel' | 'daycare' | 'park';
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  distance: number;
  operatingHours: {
    open: string;
    close: string;
  };
  services: string[];
  priceRange: string;
  isPartner: boolean;
  description: string;
  image: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
  gallery?: string[];
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  facilities?: any;
  certifications?: string[];
  specialPrograms?: string[];
  philosophy?: string;
  slogan?: string;
}

interface Location {
  id: number;
  name: string;
  type: string;
  address: string;
  phone: string;
  description: string;
  services: string[];
  priceRange: string;
  operatingHours: { open: string; close: string };
  isPartner: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  image?: string;
}

export default function LocationFinder() {
  const { userRole } = useGlobalAuth();
  const [locations, setLocations] = useState<LocationItem[]>([
    {
      id: 1,
      name: '서울 펫 트레이닝 센터',
      type: 'training',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-123-4567',
      rating: 4.8,
      reviewCount: 156,
      distance: 0.8,
      operatingHours: { open: '09:00', close: '19:00' },
      services: ['기본 순종 훈련', '행동 교정', '사회화 훈련'],
      priceRange: '50,000원 - 150,000원',
      isPartner: true,
      description: '전문 반려견 훈련 및 행동 교정 전문 시설입니다.',
      image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-06-20'
    },
    {
      id: 2,
      name: '프리미엄 펫 그루밍',
      type: 'grooming',
      address: '서울시 마포구 연남동 123-45',
      phone: '02-567-8901',
      rating: 4.6,
      reviewCount: 178,
      distance: 3.1,
      operatingHours: { open: '09:30', close: '20:00' },
      services: ['기본 미용', '스타일링', '스파', '네일 케어'],
      priceRange: '25,000원 - 80,000원',
      isPartner: true,
      description: '전문 그루머가 제공하는 프리미엄 미용 서비스입니다.',
      image: '/attached_assets/image_1746582251297.png',
      status: 'active',
      createdAt: '2024-02-10',
      updatedAt: '2024-06-18'
    },
    {
      id: 3,
      name: '왕짱 스쿨 (WANGZZANG SCHOOL)',
      type: 'training',
      address: '경북 구미시 구평동 661',
      phone: '010-4765-1909',
      rating: 4.9,
      reviewCount: 89,
      distance: 180.5,
      operatingHours: { open: '09:00', close: '18:00' },
      services: [
        '국가자격증 오비디언스 훈련',
        '정서안정 및 동물교감 교육',
        '퍼피 사회화 교육',
        '문제행동 교정 훈련',
        '보호자 맞춤 컨설팅',
        '수제간식 교육'
      ],
      priceRange: '70,000원 - 150,000원',
      isPartner: true,
      description: '반려견 훈련 전문가 강동훈이 운영하는 국가자격증 기반 전문 훈련소입니다. 제1회 반려동물행동지도사 국가자격증 보유, 한국애견연맹 사회공헌위원회 위원, 경기대학교 대체의학대학원 동물매개자연치유전공 석사 졸업. 단순한 훈련이 아닌 반려견과 보호자가 진짜로 함께 살아가는 법을 가르칩니다.',
      image: '@assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png',
      status: 'active',
      createdAt: '2024-07-05',
      updatedAt: '2024-07-05',
      gallery: [
        '@assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png',
        '@assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png'
      ],
      amenities: [
        '구평점 반려견스쿨',
        '석적점 독트레이닝 센터',
        '전문훈련사 운영',
        '1:1 트레이닝 훈련',
        '반려견교육 상담',
        '반려견훈련 자격 교육',
        '미용 및 수제간식'
      ],
      coordinates: {
        lat: 36.1184,
        lng: 128.3446
      },
      facilities: {
        구평점: {
          address: '경북 구미시 구평동 661 (왕짱 스쿨)',
          services: ['회원제 스쿨 반려견 행동수정', '다양한 훈련 프로그램제공', '제철 산책트레이닝', '퍼피트레이닝 사회화 교육', '미용 수제간식'],
          hours: '#오전 8시 - 오후7시'
        },
        석적점: {
          address: '경북 칠곡군 석적읍 북중리 10길 17 (왕짱애견유치원)',
          services: ['반려견교육 상담', '반려견훈련 자격 교육', '반려견교육 상담', '장기 위탁', '1:1 트레이닝 훈련'],
          hours: '#전문훈련사 운영'
        }
      },
      certifications: [
        '제1회 반려동물행동지도사 국가자격증 보유',
        '한국애견연맹 사회공헌위원회 위원',
        '경기대학교 대체의학대학원 동물매개자연치유전공 석사',
        '펫헬스케어아카데미 협회 공동대표'
      ],
      specialPrograms: [
        '정신건강 및 특수교육 대상자를 위한 교감 활동',
        '구미시 2025 미래교육지구 마을학교 반려꿈터 운영',
        '경북소방본부, 교육기관 대상 강의 및 상담',
        '느린학습자, 정신장애인, 위기청소년 대상 훈련'
      ],
      philosophy: '우리 아이를 이해하는 법, 국가자격 전문가와 함께 하세요',
      slogan: '반려견 훈련, 이제 고민하지마세요!'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocationItem, setEditingLocation] = useState<LocationItem | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: 'training' as const,
    address: '',
    phone: '',
    description: '',
    services: [] as string[],
    priceRange: '',
    operatingHours: { open: '09:00', close: '18:00' },
    isPartner: false,
    image: ''
  });

  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [managementSearchTerm, setManagementSearchTerm] = useState('');
  const [managementFilterType, setManagementFilterType] = useState('all');
  const [managedLocations, setManagedLocations] = useState<Location[]>([]);
  const [editingLocationInner, setEditingLocationInner] = useState<Location | null>(null);
  const [newLocationData, setNewLocationData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    description: '',
    services: [] as string[],
    priceRange: '',
    operatingHours: { open: '09:00', close: '18:00' },
    isPartner: true
  });

  const [uploadedImages, setUploadedImages] = useState<{
    file: File;
    preview: string;
    uploaded?: boolean;
    url?: string;
  }[]>([]);

  console.log('LocationFinder 컴포넌트 렌더링됨');

  // API 검색 함수
  const performApiSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log(`[DEBUG] API Request: GET /api/locations/search?keyword=${encodeURIComponent(query)}`);
      const response = await fetch(`/api/locations/search?keyword=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] API Response: 200 OK');
        console.log('[DEBUG] Search results:', data);
        setSearchResults(data.locations || []);
      } else {
        console.error('[DEBUG] API Error:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('[DEBUG] Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 변경시 API 호출
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performApiSearch(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 로컬 필터링과 API 검색 결과 결합
  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || location.type === filterType;
    const matchesStatus = filterStatus === 'all' || location.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // API 검색 결과를 LocationItem 형태로 변환
  const searchResultsAsLocations = searchResults
    .map(result => ({
      id: result.id + 1000, // ID 충돌 방지
      name: result.name,
      type: result.type === 'training-center' ? 'training' as const : 
            result.type === 'veterinary' ? 'hospital' as const :
            result.type === 'trainer' ? 'training' as const :
            'training' as const,
      address: result.address || '주소 정보 없음',
      phone: result.phone || '연락처 정보 없음',
      rating: result.rating || 4.5,
      reviewCount: result.reviewCount || 0,
      distance: 0,
      operatingHours: { open: '09:00', close: '18:00' },
      services: result.services || [],
      priceRange: '상담 후 결정',
      isPartner: true,
      description: result.description || '',
      image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

  // 최종 표시할 위치 목록 (로컬 + API 검색결과)
  const displayLocations = searchTerm.trim() 
    ? [...searchResultsAsLocations, ...filteredLocations]
    : filteredLocations;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return '🎓';
      case 'grooming': return '✂️';
      case 'hospital': return '🏥';
      case 'hotel': return '🏨';
      case 'daycare': return '💖';
      case 'park': return '🌳';
      default: return '📍';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'training': return '훈련소';
      case 'grooming': return '미용실';
      case 'hospital': return '동물병원';
      case 'hotel': return '펜션/호텔';
      case 'daycare': return '위탁관리';
      case 'park': return '놀이공원';
      default: return '기타';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />활성</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />대기</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><X className="h-3 w-3 mr-1" />비활성</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  const handleLocationClick = (location: LocationItem) => {
    console.log('위치 클릭:', location.name);
    setSelectedLocation(location);
    setShowDetailModal(true);
  };

  const handleAddLocation = () => {
    const id = Math.max(...locations.map(l => l.id)) + 1;
    const location: LocationItem = {
      ...newLocation,
      id,
      rating: 0,
      reviewCount: 0,
      distance: 0,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setLocations([...locations, location]);
    setIsAddModalOpen(false);
    setNewLocation({
      name: '',
      type: 'training',
      address: '',
      phone: '',
      description: '',
      services: [],
      priceRange: '',
      operatingHours: { open: '09:00', close: '18:00' },
      isPartner: false,
      image: ''
    });

    console.log('새 위치 등록:', location);
  };

  const handleEditLocationItem = (location: LocationItem) => {
    setEditingLocation(location);
  };

  const handleUpdateLocation = async () => {
    if (!editingLocationItem) return;

    try {
      // 새로운 이미지가 업로드된 경우 처리
      let updatedImageUrl = editingLocationItem.image;
      
      if (uploadedImages.length > 0) {
        toast({
          title: "이미지 업로드 중",
          description: "이미지를 업로드하고 있습니다. 잠시만 기다려주세요.",
        });
        
        const imageUrls = await uploadImages();
        if (imageUrls.length > 0) {
          updatedImageUrl = imageUrls[0]; // 첫 번째 이미지를 메인 이미지로 설정
        }
      }

      const updatedLocation = {
        ...editingLocationItem,
        image: updatedImageUrl,
        updatedAt: new Date().toISOString().split('T')[0]
      };

      // 로컬 상태 업데이트
      setLocations(locations.map(loc => 
        loc.id === editingLocationItem.id ? updatedLocation : loc
      ));

      // 서버에 업데이트 요청 (필요한 경우)
      try {
        await fetch(`/api/admin/locations/${editingLocationItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updatedLocation,
            images: uploadedImages.length > 0 ? await uploadImages() : [updatedLocation.image]
          })
        });
      } catch (error) {
        console.warn('서버 업데이트 실패, 로컬에서만 업데이트됨:', error);
      }

      toast({
        title: "업체 정보 수정 완료",
        description: "업체 정보가 성공적으로 수정되었습니다.",
      });

      // 업로드된 이미지 정리
      uploadedImages.forEach(imageData => {
        URL.revokeObjectURL(imageData.preview);
      });
      setUploadedImages([]);
      setEditingLocation(null);

      console.log('위치 정보 업데이트:', updatedLocation);
    } catch (error) {
      console.error('업체 정보 수정 오류:', error);
      toast({
        title: "수정 실패",
        description: "업체 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLocation = (id: number) => {
    if (confirm('정말로 이 위치를 삭제하시겠습니까?')) {
      setLocations(locations.filter(loc => loc.id !== id));
      console.log('위치 삭제:', id);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    setLocations(locations.map(loc => 
      loc.id === id 
        ? { ...loc, status: status as 'active' | 'pending' | 'inactive', updatedAt: new Date().toISOString().split('T')[0] }
        : loc
    ));
    console.log('위치 상태 변경:', id, status);
  };

  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedImages.length + files.length > 7) {
      toast({
        title: "업로드 제한",
        description: "최대 7개의 이미지만 업로드할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }

    const newImages = files.map(file => {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기 오류",
          description: `${file.name}이 너무 큽니다. 5MB 이하의 파일을 선택해주세요.`,
          variant: "destructive"
        });
        return null;
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        toast({
          title: "파일 형식 오류",
          description: `${file.name}은 이미지 파일이 아닙니다.`,
          variant: "destructive"
        });
        return null;
      }

      return {
        file,
        preview: URL.createObjectURL(file),
        uploaded: false
      };
    }).filter(Boolean) as {
      file: File;
      preview: string;
      uploaded: boolean;
    }[];

    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      // 미리보기 URL 정리
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadPromises = uploadedImages.map(async (imageData) => {
      if (imageData.uploaded && imageData.url) {
        return imageData.url;
      }

      const formData = new FormData();
      formData.append('file', imageData.file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          return result.url;
        } else {
          throw new Error('업로드 실패');
        }
      } catch (error) {
        console.error('이미지 업로드 오류:', error);
        toast({
          title: "이미지 업로드 실패",
          description: `${imageData.file.name} 업로드에 실패했습니다.`,
          variant: "destructive"
        });
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(Boolean) as string[];
  };

  const handleAdminLocationSave = async () => {
    try {
      // 필수 필드 검증
      if (!newLocationData.name || !newLocationData.type || !newLocationData.address) {
        toast({
          title: "입력 오류",
          description: "업체명, 유형, 주소는 필수 항목입니다.",
          variant: "destructive"
        });
        return;
      }

      // 이미지 업로드 처리
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        toast({
          title: "이미지 업로드 중",
          description: "이미지를 업로드하고 있습니다. 잠시만 기다려주세요.",
        });
        
        imageUrls = await uploadImages();
      }

      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newLocationData,
          images: imageUrls
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newLocation = result.location;

        // Add to managed locations
        setManagedLocations(prev => [...prev, newLocation]);

        // Add to main locations list
        setLocations(prev => [...prev, {
          ...newLocation,
          rating: newLocation.rating || 0,
          reviewCount: newLocation.reviewCount || 0,
          distance: newLocation.distance || 0
        }]);

        toast({
          title: "업체 등록 완료",
          description: "새 업체가 성공적으로 등록되었습니다.",
        });

        // Reset form and close dialog
        setNewLocationData({
          name: '',
          type: '',
          address: '',
          phone: '',
          description: '',
          services: [],
          priceRange: '',
          operatingHours: { open: '09:00', close: '18:00' },
          isPartner: true
        });
        
        // 업로드된 이미지 정리
        uploadedImages.forEach(imageData => {
          URL.revokeObjectURL(imageData.preview);
        });
        setUploadedImages([]);
        
        setShowAdminDialog(false);
      } else {
        const errorData = await response.json().catch(() => ({ error: '서버 응답 파싱 실패' }));
        throw new Error(errorData.error || errorData.message || '업체 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('업체 등록 오류:', error);
      toast({
        title: "등록 실패",
        description: error instanceof Error ? error.message : "업체 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const loadManagedLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations');
      if (response.ok) {
        const result = await response.json();
        setManagedLocations(result.locations || []);
      }
    } catch (error) {
      console.error('업체 목록 로딩 오류:', error);
    }
  };

  const getFilteredManagementLocations = () => {
    let filtered = managedLocations;

    if (managementSearchTerm) {
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(managementSearchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(managementSearchTerm.toLowerCase())
      );
    }

    if (managementFilterType !== 'all') {
      filtered = filtered.filter(location => location.type === managementFilterType);
    }

    return filtered;
  };

  const handleEditLocationInner = (location: Location) => {
    setEditingLocationInner(location);
    // 편집 모달을 여기서 구현하거나 별도 상태로 관리
  };

  const handleDeleteLocationInner = async (locationId: number) => {
    if (!confirm('정말로 이 업체를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setManagedLocations(prev => prev.filter(loc => loc.id !== locationId));
        setLocations(prev => prev.filter(loc => loc.id !== locationId));

        toast({
          title: "업체 삭제 완료",
          description: "업체가 성공적으로 삭제되었습니다.",
        });
      }
    } catch (error) {
      console.error('업체 삭제 오류:', error);
      toast({
        title: "삭제 실패",
        description: "업체 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleToggleLocationStatus = async (locationId: number) => {
    try {
      const location = managedLocations.find(loc => loc.id === locationId);
      if (!location) return;

      const newStatus = location.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`/api/admin/locations/${locationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setManagedLocations(prev =>
          prev.map(loc =>
            loc.id === locationId ? { ...loc, status: newStatus } : loc
          )
        );

        toast({
          title: "상태 변경 완료",
          description: `업체가 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`,
        });
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast({
        title: "상태 변경 실패",
        description: "상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // Load managed locations when management dialog opens
  useEffect(() => {
    if (showManagementDialog) {
      loadManagedLocations();
    }
  }, [showManagementDialog]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">위치 찾기</h1>
          <p className="text-gray-600 dark:text-gray-400">내 주변의 반려견 관련 시설을 찾아보세요</p>
        </div>

        {/* 관리자용 업체 등록 버튼 */}
        {userRole === 'admin' && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAdminDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                업체 등록
              </Button>
              <Button 
                onClick={() => setShowManagementDialog(true)}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                업체 관리
              </Button>
            </div>
          )}
      </div>

      {/* 위치 찾기 서비스 홍보 배너 */}
      <section className="location-service-banner bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <img 
          src={LocationServiceBannerImage} 
          alt="위치 찾기 서비스 - 반려동물의 위치를 쉽게 확인하세요" 
          className="w-full h-auto max-h-[250px] object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => {
            // 지도 뷰나 특별 기능으로 이동
            const mapSection = document.getElementById('map-container');
            if (mapSection) {
              mapSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          data-testid="location-service-banner"
        />
      </section>

      {/* 관리자용 통계 카드 */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 업체</p>
                  <p className="text-2xl font-bold">{locations.length}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">활성 업체</p>
                  <p className="text-2xl font-bold text-green-600">
                    {locations.filter(l => l.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">승인 대기</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {locations.filter(l => l.status === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">파트너 업체</p>
                  <p className="text-2xl font-bold text-primary">
                    {locations.filter(l => l.isPartner).length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="업체명 또는 주소로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="업체 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="training">훈련소</SelectItem>
                <SelectItem value="grooming">미용실</SelectItem>
                <SelectItem value="hospital">동물병원</SelectItem>
                <SelectItem value="hotel">펜션/호텔</SelectItem>
                <SelectItem value="daycare">위탁관리</SelectItem>
                <SelectItem value="park">놀이공원</SelectItem>
              </SelectContent>
            </Select>
            {userRole === 'admin' && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 위치 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isSearching && (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">검색 중...</p>
          </div>
        )}
        {searchTerm.trim() && searchResults.length > 0 && (
          <div className="col-span-full mb-4">
            <p className="text-sm text-green-600 font-medium">
              🔍 "{searchTerm}" 검색 결과 {searchResults.length}개 발견
            </p>
          </div>
        )}
        {displayLocations.map((location) => (
          <Card key={location.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="relative h-48" onClick={() => handleLocationClick(location)}>
              <img
                src={location.image}
                alt={location.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                {getStatusBadge(location.status)}
                {location.isPartner && (
                  <Badge className="bg-blue-600">파트너</Badge>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getTypeIcon(location.type)}</span>
                    <Badge variant="outline" className="text-xs">
                      {getTypeName(location.type)}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{location.name}</h3>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{location.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{location.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{location.operatingHours.open} - {location.operatingHours.close}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{location.rating} ({location.reviewCount} 후기)</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {location.description}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLocationClick(location);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  상세보기
                </Button>

                {userRole === 'admin' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditLocationItem(location);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      편집
                    </Button>
                    <Select onValueChange={(value) => handleStatusChange(location.id, value)}>
                      <SelectTrigger className="w-24">
                        <Settings className="h-3 w-3" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">활성화</SelectItem>
                        <SelectItem value="pending">대기</SelectItem>
                        <SelectItem value="inactive">비활성화</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLocation(location.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              {userRole === 'admin' && (
                <div className="mt-3 text-xs text-gray-500">
                  등록: {location.createdAt} | 수정: {location.updatedAt}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-500">
              다른 검색어나 필터를 시도해보세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 상세 보기 모달 */}
      {selectedLocation && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(selectedLocation.type)}</span>
                {selectedLocation.name}
                {selectedLocation.isPartner && (
                  <Badge className="bg-blue-600">파트너</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={selectedLocation.image}
                alt={selectedLocation.name}
                className="w-full h-64 object-cover rounded-md"
              />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedLocation.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{selectedLocation.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>운영시간: {selectedLocation.operatingHours.open} - {selectedLocation.operatingHours.close}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{selectedLocation.rating} ({selectedLocation.reviewCount} 후기)</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">서비스</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLocation.services.map((service, index) => (
                    <Badge key={index} variant="outline">{service}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">설명</h4>
                <p className="text-gray-600">{selectedLocation.description}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">가격대</h4>
                <p className="text-gray-600">{selectedLocation.priceRange}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 편집 모달 */}
      {editingLocationItem && (
        <Dialog open={!!editingLocationItem} onOpenChange={() => setEditingLocation(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>업체 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">업체명</label>
                  <Input
                    value={editingLocationItem.name}
                    onChange={(e) => setEditingLocation({...editingLocationItem, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">업체 유형</label>
                  <Select
                    value={editingLocationItem.type}
                    onValueChange={(value) => setEditingLocation({...editingLocationItem, type: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">훈련소</SelectItem>
                      <SelectItem value="grooming">미용실</SelectItem>
                      <SelectItem value="hospital">동물병원</SelectItem>
                      <SelectItem value="hotel">펜션/호텔</SelectItem>
                      <SelectItem value="daycare">위탁관리</SelectItem>
                      <SelectItem value="park">놀이공원</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">주소</label>
                <Input
                  value={editingLocationItem.address}
                  onChange={(e) => setEditingLocation({...editingLocationItem, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">전화번호</label>
                  <Input
                    value={editingLocationItem.phone}
                    onChange={(e) => setEditingLocation({...editingLocationItem, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">가격대</label>
                  <Input
                    value={editingLocationItem.priceRange}
                    onChange={(e) => setEditingLocation({...editingLocationItem, priceRange: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">업체 설명</label>
                <Textarea
                  value={editingLocationItem.description}
                  onChange={(e) => setEditingLocation({...editingLocationItem, description: e.target.value})}
                  rows={3}
                />
              </div>

              {/* 이미지 업로드 섹션 */}
              <div>
                <label className="block text-sm font-medium mb-2">업체 이미지 (최대 7개)</label>
                <div className="space-y-4">
                  {/* 현재 이미지 표시 */}
                  {editingLocationItem.image && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">현재 이미지:</p>
                      <div className="relative inline-block">
                        <img
                          src={editingLocationItem.image}
                          alt="현재 업체 이미지"
                          className="w-32 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingLocation({...editingLocationItem, image: ''})}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 새 이미지 업로드 */}
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">클릭하여 새 이미지 업로드</span>
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (최대 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  
                  {/* 업로드된 새 이미지 미리보기 */}
                  {uploadedImages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">새로 업로드된 이미지:</p>
                      <div className="grid grid-cols-3 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image.preview}
                              alt={`새 이미지 ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ✕
                            </button>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {image.file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {uploadedImages.length >= 7 && (
                    <p className="text-sm text-orange-600">
                      최대 7개의 이미지만 업로드할 수 있습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // 편집 취소 시 업로드된 이미지들 정리
                    uploadedImages.forEach(imageData => {
                      URL.revokeObjectURL(imageData.preview);
                    });
                    setUploadedImages([]);
                    setEditingLocation(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpdateLocation}
                >
                  <Save className="h-4 w-4 mr-2" />
                  저장하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      
        {showAdminDialog && (
          <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 업체 등록</DialogTitle>
                <DialogDescription>
                  위치 찾기에 표시될 새로운 업체를 등록합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">업체명 *</label>
                    <Input
                      placeholder="업체명을 입력하세요"
                      value={newLocationData.name}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">업체 유형 *</label>
                    <Select onValueChange={(value) => setNewLocationData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="업체 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">훈련소</SelectItem>
                        <SelectItem value="grooming">미용실</SelectItem>
                        <SelectItem value="hospital">동물병원</SelectItem>
                        <SelectItem value="hotel">펜션/호텔</SelectItem>
                        <SelectItem value="daycare">위탁관리</SelectItem>
                        <SelectItem value="park">놀이공원</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">주소 *</label>
                  <Input
                    placeholder="업체 주소를 입력하세요"
                    value={newLocationData.address}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">전화번호</label>
                    <Input
                      placeholder="예: 02-1234-5678"
                      value={newLocationData.phone}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">가격대</label>
                    <Input
                      placeholder="예: 10만원-20만원"
                      value={newLocationData.priceRange}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, priceRange: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">업체 설명</label>
                  <Textarea
                    placeholder="업체에 대한 상세 설명을 입력하세요"
                    value={newLocationData.description}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">제공 서비스</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['기본 훈련', '행동 교정', '사회화 훈련', '아젤리티', '퍼피 클래스', '그루밍', '호텔링', '데이케어'].map((service) => (
                      <label key={service} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newLocationData.services.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewLocationData(prev => ({
                                ...prev,
                                services: [...prev.services, service]
                              }));
                            } else {
                              setNewLocationData(prev => ({
                                ...prev,
                                services: prev.services.filter(s => s !== service)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 이미지 업로드 섹션 */}
                <div>
                  <label className="block text-sm font-medium mb-2">업체 이미지 (최대 7개)</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 & 드롭
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, JPEG (최대 5MB)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                    
                    {/* 업로드된 이미지 미리보기 */}
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image.preview}
                              alt={`업체 이미지 ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ✕
                            </button>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {image.file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {uploadedImages.length >= 7 && (
                      <p className="text-sm text-orange-600">
                        최대 7개의 이미지만 업로드할 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">운영 시간 (시작)</label>
                    <Input
                      type="time"
                      value={newLocationData.operatingHours.open}
                      onChange={(e) => setNewLocationData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours, open: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">운영 시간 (종료)</label>
                    <Input
                      type="time"
                      value={newLocationData.operatingHours.close}
                      onChange={(e) => setNewLocationData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours, close: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPartner"
                    checked={newLocationData.isPartner}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, isPartner: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isPartner" className="text-sm font-medium">
                    공식 파트너 업체로 등록
                  </label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAdminDialog(false)}>
                    취소
                  </Button>
                  <Button onClick={handleAdminLocationSave} disabled={!newLocationData.name || !newLocationData.type || !newLocationData.address}>
                    등록하기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        
        {showManagementDialog && (
          <Dialog open={showManagementDialog} onOpenChange={setShowManagementDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>등록된 업체 관리</DialogTitle>
                <DialogDescription>
                  등록된 업체들을 관리하고 수정할 수 있습니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="업체명으로 검색..."
                      value={managementSearchTerm}
                      onChange={(e) => setManagementSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select onValueChange={(value) => setManagementFilterType(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="업체 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="training">훈련소</SelectItem>
                      <SelectItem value="grooming">미용실</SelectItem>
                      <SelectItem value="hospital">동물병원</SelectItem>
                      <SelectItem value="hotel">펜션/호텔</SelectItem>
                      <SelectItem value="daycare">위탁관리</SelectItem>
                      <SelectItem value="park">놀이공원</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {getFilteredManagementLocations().map((location) => (
                    <Card key={location.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{location.name}</h3>
                              <Badge variant={location.isPartner ? "default" : "secondary"}>
                                {location.isPartner ? "파트너" : "일반"}
                              </Badge>
                              <Badge variant={
                                location.status === 'active' ? "default" : 
                                location.status === 'pending' ? "secondary" : "danger"
                              }>
                                {location.status === 'active' ? "활성" : 
                                 location.status === 'pending' ? "승인대기" : "비활성"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{location.address}</p>
                            <p className="text-sm text-gray-500">{location.phone}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {location.services.slice(0, 3).map((service, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                              {location.services.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{location.services.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLocationInner(location)}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              수정
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleLocationStatus(location.id)}
                            >
                              {location.status === 'active' ? '비활성화' : '활성화'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteLocationInner(location.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowManagementDialog(false)}>
                  닫기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}