// 色彩配置与量测配置纯归一化与历史迁移逻辑
// 从 server/server.mjs 抽离，无路径常量、无副作用。

export function normalizeColorRecord(source) {
  if (!source || typeof source !== "object") {
    return {};
  }
  return Object.entries(source).reduce((result, [key, value]) => {
    if (typeof key === "string" && key.trim() && typeof value === "string" && value.trim()) {
      result[key.trim()] = value.trim();
    }
    return result;
  }, {});
}

export function normalizeColorConfig(payload) {
  const colorPalette = payload?.colorPalette && typeof payload.colorPalette === "object" ? payload.colorPalette : {};
  return {
    colorDisplayMode: payload?.colorDisplayMode === "voltage" ? "voltage" : "energy",
    colorPalette: {
      energy: normalizeColorRecord(colorPalette.energy),
      voltage: normalizeColorRecord(colorPalette.voltage)
    }
  };
}

function normalizeMeasurementValueType(value) {
  return value === "string" || value === "boolean" ? value : "number";
}

function normalizeMeasurementFontWeight(value, id) {
  // 内置类型旧默认 "500" 迁移到 "700"
  const normalized = value === "400" || value === "500" || value === "700" ? value : "500";
  return id && builtinMeasurementTypeIds.has(id) && normalized === "500" ? "700" : normalized;
}

const builtinMeasurementTypeIds = new Set([
  "activePower",
  "reactivePower",
  "voltage",
  "current",
  "frequency",
  "pressure",
  "temperature",
  "flow",
  "level",
  "soc",
  "gasQuantity",
  "tapPosition",
  "status"
]);
const storageSocMeasurementType = {
  id: "soc",
  key: "soc",
  name: "soc",
  shortLabel: "soc",
  defaultUnit: "%",
  valueType: "number",
  defaultDecimals: 1,
  defaultVisible: true
};
const gasQuantityMeasurementType = {
  id: "gasQuantity",
  key: "gas_quantity",
  name: "储气量",
  shortLabel: "储气量",
  defaultUnit: "Nm3",
  valueType: "number",
  defaultDecimals: 2,
  defaultVisible: true
};
const tapPositionMeasurementType = {
  id: "tapPosition",
  key: "tap",
  name: "分接头档位",
  shortLabel: "档位",
  defaultUnit: "",
  valueType: "number",
  defaultDecimals: 0,
  defaultVisible: false
};
const electricStorageMeasurementProfileKinds = new Set(["ac-storage", "dc-storage"]);
const hydrogenTankMeasurementProfileKinds = new Set([
  "hydrogen-tank",
  "hydrogen-tank-horizontal",
  "hydrogen-tank-container"
]);
const hydrogenTankLegacyLabelOverrides = new Map([
  ["pressure", "PRESS"],
  ["flow", "FLOW"],
  ["gasQuantity", "GAS_QUANTITY"],
  ["soc", "SOC"]
]);
const hydrogenTankMeasurementProfileItems = [
  { measurementTypeId: "pressure", associatedField: "pressure", unitOverride: "MPa" },
  { measurementTypeId: "flow", associatedField: "flow", unitOverride: "Nm3/h" },
  { measurementTypeId: "gasQuantity", associatedField: "gas_quantity", unitOverride: "Nm3" },
  { measurementTypeId: "soc", associatedField: "soc", unitOverride: "%" }
];
const requiredStoredBranchMeasurementProfileItems = new Map([
  ["ac-line", [
    { measurementTypeId: "activePower", associatedField: "i_p", labelOverride: "首端有功量测值" },
    { measurementTypeId: "reactivePower", associatedField: "i_q", labelOverride: "首端无功量测值" },
    { measurementTypeId: "voltage", associatedField: "i_u", labelOverride: "首端电压量测值" },
    { measurementTypeId: "current", associatedField: "i_i", labelOverride: "首端电流量测值" },
    { measurementTypeId: "activePower", associatedField: "j_p", labelOverride: "末端有功量测值" },
    { measurementTypeId: "reactivePower", associatedField: "j_q", labelOverride: "末端无功量测值" },
    { measurementTypeId: "voltage", associatedField: "j_u", labelOverride: "末端电压量测值" },
    { measurementTypeId: "current", associatedField: "j_i", labelOverride: "末端电流量测值" }
  ]],
  ["dc-line", [
    { measurementTypeId: "activePower", associatedField: "i_p", labelOverride: "首端有功量测值" },
    { measurementTypeId: "voltage", associatedField: "i_u", labelOverride: "首端电压量测值" },
    { measurementTypeId: "current", associatedField: "i_i", labelOverride: "首端电流量测值" },
    { measurementTypeId: "activePower", associatedField: "j_p", labelOverride: "末端有功量测值" },
    { measurementTypeId: "voltage", associatedField: "j_u", labelOverride: "末端电压量测值" },
    { measurementTypeId: "current", associatedField: "j_i", labelOverride: "末端电流量测值" }
  ]]
]);

function migrateHydrogenTankLegacyLabelOverride(item) {
  const legacyLabel = hydrogenTankLegacyLabelOverrides.get(String(item?.measurementTypeId ?? "").trim());
  if (!legacyLabel || String(item?.labelOverride ?? "").trim() !== legacyLabel) {
    return item;
  }
  return { ...item, labelOverride: undefined };
}

function migrateHydrogenTankMeasurementProfileItems(deviceKind, items) {
  if (!hydrogenTankMeasurementProfileKinds.has(deviceKind)) {
    return items;
  }
  const legacyIds = items.map((item) => String(item?.measurementTypeId ?? "").trim());
  const legacySignature = legacyIds.join("|");
  const migratedItems = legacyIds.length === 3 && [
    "pressure|level|temperature",
    "pressure|flow|gasQuantity"
  ].includes(legacySignature)
    ? hydrogenTankMeasurementProfileItems.map((replacement, index) => ({
        ...(items[index] ?? {}),
        ...replacement
      }))
    : items;
  return migratedItems.map(migrateHydrogenTankLegacyLabelOverride);
}

export const defaultMeasurementGroupDefaults = Object.freeze({
  backgroundColor: "transparent",
  borderColor: "#64748b",
  borderStyle: "none",
  borderWidth: 0
});

function normalizeMeasurementGroupDefaults(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const backgroundColor = String(source.backgroundColor ?? defaultMeasurementGroupDefaults.backgroundColor).trim();
  const borderColor = String(source.borderColor ?? defaultMeasurementGroupDefaults.borderColor).trim();
  const borderStyle = ["none", "solid", "dashed", "dotted"].includes(source.borderStyle)
    ? source.borderStyle
    : defaultMeasurementGroupDefaults.borderStyle;
  const rawBorderWidth = Number(source.borderWidth);
  return {
    backgroundColor: backgroundColor || defaultMeasurementGroupDefaults.backgroundColor,
    borderColor: borderColor || defaultMeasurementGroupDefaults.borderColor,
    borderStyle,
    borderWidth: Number.isFinite(rawBorderWidth)
      ? Math.max(0, Math.min(12, rawBorderWidth))
      : defaultMeasurementGroupDefaults.borderWidth
  };
}

function normalizeMeasurementDefaultFontSize(id, value) {
  const size = Math.max(6, Math.min(96, Number.isFinite(Number(value)) ? Number(value) : 12));
  // 内置类型旧默认值 14 迁移到 12
  return builtinMeasurementTypeIds.has(id) && size === 14 ? 12 : size;
}

function normalizeMeasurementStyleOverride(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const style = {};
  if (typeof value.color === "string" && value.color.trim()) {
    style.color = value.color.trim();
  }
  if (typeof value.fontFamily === "string" && value.fontFamily.trim()) {
    style.fontFamily = value.fontFamily.trim();
  }
  if (Number.isFinite(Number(value.fontSize))) {
    style.fontSize = Math.max(6, Math.min(96, Number(value.fontSize)));
  }
  if (value.fontWeight === "400" || value.fontWeight === "500" || value.fontWeight === "700") {
    style.fontWeight = value.fontWeight;
  }
  if (value.fontStyle === "italic") {
    style.fontStyle = "italic";
  }
  if (value.textDecoration === "underline") {
    style.textDecoration = "underline";
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function withRequiredStoredBranchMeasurementProfileItems(deviceKind, items, validTypeIds) {
  const requiredItems = (requiredStoredBranchMeasurementProfileItems.get(deviceKind) ?? [])
    .filter((item) => validTypeIds.has(item.measurementTypeId));
  if (requiredItems.length === 0) {
    return items;
  }
  const requiredFields = new Set(requiredItems.map((item) => item.associatedField));
  const requiredTypeIds = new Set(requiredItems.map((item) => item.measurementTypeId));
  const overridesByField = new Map();
  const extras = [];
  for (const item of items) {
    const field = String(item.associatedField ?? "").trim();
    if (requiredFields.has(field)) {
      overridesByField.set(field, item);
      continue;
    }
    if (
      (!field && requiredTypeIds.has(item.measurementTypeId))
      || ["p", "q", "u", "i"].includes(field)
    ) {
      continue;
    }
    extras.push(item);
  }
  return [
    ...requiredItems.map((requiredItem) => {
      const override = overridesByField.get(requiredItem.associatedField);
      return override
        ? { ...requiredItem, ...override, associatedField: requiredItem.associatedField }
        : { ...requiredItem };
    }),
    ...extras
  ];
}

export function normalizeMeasurementConfig(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const groupDefaults = normalizeMeasurementGroupDefaults(source.groupDefaults);
  const rawProfiles = Array.isArray(source.deviceProfiles) ? source.deviceProfiles : [];
  const configuredTypes = Array.isArray(source.measurementTypes) ? source.measurementTypes : [];
  const rawTypes = [...configuredTypes];
  if (!rawTypes.some((item) => String(item?.id ?? "").trim() === storageSocMeasurementType.id)) {
    rawTypes.push(storageSocMeasurementType);
  }
  if (!rawTypes.some((item) => String(item?.id ?? "").trim() === gasQuantityMeasurementType.id)) {
    rawTypes.push(gasQuantityMeasurementType);
  }
  if (!rawTypes.some((item) => String(item?.id ?? "").trim() === tapPositionMeasurementType.id)) {
    rawTypes.push(tapPositionMeasurementType);
  }
  const seenTypes = new Set();
  const measurementTypes = rawTypes.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const rawId = String(item.id ?? "").trim();
    const id = /^(?:state_of_charge|stateOfCharge)$/u.test(rawId) ? "soc" : rawId;
    if (!id || seenTypes.has(id)) {
      return [];
    }
    seenTypes.add(id);
    const rawKey = String(item.key ?? id).trim() || id;
    const key = /^(?:gasQuantity|gasquantity)$/.test(rawKey)
      ? "gas_quantity"
      : /^(?:state_of_charge|stateOfCharge)$/u.test(rawKey)
        ? "soc"
        : rawKey;
    const name = String(item.name ?? key).trim() || key;
    return [{
      id,
      key,
      name,
      shortLabel: String(item.shortLabel ?? name).trim() || name,
      defaultUnit: String(item.defaultUnit ?? ""),
      valueType: normalizeMeasurementValueType(item.valueType),
      defaultDecimals: Math.max(0, Math.min(8, Number.isFinite(Number(item.defaultDecimals)) ? Number(item.defaultDecimals) : 3)),
      defaultColor: String(item.defaultColor ?? "#334155").trim() || "#334155",
      defaultFontFamily: String(item.defaultFontFamily ?? "Arial").trim() || "Arial",
      defaultFontSize: normalizeMeasurementDefaultFontSize(id, item.defaultFontSize),
      defaultFontWeight: normalizeMeasurementFontWeight(item.defaultFontWeight, id),
      defaultVisible: item.defaultVisible !== false
    }];
  });
  const validTypeIds = new Set(measurementTypes.map((item) => item.id));
  const seenProfiles = new Set();
  const deviceProfiles = rawProfiles.flatMap((profile) => {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return [];
    }
    const deviceKind = String(profile.deviceKind ?? "").trim();
    if (!deviceKind || seenProfiles.has(deviceKind)) {
      return [];
    }
    seenProfiles.add(deviceKind);
    const profileItems = migrateHydrogenTankMeasurementProfileItems(
      deviceKind,
      Array.isArray(profile.items) ? profile.items : []
    );
    const items = profileItems.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
      }
      const rawMeasurementTypeId = String(item.measurementTypeId ?? "").trim();
      const measurementTypeId = electricStorageMeasurementProfileKinds.has(deviceKind) && rawMeasurementTypeId === "level"
        ? "soc"
        : /^(?:state_of_charge|stateOfCharge)$/u.test(rawMeasurementTypeId)
          ? "soc"
          : rawMeasurementTypeId;
      if (!measurementTypeId || !validTypeIds.has(measurementTypeId)) {
        return [];
      }
      return [{
        name: item.name !== undefined ? String(item.name) : undefined,
        measurementTypeId,
        position: item.position !== undefined ? String(item.position).trim() || undefined : undefined,
        associatedField: item.associatedField !== undefined
          ? String(item.associatedField)
              .trim()
              .replace(/^(?:gasQuantity|gasquantity)$/u, "gas_quantity")
              .replace(/^(?:state_of_charge|stateOfCharge)$/u, "soc") || undefined
          : undefined,
        role: item.role ? String(item.role) : undefined,
        defaultVisible: item.defaultVisible,
        labelOverride: item.labelOverride ? String(item.labelOverride) : undefined,
        unitOverride: item.unitOverride ? String(item.unitOverride) : undefined,
        decimalsOverride: item.decimalsOverride === undefined
          ? undefined
          : Math.max(0, Math.min(8, Number.isFinite(Number(item.decimalsOverride)) ? Number(item.decimalsOverride) : 3)),
        styleOverride: normalizeMeasurementStyleOverride(item.styleOverride)
      }];
    });
    return [{
      deviceKind,
      items: withRequiredStoredBranchMeasurementProfileItems(deviceKind, items, validTypeIds)
    }];
  });
  return { groupDefaults, measurementTypes, deviceProfiles };
}
