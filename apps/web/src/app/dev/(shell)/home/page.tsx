import { HomeView } from "@/components/home/home-view";
import { buildChecklist } from "@/lib/checklist";

export default function DevHome() {
  const checklist = buildChecklist({
    brandKit: {
      secondary_color: "#FAF8F5",
      accent_color: null,
      heading_font: null,
      body_font: null,
      logo_path: null,
    },
    connectedAccounts: 0,
  });
  return (
    <HomeView
      businessName="Chai Point"
      firstName="Asha Kulkarni"
      checklist={checklist}
      endpoint="/api/dev/chat"
    />
  );
}
