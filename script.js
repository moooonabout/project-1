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

// 도시 + 명소 단위로 미리 등록해둔 위치예요. 검색 자동완성과 실시간 라이브캠 매칭에 쓰여요.
// cam이 null이면 해당 위치의 라이브 영상은 아직 준비되지 않은 거예요.
const CURATED_LOCATIONS = [
  {
    type: "city",
    name: "서울",
    label: "서울, 대한민국",
    latitude: 37.5665,
    longitude: 126.978,
    keywords: ["서울", "seoul"],
    cam: { videoId: "cl87UIF0VqI", label: "경복궁 실시간 라이브" },
  },
  {
    type: "city",
    name: "도쿄",
    label: "도쿄, 일본",
    latitude: 35.6762,
    longitude: 139.6503,
    keywords: ["도쿄", "tokyo"],
    cam: null,
  },
  {
    type: "city",
    name: "뉴욕",
    label: "뉴욕, 미국",
    latitude: 40.7128,
    longitude: -74.006,
    keywords: ["뉴욕", "new york", "nyc"],
    cam: { videoId: "z-jYdOIKcTQ", label: "타임스퀘어 실시간 라이브" },
  },
  {
    type: "landmark",
    name: "광화문광장",
    label: "광화문광장, 서울",
    latitude: 37.5759,
    longitude: 126.9769,
    keywords: ["광화문", "광화문광장", "gwanghwamun"],
    cam: { videoId: "cl87UIF0VqI", label: "경복궁 실시간 라이브" },
  },
  {
    type: "landmark",
    name: "강남",
    label: "강남, 서울",
    latitude: 37.4979,
    longitude: 127.0276,
    keywords: ["강남", "gangnam"],
    cam: null,
  },
  {
    type: "landmark",
    name: "성수동",
    label: "성수동, 서울",
    latitude: 37.5445,
    longitude: 127.0559,
    keywords: ["성수", "성수동", "seongsu"],
    cam: null,
  },
  {
    type: "landmark",
    name: "시부야 스크램블",
    label: "시부야 스크램블, 도쿄",
    latitude: 35.6595,
    longitude: 139.7005,
    keywords: ["시부야", "shibuya"],
    cam: null,
  },
  {
    type: "landmark",
    name: "타임스퀘어",
    label: "타임스퀘어, 뉴욕",
    latitude: 40.758,
    longitude: -73.9855,
    keywords: ["타임스퀘어", "times square"],
    cam: { videoId: "z-jYdOIKcTQ", label: "타임스퀘어 실시간 라이브" },
  },
];

const DEFAULT_LOCATION = { name: "서울", label: "서울, 대한민국", latitude: 37.5665, longitude: 126.978 };
const FAVORITES_KEY = "weather-app-favorites";

function findCam(place) {
  const text = `${place.name || ""} ${place.country || ""}`.toLowerCase();
  const match = CURATED_LOCATIONS.find(
    (loc) => loc.cam && loc.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );
  return match ? match.cam : null;
}

function toPlace(loc) {
  return { name: loc.name, label: loc.label, latitude: loc.latitude, longitude: loc.longitude };
}

function locationLabel(place) {
  return place.label || [place.name, place.admin1, place.country].filter(Boolean).join(", ");
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
  return {
    name: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

async function geocodeSuggestions(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=5&language=ko&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results) return [];
  return data.results.map((r) => ({
    type: "city",
    name: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
    cam: undefined,
  }));
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`;
    const res = await fetch(url);
    const data = await res.json();
    const name = data.city || data.locality || data.principalSubdivision || "내 위치";
    const parts = [name, data.principalSubdivision, data.countryName].filter(
      (part, idx, arr) => part && arr.indexOf(part) === idx
    );
    const label = parts.join(", ");
    return { name, country: data.countryName, label, latitude: lat, longitude: lon };
  } catch {
    return { name: "내 위치", label: "내 위치", latitude: lat, longitude: lon };
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

function camHtml(cam) {
  if (!cam) {
    return `<div class="cam-placeholder">이 지역의 실시간 라이브 영상은 아직 준비되지 않았어요.</div>`;
  }
  return `
    <div class="cam-embed">
      <img class="cam-thumb" src="https://img.youtube.com/vi/${cam.videoId}/hqdefault.jpg" alt="${escapeHtml(cam.label)}" />
      <div class="cam-error-text">라이브 영상을 불러올 수 없어요</div>
      <button type="button" class="cam-play" data-video-id="${cam.videoId}" data-label="${escapeHtml(cam.label)}" aria-label="라이브 영상 재생">▶</button>
      <div class="cam-label">🔴 ${escapeHtml(cam.label)}</div>
      <a class="cam-open-link" href="https://www.youtube.com/watch?v=${cam.videoId}" target="_blank" rel="noopener">새 창 ↗</a>
    </div>
  `;
}

function weatherRowHtml(place, weather, { showFavButton = false, isFavorited = false, showRemove = false, cam } = {}) {
  const [desc, emoji] = WEATHER_CODES[weather.weathercode] || ["알 수 없음", "🌡️"];
  const resolvedCam = cam !== undefined ? cam : findCam(place);

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
      <div class="weather-cam">${camHtml(resolvedCam)}</div>
    </div>
  `;
}

function bindCamPlayButtons(container) {
  container.querySelectorAll(".cam-thumb").forEach((img) => {
    img.addEventListener("error", () => {
      img.closest(".cam-embed").classList.add("thumb-error");
    });
  });
  container.querySelectorAll(".cam-play").forEach((btn) => {
    btn.addEventListener("click", () => {
      const embed = btn.closest(".cam-embed");
      const id = btn.dataset.videoId;
      const label = btn.dataset.label;
      embed.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1"
          title="${escapeHtml(label)}"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
        <div class="cam-label">🔴 ${escapeHtml(label)}</div>
      `;
    });
  });
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
        bindCamPlayButtons(panel);
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
    bindCamPlayButtons(panel);
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
  bindCamPlayButtons(container);
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
const autocompleteBox = document.getElementById("autocomplete-list");

let autocompleteResults = [];
let autocompleteTimer = null;

async function renderSearchResult(place, cam) {
  searchResult.innerHTML = `<p class="loading">날씨를 확인하는 중...</p>`;
  try {
    const weather = await fetchWeather(place.latitude, place.longitude);
    searchResult.innerHTML = weatherRowHtml(place, weather, {
      showFavButton: true,
      isFavorited: isFavorited(place),
      cam,
    });
    bindFavButtons(searchResult, place);
    bindCamPlayButtons(searchResult);
  } catch {
    searchResult.innerHTML = `<p class="error">날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>`;
  }
}

function matchCurated(query) {
  const q = query.toLowerCase();
  return CURATED_LOCATIONS.filter(
    (loc) => loc.name.toLowerCase().includes(q) || loc.keywords.some((k) => k.toLowerCase().includes(q))
  ).slice(0, 5);
}

function hideAutocomplete() {
  autocompleteBox.classList.add("hidden");
  autocompleteBox.innerHTML = "";
}

function renderAutocomplete(list) {
  autocompleteResults = list;
  if (list.length === 0) {
    hideAutocomplete();
    return;
  }
  autocompleteBox.innerHTML = list
    .map(
      (item, i) => `
        <button type="button" class="ac-item" data-idx="${i}">
          <span class="ac-name">${escapeHtml(item.label)}</span>
          <span class="ac-type">${item.type === "landmark" ? "명소" : "도시"}</span>
        </button>
      `
    )
    .join("");
  autocompleteBox.classList.remove("hidden");

  autocompleteBox.querySelectorAll(".ac-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = autocompleteResults[Number(btn.dataset.idx)];
      hideAutocomplete();
      cityInput.value = item.name;
      renderSearchResult({ name: item.name, label: item.label, latitude: item.latitude, longitude: item.longitude }, item.cam);
    });
  });
}

cityInput.addEventListener("input", () => {
  const query = cityInput.value.trim();
  clearTimeout(autocompleteTimer);

  if (!query) {
    hideAutocomplete();
    return;
  }

  const localMatches = matchCurated(query).map((loc) => ({
    type: loc.type,
    name: loc.name,
    label: loc.label,
    latitude: loc.latitude,
    longitude: loc.longitude,
    cam: loc.cam,
  }));
  renderAutocomplete(localMatches);

  autocompleteTimer = setTimeout(async () => {
    try {
      const cityMatches = await geocodeSuggestions(query);
      const merged = [...localMatches];
      cityMatches.forEach((c) => {
        if (!merged.some((m) => m.name === c.name)) merged.push(c);
      });
      renderAutocomplete(merged.slice(0, 8));
    } catch {
      // 자동완성 실패는 조용히 무시하고 로컬 추천만 유지해요.
    }
  }, 300);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-input-wrap")) hideAutocomplete();
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAutocomplete();
  const city = cityInput.value.trim();
  if (!city) return;

  const curated = CURATED_LOCATIONS.find(
    (loc) => loc.name === city || loc.keywords.includes(city.toLowerCase())
  );
  if (curated) {
    await renderSearchResult(toPlace(curated), curated.cam);
    return;
  }

  searchResult.innerHTML = `<p class="loading">날씨를 확인하는 중...</p>`;
  const place = await geocodeByName(city).catch(() => null);
  if (!place) {
    searchResult.innerHTML = `<p class="error">"${escapeHtml(city)}"을(를) 찾을 수 없어요. 다른 이름으로 시도해보세요.</p>`;
    return;
  }
  await renderSearchResult(place, undefined);
});

// ---------- 초기화 ----------
ensureSeedFavorite();
loadMyLocation();
renderFavorites();
