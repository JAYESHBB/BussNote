// Helper functions for storing and retrieving settings

// Default settings values
const defaultSettings = {
  companyName: "BussNote",
  contactEmail: "support@bussnote.com",
  defaultCurrency: "INR",
  dateFormat: "DD/MM/YYYY",
  autoLogout: "30",
  enableNotifications: true
};

// Key for localStorage
const SETTINGS_KEY = "bussnote_settings";

/**
 * Get the current stored settings or default values
 */
export function getSettings() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
    return defaultSettings;
  } catch (error) {
    console.error("Error retrieving settings:", error);
    return defaultSettings;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: any) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

/**
 * Get a specific setting value
 */
export function getSetting(key: string) {
  const settings = getSettings();
  return settings[key] || defaultSettings[key as keyof typeof defaultSettings];
}

/**
 * Save a specific setting value
 */
export function saveSetting(key: string, value: any) {
  const settings = getSettings();
  settings[key] = value;
  return saveSettings(settings);
}

/**
 * Get the default currency
 */
export function getDefaultCurrency() {
  return getSetting("defaultCurrency") || "INR";
}