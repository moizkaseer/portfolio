import { HeroStage } from "@/components/hero/HeroStage";
import { Manifesto } from "@/components/home/Manifesto";
import { SelectedRuns } from "@/components/home/SelectedRuns";
import { Process } from "@/components/home/Process";
import { AgentSection } from "@/components/home/AgentSection";
import { Toolbox } from "@/components/home/Toolbox";
import { Contact } from "@/components/home/Contact";
import { Deferred } from "@/components/Deferred";
import { site } from "@/lib/content/site";
import { agentConfigured } from "@/lib/server/agent-model";
import { personJsonLd, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

/** Home: 01 Hero → 02 Your turn → 03 Manifesto → 04 Selected runs → 05 Process → 06 Agent → 07 Toolbox → 08 Contact. (Proof is omitted until there are testimonials.) */
export default function Home() {
  return (
    <div style={{ position: "relative" }} data-rail-root>
      <JsonLd data={[personJsonLd(), websiteJsonLd()]} />
      <HeroStage site={{ city: site.city, timezone: site.timezone, heroStats: site.heroStats, summary: site.summary }} smart={agentConfigured()} />
      <Manifesto />
      <SelectedRuns />
      <Process />
      <AgentSection />
      <Toolbox />
      <Contact />
      <Deferred name="rail" />
      <Deferred name="home" near="#toolbox, #contact" />
    </div>
  );
}
