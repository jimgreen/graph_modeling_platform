# 批量多范围模型导出 API 设计

## 目标

新增一个空间隔离的批量模型导出接口。调用方可以按当前空间、指定方案或指定模型选择模型集合，并一次请求 JSON、SVG、CIM/XML 和 E 文件。所有结果都放在一个 `application/json` 响应中，文本和二进制内容以 Base64 字节返回，同时携带实际编码、MIME 类型和文件名。

实现优先复用现有的模型枚举、E 文件、SVG、CIM/XML 和多模型 E 生成逻辑，不复制已有格式生成器。

## 接口

```http
GET /webgrp/v1/models/export
```

接口默认作用于当前空间。空间解析沿用现有链：`X-Space` > `?space=` > `gmp_space` Cookie > 首个空间。

### 范围参数

`scope` 可取：

- `space`：当前空间内全部模型。默认值为 `space`。
- `scheme`：指定方案下的模型。需要 `schemeId` 或 `schemePath`；两者同时提供时必须一致。`includeDescendants=true`（默认）包含子方案，`false` 只包含当前方案。
- `model`：指定单个模型。需要 `modelId`，或 `schemeId/schemePath + name`。

范围选择器互斥：

- `scope=space` 不接受 `schemeId`、`schemePath`、`name`、`modelId`、`includeDescendants`。
- `scope=scheme` 不接受 `name`、`modelId`。
- `scope=model` 不接受 `includeDescendants`，接受 `modelId`，或者接受方案选择器与 `name`。

缺少选择器、选择器不一致或指定对象不存在时返回现有 v1 错误码：`400 bad-request` 或 `404 not-found`。

`modelId` 使用已保存模型的正整数 `project.idx`。`scope=model` 时，`modelId` 与 `schemeId/schemePath + name` 互斥，避免两个定位结果不一致。`schemeId`、`modelId` 使用正整数；`includeDescendants`、`mergeE`、`includeAssociatedModels` 和 `strict` 只接受 `true|false` 或 `1|0`，不把任意非空字符串当作真值。

### 产物参数

```text
formats=json,svg,cim,e
encoding=utf-8|gbk
template=<预定义 E 模板名>
mergeE=true|false
includeAssociatedModels=true|false
colorMode=energy|voltage
strict=true|false
```

- `formats` 是逗号分隔的格式集合，支持 `json`、`svg`、`cim`、`e`，默认四种全部生成；空项会被忽略，重复项去重，未知格式返回 400。
- `encoding` 默认 `utf-8`。所有文本产物字节使用该编码，包含 E 文件、SVG、CIM/XML 和 JSON 产物；外层 HTTP JSON envelope 始终使用 UTF-8。JSON 产物按该编码序列化后再 Base64 编码。调用方显式传 `gbk` 时，SVG/CIM/XML 的 XML 声明也使用 `GBK`，字节通过现有编码工具生成。
- `template` 只作用于 E 文件，使用现有预定义模板清单和模型类型校验。
- `mergeE` 默认 `false`。为 `true` 时必须请求 `formats` 中的 `e`，并按 `modelType` 分组生成多个合并 E 产物；厂站、馈线、台区各自独立合并，其他类型不强行套用预定义模板。
- `includeAssociatedModels` 默认 `false`。为 `true` 时扩展关联模型闭包。
- `colorMode` 只作用于 SVG，沿用现有 `energy|voltage` 校验。
- `strict` 只作用于 CIM/XML，沿用现有关键参数严格校验。外部格式名使用 `cim`，内部继续调用现有 `cim-xml` 生成器。

不适用于当前格式的参数返回 `400 bad-request`，不能静默忽略。例如 `formats=json&template=配网实时库`、`mergeE=true&formats=json`、`colorMode=voltage&formats=e` 都应被拒绝。

E 模板只筛选 E 产物的输入模型。选择范围中的模型仍然保留在 `models` 中，并继续生成请求的 JSON、SVG、CIM；不符合预定义模板类型的模型不生成 E，写入一条 warning。`formats=e` 且所有模型都被模板筛掉时，接口返回空的 `mergedE` 或没有 E artifact，并保留模型范围信息。

## 关联模型扩展

关联扩展只在 `scope=scheme` 或 `scope=model` 且 `includeAssociatedModels=true` 时生效；`scope=space` 已经覆盖空间内所有模型，不额外重复扩展。

关联关系复用当前模型语义：

1. 模型关联设备的 `model_id`。目标模型类型由现有 `modelAssociationModelTypeForKind()` 决定。
2. 全局线路登记表中的 source/target 模型引用。

关系遍历包含两个方向：从模型中的 `model_id` 找到目标模型，也从全局线路记录找到另一端模型；当关联模型被纳入闭包后，继续扫描该模型的正向关系。空间内反向引用会通过全空间模型索引补齐，因此选择单个子模型时，开启关联扩展可以得到引用它的上层模型。关联扩展始终限制在当前空间。

算法从初始模型集合开始递归遍历关联引用，直到没有新模型。每个模型使用稳定键去重：优先使用正整数 `project.idx` 与 `modelType`，缺失时使用规范化 `schemePath + name`。循环引用只处理一次。

最终模型顺序固定为 `schemePath` 的中文排序、模型名排序、正整数 `idx` 排序，保证同一数据集重复请求时响应和合并 E 的输入顺序稳定。

无法解析的关联模型不阻断主导出，写入 `warnings`，包含 `code`、来源模型、节点或线路、目标标识和原因。已解析的关联模型标记 `expandedByAssociation=true`，便于调用方区分原始范围与扩展范围。

`scope=space` 的初始集合已经覆盖当前空间模型，因此不再做关联扩展，但仍可在 `warnings` 中报告无法解析的关系。

## 响应

```json
{
  "ok": true,
  "data": {
    "scope": "scheme",
    "selectedBy": {
      "schemePath": ["默认方案"]
    },
    "includeDescendants": true,
    "includeAssociatedModels": true,
    "selectedModelCount": 3,
    "expandedModelCount": 1,
    "modelCount": 4,
    "models": [
      {
        "modelId": 12,
        "schemeId": 3,
        "schemePath": ["默认方案"],
        "name": "厂站一",
        "modelType": "厂站",
        "expandedByAssociation": false,
        "artifacts": [
          {
            "format": "json",
            "encoding": "utf-8",
            "mimeType": "application/json",
            "filename": "厂站一.json",
            "contentBase64": "..."
          },
          {
            "format": "svg",
            "encoding": "utf-8",
            "mimeType": "image/svg+xml",
            "filename": "厂站一.svg",
            "contentBase64": "..."
          },
          {
            "format": "cim",
            "encoding": "utf-8",
            "mimeType": "application/xml",
            "filename": "厂站一.xml",
            "contentBase64": "..."
          }
        ]
      }
    ],
    "mergedE": [
      {
        "format": "e",
        "modelType": "厂站",
        "modelIds": [12, 15],
        "template": "国网E格式",
        "encoding": "gbk",
        "mimeType": "text/plain",
        "filename": "厂站-merged.e",
        "contentBase64": "..."
      }
    ],
    "warnings": []
  }
}
```

`models[].artifacts` 保存逐模型产物。某个模型因 E 模板类型不匹配而被跳过 E 时，该模型仍可包含 JSON/SVG/CIM artifact，E artifact 可以缺失并由 warning 说明。启用 `mergeE=true` 且请求 E 时，逐模型 E 不再重复放入 `artifacts`，合并结果只放入顶层 `mergedE`。同一 `modelType` 对应一个合并结果；`modelIds` 记录合并输入。`selectedModelCount` 是范围选择直接命中的数量，`expandedModelCount` 是关联闭包新增的数量，`modelCount` 是最终导出的模型数量。`modelId` 的响应类型为 `number|string`，因为正常模型使用正整数 `idx`，缺少 idx 的历史数据使用稳定路径键。

JSON 产物仍以 Base64 字节返回，调用方按 `encoding` 解码后得到模型 JSON。这样外层 JSON 不会破坏 GBK 或其他指定编码。生成失败时整个接口返回错误，不返回部分成功数据。

## 生成与复用边界

新增 `server/apiV1BatchModelExport.mjs` 作为编排层，只负责参数解析、范围解析、关联闭包、格式分派和响应组装。

复用现有实现：

- 空间/方案模型枚举：复用 `listSpaceArtifactModels` 或抽取出的通用模型枚举函数，并在编排层统一 `scope`、子方案和稳定排序。
- E 文件：复用 `buildEFilesForSavedModels`；合并 E 复用 `buildMultiModelEFileExport`。
- SVG：复用 `renderSavedModelSvg`。
- CIM/XML：复用 `buildCimForSavedModel` 的模型读取和参数校验逻辑；新增可注入编码的字节适配，不复制 CIM 构建器。CIM 的 XML 声明、字节编码和 MIME 由批量适配层统一处理。
- 编码与 XML 声明：复用 `encodeTextBytes`、`withXmlEncodingDeclaration` 和现有 `iconv-lite` 口径。
- 空间路径和错误信封：复用 `withSpacePaths`、`sendV1Error`、现有 v1 状态码映射。

现有 `/v1/schemes/model/export`、`/v1/spaces/export-artifacts` 和 `/v1/schemes/export` 保持兼容，不改响应结构；新接口只复用其内部生成器。

## 错误与边界

- `400 bad-request`：非法 scope、格式、编码、模板、选择器、view 专用参数或 merge 参数组合。
- `404 not-found`：指定方案或模型不存在。
- `500 internal`：模型读取、格式生成、关联闭包所需的非 ENOENT 读盘失败，或任一生成器失败。
- 关联目标缺失、类型不符或循环引用：不阻断导出；缺失项进入 `warnings`，循环只去重不重复报错。
- 没有匹配模型：返回 `200`，`models=[]`、`mergedE=[]`、`warnings=[]`。
- 生成任一模型失败：整个请求失败，不返回不完整的 `models` 或 `mergedE`。

## 测试计划

新增和更新测试覆盖：

1. scope=space/scheme/model 的范围解析、子方案开关、布尔参数解析和选择器互斥。
2. 四种格式、UTF-8/GBK、SVG 配色、CIM strict、E 模板。
3. `mergeE=false` 逐模型 E，`mergeE=true` 按模型类型分组合并。
4. `includeAssociatedModels` 的 model_id、全局线路正反向引用、递归闭包、循环引用、缺失引用 warning。
5. JSON Base64 字节解码后与现有单模型接口产物一致。
6. 旧接口不受影响，路由覆盖、Swagger、MCP 既有测试继续通过。

## 非目标

- 不改变现有单模型导出、空间派生 ZIP、方案 ZIP 或空间原样备份的响应契约。
- 不把生成的 JSON/SVG/CIM/E 文件写回数据目录。
- 不新增自定义模板文本的批量 POST；自定义模板继续走现有单模型 POST 接口。
- 不把关联模型关系写回模型或全局线路登记表。
