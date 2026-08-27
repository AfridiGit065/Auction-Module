'use client';

import { Player, Team, AuctionState } from '@/lib/types';

interface PlayerPanelProps {
  currentPlayer: Player | null;
  auctionState: AuctionState;
  leadingTeam: Team | null;
  onSell?: () => void;
  onUnsold?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isAdmin?: boolean;
}

export default function PlayerPanel({
  currentPlayer,
  auctionState,
  leadingTeam,
  onSell,
  onUnsold,
  onPause,
  onResume,
  isAdmin = true,
}: PlayerPanelProps) {
  const categoryTitle = currentPlayer
    ? `CATEGORY ${currentPlayer.category} — PLAYER #${currentPlayer.sort_order}`
    : 'NO PLAYER LOADED';

  const statusText = auctionState.status;

  return (
    <div className="player-panel-card glass">
      {/* Top Header */}
      <div className="panel-header">
        <span className="live-tag">LIVE</span>
        <h2 className="category-heading">{categoryTitle}</h2>
      </div>

      {/* Inner 2-column body */}
      <div className="player-panel-body">
        {/* LEFT COLUMN: Photo + Info */}
        <div className="player-panel-left">
          <div className="player-photo-wrapper-large">
            {currentPlayer?.photo_url ? (
              <img
                src={currentPlayer.photo_url}
                alt={currentPlayer.name}
                className="player-photo-img"
              />
            ) : (
              <div className="player-photo-placeholder" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                {currentPlayer ? currentPlayer.name.substring(0, 2).toUpperCase() : 'N/A'}
              </div>
            )}
          </div>

          <div className="player-info-block">
            <h3 className="player-name">
              {currentPlayer ? currentPlayer.name : 'No Active Player'}
            </h3>
            <div className="player-meta-grid">
              {/* Row 1: Position + Category inline */}
              <div className="player-meta-row-inline">
                <div className="meta-item">
                  <span className="meta-label">Position</span>
                  <span className="meta-value">
                    {currentPlayer ? currentPlayer.position : '—'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Category</span>
                  <span className="meta-value text-white">
                    {currentPlayer ? `CAT ${currentPlayer.category}` : '—'}
                  </span>
                </div>
              </div>

              {/* Row 2: Base Price */}
              <div className="player-meta-single">
                <div className="meta-item">
                  <span className="meta-label">Base Price</span>
                  <span className="meta-value text-accent" style={{ fontSize: '1.6rem' }}>
                    {currentPlayer ? `৳${currentPlayer.base_price.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="panel-divider"></div>

        {/* RIGHT COLUMN: Bid + Timer + Controls */}
        <div className="player-panel-right">
          {/* Big Bid Display */}
          <div className="bid-display-container">
            <span className="bid-label">CURRENT BID</span>
            <div className="bid-value">
              ৳{auctionState.current_bid ? auctionState.current_bid.toLocaleString() : '0'}
            </div>
            <div className="leading-team-wrapper">
              <span className="leading-label">LEADING TEAM</span>
              <div className="leading-team-name">
                {leadingTeam ? leadingTeam.name : 'NO BIDS YET'}
              </div>
            </div>
          </div>

          {/* Timer Section */}
          <div className="timer-section">
            <div className="timer-circle-wrapper">
              <svg className="timer-svg" viewBox="0 0 100 100">
                <circle className="timer-bg" cx="50" cy="50" r="45"></circle>
                <circle
                  className="timer-bar"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{
                    strokeDashoffset: Math.max(
                      0,
                      283 - (283 * (auctionState.timer || 0)) / 30
                    ),
                  }}
                ></circle>
              </svg>
              <div className="timer-text">{auctionState.timer || 0}</div>
            </div>
            <div className="status-badge-live">{statusText}</div>
          </div>

          {/* Quick Admin Action Bar */}
          {isAdmin && (
            <div className="live-admin-bar">
              <button className="btn btn-primary" onClick={onSell}>
                SELL
              </button>
              <button className="btn btn-danger" onClick={onUnsold}>
                UNSOLD
              </button>
              <button className="btn btn-warning" onClick={onPause}>
                PAUSE
              </button>
              <button className="btn btn-success" onClick={onResume}>
                START
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
