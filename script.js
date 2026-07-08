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

// 24/7 공개 라이브 스트림 중 임베드가 허용된 것만 선별했어요.
// 필요한 지역을 계속 추가할 수 있어요.
const CURATED_CAMS = [
  { match: ["서울", "seoul"], videoId: "zuWxsbV-mlA", label: "광화문대로 실시간 라이브" },
  { match: ["뉴욕", "new york"], videoId: "z-jYdOIKcTQ", label: "타임스퀘어 실시간 라이브" },
];

const DEFAULT_LOCATION = { name: "서울", admin1: null, country: "대한민국", latitude: 37.5665, longitude: 126.978 };
const FAVORITES_KEY = "weather-app-favorites";

function findCam(place) {
  const text = `${place.name || ""} ${place.country || ""}`.toLowerCase();
  return CURATED_CAMS.find((cam) => cam.match.some((keyword) => text.includes(keyword.toLowerCase())));
}

function locationLabel(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function locationId(place) {
  return `${place.latitude.toFixed(2)}_${place.longitude.toFixed(2)}`;
}

async function geocodeByName(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=ko&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return { name: r.name, admin1: r.admin1, country: r.country, latitude: r.latitude, longitude: r.longitude };
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`;
    const res = await fetch(url);
    const data = await res.json();
    const name = data.city || data.locality || data.principalSubdivision || "내 위치";
    return { name, admin1: data.principalSubdivision, country: data.countryName, latitude: lat, longitude: lon };
  } catch {
    return { name: "내 위치", admin1: null, country: null, latitude: lat, longitude: lon };
  }
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current_weather;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function weatherRowHtml(place, weather, { showFavButton = false, isFavorited = false, showRemove = false } = {}) {
  const [desc, emoji] = WEATHER_CODES[weather.weathercode] || ["알 수 없음", "🌡️"];
  const cam = findCam(place);
  const camHtml = cam
    ? `<div class="cam-embed">
        <iframe
          src="https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1"
          title="${escapeHtml(cam.label)}"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
        <div class="cam-label">🔴 ${escapeHtml(cam.label)}</div>
      </div>`
    : `<div class="cam-placeholder">이 지역의 실시간 라이브 영상은 아직 준비되지 않았어요.</div>`;

  const favBtn = showFavButton
    ? `<button class="fav-btn ${isFavorited ? "is-fav" : ""}" data-id="${locationId(place)}">
        ${isFavorited ? "⭐ 즐겨찾기됨" : "☆ 즐겨찾기 추가"}
      </button>`
    : "";

  const removeBtn = showRemove
    ? `<button class="remove-btn" data-id="${locationId(place)}">즐겨찾기에서 삭제</button>`
    : "";

  return `
    <div class="weather-row" data-id="${locationId(place)}">
      <div class="weather-info">
        <div class="place">${escapeHtml(locationLabel(place))}</div>
        <div class="temp-line">
          <span class="emoji">${emoji}</span>
          <span class="temp">${Math.round(weather.temperature)}°C</span>
        </div>
        <div class="desc">${desc} · 풍속 ${weather.windspeed} km/h</div>
        <div class="row-actions">${favBtn}${removeBtn}</div>
      </div>
      <div class="weather-cam">${camHtml}</div>
    </div>
  `;
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function isFavorited(place) {
  return getFavorites().some((f) => locationId(f) === locationId(place));
}

function toggleFavorite(place) {
  const list = getFavorites();
  const id = locationId(place);
  const idx = list.findIndex((f) => locationId(f) === id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(place);
  }
  saveFavorites(list);
}

function ensureSeedFavorite() {
  if (localStorage.getItem(FAVORITES_KEY) === null) {
    saveFavorites([DEFAULT_LOCATION]);
  }
}

// ---------- 내 위치 ----------
const myLocationPanel = document.getElementById("panel-mylocation");

async function loadMyLocation() {
  const panel = myLocationPanel;
  panel.innerHTML = `<div class="panel-loading">위치를 확인하는 중...</div>`;

  if (!navigator.geolocation) {
    await showMyLocationFallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        const weather = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        panel.innerHTML = weatherRowHtml(place, weather, {
          showFavButton: true,
          isFavorited: isFavorited(place),
        });
        bindFavButtons(panel, place);
      } catch {
        panel.innerHTML = `<p class="error">날씨 정보를 불러오지 못했어요.</p>`;
      }
    },
    async () => {
      await showMyLocationFallback();
    },
    { timeout: 8000 }
  );
}

async function showMyLocationFallback() {
  const panel = myLocationPanel;
  try {
    const weather = await fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
    panel.innerHTML = `
      <p class="fallback-note">위치 권한이 없어 기본 도시로 표시하고 있어요. <button class="retry-btn" id="retry-location">다시 시도</button></p>
      ${weatherRowHtml(DEFAULT_LOCATION, weather, { showFavButton: true, isFavorited: isFavorited(DEFAULT_LOCATION) })}
    `;
    document.getElementById("retry-location").addEventListener("click", loadMyLocation);
    bindFavButtons(panel, DEFAULT_LOCATION);
  } catch {
    panel.innerHTML = `<p class="error">날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>`;
  }
}

function bindFavButtons(container, place) {
  const btn = container.querySelector(".fav-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    toggleFavorite(place);
    const nowFav = isFavorited(place);
    btn.classList.toggle("is-fav", nowFav);
    btn.textContent = nowFav ? "⭐ 즐겨찾기됨" : "☆ 즐겨찾기 추가";
    renderFavorites();
  });
}

// ---------- 즐겨찾기 ----------
async function renderFavorites() {
  const list = getFavorites();
  const container = document.getElementById("favorites-list");

  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">즐겨찾기한 위치가 없어요. 위 검색창에서 추가해보세요.</p>`;
    return;
  }

  container.innerHTML = list.map(() => `<div class="panel-loading">불러오는 중...</div>`).join("");

  const rows = await Promise.all(
    list.map(async (place) => {
      try {
        const weather = await fetchWeather(place.latitude, place.longitude);
        return weatherRowHtml(place, weather, { showRemove: true });
      } catch {
        return `<p class="error">${escapeHtml(locationLabel(place))} 날씨를 불러오지 못했어요.</p>`;
      }
    })
  );

  container.innerHTML = rows.join("");
  container.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const remaining = getFavorites().filter((f) => locationId(f) !== btn.dataset.id);
      saveFavorites(remaining);
      renderFavorites();
    });
  });
}

// ---------- 검색 ----------
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchResult = document.getElementById("search-result");

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  searchResult.innerHTML = `<p class="loading">날씨를 확인하는 중...</p>`;

  try {
    const place = await geocodeByName(city);
    if (!place) {
      searchResult.innerHTML = `<p class="error">"${escapeHtml(city)}"을(를) 찾을 수 없어요. 다른 이름으로 시도해보세요.</p>`;
      return;
    }
    const weather = await fetchWeather(place.latitude, place.longitude);
    searchResult.innerHTML = weatherRowHtml(place, weather, {
      showFavButton: true,
      isFavorited: isFavorited(place),
    });
    bindFavButtons(searchResult, place);
  } catch {
    searchResult.innerHTML = `<p class="error">날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>`;
  }
});

// ---------- 초기화 ----------
ensureSeedFavorite();
loadMyLocation();
renderFavorites();
