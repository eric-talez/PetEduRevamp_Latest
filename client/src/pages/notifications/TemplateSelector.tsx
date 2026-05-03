import React from 'react';
import { Check, FileText } from 'lucide-react';
import { Template } from './types';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
      <button
        type="button"
        className={cn(
          "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
          selectedTemplate === "" 
            ? "border-primary bg-primary/5" 
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        )}
        onClick={() => onTemplateSelect("")}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 mb-3">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
        <span className="font-medium">직접 작성</span>
        <span className="text-xs text-gray-500 mt-1">빈 템플릿으로 시작</span>
        {selectedTemplate === "" && (
          <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
        )}
      </button>
      
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          className={cn(
            "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
            selectedTemplate === template.id 
              ? "border-primary bg-primary/5" 
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
          )}
          onClick={() => onTemplateSelect(template.id)}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 mb-3">
            {template.id === 'daily' && <FileText className="h-5 w-5 text-primary" />}
            {template.id === 'play' && <FileText className="h-5 w-5 text-success" />}
            {template.id === 'care' && <FileText className="h-5 w-5 text-primary" />}
          </div>
          <span className="font-medium">{template.title}</span>
          <span className="text-xs text-gray-500 mt-1 text-center">
            {template.activities.length}개 활동 포함
          </span>
          {selectedTemplate === template.id && (
            <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}