(function () {
  const config = window.APP_CONFIG;
  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  function defaultDb() {
    return {
      videos: {},
      categories: [],
      playlists: [],
      videoOrder: [],
      channelAvatar: '',
      channelName: config.channelName,
      channelHandle: config.channelHandle
    };
  }

  function guessVideoUrl(filename) {
    if (!filename) return '';
    return `./videos/${encodeURIComponent(filename).replace(/%2F/g, '/')}`;
  }

  function normalizeDb(raw) {
    const db = { ...defaultDb(), ...(raw || {}) };
    if (!db.videos || typeof db.videos !== 'object') db.videos = {};
    if (!Array.isArray(db.categories)) db.categories = [];
    if (!Array.isArray(db.playlists)) db.playlists = [];
    if (!Array.isArray(db.videoOrder)) db.videoOrder = [];

    Object.entries(db.videos).forEach(([filename, video]) => {
      db.videos[filename] = {
        title: filename,
        description: '',
        thumbnail: '',
        duration: '',
        categoryId: null,
        playlistId: null,
        type: 'video',
        addedAt: new Date().toISOString(),
        views: 0,
        videoUrl: guessVideoUrl(filename),
        ...video
      };
    });

    db.categories = db.categories.map((category, index) => ({
      id: category.id || crypto.randomUUID(),
      name: category.name || `Categoria ${index + 1}`,
      order: Number.isFinite(category.order) ? category.order : index,
      videoOrder: Array.isArray(category.videoOrder) ? category.videoOrder : []
    })).sort((a, b) => a.order - b.order);

    db.playlists = db.playlists.map((playlist, index) => ({
      id: playlist.id || crypto.randomUUID(),
      name: playlist.name || `Playlist ${index + 1}`,
      description: playlist.description || '',
      order: Number.isFinite(playlist.order) ? playlist.order : index
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

  function parseTweetId(tweetUrl) {
    const match = String(tweetUrl || '').match(/status\/(\d+)/i);
    return match ? match[1] : '';
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
    guessVideoUrl,
    normalizeDb,
    loadContent,
    saveContent,
    requireSession,
    signIn,
    signOut,
    resolveAssetUrl,
    parseTweetId,
    fileToDataUrl
  };
})();
