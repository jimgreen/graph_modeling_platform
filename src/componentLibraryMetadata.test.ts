import { describe, expect, test } from "vitest";
import {
  componentLibraryDefinitionFromMetadata,
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
});
