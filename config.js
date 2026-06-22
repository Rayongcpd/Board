// config.js - Application configuration
// This file centralizes all configurable values

const CONFIG = {
  // Google Apps Script Web App Deployment URL
  API_BASE: "https://script.google.com/macros/s/AKfycbx6TUKnPE5N_mUsgafTHH-6-z3SaizfpbUkAGQY1fmw0deUTaY1nozIsKhnSX1JzUj8/exec",

  // Content Security Policy
  CSP: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src https://script.google.com; frame-src 'none'; object-src 'none';",

  // App metadata
  APP_NAME: "ระบบตรวจสอบวาระกรรมการสหกรณ์",
  APP_DESCRIPTION: "ระบบตรวจสอบวาระการดำรงตำแหน่งกรรมการดำเนินการสหกรณ์ ตามพ.ร.บ. สหกรณ์ และข้อบงคับมาตรฐาน",

  // Default values
  DEFAULT_BOARD_SIZE: 15,
  DEFAULT_TERM_DURATION_YEARS: 2,
  DEFAULT_MAX_CONSECUTIVE_TERMS: 2,
  DEFAULT_COOLING_OFF_TERMS: 1,

  // Cache settings
  CACHE_ENABLED: true,
  CACHE_TTL_MS: 300000, // 5 minutes

  // UI settings
  TOAST_DURATION_MS: 4000,
  TOAST_MAX_VISIBLE: 3,

  // Year range for dropdown (relative to current year)
  YEAR_DROPDOWN_OFFSET_MIN: 3,
  YEAR_DROPDOWN_OFFSET_MAX: 3
};

// Helper to check if API is in mock mode
function isMockMode() {
  return CONFIG.API_BASE.includes("<DEPLOY_ID>");
}
