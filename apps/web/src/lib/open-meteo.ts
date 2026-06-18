export interface ClimaAtual {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  observedAt: string;
}

const WMO_LABELS: Record<number, string> = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa forte",
  56: "Garoa congelante leve",
  57: "Garoa congelante forte",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante leve",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas de chuva leves",
  81: "Pancadas de chuva moderadas",
  82: "Pancadas de chuva fortes",
  85: "Pancadas de neve leves",
  86: "Pancadas de neve fortes",
  95: "Tempestade",
  96: "Tempestade com granizo leve",
  99: "Tempestade com granizo forte",
};

export function climaWeatherLabel(code: number): string {
  return WMO_LABELS[code] ?? "Condição desconhecida";
}

export function climaWindDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"] as const;
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export async function fetchClimaAtual(
  lat: number,
  lng: number
): Promise<ClimaAtual> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
  );
  url.searchParams.set("timezone", "America/Sao_Paulo");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Falha ao obter clima");

  const json = (await res.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      wind_direction_10m?: number;
    };
  };

  const c = json.current;
  if (
    c?.temperature_2m == null ||
    c.relative_humidity_2m == null ||
    c.weather_code == null
  ) {
    throw new Error("Resposta de clima incompleta");
  }

  return {
    temperatureC: c.temperature_2m,
    apparentTemperatureC: c.apparent_temperature ?? c.temperature_2m,
    humidityPct: c.relative_humidity_2m,
    precipitationMm: c.precipitation ?? 0,
    windSpeedKmh: c.wind_speed_10m ?? 0,
    windDirectionDeg: c.wind_direction_10m ?? 0,
    weatherCode: c.weather_code,
    observedAt: c.time ?? new Date().toISOString(),
  };
}
