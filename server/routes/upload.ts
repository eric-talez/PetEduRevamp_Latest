import type { Express, Request, Response } from "express";
import { 
  uploadSingle, 
  uploadMultiple, 
  uploadFields, 
  processUploadedFiles, 
  deleteFile 
} from "../middleware/upload";
import { logServerError } from '../middleware/audit-logger';

export function registerUploadRoutes(app: Express) {
  // 단일 파일 업로드
  app.post("/api/upload/single", (req: Request, res: Response) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        logServerError('업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 파일이 없습니다.' 
        });
      }

      const fileInfo = processUploadedFiles(req.file);
      res.json({ 
        success: true, 
        file: fileInfo,
        message: '파일이 성공적으로 업로드되었습니다.'
      });
    });
  });

  // 다중 파일 업로드
  app.post("/api/upload/multiple", (req: Request, res: Response) => {
    uploadMultiple(req, res, (err) => {
      if (err) {
        logServerError('업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 파일이 없습니다.' 
        });
      }

      const filesInfo = processUploadedFiles(req.files);
      res.json({ 
        success: true, 
        files: filesInfo,
        message: `${Array.isArray(filesInfo) ? filesInfo.length : 0}개 파일이 성공적으로 업로드되었습니다.`
      });
    });
  });

  // 필드별 파일 업로드 (알림장용)
  app.post("/api/upload/notebook", (req: Request, res: Response) => {
    uploadFields(req, res, (err) => {
      if (err) {
        logServerError('업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      const filesInfo = processUploadedFiles(req.files);
      res.json({ 
        success: true, 
        files: filesInfo,
        message: '알림장 파일들이 성공적으로 업로드되었습니다.'
      });
    });
  });

  // 프로필 사진 업로드
  app.post("/api/upload/avatar", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: '로그인이 필요합니다.' 
      });
    }

    uploadSingle(req, res, async (err) => {
      if (err) {
        logServerError('프로필 사진 업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 이미지가 없습니다.' 
        });
      }

      try {
        const fileInfo = processUploadedFiles(req.file);
        const userId = req.user!.id;

        // 사용자 프로필에 아바타 URL 업데이트
        const { storage } = await import("../storage");
        await storage.updateUserProfile(userId, {
          avatar: fileInfo!.url
        });

        res.json({ 
          success: true, 
          file: fileInfo,
          message: '프로필 사진이 성공적으로 업데이트되었습니다.'
        });
      } catch (error) {
        logServerError('프로필 업데이트 오류:', error, req);

        // 파일 업로드는 성공했지만 DB 업데이트 실패 시에도 파일 정보 반환
        const fileInfo = processUploadedFiles(req.file);
        res.status(200).json({ 
          success: true, 
          file: fileInfo,
          message: '파일 업로드는 완료되었지만 프로필 업데이트에 실패했습니다.',
          warning: '프로필 업데이트를 다시 시도해주세요.'
        });
      }
    });
  });

  app.post("/api/upload/image", (req: Request, res: Response) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        logServerError('업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 파일이 없습니다.' 
        });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;

        // 이미지 접근 가능성 확인
        console.log(`[Upload] 이미지 업로드 성공: ${imageUrl}`);

        res.json({
          success: true,
          message: '이미지가 성공적으로 업로드되었습니다.',
          imageUrl: imageUrl,
          filename: req.file.filename,
          fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}` // 절대 URL도 제공
        });
    });
  });

  app.post("/api/upload/video", (req: Request, res: Response) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        logServerError('동영상 업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 동영상이 없습니다.' 
        });
      }
      
      const videoUrl = `/uploads/${req.file.filename}`;

        // 동영상 접근 가능성 확인
        console.log(`[Upload] 동영상 업로드 성공: ${videoUrl}`);

        res.json({
          success: true,
          message: '동영상이 성공적으로 업로드되었습니다.',
          videoUrl: videoUrl,
          filename: req.file.filename,
          fullUrl: `${req.protocol}://${req.get('host')}${videoUrl}` // 절대 URL도 제공
        });
    });
  });

  // 파일 삭제
  app.delete("/api/upload/:filename", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: '로그인이 필요합니다.' 
      });
    }

    const { filename } = req.params;
    const success = deleteFile(filename);

    if (success) {
      res.json({ 
        success: true, 
        message: '파일이 성공적으로 삭제되었습니다.' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: '파일을 찾을 수 없거나 삭제할 수 없습니다.' 
      });
    }
  });

  // 업로드된 파일 목록 조회
  app.get("/api/upload/files", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: '로그인이 필요합니다.' 
      });
    }

    // 실제 구현에서는 데이터베이스에서 사용자별 파일 목록을 조회
    res.json({ 
      success: true, 
      files: [],
      message: '파일 목록을 불러왔습니다.' 
    });
  });
}