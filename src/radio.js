import { CONFIG } from './config.js';

const RADIO_WORLD_NAMES = { lagos: 'Lagos', japan: 'Japan', usa: 'USA' };
const UNSUPPORTED_PLAYLIST_EXTENSIONS = /\.(m3u8?|pls|asx|xspf)(?:$|\?)/i;
const MUSIC_TAGS = new Set([
  'music', 'pop', 'rock', 'hiphop', 'rap', 'jazz', 'classical', 'oldies', 'hits', 'dance',
  'electronic', 'reggae', 'country', 'blues', 'soul', 'metal', 'indie', 'folk', 'disco',
  'techno', 'house', 'rnb', 'ambient', 'afrobeats', 'afrobeat', 'afropop', 'afrohouse',
  'highlife', 'fuji', 'naija', 'amapiano', 'kpop', 'jpop', 'worldmusic',
]);
const NON_MUSIC_TAGS = new Set(['talk', 'news', 'sports', 'sport', 'religion', 'religious', 'podcast', 'politics']);

export function createGameRadio({ audio, label, status, playButton, previousButton, nextButton, onPlaybackChange = () => {} }) {
  let stations = [];
  let stationIndex = 0;
  let activeWorld = null;
  let loadRequestId = 0;
  let loadingStations = false;
  let statusMessage = '';
  let autoPlayRequested = false;

  audio.volume = CONFIG.radio.volume;

  function currentStation() {
    return stations[stationIndex] || null;
  }

  function render() {
    const station = currentStation();
    label.textContent = station?.name || `${RADIO_WORLD_NAMES[activeWorld] || 'World'} Radio`;
    status.textContent = loadingStations
      ? 'Finding online stations…'
      : statusMessage || (station
        ? `CH ${stationIndex + 1}/${stations.length}`
        : (activeWorld ? 'No playable stations found' : 'Choose a map to load stations'));
    playButton.textContent = audio.paused ? '▶' : 'Ⅱ';
    playButton.setAttribute('aria-label', audio.paused ? 'Play radio' : 'Pause radio');
    playButton.disabled = !station;
    previousButton.disabled = stations.length < 2;
    nextButton.disabled = stations.length < 2;
  }

  async function loadStations(worldId) {
    activeWorld = worldId;
    const requestId = ++loadRequestId;
    stations = [];
    stationIndex = 0;
    loadingStations = true;
    statusMessage = '';
    audio.pause();
    audio.removeAttribute('src');
    render();

    const countryCode = CONFIG.radio.countryByWorld[worldId];
    if (!countryCode) {
      loadingStations = false;
      render();
      return;
    }

    const tags = CONFIG.radio.musicTagsByWorld[worldId] || ['music'];
    let lastError;

    for (const server of CONFIG.radio.apiServers) {
      try {
        const batches = await Promise.all(tags.map(async (tag) => {
          const query = new URLSearchParams({
            countrycode: countryCode,
            tag,
            hidebroken: 'true',
            order: 'clickcount',
            reverse: 'true',
            limit: String(CONFIG.radio.stationLimit),
          });
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), CONFIG.radio.requestTimeoutMs);
          try {
            const response = await fetch(`${server}/json/stations/search?${query}`, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`Radio directory returned ${response.status}`);
            return await response.json();
          } catch (error) {
            if (tag === 'music') throw error;
            return [];
          } finally {
            window.clearTimeout(timeout);
          }
        }));
        if (requestId !== loadRequestId) return;
        loadingStations = false;
        stations = normalizeStations(batches.flat()).slice(0, CONFIG.radio.stationLimit);
        render();
        if (stations.length === 0) {
          statusMessage = 'No playable stations found for this map';
          if (autoPlayRequested) onPlaybackChange('error');
          render();
        } else if (autoPlayRequested) {
          await tune(stationIndex, true);
        }
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (requestId === loadRequestId) {
      loadingStations = false;
      statusMessage = navigator.onLine
        ? 'Radio directory unavailable · try again later'
        : 'Connect to the internet to use radio';
      if (autoPlayRequested) onPlaybackChange('error');
      if (lastError) console.info('Online radio station lookup failed:', lastError.message);
      render();
    }
  }

  async function tune(index, startPlayback = !audio.paused) {
    if (!stations.length) return;
    stationIndex = (index + stations.length) % stations.length;
    const station = currentStation();
    audio.pause();
    audio.src = station.url;
    audio.load();
    statusMessage = startPlayback ? `Connecting · ${station.name}` : '';
    render();

    if (startPlayback) {
      try {
        await audio.play();
        onPlaybackChange('playing');
      } catch {
        statusMessage = 'Could not play this stream · try another channel';
        onPlaybackChange('error');
      }
      renderPlaybackStatus();
    }
  }

  function renderPlaybackStatus() {
    if (audio.error) statusMessage = 'Stream unavailable · try another channel';
    else if (!audio.paused) statusMessage = '';
    render();
  }

  playButton.addEventListener('click', async () => {
    const station = currentStation();
    if (!station) return;
    if (!audio.paused) {
      onPlaybackChange('paused');
      audio.pause();
      statusMessage = '';
      render();
      return;
    }
    if (!audio.src || audio.src !== station.url) {
      onPlaybackChange('starting');
      await tune(stationIndex, true);
      return;
    }
    onPlaybackChange('starting');
    try {
      await audio.play();
      onPlaybackChange('playing');
    } catch {
      statusMessage = 'Could not play this stream · try another channel';
      onPlaybackChange('error');
    }
    renderPlaybackStatus();
  });
  previousButton.addEventListener('click', () => tune(stationIndex - 1));
  nextButton.addEventListener('click', () => tune(stationIndex + 1));
  audio.addEventListener('playing', renderPlaybackStatus);
  audio.addEventListener('error', renderPlaybackStatus);
  audio.addEventListener('pause', render);

  function start() {
    autoPlayRequested = true;
    onPlaybackChange('starting');
    if (stations.length > 0 && !loadingStations) tune(stationIndex, true);
  }

  function stop() {
    autoPlayRequested = false;
    audio.pause();
    onPlaybackChange('stopped');
  }

  render();
  return { setWorld: loadStations, start, stop };
}

function normalizeStations(results) {
  const seen = new Set();
  return results
    .map((station) => ({
      ...station,
      url: station.url_resolved || station.url,
    }))
    .filter((station) => {
      const url = station.url || '';
      if (!url.startsWith('https://') || UNSUPPORTED_PLAYLIST_EXTENSIONS.test(url)) return false;
      const key = station.stationuuid || url;
      if (seen.has(key)) return false;
      seen.add(key);
      return isMusicStation(station);
    });
}

function isMusicStation(station) {
  const tags = (station.tags || '')
    .toLowerCase()
    .split(',')
    .map((tag) => tag.trim().replace(/[\s_-]/g, ''))
    .filter(Boolean);
  const hasMusicTag = tags.some((tag) => MUSIC_TAGS.has(tag));
  const hasTalkTag = tags.some((tag) => NON_MUSIC_TAGS.has(tag));
  return hasMusicTag && !hasTalkTag;
}
