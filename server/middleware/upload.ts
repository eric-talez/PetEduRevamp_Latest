
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logServerError } from './audit-logger';

// 업로드 디렉토리 생성
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 파일 타입 검증
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 이미지 파일
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  // 동영상 파일
  const videoTypes = /mp4|avi|mkv|mov|wmv|flv|webm/;
  
  const extname = imageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  videoTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('파일 형식이 지원되지 않습니다. 이미지 또는 동영상 파일만 업로드 가능합니다.'));
  }
};

// 문서 파일 타입 검증 (hwp, hwpx, doc, docx, pdf, xlsx, xls)
const documentFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const documentTypes = /hwp|hwpx|doc|docx|pdf|xlsx|xls/;
  const extname = documentTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('지원되지 않는 문서 형식입니다. hwp, hwpx, doc, docx, pdf, xlsx, xls 파일만 업로드 가능합니다.'));
  }
};

// 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 파일 타입에 따라 디렉토리 분리
    let uploadPath = uploadsDir;
    
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadsDir, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = path.join(uploadsDir, 'videos');
    }
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 고유한 파일명 생성
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// 파일 크기 제한 (50MB)
const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB
  files: 10 // 최대 10개 파일
};

// Multer 인스턴스들
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 단일 파일: 5MB
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits
}).array('files', 10);

export const uploadFields = multer({
  storage,
  fileFilter,
  limits
}).fields([
  { name: 'photos', maxCount: 8 },
  { name: 'videos', maxCount: 3 },
  { name: 'avatar', maxCount: 1 }
]);

// 파일 정보 처리 헬퍼
export const processUploadedFiles = (files: Express.Multer.File | Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }) => {
  if (!files) return null;

  const processFile = (file: Express.Multer.File) => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path.replace(process.cwd() + '/public', ''),
    size: file.size,
    mimetype: file.mimetype,
    url: file.path.replace(process.cwd() + '/public', '')
  });

  if (Array.isArray(files)) {
    return files.map(processFile);
  }

  if ('fieldname' in files) {
    return processFile(files);
  }

  // fields 형태
  const result: { [key: string]: any } = {};
  for (const [fieldname, fileArray] of Object.entries(files)) {
    result[fieldname] = fileArray.map(processFile);
  }
  return result;
};

// 문서 업로드용 multer 설정
export const uploadDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const docPath = path.join(uploadsDir, 'documents');
      if (!fs.existsSync(docPath)) {
        fs.mkdirSync(docPath, { recursive: true });
      }
      cb(null, docPath);
    },
    filename: (req, file, cb) => {
      // 한글 파일명 처리
      let originalName = file.originalname;
      try {
        // UTF-8 파일명 디코딩
        const buffer = Buffer.from(file.originalname, 'latin1');
        const decoded = buffer.toString('utf8');
        if (decoded && !decoded.includes('�')) {
          originalName = decoded;
        }
      } catch (e) {
        // 디코딩 실패 시 원본 사용
        originalName = file.originalname;
      }
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(originalName);
      const name = path.basename(originalName, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
}).array('files', 5);

// 파일 삭제 헬퍼
export const deleteFile = (filePath: string): boolean => {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    logServerError('파일 삭제 오류:', error);
    return false;
  }
};

// 이미지 압축 및 리사이징 (선택사항)
export const optimizeImage = async (filePath: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}) => {
  // Sharp 라이브러리를 사용한 이미지 최적화 구현
  // 여기서는 기본 구조만 제공
  console.log('이미지 최적화:', filePath, options);
  return filePath;
};
