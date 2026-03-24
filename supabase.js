(function () {
  const config = window.APP_CONFIG;
  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  function defaultDb() {
    return {
      videos: {},
      categories: [],
      videoOrder: [],
      channelAvatar: '',
      channelName: config.channelName,
      channelHandle: config.channelHandle
    };
  }

  function parseTweetId(tweetUrl) {
    const match = String(tweetUrl || '').match(/status\/(\d+)/i);
    return match ? match[1] : '';
  }

  function isTwitterUrl(url) {
    return /(^https?:\/\/)?(www\.)?(x|twitter)\.com\//i.test(String(url || '').trim());
  }

  function parseYouTubeId(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    const directMatch = value.match(/^[a-zA-Z0-9_-]{11}$/);
    if (directMatch) return directMatch[0];
    try {
      const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      const parsed = new URL(normalized);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        const id = parsed.searchParams.get('v');
        return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : '';
      }
      if (host === 'youtu.be') {
        const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
      }
    } catch (_) {}
    const fallback = value.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/);
    return fallback ? fallback[1] : '';
  }

  function isYouTubeUrl(url) {
    return !!parseYouTubeId(url);
  }

  function getYouTubeThumbnailUrl(youtubeId) {
    return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '';
  }

  function normalizeDb(raw) {
    const db = { ...defaultDb(), ...(raw || {}) };
    if (!db.videos || typeof db.videos !== 'object') db.videos = {};
    if (!Array.isArray(db.categories)) db.categories = [];
    if (!Array.isArray(db.videoOrder)) db.videoOrder = [];

    Object.entries(db.videos).forEach(([filename, video]) => {
      const normalizedVideo = {
        title: filename,
        description: '',
        thumbnail: '',
        duration: '',
        categoryId: null,
        type: 'video',
        addedAt: new Date().toISOString(),
        views: 0,
        videoUrl: '',
        ...video
      };

      const tweetUrl = normalizedVideo.tweetUrl || (isTwitterUrl(normalizedVideo.videoUrl) ? normalizedVideo.videoUrl : '');
      const tweetId = normalizedVideo.tweetId || parseTweetId(tweetUrl);
      const youtubeUrl = normalizedVideo.youtubeUrl || (!tweetId && isYouTubeUrl(normalizedVideo.videoUrl) ? normalizedVideo.videoUrl : '');
      const youtubeId = normalizedVideo.youtubeId || parseYouTubeId(youtubeUrl);

      if (tweetId) {
        normalizedVideo.type = 'twitter';
        normalizedVideo.tweetUrl = tweetUrl;
        normalizedVideo.tweetId = tweetId;
        normalizedVideo.videoUrl = '';
        normalizedVideo.duration = normalizedVideo.duration || '';
        delete normalizedVideo.youtubeUrl;
        delete normalizedVideo.youtubeId;
      } else if (youtubeId) {
        normalizedVideo.type = 'youtube';
        normalizedVideo.youtubeUrl = youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`;
        normalizedVideo.youtubeId = youtubeId;
        normalizedVideo.videoUrl = '';
        normalizedVideo.thumbnail = normalizedVideo.thumbnail || getYouTubeThumbnailUrl(youtubeId);
        delete normalizedVideo.tweetUrl;
        delete normalizedVideo.tweetId;
      }
      delete normalizedVideo.playlistId;

      db.videos[filename] = normalizedVideo;
    });

    db.categories = db.categories.map((category, index) => ({
      id: category.id || crypto.randomUUID(),
      name: category.name || `Categoria ${index + 1}`,
      order: Number.isFinite(category.order) ? category.order : index,
      videoOrder: Array.isArray(category.videoOrder) ? category.videoOrder : []
    })).sort((a, b) => a.order - b.order);
    db.videoOrder = db.videoOrder.filter((filename) => db.videos[filename]);
    Object.keys(db.videos).forEach((filename) => {
      if (!db.videoOrder.includes(filename)) db.videoOrder.push(filename);
    });

    db.categories.forEach((category) => {
      category.videoOrder = category.videoOrder.filter((filename) => db.videos[filename]);
      Object.entries(db.videos).forEach(([filename, video]) => {
        if (video.categoryId === category.id && !category.videoOrder.includes(filename)) {
          category.videoOrder.push(filename);
        }
      });
    });

    delete db.playlists;

    return db;
  }

  async function loadContent() {
    const { data, error } = await supabase
      .from('site_content')
      .select('data')
      .eq('slug', config.contentSlug)
      .single();
    if (error) throw error;
    return normalizeDb(data?.data || {});
  }

  async function saveContent(nextDb) {
    const db = normalizeDb(nextDb);
    const response = await fetch('./api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Salvataggio non riuscito.');
    return normalizeDb(result.data || db);
  }

  async function requireSession() {
    const response = await fetch('./api/auth/session', {
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Verifica sessione non riuscita.');
    return result.authenticated ? result : null;
  }

  async function signIn(password) {
    const response = await fetch('./api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Login non riuscito.');
    return result;
  }

  async function signOut() {
    const response = await fetch('./api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Logout non riuscito.');
    return result;
  }

  function resolveAssetUrl(url) {
    if (!url) return '';
    if (/^(data:|blob:|https?:)/i.test(url)) return url;
    if (url.startsWith('./') || url.startsWith('../')) return url;
    if (url.startsWith('/')) return `.${url}`;
    return url;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Impossibile leggere il file selezionato.'));
      reader.readAsDataURL(file);
    });
  }

  window.SpagocciStore = {
    supabase,
    defaultDb,
    normalizeDb,
    loadContent,
    saveContent,
    requireSession,
    signIn,
    signOut,
    resolveAssetUrl,
    isTwitterUrl,
    parseTweetId,
    isYouTubeUrl,
    parseYouTubeId,
    getYouTubeThumbnailUrl,
    fileToDataUrl
  };
})();
