import { Router } from 'express';
import { logger } from '../monitoring/logger';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// Google Maps API 키
const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;

// 위치/장소 검색 API (Google Places Text Search)
router.get('/locations', async (req, res) => {
  const { search } = req.query;
  
  if (!search || typeof search !== 'string') {
    return res.status(400).json({ error: '검색어가 필요합니다.' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('GOOGLE_MAPS_API_KEY가 설정되지 않음');
    return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
  }

  try {
    const params = new URLSearchParams({
      query: search,
      key: GOOGLE_MAPS_API_KEY,
      language: 'ko',
      region: 'KR'
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);

    if (!response.ok) {
      throw new Error(`Google Places API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API 오류: ${data.status}`);
    }

    const places = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: getGooglePlaceType(place.types),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.formatted_address || '',
      phone: '',
      rating: place.rating || undefined,
      description: place.types?.[0] || '',
      certification: false,
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    }));

    console.log(`[위치 API] 검색어: "${search}", 결과: ${places.length}개`);
    res.json(places);
    
  } catch (error) {
    logServerError('장소 검색 오류:', error, req);
    res.status(500).json({ 
      error: '장소 검색에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 통합 장소 검색 API (Google Places Nearby Search)
router.get('/locations/search', async (req, res) => {
  const { query, lat, lng } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: '검색어가 필요합니다.' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('GOOGLE_MAPS_API_KEY가 설정되지 않음');
    return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
  }

  try {
    const params = new URLSearchParams({
      query: query,
      key: GOOGLE_MAPS_API_KEY,
      language: 'ko',
      region: 'KR'
    });

    if (lat && lng) {
      params.append('location', `${lat},${lng}`);
      params.append('radius', '5000');
    }

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);

    if (!response.ok) {
      throw new Error(`Google Places API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API 오류: ${data.status}`);
    }

    const places = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: getGooglePlaceType(place.types),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.formatted_address || '',
      phone: '',
      rating: place.rating || undefined,
      description: place.types?.[0] || '',
      certification: false,
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    }));

    console.log(`[장소 검색 API] 검색어: "${query}", 결과: ${places.length}개`);
    res.json(places);
    
  } catch (error) {
    logServerError('장소 검색 오류:', error, req);
    res.status(500).json({ 
      error: '장소 검색에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 카테고리별 근처 장소 검색 API (Google Places Nearby Search)
router.get('/locations/nearby', async (req, res) => {
  const { type, lat, lng, radius = '3000' } = req.query;
  
  if (!type || !lat || !lng) {
    return res.status(400).json({ error: '타입, 위도, 경도가 필요합니다.' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
  }

  try {
    // 타입별 키워드 매핑
    const typeKeywords: Record<string, string> = {
      'clinic': '동물병원',
      'shop': '애완동물용품',
      'cafe': '애견카페',
      'pension': '애견펜션',
      'park': '강아지놀이터',
      'trainer': '애견훈련',
      'institute': '애견훈련소',
      'event': '반려동물',
      'pethotel': '애견호텔'
    };

    const keyword = typeKeywords[type as string] || type;
    
    const params = new URLSearchParams({
      query: keyword,
      location: `${lat},${lng}`,
      radius: radius as string,
      key: GOOGLE_MAPS_API_KEY,
      language: 'ko',
      region: 'KR'
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);

    if (!response.ok) {
      throw new Error(`Google Places API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API 오류: ${data.status}`);
    }

    const places = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: type as string,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.formatted_address || '',
      phone: '',
      rating: place.rating || undefined,
      description: place.types?.[0] || '',
      certification: false,
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    }));

    console.log(`[근처 장소 API] 타입: ${type}, 결과: ${places.length}개`);
    res.json(places);
    
  } catch (error) {
    logServerError('근처 장소 검색 오류:', error, req);
    res.status(500).json({ 
      error: '근처 장소 검색에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Google Places 타입을 앱 타입으로 매핑
function getGooglePlaceType(types: string[]): string {
  if (!types || types.length === 0) return 'shop';
  
  for (const type of types) {
    if (type.includes('veterinary_care')) return 'clinic';
    if (type.includes('pet_store')) return 'shop';
    if (type.includes('cafe')) return 'cafe';
    if (type.includes('lodging')) return 'pension';
    if (type.includes('park')) return 'park';
    if (type.includes('restaurant')) return 'cafe';
  }
  
  return 'shop';
}

export default router;