const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> [description, icon]
const CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤️"], 2: ["Partly Cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};
const code = (c) => CODES[c] || ["—", "🌡️"];
const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,uv_index" +
    "&hourly=temperature_2m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(name, await res.json());
  } catch {
    $("desc").textContent = "Couldn't load weather";
  }
}

function render(name, d) {
  const c = d.current;
  const [desc] = code(c.weather_code);

  $("place").textContent = name;
  $("temp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("desc").textContent = desc;
  $("hilo").textContent = `H:${Math.round(d.daily.temperature_2m_max[0])}°  L:${Math.round(d.daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(c.uv_index);

  // Next 24 hours, starting at the current hour
  const start = d.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
  $("hourly").innerHTML = d.hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const j = start + i;
      const h = new Date(t).getHours();
      const label = i === 0 ? "Now" : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
      return `<div class="hour"><span>${label}</span><span class="icon">${code(d.hourly.weather_code[j])[1]}</span><span>${Math.round(d.hourly.temperature_2m[j])}°</span></div>`;
    })
    .join("");

  $("daily").innerHTML = d.daily.time
    .map((t, i) => {
      const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
      return `<li><span>${day}</span><span class="icon">${code(d.daily.weather_code[i])[1]}</span><span class="range"><span class="lo">${Math.round(d.daily.temperature_2m_min[i])}°</span>${Math.round(d.daily.temperature_2m_max[i])}°</span></li>`;
    })
    .join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const { results } = await res.json();
    if (!results?.length) return ($("desc").textContent = "City not found");
    const r = results[0];
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    $("city").value = "";
  } catch {
    $("desc").textContent = "Search failed";
  }
});

// Greeting based on time of day
const hour = new Date().getHours();
const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
$("greeting").textContent = `${part}, Mafe Galeano`;

// Theme: saved choice, otherwise follow the system light/dark setting
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll(".themes button").forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === theme)
  );
}
let saved = null;
try { saved = localStorage.getItem("theme"); } catch {}
setTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

document.querySelectorAll(".themes button").forEach((b) =>
  b.addEventListener("click", () => {
    setTheme(b.dataset.theme);
    try { localStorage.setItem("theme", b.dataset.theme); } catch {}
  })
);

loadWeather(DEFAULT);
