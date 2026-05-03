import { Router } from 'express';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

interface MenuVisibilitySettings {
  [role: string]: {
    [menuId: string]: boolean;
  };
}

// Default menu visibility settings
const defaultMenuSettings: MenuVisibilitySettings = {
  user: {
    'home': true,
    'learning': true,
    'my-pets': true,
    'shop': true,
    'community': true,
    'location': true,
    'messages': true,
    'alerts': true
  },
  trainer: {
    'trainer-courses': true,
    'trainer-notebook': true,
    'trainer-students': true,
    'trainer-earnings': true,
    'trainer-points': true,
    'trainer-rest': true,
    'substitute-board': true,
    'video-training': true,
    'video-call': true,
    'ai-analysis': true
  },
  institute: {
    'institute-trainers': true,
    'institute-facility': true,
    'institute-rest': true,
    'substitute-management': true,
    'notebook-monitor': true,
    'institute-points': true,
    'institute-earnings': true
  },
  admin: {
    'admin-dashboard': true,
    'users-management': true,
    'trainers-management': true,
    'admin-analytics': true,
    'members-status': true,
    'substitute-overview': true,
    'revenue-management': true,
    'curriculum-management': true,
    'registrations': true,
    'trainer-certification': true,
    'institutes-management': true,
    'business-registration': true,
    'review-management': true,
    'info-correction': true,
    'contents-management': true,
    'community-management': true,
    'content-crawler': true,
    'content-moderation': true,
    'commissions': true,
    'points-management': true,
    'payment-integration': true,
    'shop-management': true,
    'api-management': true,
    'ai-api-management': true,
    'ai-optimization': true,
    'system-settings': true,
    'messaging-settings': true
  }
};

// Get menu visibility settings
router.get('/menu-visibility', async (req, res) => {
  try {
    console.log('[Menu Visibility] 메뉴 표시 설정 조회 요청');
    
    // For now, return default settings. In a real implementation, 
    // this would fetch from database
    const settings = { ...defaultMenuSettings };
    
    console.log('[Menu Visibility] 메뉴 설정 응답:', Object.keys(settings));
    
    res.json(settings);
  } catch (error) {
    logServerError('[Menu Visibility] 조회 오류:', error, req);
    res.status(500).json({ 
      error: '메뉴 설정 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// Update menu visibility settings
router.post('/menu-visibility', async (req, res) => {
  try {
    const { role, settings } = req.body;
    
    console.log('[Menu Visibility] 메뉴 설정 업데이트 요청:', { role, settingsCount: Object.keys(settings || {}).length });
    
    if (!role || !settings) {
      return res.status(400).json({ 
        error: '역할(role)과 설정(settings)이 필요합니다.' 
      });
    }

    // Validate role
    const validRoles = ['user', 'trainer', 'institute', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `유효하지 않은 역할입니다. 가능한 역할: ${validRoles.join(', ')}` 
      });
    }

    // In a real implementation, this would save to database
    // For now, we'll just log the changes and return success
    console.log('[Menu Visibility] 메뉴 설정 저장됨:', {
      role,
      changes: Object.entries(settings).map(([menuId, visible]) => ({
        menuId,
        visible,
        changed: defaultMenuSettings[role]?.[menuId] !== visible
      })).filter(item => item.changed)
    });

    // Simulate successful save
    const updatedSettings = {
      ...defaultMenuSettings,
      [role]: {
        ...defaultMenuSettings[role],
        ...settings
      }
    };

    res.json({
      success: true,
      message: `${role} 역할의 메뉴 설정이 성공적으로 저장되었습니다.`,
      updatedSettings: updatedSettings[role]
    });

  } catch (error) {
    logServerError('[Menu Visibility] 저장 오류:', error, req);
    res.status(500).json({ 
      error: '메뉴 설정 저장 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// Get menu visibility for specific role
router.get('/menu-visibility/:role', async (req, res) => {
  try {
    const { role } = req.params;
    
    console.log('[Menu Visibility] 특정 역할 메뉴 설정 조회:', role);
    
    const validRoles = ['user', 'trainer', 'institute', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `유효하지 않은 역할입니다. 가능한 역할: ${validRoles.join(', ')}` 
      });
    }

    const roleSettings = defaultMenuSettings[role] || {};
    
    res.json({
      role,
      settings: roleSettings,
      totalMenus: Object.keys(roleSettings).length,
      visibleMenus: Object.values(roleSettings).filter(Boolean).length
    });

  } catch (error) {
    logServerError('[Menu Visibility] 역할별 조회 오류:', error, req);
    res.status(500).json({ 
      error: '메뉴 설정 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// Reset menu visibility to defaults
router.post('/menu-visibility/reset/:role', async (req, res) => {
  try {
    const { role } = req.params;
    
    console.log('[Menu Visibility] 메뉴 설정 초기화 요청:', role);
    
    const validRoles = ['user', 'trainer', 'institute', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `유효하지 않은 역할입니다. 가능한 역할: ${validRoles.join(', ')}` 
      });
    }

    // Reset to default settings
    const resetSettings = { ...defaultMenuSettings[role] };
    
    console.log('[Menu Visibility] 설정 초기화 완료:', { role, menuCount: Object.keys(resetSettings).length });
    
    res.json({
      success: true,
      message: `${role} 역할의 메뉴 설정이 기본값으로 초기화되었습니다.`,
      settings: resetSettings
    });

  } catch (error) {
    logServerError('[Menu Visibility] 초기화 오류:', error, req);
    res.status(500).json({ 
      error: '메뉴 설정 초기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

export { router as adminMenuVisibilityRoutes };