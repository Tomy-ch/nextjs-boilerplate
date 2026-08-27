import { addons } from "storybook/manager-api";

/*
 * addon の panel は右に置く。a11y の違反と Controls は story を見ながら読むもので、下に置くと
 * 縦を story と奪い合い、背の高い story では視界から押し出される。
 */
addons.setConfig({
  panelPosition: "right",
});
