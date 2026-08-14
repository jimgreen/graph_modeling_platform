import { describe, expect, test } from "vitest";
import {
  componentLibraryDefinitionFromMetadata,
  resolveComponentLibraryClassFamilyMetadata,
  resolveComponentLibraryClassMetadata
} from "./componentLibraryMetadata";

describe("component library class metadata", () => {
  test("derived classes inherit structural metadata and persist no duplicate structural fields", () => {
    const definitions = [
      {
        name: "UserBase",
        categoryLibraryName: "用户设备",
        label: "用户基类",
        isDerivedComponentLibrary: false,
        isContainerComponentLibrary: false,
        terminalCount: 2,
        terminalTypes: ["ac", "dc"],
        terminalLabels: ["交流端", "直流端"],
        terminalRoles: ["single-source", "single-load"],
        terminalAssociations: ["ac-generator", "dc-load"]
      },
      {
        name: "UserDerived",
        categoryLibraryName: "用户设备",
        label: "用户派生类",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "UserBase",
        isContainerComponentLibrary: true,
        terminalCount: 1,
        terminalTypes: ["h2"],
        terminalLabels: ["不应采用的旧端子"]
      }
    ] as any;

    const metadata = resolveComponentLibraryClassMetadata(
      "UserDerived",
      "用户设备",
      definitions,
      []
    );

    expect(metadata).toMatchObject({
      className: "UserDerived",
      baseComponentLibrary: "UserBase",
      isDerivedComponentLibrary: true,
      isContainer: false,
      terminalCount: 2,
      terminalTypes: ["ac", "dc"],
      terminalLabels: ["交流端", "直流端"],
      terminalRoles: ["single-source", "single-load"],
      terminalAssociations: ["ac-generator", "dc-load"]
    });

    const storedDefinition = componentLibraryDefinitionFromMetadata(metadata!);
    expect(storedDefinition).toEqual({
      name: "UserDerived",
      categoryLibraryName: "用户设备",
      label: "用户派生类",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "UserBase"
    });
  });

  test("rejects cyclic derived-class relationships", () => {
    const definitions = [
      {
        name: "ClassA",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ClassB"
      },
      {
        name: "ClassB",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ClassA"
      }
    ] as any;

    expect(resolveComponentLibraryClassMetadata("ClassA", "用户设备", definitions, [])).toBeNull();
    expect(resolveComponentLibraryClassMetadata("ClassB", "用户设备", definitions, [])).toBeNull();
  });

  test("returns only the selected component-library family including nested derived classes", () => {
    const definitions = [
      {
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      },
      {
        name: "OffshoreWindGen",
        categoryLibraryName: "交流设备",
        label: "海上风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "UserWindGen"
      },
      {
        name: "UserBranch",
        categoryLibraryName: "交流设备",
        label: "用户支路",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACBranch"
      }
    ] as any;
    const templates = [
      {
        kind: "ac-source",
        label: "交流电源",
        componentClass: "ACGenerator",
        categoryLibrary: "交流设备",
        params: { component_type: "ACGenerator" },
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"]
      },
      {
        kind: "ac-branch",
        label: "交流线路",
        componentClass: "ACBranch",
        categoryLibrary: "交流设备",
        params: { component_type: "ACBranch" },
        terminalType: "ac",
        terminalCount: 2,
        terminalTypes: ["ac", "ac"]
      }
    ] as any;

    const family = resolveComponentLibraryClassFamilyMetadata(
      "UserWindGen",
      "交流设备",
      definitions,
      templates
    );

    expect(family.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "UserWindGen",
      "OffshoreWindGen"
    ]);
    expect(family.map((metadata) => metadata.className)).not.toContain("ACBranch");
    expect(family.map((metadata) => metadata.className)).not.toContain("UserBranch");
  });

  test("recovers a family root hidden by a historical concrete-template class override", () => {
    const definitions = [{
      name: "TestGen2",
      categoryLibraryName: "交流设备",
      label: "派生发电机",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator"
    }] as any;
    const templates = [{
      kind: "ac-source",
      label: "被历史覆盖的交流电源",
      componentClass: "CorruptedDerivedClass",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACRealBs",
      derivedComponentLibrary: "CorruptedDerivedClass",
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"]
    }, {
      kind: "ac-hydro-source",
      label: "交流水力发电机",
      componentClass: "ACHydroGen",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "ACHydroGen",
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"]
    }] as any;

    const familyFromDerived = resolveComponentLibraryClassFamilyMetadata(
      "ACHydroGen",
      "交流设备",
      definitions,
      templates
    );
    const familyFromMissingRoot = resolveComponentLibraryClassFamilyMetadata(
      "ACGenerator",
      "交流设备",
      definitions,
      templates
    );

    expect(familyFromDerived.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "ACHydroGen",
      "TestGen2"
    ]);
    expect(familyFromMissingRoot.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "ACHydroGen",
      "TestGen2"
    ]);
    expect(familyFromMissingRoot[0]).toMatchObject({
      className: "ACGenerator",
      isDerivedComponentLibrary: false,
      baseComponentLibrary: "ACGenerator",
      terminalTypes: ["ac"]
    });
  });
});
