const WEATHER_CODES = {
  0: ["맑음", "☀️"],
  1: ["대체로 맑음", "🌤️"],
  2: ["구름 조금", "⛅"],
  3: ["흐림", "☁️"],
  45: ["안개", "🌫️"],
  48: ["짙은 안개", "🌫️"],
  51: ["약한 이슬비", "🌦️"],
  53: ["이슬비", "🌦️"],
  55: ["강한 이슬비", "🌧️"],
  61: ["약한 비", "🌦️"],
  63: ["비", "🌧️"],
  65: ["강한 비", "🌧️"],
  71: ["약한 눈", "🌨️"],
  73: ["눈", "❄️"],
  75: ["강한 눈", "❄️"],
  80: ["약한 소나기", "🌦️"],
  81: ["소나기", "🌧️"],
  82: ["강한 소나기", "⛈️"],
  95: ["뇌우", "⛈️"],
  96: ["우박 동반 뇌우", "⛈️"],
  99: ["강한 우박 동반 뇌우", "⛈️"],
};

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const result = document.getElementById("result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;

  result.innerHTML = `<p class="loading">날씨를 확인하는 중...</p>`;

  try {
    const place = await geocode(city);
    if (!place) {
      result.innerHTML = `<p class="error">"${escapeHtml(city)}"을(를) 찾을 수 없어요. 다른 이름으로 시도해보세요.</p>`;
      return;
    }

    const weather = await fetchWeather(place.latitude, place.longitude);
    renderWeather(place, weather);
  } catch (err) {
    result.innerHTML = `<p class="error">날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>`;
  }
});

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=ko&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current_weather;
}

function renderWeather(place, weather) {
  const [desc, emoji] = WEATHER_CODES[weather.weathercode] || ["알 수 없음", "🌡️"];
  const locationName = [place.name, place.admin1, place.country]
    .filter(Boolean)
    .join(", ");

  result.innerHTML = `
    <div class="weather-card">
      <div class="emoji">${emoji}</div>
      <div>
        <div class="place">${escapeHtml(locationName)}</div>
        <div class="temp">${Math.round(weather.temperature)}°C</div>
        <div class="desc">${desc} · 풍속 ${weather.windspeed} km/h</div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
