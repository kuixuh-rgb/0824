const CITIES = [
  { name: "基隆市", lat: 25.1276, lon: 121.7392 }, { name: "台北市", lat: 25.0330, lon: 121.5654 },
  { name: "新北市", lat: 25.0169, lon: 121.4628 }, { name: "桃園市", lat: 24.9937, lon: 121.3010 },
  { name: "新竹市", lat: 24.8138, lon: 120.9675 }, { name: "新竹縣", lat: 24.8390, lon: 121.0177 },
  { name: "苗栗縣", lat: 24.5602, lon: 120.8214 }, { name: "台中市", lat: 24.1477, lon: 120.6736 },
  { name: "彰化縣", lat: 24.0518, lon: 120.5161 }, { name: "南投縣", lat: 23.9609, lon: 120.9719 },
  { name: "雲林縣", lat: 23.7092, lon: 120.4313 }, { name: "嘉義市", lat: 23.4801, lon: 120.4491 },
  { name: "嘉義縣", lat: 23.4518, lon: 120.2555 }, { name: "台南市", lat: 22.9999, lon: 120.2270 },
  { name: "高雄市", lat: 22.6273, lon: 120.3014 }, { name: "屏東縣", lat: 22.5519, lon: 120.5488 },
  { name: "宜蘭縣", lat: 24.7021, lon: 121.7378 }, { name: "花蓮縣", lat: 23.9911, lon: 121.6112 },
  { name: "台東縣", lat: 22.7554, lon: 121.1500 }, { name: "澎湖縣", lat: 23.5712, lon: 119.5793 },
  { name: "金門縣", lat: 24.4494, lon: 118.3767 }, { name: "連江縣", lat: 26.1602, lon: 119.9517 }
];

const WEATHER = {
  0:["晴朗","☀️"],1:["大致晴朗","🌤️"],2:["局部多雲","⛅"],3:["陰天","☁️"],
  45:["有霧","🌫️"],48:["霧凇","🌫️"],51:["毛毛雨","🌦️"],53:["毛毛雨","🌦️"],
  55:["較強毛毛雨","🌧️"],61:["小雨","🌧️"],63:["中雨","🌧️"],65:["大雨","🌧️"],
  71:["小雪","🌨️"],73:["中雪","🌨️"],75:["大雪","❄️"],80:["短暫陣雨","🌦️"],
  81:["陣雨","🌧️"],82:["強陣雨","⛈️"],95:["雷雨","⛈️"],96:["雷雨伴冰雹","⛈️"],99:["強雷雨伴冰雹","⛈️"]
};

const $ = s => document.querySelector(s);
const state = {
  city: CITIES.find(c => c.name === "台中市"),
  selectedDate: null,
  weather: null,
  planVariant: 0
};

function init() {
  $("#citySelect").innerHTML = CITIES.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  $("#citySelect").value = state.city.name;

  const today = new Date();
  $("#dateInput").min = formatDateInput(today);
  const max = new Date();
  max.setDate(max.getDate() + 6);
  $("#dateInput").max = formatDateInput(max);
  $("#dateInput").value = formatDateInput(today);
  state.selectedDate = $("#dateInput").value;

  const quick = ["台北市","台中市","台南市","高雄市","花蓮縣"];
  $("#quickCities").innerHTML = quick.map(name =>
    `<button type="button" class="quick-city" data-city="${name}">${name.replace("市","").replace("縣","")}</button>`
  ).join("");

  restoreTheme();
  bindEvents();
  loadWeather();
}

function bindEvents() {
  $("#searchForm").addEventListener("submit", e => {
    e.preventDefault();
    syncState();
    loadWeather(true);
  });

  $("#citySelect").addEventListener("change", () => {
    syncState();
    loadWeather();
  });

  $("#dateInput").addEventListener("change", () => {
    state.selectedDate = $("#dateInput").value;
    renderWeather();
  });

  $("#quickCities").addEventListener("click", e => {
    const btn = e.target.closest("[data-city]");
    if (!btn) return;
    $("#citySelect").value = btn.dataset.city;
    syncState();
    loadWeather(true);
  });

  $("#refreshBtn").addEventListener("click", () => {
    syncState();
    loadWeather();
  });

  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#locateBtn").addEventListener("click", useMyLocation);
  $("#regeneratePlanBtn").addEventListener("click", () => {
    state.planVariant++;
    buildPlan(true);
  });
}

function syncState() {
  const c = CITIES.find(c => c.name === $("#citySelect").value);
  if (c) state.city = c;
  state.selectedDate = $("#dateInput").value;
}

async function loadWeather(scroll = false) {
  $("#weatherSection").classList.remove("hidden");
  $("#planSection").classList.remove("hidden");
  setStatus(`正在更新 ${state.city.name} 天氣…`);

  if (scroll) requestAnimationFrame(() =>
    $("#weatherSection").scrollIntoView({behavior:"smooth", block:"start"})
  );

  try {
    const {lat, lon} = state.city;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude:lat, longitude:lon, timezone:"Asia/Taipei",
      current:"temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
      forecast_days:"7"
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error("天氣服務暫時無法使用");
    state.weather = await res.json();
    renderWeather();
    setStatus("天氣更新完成");
    setTimeout(() => $("#statusBar").classList.add("hidden"), 1800);
  } catch (err) {
    setStatus(`載入失敗：${err.message}`, true);
  }
}

function renderWeather() {
  const w = state.weather;
  if (!w) return;

  let idx = w.daily.time.indexOf(state.selectedDate);
  if (idx < 0) idx = 0;

  const code = w.daily.weather_code[idx];
  const [label, icon] = WEATHER[code] || ["天氣多變","🌤️"];
  const isToday = idx === 0;
  const mainTemp = isToday ? w.current.temperature_2m :
    (w.daily.temperature_2m_max[idx] + w.daily.temperature_2m_min[idx]) / 2;

  $("#selectedCityTitle").textContent = state.city.name;
  $("#heroCity").textContent = state.city.name;
  $("#heroTemp").textContent = `${Math.round(w.current.temperature_2m)}°`;
  $("#selectedDateText").textContent = prettyDate(w.daily.time[idx]);
  $("#weatherLabel").textContent = label;
  $("#weatherIcon").textContent = icon;
  $("#currentTemp").textContent = `${Math.round(mainTemp)}°`;
  $("#feelsLike").textContent = isToday ? `${Math.round(w.current.apparent_temperature)}°` : "—";
  $("#rainProb").textContent = `${Math.round(w.daily.precipitation_probability_max[idx] || 0)}%`;
  $("#humidity").textContent = isToday ? `${Math.round(w.current.relative_humidity_2m)}%` : "—";
  $("#windSpeed").textContent = isToday ? `${Math.round(w.current.wind_speed_10m)} km/h` : "—";
  $("#uvIndex").textContent = Number(w.daily.uv_index_max[idx] || 0).toFixed(1);

  const advice = makeAdvice(
    w.daily.precipitation_probability_max[idx] || 0,
    w.daily.temperature_2m_max[idx],
    w.daily.uv_index_max[idx] || 0,
    code
  );
  $("#adviceIcon").textContent = advice.icon;
  $("#adviceTitle").textContent = advice.title;
  $("#adviceText").textContent = advice.text;
  $("#adviceTags").innerHTML = advice.tags.map(t => `<span class="tag">${t}</span>`).join("");

  $("#forecastList").innerHTML = w.daily.time.map((date,i) => {
    const [l,ic] = WEATHER[w.daily.weather_code[i]] || ["天氣多變","🌤️"];
    return `<button class="forecast-day ${date===state.selectedDate?"active":""}" data-date="${date}" type="button">
      <small>${shortDate(date)}</small><div class="icon">${ic}</div><span>${l}</span>
      <strong>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°</strong>
      <small>降雨 ${Math.round(w.daily.precipitation_probability_max[i]||0)}%</small>
    </button>`;
  }).join("");

  $("#forecastList").querySelectorAll("[data-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.selectedDate = btn.dataset.date;
      $("#dateInput").value = btn.dataset.date;
      renderWeather();
    });
  });

  state.planVariant = 0;
  buildPlan();
}

function makeAdvice(rain,max,uv,code) {
  let icon="🧳", title="很適合安排旅行",
      text="天氣整體穩定，可以安排戶外景點與散步行程。", tags=[];
  if (rain>=70 || [65,82,95,96,99].includes(code)) {
    icon="☔"; title="建議以室內行程為主";
    text="降雨機率偏高，建議安排博物館、商場或其他室內活動。";
    tags.push("記得帶傘","室內行程優先");
  } else if (rain>=40) {
    icon="🌦️"; title="可以出門，但要留意短暫雨";
    text="仍可安排旅遊，建議準備雨具並保留備用行程。";
    tags.push("攜帶折傘","行程保留彈性");
  } else tags.push("戶外行程 OK","適合散步拍照");
  if (max>=33) tags.push("注意防曬補水");
  if (uv>=8) tags.push("UV 偏高");
  return {icon,title,text,tags};
}

function buildPlan(fromButton = false) {
  if (!state.weather) return;

  const idx = Math.max(0, state.weather.daily.time.indexOf(state.selectedDate));
  const rain = state.weather.daily.precipitation_probability_max[idx] || 0;
  const maxTemp = state.weather.daily.temperature_2m_max[idx] || 0;
  const code = state.weather.daily.weather_code[idx];

  const rainy = rain >= 60 || [65, 82, 95, 96, 99].includes(code);
  const hot = maxTemp >= 33;

  const sunnyPlans = [
    {
      name: "經典景點型",
      slots: [
        ["09:30","主要景點","上午先安排最想去的戶外景點，避開午後較熱時段"],
        ["12:00","午餐","選擇景點附近餐廳，減少來回移動"],
        ["14:00","第二個景點","安排室內外皆可的景點，行程比較有彈性"],
        ["16:30","下午茶／飲料","稍作休息，補充水分與體力"],
        ["18:30","晚餐","挑一間想吃的餐廳，輕鬆結束一天"]
      ]
    },
    {
      name: "悠閒散步型",
      slots: [
        ["10:00","慢步調開始","睡飽再出發，先安排公園、老街或散步型景點"],
        ["12:30","午餐","找一間評價不錯、能坐久一點的餐廳"],
        ["15:00","咖啡／甜點","安排咖啡廳或甜點店，避開午後炎熱"],
        ["17:00","夕陽景點","傍晚再安排戶外景點，體感會比較舒服"],
        ["19:00","晚餐","晚餐後視體力自由加碼夜景"]
      ]
    },
    {
      name: "拍照打卡型",
      slots: [
        ["09:00","熱門拍照景點","早點出發，光線好、人潮也通常較少"],
        ["11:30","特色午餐","安排當地特色料理或小吃"],
        ["14:00","特色街區","逛老街、文創園區或熱門商圈"],
        ["16:00","飲料休息","找手搖飲或咖啡店稍作休息"],
        ["18:00","夜景／晚餐","選擇夜景附近或熱鬧商圈用餐"]
      ]
    }
  ];

  const rainyPlans = [
    {
      name: "雨天室內型",
      slots: [
        ["10:00","室內景點","安排博物館、展覽、商場或大型室內景點"],
        ["12:30","午餐","選擇交通方便、室內座位舒適的餐廳"],
        ["14:30","第二個室內行程","下午避免長時間戶外移動"],
        ["16:30","咖啡／飲料","找間咖啡廳休息，順便躲雨"],
        ["18:30","晚餐","就近安排晚餐，避免雨天移動太遠"]
      ]
    },
    {
      name: "雨天悠閒型",
      slots: [
        ["10:30","早午餐","晚一點出門，先找間舒適餐廳慢慢吃"],
        ["12:30","商場／展覽","以有遮蔽、交通方便的行程為主"],
        ["15:00","咖啡廳","安排一段室內休息時間"],
        ["17:00","彈性行程","如果雨變小再短暫走走，否則繼續室內"],
        ["19:00","晚餐","挑附近餐廳收尾，減少移動"]
      ]
    },
    {
      name: "雨天備案型",
      slots: [
        ["09:30","室內主行程","先完成最重要的室內景點"],
        ["12:00","午餐","午餐後觀察雨勢再決定下午行程"],
        ["13:30","備用行程","準備商場、書店、展覽等備案"],
        ["16:00","飲料休息","找店休息，同時查看接下來雨勢"],
        ["18:00","提早晚餐","若雨勢持續，可提早結束行程"]
      ]
    }
  ];

  const hotPlans = [
    {
      name: "避暑型",
      slots: [
        ["09:00","戶外景點","把戶外活動排早一點，避開最熱時段"],
        ["11:30","午餐","中午提早進室內吃飯休息"],
        ["13:30","室內景點","午後高溫時段改安排室內活動"],
        ["16:30","飲料／甜點","補充水分，等氣溫下降"],
        ["18:00","傍晚行程","傍晚再安排戶外散步或晚餐"]
      ]
    }
  ];

  let pool = rainy ? rainyPlans : [...sunnyPlans];
  if (!rainy && hot) pool = [...hotPlans, ...sunnyPlans];

  const selected = pool[state.planVariant % pool.length];

  const timeline = $("#timeline");
  timeline.innerHTML = `
    <div class="plan-style-badge">✨ ${selected.name}</div>
    ${selected.slots.map(s => `
      <div class="timeline-item">
        <div class="timeline-time">${s[0]}</div>
        <div class="timeline-dot-wrap">
          <span class="timeline-dot"></span>
          <span class="timeline-line"></span>
        </div>
        <div class="timeline-content">
          <h3>${s[1]}</h3>
          <p>${s[2]}</p>
        </div>
      </div>
    `).join("")}
  `;

  if (fromButton) {
    const btn = $("#regeneratePlanBtn");
    const oldText = btn.textContent;
    btn.textContent = "✓ 已換一組";
    setTimeout(() => btn.textContent = "✨ 換一組", 700);
  }
}
function useMyLocation() {
  if (!navigator.geolocation) return setStatus("你的瀏覽器不支援定位功能。",true);
  setStatus("正在取得你的位置…");
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude,longitude}=pos.coords;
    const nearest=CITIES.map(c=>({...c,d:haversine(latitude,longitude,c.lat,c.lon)})).sort((a,b)=>a.d-b.d)[0];
    state.city={...nearest,lat:latitude,lon:longitude,name:`${nearest.name}（目前位置）`};
    $("#citySelect").value=nearest.name;
    loadWeather();
  },()=>setStatus("無法取得定位，請確認瀏覽器定位權限。",true));
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  const dark=document.body.classList.contains("dark");
  localStorage.setItem("travel-weather-theme",dark?"dark":"light");
  $("#themeBtn").textContent=dark?"☀️":"🌙";
}
function restoreTheme() {
  const saved=localStorage.getItem("travel-weather-theme");
  if(saved==="dark"||(!saved&&window.matchMedia?.("(prefers-color-scheme: dark)").matches))
    document.body.classList.add("dark");
  $("#themeBtn").textContent=document.body.classList.contains("dark")?"☀️":"🌙";
}
function setStatus(msg,error=false) {
  const b=$("#statusBar"); b.textContent=msg; b.classList.remove("hidden"); b.classList.toggle("error",error);
}
function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function prettyDate(s) {
  const d=new Date(`${s}T12:00:00+08:00`);
  return `${d.getMonth()+1} 月 ${d.getDate()} 日・星期${"日一二三四五六"[d.getDay()]}`;
}
function shortDate(s) {
  const d=new Date(`${s}T12:00:00+08:00`); return `${d.getMonth()+1}/${d.getDate()}`;
}
function haversine(a,b,c,d) {
  const R=6371,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
  const x=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
init();
