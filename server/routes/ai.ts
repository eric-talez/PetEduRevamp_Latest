import type { Express } from "express";
import OpenAI from "openai";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { logServerError } from '../middleware/audit-logger';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY,
});

// Multer 설정 (파일 업로드용)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 제한
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // 오디오 및 비디오 파일만 허용
    const allowedMimes = [
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'));
    }
  }
});

export function registerAIRoutes(app: Express) {
  // AI 챗봇 엔드포인트
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages, model = 'gpt-4o', maxTokens = 1000 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
      }

      // 시스템 프롬프트 추가
      const systemPrompt = {
        role: 'system',
        content: `당신은 TALEZ의 반려동물 전문 AI 도우미입니다. 
        
        역할:
        - 반려동물 건강, 훈련, 영양, 행동에 대한 전문적이고 정확한 조언 제공
        - 한국어로 친근하고 이해하기 쉽게 응답
        - 긴급한 의료 상황에서는 즉시 수의사 방문을 권장
        - TALEZ 플랫폼의 서비스(훈련사 매칭, 건강 관리 등)를 적절히 언급
        
        응답 가이드라인:
        - 구체적이고 실용적인 조언 제공
        - 전문 용어는 쉽게 설명
        - 안전을 최우선으로 고려
        - 200-300자 내외로 간결하게 답변
        - 필요시 관련 전문가나 수의사 상담 권장`
      };

      // OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [systemPrompt, ...messages],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const response = completion.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';

      res.json({ 
        response,
        usage: completion.usage,
        model: completion.model
      });

    } catch (error: any) {
      logServerError('OpenAI API 오류:', error, req);
      
      // API 키 관련 오류 처리
      if (error.code === 'invalid_api_key') {
        return res.status(401).json({ 
          error: 'OpenAI API 키가 유효하지 않습니다.',
          fallback: true
        });
      }
      
      // 할당량 초과 오류 처리
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          error: 'API 사용량이 초과되었습니다.',
          fallback: true
        });
      }

      // 기타 오류 처리
      res.status(500).json({ 
        error: 'AI 응답 생성 중 오류가 발생했습니다.',
        fallback: true,
        details: error.message
      });
    }
  });

  // AI 기능 상태 확인 엔드포인트
  app.get('/api/ai/status', async (req, res) => {
    try {
      if (!process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY) {
        return res.json({ 
          available: false, 
          reason: 'API 키가 설정되지 않았습니다.' 
        });
      }

      // 간단한 테스트 요청으로 API 상태 확인
      const testCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      res.json({ 
        available: true, 
        model: testCompletion.model,
        usage: testCompletion.usage
      });

    } catch (error: any) {
      logServerError('AI 상태 확인 오류:', error, req);
      res.json({ 
        available: false, 
        reason: error.message 
      });
    }
  });

  // 자동 자막 생성 API (OpenAI Whisper)
  app.post('/api/ai/generate-subtitles', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '오디오 파일이 필요합니다.' });
      }

      console.log('자막 생성 요청:', req.file.originalname);

      // OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
        language: 'ko', // 한국어로 설정
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      console.log('Whisper 응답:', transcription);

      // SRT 형식으로 자막 생성
      let srtContent = '';
      if (transcription.segments) {
        transcription.segments.forEach((segment, index) => {
          const startTime = formatSRTTime(segment.start);
          const endTime = formatSRTTime(segment.end);
          
          srtContent += `${index + 1}\n`;
          srtContent += `${startTime} --> ${endTime}\n`;
          srtContent += `${segment.text.trim()}\n\n`;
        });
      }

      // WebVTT 형식으로도 자막 생성
      let vttContent = 'WEBVTT\n\n';
      if (transcription.segments) {
        transcription.segments.forEach((segment, index) => {
          const startTime = formatVTTTime(segment.start);
          const endTime = formatVTTTime(segment.end);
          
          vttContent += `${index + 1}\n`;
          vttContent += `${startTime} --> ${endTime}\n`;
          vttContent += `${segment.text.trim()}\n\n`;
        });
      }

      // 임시 파일 삭제
      fs.unlinkSync(req.file.path);

      res.json({
        text: transcription.text,
        srt: srtContent,
        vtt: vttContent,
        segments: transcription.segments
      });

    } catch (error) {
      logServerError('자막 생성 오류:', error, req);
      
      // 임시 파일이 있다면 삭제
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: '자막 생성 중 오류가 발생했습니다.' });
    }
  });

  // 비디오에서 오디오 추출 및 자막 생성
  app.post('/api/ai/generate-subtitles-from-video', upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '비디오 파일이 필요합니다.' });
      }

      const ffmpeg = require('fluent-ffmpeg');
      const path = require('path');
      const fs = require('fs');
      
      // 오디오 파일 경로 설정
      const audioPath = req.file.path.replace(path.extname(req.file.path), '.wav');
      
      // FFmpeg를 사용하여 비디오에서 오디오 추출
      await new Promise((resolve, reject) => {
        ffmpeg(req.file.path)
          .output(audioPath)
          .audioCodec('pcm_s16le')
          .audioFrequency(16000)
          .audioChannels(1)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      // OpenAI Whisper로 음성 인식
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language: 'ko',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      // 자막 파일 생성
      let srtContent = '';
      let vttContent = 'WEBVTT\n\n';
      
      if (transcription.segments) {
        transcription.segments.forEach((segment, index) => {
          // SRT 형식
          const srtStartTime = formatSRTTime(segment.start);
          const srtEndTime = formatSRTTime(segment.end);
          srtContent += `${index + 1}\n${srtStartTime} --> ${srtEndTime}\n${segment.text.trim()}\n\n`;
          
          // VTT 형식
          const vttStartTime = formatVTTTime(segment.start);
          const vttEndTime = formatVTTTime(segment.end);
          vttContent += `${index + 1}\n${vttStartTime} --> ${vttEndTime}\n${segment.text.trim()}\n\n`;
        });
      }

      // 임시 파일들 정리
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(audioPath);

      res.json({
        text: transcription.text,
        srt: srtContent,
        vtt: vttContent,
        segments: transcription.segments
      });

    } catch (error) {
      logServerError('비디오 자막 생성 오류:', error, req);
      
      // 임시 파일 정리
      if (req.file && require('fs').existsSync(req.file.path)) {
        require('fs').unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: '비디오 자막 생성 중 오류가 발생했습니다.' });
    }
  });
}

// SRT 시간 형식 변환 함수
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

// WebVTT 시간 형식 변환 함수
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}