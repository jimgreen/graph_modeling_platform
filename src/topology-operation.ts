import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  buildTopology,
  calculateElectricalTopology,
  isBlockingTopologyValidationError,
  normalizeDeviceOperatingLimitsAfterTopology,
  topologyValidationInput,
  validateTopology,
  validateVoltageSetpointDeviations,
  type Edge,
  type ModelAssociationProjectIndexes,
  type ModelNode,
  type ProjectFile,
  type Topology,
  type TopologyValidationError
} from "./model.ts";

type TopologyOperationMode = "check" | "repair" | "ui";

export type TopologyOperationOptions = {
  mode: TopologyOperationMode;
  capacityFixScopeKey?: string;
  modelAssociationProjectIndexes?: ModelAssociationProjectIndexes;
};

export type TopologyOperationResult = {
  status: "success" | "failed";
  nodes: ModelNode[];
  errors: TopologyValidationError[];
  warnings: TopologyValidationError[];
  corrections: Array<{ nodeId: string; paramKey: string; value: string }>;
  modified: boolean;
  topology?: Topology;
  topologyIslandCount?: number;
};

function applyCorrections(
  nodes: ModelNode[],
  corrections: TopologyOperationResult["corrections"]
): ModelNode[] {
  const correctionsByNodeId = new Map<string, Record<string, string>>();
  for (const correction of corrections) {
    const nodeCorrections = correctionsByNodeId.get(correction.nodeId) ?? {};
    nodeCorrections[correction.paramKey] = correction.value;
    correctionsByNodeId.set(correction.nodeId, nodeCorrections);
  }
  return corrections.length === 0 ? nodes : nodes.map((node) => {
    const nodeCorrections = correctionsByNodeId.get(node.id);
    return nodeCorrections
      ? { ...node, params: { ...node.params, ...nodeCorrections } }
      : node;
  });
}

/**
 * Pure topology analysis shared by the canvas and server adapters.
 * check previews all safe parameter corrections without advancing the rated-capacity session tracker.
 */
export function runTopologyOperation(
  project: Pick<ProjectFile, "nodes" | "edges" | "modelType" | "powerUnit" | "voltageUnit" | "currentUnit">,
  options: TopologyOperationOptions
): TopologyOperationResult {
  const { nodes, edges } = project;
  const calculatedNodes = calculateElectricalTopology(nodes, edges);
  const topologyErrors = validateTopology(calculatedNodes, edges, {
    includeVoltageSetpointDeviations: false,
    modelType: project.modelType,
    modelAssociationProjectIndexes: options.modelAssociationProjectIndexes
  });
  const invalidVoltageBaseNodeIds = new Set(
    topologyErrors
      .filter((error) => [
        "voltage-mismatch",
        "missing-island-voltage",
        "island-voltage-mismatch",
        "transformer-island-short"
      ].includes(error.type))
      .flatMap((error) => error.relatedNodeIds)
  );
  const normalizedLimits = normalizeDeviceOperatingLimitsAfterTopology(calculatedNodes, {
    powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
    voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
    currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
    skipVoltageNodeIds: invalidVoltageBaseNodeIds,
    sourceNodes: nodes,
    ...(options.mode === "ui" && options.capacityFixScopeKey
      ? { capacityFixScopeKey: options.capacityFixScopeKey }
      : {})
  });
  const voltageDeviationErrors = validateVoltageSetpointDeviations(normalizedLimits.nodes, edges);
  const ratedVoltageDeviationErrors = voltageDeviationErrors.filter(
    (error) => error.type === "rated-voltage-deviation"
  );
  const validationErrors = [...topologyErrors, ...normalizedLimits.warnings, ...ratedVoltageDeviationErrors];
  const errors = validationErrors.filter(isBlockingTopologyValidationError);
  const warnings = validationErrors.filter((error) => !isBlockingTopologyValidationError(error));
  if (errors.length === 0) {
    warnings.push(...voltageDeviationErrors.filter(
      (error) => error.type !== "rated-voltage-deviation"
    ));
  }
  const topologyInput = topologyValidationInput(normalizedLimits.nodes, edges);
  const topology = errors.length === 0
    ? buildTopology(topologyInput.nodes, topologyInput.edges)
    : undefined;
  const resultNodes = topology
    ? normalizedLimits.nodes
    : applyCorrections(nodes, normalizedLimits.corrections);
  const modified = JSON.stringify(resultNodes) !== JSON.stringify(nodes);

  return {
    status: errors.length === 0 && warnings.length === 0 ? "success" : "failed",
    nodes: resultNodes,
    errors,
    warnings,
    corrections: normalizedLimits.corrections,
    modified,
    ...(topology ? { topology, topologyIslandCount: topology.connectedComponents.length } : {})
  };
}
