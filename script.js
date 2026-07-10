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
    name: "부산",
    label: "부산, 대한민국",
    latitude: 35.1796,
    longitude: 129.0756,
    keywords: ["부산", "busan"],
    cam: null,
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
    name: "홍대",
    label: "홍대, 서울",
    latitude: 37.5563,
    longitude: 126.9238,
    keywords: ["홍대", "hongdae"],
    cam: null,
  },
  {
    type: "landmark",
    name: "이태원",
    label: "이태원, 서울",
    latitude: 37.5344,
    longitude: 126.9944,
    keywords: ["이태원", "itaewon"],
    cam: null,
  },
  {
    type: "landmark",
    name: "여의도",
    label: "여의도, 서울",
    latitude: 37.5219,
    longitude: 126.9245,
    keywords: ["여의도", "yeouido"],
    cam: null,
  },
  {
    type: "landmark",
    name: "잠실",
    label: "잠실, 서울",
    latitude: 37.5133,
    longitude: 127.1001,
    keywords: ["잠실", "jamsil"],
    cam: null,
  },
  {
    type: "landmark",
    name: "해운대",
    label: "해운대, 부산",
    latitude: 35.1587,
    longitude: 129.1604,
    keywords: ["해운대", "haeundae"],
    cam: null,
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
  )}&count=1&language=ko&format=json&countryCode=KR`;
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
  )}&count=5&language=ko&format=json&countryCode=KR`;
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

// 도시 지오코더(Open-Meteo)에는 없는 국내 명소(동네, 랜드마크 등)를 찾기 위한
// OpenStreetMap Nominatim 폴백이에요. countrycodes=kr로 국내 결과만 받아요.
// 자동완성(타이핑 중)에는 쓰지 않고, 검색을 실제로 실행했을 때만 한 번
// 호출해서 요청 빈도를 낮게 유지해요.
async function geocodeLandmark(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=1&namedetails=1&accept-language=ko&countrycodes=kr`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data || data.length === 0) return null;
  const r = data[0];
  return {
    name: r.namedetails?.name || r.display_name.split(",")[0],
    label: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  };
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

async function fetchAirQuality(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,uv_index`;
    const res = await fetch(url);
    const data = await res.json();
    return data.current || null;
  } catch {
    return null;
  }
}

async function fetchWeatherBundle(lat, lon) {
  const [weather, air] = await Promise.all([fetchWeather(lat, lon), fetchAirQuality(lat, lon)]);
  return { weather, air };
}

// 국내 환경부 기준 등급이에요.
function pm10Grade(value) {
  if (value <= 30) return "좋음";
  if (value <= 80) return "보통";
  if (value <= 150) return "나쁨";
  return "매우 나쁨";
}

function uvGrade(value) {
  if (value < 3) return "낮음";
  if (value < 6) return "보통";
  if (value < 8) return "높음";
  if (value < 11) return "매우 높음";
  return "위험";
}

function uvAdvice(value) {
  if (value < 3) return "☀️ 선크림 없이도 괜찮아요";
  if (value < 6) return "🧴 SPF30 선크림 발라주세요";
  if (value < 8) return "🧴 SPF50 선크림은 필수예요";
  if (value < 11) return "🧴 SPF50+ 선크림, 중간에 덧발라요";
  return "🚫 가능하면 외출은 피해주세요";
}

function pm10Advice(value) {
  const grade = pm10Grade(value);
  if (grade === "좋음") return "😊 마스크 없이도 괜찮아요";
  if (grade === "보통") return "😷 민감하신 분은 마스크 챙기세요";
  if (grade === "나쁨") return "😷 KF80 이상 마스크 권장해요";
  return "😷 KF94 마스크 + 외출 자제해요";
}

function airInfoHtml(air) {
  if (!air || air.pm10 == null || air.uv_index == null) {
    return `<div class="air-info air-info-empty">대기질 정보를 불러올 수 없어요.</div>`;
  }
  const pm10 = Math.round(air.pm10);
  const uv = Math.round(air.uv_index * 10) / 10;
  return `
    <div class="air-info">
      <div class="air-item">
        <span class="air-label">자외선</span>
        <span class="air-value">${uv} · ${uvGrade(uv)}</span>
        <span class="air-advice">${uvAdvice(uv)}</span>
      </div>
      <div class="air-item">
        <span class="air-label">미세먼지</span>
        <span class="air-value">${pm10}㎍/m³ · ${pm10Grade(pm10)}</span>
        <span class="air-advice">${pm10Advice(pm10)}</span>
      </div>
    </div>
  `;
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

function weatherRowHtml(place, weather, air, { showFavButton = false, isFavorited = false, showRemove = false, cam } = {}) {
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
      <div class="weather-cam">${camHtml(resolvedCam)}</div>
      <div class="weather-info">
        <div class="weather-info-top">
          <div class="place-row">
            <div class="place">${escapeHtml(locationLabel(place))}</div>
            ${favBtn}
          </div>
          <div class="temp-line">
            <span class="emoji">${emoji}</span>
            <span class="temp">${Math.round(weather.temperature)}°C</span>
          </div>
          <div class="desc">${desc} · 풍속 ${weather.windspeed} km/h</div>
          ${removeBtn ? `<div class="row-actions">${removeBtn}</div>` : ""}
        </div>
        <div class="weather-info-bottom">${airInfoHtml(air)}</div>
      </div>
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
    const seongsu = CURATED_LOCATIONS.find((l) => l.name === "성수동");
    const haeundae = CURATED_LOCATIONS.find((l) => l.name === "해운대");
    saveFavorites([DEFAULT_LOCATION, toPlace(seongsu), toPlace(haeundae)]);
  }
}

// ---------- 히어로 날씨 애니메이션 ----------
const heroAnim = document.getElementById("hero-anim");
const heroEl = document.querySelector(".hero");
const HERO_TYPES = ["sunny", "cloudy", "fog", "rain", "snow", "storm"];

function weatherAnimType(code) {
  if (code === 0 || code === 1) return "sunny";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([71, 73, 75].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "rain";
}

const HERO_ANIM_MARKUP = {
  sunny: `<div class="anim-sun"></div><div class="anim-rays"></div>`,
  cloudy: `<div class="anim-cloud c1"></div><div class="anim-cloud c2"></div><div class="anim-cloud c3"></div><div class="anim-cloud c4"></div>`,
  fog: `<div class="anim-fog f1"></div><div class="anim-fog f2"></div><div class="anim-fog f3"></div>`,
  rain: `
    <div class="anim-cloud c1"></div><div class="anim-cloud c2"></div>
    ${Array.from({ length: 20 }, (_, i) => `<span class="anim-drop" style="left:${(i * 5).toFixed(1)}%; animation-delay:${(i * 0.09).toFixed(2)}s"></span>`).join("")}
  `,
  snow: `
    <div class="anim-cloud c1"></div><div class="anim-cloud c2"></div>
    ${Array.from({ length: 20 }, (_, i) => `<span class="anim-flake" style="left:${(i * 5).toFixed(1)}%; animation-delay:${(i * 0.18).toFixed(2)}s; font-size:${0.7 + (i % 3) * 0.25}rem">❄</span>`).join("")}
  `,
  storm: `
    <div class="anim-cloud c1"></div><div class="anim-cloud c2"></div><div class="anim-cloud c3"></div>
    ${Array.from({ length: 10 }, (_, i) => `<span class="anim-drop" style="left:${(i * 10).toFixed(1)}%; animation-delay:${(i * 0.1).toFixed(2)}s"></span>`).join("")}
    <div class="anim-bolt">⚡</div>
    <div class="anim-flash"></div>
  `,
};

function setHeroAnimation(code) {
  if (!heroAnim) return;
  const type = weatherAnimType(code);
  heroAnim.className = `hero-anim anim-${type}`;
  heroAnim.innerHTML = HERO_ANIM_MARKUP[type] || "";
  if (heroEl) {
    HERO_TYPES.forEach((t) => heroEl.classList.remove(`hero-tint-${t}`));
    heroEl.classList.add(`hero-tint-${type}`);
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
        const { weather, air } = await fetchWeatherBundle(pos.coords.latitude, pos.coords.longitude);
        panel.innerHTML = weatherRowHtml(place, weather, air, {
          showFavButton: true,
          isFavorited: isFavorited(place),
        });
        bindFavButtons(panel, place);
        bindCamPlayButtons(panel);
        setHeroAnimation(weather.weathercode);
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
    const { weather, air } = await fetchWeatherBundle(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
    panel.innerHTML = `
      <p class="fallback-note">위치 권한이 없어 기본 도시로 표시하고 있어요. <button class="retry-btn" id="retry-location">다시 시도</button></p>
      ${weatherRowHtml(DEFAULT_LOCATION, weather, air, { showFavButton: true, isFavorited: isFavorited(DEFAULT_LOCATION) })}
    `;
    document.getElementById("retry-location").addEventListener("click", loadMyLocation);
    bindFavButtons(panel, DEFAULT_LOCATION);
    bindCamPlayButtons(panel);
    setHeroAnimation(weather.weathercode);
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
        const { weather, air } = await fetchWeatherBundle(place.latitude, place.longitude);
        return weatherRowHtml(place, weather, air, { showRemove: true });
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
    const { weather, air } = await fetchWeatherBundle(place.latitude, place.longitude);
    searchResult.innerHTML =
      weatherRowHtml(place, weather, air, {
        showFavButton: true,
        isFavorited: isFavorited(place),
        cam,
      }) + renderFeedMiniFor(place);
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
  clearTimeout(autocompleteTimer);
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

  const cityPlace = await geocodeByName(city).catch(() => null);
  if (cityPlace) {
    await renderSearchResult(cityPlace, undefined);
    return;
  }

  const landmarkPlace = await geocodeLandmark(city).catch(() => null);
  if (landmarkPlace) {
    await renderSearchResult(landmarkPlace, undefined);
    return;
  }

  searchResult.innerHTML = `<p class="error">"${escapeHtml(city)}"을(를) 찾을 수 없어요. 다른 이름으로 시도해보세요.</p>`;
});

// ---------- 실시간 기록 ----------
// 이 기능은 아직 백엔드가 없어서 이 브라우저(기기)에만 저장돼요.
// 여러 사람이 실제로 공유하는 피드로 쓰려면 서버/DB 연동이 필요해요.
const FEED_KEY = "weather-app-feed";
const FEED_MAX_ENTRIES = 60;

function getFeedEntries() {
  try {
    return JSON.parse(localStorage.getItem(FEED_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFeedEntries(list) {
  localStorage.setItem(FEED_KEY, JSON.stringify(list.slice(0, FEED_MAX_ENTRIES)));
}

function addFeedEntry(entry) {
  const list = getFeedEntries();
  list.unshift(entry);
  saveFeedEntries(list);
}

function resizeImageFile(file, maxWidth = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 데모용 자리표시 사진이에요. 실제 사진이 아니라 그라데이션 + 이모지로
// 만든 SVG라서 외부 이미지 없이도 항상 안정적으로 보여요.
function placeholderPhoto(hue, emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},70%,78%)"/>
        <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},65%,55%)"/>
      </linearGradient>
    </defs>
    <rect width="480" height="320" fill="url(#g)"/>
    <text x="50%" y="56%" font-size="96" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 데모 페이지 용도로 여러 사람이 남긴 것처럼 보이는 예시 기록을 미리 채워둬요.
// 실제로 아무도 기록을 남기지 않은 첫 방문 상태에서만 채워지고,
// 한 번이라도 기록이 생기면 이 시드 데이터는 다시 채워지지 않아요.
function ensureSeedFeed() {
  if (localStorage.getItem(FEED_KEY) !== null) return;
  const now = Date.now();
  const demo = [
    { place: "성수동", text: "방금 소나기 왔다가 그쳤어요. 우산 없이 나왔다가 홀딱 젖을 뻔했네요 ㅠㅠ", photo: placeholderPhoto(200, "🌦️"), minutesAgo: 6 },
    { place: "해운대", text: "바닷바람이 진짜 시원해요! 지금 딱 산책하기 좋은 날씨예요", photo: placeholderPhoto(190, "🌊"), minutesAgo: 24 },
    { place: "광화문광장", text: "사람 엄청 많고 볕이 따가워요. 양산 챙기세요!", photo: null, minutesAgo: 51 },
    { place: "홍대", text: "밤인데도 후덥지근하네요. 반팔로 충분해요", photo: placeholderPhoto(30, "🌙"), minutesAgo: 95 },
    { place: "강남", text: "미세먼지가 좀 있는 것 같아요. 마스크 챙기세요", photo: null, minutesAgo: 180 },
    { place: "이태원", text: "해 질 무렵부터 선선해져서 걷기 좋아요", photo: placeholderPhoto(15, "🌇"), minutesAgo: 300 },
    { place: "잠실", text: "구름은 많은데 비 소식은 없어요. 나들이하기 좋은 날이에요", photo: placeholderPhoto(210, "⛅"), minutesAgo: 540 },
  ];
  saveFeedEntries(
    demo.map((d) => ({ place: d.place, text: d.text, photo: d.photo, timestamp: now - d.minutesAgo * 60000 }))
  );
}

function timeAgo(timestamp) {
  const diffMin = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.round(diffHour / 24)}일 전`;
}

function feedCardHtml(entry) {
  const photo = entry.photo ? `<img class="feed-photo" src="${entry.photo}" alt="${escapeHtml(entry.place)} 기록 사진" />` : "";
  return `
    <div class="feed-card">
      ${photo}
      <div class="feed-card-body">
        <div class="feed-place">📍 ${escapeHtml(entry.place)}</div>
        <div class="feed-text">${escapeHtml(entry.text)}</div>
        <div class="feed-time">${timeAgo(entry.timestamp)}</div>
      </div>
    </div>
  `;
}

function renderFeed() {
  const container = document.getElementById("feed-list");
  const entries = getFeedEntries();
  if (entries.length === 0) {
    container.innerHTML = `<p class="empty-state">아직 남겨진 기록이 없어요. 첫 기록을 남겨보세요.</p>`;
    return;
  }
  container.innerHTML = entries.map(feedCardHtml).join("");
}

function renderFeedMiniFor(place) {
  const entries = getFeedEntries();
  const name = (place.name || "").toLowerCase();
  const matches = entries.filter((entry) => {
    const entryPlace = entry.place.toLowerCase();
    return entryPlace.includes(name) || name.includes(entryPlace);
  });
  if (matches.length === 0) return "";
  return `
    <div class="feed-mini">
      <div class="feed-mini-title">📸 이 위치의 기록</div>
      <div class="feed-list">${matches.map(feedCardHtml).join("")}</div>
    </div>
  `;
}

let selectedFeedPlace = null;

function initFeedForm() {
  const form = document.getElementById("feed-form");
  const locationBtn = document.getElementById("feed-location-btn");
  const popover = document.getElementById("feed-location-popover");
  const textInput = document.getElementById("feed-text-input");
  const photoInput = document.getElementById("feed-photo-input");

  popover.innerHTML = CURATED_LOCATIONS.map(
    (loc, i) => `<button type="button" class="feed-location-option" data-idx="${i}">📍 ${escapeHtml(loc.name)}</button>`
  ).join("");

  locationBtn.addEventListener("click", () => {
    popover.classList.toggle("hidden");
  });

  popover.querySelectorAll(".feed-location-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedFeedPlace = CURATED_LOCATIONS[Number(btn.dataset.idx)].name;
      locationBtn.textContent = `📍 ${selectedFeedPlace}`;
      locationBtn.classList.add("is-selected");
      popover.classList.add("hidden");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".feed-location-wrap")) popover.classList.add("hidden");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!selectedFeedPlace || !text) return;

    let photo = null;
    if (photoInput.files && photoInput.files[0]) {
      photo = await resizeImageFile(photoInput.files[0]).catch(() => null);
    }

    addFeedEntry({ place: selectedFeedPlace, text, photo, timestamp: Date.now() });
    form.reset();
    selectedFeedPlace = null;
    locationBtn.textContent = "📍 위치 추가";
    locationBtn.classList.remove("is-selected");
    renderFeed();
  });
}

// ---------- 화면 설정 ----------
const SECTION_DEFS = [
  { id: "search", label: "검색" },
  { id: "mylocation", label: "내 위치" },
  { id: "favorites", label: "즐겨찾기" },
  { id: "feed", label: "실시간 기록" },
];
const SETTINGS_KEY = "weather-app-section-config";

function getSectionConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (Array.isArray(saved) && saved.length === SECTION_DEFS.length) return saved;
  } catch {
    // 저장된 설정이 없거나 손상됐으면 기본값을 써요.
  }
  return SECTION_DEFS.map((s) => ({ id: s.id, visible: true }));
}

function saveSectionConfig(config) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
}

function applySectionConfig() {
  const config = getSectionConfig();
  const main = document.getElementById("main-sections");
  config.forEach((entry) => {
    const section = main.querySelector(`[data-section="${entry.id}"]`);
    if (!section) return;
    main.appendChild(section);
    section.classList.toggle("section-hidden", !entry.visible);
  });
}

function renderSettingsList() {
  const config = getSectionConfig();
  const list = document.getElementById("settings-list");
  list.innerHTML = config
    .map((entry, i) => {
      const def = SECTION_DEFS.find((s) => s.id === entry.id);
      return `
        <li class="settings-item" data-id="${entry.id}">
          <label class="settings-checkbox">
            <input type="checkbox" data-action="toggle" ${entry.visible ? "checked" : ""} />
            ${def.label}
          </label>
          <div class="settings-order-btns">
            <button type="button" data-action="up" ${i === 0 ? "disabled" : ""} aria-label="위로">▲</button>
            <button type="button" data-action="down" ${i === config.length - 1 ? "disabled" : ""} aria-label="아래로">▼</button>
          </div>
        </li>
      `;
    })
    .join("");

  list.querySelectorAll(".settings-item").forEach((item) => {
    const id = item.dataset.id;
    item.querySelector('[data-action="toggle"]').addEventListener("change", (e) => {
      const cfg = getSectionConfig();
      const entry = cfg.find((c) => c.id === id);
      entry.visible = e.target.checked;
      saveSectionConfig(cfg);
      applySectionConfig();
    });
    const upBtn = item.querySelector('[data-action="up"]');
    const downBtn = item.querySelector('[data-action="down"]');
    if (upBtn) {
      upBtn.addEventListener("click", () => {
        const cfg = getSectionConfig();
        const idx = cfg.findIndex((c) => c.id === id);
        if (idx > 0) {
          [cfg[idx - 1], cfg[idx]] = [cfg[idx], cfg[idx - 1]];
          saveSectionConfig(cfg);
          applySectionConfig();
          renderSettingsList();
        }
      });
    }
    if (downBtn) {
      downBtn.addEventListener("click", () => {
        const cfg = getSectionConfig();
        const idx = cfg.findIndex((c) => c.id === id);
        if (idx < cfg.length - 1) {
          [cfg[idx + 1], cfg[idx]] = [cfg[idx], cfg[idx + 1]];
          saveSectionConfig(cfg);
          applySectionConfig();
          renderSettingsList();
        }
      });
    }
  });
}

function initSettings() {
  const overlay = document.getElementById("settings-overlay");
  document.getElementById("settings-btn").addEventListener("click", () => {
    renderSettingsList();
    overlay.classList.remove("hidden");
  });
  document.getElementById("settings-close").addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });
}

// ---------- 초기화 ----------
ensureSeedFavorite();
ensureSeedFeed();
applySectionConfig();
initSettings();
initFeedForm();
loadMyLocation();
renderFavorites();
renderFeed();
