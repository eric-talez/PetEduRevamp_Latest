import { Express, Request, Response } from 'express';
import OpenAI from 'openai';
import config from '../config';
import { logServerError } from '../middleware/audit-logger';

const openai = config.OPENAI_API_KEY || config.OPENAI_API_TALEZ 
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY || config.OPENAI_API_TALEZ }) 
  : null;

export function registerMediaAnalysisRoutes(app: Express) {
  app.post('/api/ai/analyze-media', async (req: Request, res: Response) => {
    try {
      const { imageBase64, petId, model = 'gpt-4o-mini', memo } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ 
          success: false, 
          message: '이미지 데이터가 필요합니다.' 
        });
      }

      if (!petId) {
        return res.status(400).json({ 
          success: false, 
          message: '반려동물을 선택해주세요.' 
        });
      }

      if (!openai) {
        return res.status(200).json({
          success: true,
          message: 'OpenAI API가 설정되지 않아 데모 분석 결과를 제공합니다.',
          analysis: {
            summary: '(데모 분석) 이미지가 업로드되었습니다. OpenAI API 설정 후 실제 분석이 가능합니다.',
            posture: {
              score: 75,
              notes: '데모 모드: API 키를 설정하면 실제 자세 분석 결과가 표시됩니다.',
              keyFindings: ['API 설정 필요']
            },
            behavior: {
              observed: ['이미지 업로드 확인됨'],
              concerns: [],
              positive: ['정상적으로 업로드됨']
            },
            health: {
              status: '데모 모드',
              warnings: [],
              recommendations: ['OpenAI API 키를 설정하세요']
            },
            issues: ['OpenAI API 키가 설정되지 않았습니다'],
            solutions: ['관리자에게 문의하여 API 키를 설정하세요']
          },
          tokensUsed: { in: 0, out: 0 },
          model: 'demo-mode'
        });
      }

      const prompt = `반려견 전문가로서 이미지를 분석하여 JSON 형식으로 응답하세요.
${memo ? `메모: ${memo}\n` : ''}
JSON 형식:
{
  "summary": "전체 요약",
  "posture": {"score": 85, "notes": "자세 설명", "keyFindings": ["발견사항"]},
  "behavior": {"observed": ["관찰"], "concerns": ["우려"], "positive": ["긍정"]},
  "health": {"status": "상태", "warnings": ["경고"], "recommendations": ["권장"]},
  "issues": ["문제"],
  "solutions": ["해결방안"]
}`;

      console.log('[Media Analysis] 이미지 분석 시작:', { 
        petId, 
        model, 
        imageLength: imageBase64.length
      });

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'auto'
                }
              }
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('AI 응답이 비어있습니다');
      }

      console.log('[Media Analysis] AI 응답 받음:', content.substring(0, 200));

      let analysis;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = JSON.parse(content);
        }
      } catch (parseError) {
        logServerError('[Media Analysis] JSON 파싱 실패:', content, req);
        analysis = {
          summary: content,
          posture: {
            score: 0,
            notes: 'JSON 파싱 실패',
            keyFindings: []
          },
          behavior: {
            observed: [],
            concerns: [],
            positive: []
          },
          health: {
            status: '분석 결과 파싱 오류',
            warnings: [],
            recommendations: []
          },
          issues: ['응답 형식 오류'],
          solutions: ['다시 시도해주세요']
        };
      }

      const tokensUsed = {
        in: response.usage?.prompt_tokens || 0,
        out: response.usage?.completion_tokens || 0
      };

      console.log('[Media Analysis] 분석 완료:', {
        petId,
        tokensUsed,
        hasSummary: !!analysis.summary
      });

      return res.json({
        success: true,
        analysis,
        tokensUsed,
        model: response.model
      });

    } catch (error: any) {
      logServerError('[Media Analysis] 오류:', error, req);
      
      // OpenAI API 할당량 초과 시 데모 모드로 전환
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
        console.warn('[Media Analysis] OpenAI 할당량 초과 - 데모 모드로 전환');
        return res.status(200).json({
          success: true,
          message: 'OpenAI API 할당량 초과로 데모 분석 결과를 제공합니다.',
          analysis: {
            summary: '(데모 분석) OpenAI API 할당량이 초과되어 데모 결과를 제공합니다. 실제 분석을 위해서는 API 키를 확인하거나 할당량을 늘려주세요.',
            posture: {
              score: 80,
              notes: '데모 모드: 할당량 초과로 실제 분석을 진행할 수 없습니다.',
              keyFindings: ['API 할당량 초과']
            },
            behavior: {
              observed: ['이미지 업로드 확인됨'],
              concerns: ['API 할당량 부족'],
              positive: ['정상적으로 업로드됨']
            },
            health: {
              status: '데모 모드 (할당량 초과)',
              warnings: ['OpenAI API 할당량을 확인하세요'],
              recommendations: ['API 키 플랜 업그레이드 또는 결제 정보 확인']
            },
            issues: ['OpenAI API 할당량이 초과되었습니다'],
            solutions: ['OpenAI 계정에서 결제 정보를 확인하거나 플랜을 업그레이드하세요']
          },
          tokensUsed: { in: 0, out: 0 },
          model: 'demo-mode-quota-exceeded'
        });
      }
      
      // 기타 에러
      return res.status(500).json({
        success: false,
        message: error.message || 'AI 분석 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  });

  console.log('[Media Analysis Routes] 미디어 분석 라우트가 등록되었습니다.');
}
