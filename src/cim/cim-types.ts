// CIM16 IR 类型定义（与 model.ts 解耦，仅描述导出中间形态）

/** 公共基础字段（CIM IdentifiedObject 子集） */
export interface CimIdentifiedObject {
  rdfId: string;
  name: string;
  description?: string;
  mRID?: string;
}

export interface CimFullModel {
  rdfAbout: string;
  created: string;
  description: string;
  version: number;
  profile: string;
}

export interface CimBaseVoltage extends CimIdentifiedObject {
  nominalVoltage: number; // kV
}

export interface CimSubstation extends CimIdentifiedObject {
  regionId?: string;
}

export interface CimVoltageLevel extends CimIdentifiedObject {
  substationId: string;
  baseVoltageId: string;
  lowCapacitance?: number;
  highCapacitance?: number;
}

export interface CimConnectivityNode extends CimIdentifiedObject {
  containerId: string;
  containerType: "VoltageLevel" | "Bay";
}

export interface CimTerminal extends CimIdentifiedObject {
  conductingEquipmentId: string;
  connectivityNodeId: string;
  sequenceNumber: number;
}

export interface CimACLineSegment extends CimIdentifiedObject {
  r: number;
  x: number;
  bch: number;
  length?: number;
  baseVoltageId: string;
}

export interface CimBusbarSection extends CimIdentifiedObject {
  voltageLevelId: string;
}

export interface CimPowerTransformer extends CimIdentifiedObject {
  substationId?: string;
  vectorGroup?: string;
}

export interface CimPowerTransformerEnd extends CimIdentifiedObject {
  transformerId: string;
  baseVoltageId: string;
  ratedU: number;
  ratedS?: number;
  r: number;
  x: number;
  endNumber: number;
  connectionKind?: "Y" | "D" | "Z" | "Yn";
}

export interface CimEnergySource extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;
  reactivePower?: number;
}

export interface CimEnergyConsumer extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;
  reactivePower?: number;
}

export interface CimGeneratingUnit extends CimIdentifiedObject {
  cimClass: "WindGeneratingUnit" | "SolarGeneratingUnit" | "ThermalGeneratingUnit" | "HydroGeneratingUnit";
  voltageLevelId?: string;
  baseVoltageId: string;
  ratedGrossMaxP?: number;
  ratedGrossMinP?: number;
}

export interface CimSwitch extends CimIdentifiedObject {
  cimClass: "Breaker" | "Disconnector" | "LoadBreakSwitch";
  voltageLevelId?: string;
  normalOpen: boolean;
}

export interface CimShuntCompensator extends CimIdentifiedObject {
  cimClass: "LinearShuntCompensator" | "SeriesCompensator";
  voltageLevelId?: string;
  bPerSection?: number;
  gPerSection?: number;
  sections: number;
}

export interface CimMeasurement extends CimIdentifiedObject {
  measurementType: "Analog" | "Discrete" | "StringMeasurement";
  unit?: string;
  phases?: string;
  terminalId?: string;
  powerSystemResourceId: string;
  measurementClass?: string;
}

export interface CimPackage {
  fullModel: CimFullModel;
  substations: CimSubstation[];
  voltageLevels: CimVoltageLevel[];
  baseVoltages: CimBaseVoltage[];
  busbarSections: CimBusbarSection[];
  acLineSegments: CimACLineSegment[];
  powerTransformers: CimPowerTransformer[];
  transformerEnds: CimPowerTransformerEnd[];
  energySources: CimEnergySource[];
  energyConsumers: CimEnergyConsumer[];
  generatingUnits: CimGeneratingUnit[];
  switches: CimSwitch[];
  shuntCompensators: CimShuntCompensator[];
  connectivityNodes: CimConnectivityNode[];
  terminals: CimTerminal[];
  measurements: CimMeasurement[];
}
