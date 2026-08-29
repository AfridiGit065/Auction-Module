'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import SoldOverlay from '@/components/SoldOverlay';
import { createClient } from '@/lib/supabase/client';
import { AuctionSnapshot, Player, Team } from '@/lib/types';

/** Renders a team logo image or text fallback */
function TeamLogo({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const isImg = url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/'));
  if (isImg) {
    return (
      <img
        src={url!}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  // emoji or text fallback
  if (url && url.length <= 4) {
    return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>{url}</span>;
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--bg-tertiary)', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'var(--accent-gold)', flexShrink: 0
    }}>
      {name.substring(0, 2).toUpperCase()}
    </span>
  );
}

export default function BroadcastAuctionBoardPage() {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<string>('live-auction-tab');
  const [activeSquadTeamId, setActiveSquadTeamId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [soldModal, setSoldModal] = useState<{ player: Player; team: Team | null; price: number; type: 'SOLD' | 'UNSOLD' } | null>(null);

  // All Players Tab Filters
  const [playerTabCategory, setPlayerTabCategory] = useState<string>('ALL');
  const [playerTabSearch, setPlayerTabSearch] = useState<string>('');
  const [playerTabStatus, setPlayerTabStatus] = useState<string>('ALL');
  const [teamCustomInputs, setTeamCustomInputs] = useState<Record<string, number>>({});

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/auction/snapshot', { cache: 'no-store' });
      if (res.ok) {
        const data: AuctionSnapshot = await res.json();
        setSnapshot((prev) => {
          if (prev && prev.auction_state.status === 'LIVE' && data.auction_state.status === 'SOLD') {
            const player = data.players.find(p => p.id === data.auction_state.current_player_id);
            const team = data.teams.find(t => t.id === data.auction_state.leading_team_id);
            if (player) {
              setSoldModal({ player, team: team || null, price: data.auction_state.current_bid, type: 'SOLD' });
            }
          } else if (prev && prev.auction_state.status === 'LIVE' && data.auction_state.status === 'UNSOLD') {
            const player = data.players.find(p => p.id === data.auction_state.current_player_id);
            if (player) {
              setSoldModal({ player, team: null, price: 0, type: 'UNSOLD' });
            }
          }
          return data;
        });

        if (!activeSquadTeamId && data.teams.length > 0) {
          setActiveSquadTeamId(data.teams[0].id);
        }
      }
    } catch (e) {
      console.error('Snapshot fetch error:', e);
    }
  }, [activeSquadTeamId]);

  useEffect(() => {
    fetchSnapshot();

    const supabase = createClient();
    if (!supabase) {
      console.warn("Supabase credentials not configured in .env.local yet. Operating in local mode.");
      return;
    }

    const channel = supabase
      .channel('realtime_broadcast_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => fetchSnapshot())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => fetchSnapshot())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchSnapshot())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchSnapshot())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchSnapshot())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSnapshot]);

  // Digital countdown tick
  useEffect(() => {
    if (!snapshot || !snapshot.auction_state.timer_active) return;
    const interval = setInterval(() => {
      setSnapshot((prev) => {
        if (!prev || !prev.auction_state.timer_active || prev.auction_state.timer <= 0) return prev;
        return {
          ...prev,
          auction_state: {
            ...prev.auction_state,
            timer: prev.auction_state.timer - 1,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [snapshot?.auction_state.timer_active]);

  const handlePlaceBid = async (teamId: string, amount: number) => {
    const res = await fetch('/api/auction/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, amount }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Bid rejected', 'danger');
    } else {
      showToast(`Bid placed: ৳${amount.toLocaleString()}`, 'success');
      fetchSnapshot();
    }
  };

  const handleSell = async () => {
    const res = await fetch('/api/auction/sell', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) showToast(data.error, 'danger');
    else fetchSnapshot();
  };

  const handleUnsold = async () => {
    const res = await fetch('/api/auction/unsold', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) showToast(data.error, 'danger');
    else fetchSnapshot();
  };

  const handleUndoBid = async () => {
    if (!confirm('Are you sure you want to undo the last bid?')) return;
    const res = await fetch('/api/auction/undo-bid', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Last bid undone!', 'warning');
      fetchSnapshot();
    } else {
      showToast(data.error || 'Failed to undo bid', 'danger');
    }
  };

  const handleNextPlayer = async () => {
    const currentCat = snapshot?.current_player?.category;
    const res = await fetch('/api/auction/next-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: currentCat }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'No upcoming players in queue', 'warning');
    } else {
      showToast(
        data.message || `Next Player Loaded: ${data.player?.name || ''}`,
        data.isUnsoldRound ? 'warning' : 'success'
      );
      fetchSnapshot();
    }
  };

  if (!snapshot) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <h2 className="text-accent">Loading DEOVOG Premier League Auction Board...</h2>
      </div>
    );
  }

  const { settings, teams, players, auction_state, current_player, leading_team, bids } = snapshot;

  const nextMinBid = auction_state.current_bid > 0
    ? auction_state.current_bid + settings.bid_increment
    : (current_player?.base_price || 0);

  const formattedTimer = `00:${String(auction_state.timer || 0).padStart(2, '0')}`;
  const activeSquadTeam = teams.find(t => t.id === activeSquadTeamId) || teams[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      <Header
        logoUrl={settings.logo_url}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        currentPlayer={current_player}
        totalPlayers={players.length}
      />

      <main className="app-container">
        {/* LIVE AUCTION TAB (FULL-SCREEN 2-COLUMN BROADCAST DASHBOARD) */}
        {activeTab === 'live-auction-tab' && (
          <div className="live-auction-2col-dashboard">

            {/* LEFT COLUMN (50% WIDTH): PLAYER INFO (60% HEIGHT) + LIVE BID LOG (40% HEIGHT) */}
            <div className="dashboard-col left-col">
              {/* TOP (60%): PLAYER PHOTO + INFO */}
              <div className="card-player-info glass">
                <div className="player-photo-side">
                  {current_player?.photo_url ? (
                    <img src={current_player.photo_url} alt={current_player.name} />
                  ) : (
                    <div className="fallback-avatar">
                      {current_player ? current_player.name.substring(0, 2).toUpperCase() : 'N/A'}
                    </div>
                  )}
                </div>

                <div className="player-details-side">
                  <h2 className="player-name-heading">
                    {current_player ? current_player.name : 'NO PLAYER LOADED'}
                  </h2>

                  <div className="player-meta-pill">
                    <span className="lbl">Position:</span>
                    <span className="val">{current_player?.position || '—'}</span>
                  </div>

                  <div className="player-meta-pill">
                    <span className="lbl">Category:</span>
                    <span className="val text-accent">CATEGORY {current_player?.category || '—'}</span>
                  </div>

                  <div className="player-meta-pill base-price-highlight">
                    <span className="lbl">Base Price:</span>
                    <span className="val text-gold">৳{current_player ? current_player.base_price.toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM (40%): LIVE BID LOG */}
              <div className="card-live-log glass">
                <div className="panel-header-bar">
                  <h3>📋 LIVE BID LOG</h3>
                  <span className="badge-cnt">{bids.length} BIDS</span>
                </div>
                <div className="bid-log-scroll-table">
                  {bids.length === 0 ? (
                    <div className="empty-log">No bids placed for this player yet.</div>
                  ) : (
                    [...bids].reverse().map((b) => (
                      <div key={b.id} className="bid-log-row-item">
                        <span className="team-col">{b.team_name}</span>
                        <span className="amount-col">৳{b.amount.toLocaleString()}</span>
                        <span className="time-col">{new Date(b.created_at || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (50% WIDTH): CURRENT BID (40% HEIGHT) + FRANCHISE BID CONTROLS (60% HEIGHT) */}
            <div className="dashboard-col right-col">
              {/* TOP (40%): CURRENT BID / AUCTION CONTROLS */}
              <div className="card-current-bid glass">
                <div className="bid-center-top">
                  <span className="bid-header-label">CURRENT BID</span>
                  <div className="huge-bid-amount">
                    ৳ {auction_state.current_bid ? auction_state.current_bid.toLocaleString() : '0'}
                  </div>

                  <div className="leading-team-card">
                    <span className="lbl">LEADING BIDDER</span>
                    <div className="name-wrapper">
                      {leading_team?.logo_url ? (
                        leading_team.logo_url.startsWith('http') || leading_team.logo_url.startsWith('data:') || leading_team.logo_url.startsWith('/') ? (
                          <img src={leading_team.logo_url} alt={leading_team.name} className="team-logo-small" />
                        ) : (
                          <span style={{ fontSize: '1.2rem' }}>{leading_team.logo_url}</span>
                        )
                      ) : (
                        <span className="team-logo-placeholder">
                          {leading_team ? leading_team.name.substring(0, 2).toUpperCase() : '—'}
                        </span>
                      )}
                      <span className="team-name">{leading_team ? leading_team.name : 'NO BIDS YET'}</span>
                    </div>
                  </div>
                </div>

                {/* TIMER */}
                <div className={`timer-box-compact ${auction_state.timer <= 0 ? 'time-up' : ''}`}>
                  <span className="timer-lbl">⏱ TIME LEFT</span>
                  <div className="digital-timer-text">
                    {auction_state.timer > 0 ? formattedTimer : 'TIME UP'}
                  </div>
                </div>

                {/* ACTION TRIO BUTTONS */}
                <div className="action-buttons-trio">
                  <button className="btn-pause-action" onClick={async () => {
                    const endpoint = auction_state.status === 'PAUSED' ? '/api/auction/resume' : '/api/auction/pause';
                    const res = await fetch(endpoint, { method: 'POST' });
                    if (res.ok) {
                      showToast(auction_state.status === 'PAUSED' ? 'Auction Resumed' : 'Auction Paused', 'warning');
                      fetchSnapshot();
                    }
                  }}>
                    {auction_state.status === 'PAUSED' ? '▶ RESUME' : '⏸ PAUSE'}
                  </button>

                  {auction_state.status === 'SOLD' || auction_state.status === 'UNSOLD' || current_player?.status === 'SOLD' || current_player?.status === 'UNSOLD' ? (
                    <button
                      className="btn-sell-primary"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)' }}
                      onClick={handleNextPlayer}
                    >
                      ▶ NEXT PLAYER ➔
                    </button>
                  ) : (
                    <button
                      className="btn-sell-primary"
                      disabled={!leading_team}
                      onClick={handleSell}
                    >
                      ✔ SELL PLAYER
                    </button>
                  )}

                  <button className="btn-unsold-action" onClick={handleUnsold}>
                    ✖ MARK UNSOLD
                  </button>
                </div>

                {/* UNDO LAST BID BAR */}
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-undo-action"
                    disabled={!leading_team && bids.length === 0}
                    onClick={handleUndoBid}
                    title="Undo the most recent bid placed on this player"
                  >
                    ↩ UNDO LAST BID
                  </button>
                </div>
              </div>

              {/* FRANCHISE BID CONTROLS */}
              <div className="card-team-bids glass">
                <div className="panel-header-bar">
                  <h3>FRANCHISE BID CONTROLS</h3>
                  <span className="badge-increment">Default: ৳{settings.bid_increment.toLocaleString()} | Max Inc: ৳5,000</span>
                </div>
                <div className="team-bids-scroll">
                  {teams.map((t) => {
                    const budgetInfo = snapshot.teams.find(bt => bt.id === t.id);
                    const remainingBal = budgetInfo?.remaining_balance ?? (settings.total_budget - t.spent);
                    const maxBidAllowed = budgetInfo?.max_bid ?? remainingBal;
                    const isLeading = auction_state.leading_team_id === t.id;
                    const hasBoughtInCat = budgetInfo?.has_bought_in_category ?? false;
                    const isLive = auction_state.status === 'LIVE';

                    const currentBaseAmount = auction_state.current_bid > 0
                      ? auction_state.current_bid
                      : (current_player?.base_price || 0);

                    const customInc = Math.min(5000, Math.max(1000, teamCustomInputs[t.id] ?? settings.bid_increment));
                    const customTargetBid = currentBaseAmount + customInc;
                    const canDefaultBid = !isLeading && !hasBoughtInCat && maxBidAllowed >= nextMinBid && isLive;
                    const canCustomBid = !isLeading && !hasBoughtInCat && maxBidAllowed >= customTargetBid && isLive && customTargetBid >= nextMinBid;

                    return (
                      <div
                        key={t.id}
                        className={`team-bid-row ${isLeading ? 'leading' : ''}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px 12px',
                          marginBottom: '8px',
                          borderRadius: '8px',
                        }}
                      >
                        {/* TOP ROW: Identity + Metrics + Default Bid */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                          <div className="t-identity-col" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <TeamLogo url={t.logo_url} name={t.name} size={32} />
                            <span className="t-name" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                          </div>

                          <div className="t-metrics-col" style={{ display: 'flex', gap: '12px' }}>
                            <div className="m-item">
                              <span className="m-title" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BALANCE</span>
                              <span className="m-amount text-white" style={{ fontSize: '0.82rem', fontWeight: 700 }}>৳{remainingBal.toLocaleString()}</span>
                            </div>
                            <div className="m-item">
                              <span className="m-title" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>MAX BID</span>
                              <span className="m-amount text-success" style={{ fontSize: '0.82rem', fontWeight: 700 }}>৳{maxBidAllowed.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="t-action-col">
                            {canDefaultBid ? (
                              <button
                                className="btn-place-bid"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                onClick={() => handlePlaceBid(t.id, nextMinBid)}
                              >
                                + BID ৳{nextMinBid.toLocaleString()}
                              </button>
                            ) : (
                              <button className="btn-place-bid disabled" style={{ padding: '6px 12px', fontSize: '0.75rem' }} disabled>
                                {isLeading
                                  ? '🟡 LEADER'
                                  : hasBoughtInCat
                                  ? '🔒 BOUGHT'
                                  : maxBidAllowed < nextMinBid
                                  ? '🔴 MAX REACHED'
                                  : 'BID DISABLED'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BOTTOM ROW: Custom Increment Controls (Max 5k) */}
                        {isLive && !hasBoughtInCat && !isLeading && maxBidAllowed >= nextMinBid && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            marginTop: '2px',
                            gap: '6px',
                          }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ⚡ Custom Inc (Max 5k):
                            </span>

                            {/* Quick Increment Chips (1k, 2k, 3k, 4k, 5k) */}
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                              {[1000, 2000, 3000, 4000, 5000].map((chip) => {
                                const chipTargetBid = currentBaseAmount + chip;
                                const isChipLegal = chipTargetBid <= maxBidAllowed && chipTargetBid >= nextMinBid;

                                return (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() => handlePlaceBid(t.id, chipTargetBid)}
                                    disabled={!isChipLegal}
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '0.68rem',
                                      borderRadius: '4px',
                                      border: customInc === chip ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.15)',
                                      background: customInc === chip ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                      color: isChipLegal ? 'var(--text-white)' : 'var(--text-muted)',
                                      cursor: isChipLegal ? 'pointer' : 'not-allowed',
                                      fontWeight: 700,
                                      transition: 'all 0.15s ease',
                                    }}
                                    title={`Bid ৳${chipTargetBid.toLocaleString()} (+৳${chip.toLocaleString()})`}
                                  >
                                    +{chip / 1000}k
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Input & Apply */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min={1000}
                                max={5000}
                                step={500}
                                value={teamCustomInputs[t.id] ?? 1000}
                                onChange={(e) => {
                                  const val = Math.min(5000, Math.max(1000, Number(e.target.value) || 1000));
                                  setTeamCustomInputs(prev => ({ ...prev, [t.id]: val }));
                                }}
                                style={{
                                  width: '54px',
                                  padding: '2px 4px',
                                  fontSize: '0.7rem',
                                  background: 'rgba(0,0,0,0.4)',
                                  border: '1px solid rgba(255,215,0,0.3)',
                                  borderRadius: '4px',
                                  color: 'var(--accent-gold)',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handlePlaceBid(t.id, customTargetBid)}
                                disabled={!canCustomBid}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  background: canCustomBid ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
                                  color: canCustomBid ? '#000' : 'var(--text-muted)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  cursor: canCustomBid ? 'pointer' : 'not-allowed',
                                }}
                              >
                                BID
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TEAMS & BUDGETS TAB */}
        {activeTab === 'teams-tab' && (
          <div className="tab-content active">
            <div className="section-header">
              <h2>FRANCHISE BUDGET OVERVIEW</h2>
              <p>Total starting budget per franchise: ৳{settings.total_budget.toLocaleString()}</p>
            </div>
            <div className="teams-grid">
              {teams.map((t) => {
                const boughtCount = players.filter(p => p.sold_to === t.id && p.status === 'SOLD').length;
                const rem = t.remaining_balance || (settings.total_budget - t.spent);
                const pct = Math.min(100, Math.round((t.spent / settings.total_budget) * 100));

                return (
                  <div key={t.id} className="team-stat-card glass">
                    <div className="team-card-header-centered">
                      <div className="team-logo-wrapper-large">
                        <TeamLogo url={t.logo_url} name={t.name} size={80} />
                      </div>
                      <div className="team-title-block">
                        <h3 className="team-name-disp-large">{t.name}</h3>
                        <span className="purchased-badge">{boughtCount} Players Bought</span>
                      </div>
                    </div>

                    <div className="budget-breakdown">
                      <div className="budget-detail-item label-muted">
                        <span>Total Budget</span>
                        <span>৳{settings.total_budget.toLocaleString()}</span>
                      </div>
                      <div className="budget-detail-item label-muted">
                        <span>Spent Amount</span>
                        <span className="text-danger">৳{t.spent.toLocaleString()}</span>
                      </div>
                      <div className="budget-detail-item main-val">
                        <span>Remaining Balance</span>
                        <span className="text-accent">৳{rem.toLocaleString()}</span>
                      </div>
                      <div className="budget-detail-item label-muted" style={{ marginTop: '4px' }}>
                        <span>Reserved Base Price</span>
                        <span>৳{(t.reserved_base_price || 0).toLocaleString()}</span>
                      </div>
                      <div className="budget-detail-item main-val" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '6px' }}>
                        <span>Max Legal Bid</span>
                        <span className="text-success">৳{(t.max_bid || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="progress-bar-wrapper">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TEAM SQUADS TAB */}
        {activeTab === 'squads-tab' && (
          <div className="tab-content active">
            <div className="squads-container">
              <div className="squad-selector-bar">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    className={`squad-select-btn ${activeSquadTeam?.id === t.id ? 'active' : ''}`}
                    onClick={() => setActiveSquadTeamId(t.id)}
                  >
                    <TeamLogo url={t.logo_url} name={t.name} size={24} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>

              {activeSquadTeam && (
                <div className="squad-details-card glass">
                  <div className="squad-card-header-centered">
                    <div className="team-logo-wrapper-large">
                      <TeamLogo url={activeSquadTeam.logo_url} name={activeSquadTeam.name} size={84} />
                    </div>
                    <div className="squad-header-title-block">
                      <h3 className="team-name-disp-large">{activeSquadTeam.name}</h3>
                      <p className="label-muted">Official Squad Roster</p>
                    </div>
                    <div className="squad-summary-stats-bar">
                      <div className="squad-stat-box">
                        <span className="stat-lbl">Players Bought</span>
                        <span className="stat-val text-white">
                          {players.filter(p => p.sold_to === activeSquadTeam.id && p.status === 'SOLD').length}
                        </span>
                      </div>
                      <div className="squad-stat-box">
                        <span className="stat-lbl">Total Spent</span>
                        <span className="stat-val text-danger">৳{activeSquadTeam.spent.toLocaleString()}</span>
                      </div>
                      <div className="squad-stat-box">
                        <span className="stat-lbl">Remaining Balance</span>
                        <span className="stat-val text-accent">
                          ৳{(activeSquadTeam.remaining_balance || settings.total_budget - activeSquadTeam.spent).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SQUAD PLAYERS ROSTER */}
                  {players.filter(p => p.sold_to === activeSquadTeam.id && p.status === 'SOLD').length === 0 ? (
                    <div className="squad-empty-state">
                      <span className="empty-icon">⚽</span>
                      <p>This franchise has not bought any players yet.</p>
                    </div>
                  ) : (
                    <div className="squad-players-grid">
                      {players
                        .filter(p => p.sold_to === activeSquadTeam.id && p.status === 'SOLD')
                        .map((p, idx) => (
                          <div key={p.id} className="squad-player-card glass">
                            <div className="squad-player-order-badge">#{idx + 1}</div>
                            <div className="squad-player-photo-box">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt={p.name} className="squad-player-img" />
                              ) : (
                                <span className="squad-player-avatar-fallback">
                                  {p.name.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="squad-player-info">
                              <h4 className="squad-player-name">{p.name}</h4>
                              <div className="squad-player-meta-row">
                                <span className="player-card-category">CAT {p.category}</span>
                                <span className="squad-player-pos">⚽ {p.position}</span>
                              </div>
                              <div className="squad-player-price-box">
                                <span className="price-lbl">Sold Price</span>
                                <span className="squad-player-price">৳{p.sold_price?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ALL PLAYERS TAB (CATEGORY-WISE DIRECTORY) */}
        {activeTab === 'players-tab' && (() => {
          const ALL_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const defaultPrices: Record<string, number> = {
            A: 25000, B: 18000, C: 15000, D: 12000,
            E: 10000, F: 8000, G: 7000, H: 5000,
          };

          const filterPlayerList = (plist: Player[]) => {
            return plist.filter(p => {
              if (playerTabCategory !== 'ALL' && p.category.toUpperCase() !== playerTabCategory.toUpperCase()) {
                return false;
              }
              if (playerTabStatus !== 'ALL' && p.status.toUpperCase() !== playerTabStatus.toUpperCase()) {
                return false;
              }
              if (playerTabSearch.trim()) {
                const q = playerTabSearch.toLowerCase();
                const buyer = teams.find(t => t.id === p.sold_to);
                return (
                  p.name.toLowerCase().includes(q) ||
                  p.position.toLowerCase().includes(q) ||
                  (buyer && buyer.name.toLowerCase().includes(q))
                );
              }
              return true;
            });
          };

          const displayedList = filterPlayerList(players);

          const renderPlayerCard = (p: Player) => {
            const buyer = teams.find(t => t.id === p.sold_to);
            return (
              <div key={p.id} className="player-card glass">
                <span className={`player-card-badge badge-${p.status.toLowerCase()}`}>
                  {p.status}
                </span>
                <div className="player-card-image-box">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="player-photo-img" />
                  ) : (
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {p.name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="player-card-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{p.sort_order}</span>
                    <span className="player-card-category">CAT {p.category}</span>
                  </div>
                  <h4>{p.name}</h4>
                  <div className="player-card-meta">
                    <span>⚽ {p.position}</span>
                  </div>
                </div>
                <div className="player-card-price-details">
                  <div>
                    <span className="price-lbl">Base Price</span>
                    <span className="price-val text-accent">৳{p.base_price.toLocaleString()}</span>
                  </div>
                  {p.status === 'SOLD' && (
                    <div style={{ textAlign: 'right' }}>
                      <span className="price-lbl">Sold to {buyer?.name || 'Franchise'}</span>
                      <span className="price-val text-success">৳{p.sold_price?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="tab-content active" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingRight: '4px' }}>
              {/* HEADER BAR */}
              <div className="section-header" style={{ marginBottom: 0 }}>
                <h2>LEAGUE PLAYERS DIRECTORY ({players.length} Total)</h2>
                <p>Browse registered players categorized by auction tiers (Category A → H).</p>
              </div>

              {/* CATEGORY FILTER TABS */}
              <div className="cat-filter-bar" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`cat-pill-btn ${playerTabCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setPlayerTabCategory('ALL')}
                >
                  ALL CATEGORIES
                  <span className="cat-pill-badge">{players.length}</span>
                </button>
                {ALL_CATEGORIES.map((cat) => {
                  const inCat = players.filter(p => p.category.toUpperCase() === cat);
                  const soldCount = inCat.filter(p => p.status === 'SOLD').length;
                  const isDone = inCat.length > 0 && soldCount === inCat.length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-pill-btn ${playerTabCategory === cat ? 'active' : ''}`}
                      onClick={() => setPlayerTabCategory(cat)}
                    >
                      CAT {cat}
                      <span className="cat-pill-badge">{inCat.length}</span>
                      {isDone && <span style={{ fontSize: '0.7rem' }}>✅</span>}
                    </button>
                  );
                })}
              </div>

              {/* SEARCH & STATUS FILTER BAR */}
              <div className="admin-players-filter-row glass" style={{ padding: '10px 14px', borderRadius: '8px', margin: 0 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search player name, position, team..."
                    className="admin-search-input"
                    value={playerTabSearch}
                    onChange={(e) => setPlayerTabSearch(e.target.value)}
                  />
                  <select
                    className="admin-search-input"
                    style={{ minWidth: '140px' }}
                    value={playerTabStatus}
                    onChange={(e) => setPlayerTabStatus(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="LIVE">Live</option>
                    <option value="SOLD">Sold</option>
                    <option value="UNSOLD">Unsold</option>
                  </select>

                  {(playerTabSearch || playerTabStatus !== 'ALL' || playerTabCategory !== 'ALL') && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => {
                        setPlayerTabSearch('');
                        setPlayerTabStatus('ALL');
                        setPlayerTabCategory('ALL');
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                  Showing <strong>{displayedList.length}</strong> of {players.length} players
                </div>
              </div>

              {/* DISPLAY MODE 1: SPECIFIC CATEGORY SELECTED */}
              {playerTabCategory !== 'ALL' && (
                <div>
                  <div className="cat-section-header">
                    <div className="cat-section-title">
                      <span>🏷️ CATEGORY {playerTabCategory}</span>
                      <span className="cat-stat-chip" style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                        Base: ৳{(defaultPrices[playerTabCategory] || 5000).toLocaleString()}
                      </span>
                      <span className="cat-stat-chip" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                        {displayedList.length} {displayedList.length === 1 ? 'Player' : 'Players'}
                      </span>
                    </div>
                    <div className="cat-section-stats">
                      <span style={{ color: '#00d26a', fontWeight: 600 }}>
                        ✅ {displayedList.filter(p => p.status === 'SOLD').length} Sold
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ⏳ {displayedList.filter(p => p.status === 'UPCOMING').length} Remaining
                      </span>
                    </div>
                  </div>

                  {displayedList.length === 0 ? (
                    <div className="glass table-empty" style={{ borderRadius: '10px', padding: '30px' }}>
                      No players match the criteria in Category {playerTabCategory}.
                    </div>
                  ) : (
                    <div className="players-grid">
                      {displayedList.map(renderPlayerCard)}
                    </div>
                  )}
                </div>
              )}

              {/* DISPLAY MODE 2: ALL CATEGORIES (GROUPED SECTION BY SECTION) */}
              {playerTabCategory === 'ALL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {ALL_CATEGORIES.map((cat) => {
                    const inCat = players.filter(p => p.category.toUpperCase() === cat);
                    const filteredInCat = filterPlayerList(inCat);

                    if (inCat.length === 0 && !playerTabSearch) return null;
                    if (filteredInCat.length === 0 && (playerTabSearch || playerTabStatus !== 'ALL')) return null;

                    const soldInCat = inCat.filter(p => p.status === 'SOLD').length;
                    const upcomingInCat = inCat.filter(p => p.status === 'UPCOMING').length;

                    return (
                      <div key={cat}>
                        <div className="cat-section-header" style={{ marginTop: 0 }}>
                          <div className="cat-section-title">
                            <span>🏷️ CATEGORY {cat}</span>
                            <span className="cat-stat-chip" style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                              Base: ৳{(defaultPrices[cat] || 5000).toLocaleString()}
                            </span>
                            <span className="cat-stat-chip" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                              {inCat.length} {inCat.length === 1 ? 'Player' : 'Players'}
                            </span>
                          </div>
                          <div className="cat-section-stats">
                            <span style={{ color: '#00d26a', fontWeight: 600 }}>✅ {soldInCat} Sold</span>
                            <span style={{ color: 'var(--text-muted)' }}>⏳ {upcomingInCat} Upcoming</span>
                          </div>
                        </div>

                        {filteredInCat.length === 0 ? (
                          <div className="glass table-empty" style={{ borderRadius: '10px', padding: '20px' }}>
                            No players in Category {cat} match your search.
                          </div>
                        ) : (
                          <div className="players-grid">
                            {filteredInCat.map(renderPlayerCard)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* TOAST & OVERLAYS */}
      {toast && (
        <div className={`toast-container ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {soldModal && (
        <SoldOverlay
          player={soldModal.player}
          team={soldModal.team}
          price={soldModal.price}
          type={soldModal.type}
          onClose={() => setSoldModal(null)}
          onNextPlayer={handleNextPlayer}
        />
      )}
    </div>
  );
}
