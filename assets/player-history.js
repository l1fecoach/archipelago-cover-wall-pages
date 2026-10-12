/* Read-only detail of a public Archipelago tracker slot. */
(() => {
  'use strict';
  const root = document.querySelector('#player-history');
  if (!root) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const params = new URLSearchParams(location.search);
  const room = JSON.parse(localStorage.getItem('ap.room') || 'null');
  if (!room?.code) {
    root.innerHTML = '<div class="empty"><h1>Erst den Raum öffnen</h1><p>Danach kannst du die Geschichte jedes Slots ansehen.</p><a class="btn primary" href="room.html">Zum Room HUD</a></div>';
    return;
  }
  let detail, locationFilter = 'all', search = '', visible = 30;
  let selectedPlayer, players = [];
  function selectSection() {
    const name = ['locations','received','hints'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'locations';
    root.querySelectorAll('.history-section').forEach(section => { section.hidden = section.id !== name; });
    root.querySelectorAll('.history-jump a').forEach(link => link.setAttribute('aria-current', link.hash === '#' + name ? 'page' : 'false'));
  }
  window.addEventListener('hashchange', selectSection);
  const checkedCount = data => data.locations.filter(location => location.checked).length;
  const receiveCount = data => data.received.reduce((total, item) => total + item.amount, 0);
  const row = (primary, secondary, badge, className='') => `<li class="history-row ${className}"><span class="history-row-main"><strong>${esc(primary)}</strong>${secondary ? `<small>${esc(secondary)}</small>` : ''}</span>${badge ? `<span class="history-row-badge">${esc(badge)}</span>` : ''}</li>`;
  function renderLocations() {
    const list = document.querySelector('#location-list');
    if (!list || !detail) return;
    const filtered = detail.locations.filter(location => (locationFilter === 'all' || (locationFilter === 'checked') === location.checked) && location.name.toLocaleLowerCase().includes(search));
    const shown = filtered.slice(0, visible);
    list.innerHTML = shown.map(location => row(location.name, '', location.checked ? '✓ Gecheckt' : 'Offen', location.checked ? 'is-checked' : 'is-open')).join('') || '<li class="history-empty">Keine passenden Locations.</li>';
    const more = document.querySelector('#location-more');
    more.hidden = shown.length >= filtered.length;
    const count = document.querySelector('#location-result-count');
    count.textContent = `${shown.length} von ${filtered.length} angezeigt`;
    document.querySelectorAll('[data-location-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.locationFilter === locationFilter)));
  }
  function render(data, players) {
    detail = data;
    const p = data.player, done = checkedCount(data), total = data.locations.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const open = data.hints.filter(hint => !hint.found).length;
    const characterWins = p.game === 'Brotato' ? new Set(data.locations.filter(location => location.checked).map(location => /^Run Won \((.+)\)$/.exec(location.name)?.[1]).filter(Boolean)).size : 0;
    const gameProgress = p.game === 'Brotato' ? `<p class="history-game-progress">${characterWins} unterschiedliche Charakter-Siege sind als Checks sichtbar. Das konkrete Seed-Ziel wird vom öffentlichen Tracker nicht angezeigt.</p>` : '';
    const playerOptions = players.map(player => `<option value="${esc(player.name)}" ${player.slot === p.slot ? 'selected' : ''}>Slot ${esc(player.slot)} · ${esc(player.name)}</option>`).join('');
    root.innerHTML = `<div class="history-header"><span class="slot-index">Slot ${esc(p.slot)}</span><div><h1>${esc(p.name)}${p.status === 'Goal Completed' ? ' <span class="goal-complete">Ziel erreicht</span>' : ''}</h1><p>${esc(p.game)} · Raum ${esc(room.code)}</p></div></div>
      <div class="history-toolbar"><label for="history-player">Spieler wechseln</label><select id="history-player">${playerOptions}</select><a href="${esc(data.source_url)}" target="_blank" rel="noopener noreferrer">Original-Tracker ↗</a><button class="btn subtle sm" id="history-refresh">Aktualisieren</button><span class="small" id="history-updated">Stand ${new Date(data.fetched_at * 1000).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="history-overview"><div class="history-stat"><strong>${pct}%</strong><span>Checks · ${done}/${total}</span><progress max="100" value="${pct}"></progress></div><a href="#received" class="history-stat"><strong>${receiveCount(data)}</strong><span>Items erhalten · ${data.received.length} Arten</span></a><a href="#hints" class="history-stat"><strong>${open}</strong><span>offene Hinweise</span></a></div>
      <nav class="history-jump" aria-label="Spielerdaten"><a href="#locations">Locations</a><a href="#received">Erhaltene Items</a><a href="#hints">Hinweise</a></nav>
      <section class="history-section" id="locations"><div class="history-section-title"><div><h2>Locations</h2><p>Jeder Check dieses Slots, auch wenn niemand online ist.</p></div><span>${done} von ${total}</span></div>${gameProgress}<div class="history-controls"><div class="chips"><button class="chip" data-location-filter="all" aria-pressed="true">Alle</button><button class="chip" data-location-filter="checked">Gecheckt</button><button class="chip" data-location-filter="open">Offen</button></div><label class="sr-only" for="location-search">Locations suchen</label><input id="location-search" type="search" placeholder="Location suchen …"></div><ul class="history-list" id="location-list"></ul><div class="history-list-footer"><span id="location-result-count"></span><button id="location-more" class="btn subtle sm">Mehr anzeigen</button></div></section>
      <section class="history-section" id="received"><div class="history-section-title"><div><h2>Erhaltene Items</h2><p>Die Menge pro Item. „Letzte Nr.“ ist die Empfangsreihenfolge, nicht die Anzahl.</p></div><span>${receiveCount(data)} insgesamt</span></div><ul class="history-list">${data.received.length ? data.received.slice().sort((a,b) => b.last_order-a.last_order).map(item => row(item.item, `Letzte Nr. ${item.last_order}`, `× ${item.amount}`)).join('') : '<li class="history-empty">Noch keine Items im öffentlichen Tracker.</li>'}</ul></section>
      <section class="history-section" id="hints"><div class="history-section-title"><div><h2>Hinweise</h2><p>Nur ausdrücklich angeforderte Hinweise. Das ist keine vollständige Item-Historie.</p></div><span>${data.hints.length} insgesamt</span></div><ul class="history-list">${data.hints.length ? data.hints.map(hint => row(hint.item, `${hint.finder} · ${hint.game} · ${hint.location}`, hint.found ? 'Gefunden' : 'Offen', hint.found ? 'is-checked' : 'is-hint')).join('') : '<li class="history-empty">Für diesen Slot wurden keine Hinweise angefordert.</li>'}</ul></section>
      <p class="history-caveat">Der öffentliche Tracker zeigt weder eine vollständige Sendehistorie noch verlässliche Item-Typen (Fortschritt, Filler oder Falle). Deshalb werden diese Angaben hier nicht geraten.</p>`;
    renderLocations();
    selectSection();
  }
  root.addEventListener('click', event => {
    if (event.target.closest('#history-refresh')) { refresh(); return; }
    const filter = event.target.closest('[data-location-filter]');
    if (filter) { locationFilter = filter.dataset.locationFilter; visible = 30; renderLocations(); }
    if (event.target.closest('#location-more')) { visible += 30; renderLocations(); }
  });
  root.addEventListener('input', event => {
    if (event.target.id === 'location-search') { search = event.target.value.trim().toLocaleLowerCase(); visible = 30; renderLocations(); }
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'history-player') location.href = 'history.html?player=' + encodeURIComponent(event.target.value);
  });
  async function refresh() {
    const button = root.querySelector('#history-refresh');
    if (button) { button.disabled = true; button.textContent = 'Lädt …'; }
    try {
      const fresh = await window.AP_ROOM.loadPlayer(room.code, selectedPlayer.slot);
      render(fresh, players);
    } catch (error) {
      if (!detail) throw error;
      const stamp = root.querySelector('#history-updated');
      if (stamp) stamp.textContent = 'Nicht aktualisiert. Bitte erneut versuchen.';
    } finally {
      const current = root.querySelector('#history-refresh');
      if (current) { current.disabled = false; current.textContent = 'Aktualisieren'; }
    }
  }
  (async () => {
    try {
      const summary = await window.AP_ROOM.load(room.code);
      players = summary.players;
      const wanted = params.get('player');
      const player = summary.players.find(p => p.name === wanted) || summary.players.find(p => p.name === room.playerName) || summary.players[0];
      if (!player) throw new Error('Im Raum wurden keine Slots gefunden.');
      selectedPlayer = player;
      await refresh();
    } catch (error) {
      root.innerHTML = `<div class="empty"><h1>Spielerdaten nicht erreichbar</h1><p>${esc(error.message)}</p><a class="btn" href="room.html">Zum Room HUD</a></div>`;
    }
  })();
})();
