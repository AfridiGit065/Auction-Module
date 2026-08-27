'use client';

import { CalculatedTeam } from '@/lib/auction/budgetCalc';
import { Player, AuctionState } from '@/lib/types';

interface BidControlsProps {
  teams: CalculatedTeam[];
  currentPlayer: Player | null;
  auctionState: AuctionState;
  bidIncrement: number;
  onBid: (teamId: string, amount: number) => void;
}

export default function BidControls({
  teams,
  currentPlayer,
  auctionState,
  bidIncrement,
  onBid,
}: BidControlsProps) {
  const nextMinBid = auctionState.current_bid > 0
    ? auctionState.current_bid + bidIncrement
    : (currentPlayer?.base_price || 0);

  return (
    <div className="bidding-console-card glass">
      <div className="panel-header">
        <h2>TEAM BID CONTROLS</h2>
        <div className="increment-badge">
          INCREMENT: <span className="text-accent">৳{bidIncrement.toLocaleString()}</span>
        </div>
      </div>

      <div className="team-controls-list">
        {teams.map((team) => {
          const isLeader = auctionState.leading_team_id === team.id;
          const maxBidAllowed = team.max_bid || 0;
          const remainingBal = team.remaining_balance || 0;
          const canBid =
            auctionState.status === 'LIVE' &&
            currentPlayer !== null &&
            !isLeader &&
            maxBidAllowed >= nextMinBid;

          let lockMsg = '';
          if (isLeader) lockMsg = 'LEADING BIDDER';
          else if (remainingBal < nextMinBid) lockMsg = 'BUDGET EXCEEDED';
          else if (maxBidAllowed < nextMinBid) lockMsg = 'BUDGET LOCKED (RESERVED)';

          return (
            <div key={team.id} className="team-bid-control-row">
              <div className="team-indicator">
                <span className="team-logo-bullet">
                  {team.logo_url && team.logo_url.startsWith('http') ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--border-glass)',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-glass)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--accent-gold)',
                      }}
                    >
                      {team.name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="team-title">
                  <h4>{team.name}</h4>
                  <div className="budget-stats-row">
                    <div className="stat-group">
                      <span className="stat-lbl">Remaining</span>
                      <span className="stat-val-bold">
                        ৳{remainingBal.toLocaleString()}
                      </span>
                    </div>
                    <div className="stat-group">
                      <span className="stat-lbl">Spent</span>
                      <span>৳{team.spent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-bid-tag">
                <span className="max-bid-lbl">Max Allowed</span>
                <span className="max-bid-val">৳{maxBidAllowed.toLocaleString()}</span>
                {lockMsg && !canBid && (
                  <span className="locked-indicator">{lockMsg}</span>
                )}
              </div>

              <button
                className="btn-bid"
                disabled={!canBid}
                onClick={() => onBid(team.id, nextMinBid)}
              >
                + BID ৳{nextMinBid.toLocaleString()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
