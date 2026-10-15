export default function Home() {
  return (
    <section aria-labelledby="home-h" className="frame" style={{ paddingTop: "calc(var(--nav-h) + 96px)", minHeight: "80vh" }}>
      <p className="label-mono" style={{ color: "var(--muted)" }}>
        01 — Hero · Phase 2
      </p>
      <h1 id="home-h" style={{ fontSize: "var(--fs-display)", fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 0.88 }}>
        I build agents that do <em style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}>the work.</em>
      </h1>
    </section>
  );
}
