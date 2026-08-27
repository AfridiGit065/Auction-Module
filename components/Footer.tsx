'use client';

interface FooterProps {
  logoUrl?: string | null;
}

export default function Footer({ logoUrl }: FooterProps) {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <img
            src={logoUrl || '/rangdhanu-logo.png'}
            alt="রংধনু স্পোর্টিং ক্লাব Crest"
            className="footer-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/rangdhanu-logo.png';
            }}
          />
          <div className="footer-brand-info">
            <span className="footer-title">
              DEOVOG PREMIER LEAGUE 2026 &bull; ORGANIZED BY <strong className="text-gold">রংধনু স্পোর্টিং ক্লাব</strong>
            </span>
            <span className="footer-sub">EST. 2010 &bull; OFFICIAL BROADCAST DASHBOARD</span>
          </div>
        </div>
        <div className="footer-right">
          <span className="badge-live">🔴 LIVE AUCTION</span>
        </div>
      </div>
    </footer>
  );
}
