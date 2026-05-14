import { MapPin, Calendar } from "lucide-react";

export default function PetEventsMapPage() {
  return (
    <>
      <title>전국 반려견 행사 지도 | TALEZ</title>
      <meta
        name="description"
        content="한국에서 열리는 반려견·반려동물 행사, 펫페어, 입양 이벤트를 한눈에 확인하세요."
      />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="p-5 rounded-full bg-primary/10 mb-6">
          <Calendar className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--txt-strong)" }}>
          전국 반려견 행사 지도
        </h1>
        <p className="text-sm max-w-sm mb-8" style={{ color: "var(--txt-secondary)" }}>
          한국에서 열리는 반려견·반려동물 행사, 펫페어, 입양 이벤트를 한눈에 확인하세요.
        </p>
        <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800">
          <MapPin className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium" style={{ color: "var(--txt-secondary)" }}>
            준비 중입니다
          </span>
        </div>
      </div>
    </>
  );
}
