'use client';

import { Player, Team } from '@/lib/types';

interface SoldOverlayProps {
  player: Player | null;
  team: Team | null;
  price: number;
  type: 'SOLD' | 'UNSOLD';
  onClose: () => void;
  onNextPlayer?: () => void;
}

export default function SoldOverlay({ player, team, price, type, onClose, onNextPlayer }: SoldOverlayProps) {
  if (!player) return null;

  return (
    <div className="dramatic-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className={`sold-card glass ${type === 'SOLD' ? 'animate-sold' : 'animate-unsold'}`} onClick={(e) => e.stopPropagation()}>
        <h1 className={`dramatic-title ${type === 'SOLD' ? 'text-success' : 'text-danger'}`}>
          {type === 'SOLD' ? 'SOLD!' : 'UNSOLD'}
        </h1>

        <div className="sold-visuals">
          <div className="player-photo-placeholder large">
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-gray)' }}>
                {player.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {type === 'SOLD' && (
            <>
              <div className="arrows">➔</div>
              <div className="sold-team-logo-disp">
                {team?.logo_url ? (
                  team.logo_url.startsWith('http') || team.logo_url.startsWith('data:') || team.logo_url.startsWith('/') ? (
                    <img src={team.logo_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>{team.logo_url}</span>
                  )
                ) : (
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {team?.name.substring(0, 2).toUpperCase() || 'FC'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <h2>{player.name}</h2>
        {type === 'SOLD' ? (
          <>
            <div className="sold-price">৳{price.toLocaleString()}</div>
            <h3>Sold to: <span className="text-accent">{team?.name}</span></h3>
          </>
        ) : (
          <h3>Going into the Unsold Pool</h3>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          {onNextPlayer && (
            <button className="btn btn-accent btn-large" style={{ fontWeight: 700 }} onClick={() => { onClose(); onNextPlayer(); }}>
              ▶ START NEXT PLAYER ➔
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
