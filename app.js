let db = window.SpagocciStore.defaultDb();
let currentSection = 'all';
let menuCloseTimer = null;
let sidebarOpen = false;
let rowIdCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await checkAdminSession();

  const channelInput = document.getElementById('channelSearchInput');
  const headerInput = document.getElementById('searchInput');
  if (channelInput && headerInput) {
    channelInput.addEventListener('input', () => {
      headerInput.value = channelInput.value;
      searchVideos(channelInput.value);
    });
    headerInput.addEventListener('input', () => {
      channelInput.value = headerInput.value;
    });
  }

  const filename = new URLSearchParams(window.location.search).get('video');
  if (filename) openVideo(filename, false);
});

window.addEventListener('popstate', () => {
  const filename = new URLSearchParams(window.location.search).get('video');
  if (filename) openVideo(filename, false);
  else closeVideoModal(false);
});

async function loadData() {
  try {
    db = await window.SpagocciStore.loadContent();
    document.querySelector('.channel-name').textContent = db.channelName || window.APP_CONFIG.channelName;
    document.querySelector('.channel-handle').textContent = db.channelHandle || window.APP_CONFIG.channelHandle;
    document.getElementById('videoCount').textContent = Object.keys(db.videos).length;
    renderChannelAvatar(db.channelAvatar);
    renderTopTabs();
    renderDropdownCategories();
    renderSection(currentSection);
  } catch (error) {
    document.getElementById('mainContent').innerHTML =
      `<div class="empty-state"><p>Errore caricamento: ${escapeHtml(error.message)}</p></div>`;
  }
}

async function checkAdminSession() {
  try {
    const session = await window.SpagocciStore.requireSession();
    const el = document.getElementById('channelAvatar');
    if (session && el) el.classList.add('is-admin');
  } catch (_) {}
}

function renderChannelAvatar(url) {
  const el = document.getElementById('channelAvatar');
  if (!el) return;
  if (url) el.innerHTML = `<img src="${escapeHtml(resolveAsset(url))}" alt="Avatar">`;
  else el.textContent = initialsFromName(db.channelName || 'DS');
}

function adminAvatarClick() {
  const el = document.getElementById('channelAvatar');
  if (!el || !el.classList.contains('is-admin')) return;
  document.getElementById('avatarFileInput').click();
}

async function uploadChannelAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    await window.SpagocciStore.requireSession();
    db.channelAvatar = await window.SpagocciStore.fileToDataUrl(file);
    db = await window.SpagocciStore.saveContent(db);
    renderChannelAvatar(db.channelAvatar);
  } catch (error) {
    alert(`Errore upload avatar: ${error.message}`);
  } finally {
    input.value = '';
  }
}

function renderTopTabs() {
  const bar = document.getElementById('topTabsBar');
  if (!bar) return;
  let tabs = `<button class="top-tab ${currentSection === 'all' ? 'active' : ''}" data-section="all" onclick="switchTopTab('all', this)">Tutti</button>`;
  db.categories.forEach((category) => {
    tabs += `<button class="top-tab ${currentSection === `cat_${category.id}` ? 'active' : ''}" data-section="cat_${category.id}" onclick="switchTopTab('cat_${category.id}', this)">${escapeHtml(category.name)}</button>`;
  });
  tabs += `<button class="top-tab ${currentSection === 'playlists' ? 'active' : ''}" data-section="playlists" onclick="switchTopTab('playlists', this)">Playlist</button>`;
  bar.innerHTML = tabs;
}

function switchTopTab(section, btn) {
  document.querySelectorAll('.top-tab').forEach((tab) => tab.classList.remove('active'));
  if (btn) btn.classList.add('active');
  currentSection = section;
  renderSection(section);
}

function renderDropdownCategories() {
  const el = document.getElementById('dropdownCategories');
  if (!el) return;
  if (!db.categories.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = db.categories.map((category) => `
    <a href="#" class="dropdown-item" onclick="filterBySection('cat_${category.id}'); closeSidebar(); return false;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
      ${escapeHtml(category.name)}
    </a>`).join('');
}

function toggleSidebar() {
  if (sidebarOpen) closeSidebar();
  else openSidebarMenu();
}

function openSidebarMenu() {
  sidebarOpen = true;
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('menuOverlay').classList.add('active');
  document.getElementById('menuBtn').classList.add('active');
  clearTimeout(menuCloseTimer);
  menuCloseTimer = setTimeout(closeSidebar, 8000);
}

function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('active');
  document.getElementById('menuBtn').classList.remove('active');
  clearTimeout(menuCloseTimer);
}

function filterBySection(section) {
  currentSection = section;
  document.querySelectorAll('.top-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.section === section);
  });
  renderSection(section);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSection(section) {
  rowIdCounter = 0;
  const content = document.getElementById('mainContent');
  const videos = getOrderedVideos().filter((video) => video.type !== 'short');

  if (section === 'all') {
    let html = renderVideoRow('Video recenti', videos.slice(0, 12));
    db.categories.forEach((category) => {
      const catVideos = getCategoryVideos(category.id, videos);
      if (catVideos.length) html += renderVideoRow(category.name, catVideos);
    });
    content.innerHTML = html || emptyState('Nessun video ancora.');
    setTimeout(initRowDragScroll, 50);
    return;
  }

  if (section === 'videos') {
    content.innerHTML = `<div class="section-header"><h2 class="section-title">Tutti i Video</h2></div><div class="video-grid">${videos.map(videoCard).join('') || emptyState('Nessun video.')}</div>`;
    return;
  }

  if (section === 'playlists') {
    content.innerHTML = `<div class="section-header"><h2 class="section-title">Playlist</h2></div><div class="playlist-grid">${db.playlists.map(playlistCard).join('') || emptyState('Nessuna playlist.')}</div>`;
    return;
  }

  if (section.startsWith('cat_')) {
    const categoryId = section.replace('cat_', '');
    const category = db.categories.find((item) => item.id === categoryId);
    const catVideos = getCategoryVideos(categoryId, videos);
    content.innerHTML = `<div class="section-header"><h2 class="section-title">${escapeHtml(category?.name || '')}</h2></div><div class="video-grid">${catVideos.map(videoCard).join('') || emptyState('Nessun video in questa categoria.')}</div>`;
    return;
  }

  if (section.startsWith('pl_')) {
    const playlistId = section.replace('pl_', '');
    const playlist = db.playlists.find((item) => item.id === playlistId);
    const listVideos = videos.filter((video) => video.playlistId === playlistId);
    content.innerHTML = `<div class="section-header"><h2 class="section-title">Playlist ${escapeHtml(playlist?.name || '')}</h2></div><div class="video-grid">${listVideos.map(videoCard).join('') || emptyState('Nessun video in questa playlist.')}</div>`;
  }
}

function renderVideoRow(title, videos) {
  if (!videos.length) return '';
  const rowId = `row-${rowIdCounter++}`;
  return `<div class="video-row"><div class="video-row-header"><h2 class="section-title">${escapeHtml(title)}</h2><div class="row-arrows"><button class="row-arrow" onclick="scrollRow('${rowId}', -1)" aria-label="Scorri sinistra">&#8592;</button><button class="row-arrow" onclick="scrollRow('${rowId}', 1)" aria-label="Scorri destra">&#8594;</button></div></div><div class="video-row-scroll" id="${rowId}">${videos.map(videoCard).join('')}</div></div>`;
}

function scrollRow(rowId, direction) {
  const el = document.getElementById(rowId);
  if (!el) return;
  const cardWidth = el.querySelector('.video-card')?.offsetWidth || 260;
  el.scrollBy({ left: direction * (cardWidth + 16) * 3, behavior: 'smooth' });
}

function videoCard(video) {
  const thumb = resolveAsset(video.thumbnail || '');
  const isTwitter = video.type === 'twitter';
  return `<div class="video-card" onclick="openVideo('${escapeHtml(video.filename)}')"><div class="video-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(video.title)}" loading="lazy" onerror="this.style.display='none'">` : isTwitter ? '<div class="video-thumb-placeholder twitter-placeholder">X</div>' : '<div class="video-thumb-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'}<div class="play-overlay"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>${video.duration ? `<span class="duration-badge">${escapeHtml(video.duration)}</span>` : ''}</div><div class="video-info"><div class="video-title">${escapeHtml(video.title)}</div><div class="video-meta"><span>${video.views || 0} visualizzazioni</span><span>·</span><span>${getTimeAgo(video.addedAt)}</span></div></div></div>`;
}

function playlistCard(playlist) {
  const videos = getOrderedVideos().filter((video) => video.playlistId === playlist.id && video.type !== 'short');
  const thumb = resolveAsset(videos[0]?.thumbnail || '');
  return `<div class="playlist-card" onclick="filterBySection('pl_${playlist.id}')"><div class="playlist-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(playlist.name)}">` : ''}<div class="playlist-count"><span style="font-size:18px;font-weight:700">${videos.length}</span><span style="font-size:10px">video</span></div></div><div class="playlist-info"><div class="playlist-name">${escapeHtml(playlist.name)}</div><div class="playlist-meta">${escapeHtml(playlist.description || '')}</div></div></div>`;
}

function openVideo(filename, pushState = true) {
  let video = db.videos[filename];
  if (!video) {
    const realKey = Object.keys(db.videos).find((key) => key.toLowerCase() === String(filename).toLowerCase());
    if (realKey) {
      filename = realKey;
      video = db.videos[realKey];
    }
  }
  if (!video) return;

  const wrapper = document.getElementById('videoPlayerWrapper');
  if (video.type === 'twitter') {
    wrapper.innerHTML = `<div id="tweetEmbedContainer" style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center;overflow-y:auto;"><div id="tweetEmbed" style="width:100%;max-width:550px;padding:12px"></div></div>`;
    if (!window.twttr) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => renderTweetEmbed(video.tweetId);
      document.head.appendChild(script);
    } else {
      renderTweetEmbed(video.tweetId);
    }
  } else {
    const videoUrl = resolveAsset(video.videoUrl || '');
    wrapper.innerHTML = videoUrl
      ? `<video id="videoPlayer" src="${escapeHtml(videoUrl)}" controls autoplay playsinline style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;border-radius:12px 12px 0 0"></video>`
      : `<div style="position:absolute;inset:0;display:grid;place-items:center;background:#000;color:#fff;padding:24px;text-align:center">Manca l'URL pubblico del video. Impostalo da admin.</div>`;
  }

  document.getElementById('modalTitle').textContent = video.title;
  document.getElementById('modalMeta').textContent = `${video.views || 0} visualizzazioni · ${getTimeAgo(video.addedAt)}`;
  document.getElementById('modalDesc').textContent = video.description || '';
  document.getElementById('videoModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  if (pushState) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('video', filename);
    window.history.pushState({ filename }, video.title, nextUrl.toString());
  }
  document.title = `${video.title} | ${window.APP_CONFIG.siteName}`;
}

function renderTweetEmbed(tweetId) {
  const container = document.getElementById('tweetEmbed');
  if (!container || !window.twttr || !tweetId) return;
  container.innerHTML = '';
  window.twttr.widgets.createTweet(tweetId, container, { theme: 'dark', align: 'center', dnt: true });
}

function closeVideoModal(updateHistory = true) {
  const player = document.getElementById('videoPlayer');
  if (player) {
    player.pause();
    player.src = '';
  }
  document.getElementById('videoModal').classList.remove('open');
  document.getElementById('videoPlayerWrapper').innerHTML = '';
  document.body.style.overflow = '';
  if (updateHistory) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('video');
    window.history.pushState({}, window.APP_CONFIG.siteName, nextUrl.toString());
  }
  document.title = window.APP_CONFIG.siteName;
}

function closeModal(event) {
  if (event.target === event.currentTarget) closeVideoModal();
}

function searchVideos(query) {
  if (!query.trim()) {
    renderSection(currentSection);
    return;
  }
  const q = query.toLowerCase();
  const results = getOrderedVideos().filter((video) => video.type !== 'short').filter((video) => video.title.toLowerCase().includes(q) || (video.description || '').toLowerCase().includes(q));
  document.getElementById('mainContent').innerHTML = `<div class="section-header"><h2 class="section-title">Risultati per "${escapeHtml(query)}"</h2></div><div class="video-grid">${results.map(videoCard).join('') || emptyState('Nessun risultato.')}</div>`;
}

function getOrderedVideos() {
  return db.videoOrder.filter((filename) => db.videos[filename]).map((filename) => ({ filename, ...db.videos[filename] }));
}

function getCategoryVideos(categoryId, sourceVideos = getOrderedVideos()) {
  const category = db.categories.find((item) => item.id === categoryId);
  if (!category) return [];
  const ordered = Array.isArray(category.videoOrder) && category.videoOrder.length ? category.videoOrder : db.videoOrder;
  return ordered.filter((filename) => db.videos[filename] && db.videos[filename].categoryId === categoryId).map((filename) => ({ filename, ...db.videos[filename] })).filter((video) => sourceVideos.some((item) => item.filename === video.filename));
}

function resolveAsset(url) {
  return window.SpagocciStore.resolveAssetUrl(url);
}

function initialsFromName(name) {
  return String(name || 'DS').split(/\s+/).filter(Boolean).slice(0, 2).map((chunk) => chunk[0]).join('').toUpperCase();
}

function emptyState(msg) {
  return `<div class="empty-state"><p>${msg}</p></div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years} ann${years === 1 ? 'o' : 'i'} fa`;
  if (months > 0) return `${months} mes${months === 1 ? 'e' : 'i'} fa`;
  if (days > 0) return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;
  if (hours > 0) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;
  if (mins > 0) return `${mins} minut${mins === 1 ? 'o' : 'i'} fa`;
  return 'Adesso';
}

function initRowDragScroll() {
  document.querySelectorAll('.video-row-scroll').forEach((el) => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    el.addEventListener('mousedown', (event) => {
      isDown = true;
      el.classList.add('dragging');
      startX = event.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });
    el.addEventListener('mouseleave', () => {
      isDown = false;
      el.classList.remove('dragging');
    });
    el.addEventListener('mouseup', () => {
      isDown = false;
      el.classList.remove('dragging');
    });
    el.addEventListener('mousemove', (event) => {
      if (!isDown) return;
      event.preventDefault();
      const x = event.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
  });
}
