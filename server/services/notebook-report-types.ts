/**
 * 알림장 리포트 모듈에서 사용하는 storage 타입.
 * server/storage.ts 의 in-memory 저장소가 임의 객체 배열을 노출하므로,
 * 이 모듈 내부에서 사용하는 필드만 좁혀 명시한다.
 */
export interface NotebookJournal {
  id: number;
  petId: number;
  trainerId?: number;
  trainerName?: string;
  title?: string;
  content?: string;
  trainingDate?: string | Date;
  createdAt?: string | Date;
  trainingType?: string;
  progressRating?: number;
  status?: "draft" | "published" | string;
  isAiDraft?: boolean;
}

export interface NotebookHomeworkItem {
  id: number;
  journalId: number;
  label?: string;
  completed?: boolean;
  dueDate?: string | Date | null;
  createdAt?: string | Date;
}

export interface NotebookComment {
  id: number;
  journalId: number;
  authorId?: number;
  authorRole?: "trainer" | "owner" | string;
  authorName?: string;
  content?: string;
  createdAt?: string | Date;
}

export interface NotebookPet {
  id: number;
  name?: string;
  breed?: string;
  ownerId?: number;
}

export interface NotebookOwner {
  id: number;
  name?: string;
  username?: string;
  email?: string;
}

export interface NotebookStorageLike {
  trainingJournals: NotebookJournal[];
  notebookHomeworkItems: NotebookHomeworkItem[];
  journalComments?: NotebookComment[];
  getPet?: (id: number) => NotebookPet | undefined;
  getUser?: (id: number) => NotebookOwner | undefined;
  getPetsByOwnerId?: (id: number) => NotebookPet[];
  getJournalComments?: (journalId: number) => NotebookComment[];
}

export interface SessionUser {
  id: number;
  role?: string;
  email?: string;
  name?: string;
  username?: string;
}
