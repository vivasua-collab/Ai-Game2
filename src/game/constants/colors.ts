/**
 * Game Color Constants
 * 
 * Centralized color definitions for consistent theming.
 */

export const COLORS = {
  // UI Colors
  primary: 0x4ade80,
  secondary: 0x3b82f6,
  danger: 0xef4444,
  warning: 0xf59e0b,
  
  // Qi Colors
  qi: 0x3b82f6,
  qiGlow: 0x60a5fa,
  
  // Health Colors
  health: 0x4ade80,
  healthLow: 0xef4444,
  
  // Background Colors
  background: 0x1a1a2e,
  backgroundDark: 0x0f0f1a,
  
  // UI Elements
  panel: 0x2a2a3e,
  panelLight: 0x3a3a4e,
  border: 0x4a4a5e,
  
  // Text Colors (for Phaser text objects)
  text: '#ffffff',
  textMuted: '#9ca3af',
  textHighlight: '#fbbf24',
} as const;
