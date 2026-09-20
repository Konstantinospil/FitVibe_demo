import type { CSSProperties, SVGProps } from "react";
import type { VibeformRenderParameters } from "../manipulation";

export interface VibeformTemplateProps extends Omit<SVGProps<SVGSVGElement>, "style"> {
  parameters: VibeformRenderParameters;
  motionEnabled: boolean;
  style?: CSSProperties;
}
