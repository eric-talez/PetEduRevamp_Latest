import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { logServerError } from '../middleware/audit-logger';

export interface ParsedFileContent {
  text: string;
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedTables: number;
    extractedTextLength: number;
  };
}

/**
 * 다양한 파일 형식을 분석하여 텍스트와 테이블 데이터를 추출합니다.
 */
export async function extractTextAndTables(filePath: string, originalName: string): Promise<ParsedFileContent> {
  const fileExtension = path.extname(originalName).toLowerCase();
  const fileSize = fs.statSync(filePath).size;
  
  console.log(`[파일파서] ${originalName} 파싱 시작 (${fileSize} bytes)`);

  try {
    switch (fileExtension) {
      case '.xlsx':
      case '.xls':
        return await parseExcelFile(filePath, originalName, fileSize);
      
      case '.docx':
        return await parseDocxFile(filePath, originalName, fileSize);
      
      case '.hwpx':
        return await parseHwpxFile(filePath, originalName, fileSize);
      
      case '.txt':
        return await parseTextFile(filePath, originalName, fileSize);
      
      case '.hwp':
        // HWP 파일은 복잡한 바이너리 형식이므로 사용자에게 변환 요청
        throw new Error('HWP 파일은 지원되지 않습니다. HWPX 또는 DOCX 형식으로 저장해서 다시 업로드해주세요.');
      
      default:
        throw new Error(`지원되지 않는 파일 형식입니다: ${fileExtension}`);
    }
  } catch (error) {
    logServerError(`[파일파서] ${originalName} 파싱 실패:`, error);
    throw error;
  }
}

/**
 * 엑셀 파일 파싱
 */
async function parseExcelFile(filePath: string, fileName: string, fileSize: number): Promise<ParsedFileContent> {
  const workbook = XLSX.readFile(filePath);
  let allText = '';
  const tables: Array<{ headers: string[]; rows: string[][]; }> = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환하여 테이블 구조 추출
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    
    if (jsonData.length > 0) {
      // 첫 번째 행을 헤더로 사용
      const headers = jsonData[0]?.filter(cell => cell && cell.toString().trim()) || [];
      const rows = jsonData.slice(1)
        .filter(row => row && row.some(cell => cell && cell.toString().trim()))
        .map(row => row.map(cell => cell ? cell.toString().trim() : ''));

      if (headers.length > 0 && rows.length > 0) {
        tables.push({ headers, rows });
      }
    }

    // 텍스트로도 변환
    const sheetText = XLSX.utils.sheet_to_txt(worksheet);
    allText += `\n=== ${sheetName} ===\n${sheetText}\n`;
  }

  // 텍스트 길이 제한 (20,000자)
  const limitedText = allText.trim().slice(0, 20000);
  if (allText.length > 20000) {
    console.log(`[파일파서] 텍스트 길이 제한 적용: ${allText.length} -> 20,000자`);
  }

  return {
    text: limitedText,
    tables: tables.slice(0, 5), // 테이블도 최대 5개로 제한
    metadata: {
      fileName,
      fileType: 'excel',
      fileSize,
      extractedTables: Math.min(tables.length, 5),
      extractedTextLength: limitedText.length
    }
  };
}

/**
 * DOCX 파일 파싱
 */
async function parseDocxFile(filePath: string, fileName: string, fileSize: number): Promise<ParsedFileContent> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  
  const text = result.value;
  const tables = extractTablesFromText(text);

  // 텍스트 길이 제한 (20,000자)
  const limitedText = text.slice(0, 20000);
  if (text.length > 20000) {
    console.log(`[파일파서] 텍스트 길이 제한 적용: ${text.length} -> 20,000자`);
  }

  return {
    text: limitedText,
    tables: tables.slice(0, 5), // 테이블도 최대 5개로 제한
    metadata: {
      fileName,
      fileType: 'docx',
      fileSize,
      extractedTables: Math.min(tables.length, 5),
      extractedTextLength: limitedText.length
    }
  };
}

/**
 * HWPX 파일 파싱 (ZIP 기반)
 */
async function parseHwpxFile(filePath: string, fileName: string, fileSize: number): Promise<ParsedFileContent> {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  let allText = '';
  
  // HWPX 파일에서 텍스트 추출 시도
  try {
    // section0.xml 등에서 텍스트 추출
    for (let i = 0; i < 10; i++) {
      const sectionFile = zip.file(`Contents/section${i}.xml`);
      if (sectionFile) {
        const xmlContent = await sectionFile.async('text');
        // XML에서 텍스트 내용 추출 (간단한 방식)
        const textContent = xmlContent
          .replace(/<[^>]*>/g, ' ') // HTML/XML 태그 제거
          .replace(/\s+/g, ' ') // 여러 공백을 하나로
          .trim();
        allText += textContent + '\n';
      }
    }
  } catch (error) {
    console.warn('[파일파서] HWPX 텍스트 추출 실패, 기본 메시지 사용:', error);
    allText = 'HWPX 파일이 업로드되었으나 내용 추출에 실패했습니다. 파일을 DOCX 형식으로 저장하여 다시 시도해주세요.';
  }

  const tables = extractTablesFromText(allText);

  // 텍스트 길이 제한 (20,000자)
  const limitedText = allText.slice(0, 20000);
  if (allText.length > 20000) {
    console.log(`[파일파서] 텍스트 길이 제한 적용: ${allText.length} -> 20,000자`);
  }

  return {
    text: limitedText,
    tables: tables.slice(0, 5), // 테이블도 최대 5개로 제한
    metadata: {
      fileName,
      fileType: 'hwpx',
      fileSize,
      extractedTables: Math.min(tables.length, 5),
      extractedTextLength: limitedText.length
    }
  };
}

/**
 * 텍스트 파일 파싱
 */
async function parseTextFile(filePath: string, fileName: string, fileSize: number): Promise<ParsedFileContent> {
  const text = fs.readFileSync(filePath, 'utf-8');
  const tables = extractTablesFromText(text);

  // 텍스트 길이 제한 (20,000자)
  const limitedText = text.slice(0, 20000);
  if (text.length > 20000) {
    console.log(`[파일파서] 텍스트 길이 제한 적용: ${text.length} -> 20,000자`);
  }

  return {
    text: limitedText,
    tables: tables.slice(0, 5), // 테이블도 최대 5개로 제한
    metadata: {
      fileName,
      fileType: 'text',
      fileSize,
      extractedTables: Math.min(tables.length, 5),
      extractedTextLength: limitedText.length
    }
  };
}

/**
 * 텍스트에서 테이블 구조 추출 시도 (간단한 패턴 매칭)
 */
function extractTablesFromText(text: string): Array<{ headers: string[]; rows: string[][]; }> {
  const tables: Array<{ headers: string[]; rows: string[][]; }> = [];
  
  // 탭이나 여러 공백으로 구분된 테이블 찾기
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentTable: string[][] = [];
  
  for (const line of lines) {
    // 탭이나 여러 공백으로 분리된 셀이 2개 이상 있는 경우 테이블로 간주
    const cells = line.split(/\t|  +/).filter(cell => cell.trim());
    
    if (cells.length >= 2) {
      currentTable.push(cells);
    } else {
      // 테이블이 끝난 것으로 간주
      if (currentTable.length >= 2) { // 최소 헤더 + 1행
        const headers = currentTable[0];
        const rows = currentTable.slice(1);
        tables.push({ headers, rows });
      }
      currentTable = [];
    }
  }
  
  // 마지막 테이블 처리
  if (currentTable.length >= 2) {
    const headers = currentTable[0];
    const rows = currentTable.slice(1);
    tables.push({ headers, rows });
  }
  
  return tables;
}

/**
 * 파일 업로드 안전성 검증
 */
export function validateUploadedFile(filePath: string, originalName: string): void {
  const allowedExtensions = ['.hwpx', '.docx', '.doc', '.txt', '.xlsx', '.xls']; // HWP 제외
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  const fileExtension = path.extname(originalName).toLowerCase();
  const fileSize = fs.statSync(filePath).size;
  
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error(`지원되지 않는 파일 형식입니다: ${fileExtension}`);
  }
  
  if (fileSize > maxSize) {
    throw new Error(`파일 크기가 너무 큽니다. 최대 100MB까지 지원합니다.`);
  }
  
  // MIME 타입 검증은 multer에서 이미 처리됨
  console.log(`[파일검증] ${originalName} 검증 완료 (${fileSize} bytes)`);
}