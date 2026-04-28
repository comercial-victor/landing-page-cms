import { definePlugin } from "sanity";
import { InteractiveViewTool } from "./InteractiveViewTool";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const interactiveViewPlugin = definePlugin({
  name: "interactive-view",
  tools: [{
    name: "interactive-view",
    title: "Vista interactiva",
    icon: EyeIcon,
    component: InteractiveViewTool,
  }],
});
