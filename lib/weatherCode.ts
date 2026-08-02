// Open-Meteo's `weather_code` is the standard WMO weather interpretation code.
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")

export interface WeatherCondition {
  label: string;
  icon: string;
}

const WEATHER_CODES: Record<number, WeatherCondition> = {
  0: { label: "Clear Sky", icon: "☀️" },
  1: { label: "Mainly Clear", icon: "🌤️" },
  2: { label: "Partly Cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime Fog", icon: "🌫️" },
  51: { label: "Light Drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Dense Drizzle", icon: "🌧️" },
  56: { label: "Light Freezing Drizzle", icon: "🌧️" },
  57: { label: "Freezing Drizzle", icon: "🌧️" },
  61: { label: "Light Rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy Rain", icon: "🌧️" },
  66: { label: "Light Freezing Rain", icon: "🌧️" },
  67: { label: "Freezing Rain", icon: "🌧️" },
  71: { label: "Light Snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy Snow", icon: "❄️" },
  77: { label: "Snow Grains", icon: "🌨️" },
  80: { label: "Light Rain Showers", icon: "🌦️" },
  81: { label: "Rain Showers", icon: "🌧️" },
  82: { label: "Violent Rain Showers", icon: "⛈️" },
  85: { label: "Light Snow Showers", icon: "🌨️" },
  86: { label: "Heavy Snow Showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with Hail", icon: "⛈️" },
  99: { label: "Severe Thunderstorm with Hail", icon: "⛈️" },
};

export function describeWeatherCode(code: number): WeatherCondition {
  return WEATHER_CODES[code] ?? { label: "Unknown", icon: "❔" };
}
