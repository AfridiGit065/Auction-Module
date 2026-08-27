import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'দেওভোগ প্রিমিয়ার লীগ ২০২৬ | রংধনু স্পোর্টিং ক্লাব',
  description: 'দেওভোগ প্রিমিয়ার লীগ ২০২৬ ফুটবল টুর্নামেন্ট। আয়োজনে: রংধনু স্পোর্টিং ক্লাব।',
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      {/* TOP HEADER — Organizer */}
      <header className="lp-header">
        <div className="lp-organizer">
          <Image
            src="/rangdhanu-logo.png"
            alt="রংধনু স্পোর্টিং ক্লাব"
            width={80}
            height={80}
            className="lp-org-logo"
          />
          <div className="lp-org-text">
            <span className="lp-org-label">আয়োজনে</span>
            <span className="lp-org-name">রংধনু স্পোর্টিং ক্লাব</span>
          </div>
        </div>
      </header>

      {/* HERO — full screen logo */}
      <section className="lp-hero">
        <div className="lp-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tournament-logo.png"
            alt="Deovog Premier League 2026"
            className="lp-logo-img"
          />
        </div>

        {/* Bottom buttons overlay */}
        <div className="lp-overlay">
          <div className="lp-actions">
            <Link href="/auction" className="lp-btn lp-btn-primary" id="btn-live-auction">
              লাইভ নিলাম বোর্ড
            </Link>
            <Link href="/admin" className="lp-btn lp-btn-secondary" id="btn-admin-panel">
              অ্যাডমিন প্যানেল
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
