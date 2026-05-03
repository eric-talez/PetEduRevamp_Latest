import { useAuth } from '@/lib/auth-compat';
import { NotebookHomeCard } from '@/components/notebook/NotebookHomeCard';

export default function PetOwnerHome() {
  const { userName } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">반려인 대시보드</h1>
      <p className="text-lg mb-4">안녕하세요, {userName}님!</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-6">
        <NotebookHomeCard />
      </div>
    </div>
  );
}
