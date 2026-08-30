(function() {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyDFQoMTsMN06zMwPOWcZyKoJ1QUT7v0XgA",
    authDomain: "pvlmurl.firebaseapp.com",
    databaseURL: "https://pvlmurl-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "pvlmurl.firebasestorage.app",
    messagingSenderId: "890815685595",
    appId: "1:890815685595:web:c9a7563a10e05b4c437b6b"
  };

  var THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  var db = null;
  var storage = null;
  var secondaryApp = null;
  var modalOpen = false;

  function loadFirebaseSDK() {
    return new Promise(function(resolve, reject) {
      if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
        resolve();
        return;
      }
      var scripts = [
        'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.15.0/firebase-database-compat.js',
        'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js'
      ];
      var loaded = 0;
      scripts.forEach(function(src) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() {
          loaded++;
          if (loaded === scripts.length) resolve();
        };
        script.onerror = function() { reject(new Error('Failed to load ' + src)); };
        document.head.appendChild(script);
      });
    });
  }

  async function initFirebase() {
    if (secondaryApp) return;
    await loadFirebaseSDK();
    try { secondaryApp = window.firebase.app('secondary'); } catch(e) {
      secondaryApp = window.firebase.initializeApp(FIREBASE_CONFIG, 'secondary');
    }
    db = window.firebase.database(secondaryApp);
    storage = window.firebase.storage(secondaryApp);
  }

  function getRoomPin() {
    return localStorage.getItem('synctext_room_pin');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatTimeRemaining(expiresAt) {
    var now = Date.now();
    var remaining = expiresAt - now;
    if (remaining <= 0) return 'Expired';
    var days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    var hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h';
    return 'Less than 1h';
  }

  function createStyles() {
    if (document.getElementById('fs-styles')) return;
    var s = document.createElement('style');
    s.id = 'fs-styles';
    s.textContent = [
      '#fs-btn{position:fixed!important;bottom:80px!important;right:20px!important;width:48px!important;height:48px!important;border-radius:50%!important;background:#1a1a1a!important;border:1px solid #444!important;color:#fff!important;cursor:pointer;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 4px 16px rgba(0,0,0,0.4)!important;transition:transform 0.15s,background 0.15s!important}',
      '#fs-btn:hover{background:#333!important;transform:scale(1.08)!important}',
      '#fs-btn svg{width:22px;height:22px;pointer-events:none}',
      '#fs-overlay{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:rgba(0,0,0,0.7)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;animation:fsFadeIn 0.15s ease-out}',
      '@keyframes fsFadeIn{from{opacity:0}to{opacity:1}}',
      '#fs-modal{background:#111!important;border:1px solid #333!important;border-radius:12px!important;width:90vw!important;max-width:480px!important;max-height:80vh!important;display:flex!important;flex-direction:column!important;color:#fff!important;font-family:Outfit,sans-serif!important;animation:fsSlideUp 0.15s ease-out!important}',
      '@keyframes fsSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '#fs-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:16px 20px!important;border-bottom:1px solid #333!important}',
      '#fs-title{font-size:16px!important;font-weight:600!important;color:#fff!important;margin:0!important}',
      '#fs-close{background:none!important;border:none!important;color:#888!important;cursor:pointer!important;padding:4px!important;display:flex!important;align-items:center!important;justify-content:center!important}',
      '#fs-close:hover{color:#fff!important}',
      '#fs-body{padding:16px 20px!important;overflow-y:auto!important;flex:1!important}',
      '#fs-drop{border:2px dashed #444!important;border-radius:8px!important;padding:28px!important;text-align:center!important;cursor:pointer!important;transition:border-color 0.15s,background 0.15s!important;margin-bottom:16px!important}',
      '#fs-drop:hover,#fs-drop.over{border-color:#888!important;background:rgba(255,255,255,0.04)!important}',
      '#fs-drop-text{color:#888!important;font-size:14px!important;line-height:1.6!important}',
      '#fs-drop-text b{color:#fff!important}',
      '#fs-drop-sub{font-size:12px!important;color:#555!important}',
      '#fs-progress{width:100%!important;height:4px!important;background:#333!important;border-radius:2px!important;margin:8px 0!important;display:none!important;overflow:hidden!important}',
      '#fs-progress.on{display:block!important}',
      '#fs-bar{height:100%!important;background:#888!important;width:0%!important;transition:width 0.2s!important}',
      '#fs-ptext{font-size:12px!important;color:#888!important;margin-bottom:8px!important;display:none!important}',
      '#fs-ptext.on{display:block!important}',
      '#fs-list{list-style:none!important;padding:0!important;margin:0!important}',
      '#fs-empty{text-align:center!important;padding:32px!important;color:#555!important;font-size:14px!important}',
      '.fs-item{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:12px!important;border:1px solid #2a2a2a!important;border-radius:8px!important;margin-bottom:8px!important;transition:background 0.15s!important}',
      '.fs-item:hover{background:rgba(255,255,255,0.03)!important}',
      '.fs-info{flex:1!important;min-width:0!important}',
      '.fs-name{font-size:14px!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      '.fs-meta{font-size:12px!important;color:#666!important;margin-top:2px!important}',
      '.fs-actions{display:flex!important;gap:8px!important;margin-left:12px!important}',
      '.fs-btn-dl{padding:6px 14px!important;border-radius:6px!important;font-size:12px!important;font-weight:500!important;cursor:pointer!important;border:none!important;background:#2a2a2a!important;color:#fff!important;transition:background 0.15s!important;font-family:Outfit,sans-serif!important}',
      '.fs-btn-dl:hover{background:#444!important}',
      '.fs-btn-rm{padding:6px 14px!important;border-radius:6px!important;font-size:12px!important;font-weight:500!important;cursor:pointer!important;border:none!important;background:rgba(239,68,68,0.1)!important;color:#ef4444!important;transition:background 0.15s!important;font-family:Outfit,sans-serif!important}',
      '.fs-btn-rm:hover{background:rgba(239,68,68,0.2)!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function createBtn() {
    if (document.getElementById('fs-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'fs-btn';
    btn.setAttribute('aria-label', 'Files');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
    btn.onclick = function() { openModal(); };
    document.body.appendChild(btn);
  }

  function createModal() {
    if (document.getElementById('fs-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'fs-overlay';
    ov.onclick = function(e) { if (e.target === ov) closeModal(); };

    var modal = document.createElement('div');
    modal.id = 'fs-modal';
    modal.innerHTML = [
      '<div id="fs-header">',
      '  <span id="fs-title">Files</span>',
      '  <button id="fs-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>',
      '</div>',
      '<div id="fs-body">',
      '  <div id="fs-drop">',
      '    <div id="fs-drop-text"><b>Click to upload</b> or drag and drop</div>',
      '    <div id="fs-drop-sub">Max 50MB per file</div>',
      '    <input type="file" id="fs-input" multiple style="display:none">',
      '  </div>',
      '  <div id="fs-progress"><div id="fs-bar"></div></div>',
      '  <div id="fs-ptext">Uploading...</div>',
      '  <ul id="fs-list"></ul>',
      '</div>'
    ].join('\n');
    ov.appendChild(modal);
    document.body.appendChild(ov);

    document.getElementById('fs-close').onclick = closeModal;

    var drop = document.getElementById('fs-drop');
    var inp = document.getElementById('fs-input');
    drop.onclick = function() { inp.click(); };
    drop.ondragover = function(e) { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function() { drop.classList.remove('over'); };
    drop.ondrop = function(e) { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files); };
    inp.onchange = function(e) { handleFiles(e.target.files); inp.value = ''; };
  }

  async function openModal() {
    await initFirebase();
    createModal();
    modalOpen = true;
    loadFiles();
  }

  function closeModal() {
    var ov = document.getElementById('fs-overlay');
    if (ov) ov.remove();
    modalOpen = false;
  }

  async function handleFiles(fileList) {
    var roomPin = getRoomPin();
    if (!roomPin) { alert('Join a room first.'); return; }
    var files = Array.from(fileList);
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > 50 * 1024 * 1024) {
        alert(files[i].name + ' exceeds 50MB.');
        continue;
      }
      await uploadFile(files[i], roomPin);
    }
  }

  async function uploadFile(file, roomPin) {
    var progEl = document.getElementById('fs-progress');
    var barEl = document.getElementById('fs-bar');
    var ptextEl = document.getElementById('fs-ptext');
    progEl.classList.add('on');
    ptextEl.classList.add('on');
    ptextEl.textContent = 'Uploading ' + file.name + '...';

    var fid = generateId();
    var path = 'SYNCTEXT/' + roomPin + '/files/' + fid + '_' + file.name;
    var ref = storage.ref(path);
    var task = ref.put(file);

    task.on('state_changed',
      function(snap) {
        var pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        barEl.style.width = pct + '%';
        ptextEl.textContent = 'Uploading ' + file.name + '... ' + Math.round(pct) + '%';
      },
      function(err) {
        console.error('[FS] Upload error:', err);
        progEl.classList.remove('on');
        ptextEl.classList.remove('on');
        alert('Upload failed.');
      },
      async function() {
        var url = await task.snapshot.ref.getDownloadURL();
        var meta = {
          id: fid, name: file.name, size: file.size, type: file.type,
          url: url, storagePath: path,
          uploadedAt: Date.now(), expiresAt: Date.now() + THREE_DAYS_MS
        };
        await db.ref('SYNCTEXT/projects/' + roomPin + '/files/' + fid).set(meta);
        progEl.classList.remove('on');
        ptextEl.classList.remove('on');
        barEl.style.width = '0%';
        loadFiles();
      }
    );
  }

  function loadFiles() {
    var roomPin = getRoomPin();
    if (!roomPin || !db) return;
    var list = document.getElementById('fs-list');
    if (!list) return;

    db.ref('SYNCTEXT/projects/' + roomPin + '/files').on('value', function(snap) {
      var files = snap.val() || {};
      var entries = Object.values(files);
      var now = Date.now();

      entries.forEach(function(f) {
        if (f.expiresAt && f.expiresAt < now) deleteFile(f);
      });

      var valid = entries.filter(function(f) { return f.expiresAt && f.expiresAt > now; });

      if (valid.length === 0) {
        list.innerHTML = '<li id="fs-empty">No files yet</li>';
        return;
      }

      list.innerHTML = valid.map(function(f) {
        return '<li class="fs-item">' +
          '<div class="fs-info">' +
            '<div class="fs-name" title="' + f.name + '">' + f.name + '</div>' +
            '<div class="fs-meta">' + formatFileSize(f.size) + ' &middot; ' + formatTimeRemaining(f.expiresAt) + '</div>' +
          '</div>' +
          '<div class="fs-actions">' +
            '<button class="fs-btn-dl" data-url="' + f.url + '" data-name="' + f.name + '">Download</button>' +
            '<button class="fs-btn-rm" data-id="' + f.id + '">Delete</button>' +
          '</div>' +
        '</li>';
      }).join('');

      list.querySelectorAll('.fs-btn-dl').forEach(function(btn) {
        btn.onclick = function() { dlFile(btn.dataset.url, btn.dataset.name); };
      });
      list.querySelectorAll('.fs-btn-rm').forEach(function(btn) {
        btn.onclick = function() { rmFile(btn.dataset.id); };
      });
    });
  }

  function dlFile(url, name) {
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function deleteFile(file) {
    var roomPin = getRoomPin();
    if (!roomPin) return;
    try {
      if (storage && file.storagePath) {
        await storage.ref(file.storagePath).delete().catch(function() {});
      }
      if (db && file.id) {
        await db.ref('SYNCTEXT/projects/' + roomPin + '/files/' + file.id).remove();
      }
    } catch(e) { console.error('[FS] Delete error:', e); }
  }

  async function rmFile(fid) {
    var roomPin = getRoomPin();
    if (!roomPin || !db) return;
    var snap = await db.ref('SYNCTEXT/projects/' + roomPin + '/files/' + fid).once('value');
    var file = snap.val();
    if (file) await deleteFile(file);
  }

  async function cleanupExpired() {
    var roomPin = getRoomPin();
    if (!roomPin) return;
    await initFirebase();
    var snap = await db.ref('SYNCTEXT/projects/' + roomPin + '/files').once('value');
    var files = snap.val() || {};
    var now = Date.now();
    Object.values(files).forEach(function(f) {
      if (f.expiresAt && f.expiresAt < now) deleteFile(f);
    });
  }

  function checkRoom() {
    var roomPin = getRoomPin();
    if (roomPin) {
      createStyles();
      createBtn();
    } else {
      var b = document.getElementById('fs-btn');
      if (b) b.remove();
    }
  }

  checkRoom();
  setInterval(checkRoom, 1000);
})();
