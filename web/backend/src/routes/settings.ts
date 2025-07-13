/**
 * Settings Routes
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { SettingsService } from '../services/settings-service.js';

const router = Router();
const settingsService = new SettingsService();

/**
 * GET /api/v1/settings
 * 設定の取得
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    logger.error('Settings retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/settings
 * 設定の更新
 */
router.put('/', async (req, res) => {
  try {
    const newSettings = req.body;

    const updatedSettings = await settingsService.updateSettings(newSettings);

    logger.info('Settings updated successfully');

    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    logger.error('Settings update error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/settings/default
 * デフォルト設定の取得
 */
router.get('/default', async (req, res) => {
  try {
    const defaultSettings = await settingsService.getDefaultSettings();

    res.json({
      success: true,
      settings: defaultSettings
    });

  } catch (error) {
    logger.error('Default settings retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve default settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/settings/reset
 * 設定のリセット
 */
router.post('/reset', async (req, res) => {
  try {
    const resetSettings = await settingsService.resetSettings();

    logger.info('Settings reset to default');

    res.json({
      success: true,
      settings: resetSettings,
      message: 'Settings reset to default values'
    });

  } catch (error) {
    logger.error('Settings reset error:', error);
    res.status(500).json({
      error: 'Failed to reset settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as settingsRouter };