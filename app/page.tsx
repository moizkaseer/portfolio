import { HeroStage } from "@/components/hero/HeroStage";
import { Manifesto } from "@/components/home/Manifesto";
import { SelectedRuns } from "@/components/home/SelectedRuns";
import { Process } from "@/components/home/Process";
import { AgentSection } from "@/components/home/AgentSection";
import { Toolbox } from "@/components/home/Toolbox";
import { Contact } from "@/components/home/Contact";
import { Rail } from "@/components/rail/Rail";
import { site } from "@/lib/content/site";

/** Home: 01 Hero → 02 Your turn → 03 Manifesto → 04 Selected runs → 05 Process → 06 Agent → 07 Toolbox → 08 Contact. (Proof is omitted until there are testimonials.) */
export default function Home() {
  return (
    <div style={{ position: "relative" }} data-rail-root>
      <HeroStage site={{ city: site.city, timezone: site.timezone, heroStats: site.heroStats }} />
      <Manifesto />
      <SelectedRuns />
      <Process />
      <AgentSection />
      <Toolbox />
      <Contact />
      <Rail />
    </div>
  );
}
