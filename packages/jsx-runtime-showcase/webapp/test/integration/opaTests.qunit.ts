import Opa5 from "sap/ui/test/Opa5";
import Startup from "./arrangements/Startup";
import "./LandingJourney";
import "./OverviewJourney";
import "./LearnJourney";

Opa5.extendConfig({
	arrangements: new Startup(),
	viewNamespace: "ui5.community.jsx.showcase.view.",
	autoWait: true,
	timeout: 30
});
