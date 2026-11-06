/**
 * Data Engine and Google Sheets Backend Connector
 * Pure Vanilla JS — strictly reads and writes with Google Sheets.
 */

// PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL HERE:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylpeucXe9la6adHK01Mgewjv46hCQOTQyROjYU8yvV2tWCAfyJ7ePiVp1zVZX1IKKx/exec";

const CACHE_KEY = "RENTAL_MANAGER_LIVE_CACHE";

const DataStore = {
  // Return cached remote data or empty structure
  get() {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      return data ? JSON.parse(data) : { spaces: [], bookings: [], tenants: [] };
    } catch (e) {
      return { spaces: [], bookings: [], tenants: [] };
    }
  },

  saveLocalCache(db) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Local cache save failed:", e);
    }
  },

  // Pull fresh data directly from Google Sheets
  async fetchFromSheets() {
    if (!APPS_SCRIPT_URL) {
      return { 
        success: false, 
        message: "Google Apps Script URL is not configured. Please set APPS_SCRIPT_URL in data-sync.js." 
      };
    }

    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const json = await res.json();

      if (json.status === "success" && json.data) {
        const liveData = {
          spaces: Array.isArray(json.data.spaces) ? json.data.spaces : [],
          bookings: Array.isArray(json.data.bookings) ? json.data.bookings : [],
          tenants: Array.isArray(json.data.tenants) ? json.data.tenants : []
        };
        this.saveLocalCache(liveData);
        return { success: true, data: liveData };
      }
      return { success: false, message: json.message || "Failed to parse Google Sheets response." };
    } catch (err) {
      return { success: false, message: "Network error connecting to Google Sheets: " + err.toString() };
    }
  },

  // POST operations directly to Apps Script
  async postToSheets(action, payload) {
    if (!APPS_SCRIPT_URL) {
      throw new Error("Cannot save: Google Apps Script URL not configured.");
    }
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: action, payload: payload })
    });
    return await response.json();
  }
};
