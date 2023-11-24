import { i18n } from "../locales/i18n";
const { t } = i18n.global;

export const transformPatternList = [
  {
    label: t("mode.test"),
    value: "test",
  },
  {
    label: t("mode.match"),
    value: "match",
  },
  {
    label: t("mode.replace"),
    value: "replace",
  },
  {
    label: t("mode.split"),
    value: "split",
  },
];
export const unitList = [
  {
    label: t("unitList.millis"),
    value: "millis",
  },
  {
    label: t("unitList.seconds"),
    value: "seconds",
  },
];