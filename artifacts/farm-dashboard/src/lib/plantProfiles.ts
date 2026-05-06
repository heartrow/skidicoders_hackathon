export type ControlType = "led_lighting" | "cooling_fan" | "water_pump" | "nutrient_pump";

export interface PlantProfile {
  name: string;
  tempRange: [number, number];
  humidityRange: [number, number];
  phRange: [number, number];
  soilMoistureRange: [number, number];
  lightHoursPerDay: number;
  description: string;
}

export const PLANT_PROFILES: Record<string, PlantProfile> = {
  Lettuce: {
    name: "Lettuce",
    tempRange: [18, 24],
    humidityRange: [60, 75],
    phRange: [6.0, 7.0],
    soilMoistureRange: [60, 80],
    lightHoursPerDay: 14,
    description: "Cool-season crop. Prefers moderate temps and high humidity.",
  },
  Herbs: {
    name: "Herbs",
    tempRange: [20, 27],
    humidityRange: [50, 70],
    phRange: [6.0, 6.8],
    soilMoistureRange: [55, 75],
    lightHoursPerDay: 16,
    description: "Basil, mint, cilantro. Needs warmth and good airflow.",
  },
  Microgreens: {
    name: "Microgreens",
    tempRange: [18, 24],
    humidityRange: [50, 65],
    phRange: [5.8, 6.5],
    soilMoistureRange: [50, 70],
    lightHoursPerDay: 12,
    description: "Fast-growing seedlings. Sensitive to humidity — avoid overwatering.",
  },
};

/** Match a crop type string to the nearest plant profile key. Falls back to Lettuce. */
export function matchProfile(cropType: string): PlantProfile {
  const key = Object.keys(PLANT_PROFILES).find(k =>
    cropType.toLowerCase().includes(k.toLowerCase())
  );
  return PLANT_PROFILES[key ?? "Lettuce"];
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

/**
 * Derive recommended control states from current sensor readings vs. plant profile.
 */
export function computeAutoControls(
  sensor: SensorSnapshot,
  profile: PlantProfile
): ControlRecommendation[] {
  const recs: ControlRecommendation[] = [];

  // LED lighting — always on (scheduled), intensity varies with temp
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

  // Cooling fan — on when temp exceeds upper bound
  const fanOn = sensor.temperature > profile.tempRange[1];
  recs.push({
    type: "cooling_fan",
    isActive: fanOn,
    intensity: fanOn ? Math.min(100, Math.round(((sensor.temperature - profile.tempRange[1]) / 5) * 60 + 50)) : 0,
    reason: fanOn
      ? `Temperature ${sensor.temperature.toFixed(1)}°C exceeds ${profile.tempRange[1]}°C limit`
      : "Temperature within optimal range — fan idle",
  });

  // Water pump — on when soil moisture below lower bound
  const pumpOn = sensor.soilMoisture < profile.soilMoistureRange[0];
  recs.push({
    type: "water_pump",
    isActive: pumpOn,
    intensity: pumpOn ? 60 : 0,
    reason: pumpOn
      ? `Soil moisture ${sensor.soilMoisture.toFixed(0)}% below ${profile.soilMoistureRange[0]}% threshold`
      : "Soil moisture sufficient — pump paused",
  });

  // Nutrient pump — on when pH out of range
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
