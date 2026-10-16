import { HeroStage } from "@/components/hero/HeroStage";
import { site } from "@/lib/content/site";

export default function Home() {
  return (
    <>
      <HeroStage site={{ city: site.city, timezone: site.timezone, heroStats: site.heroStats }} />
      {/* Phase 3: manifesto, selected runs, process, agent, toolbox, contact — with the C3 rail. */}
      <div id="work" />
      <div id="agent" />
      <div id="contact" />
    </>
  );
}
