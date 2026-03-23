let db = window.SpagocciStore.defaultDb();
let twitterThumbDataUrl = null;
let youtubeThumbDataUrl = null;
let activeCatOrderId = null;
let dragSrc = null;
let catDragSrc = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await window.SpagocciStore.requireSession();
    if (!session) {
      window.location.href = './login.html';
      return;
    }
    await loadData();
  } catch (_) {
    window.location.href = './login.html';
  }
});

async function adminLogout() {
  await window.SpagocciStore.signOut();
  window.location.href = './login.html';
}

async function loadData() {
  try {
    db = await window.SpagocciStore.loadContent();
    renderAll();
  } catch (error) {
    alert(`Errore caricamento dati: ${error.message}`);
  }
}

async function persist(messageId, successMessage) {
  db = await window.SpagocciStore.saveContent(db);
  if (messageId && successMessage) feedback(messageId, successMessage, 'success');
}

function renderAll() {
  renderVideoList(getOrderedVideos());
  renderCatList();
  renderPlList();
  renderOrderList();
  renderCatOrderSelector();
  renderStats();
  populateSelects();
}

function showTab(name, btn) {
  document.querySelectorAll('.admin-tab').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach((el) => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (btn) btn.classList.add('active');
}

function getOrderedVideos() {
  return db.videoOrder.filter((filename) => db.videos[filename]).map((filename) => ({ filename, ...db.videos[filename] }));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resolveAsset(url) {
  return window.SpagocciStore.resolveAssetUrl(url);
}

function isTwitterVideo(video) {
  if (!video) return false;
  return video.type === 'twitter'
    || !!video.tweetId
    || !!window.SpagocciStore.parseTweetId(video.tweetUrl || video.videoUrl || '');
}

function isYouTubeVideo(video) {
  if (!video) return false;
  return video.type === 'youtube'
    || !!video.youtubeId
    || !!window.SpagocciStore.parseYouTubeId(video.youtubeUrl || video.videoUrl || '');
}

function getVideoSourceUrl(video) {
  if (!video) return '';
  if (isTwitterVideo(video)) return video.tweetUrl || video.videoUrl || '';
  if (isYouTubeVideo(video)) return video.youtubeUrl || video.videoUrl || '';
  return video.videoUrl || '';
}

function getVideoTypeLabel(video) {
  if (isTwitterVideo(video)) return 'X / Twitter';
  if (isYouTubeVideo(video)) return 'YouTube';
  return video.type === 'short' ? 'Short' : 'Video';
}

function getManageThumbMarkup(video, thumb) {
  if (thumb) {
    return `<img src="${escapeHtml(thumb)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`;
  }
  if (isTwitterVideo(video)) {
    return '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;color:#fff;font-size:18px;font-weight:700">X</div>';
  }
  if (isYouTubeVideo(video)) {
    return '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#120000;color:#ff3b30;font-size:15px;font-weight:700">YT</div>';
  }
  return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
}

function feedback(id, msg, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `upload-feedback ${type}`.trim();
  if (type === 'success') {
    setTimeout(() => {
      el.textContent = '';
      el.className = 'upload-feedback';
    }, 5000);
  }
}

function populateSelects() {
  const catOpts = '<option value="">Nessuna categoria</option>' + db.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const plOpts = '<option value="">Nessuna playlist</option>' + db.playlists.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  ['editCategory', 'twitterCategory', 'youtubeCategory'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = catOpts;
  });
  const playlist = document.getElementById('editPlaylist');
  if (playlist) playlist.innerHTML = plOpts;
}

function previewTwitterThumb(input) {
  const file = input.files[0];
  if (!file) return;
  window.SpagocciStore.fileToDataUrl(file).then((dataUrl) => {
    twitterThumbDataUrl = dataUrl;
    document.getElementById('twitterThumbImg').src = dataUrl;
    document.getElementById('twitterThumbPreview').style.display = 'block';
    document.getElementById('twitterThumbName').textContent = file.name;
  }).catch((error) => feedback('twitterFeedback', error.message, 'error'));
}

function previewYoutubeThumb(input) {
  const file = input.files[0];
  if (!file) return;
  window.SpagocciStore.fileToDataUrl(file).then((dataUrl) => {
    youtubeThumbDataUrl = dataUrl;
    document.getElementById('youtubeThumbImg').src = dataUrl;
    document.getElementById('youtubeThumbPreview').style.display = 'block';
    document.getElementById('youtubeThumbName').textContent = file.name;
  }).catch((error) => feedback('youtubeFeedback', error.message, 'error'));
}

async function fetchTwitterThumbFromBackend(tweetUrl) {
  const response = await fetch('./api/admin/twitter-thumb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ tweetUrl })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Recupero thumbnail non riuscito.');
  }
  return result;
}

async function addTwitterVideo() {
  const tweetUrl = document.getElementById('twitterUrl').value.trim();
  const title = document.getElementById('twitterTitle').value.trim();
  const description = document.getElementById('twitterDesc').value.trim();
  const categoryId = document.getElementById('twitterCategory').value || null;
  const tweetId = window.SpagocciStore.parseTweetId(tweetUrl);
  if (!tweetUrl || !tweetId) return feedback('twitterFeedback', 'Inserisci un URL tweet valido.', 'error');
  if (!title) return feedback('twitterFeedback', "Il titolo e' obbligatorio.", 'error');

  let resolvedThumb = twitterThumbDataUrl || '';
  let successMessage = 'Video X aggiunto.';
  if (!resolvedThumb) {
    feedback('twitterFeedback', 'Recupero thumbnail da X...', '');
    try {
      const result = await fetchTwitterThumbFromBackend(tweetUrl);
      if (result?.ok && result.thumbnail) {
        resolvedThumb = result.thumbnail;
        successMessage = 'Video X aggiunto con thumbnail automatica.';
      }
    } catch (_) {}
  } else {
    successMessage = 'Video X aggiunto con thumbnail manuale.';
  }

  const filename = `tweet_${tweetId}`;
  db.videos[filename] = {
    title,
    description,
    thumbnail: resolvedThumb,
    duration: '',
    categoryId,
    playlistId: null,
    type: 'twitter',
    tweetUrl,
    tweetId,
    addedAt: new Date().toISOString(),
    views: 0,
    videoUrl: ''
  };
  if (!db.videoOrder.includes(filename)) db.videoOrder.unshift(filename);
  const category = db.categories.find((item) => item.id === categoryId);
  if (category) {
    if (!Array.isArray(category.videoOrder)) category.videoOrder = [];
    if (!category.videoOrder.includes(filename)) category.videoOrder.unshift(filename);
  }

  await persist('twitterFeedback', successMessage);
  document.getElementById('twitterUrl').value = '';
  document.getElementById('twitterTitle').value = '';
  document.getElementById('twitterDesc').value = '';
  document.getElementById('twitterCategory').value = '';
  document.getElementById('twitterThumbPreview').style.display = 'none';
  document.getElementById('twitterThumbName').textContent = 'Nessuna immagine selezionata';
  document.getElementById('twitterThumbFile').value = '';
  twitterThumbDataUrl = null;
  renderAll();
}

async function addYoutubeVideo() {
  const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
  const title = document.getElementById('youtubeTitle').value.trim();
  const description = document.getElementById('youtubeDesc').value.trim();
  const categoryId = document.getElementById('youtubeCategory').value || null;
  const youtubeId = window.SpagocciStore.parseYouTubeId(youtubeUrl);
  if (!youtubeUrl || !youtubeId) return feedback('youtubeFeedback', 'Inserisci un URL YouTube valido.', 'error');
  if (!title) return feedback('youtubeFeedback', "Il titolo e' obbligatorio.", 'error');

  const filename = `youtube_${youtubeId}`;
  const resolvedThumb = youtubeThumbDataUrl || window.SpagocciStore.getYouTubeThumbnailUrl(youtubeId);
  db.videos[filename] = {
    title,
    description,
    thumbnail: resolvedThumb,
    duration: '',
    categoryId,
    playlistId: null,
    type: 'youtube',
    youtubeUrl,
    youtubeId,
    addedAt: new Date().toISOString(),
    views: 0,
    videoUrl: ''
  };
  if (!db.videoOrder.includes(filename)) db.videoOrder.unshift(filename);
  const category = db.categories.find((item) => item.id === categoryId);
  if (category) {
    if (!Array.isArray(category.videoOrder)) category.videoOrder = [];
    if (!category.videoOrder.includes(filename)) category.videoOrder.unshift(filename);
  }

  await persist('youtubeFeedback', youtubeThumbDataUrl ? 'Video YouTube aggiunto con thumbnail manuale.' : 'Video YouTube aggiunto con thumbnail automatica.');
  document.getElementById('youtubeUrl').value = '';
  document.getElementById('youtubeTitle').value = '';
  document.getElementById('youtubeDesc').value = '';
  document.getElementById('youtubeCategory').value = '';
  document.getElementById('youtubeThumbPreview').style.display = 'none';
  document.getElementById('youtubeThumbName').textContent = 'Se non la scegli, uso la thumbnail YouTube';
  document.getElementById('youtubeThumbFile').value = '';
  youtubeThumbDataUrl = null;
  renderAll();
}

async function deleteVideo(filename) {
  const video = db.videos[filename];
  if (!video) return;
  const isTwitter = isTwitterVideo(video);
  const isYouTube = isYouTubeVideo(video);
  const sourceLabel = isTwitter ? 'questo video X' : isYouTube ? 'questo video YouTube' : 'questo video';
  if (!confirm(`Rimuovere ${sourceLabel} dal sito?`)) return;
  delete db.videos[filename];
  db.videoOrder = db.videoOrder.filter((item) => item !== filename);
  db.categories.forEach((category) => {
    category.videoOrder = (category.videoOrder || []).filter((item) => item !== filename);
  });
  await persist();
  renderAll();
}

function renderVideoList(videos) {
  const list = document.getElementById('videoList');
  if (!videos.length) {
    list.innerHTML = '<div class="loading-state"><p>Nessun video trovato.</p></div>';
    return;
  }
  list.innerHTML = videos.map((video) => {
    const category = db.categories.find((item) => item.id === video.categoryId);
    const playlist = db.playlists.find((item) => item.id === video.playlistId);
    const thumb = resolveAsset(video.thumbnail);
    return `<div class="manage-item" id="vi-${CSS.escape(video.filename)}"><div class="manage-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;width:80px;height:45px;border-radius:6px;overflow:hidden;position:relative">${getManageThumbMarkup(video, thumb)}</div><div class="manage-info"><div class="manage-title">${escapeHtml(video.title)}</div><div class="manage-meta">${getVideoTypeLabel(video)}${category ? ` - ${escapeHtml(category.name)}` : ''}${playlist ? ` - ${escapeHtml(playlist.name)}` : ''}${getVideoSourceUrl(video) ? ` - ${escapeHtml(getVideoSourceUrl(video))}` : ''}</div></div><div class="manage-actions"><button class="btn-edit" onclick="openEditModal('${escapeHtml(video.filename)}')">Modifica</button><button class="btn-delete" onclick="deleteVideo('${escapeHtml(video.filename)}')">Rimuovi</button></div></div>`;
  }).join('');
}

function filterVideos(query) {
  const videos = getOrderedVideos();
  if (!query.trim()) return renderVideoList(videos);
  const q = query.toLowerCase();
  renderVideoList(videos.filter((video) => video.title.toLowerCase().includes(q) || (video.description || '').toLowerCase().includes(q) || video.filename.toLowerCase().includes(q) || getVideoSourceUrl(video).toLowerCase().includes(q)));
}

async function createCategory() {
  const name = document.getElementById('newCatName').value.trim();
  if (!name) return feedback('catFeedback', 'Inserisci un nome.', 'error');
  db.categories.push({ id: crypto.randomUUID(), name, order: db.categories.length, videoOrder: [] });
  document.getElementById('newCatName').value = '';
  await persist('catFeedback', 'Categoria creata.');
  renderAll();
}

function renderCatList() {
  const list = document.getElementById('catList');
  if (!db.categories.length) {
    list.innerHTML = '<div class="loading-state"><p>Nessuna categoria ancora.</p></div>';
    return;
  }
  list.innerHTML = db.categories.map((category) => `<div class="manage-item drag-item" draggable="true" data-id="${category.id}" data-type="cat" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropOn(event,'cat')"><div class="drag-handle">⋮⋮</div><div class="manage-info"><div class="manage-title">${escapeHtml(category.name)}</div><div class="manage-meta">${Object.values(db.videos).filter((video) => video.categoryId === category.id).length} video</div></div><div class="manage-actions"><button class="btn-edit" onclick="renameCategory('${category.id}')">Rinomina</button><button class="btn-delete" onclick="deleteCategory('${category.id}')">Elimina</button></div></div>`).join('');
}

async function renameCategory(id) {
  const category = db.categories.find((item) => item.id === id);
  const name = prompt('Nuovo nome:', category?.name || '');
  if (!name || name === category?.name) return;
  category.name = name;
  await persist();
  renderAll();
}

async function deleteCategory(id) {
  if (!confirm('Eliminare questa categoria? I video non verranno eliminati.')) return;
  db.categories = db.categories.filter((category) => category.id !== id);
  Object.values(db.videos).forEach((video) => {
    if (video.categoryId === id) video.categoryId = null;
  });
  await persist();
  renderAll();
}

async function createPlaylist() {
  const name = document.getElementById('newPlName').value.trim();
  const description = document.getElementById('newPlDesc').value.trim();
  if (!name) return feedback('plFeedback', 'Inserisci un nome.', 'error');
  db.playlists.push({ id: crypto.randomUUID(), name, description, order: db.playlists.length });
  document.getElementById('newPlName').value = '';
  document.getElementById('newPlDesc').value = '';
  await persist('plFeedback', 'Playlist creata.');
  renderAll();
}

function renderPlList() {
  const list = document.getElementById('plList');
  if (!db.playlists.length) {
    list.innerHTML = '<div class="loading-state"><p>Nessuna playlist ancora.</p></div>';
    return;
  }
  list.innerHTML = db.playlists.map((playlist) => `<div class="manage-item drag-item" draggable="true" data-id="${playlist.id}" data-type="pl" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropOn(event,'pl')"><div class="drag-handle">⋮⋮</div><div class="manage-info"><div class="manage-title">${escapeHtml(playlist.name)}</div><div class="manage-meta">${Object.values(db.videos).filter((video) => video.playlistId === playlist.id).length} video · ${escapeHtml(playlist.description || '')}</div></div><div class="manage-actions"><button class="btn-delete" onclick="deletePlaylist('${playlist.id}')">Elimina</button></div></div>`).join('');
}

async function deletePlaylist(id) {
  if (!confirm('Eliminare questa playlist?')) return;
  db.playlists = db.playlists.filter((playlist) => playlist.id !== id);
  Object.values(db.videos).forEach((video) => {
    if (video.playlistId === id) video.playlistId = null;
  });
  await persist();
  renderAll();
}

function renderOrderList() {
  const list = document.getElementById('orderList');
  const videos = getOrderedVideos();
  if (!videos.length) {
    list.innerHTML = '<div class="loading-state"><p>Nessun video trovato.</p></div>';
    return;
  }
  list.innerHTML = videos.map((video) => `<div class="manage-item drag-item" draggable="true" data-id="${escapeHtml(video.filename)}" data-type="order" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropOn(event,'order')"><div class="drag-handle">⋮⋮</div><div class="manage-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;width:80px;height:45px;border-radius:6px;overflow:hidden">${getManageThumbMarkup(video, resolveAsset(video.thumbnail || ''))}</div><div class="manage-info"><div class="manage-title">${escapeHtml(video.title)}</div><div class="manage-meta">${isTwitterVideo(video) ? 'X' : isYouTubeVideo(video) ? 'YouTube' : video.type === 'short' ? 'Short' : 'Video'}</div></div></div>`).join('');
}

async function saveOrder() {
  db.videoOrder = Array.from(document.querySelectorAll('#orderList .drag-item')).map((el) => el.dataset.id);
  await persist('orderFeedback', 'Ordine salvato.');
  renderAll();
}

function dragStart(event) {
  dragSrc = event.currentTarget;
  event.dataTransfer.effectAllowed = 'move';
}

function dragOver(event) {
  event.preventDefault();
}

function dropOn(event, type) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!dragSrc || dragSrc === target || dragSrc.dataset.type !== target.dataset.type) return;
  const parent = target.parentNode;
  const items = Array.from(parent.querySelectorAll('.drag-item'));
  const srcIdx = items.indexOf(dragSrc);
  const tgtIdx = items.indexOf(target);
  if (srcIdx < tgtIdx) parent.insertBefore(dragSrc, target.nextSibling);
  else parent.insertBefore(dragSrc, target);
  if (type === 'cat') saveCatOrder();
  if (type === 'pl') savePlOrder();
}

async function saveCatOrder() {
  Array.from(document.querySelectorAll('#catList .drag-item')).forEach((el, index) => {
    const category = db.categories.find((item) => item.id === el.dataset.id);
    if (category) category.order = index;
  });
  db.categories.sort((a, b) => a.order - b.order);
  await persist();
  renderAll();
}

async function savePlOrder() {
  Array.from(document.querySelectorAll('#plList .drag-item')).forEach((el, index) => {
    const playlist = db.playlists.find((item) => item.id === el.dataset.id);
    if (playlist) playlist.order = index;
  });
  db.playlists.sort((a, b) => a.order - b.order);
  await persist();
  renderAll();
}

function renderStats() {
  const videos = Object.values(db.videos);
  document.getElementById('statTotal').textContent = videos.length;
  document.getElementById('statShorts').textContent = videos.filter((video) => video.type === 'short').length;
  document.getElementById('statCats').textContent = db.categories.length;
  document.getElementById('statPls').textContent = db.playlists.length;
  document.getElementById('statViews').textContent = videos.reduce((sum, video) => sum + (video.views || 0), 0);
  const top = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  document.getElementById('topVideos').innerHTML = top.map((video) => `<div class="manage-item" style="margin-bottom:8px"><div class="manage-info"><div class="manage-title">${escapeHtml(video.title)}</div><div class="manage-meta">${video.views || 0} visualizzazioni</div></div></div>`).join('') || '<p style="color:var(--text3)">Nessun video ancora.</p>';
  const preview = document.getElementById('adminAvatarPreview');
  if (!preview) return;
  if (db.channelAvatar) preview.innerHTML = `<img src="${escapeHtml(resolveAsset(db.channelAvatar))}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else preview.textContent = initialsFromName(db.channelName || 'DS');
}

async function adminUploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  feedback('avatarFeedback', 'Upload in corso...');
  try {
    db.channelAvatar = await window.SpagocciStore.fileToDataUrl(file);
    await persist('avatarFeedback', 'Avatar aggiornato.');
    renderStats();
  } catch (error) {
    feedback('avatarFeedback', error.message, 'error');
  } finally {
    input.value = '';
  }
}

async function adminRemoveAvatar() {
  if (!confirm('Rimuovere l\'avatar personalizzato?')) return;
  db.channelAvatar = '';
  await persist('avatarFeedback', 'Avatar rimosso.');
  renderStats();
}

function openEditModal(filename) {
  const video = db.videos[filename];
  if (!video) return;
  const isTwitter = isTwitterVideo(video);
  const isYouTube = isYouTubeVideo(video);
  if (!isTwitter && !isYouTube) {
    alert('Sono supportati solo video X / Twitter e YouTube.');
    return;
  }
  populateSelects();
  document.getElementById('editFilename').value = filename;
  document.getElementById('editVideoType').value = isTwitter ? 'twitter' : 'youtube';
  document.getElementById('editTitle').value = video.title || '';
  document.getElementById('editDesc').value = video.description || '';
  document.getElementById('editCategory').value = video.categoryId || '';
  document.getElementById('editPlaylist').value = video.playlistId || '';
  document.getElementById('editTwitterSection').style.display = isTwitter ? 'block' : 'none';
  document.getElementById('editYoutubeSection').style.display = isYouTube ? 'block' : 'none';
  document.getElementById('editTweetUrl').value = isTwitter ? (video.tweetUrl || video.videoUrl || '') : '';
  document.getElementById('editYoutubeUrl').value = isYouTube ? (video.youtubeUrl || video.videoUrl || '') : '';
  showEditTwitterThumb(isTwitter ? (video.thumbnail || '') : '');
  showEditYoutubeThumb(isYouTube ? (video.thumbnail || '') : '');
  feedback('editTwitterThumbFeedback', '');
  feedback('editYoutubeThumbFeedback', '');
  document.getElementById('editFeedback').textContent = '';
  document.getElementById('editModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  document.body.style.overflow = '';
}

async function retryTwitterThumb() {
  const filename = document.getElementById('editFilename').value;
  const video = db.videos[filename];
  if (!video) return;
  feedback('editTwitterThumbFeedback', 'Recupero thumbnail da X...', '');
  try {
    const result = await fetchTwitterThumbFromBackend(video.tweetUrl || video.videoUrl || '');
    if (!result?.ok || !result.thumbnail) {
      feedback('editTwitterThumbFeedback', result?.message || 'Nessuna thumbnail trovata.', 'error');
      return;
    }
    db.videos[filename].thumbnail = result.thumbnail;
    showEditTwitterThumb(result.thumbnail);
    await persist('editTwitterThumbFeedback', 'Thumbnail recuperata.');
    renderVideoList(getOrderedVideos());
  } catch (error) {
    feedback('editTwitterThumbFeedback', error.message, 'error');
  }
}

function showEditTwitterThumb(url) {
  const preview = document.getElementById('editTwitterThumbPreview');
  const img = document.getElementById('editTwitterThumbImg');
  if (!preview || !img) return;
  if (url) {
    img.src = resolveAsset(url);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function showEditYoutubeThumb(url) {
  const preview = document.getElementById('editYoutubeThumbPreview');
  const img = document.getElementById('editYoutubeThumbImg');
  if (!preview || !img) return;
  if (url) {
    img.src = resolveAsset(url);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

async function uploadEditTwitterThumb(input) {
  const file = input.files[0];
  if (!file) return;
  const filename = document.getElementById('editFilename').value;
  try {
    db.videos[filename].thumbnail = await window.SpagocciStore.fileToDataUrl(file);
    showEditTwitterThumb(db.videos[filename].thumbnail);
    await persist('editTwitterThumbFeedback', 'Thumbnail salvata.');
    renderVideoList(getOrderedVideos());
  } catch (error) {
    feedback('editTwitterThumbFeedback', error.message, 'error');
  } finally {
    input.value = '';
  }
}

async function uploadEditYoutubeThumb(input) {
  const file = input.files[0];
  if (!file) return;
  const filename = document.getElementById('editFilename').value;
  try {
    db.videos[filename].thumbnail = await window.SpagocciStore.fileToDataUrl(file);
    showEditYoutubeThumb(db.videos[filename].thumbnail);
    await persist('editYoutubeThumbFeedback', 'Thumbnail salvata.');
    renderVideoList(getOrderedVideos());
  } catch (error) {
    feedback('editYoutubeThumbFeedback', error.message, 'error');
  } finally {
    input.value = '';
  }
}

async function resetYoutubeThumb() {
  const filename = document.getElementById('editFilename').value;
  const video = db.videos[filename];
  if (!video) return;
  const youtubeId = video.youtubeId || window.SpagocciStore.parseYouTubeId(video.youtubeUrl || video.videoUrl || '');
  if (!youtubeId) return feedback('editYoutubeThumbFeedback', 'URL YouTube non valido.', 'error');
  db.videos[filename].thumbnail = window.SpagocciStore.getYouTubeThumbnailUrl(youtubeId);
  showEditYoutubeThumb(db.videos[filename].thumbnail);
  await persist('editYoutubeThumbFeedback', 'Thumbnail YouTube ripristinata.');
  renderVideoList(getOrderedVideos());
}

async function saveVideoEdit() {
  const filename = document.getElementById('editFilename').value;
  const videoType = document.getElementById('editVideoType').value;
  const update = {
    title: document.getElementById('editTitle').value.trim(),
    description: document.getElementById('editDesc').value.trim(),
    categoryId: document.getElementById('editCategory').value || null,
    playlistId: document.getElementById('editPlaylist').value || null
  };
  if (!update.title) return feedback('editFeedback', "Il titolo e' obbligatorio.", 'error');
  if (videoType === 'twitter') {
    update.type = 'twitter';
    update.tweetUrl = document.getElementById('editTweetUrl').value.trim();
    update.tweetId = window.SpagocciStore.parseTweetId(update.tweetUrl);
    update.youtubeUrl = '';
    update.youtubeId = '';
    update.videoUrl = '';
    update.duration = '';
    if (!update.tweetId) return feedback('editFeedback', 'Inserisci un URL tweet valido.', 'error');
  } else if (videoType === 'youtube') {
    update.type = 'youtube';
    update.youtubeUrl = document.getElementById('editYoutubeUrl').value.trim();
    update.youtubeId = window.SpagocciStore.parseYouTubeId(update.youtubeUrl);
    update.tweetUrl = '';
    update.tweetId = '';
    update.videoUrl = '';
    update.duration = '';
    if (!update.youtubeId) return feedback('editFeedback', 'Inserisci un URL YouTube valido.', 'error');
    const currentDefaultThumb = window.SpagocciStore.getYouTubeThumbnailUrl(db.videos[filename].youtubeId || '');
    if (!db.videos[filename].thumbnail || db.videos[filename].thumbnail === currentDefaultThumb) {
      update.thumbnail = window.SpagocciStore.getYouTubeThumbnailUrl(update.youtubeId);
    }
  } else {
    return feedback('editFeedback', 'Tipo video non supportato.', 'error');
  }

  const oldCategoryId = db.videos[filename].categoryId;
  db.videos[filename] = { ...db.videos[filename], ...update };
  if (oldCategoryId !== update.categoryId) {
    db.categories.forEach((category) => {
      category.videoOrder = (category.videoOrder || []).filter((item) => item !== filename);
    });
    const nextCategory = db.categories.find((category) => category.id === update.categoryId);
    if (nextCategory) {
      if (!Array.isArray(nextCategory.videoOrder)) nextCategory.videoOrder = [];
      nextCategory.videoOrder.unshift(filename);
    }
  }

  await persist('editFeedback', 'Salvato.');
  renderAll();
  setTimeout(closeEditModal, 600);
}

function renderCatOrderSelector() {
  const sel = document.getElementById('catOrderSelector');
  if (!sel) return;
  if (!db.categories.length) {
    sel.innerHTML = '<p style="color:var(--text3);font-size:13px">Nessuna categoria creata.</p>';
    return;
  }
  sel.innerHTML = db.categories.map((category) => `<button class="cat-order-pill${activeCatOrderId === category.id ? ' active' : ''}" onclick="selectCatOrder('${category.id}')">${escapeHtml(category.name)}</button>`).join('');
}

function selectCatOrder(categoryId) {
  activeCatOrderId = categoryId;
  renderCatOrderSelector();
  renderCatOrderList(categoryId);
}

function renderCatOrderList(categoryId) {
  const category = db.categories.find((item) => item.id === categoryId);
  const content = document.getElementById('catOrderContent');
  if (!category) return;
  const order = Array.isArray(category.videoOrder) && category.videoOrder.length ? category.videoOrder : db.videoOrder.filter((filename) => db.videos[filename]?.categoryId === categoryId);
  if (!order.length) {
    content.innerHTML = '<div class="loading-state" style="padding:32px 0"><p style="color:var(--text3)">Nessun video in questa categoria.</p></div>';
    return;
  }
  content.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px"><p style="color:var(--text3);font-size:13px;margin:0">Trascina per riordinare · <b style="color:var(--text)">${order.length} video</b></p><div style="display:flex;gap:8px"><button class="btn-secondary" onclick="catOrderMoveAll('${categoryId}')">Porta tutti in cima alla Home</button><button class="btn-primary" style="width:auto" onclick="saveCatVideoOrder('${categoryId}')">Salva ordine</button></div></div><div class="upload-feedback" id="catOrderFeedback"></div><div class="manage-list" id="catOrderList">${order.map((filename, index) => catOrderCard(filename, index, categoryId)).join('')}</div>`;
}

function catOrderCard(filename, index, categoryId) {
  const video = db.videos[filename];
  if (!video) return '';
  return `<div class="manage-item drag-item cat-order-drag-item" draggable="true" data-id="${escapeHtml(filename)}" data-type="catorder" ondragstart="catDragStart(event)" ondragover="catDragOver(event)" ondrop="catDropOn(event, '${escapeHtml(categoryId)}')" ondragleave="catDragLeave(event)" ondragend="catDragEnd(event)"><div class="drag-handle">⋮⋮</div><div class="cat-order-index">${index + 1}</div><div class="manage-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;width:80px;height:45px;border-radius:6px;overflow:hidden">${getManageThumbMarkup(video, resolveAsset(video.thumbnail || ''))}</div><div class="manage-info"><div class="manage-title">${escapeHtml(video.title)}</div><div class="manage-meta">${isTwitterVideo(video) ? 'X' : isYouTubeVideo(video) ? 'YouTube' : 'Video'}</div></div><div class="manage-actions"><button class="btn-secondary" onclick="catOrderMove('${escapeHtml(filename)}', '${escapeHtml(categoryId)}', -1)">↑</button><button class="btn-secondary" onclick="catOrderMove('${escapeHtml(filename)}', '${escapeHtml(categoryId)}', 1)">↓</button></div></div>`;
}

function catOrderMove(filename, categoryId, direction) {
  const category = db.categories.find((item) => item.id === categoryId);
  if (!category) return;
  if (!Array.isArray(category.videoOrder)) category.videoOrder = [];
  const idx = category.videoOrder.indexOf(filename);
  if (idx < 0) return;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= category.videoOrder.length) return;
  [category.videoOrder[idx], category.videoOrder[nextIdx]] = [category.videoOrder[nextIdx], category.videoOrder[idx]];
  renderCatOrderList(categoryId);
}

async function catOrderMoveAll(categoryId) {
  const category = db.categories.find((item) => item.id === categoryId);
  if (!category) return;
  const catFiles = (category.videoOrder || []).filter((filename) => db.videos[filename]);
  db.videoOrder = [...catFiles, ...db.videoOrder.filter((filename) => !catFiles.includes(filename))];
  await persist('catOrderFeedback', `Video di "${category.name}" portati in cima alla Home.`);
  renderAll();
  renderCatOrderList(categoryId);
}

async function saveCatVideoOrder(categoryId) {
  const category = db.categories.find((item) => item.id === categoryId);
  if (category) category.videoOrder = Array.from(document.querySelectorAll('#catOrderList .cat-order-drag-item')).map((el) => el.dataset.id);
  await persist('catOrderFeedback', 'Ordine salvato.');
  renderCatOrderList(categoryId);
}

function catDragStart(event) {
  catDragSrc = event.currentTarget;
  event.dataTransfer.effectAllowed = 'move';
}

function catDragOver(event) {
  event.preventDefault();
}

function catDragLeave(_) {}

function catDragEnd(_) {
  catDragSrc = null;
}

function catDropOn(event, categoryId) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!catDragSrc || catDragSrc === target) return;
  const parent = target.parentNode;
  const items = Array.from(parent.querySelectorAll('.cat-order-drag-item'));
  const srcIdx = items.indexOf(catDragSrc);
  const tgtIdx = items.indexOf(target);
  if (srcIdx < tgtIdx) parent.insertBefore(catDragSrc, target.nextSibling);
  else parent.insertBefore(catDragSrc, target);
  const category = db.categories.find((item) => item.id === categoryId);
  if (category) category.videoOrder = Array.from(parent.querySelectorAll('.cat-order-drag-item')).map((el) => el.dataset.id);
}

function initialsFromName(name) {
  return String(name || 'DS').split(/\s+/).filter(Boolean).slice(0, 2).map((chunk) => chunk[0]).join('').toUpperCase();
}
