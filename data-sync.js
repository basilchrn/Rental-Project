/**
 * Offline-first Data Engine and Google Sheets Backend Connector
 * Uses pure Vanilla JS with zero external dependencies.
 */

// OPTIONAL: Paste your deployed Google Apps Script URL here when ready.
// If left empty, the application functions 100% offline via localStorage.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylpeucXe9la6adHK01Mgewjv46hCQOTQyROjYU8yvV2tWCAfyJ7ePiVp1zVZX1IKKx/exec";

const STORAGE_KEY = "RENTAL_MANAGER_DB_V1";

// Default Seed Data
const DEFAULT_DB = {
  spaces: [
    { space_id: "SP-01", name: "North Hall (Capacity: 100)", full_day_rate: 8000, half_day_rate: 4500, default_deposit: 2000, allowed_options: "FullDay, CombinedDays", status: "Available" },
    { space_id: "SP-02", name: "Studio A (A/C, Soundproof)", full_day_rate: 5000, half_day_rate: 3000, default_deposit: 1500, allowed_options: "FullDay, HalfDay", status: "Available" },
    { space_id: "SP-03", name: "Rooftop Open Terrace", full_day_rate: 6000, half_day_rate: 3500, default_deposit: 2000, allowed_options: "FullDay, CombinedDays", status: "Available" },
    { space_id: "SP-04", name: "Conference Suite B", full_day_rate: 3500, half_day_rate: 2000, default_deposit: 1000, allowed_options: "FullDay, HalfDay", status: "Available" }
  ],
  bookings: [],
  tenants: []
};

// Data Store Controller
const DataStore = {
  get() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : JSON.parse(JSON.stringify(DEFAULT_DB));
    } catch (e) {
      console.warn("Storage read error, using fallback data:", e);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
  },

  save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Storage save failed:", e);
    }
  },

  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.get(), null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `Rental_Data_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  importJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.spaces && parsed.bookings && parsed.tenants) {
          this.save(parsed);
          callback(true, "Data imported successfully.");
        } else {
          callback(false, "Invalid data structure in backup file.");
        }
      } catch (err) {
        callback(false, "Error reading JSON file.");
      }
    };
    reader.readAsText(file);
  },

  async syncWithSheets() {
    if (!APPS_SCRIPT_URL) {
      return { success: false, message: "Apps Script URL not set. Operating in offline localStorage mode." };
    }
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        const local = this.get();
        if (json.data.spaces && json.data.spaces.length) local.spaces = json.data.spaces;
        local.bookings = json.data.bookings || [];
        local.tenants = json.data.tenants || [];
        this.save(local);
        return { success: true, message: "Synced cleanly with Google Sheets." };
      }
      return { success: false, message: "Sheets returned unexpected response." };
    } catch (err) {
      return { success: false, message: err.toString() };
    }
  },

  async postToSheets(action, payload) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: action, payload: payload })
      });
    } catch (err) {
      console.error("Sheets push error:", err);
    }
  }
};
