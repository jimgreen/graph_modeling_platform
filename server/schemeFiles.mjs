// 方案目录「什么算模型文件」的唯一判据。
// 4 个 files/** 遍历器（readSchemesFromFiles / projectJsonFileForName /
// maxStoredProjectIndex / scanProjectByIndex / listModelJsonFiles）与 globalLineRegistry
// 共用同一条规则；散落 6 份时改一次要动 6 处，漏一处就会把 scheme.json 当模型或漏掉模型。
//
// 无任何依赖，故 server.mjs / globalLineRegistry.mjs / schemeArchive.mjs 都能静态 import，
// 不会让注册表反向依赖 ZIP 打包模块。
export function isModelJsonFile(fileName) {
  return /\.json$/iu.test(fileName) && fileName.toLocaleLowerCase() !== "scheme.json";
}
