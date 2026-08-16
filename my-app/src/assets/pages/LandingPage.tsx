import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import "./LandingPage.css";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 64, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    title: "Branded booking wizard",
    body: "A guided, animated flow your clients complete in under a minute — themed with your logo and colors, live in minutes.",
    span: "wide",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M4 12h16M4 6h10M4 18h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Staff calendars",
    body: "Every professional gets a live schedule that syncs instantly across web and mobile.",
    span: "tall",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "SMS & email reminders",
    body: "Automatic confirmations, rebooking nudges and no-show reduction — no manual follow-up.",
    span: "regular",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M4 6l8 6 8-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    title: "Multi-tenant by design",
    body: "One platform, unlimited locations — each with isolated data, its own domain and its own brand.",
    span: "regular",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.75 12h16.5M12 3.75c2.4 2.3 3.6 5.1 3.6 8.25S14.4 17.95 12 20.25c-2.4-2.3-3.6-5.1-3.6-8.25S9.6 6.05 12 3.75Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    title: "Real-time analytics",
    body: "Revenue, occupancy and client retention — surfaced the moment they happen.",
    span: "regular",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M4 19.5V9.5M11 19.5v-13M18 19.5v-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Create your space", body: "Spin up a branded tenant with your services, staff and hours in minutes." },
  { n: "02", title: "Share your link", body: "Clients book themselves through a fast, animated wizard — no calls, no back-and-forth." },
  { n: "03", title: "Run on autopilot", body: "Reminders, rebooking nudges and lifecycle emails fire automatically in the background." },
];

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="lp">
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-glow lp-glow-a" aria-hidden="true" />
      <div className="lp-glow lp-glow-b" aria-hidden="true" />

      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a className="lp-brand" href="/">
            <img src="/logo.png" alt="" className="lp-brand-mark" />
            RENDEZVOUS
          </a>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <a className="lp-btn lp-btn-primary lp-btn-sm" href="#pricing">
            Get started
            <span className="lp-btn-icon">↗</span>
          </a>
          <button
            className={`lp-burger ${navOpen ? "open" : ""}`}
            aria-label="Menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={`lp-mobile-menu ${navOpen ? "open" : ""}`}>
        {[
          { label: "Features", href: "#features" },
          { label: "How it works", href: "#how" },
          { label: "Pricing", href: "#pricing" },
          { label: "Get started", href: "#pricing" },
        ].map(({ label, href }, i) => (
          <a
            key={label}
            href={href}
            style={{ transitionDelay: `${i * 60 + 80}ms` }}
            onClick={() => setNavOpen(false)}
          >
            {label}
          </a>
        ))}
      </div>

      <header className="lp-hero">
        <motion.div
          className="lp-eyebrow"
          initial="hidden"
          animate="show"
          variants={fadeUp}
        >
          Booking software for salons &amp; studios
        </motion.div>

        <motion.h1
          className="lp-h1"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.08 }}
        >
          Appointments that
          <br />
          <span className="lp-h1-accent">book themselves.</span>
        </motion.h1>

        <motion.p
          className="lp-sub"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.16 }}
        >
          RENDEZVOUS gives every location its own branded booking wizard, live staff
          calendars, and automated reminders — so you spend less time on the phone
          and more time with clients.
        </motion.p>

        <motion.div
          className="lp-hero-ctas"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.24 }}
        >
          <a className="lp-btn lp-btn-primary" href="mailto:hello@rendezvous.app?subject=Book%20a%20demo">
            Book a demo
            <span className="lp-btn-icon">↗</span>
          </a>
          <a className="lp-btn lp-btn-ghost" href="#how">
            See how it works
          </a>
        </motion.div>

        <motion.div
          className="lp-mock-shell"
          initial={{ opacity: 0, y: 90, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lp-mock-core">
            <div className="lp-mock-topbar">
              <span /><span /><span />
            </div>
            <div className="lp-mock-body">
              <div className="lp-mock-col">
                <div className="lp-mock-title">Choose a service</div>
                {["Haircut & Style", "Color Treatment", "Manicure"].map((s, i) => (
                  <div className={`lp-mock-row ${i === 0 ? "active" : ""}`} key={s}>
                    <span>{s}</span>
                    <span className="lp-mock-dot" />
                  </div>
                ))}
              </div>
              <div className="lp-mock-col lp-mock-cal">
                <div className="lp-mock-title">Today</div>
                <div className="lp-mock-grid">
                  {["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"].map(
                    (time, i) => (
                      <div key={time} className={`lp-mock-slot ${i === 4 ? "booked" : ""}`}>
                        <span>{time}</span>
                        {i === 4 && <span className="lp-mock-slot-label">Booked</span>}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      <section className="lp-strip">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
        >
          Trusted by independent studios, barbershops and clinics running their whole
          calendar on RENDEZVOUS
        </motion.p>
      </section>

      <section className="lp-section" id="features">
        <motion.div
          className="lp-section-head"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
        >
          <div className="lp-eyebrow">Platform</div>
          <h2 className="lp-h2">Everything a booking desk does — automated.</h2>
        </motion.div>

        <motion.div
          className="lp-bento"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {FEATURES.map((f) => (
            <motion.div className={`lp-card lp-card-${f.span}`} key={f.title} variants={fadeUp}>
              <div className="lp-card-shell">
                <div className="lp-card-core">
                  <div className="lp-card-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="lp-section" id="how">
        <motion.div
          className="lp-section-head"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
        >
          <div className="lp-eyebrow">Workflow</div>
          <h2 className="lp-h2">Live in an afternoon.</h2>
        </motion.div>

        <motion.div
          className="lp-steps"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          {STEPS.map((s) => (
            <motion.div className="lp-step" key={s.n} variants={fadeUp}>
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="lp-cta-banner" id="pricing">
        <motion.div
          className="lp-cta-shell"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
        >
          <div className="lp-cta-core">
            <h2 className="lp-h2">Ready to stop taking bookings by phone?</h2>
            <p>Tell us about your business and we'll set up your branded tenant.</p>
            <a className="lp-btn lp-btn-primary" href="mailto:hello@rendezvous.app?subject=Book%20a%20demo">
              Book a demo
              <span className="lp-btn-icon">↗</span>
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} RENDEZVOUS</span>
        <a href="mailto:hello@rendezvous.app?subject=Book%20a%20demo">Book a demo</a>
      </footer>
    </div>
  );
}
