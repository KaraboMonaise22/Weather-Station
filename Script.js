(function(){
  // ------------------------------------------------------------------
  // Paste your own free OpenWeatherMap API key between the quotes below.
  // Get one at https://home.openweathermap.org/users/sign_up
  // This is the ONLY place the key lives — there is no key field in the UI.
  // ------------------------------------------------------------------
  const API_KEY = "683d3a2f319495b077693c05685717be";
 
  const cityInput = document.getElementById('cityInput');
  const searchForm = document.getElementById('searchForm');
  const searchBtn = document.getElementById('searchBtn');
  const locateBtn = document.getElementById('locateBtn');
  const statusLine = document.getElementById('statusLine');
  const reading = document.getElementById('reading');
  const emptyState = document.getElementById('emptyState');
  const unitsToggle = document.getElementById('unitsToggle');
 
  let lastData = null;
  let unit = 'C';
 
  searchForm.addEventListener('submit', function(e){
    e.preventDefault();
    const city = cityInput.value.trim();
    if(!city){
      setStatus('Type a city name to search.', false);
      cityInput.focus();
      return;
    }
    fetchByCity(city);
  });
 
  locateBtn.addEventListener('click', function(){
    if(!navigator.geolocation){
      setStatus('Location isn\u2019t available in this browser.', true);
      return;
    }
    setLoading(true);
    setStatus('Finding your location…', false);
    navigator.geolocation.getCurrentPosition(
      function(pos){
        fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      function(){
        setLoading(false);
        setStatus('Couldn\u2019t get your location — search by city name instead.', true);
      },
      { timeout: 8000 }
    );
  });
 
  function keyReady(){
    return API_KEY && API_KEY.indexOf('PASTE_YOUR') === -1;
  }
 
  async function fetchByCity(city){
    if(!keyReady()){
      setStatus('This app needs an OpenWeatherMap API key added in the code before it can fetch weather.', true);
      return;
    }
    setLoading(true);
    setStatus('Checking sky over ' + city + '…', false);
    try{
      const url = 'https://api.openweathermap.org/data/2.5/weather?q=' +
                  encodeURIComponent(city) + '&units=metric&appid=' + encodeURIComponent(API_KEY);
      const res = await fetch(url);
      const data = await res.json();
      handleResult(data);
    }catch(err){
      setStatus('Couldn\u2019t reach the weather service. Check your connection and try again.', true);
    }finally{
      setLoading(false);
    }
  }
 
  async function fetchByCoords(lat, lon){
    if(!keyReady()){
      setStatus('This app needs an OpenWeatherMap API key added in the code before it can fetch weather.', true);
      setLoading(false);
      return;
    }
    setStatus('Checking your local sky…', false);
    try{
      const url = 'https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon +
                  '&units=metric&appid=' + encodeURIComponent(API_KEY);
      const res = await fetch(url);
      const data = await res.json();
      handleResult(data);
      if(data && data.name) cityInput.value = data.name;
    }catch(err){
      setStatus('Couldn\u2019t reach the weather service. Check your connection and try again.', true);
    }finally{
      setLoading(false);
    }
  }
 
  function handleResult(data){
    if(String(data.cod) !== '200'){
      const msg = data.message ? data.message : 'city not found';
      setStatus('No reading found — ' + msg + '. Check the spelling and try again.', true);
      reading.classList.remove('open');
      emptyState.classList.remove('hidden');
      return;
    }
    lastData = data;
    unit = 'C';
    unitsToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.unit === 'C'));
    emptyState.classList.add('hidden');
    renderReading(data);
    setStatus('', false);
  }
 
  function setLoading(isLoading){
    searchBtn.disabled = isLoading;
    searchBtn.classList.toggle('loading', isLoading);
    locateBtn.disabled = isLoading;
  }
 
  function setStatus(msg, isError){
    statusLine.textContent = msg;
    statusLine.classList.toggle('error', !!isError);
  }
 
  unitsToggle.addEventListener('click', function(e){
    const btn = e.target.closest('button[data-unit]');
    if(!btn || !lastData) return;
    unit = btn.dataset.unit;
    unitsToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    renderReading(lastData);
  });
 
  function cToF(c){ return c * 9/5 + 32; }
  function fmtTemp(c){
    const v = unit === 'F' ? cToF(c) : c;
    return Math.round(v) + '°' + unit;
  }
 
  function renderReading(data){
    reading.classList.add('open');
 
    document.getElementById('placeName').textContent = data.name;
    document.getElementById('placeCountry').textContent = data.sys && data.sys.country ? data.sys.country : '';
    document.getElementById('updatedAt').textContent = 'Updated ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
 
    const tempC = data.main.temp;
    const feelsC = data.main.feels_like;
    document.getElementById('tempText').textContent = fmtTemp(tempC);
 
    const w = data.weather && data.weather[0] ? data.weather[0] : null;
    document.getElementById('condition').textContent = w ? w.description : '—';
    document.getElementById('feelsLike').textContent = 'Feels like ' + fmtTemp(feelsC);
 
    const iconEl = document.getElementById('weatherIcon');
    if(w && w.icon){
      iconEl.src = 'https://openweathermap.org/img/wn/' + w.icon + '@2x.png';
      iconEl.alt = w.description;
      iconEl.style.display = 'block';
    }else{
      iconEl.style.display = 'none';
    }
 
    document.getElementById('humidity').textContent = data.main.humidity + '%';
    document.getElementById('wind').textContent = Math.round(data.wind.speed * 3.6) + ' km/h';
    document.getElementById('pressure').textContent = data.main.pressure + ' hPa';
    document.getElementById('visibility').textContent = (data.visibility != null ? (data.visibility/1000).toFixed(1) + ' km' : '—');
 
    const tz = data.timezone || 0;
    document.getElementById('sunrise').textContent = formatSunTime(data.sys.sunrise, tz);
    document.getElementById('sunset').textContent = formatSunTime(data.sys.sunset, tz);
 
    updateDial(tempC);
  }
 
  function formatSunTime(unixUtc, tzOffsetSec){
    const localMs = (unixUtc + tzOffsetSec) * 1000;
    const d = new Date(localMs);
    let h = d.getUTCHours();
    let m = d.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if(h === 0) h = 12;
    m = m < 10 ? '0'+m : m;
    return h + ':' + m + ' ' + ampm;
  }
 
  function updateDial(tempC){
    const min = -20, max = 40;
    let t = (tempC - min) / (max - min);
    t = Math.max(0, Math.min(1, t));
 
    const pathLength = 330;
    const offset = pathLength * (1 - t);
    document.getElementById('tempArcFill').style.strokeDashoffset = offset;
 
    const angle = -120 + t * 240;
    document.getElementById('tempNeedle').style.transform = 'rotate(' + angle + 'deg)';
  }
 
  if(!keyReady()){
    setStatus('Heads up: add your OpenWeatherMap API key in the code (see the comment near the top of the script) before searching.', true);
  }
})();