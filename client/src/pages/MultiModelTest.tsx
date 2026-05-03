import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Brain, Heart, PawPrint, Zap, Target, CheckCircle, TrendingUp } from 'lucide-react';

export default function MultiModelTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fusedResults, setFusedResults] = useState<any>({});

  // 반려동물 행동 분석
  const [behaviorDescription, setBehaviorDescription] = useState('');
  
  // 훈련 계획 생성
  const [trainingData, setTrainingData] = useState({
    breed: '',
    age: '',
    issue: '',
    experience: ''
  });

  // 건강 증상 분석
  const [symptoms, setSymptoms] = useState('');
  
  // 감정 분석
  const [sentimentText, setSentimentText] = useState('');

  const handleFusedBehaviorAnalysis = async () => {
    if (!behaviorDescription.trim()) {
      toast({
        title: "오류",
        description: "행동 설명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/fused-behavior-analysis', {
        description: behaviorDescription
      });
      
      setFusedResults(prev => ({ ...prev, behavior: response }));
      toast({
        title: "멀티모델 분석 완료",
        description: "OpenAI와 Gemini 융합 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "멀티모델 행동 분석 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFusedTrainingPlan = async () => {
    if (!trainingData.breed || !trainingData.age || !trainingData.issue || !trainingData.experience) {
      toast({
        title: "오류",
        description: "모든 정보를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/fused-training-plan', trainingData);
      
      setFusedResults(prev => ({ ...prev, training: response }));
      toast({
        title: "멀티모델 계획 생성 완료",
        description: "융합된 훈련 계획이 생성되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "멀티모델 훈련 계획 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFusedHealthAnalysis = async () => {
    if (!symptoms.trim()) {
      toast({
        title: "오류",
        description: "증상을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/fused-health-analysis', {
        symptoms: symptoms
      });
      
      setFusedResults(prev => ({ ...prev, health: response }));
      toast({
        title: "멀티모델 건강 분석 완료",
        description: "융합된 건강 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "멀티모델 건강 분석 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFusedSentimentAnalysis = async () => {
    if (!sentimentText.trim()) {
      toast({
        title: "오류",
        description: "분석할 텍스트를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/fused-sentiment-analysis', {
        text: sentimentText
      });
      
      setFusedResults(prev => ({ ...prev, sentiment: response }));
      toast({
        title: "멀티모델 감정 분석 완료",
        description: "융합된 감정 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "멀티모델 감정 분석 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConsensusColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-destructive/10 text-destructive';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConsensusIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'low': return <TrendingUp className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          멀티모델 AI 융합 시스템
        </h1>
        <p className="text-gray-600">OpenAI + Gemini 협업으로 더 정확하고 신뢰할 수 있는 분석 결과를 제공합니다</p>
      </div>

      <Tabs defaultValue="behavior" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <PawPrint className="h-4 w-4" />
            행동 분석
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            훈련 계획
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            건강 분석
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            감정 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  멀티모델 행동 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="behavior">행동 설명</Label>
                  <Textarea
                    id="behavior"
                    placeholder="반려동물의 문제 행동을 자세히 설명해주세요..."
                    value={behaviorDescription}
                    onChange={(e) => setBehaviorDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleFusedBehaviorAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      융합 분석 중...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      멀티모델 행동 분석
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {fusedResults.behavior && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>융합 분석 결과</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getConsensusColor(fusedResults.behavior.consensusLevel)}>
                        {getConsensusIcon(fusedResults.behavior.consensusLevel)}
                        <span className="ml-1">
                          {fusedResults.behavior.consensusLevel === 'high' ? '높은 일치도' :
                           fusedResults.behavior.consensusLevel === 'medium' ? '보통 일치도' : '낮은 일치도'}
                        </span>
                      </Badge>
                      <Badge variant="outline">
                        신뢰도: {Math.round(fusedResults.behavior.confidence * 100)}%
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-primary">📊 융합된 최종 분석</h4>
                    <p className="text-sm bg-primary/10 p-3 rounded whitespace-pre-wrap">
                      {fusedResults.behavior.fusedResult}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 text-success">🤖 Gemini 분석</h5>
                      <p className="text-xs bg-success/10 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.behavior.geminiResult}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 text-primary">🧠 OpenAI 분석</h5>
                      <p className="text-xs bg-primary/5 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.behavior.openaiResult}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  멀티모델 훈련 계획 생성
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="breed">견종</Label>
                    <Input
                      id="breed"
                      placeholder="예: 골든 리트리버"
                      value={trainingData.breed}
                      onChange={(e) => setTrainingData(prev => ({ ...prev, breed: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">나이</Label>
                    <Input
                      id="age"
                      placeholder="예: 1살 6개월"
                      value={trainingData.age}
                      onChange={(e) => setTrainingData(prev => ({ ...prev, age: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="issue">문제 행동</Label>
                  <Input
                    id="issue"
                    placeholder="예: 짖음, 분리불안"
                    value={trainingData.issue}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, issue: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">주인 경험</Label>
                  <Input
                    id="experience"
                    placeholder="예: 초보자, 경험자"
                    value={trainingData.experience}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, experience: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleFusedTrainingPlan} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      융합 계획 생성 중...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      멀티모델 훈련 계획 생성
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {fusedResults.training && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>융합 훈련 계획</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getConsensusColor(fusedResults.training.consensusLevel)}>
                        {getConsensusIcon(fusedResults.training.consensusLevel)}
                        <span className="ml-1">
                          {fusedResults.training.consensusLevel === 'high' ? '높은 일치도' :
                           fusedResults.training.consensusLevel === 'medium' ? '보통 일치도' : '낮은 일치도'}
                        </span>
                      </Badge>
                      <Badge variant="outline">
                        신뢰도: {Math.round(fusedResults.training.confidence * 100)}%
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-primary">📋 융합된 훈련 계획</h4>
                    <p className="text-sm bg-primary/10 p-3 rounded whitespace-pre-wrap">
                      {fusedResults.training.fusedResult}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 text-success">🤖 Gemini 계획</h5>
                      <p className="text-xs bg-success/10 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.training.geminiResult}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 text-primary">🧠 OpenAI 계획</h5>
                      <p className="text-xs bg-primary/5 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.training.openaiResult}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  멀티모델 건강 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="symptoms">증상 설명</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="반려동물의 증상을 자세히 설명해주세요..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleFusedHealthAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      융합 분석 중...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      멀티모델 건강 분석
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {fusedResults.health && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>융합 건강 분석</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getConsensusColor(fusedResults.health.consensusLevel)}>
                        {getConsensusIcon(fusedResults.health.consensusLevel)}
                        <span className="ml-1">
                          {fusedResults.health.consensusLevel === 'high' ? '높은 일치도' :
                           fusedResults.health.consensusLevel === 'medium' ? '보통 일치도' : '낮은 일치도'}
                        </span>
                      </Badge>
                      <Badge variant="outline">
                        신뢰도: {Math.round(fusedResults.health.confidence * 100)}%
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-primary">🏥 융합된 건강 분석</h4>
                    <p className="text-sm bg-primary/10 p-3 rounded whitespace-pre-wrap">
                      {fusedResults.health.fusedResult}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 text-success">🤖 Gemini 분석</h5>
                      <p className="text-xs bg-success/10 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.health.geminiResult}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 text-primary">🧠 OpenAI 분석</h5>
                      <p className="text-xs bg-primary/5 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {fusedResults.health.openaiResult}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  멀티모델 감정 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sentiment">분석할 텍스트</Label>
                  <Textarea
                    id="sentiment"
                    placeholder="감정을 분석할 텍스트를 입력해주세요..."
                    value={sentimentText}
                    onChange={(e) => setSentimentText(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleFusedSentimentAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      융합 분석 중...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      멀티모델 감정 분석
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {fusedResults.sentiment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>융합 감정 분석</span>
                    <Badge className={getConsensusColor(fusedResults.sentiment.fusedSentiment.consensusLevel)}>
                      {getConsensusIcon(fusedResults.sentiment.fusedSentiment.consensusLevel)}
                      <span className="ml-1">
                        {fusedResults.sentiment.fusedSentiment.consensusLevel === 'high' ? '높은 일치도' :
                         fusedResults.sentiment.fusedSentiment.consensusLevel === 'medium' ? '보통 일치도' : '낮은 일치도'}
                      </span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded">
                    <h4 className="font-semibold text-lg mb-3 text-primary">💫 융합된 감정 분석 결과</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span>종합 평점:</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={`text-lg ${star <= fusedResults.sentiment.fusedSentiment.rating ? 'text-warning' : 'text-gray-300'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="font-semibold">{fusedResults.sentiment.fusedSentiment.rating}/5</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>신뢰도:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${fusedResults.sentiment.fusedSentiment.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold">{Math.round(fusedResults.sentiment.fusedSentiment.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-success/10 p-3 rounded">
                      <h5 className="font-medium mb-2 text-success">🤖 Gemini 감정 분석</h5>
                      <div className="text-sm">
                        <div>평점: {fusedResults.sentiment.geminiSentiment.rating}/5</div>
                        <div>신뢰도: {Math.round(fusedResults.sentiment.geminiSentiment.confidence * 100)}%</div>
                      </div>
                    </div>
                    <div className="bg-primary/5 p-3 rounded">
                      <h5 className="font-medium mb-2 text-primary">🧠 OpenAI 감정 분석</h5>
                      <div className="text-sm">
                        <div>평점: {fusedResults.sentiment.openaiSentiment.rating}/5</div>
                        <div>신뢰도: {Math.round(fusedResults.sentiment.openaiSentiment.confidence * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}