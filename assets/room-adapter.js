/* Public Archipelago tracker adapter. This never logs into a game slot:
   doing so would change the room's online status. The tracker provides
   checks and explicitly requested hints, but no complete item history or
   trustworthy item classes. */
(() => {
'use strict';
function cachedRoom(code) {
  try {
    const saved = JSON.parse(sessionStorage.getItem('ap.liveRoom') || 'null');
    if (saved?.code === code && Array.isArray(saved.players)) {
      return {code, name: 'Room ' + code, players: saved.players,
        feed: saved.feed || [], liveStatus: 'read-only', cached: true};
    }
  } catch {}
  return null;
}
window.AP_ROOM = {
  mode: 'live',
  async loadPlayer(code, slot) {
    const response = await fetch('/api/player.json?code=' + encodeURIComponent(code) + '&slot=' + encodeURIComponent(slot), {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Die Slotdaten sind gerade nicht erreichbar.');
    return data;
  },
  async load(code, {signal} = {}) {
    let response, data;
    try {
      response = await fetch('/api/room.json?code=' + encodeURIComponent(code),
        {signal, cache: 'no-store'});
      data = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      const cached = cachedRoom(code);
      if (cached) return cached;
      throw new Error('Der öffentliche Raum ist gerade nicht erreichbar. Bitte erneut versuchen.');
    }
    if (!response.ok || data.error) {
      const cached = cachedRoom(code);
      if (cached) return cached;
      throw new Error(data.error || 'Der Raum-Tracker konnte nicht geladen werden.');
    }
    const players = (data.players || []).map(p => ({
      id: p.name, slot: p.slot, name: p.name, game: p.game,
      progress: Math.round(p.pct),
      online: p.status === 'Connected', completed: p.status === 'Goal Completed',
      checksDone: p.checks_done, checksTotal: p.checks_total,
    }));
    const feed = (data.hints || []).slice().reverse().map(h => ({
      kind: 'hint', found: !!h.found, historical: true,
      from: h.finder, to: h.receiver,
      item: h.item, type: 'unknown',
      place: h.location + ' · ' + h.game,
    }));
    return {code, name: 'Room ' + code, players, feed,
      liveStatus: 'read-only', cached: false};
  },
};
})();
