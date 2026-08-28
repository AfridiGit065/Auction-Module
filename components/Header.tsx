'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Player } from '@/lib/types';

interface HeaderProps {
  logoUrl?: string | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentPlayer?: Player | null;
  totalPlayers?: number;
}

export default function Header({
  logoUrl,
  activeTab = 'live-auction-tab',
  onTabChange,
  currentPlayer,
  totalPlayers = 8,
}: HeaderProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <header className="app-header">
      <div className="header-container">
        {/* BRAND */}
        <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img
            src={logoUrl || '/rangdhanu-logo.png'}
            alt="রংধনু স্পোর্টিং ক্লাব Crest"
            className="league-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/rangdhanu-logo.png';
            }}
          />
          <div className="brand-text">
            <h1>DEOVOG PREMIER LEAGUE 2026</h1>
            <span className="sub-brand">
              ORGANIZED BY <strong style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>রংধনু স্পোর্টিং ক্লাব</strong>
            </span>
          </div>
        </Link>

        {/* NAVIGATION TABS */}
        <nav className="main-nav">
          {!isAdminPage && onTabChange ? (
            <>
              <Link href="/" className="nav-btn">
                Landing Page
              </Link>
              <button
                className={`nav-btn ${activeTab === 'live-auction-tab' ? 'active' : ''}`}
                onClick={() => onTabChange('live-auction-tab')}
              >
                Live Auction
              </button>
              <button
                className={`nav-btn ${activeTab === 'teams-tab' ? 'active' : ''}`}
                onClick={() => onTabChange('teams-tab')}
              >
                Teams & Budgets
              </button>
              <button
                className={`nav-btn ${activeTab === 'squads-tab' ? 'active' : ''}`}
                onClick={() => onTabChange('squads-tab')}
              >
                Team Squads
              </button>
              <button
                className={`nav-btn ${activeTab === 'players-tab' ? 'active' : ''}`}
                onClick={() => onTabChange('players-tab')}
              >
                All Players
              </button>
              <Link href="/admin" className="nav-btn admin-btn">
                Admin Panel
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="nav-btn">
                🏠 Landing Page
              </Link>
              <Link href="/auction" className="nav-btn active">
                ⚡ Live Auction Board
              </Link>
            </>
          )}
        </nav>

        {/* RIGHT BADGE */}
        <div className="header-right-badge">
          <span>CAT <strong className="text-accent">{currentPlayer ? currentPlayer.category : 'A'}</strong></span>
          <span className="divider">|</span>
          <span>PLAYER <strong className="text-accent">{currentPlayer ? `${currentPlayer.sort_order}/${totalPlayers}` : `0/${totalPlayers}`}</strong></span>
        </div>
      </div>
    </header>
  );
}
