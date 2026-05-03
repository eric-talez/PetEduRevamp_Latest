import React from 'react';
import { Search, AlertCircle, Bookmark, CheckSquare, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pet } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotebookFiltersProps {
  pets: Pet[];
  filter: {
    searchTerm: string;
    petId: string; // 'all' 또는 id 문자열
    status: string; // 'all', 'completed', 'in-progress', 'planned'
    isImportant: boolean;
    isFavorite: boolean;
  };
  onFilterChange: (filter: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function NotebookFilters({
  pets,
  filter,
  onFilterChange,
  onClearFilters,
  hasActiveFilters
}: NotebookFiltersProps) {
  // 특정 필터 값 변경 핸들러
  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({ ...filter, [key]: value });
  };
  
  // 검색어 필터
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('searchTerm', e.target.value);
  };
  
  // 스위치 토글 핸들러
  const handleSwitchToggle = (key: 'isImportant' | 'isFavorite') => {
    handleFilterChange(key, !filter[key]);
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>필터</span>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs" 
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 검색어 필터 */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs font-medium">키워드 검색</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="검색어 입력..."
              className="pl-8"
              value={filter.searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        {/* 반려동물 필터 */}
        <div className="space-y-2">
          <Label htmlFor="pet-filter" className="text-xs font-medium">반려동물</Label>
          <Select
            value={filter.petId}
            onValueChange={(value) => handleFilterChange('petId', value)}
          >
            <SelectTrigger id="pet-filter">
              <SelectValue placeholder="모든 반려동물" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 반려동물</SelectItem>
              {pets.map(pet => (
                <SelectItem key={pet.id} value={pet.id.toString()}>
                  {pet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* 상태 필터 */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-xs font-medium">상태</Label>
          <Select
            value={filter.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="completed">완료됨</SelectItem>
              <SelectItem value="in-progress">진행중</SelectItem>
              <SelectItem value="planned">예정됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 중요 표시 필터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <Label htmlFor="important-filter" className="text-sm">중요 항목만</Label>
          </div>
          <Switch
            id="important-filter"
            checked={filter.isImportant}
            onCheckedChange={() => handleSwitchToggle('isImportant')}
          />
        </div>
        
        {/* 즐겨찾기 필터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <Label htmlFor="favorite-filter" className="text-sm">즐겨찾기만</Label>
          </div>
          <Switch
            id="favorite-filter"
            checked={filter.isFavorite}
            onCheckedChange={() => handleSwitchToggle('isFavorite')}
          />
        </div>
        
        {/* 활성 필터 배지 */}
        {hasActiveFilters && (
          <div className="pt-2 border-t flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800">
              필터 적용됨
            </Badge>
            {filter.searchTerm && (
              <Badge variant="outline" className="text-xs bg-primary/10 dark:bg-primary/20">
                키워드: {filter.searchTerm}
              </Badge>
            )}
            {filter.petId !== 'all' && (
              <Badge variant="outline" className="text-xs bg-success/10 dark:bg-success/20">
                반려동물 선택됨
              </Badge>
            )}
            {filter.status !== 'all' && (
              <Badge variant="outline" className="text-xs bg-warning/10 dark:bg-warning/20">
                상태: {
                  filter.status === 'completed' ? '완료됨' : 
                  filter.status === 'in-progress' ? '진행중' : '예정됨'
                }
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}