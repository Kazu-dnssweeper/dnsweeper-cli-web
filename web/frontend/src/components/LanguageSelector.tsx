/**
 * 言語選択コンポーネント
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  Menu,
  MenuList,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  LinearProgress,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Language as LanguageIcon,
  Translate as TranslateIcon,
  Public as PublicIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useI18n } from '../hooks/useI18n';

interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  enabled: boolean;
  completeness: number;
}

interface LanguageSelectorProps {
  compact?: boolean;
  showProgress?: boolean;
  showRegion?: boolean;
  onLanguageChange?: (language: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  showProgress = false,
  showRegion = false,
  onLanguageChange
}) => {
  const { 
    currentLanguage, 
    supportedLanguages, 
    changeLanguage, 
    translate, 
    localizationContext 
  } = useI18n();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      handleClose();
      return;
    }

    setLoading(true);
    try {
      await changeLanguage(languageCode);
      onLanguageChange?.(languageCode);
    } catch (error) {
      console.error('言語変更に失敗しました:', error);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const getCurrentLanguageInfo = () => {
    return supportedLanguages.find(lang => lang.code === currentLanguage);
  };

  const getEnabledLanguages = () => {
    return supportedLanguages.filter(lang => lang.enabled);
  };

  const getBetaLanguages = () => {
    return supportedLanguages.filter(lang => lang.enabled && lang.completeness < 50);
  };

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 90) return 'success';
    if (completeness >= 70) return 'warning';
    if (completeness >= 50) return 'info';
    return 'error';
  };

  const getCompletenessIcon = (completeness: number) => {
    if (completeness >= 90) return <CheckCircleIcon fontSize="small" />;
    if (completeness >= 50) return <ScheduleIcon fontSize="small" />;
    return <WarningIcon fontSize="small" />;
  };

  const renderLanguageItem = (language: SupportedLanguage) => (
    <MenuItem
      key={language.code}
      onClick={() => handleLanguageSelect(language.code)}
      selected={language.code === currentLanguage}
      disabled={loading}
    >
      <ListItemIcon>
        <Typography variant="h6" component="span">
          {language.flag}
        </Typography>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">
              {language.name}
            </Typography>
            {language.code === currentLanguage && (
              <CheckCircleIcon color="primary" fontSize="small" />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {language.nativeName}
            </Typography>
            {showRegion && (
              <Chip
                label={language.region}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </Box>
        }
      />
      
      {showProgress && (
        <Box sx={{ ml: 2, minWidth: 60 }}>
          <Badge
            badgeContent={`${language.completeness}%`}
            color={getCompletenessColor(language.completeness) as any}
            variant="dot"
          >
            {getCompletenessIcon(language.completeness)}
          </Badge>
        </Box>
      )}
    </MenuItem>
  );

  const renderCompactSelector = () => {
    const currentLang = getCurrentLanguageInfo();
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={translate('change_language', 'common')}>
          <IconButton
            onClick={handleClick}
            size="small"
            disabled={loading}
            sx={{ 
              border: 1, 
              borderColor: 'divider',
              '&:hover': { borderColor: 'primary.main' }
            }}
          >
            <Typography variant="body2" component="span" sx={{ mr: 0.5 }}>
              {currentLang?.flag}
            </Typography>
            <LanguageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 250, maxHeight: 400 }
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {translate('select_language', 'common')}
            </Typography>
          </Box>
          <Divider />
          
          {getEnabledLanguages().map(renderLanguageItem)}
          
          {getBetaLanguages().length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {translate('beta_languages', 'common')}
                </Typography>
              </Box>
              {showBeta && getBetaLanguages().map(renderLanguageItem)}
              {!showBeta && (
                <MenuItem onClick={() => setShowBeta(true)}>
                  <ListItemIcon>
                    <InfoIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={translate('show_beta_languages', 'common')}
                    secondary={`${getBetaLanguages().length} ${translate('languages_available', 'common')}`}
                  />
                </MenuItem>
              )}
            </>
          )}
          
          <Divider />
          <MenuItem onClick={() => setSettingsOpen(true)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={translate('language_settings', 'common')} />
          </MenuItem>
        </Menu>
      </Box>
    );
  };

  const renderFullSelector = () => {
    const currentLang = getCurrentLanguageInfo();
    
    return (
      <FormControl fullWidth>
        <InputLabel>{translate('language', 'common')}</InputLabel>
        <Select
          value={currentLanguage}
          onChange={(e) => handleLanguageSelect(e.target.value)}
          disabled={loading}
          renderValue={(value) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" component="span">
                {currentLang?.flag}
              </Typography>
              <Typography variant="body1">
                {currentLang?.name}
              </Typography>
              {showRegion && (
                <Chip
                  label={currentLang?.region}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          )}
        >
          {getEnabledLanguages().map((language) => (
            <MenuItem key={language.code} value={language.code}>
              {renderLanguageItem(language)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderSettingsDialog = () => (
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          {translate('language_settings', 'common')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {translate('current_language', 'common')}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h4" component="span">
              {getCurrentLanguageInfo()?.flag}
            </Typography>
            <Box>
              <Typography variant="body1">
                {getCurrentLanguageInfo()?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getCurrentLanguageInfo()?.nativeName}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              label={translate('region', 'common') + ': ' + getCurrentLanguageInfo()?.region}
              size="small"
              variant="outlined"
            />
            <Chip
              label={translate('direction', 'common') + ': ' + getCurrentLanguageInfo()?.direction}
              size="small"
              variant="outlined"
            />
          </Box>
          
          {showProgress && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {translate('translation_completeness', 'common')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getCurrentLanguageInfo()?.completeness}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getCurrentLanguageInfo()?.completeness || 0}
                color={getCompletenessColor(getCurrentLanguageInfo()?.completeness || 0) as any}
              />
            </Box>
          )}
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {translate('regional_settings', 'common')}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {translate('timezone', 'common')}:
              </Typography>
              <Typography variant="body2">
                {localizationContext.timezone}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {translate('currency', 'common')}:
              </Typography>
              <Typography variant="body2">
                {localizationContext.currency}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {translate('date_format', 'common')}:
              </Typography>
              <Typography variant="body2">
                {localizationContext.dateFormat}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {translate('time_format', 'common')}:
              </Typography>
              <Typography variant="body2">
                {localizationContext.timeFormat}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {translate('available_languages', 'common')}
          </Typography>
          
          <List>
            {supportedLanguages.map((language) => (
              <ListItem key={language.code} divider>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent' }}>
                    <Typography variant="h6" component="span">
                      {language.flag}
                    </Typography>
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {language.name}
                      </Typography>
                      {!language.enabled && (
                        <Chip
                          label={translate('disabled', 'common')}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      {language.completeness < 50 && language.enabled && (
                        <Chip
                          label={translate('beta', 'common')}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {language.nativeName} • {language.region}
                      </Typography>
                      {language.enabled && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={language.completeness}
                            color={getCompletenessColor(language.completeness) as any}
                            sx={{ flexGrow: 1, height: 4 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {language.completeness}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          {translate('translation_help_text', 'common')}
        </Alert>
        
        <FormControlLabel
          control={
            <Switch
              checked={showBeta}
              onChange={(e) => setShowBeta(e.target.checked)}
            />
          }
          label={translate('show_beta_languages', 'common')}
        />
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setSettingsOpen(false)}>
          {translate('close', 'common')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      {compact ? renderCompactSelector() : renderFullSelector()}
      {renderSettingsDialog()}
    </>
  );
};

export default LanguageSelector;