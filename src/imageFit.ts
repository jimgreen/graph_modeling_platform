export type ImageFitMode = "cover" | "fixed" | "fill-x" | "fill-y" | "stretch" | "tile";

export const IMAGE_FIT_DEFAULT_MODE: ImageFitMode = "cover";

export const IMAGE_FIT_MODE_OPTIONS: Array<{ value: ImageFitMode; label: string }> = [
  { value: "cover", label: "填满裁切" },
  { value: "fixed", label: "固定尺寸" },
  { value: "fill-x", label: "X填充" },
  { value: "fill-y", label: "Y填充" },
  { value: "stretch", label: "变形拉伸" },
  { value: "tile", label: "平铺" }
];

const IMAGE_FIT_MODE_SET = new Set<ImageFitMode>(IMAGE_FIT_MODE_OPTIONS.map((option) => option.value));

export function normalizeImageFitMode(value: unknown): ImageFitMode {
  const text = String(value ?? "").trim();
  return IMAGE_FIT_MODE_SET.has(text as ImageFitMode) ? (text as ImageFitMode) : IMAGE_FIT_DEFAULT_MODE;
}

export function imageFitPreserveAspectRatio(value: unknown) {
  switch (normalizeImageFitMode(value)) {
    case "fixed":
      return "xMidYMid meet";
    case "fill-x":
      return "xMidYMin slice";
    case "fill-y":
      return "xMinYMid slice";
    case "stretch":
      return "none";
    case "tile":
      return "xMidYMid meet";
    case "cover":
    default:
      return "xMidYMid slice";
  }
}
