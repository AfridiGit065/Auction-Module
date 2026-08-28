'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import { Player, Team, Settings, AuctionState } from '@/lib/types';
import {
  CATEGORY_ORDER,
  getActiveCategory,
  getCategoryProgress,
  isCategoryComplete,
  getNextPlayerInCategory,
} from '@/lib/auction/categoryUtils';

export default function AdminPage() {
  const [activePane, setActivePane] = useState<'control' | 'players' | 'teams' | 'settings'>('control');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Modals
  const [playerModal, setPlayerModal] = useState<Partial<Player> | null>(null);
  const [teamModal, setTeamModal] = useState<Partial<Team> | null>(null);
  const [selectedPlayerToStart, setSelectedPlayerToStart] = useState<string>('');

  // Player Manager Pane Filters & View Mode
  const [managerCategoryFilter, setManagerCategoryFilter] = useState<string>('ALL');
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>('');
  const [managerStatusFilter, setManagerStatusFilter] = useState<string>('ALL');
  const [managerViewMode, setManagerViewMode] = useState<'tabbed' | 'grouped'>('tabbed');

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdminData = async () => {
    try {
      const snapRes = await fetch('/api/auction/snapshot', { cache: 'no-store' });
      if (snapRes.ok) {
        const snap = await snapRes.json();
        setSettings(snap.settings);
        setTeams(snap.teams);
        setPlayers(snap.players);
        setAuctionState(snap.auction_state);

        // Auto-select next eligible player if none selected or if current selection is invalid
        const activeCat = getActiveCategory(snap.players);
        if (activeCat) {
          const nextCandidate = getNextPlayerInCategory(snap.players, activeCat);
          if (nextCandidate) {
            setSelectedPlayerToStart(nextCandidate.id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Player actions
  const handleSavePlayer = async () => {
    if (!playerModal?.name || !playerModal?.category || !playerModal?.base_price) {
      return showToast('Please fill all required player fields', 'warning');
    }
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: playerModal.id,
        name: playerModal.name,
        category: playerModal.category,
        position: playerModal.position || 'Forward',
        basePrice: playerModal.base_price,
        photoUrl: playerModal.photo_url,
        sortOrder: playerModal.sort_order || 0,
      }),
    });
    if (res.ok) {
      showToast('Player saved successfully', 'success');
      setPlayerModal(null);
      loadAdminData();
    } else {
      showToast('Failed to save player', 'danger');
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', id }),
    });
    if (res.ok) {
      showToast('Player deleted', 'success');
      loadAdminData();
    }
  };

  // Team actions
  const handleSaveTeam = async () => {
    if (!teamModal?.name) return showToast('Team name required', 'warning');
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: teamModal.id,
        name: teamModal.name,
        logoUrl: teamModal.logo_url || null,
      }),
    });
    if (res.ok) {
      showToast('Team saved successfully', 'success');
      setTeamModal(null);
      loadAdminData();
    } else {
      showToast('Failed to save team', 'danger');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', id }),
    });
    if (res.ok) {
      showToast('Team deleted', 'success');
      loadAdminData();
    }
  };

  // Settings save
  const handleSaveSettings = async () => {
    if (!settings) return;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalBudget: settings.total_budget,
        bidIncrement: settings.bid_increment,
        countdownTime: settings.countdown_time,
        logoUrl: settings.logo_url,
      }),
    });
    if (res.ok) showToast('Settings updated', 'success');
  };

  // Load player onto board
  const handleLoadPlayer = async (playerIdToLoad?: string) => {
    const pId = playerIdToLoad || selectedPlayerToStart;
    if (!pId) return showToast('No player selected', 'warning');
    const res = await fetch('/api/auction/start-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: pId }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Loaded ${data.player} to Auction Board!`, 'success');
      loadAdminData();
    } else {
      showToast(data.error || 'Failed to start player', 'danger');
    }
  };

  const handleNextPlayer = async () => {
    const res = await fetch('/api/auction/next-player', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(`Loaded ${data.player?.name} (Cat ${data.category}) to Auction Board!`, 'success');
      loadAdminData();
    } else {
      showToast(data.error || 'Failed to load next player', 'danger');
    }
  };

  const handleSell = async () => {
    const res = await fetch('/api/auction/sell', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Player SOLD!', 'success');
      loadAdminData();
    } else {
      showToast(data.error || 'Failed to sell player', 'danger');
    }
  };

  const handleUnsold = async () => {
    const res = await fetch('/api/auction/unsold', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast('Player marked UNSOLD. Will be re-auctioned within this category.', 'warning');
      loadAdminData();
    } else {
      showToast(data.error || 'Failed to mark unsold', 'danger');
    }
  };

  const handlePause = async () => {
    const res = await fetch('/api/auction/pause', { method: 'POST' });
    if (res.ok) {
      showToast('Timer PAUSED', 'info');
      loadAdminData();
    }
  };

  const handleResume = async () => {
    const res = await fetch('/api/auction/resume', { method: 'POST' });
    if (res.ok) {
      showToast('Timer RESUMED', 'success');
      loadAdminData();
    }
  };

  const handleUndoBid = async () => {
    if (!confirm('Are you sure you want to undo the last bid?')) return;
    const res = await fetch('/api/auction/undo-bid', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Last bid undone!', 'warning');
      loadAdminData();
    } else {
      showToast(data.error || 'Failed to undo bid', 'danger');
    }
  };

  const handleResetAuction = async () => {
    if (!confirm('Are you sure you want to reset the live auction session?\n\nThis will:\n• Return all players to "UPCOMING"\n• Reset all team budgets & spent amounts to 0 (100% full budget)\n• Clear all live bids & history\n• Reset live timer & board state\n\n✅ Your player profiles, photos, and team registrations will NOT be deleted.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_AUCTION' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Auction reset successfully! Ready for a new auction.', 'success');
        loadAdminData();
      } else {
        showToast(data.error || 'Failed to reset auction', 'danger');
      }
    } catch (e: any) {
      showToast(e.message || 'Error resetting auction', 'danger');
    }
  };

  const handleResetAll = async () => {
    const confirmation = prompt('⚠️ FACTORY RESET WARNING: This will permanently delete ALL players, teams, bids, and history from the database.\n\nType "CONFIRM WIPE" to proceed:');
    if (confirmation !== 'CONFIRM WIPE') {
      if (confirmation !== null) showToast('Factory reset cancelled', 'info');
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_ALL' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Factory reset completed!', 'success');
        loadAdminData();
      } else {
        showToast(data.error || 'Failed to perform factory reset', 'danger');
      }
    } catch (e: any) {
      showToast(e.message || 'Error performing factory reset', 'danger');
    }
  };

  // Category filter for manual control
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('ALL');

  // Compute active category and metrics
  const activeCategory = getActiveCategory(players);
  const livePlayer = players.find(p => p.id === auctionState?.current_player_id);
  const leadingTeam = teams.find(t => t.id === auctionState?.leading_team_id);
  const isLiveAuction = auctionState?.status === 'LIVE';

  // Filtered players list based on admin category selection
  const filteredPlayers = selectedCatFilter === 'ALL'
    ? players
    : players.filter(p => p.category.toUpperCase() === selectedCatFilter.toUpperCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header logoUrl={settings?.logo_url} />

      <main className="app-container">
        <div className="admin-layout glass" style={{ height: '100%' }}>
          {/* Admin Sidebar */}
          <div className="admin-sidebar">
            <h3>ADMIN CONTROL</h3>
            <button
              className={`admin-nav-btn ${activePane === 'control' ? 'active' : ''}`}
              onClick={() => setActivePane('control')}
            >
              Live Control
            </button>
            <button
              className={`admin-nav-btn ${activePane === 'players' ? 'active' : ''}`}
              onClick={() => setActivePane('players')}
            >
              Manage Players
            </button>
            <button
              className={`admin-nav-btn ${activePane === 'teams' ? 'active' : ''}`}
              onClick={() => setActivePane('teams')}
            >
              Manage Franchises
            </button>
            <button
              className={`admin-nav-btn ${activePane === 'settings' ? 'active' : ''}`}
              onClick={() => setActivePane('settings')}
            >
              League Settings
            </button>

            <div style={{ margin: '14px 0 8px', borderTop: '1px solid var(--border-glass)' }} />

            <button
              className="admin-nav-btn"
              style={{
                color: 'var(--accent-gold)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(255, 215, 0, 0.06)',
                fontWeight: 700,
                textAlign: 'left',
              }}
              onClick={handleResetAuction}
              title="Reset auction state to start from scratch. Keeps players & teams."
            >
              🔄 Reset Auction
            </button>
          </div>

          {/* Admin Body */}
          <div className="admin-body">
            {/* LIVE CONTROL PANE */}
            {activePane === 'control' && (
              <div className="admin-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingRight: '6px' }}>

                {/* 8-CATEGORY STATISTICS & PLAYER COUNTER MATRIX */}
                <div className="control-box glass" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '1px', color: 'var(--accent-gold)' }}>
                      📊 CATEGORY PLAYER COUNT &amp; PROGRESS MATRIX
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Click any category card to filter players below
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                    {CATEGORY_ORDER.map((cat) => {
                      const prog = getCategoryProgress(players, cat);
                      const isSelected = selectedCatFilter === cat;

                      return (
                        <div
                          key={cat}
                          onClick={() => setSelectedCatFilter(selectedCatFilter === cat ? 'ALL' : cat)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: isSelected
                              ? '2px solid var(--accent-gold)'
                              : prog.total > 0 && prog.sold === prog.total
                              ? '1px solid rgba(0, 210, 106, 0.4)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            background: isSelected
                              ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.2), rgba(0, 0, 0, 0.6))'
                              : prog.total > 0 && prog.sold === prog.total
                              ? 'rgba(0, 210, 106, 0.08)'
                              : 'rgba(0, 0, 0, 0.25)',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.3)' : 'none',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{
                            fontFamily: 'var(--font-sports)',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            color: isSelected ? 'var(--accent-gold)' : 'var(--text-white)'
                          }}>
                            CAT {cat}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '2px', color: 'var(--accent-blue)' }}>
                            {prog.total} {prog.total === 1 ? 'Player' : 'Players'}
                          </div>
                          <div style={{ fontSize: '0.65rem', marginTop: '3px', display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#00d26a', fontWeight: 600 }}>✅ {prog.sold}</span>
                            {prog.unsold > 0 && <span style={{ color: '#ff4455', fontWeight: 700 }}>⚠️ {prog.unsold}</span>}
                            {prog.upcoming > 0 && <span style={{ color: 'var(--text-gray)' }}>⏳ {prog.upcoming}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* MANUAL AUCTION CONTROL GRID */}
                <div className="admin-control-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>

                  {/* LEFT: SELECT & START ANY PLAYER */}
                  <div className="control-box glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                        🎯 SELECT &amp; START ANY PLAYER
                      </h3>
                      {selectedCatFilter !== 'ALL' && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setSelectedCatFilter('ALL')}
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          Show All Categories
                        </button>
                      )}
                    </div>

                    {/* SELECT PLAYER FROM QUEUE */}
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                        Select Player ({selectedCatFilter === 'ALL' ? 'All Categories' : `Category ${selectedCatFilter}`}):
                      </label>
                      <select
                        className="form-control"
                        value={selectedPlayerToStart}
                        onChange={(e) => setSelectedPlayerToStart(e.target.value)}
                      >
                        {filteredPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            [CAT {p.category}] #{p.sort_order} {p.name} ({p.position}) — ৳{p.base_price.toLocaleString()} [{p.status}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-accent btn-large"
                        style={{ flex: 1, fontWeight: 700 }}
                        onClick={() => handleLoadPlayer(selectedPlayerToStart)}
                        disabled={!selectedPlayerToStart}
                      >
                        ▶ LOAD SELECTED PLAYER TO AUCTION BOARD ➔
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleNextPlayer}
                        title="Load next available player from queue"
                      >
                        Auto Next
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: LIVE BOARD ACTIONS */}
                  <div className="control-box glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>LIVE AUCTION CONTROLS</h3>
                      <span className={`badge-cnt ${isLiveAuction ? 'live' : ''}`} style={{
                        background: isLiveAuction ? 'rgba(0, 210, 106, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: isLiveAuction ? '#00d26a' : 'var(--text-gray)',
                        padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem'
                      }}>
                        STATUS: {auctionState?.status || 'IDLE'}
                      </span>
                    </div>

                    {livePlayer ? (
                      <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border-neon)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-white)' }}>
                            🔴 {livePlayer.name} <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>(CAT {livePlayer.category})</span>
                          </span>
                          <span style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-sports)' }}>
                            ৳{auctionState?.current_bid ? auctionState.current_bid.toLocaleString() : livePlayer.base_price.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Leading Bidder: <strong style={{ color: leadingTeam ? 'var(--accent-gold)' : 'var(--text-white)' }}>{leadingTeam ? leadingTeam.name : 'No bids yet'}</strong> | Timer: {auctionState?.timer || 0}s
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No player currently on the live auction board. Select any player on the left to start!
                      </div>
                    )}

                    <div className="btn-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        className="btn btn-success btn-large"
                        style={{ fontWeight: 800 }}
                        onClick={handleSell}
                        disabled={!livePlayer}
                      >
                        ✅ SELL PLAYER
                      </button>
                      <button
                        className="btn btn-danger btn-large"
                        style={{ fontWeight: 800 }}
                        onClick={handleUnsold}
                        disabled={!livePlayer}
                      >
                        ❌ MARK UNSOLD
                      </button>
                      <button className="btn btn-warning" onClick={handlePause} disabled={!livePlayer}>
                        ⏸ PAUSE TIMER
                      </button>
                      <button className="btn btn-primary" onClick={handleResume} disabled={!livePlayer}>
                        ▶ RESUME TIMER
                      </button>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-undo-action"
                        disabled={!leadingTeam && (!auctionState?.current_bid || auctionState.current_bid === 0)}
                        onClick={handleUndoBid}
                        title="Undo the most recent live bid"
                      >
                        ↩ UNDO LAST BID
                      </button>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start a fresh session anytime:</span>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 12px', color: 'var(--accent-gold)', border: '1px solid rgba(255, 215, 0, 0.3)' }}
                        onClick={handleResetAuction}
                      >
                        🔄 Reset Auction
                      </button>
                    </div>
                  </div>

                </div>

                {/* PLAYERS ROSTER TABLE WITH 1-CLICK START ACTION */}
                <div className="control-box glass" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-white)', fontSize: '0.9rem' }}>
                      📋 ALL PLAYERS LIST ({selectedCatFilter === 'ALL' ? `All Categories — ${players.length} Total` : `Category ${selectedCatFilter} — ${filteredPlayers.length} Total`})
                    </h4>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['ALL', ...CATEGORY_ORDER].map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedCatFilter(c)}
                          className={`btn ${selectedCatFilter === c ? 'btn-accent' : 'btn-secondary'}`}
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Player Name</th>
                        <th>Category</th>
                        <th>Position</th>
                        <th>Base Price</th>
                        <th>Status</th>
                        <th>Sold To</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                            No players found in this category.
                          </td>
                        </tr>
                      ) : (
                        filteredPlayers.map((p) => {
                          const buyerTeam = teams.find(t => t.id === p.sold_to);
                          const isSold = p.status === 'SOLD';
                          const isUnsold = p.status === 'UNSOLD';
                          const isLive = p.status === 'LIVE';

                          return (
                            <tr key={p.id}>
                              <td>#{p.sort_order}</td>
                              <td style={{ fontWeight: 700 }}>{p.name}</td>
                              <td><span className="player-card-category" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>CAT {p.category}</span></td>
                              <td>{p.position}</td>
                              <td className="text-accent">৳{p.base_price.toLocaleString()}</td>
                              <td>
                                <span className={`player-card-badge badge-${p.status.toLowerCase()}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ color: buyerTeam ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                {buyerTeam ? buyerTeam.name : '—'}
                              </td>
                              <td>
                                {isLive ? (
                                  <span style={{ color: '#00d26a', fontWeight: 800 }}>🔴 LIVE NOW</span>
                                ) : (
                                  <button
                                    className="btn btn-accent btn-small"
                                    onClick={() => handleLoadPlayer(p.id)}
                                    style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}
                                  >
                                    {isSold ? 'Re-Start' : isUnsold ? 'Re-Auction' : '▶ Start Auction'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* PLAYERS PANE */}
            {activePane === 'players' && (() => {
              const ALL_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
              const defaultPrices: Record<string, number> = {
                A: 25000, B: 18000, C: 15000, D: 12000,
                E: 10000, F: 8000, G: 7000, H: 5000,
              };

              // Filter players by category, search text, and status
              const applyFilters = (plist: Player[]) => {
                return plist.filter(p => {
                  if (managerCategoryFilter !== 'ALL' && p.category.toUpperCase() !== managerCategoryFilter.toUpperCase()) {
                    return false;
                  }
                  if (managerStatusFilter !== 'ALL' && p.status.toUpperCase() !== managerStatusFilter.toUpperCase()) {
                    return false;
                  }
                  if (managerSearchQuery.trim()) {
                    const q = managerSearchQuery.toLowerCase();
                    const buyerTeam = teams.find(t => t.id === p.sold_to);
                    return (
                      p.name.toLowerCase().includes(q) ||
                      p.position.toLowerCase().includes(q) ||
                      (buyerTeam && buyerTeam.name.toLowerCase().includes(q))
                    );
                  }
                  return true;
                });
              };

              const displayedPlayers = applyFilters(players);

              const openAddPlayerModal = (cat?: string) => {
                const targetCat = cat || (managerCategoryFilter !== 'ALL' ? managerCategoryFilter : 'A');
                setPlayerModal({
                  name: '',
                  category: targetCat,
                  position: 'Forward',
                  base_price: defaultPrices[targetCat] || 5000,
                  sort_order: players.length + 1,
                });
              };

              const renderPlayerTable = (playerList: Player[], categoryLabel?: string) => {
                if (playerList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      No players found {categoryLabel ? `in Category ${categoryLabel}` : ''}.
                    </div>
                  );
                }

                return (
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Order</th>
                          <th style={{ width: '50px' }}>Photo</th>
                          <th>Name</th>
                          <th style={{ width: '80px' }}>Category</th>
                          <th>Position</th>
                          <th>Base Price</th>
                          <th>Status</th>
                          <th>Sold Info</th>
                          <th style={{ width: '220px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerList.map((p) => {
                          const buyerTeam = teams.find(t => t.id === p.sold_to);
                          const isLive = p.status === 'LIVE';

                          return (
                            <tr key={p.id}>
                              <td><strong>#{p.sort_order}</strong></td>
                              <td>
                                {p.photo_url ? (
                                  <img src={p.photo_url} alt={p.name} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--border-glass)' }} />
                                ) : (
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {p.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, fontSize: '0.92rem' }}>{p.name}</td>
                              <td>
                                <span className="player-card-category" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                  CAT {p.category}
                                </span>
                              </td>
                              <td>{p.position}</td>
                              <td className="text-accent" style={{ fontWeight: 700 }}>৳{p.base_price.toLocaleString()}</td>
                              <td>
                                <span className={`player-card-badge badge-${p.status.toLowerCase()}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>
                                {p.status === 'SOLD' && buyerTeam ? (
                                  <div>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{buyerTeam.name}</span>
                                    <div style={{ color: '#00d26a', fontWeight: 700 }}>৳{p.sold_price?.toLocaleString()}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                    onClick={() => setPlayerModal(p)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                    onClick={() => handleDeletePlayer(p.id)}
                                  >
                                    🗑️ Delete
                                  </button>
                                  {!isLive && (
                                    <button
                                      className="btn btn-accent"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                                      onClick={() => handleLoadPlayer(p.id)}
                                      title="Load directly to Live Auction Board"
                                    >
                                      ▶ Load
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              };

              return (
                <div className="admin-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* PANE HEADER */}
                  <div className="pane-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-white)' }}>
                        👥 PLAYERS MANAGEMENT ({players.length} Total)
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                        Manage player profiles, categories, base prices, photos, and live auction order.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* View Mode Toggle */}
                      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--border-glass)', padding: '2px' }}>
                        <button
                          type="button"
                          className={`btn ${managerViewMode === 'tabbed' ? 'btn-accent' : 'btn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                          onClick={() => setManagerViewMode('tabbed')}
                        >
                          📑 Category Tabs
                        </button>
                        <button
                          type="button"
                          className={`btn ${managerViewMode === 'grouped' ? 'btn-accent' : 'btn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                          onClick={() => setManagerViewMode('grouped')}
                        >
                          📜 Group All Categories
                        </button>
                      </div>

                      <button
                        className="btn btn-accent"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={() => openAddPlayerModal()}
                      >
                        + Add New Player
                      </button>
                    </div>
                  </div>

                  {/* CATEGORY FILTER TABS (Always visible in Tabbed Mode) */}
                  {managerViewMode === 'tabbed' && (
                    <div className="cat-filter-bar" style={{ margin: '4px 0 0 0' }}>
                      <button
                        type="button"
                        className={`cat-pill-btn ${managerCategoryFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setManagerCategoryFilter('ALL')}
                      >
                        ALL CATEGORIES
                        <span className="cat-pill-badge">{players.length}</span>
                      </button>
                      {ALL_CATEGORIES.map((cat) => {
                        const catPlayers = players.filter(p => p.category.toUpperCase() === cat);
                        const soldCount = catPlayers.filter(p => p.status === 'SOLD').length;
                        const isComplete = catPlayers.length > 0 && soldCount === catPlayers.length;

                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`cat-pill-btn ${managerCategoryFilter === cat ? 'active' : ''}`}
                            onClick={() => setManagerCategoryFilter(cat)}
                          >
                            CAT {cat}
                            <span className="cat-pill-badge">{catPlayers.length}</span>
                            {isComplete && <span style={{ fontSize: '0.7rem' }}>✅</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SEARCH & STATUS FILTER ROW */}
                  <div className="admin-players-filter-row glass" style={{ padding: '10px 14px', borderRadius: '8px', margin: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="🔍 Search player name, position, team..."
                        className="admin-search-input"
                        value={managerSearchQuery}
                        onChange={(e) => setManagerSearchQuery(e.target.value)}
                      />
                      <select
                        className="admin-search-input"
                        style={{ minWidth: '140px' }}
                        value={managerStatusFilter}
                        onChange={(e) => setManagerStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="UPCOMING">Upcoming</option>
                        <option value="LIVE">Live</option>
                        <option value="SOLD">Sold</option>
                        <option value="UNSOLD">Unsold</option>
                      </select>

                      {(managerSearchQuery || managerStatusFilter !== 'ALL' || (managerViewMode === 'tabbed' && managerCategoryFilter !== 'ALL')) && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => {
                            setManagerSearchQuery('');
                            setManagerStatusFilter('ALL');
                            setManagerCategoryFilter('ALL');
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                      Showing <strong>{displayedPlayers.length}</strong> of {players.length} players
                    </div>
                  </div>

                  {/* TABBED VIEW MODE */}
                  {managerViewMode === 'tabbed' && (
                    <div className="glass" style={{ padding: '14px', borderRadius: '10px' }}>
                      {managerCategoryFilter !== 'ALL' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontFamily: 'var(--font-sports)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                              🏷️ CATEGORY {managerCategoryFilter}
                            </span>
                            <span className="cat-stat-chip" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                              Base Price: ৳{(defaultPrices[managerCategoryFilter] || 5000).toLocaleString()}
                            </span>
                          </div>
                          <button
                            className="btn btn-accent"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            onClick={() => openAddPlayerModal(managerCategoryFilter)}
                          >
                            + Add Player to CAT {managerCategoryFilter}
                          </button>
                        </div>
                      )}
                      {renderPlayerTable(displayedPlayers, managerCategoryFilter !== 'ALL' ? managerCategoryFilter : undefined)}
                    </div>
                  )}

                  {/* GROUPED VIEW MODE (Displays category by category sections) */}
                  {managerViewMode === 'grouped' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {ALL_CATEGORIES.map((cat) => {
                        const catPlayers = players.filter(p => p.category.toUpperCase() === cat);
                        const filteredCatPlayers = applyFilters(catPlayers);
                        const soldCount = catPlayers.filter(p => p.status === 'SOLD').length;
                        const unsoldCount = catPlayers.filter(p => p.status === 'UNSOLD').length;
                        const upcomingCount = catPlayers.filter(p => p.status === 'UPCOMING').length;

                        // If user is searching/filtering and no players match this category, skip
                        if ((managerSearchQuery || managerStatusFilter !== 'ALL') && filteredCatPlayers.length === 0) {
                          return null;
                        }

                        return (
                          <div key={cat} className="glass" style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 215, 0, 0.15)' }}>
                            {/* Category Header */}
                            <div className="cat-section-header" style={{ margin: '0 0 12px 0' }}>
                              <div className="cat-section-title">
                                <span>🏷️ CATEGORY {cat}</span>
                                <span className="cat-stat-chip" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                                  Base: ৳{(defaultPrices[cat] || 5000).toLocaleString()}
                                </span>
                                <span className="cat-stat-chip" style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                                  {catPlayers.length} {catPlayers.length === 1 ? 'Player' : 'Players'}
                                </span>
                              </div>

                              <div className="cat-section-stats">
                                <span style={{ color: '#00d26a', fontWeight: 600 }}>✅ {soldCount} Sold</span>
                                {unsoldCount > 0 && <span style={{ color: '#ff4455', fontWeight: 600 }}>⚠️ {unsoldCount} Unsold</span>}
                                <span style={{ color: 'var(--text-muted)' }}>⏳ {upcomingCount} Upcoming</span>
                                <button
                                  className="btn btn-accent"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: '6px' }}
                                  onClick={() => openAddPlayerModal(cat)}
                                >
                                  + Add to CAT {cat}
                                </button>
                              </div>
                            </div>

                            {/* Category Table */}
                            {renderPlayerTable(filteredCatPlayers, cat)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TEAMS PANE */}
            {activePane === 'teams' && (
              <div className="admin-pane active">
                <div className="pane-header">
                  <h2>FRANCHISE MANAGEMENT ({teams.length})</h2>
                  <button className="btn btn-accent" onClick={() => setTeamModal({ name: '', logo_url: null })}>
                    + Add New Team
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Logo</th>
                        <th>Team Name</th>
                        <th>Spent</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t) => (
                        <tr key={t.id}>
                          <td>
                            {t.logo_url ? (
                              t.logo_url.startsWith('http') || t.logo_url.startsWith('data:') || t.logo_url.startsWith('/') ? (
                                <img src={t.logo_url} alt={t.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '1.4rem' }}>{t.logo_url}</span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                                {t.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td className="text-danger">৳{t.spent.toLocaleString()}</td>
                          <td>
                            <button className="btn btn-secondary" style={{ marginRight: 6 }} onClick={() => setTeamModal(t)}>
                              Edit
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDeleteTeam(t.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SETTINGS PANE */}
            {activePane === 'settings' && settings && (
              <div className="admin-pane active">
                <div className="settings-form glass">
                  <h2>GLOBAL AUCTION CONFIG</h2>
                  <div className="form-group">
                    <label>Total Budget per Franchise (৳):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.total_budget}
                      onChange={(e) => setSettings({ ...settings, total_budget: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bid Increment (৳):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.bid_increment}
                      onChange={(e) => setSettings({ ...settings, bid_increment: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Timer Countdown (seconds):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.countdown_time}
                      onChange={(e) => setSettings({ ...settings, countdown_time: Number(e.target.value) })}
                    />
                  </div>

                  {/* LEAGUE LOGO SECTION */}
                  <div className="form-group" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-neon-gold)' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '1px' }}>
                      🏆 LEAGUE / ORGANIZER LOGO (Header &amp; Footer)
                    </label>

                    {/* Current Logo Preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '12px 0' }}>
                      <img
                        src={settings.logo_url || '/rangdhanu-logo.png'}
                        alt="Current Logo"
                        style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '10px', border: '2px solid var(--border-neon-gold)', background: '#000' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/rangdhanu-logo.png'; }}
                      />
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-white)', fontWeight: 600 }}>Current Logo Preview</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shown in both the header and footer of the broadcast screen</div>
                      </div>
                    </div>

                    {/* Manual URL input */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>Or paste an image URL directly:</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="https://... or leave blank to use default Rangdhanu logo"
                        value={settings.logo_url || ''}
                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                        style={{ marginTop: '4px' }}
                      />
                    </div>

                    {/* File Upload via Supabase Storage */}
                    <ImageUpload
                      folder="league-logo"
                      entityId="dpl-league-crest"
                      currentUrl={settings.logo_url}
                      label="📤 Upload Photo from your device (Supabase Storage)"
                      onUploadSuccess={(url) => setSettings({ ...settings, logo_url: url })}
                    />
                  </div>

                  <button className="btn btn-accent btn-block" style={{ marginTop: 20 }} onClick={handleSaveSettings}>
                    Save Global Settings
                  </button>

                  {/* AUCTION RESET & RE-USE SECTION */}
                  <div style={{ marginTop: '28px', padding: '18px', background: 'rgba(255, 170, 0, 0.06)', border: '1px solid rgba(255, 170, 0, 0.3)', borderRadius: '10px' }}>
                    <h3 style={{ color: 'var(--accent-gold)', margin: '0 0 8px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔄 RE-USE / RESET AUCTION SESSION
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      Want to run another auction or test from scratch? This button resets all players back to <strong>UPCOMING</strong>, restores all franchise budgets to <strong>100%</strong> (৳{settings.total_budget.toLocaleString()}), and clears all previous bids &amp; history. <em>All your registered player profiles, photos, and teams remain completely safe in the database!</em>
                    </p>
                    <button
                      className="btn btn-warning btn-block"
                      style={{ fontWeight: 700, padding: '10px 16px', fontSize: '0.95rem' }}
                      onClick={handleResetAuction}
                    >
                      🔄 RESET AUCTION (Keep Players &amp; Teams, Start Over)
                    </button>
                  </div>

                  {/* DANGER FACTORY WIPE */}
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255, 0, 85, 0.05)', border: '1px solid rgba(255, 0, 85, 0.3)', borderRadius: '10px' }}>
                    <h3 style={{ color: 'var(--accent-red)', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                      ⚠️ FACTORY RESET (WIPE DATABASE)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                      Permanently wipes ALL players, franchises, bids, and history from the database.
                    </p>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      onClick={handleResetAll}
                    >
                      Wipe All Database Records
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PLAYER MODAL */}
      {playerModal && (
        <div className="modal">
          <div className="modal-content glass">
            <h2>{playerModal.id ? 'Edit Player' : 'Add New Player'}</h2>
            <div className="form-group">
              <label>Player Name:</label>
              <input
                type="text"
                className="form-control"
                value={playerModal.name || ''}
                onChange={(e) => setPlayerModal({ ...playerModal, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category (H → G → F → E → D → C → B → A):</label>
              <select
                className="form-control"
                value={playerModal.category || 'H'}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const defaultPrices: Record<string, number> = {
                    H: 5000,
                    G: 7000,
                    F: 8000,
                    E: 10000,
                    D: 12000,
                    C: 15000,
                    B: 18000,
                    A: 25000,
                  };
                  setPlayerModal({
                    ...playerModal,
                    category: newCat,
                    base_price: playerModal.base_price && playerModal.id ? playerModal.base_price : (defaultPrices[newCat] || 5000),
                  });
                }}
              >
                <option value="H">Category H (Base: ৳5,000)</option>
                <option value="G">Category G (Base: ৳7,000)</option>
                <option value="F">Category F (Base: ৳8,000)</option>
                <option value="E">Category E (Base: ৳10,000)</option>
                <option value="D">Category D (Base: ৳12,000)</option>
                <option value="C">Category C (Base: ৳15,000)</option>
                <option value="B">Category B (Base: ৳18,000)</option>
                <option value="A">Category A (Base: ৳25,000)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Position:</label>
              <input
                type="text"
                className="form-control"
                value={playerModal.position || ''}
                onChange={(e) => setPlayerModal({ ...playerModal, position: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Base Price (৳):</label>
              <input
                type="number"
                className="form-control"
                value={playerModal.base_price || 5000}
                onChange={(e) => setPlayerModal({ ...playerModal, base_price: Number(e.target.value) })}
              />
            </div>

            {/* Supabase Storage File Upload for Player Photo */}
            <ImageUpload
              folder="player-photos"
              entityId={playerModal.id || `player-${Date.now()}`}
              currentUrl={playerModal.photo_url}
              label="Upload Player Photo to Supabase Storage"
              onUploadSuccess={(url) => setPlayerModal({ ...playerModal, photo_url: url })}
            />

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPlayerModal(null)}>
                Cancel
              </button>
              <button className="btn btn-accent" onClick={handleSavePlayer}>
                Save Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {teamModal && (
        <div className="modal">
          <div className="modal-content glass">
            <h2>{teamModal.id ? 'Edit Franchise' : 'Add New Franchise'}</h2>
            <div className="form-group">
              <label>Team Name:</label>
              <input
                type="text"
                className="form-control"
                value={teamModal.name || ''}
                onChange={(e) => setTeamModal({ ...teamModal, name: e.target.value })}
              />
            </div>

            {/* Supabase Storage Upload for Team Logo */}
            <ImageUpload
              folder="team-logos"
              entityId={teamModal.id || `team-${Date.now()}`}
              currentUrl={teamModal.logo_url}
              label="Upload Team Logo to Supabase Storage"
              onUploadSuccess={(url) => setTeamModal({ ...teamModal, logo_url: url })}
            />

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setTeamModal(null)}>
                Cancel
              </button>
              <button className="btn btn-accent" onClick={handleSaveTeam}>
                Save Franchise
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast-container ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
