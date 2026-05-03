import React from 'react';
import { Activity } from './types';
import { cn } from '@/lib/utils';

interface ActivitySelectorProps {
  activities: Activity[];
  selectedActivities: string[];
  onActivitySelect: (activityId: string) => void;
}

export function ActivitySelector({
  activities,
  selectedActivities,
  onActivitySelect
}: ActivitySelectorProps) {
  // 카테고리별 활동 분류
  const categorizedActivities = {
    training: activities.filter(a => a.category === 'training'),
    play: activities.filter(a => a.category === 'play'),
    care: activities.filter(a => a.category === 'care'),
    health: activities.filter(a => a.category === 'health')
  };
  
  // 카테고리 이름 매핑
  const categoryNames = {
    training: '훈련',
    play: '놀이',
    care: '케어',
    health: '건강'
  };
  
  // 카테고리별 아이콘 색상
  const categoryColors = {
    training: 'text-primary dark:text-primary',
    play: 'text-success dark:text-success',
    care: 'text-primary dark:text-primary',
    health: 'text-destructive dark:text-destructive'
  };
  
  return (
    <div className="space-y-4">
      {(Object.keys(categorizedActivities) as Array<keyof typeof categorizedActivities>).map(category => (
        <div key={category} className="space-y-2">
          <h4 className={cn("text-sm font-medium", categoryColors[category])}>
            {categoryNames[category]}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categorizedActivities[category].map(activity => (
              <button
                key={activity.id}
                type="button"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  selectedActivities.includes(activity.id)
                    ? "bg-primary/10 text-primary font-medium"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
                )}
                onClick={() => onActivitySelect(activity.id)}
              >
                <span className={cn(
                  "mr-2",
                  selectedActivities.includes(activity.id) ? 'text-primary' : categoryColors[category]
                )}>
                  {activity.icon}
                </span>
                {activity.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}