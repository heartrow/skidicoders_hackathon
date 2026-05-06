export type ControlType = "led_lighting" | "cooling_fan" | "water_pump" | "nutrient_pump";

export interface PlantProfile {
  name: string;
  cropKey: string;
  tempRange: [number, number];
  humidityRange: [number, number];
  phRange: [number, number];
  soilMoistureRange: [number, number];
  lightHoursPerDay: number;
  description: string;
  isCustom?: boolean;
}

export const BUILTIN_CROP_TYPES = [
  "Lettuce",
  "Herbs",
  "Microgreens",
  "Tomatoes",
  "Spinach",
  "Kale",
  "Strawberry",
  "Basil & Mint",
] as const;

export type BuiltinCropType = (typeof BUILTIN_CROP_TYPES)[number];

export const PLANT_PROFILES: Record<string, PlantProfile> = {
  Lettuce: {
    name: "Lettuce",
    cropKey: "Lettuce",
    tempRange: [18, 24],
    humidityRange: [60, 75],
    phRange: [6.0, 7.0],
    soilMoistureRange: [60, 80],
    lightHoursPerDay: 14,
    description: "Cool-season crop. Prefers moderate temps and high humidity.",
  },
  Herbs: {
    name: "Herbs",
    cropKey: "Herbs",
    tempRange: [20, 27],
    humidityRange: [50, 70],
    phRange: [6.0, 6.8],
    soilMoistureRange: [55, 75],
    lightHoursPerDay: 16,
    description: "Basil, mint, cilantro. Needs warmth and good airflow.",
  },
  Microgreens: {
    name: "Microgreens",
    cropKey: "Microgreens",
    tempRange: [18, 24],
    humidityRange: [50, 65],
    phRange: [5.8, 6.5],
    soilMoistureRange: [50, 70],
    lightHoursPerDay: 12,
    description: "Fast-growing seedlings. Sensitive to humidity — avoid overwatering.",
  },
  Tomatoes: {
    name: "Tomatoes",
    cropKey: "Tomatoes",
    tempRange: [20, 27],
    humidityRange: [65, 80],
    phRange: [5.8, 6.8],
    soilMoistureRange: [65, 85],
    lightHoursPerDay: 16,
    description: "Warm-season fruiting crop. Needs high light and consistent moisture.",
  },
  Spinach: {
    name: "Spinach",
    cropKey: "Spinach",
    tempRange: [15, 22],
    humidityRange: [55, 70],
    phRange: [6.0, 7.0],
    soilMoistureRange: [60, 75],
    lightHoursPerDay: 12,
    description: "Cool-season leafy green. Bolts in high heat — keep temps low.",
  },
  Kale: {
    name: "Kale",
    cropKey: "Kale",
    tempRange: [15, 25],
    humidityRange: [55, 70],
    phRange: [6.0, 7.0],
    soilMoistureRange: [55, 75],
    lightHoursPerDay: 14,
    description: "Hardy brassica. Tolerates cool conditions. Consistent watering needed.",
  },
  Strawberry: {
    name: "Strawberry",
    cropKey: "Strawberry",
    tempRange: [18, 26],
    humidityRange: [65, 80],
    phRange: [5.5, 6.5],
    soilMoistureRange: [60, 80],
    lightHoursPerDay: 14,
    description: "Fruiting plant. Sensitive to pH. Needs high humidity and good drainage.",
  },
  "Basil & Mint": {
    name: "Basil & Mint",
    cropKey: "Basil & Mint",
    tempRange: [20, 28],
    humidityRange: [50, 68],
    phRange: [6.0, 7.0],
    soilMoistureRange: [50, 70],
    lightHoursPerDay: 16,
    description: "Aromatic herbs. Prefer warmth and slightly drier soil between waterings.",
  },
};

const CUSTOM_PROFILES_KEY = "vertigrow_custom_profiles";

export function loadCustomProfiles(): Record<string, PlantProfile> {
  try {
    const raw = localStorage.getItem(CUSTOM_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlantProfile>) : {};
  } catch {
    return {};
  }
}

export function saveCustomProfile(profile: PlantProfile): void {
  const existing = loadCustomProfiles();
  existing[profile.cropKey] = { ...profile, isCustom: true };
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(existing));
}

export function deleteCustomProfile(cropKey: string): void {
  const existing = loadCustomProfiles();
  delete existing[cropKey];
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(existing));
}

export function getAllProfiles(): Record<string, PlantProfile> {
  return { ...PLANT_PROFILES, ...loadCustomProfiles() };
}

/** AI-generated default profile for unknown crop types. */
export function aiDefaultProfile(cropName: string): PlantProfile {
  return {
    name: cropName,
    cropKey: cropName,
    tempRange: [18, 26],
    humidityRange: [55, 75],
    phRange: [5.8, 6.8],
    soilMoistureRange: [55, 75],
    lightHoursPerDay: 14,
    description: `AI-generated profile for ${cropName}. Balanced defaults — adjust as needed.`,
    isCustom: true,
  };
}

/** Match a crop type string to the nearest plant profile key. Falls back to Lettuce. */
export function matchProfile(cropType: string): PlantProfile {
  const all = getAllProfiles();
  const exact = all[cropType];
  if (exact) return exact;
  const key = Object.keys(all).find(k =>
    cropType.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(cropType.toLowerCase())
  );
  return all[key ?? "Lettuce"];
}

export interface SensorSnapshot {
  temperature: number;
  humidity: number;
  phLevel: number;
  soilMoisture: number;
}

export interface ControlRecommendation {
  type: ControlType;
  isActive: boolean;
  intensity: number;
  reason: string;
}

/** Derive recommended control states from current sensor readings vs. plant profile. */
export function computeAutoControls(
  sensor: SensorSnapshot,
  profile: PlantProfile
): ControlRecommendation[] {
  const recs: ControlRecommendation[] = [];

  const ledIntensity = sensor.temperature < profile.tempRange[0] ? 90 : 70;
  recs.push({
    type: "led_lighting",
    isActive: true,
    intensity: ledIntensity,
    reason:
      sensor.temperature < profile.tempRange[0]
        ? "Boosted to add warmth — temperature below optimal"
        : "Running at standard schedule intensity",
  });

  const fanOn = sensor.temperature > profile.tempRange[1];
  recs.push({
    type: "cooling_fan",
    isActive: fanOn,
    intensity: fanOn ? Math.min(100, Math.round(((sensor.temperature - profile.tempRange[1]) / 5) * 60 + 50)) : 0,
    reason: fanOn
      ? `Temperature ${sensor.temperature.toFixed(1)}°C exceeds ${profile.tempRange[1]}°C limit`
      : "Temperature within optimal range — fan idle",
  });

  const pumpOn = sensor.soilMoisture < profile.soilMoistureRange[0];
  recs.push({
    type: "water_pump",
    isActive: pumpOn,
    intensity: pumpOn ? 60 : 0,
    reason: pumpOn
      ? `Soil moisture ${sensor.soilMoisture.toFixed(0)}% below ${profile.soilMoistureRange[0]}% threshold`
      : "Soil moisture sufficient — pump paused",
  });

  const nutrientOn = sensor.phLevel < profile.phRange[0] || sensor.phLevel > profile.phRange[1];
  recs.push({
    type: "nutrient_pump",
    isActive: nutrientOn,
    intensity: nutrientOn ? 50 : 0,
    reason: nutrientOn
      ? `pH ${sensor.phLevel.toFixed(2)} is outside optimal ${profile.phRange[0]}–${profile.phRange[1]} range`
      : "pH balanced — nutrient pump standby",
  });

  return recs;
}
