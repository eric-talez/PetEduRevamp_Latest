export default function CommunityTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">커뮤니티 테스트</h1>
      
      <div className="mb-4 p-4 bg-warning/10 rounded-lg">
        <p>이 페이지가 보이면 컴포넌트가 정상적으로 렌더링되고 있습니다.</p>
      </div>
      
      <div className="mb-4 p-4 bg-primary/10 rounded-lg">
        <p>간단한 테스트 게시글:</p>
        <div className="mt-2 p-2 bg-white rounded">
          <h3 className="font-semibold">테스트 제목</h3>
          <p className="text-gray-600">테스트 내용입니다.</p>
        </div>
      </div>
    </div>
  );
}