import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Link,
  Image,
  Download,
  Trash2
} from 'lucide-react';

interface CommunityPostFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: (post: any) => void;
}

export function CommunityPostForm({ isOpen, onOpenChange, onPostCreated }: CommunityPostFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    linkUrl: '',
    linkTitle: '',
    linkDescription: '',
    linkImage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [isExtractingLink, setIsExtractingLink] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const categories = [
    { value: 'training', label: '훈련 팁' },
    { value: 'health', label: '건강 관리' },
    { value: 'behavior', label: '행동 문제' },
    { value: 'food', label: '사료/영양' },
    { value: 'grooming', label: '미용/관리' },
    { value: 'play', label: '놀이/운동' },
    { value: 'general', label: '일반' },
    { value: 'question', label: '질문' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    } else if (formData.title.length < 5) {
      newErrors.title = '제목은 5글자 이상 입력해주세요.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    } else if (formData.content.length < 10) {
      newErrors.content = '내용은 10글자 이상 입력해주세요.';
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('새 게시글 작성:', formData);
      
      // 실제 API 호출
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          linkUrl: formData.linkUrl || null,
          linkTitle: formData.linkTitle || null,
          linkDescription: formData.linkDescription || null,
          linkImage: formData.linkImage || null
        })
      });

      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }

      const newPost = await response.json();
      console.log('서버에서 받은 새 게시글:', newPost);
      
      // 부모 컴포넌트에 즉시 전달
      onPostCreated(newPost);
      
      
      // 폼 초기화
      setFormData({
        title: '',
        content: '',
        category: '일반',
        tags: '',
        linkUrl: '',
        linkTitle: '',
        linkDescription: '',
        linkImage: ''
      });
      
      // 에러 초기화
      setErrors({});
      
      // 모달 닫기
      onOpenChange(false);
      
      // 성공 메시지
      console.log('게시글 작성 완료 - 폼 초기화 및 모달 닫기 처리됨');
      
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      setErrors({ submit: '게시글 작성 중 오류가 발생했습니다.' });
      setSubmitFailed(true);
      setShowLinkSection(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      training: 'bg-blue-100 text-blue-800',
      health: 'bg-green-100 text-green-800',
      behavior: 'bg-yellow-100 text-yellow-800',
      food: 'bg-orange-100 text-orange-800',
      grooming: 'bg-primary/10 text-primary',
      play: 'bg-secondary/15 text-secondary-foreground',
      general: 'bg-gray-100 text-gray-800',
      question: 'bg-red-100 text-red-800'
    };
    return colors[category] || colors.general;
  };

  // 링크 정보 추출 함수
  const extractLinkInfo = async (url: string) => {
    setIsExtractingLink(true);
    try {
      const response = await fetch('/api/extract-link-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('링크 정보 추출에 실패했습니다.');
      }

      const linkInfo = await response.json();
      
      setFormData(prev => ({
        ...prev,
        linkTitle: linkInfo.title || '',
        linkDescription: linkInfo.description || '',
        linkImage: linkInfo.image || ''
      }));
      
    } catch (error) {
      console.error('링크 정보 추출 오류:', error);
      setErrors(prev => ({
        ...prev,
        linkUrl: '링크 정보를 가져올 수 없습니다. URL을 확인해주세요.'
      }));
    } finally {
      setIsExtractingLink(false);
    }
  };

  // URL 유효성 검증
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 링크 URL 변경 처리
  const handleLinkUrlChange = (url: string) => {
    handleInputChange('linkUrl', url);
    
    if (url && isValidUrl(url)) {
      extractLinkInfo(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            새 게시글 작성
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              제목 *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </div>
            )}
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              카테고리 *
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(category.value)}`}>
                      {category.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.category}
              </div>
            )}
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              내용 *
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="게시글 내용을 자세히 작성해주세요. 다른 반려인들에게 도움이 되는 정보나 경험을 공유해보세요."
              rows={8}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.content}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.content.length} / 1000자
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              태그 (선택사항)
            </label>
            <Input
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 산책, 훈련, 사회화)"
            />
            <div className="text-xs text-gray-500 mt-1">
              태그는 다른 사용자들이 게시글을 쉽게 찾을 수 있도록 도와줍니다.
            </div>
            {formData.tags && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.split(',').map((tag, index) => (
                  tag.trim() && (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  )
                ))}
              </div>
            )}
          </div>

          {/* 링크 추가 버튼 */}
          {!showLinkSection && (
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLinkSection(true)}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                링크 추가
              </Button>
            </div>
          )}

          {/* 링크 정보 섹션 */}
          {showLinkSection && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">
                    링크 정보 추가
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLinkSection(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-blue-700 mb-4">
                URL을 입력하면 자동으로 링크 정보를 추출하여 게시글을 더 풍부하게 만들 수 있습니다.
              </p>
              
              <div className="space-y-4">
                {/* 링크 URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    링크 URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.linkUrl}
                      onChange={(e) => handleLinkUrlChange(e.target.value)}
                      placeholder="https://example.com"
                      className={errors.linkUrl ? 'border-red-500' : ''}
                    />
                    {!showLinkSection && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLinkSection(true)}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {errors.linkUrl && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-3 w-3" />
                      {errors.linkUrl}
                    </div>
                  )}
                  {isExtractingLink && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      링크 정보를 가져오는 중...
                    </div>
                  )}
                </div>

                {/* 링크 제목 */}
                {formData.linkTitle && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      링크 제목
                    </label>
                    <Input
                      value={formData.linkTitle}
                      onChange={(e) => handleInputChange('linkTitle', e.target.value)}
                      placeholder="링크 제목"
                    />
                  </div>
                )}

                {/* 링크 설명 */}
                {formData.linkDescription && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      링크 설명
                    </label>
                    <Textarea
                      value={formData.linkDescription}
                      onChange={(e) => handleInputChange('linkDescription', e.target.value)}
                      placeholder="링크 설명"
                      rows={3}
                    />
                  </div>
                )}

                {/* 링크 이미지 썸네일 */}
                {formData.linkImage && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      썸네일 이미지
                    </label>
                    <div className="flex items-center gap-4">
                      <img
                        src={formData.linkImage}
                        alt="링크 썸네일"
                        className="w-24 h-24 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <Input
                          value={formData.linkImage}
                          onChange={(e) => handleInputChange('linkImage', e.target.value)}
                          placeholder="이미지 URL"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInputChange('linkImage', '')}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            제거
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 링크 미리보기 */}
                {formData.linkUrl && (formData.linkTitle || formData.linkDescription) && (
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">링크 미리보기</h4>
                    <div className="flex gap-3">
                      {formData.linkImage && (
                        <img
                          src={formData.linkImage}
                          alt="썸네일"
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm line-clamp-2">
                          {formData.linkTitle}
                        </h5>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {formData.linkDescription}
                        </p>
                        <a
                          href={formData.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          {formData.linkUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 미리보기 */}
          {formData.title && formData.content && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">미리보기</h4>
              <div className="bg-white p-4 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40" 
                    alt="사용자"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <span className="font-medium text-sm">반려인</span>
                    <span className="text-xs text-gray-500 ml-2">방금 전</span>
                  </div>
                  {formData.category && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {categories.find(cat => cat.value === formData.category)?.label}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-2">{formData.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{formData.content}</p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting || !formData.title || !formData.content || !formData.category}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  작성 중...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  게시글 작성
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}