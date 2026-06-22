import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageName = "@fluentui/svg-icons";
const packageVersion = "1.1.330";
const packageSpec = `${packageName}@${packageVersion}`;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "public", "icon-library", "office-fluent-compatible");
const tempDir = path.join(rootDir, "tmp", "office-fluent-icons");
const packDir = path.join(tempDir, "pack");
const extractDir = path.join(tempDir, "extract");
const preferredSize = 24;
const fallbackSizes = [24, 20, 28, 32, 16, 48];
const npmCommand = "npm";
const maxIconsPerCategory = 224;

const categories = [
  {
    id: "commands",
    label: "常用命令",
    description: "新增、删除、复制、粘贴、保存、撤销、下载、上传等 Office 常用操作。",
    icons: [
      ["add", "新增"],
      ["subtract", "减少"],
      ["delete", "删除"],
      ["dismiss", "关闭"],
      ["checkmark", "确认"],
      ["edit", "编辑"],
      ["copy", "复制"],
      ["cut", "剪切"],
      ["clipboard", "剪贴板"],
      ["clipboard_paste", "粘贴"],
      ["save", "保存"],
      ["arrow_undo", "撤销"],
      ["arrow_redo", "重做"],
      ["arrow_download", "下载"],
      ["arrow_upload", "上传"],
      ["open", "打开"],
      ["print", "打印"],
      ["share", "共享"],
    ],
  },
  {
    id: "navigation-view",
    label: "导航视图",
    description: "搜索、筛选、设置、更多、缩放、全屏、左右面板、网格和图层等视图控制。",
    icons: [
      ["search", "搜索"],
      ["filter", "筛选"],
      ["settings", "设置"],
      ["more_horizontal", "更多横向"],
      ["more_vertical", "更多纵向"],
      ["zoom_in", "放大"],
      ["zoom_out", "缩小"],
      ["full_screen_maximize", "最大化"],
      ["full_screen_minimize", "还原"],
      ["panel_left", "左侧栏"],
      ["panel_right", "右侧栏"],
      ["panel_left_contract", "收起左侧栏"],
      ["panel_right_contract", "收起右侧栏"],
      ["grid", "网格"],
      ["layer", "图层"],
      ["stack", "堆叠"],
      ["board", "看板"],
      ["cursor", "指针"],
    ],
  },
  {
    id: "documents-files",
    label: "文档文件",
    description: "文档、文件夹、PDF、表格、图片文档、压缩包和归档类图标。",
    icons: [
      ["document", "文档"],
      ["document_add", "新建文档"],
      ["document_edit", "编辑文档"],
      ["document_copy", "复制文档"],
      ["document_pdf", "PDF文档"],
      ["document_text", "文本文件"],
      ["document_table", "表格文档"],
      ["document_image", "图片文档"],
      ["document_one_page", "单页文档"],
      ["folder", "文件夹"],
      ["folder_add", "新增文件夹"],
      ["folder_open", "打开文件夹"],
      ["folder_zip", "压缩文件夹"],
      ["archive", "归档"],
    ],
  },
  {
    id: "formatting",
    label: "文字排版",
    description: "粗体、斜体、下划线、字体、颜色、对齐、项目符号和编号等文本编辑图标。",
    icons: [
      ["text_bold", "粗体"],
      ["text_italic", "斜体"],
      ["text_underline", "下划线"],
      ["text_font", "字体"],
      ["text_color", "文字颜色"],
      ["text_align_left", "左对齐"],
      ["text_align_center", "居中对齐"],
      ["text_align_right", "右对齐"],
      ["text_bullet_list", "项目符号"],
      ["text_number_list_ltr", "编号列表"],
      ["paint_brush", "格式刷"],
      ["paint_bucket", "填充颜色"],
      ["draw_shape", "绘制形状"],
      ["shapes", "形状"],
      ["shape_exclude", "形状裁剪"],
      ["select_all_on", "全选"],
    ],
  },
  {
    id: "data-charts",
    label: "数据图表",
    description: "表格、图表、数据库、计算器和数据可视化图标。",
    icons: [
      ["table", "表格"],
      ["table_add", "新增表格"],
      ["table_edit", "编辑表格"],
      ["chart_multiple", "多图表"],
      ["chart_person", "人员图表"],
      ["data_bar_vertical", "柱状图"],
      ["data_histogram", "直方图"],
      ["data_pie", "饼图"],
      ["data_scatter", "散点图"],
      ["database", "数据库"],
      ["calculator", "计算器"],
      ["access_time", "时间"],
      ["history", "历史"],
      ["arrow_clockwise", "顺时针刷新"],
      ["arrow_counterclockwise", "逆时针刷新"],
    ],
  },
  {
    id: "collaboration",
    label: "协作通信",
    description: "邮件、日历、人员、聊天、通话、会议、云、链接和附件。",
    icons: [
      ["mail", "邮件"],
      ["calendar", "日历"],
      ["people", "人员"],
      ["person", "用户"],
      ["person_add", "新增用户"],
      ["chat", "聊天"],
      ["call", "通话"],
      ["video", "会议视频"],
      ["cloud", "云"],
      ["cloud_arrow_up", "云上传"],
      ["cloud_arrow_down", "云下载"],
      ["link", "链接"],
      ["attach", "附件"],
    ],
  },
  {
    id: "media-assets",
    label: "媒体素材",
    description: "图片、相机、视频、音频、麦克风、播放控制等素材处理图标。",
    icons: [
      ["image", "图片"],
      ["image_add", "新增图片"],
      ["image_edit", "编辑图片"],
      ["camera", "相机"],
      ["video_clip", "视频片段"],
      ["music_note_2", "音乐"],
      ["mic", "麦克风"],
      ["speaker_2", "扬声器"],
      ["play", "播放"],
      ["pause", "暂停"],
      ["stop", "停止"],
      ["record", "录制"],
    ],
  },
  {
    id: "status-security",
    label: "状态安全",
    description: "成功、错误、告警、信息、锁、盾牌、密钥和安全状态。",
    icons: [
      ["checkmark_circle", "成功"],
      ["error_circle", "错误"],
      ["warning", "警告"],
      ["info", "信息"],
      ["alert", "提醒"],
      ["lock_closed", "锁定"],
      ["lock_open", "解锁"],
      ["shield", "盾牌"],
      ["shield_checkmark", "安全确认"],
      ["key", "密钥"],
      ["bug", "缺陷"],
    ],
  },
  {
    id: "developer-integration",
    label: "开发集成",
    description: "代码、分支、调试、控制台、插件、USB、电池、电力和网络连接。",
    icons: [
      ["code", "代码"],
      ["code_block", "代码块"],
      ["clipboard_code", "代码剪贴板"],
      ["branch", "分支"],
      ["branch_fork", "派生分支"],
      ["window_dev_tools", "开发工具"],
      ["window_console", "控制台"],
      ["plug_connected", "插件连接"],
      ["usb_plug", "USB连接"],
      ["battery_10", "低电量"],
      ["battery_charge", "充电"],
      ["flash", "闪电"],
      ["wifi_1", "弱网络"],
      ["wifi_2", "中等网络"],
      ["wifi_3", "强网络"],
    ],
  },
  {
    id: "canvas-modeling",
    label: "画布建模",
    description: "移动、旋转、尺寸、选择、对齐、图层、面板和建模画布辅助图标。",
    icons: [
      ["arrow_move", "移动"],
      ["arrow_rotate_clockwise", "旋转"],
      ["resize", "调整尺寸"],
      ["align_left", "左对齐"],
      ["align_right", "右对齐"],
      ["align_top", "顶端对齐"],
      ["align_bottom", "底端对齐"],
      ["align_center_horizontal", "水平居中"],
      ["align_center_vertical", "垂直居中"],
      ["draw_shape", "图形绘制"],
      ["shapes", "多形状"],
      ["layer", "图层"],
      ["stack", "层叠"],
      ["select_all_on", "选择全部"],
      ["board", "画板"],
    ],
  },
];

categories.push(
  {
    id: "maps-places",
    label: "地图地点",
    description: "地图、定位、建筑、道路、停车、园区和公共设施等地点类 Office 风格图标。",
    icons: [
      ["location", "位置"],
      ["map", "地图"],
      ["building", "建筑"],
      ["home", "主页建筑"],
      ["vehicle_car_profile", "车辆位置"],
    ],
  },
  {
    id: "transport-facilities",
    label: "交通设施",
    description: "车辆、公交、道路、停车、航空、船舶、充电和运输设施图标。",
    icons: [
      ["vehicle_car", "汽车"],
      ["vehicle_truck_profile", "货车"],
      ["vehicle_bus", "公交"],
      ["airplane", "飞机"],
      ["gas", "燃料"],
    ],
  },
  {
    id: "business-finance",
    label: "业务金融",
    description: "成本、付款、合同、库存、票据、目标、组织和经营管理类图标。",
    icons: [
      ["money", "资金"],
      ["payment", "付款"],
      ["receipt", "票据"],
      ["briefcase", "业务"],
      ["target", "目标"],
    ],
  },
  {
    id: "devices-hardware",
    label: "设备硬件",
    description: "服务器、设备、传感器、打印、扫描、相机、插件、电池和硬件连接图标。",
    icons: [
      ["server", "服务器"],
      ["desktop", "桌面设备"],
      ["phone", "手机"],
      ["print", "打印机"],
      ["plug_connected", "插件连接"],
    ],
  },
  {
    id: "energy-utilities",
    label: "能源公用事业",
    description: "电力、电池、插头、燃气、水务、天气、环保和公用事业设施图标。",
    icons: [
      ["power", "电源"],
      ["battery_charge", "电池充电"],
      ["plug_connected", "插头连接"],
      ["flash", "闪电"],
      ["gas_pump", "燃料泵"],
      ["water", "水务"],
      ["weather_sunny", "晴天"],
      ["building_factory", "工厂"],
    ],
  },
  {
    id: "cloud-ai-infrastructure",
    label: "云与AI基础设施",
    description: "云、服务器、数据库、机器人、AI、自动化、网络和数据基础设施图标。",
    icons: [
      ["cloud", "云"],
      ["cloud_database", "云数据库"],
      ["server_multiple", "多服务器"],
      ["database_stack", "数据库栈"],
      ["bot", "机器人"],
      ["bot_sparkle", "智能机器人"],
      ["brain_circuit", "脑电路"],
      ["data_usage_sparkle", "智能数据"],
    ],
  },
  {
    id: "security-compliance",
    label: "安全合规",
    description: "盾牌、锁、证书、签名、合规、权限、风险和审计类图标。",
    icons: [
      ["shield_checkmark", "安全确认"],
      ["shield_lock", "安全锁"],
      ["lock_closed", "锁定"],
      ["key", "密钥"],
      ["certificate", "证书"],
      ["document_signature", "文档签名"],
      ["person_key", "人员密钥"],
      ["warning_shield", "风险防护"],
    ],
  },
  {
    id: "education-research",
    label: "教育科研",
    description: "图书、课程、实验、公式、白板、毕业、研究和知识表达图标。",
    icons: [
      ["book_open", "打开图书"],
      ["book_open_lightbulb", "知识灵感"],
      ["hat_graduation", "毕业"],
      ["beaker", "实验"],
      ["microscope", "显微镜"],
      ["math_formula", "数学公式"],
      ["whiteboard", "白板"],
      ["slide_text", "课件文本"],
    ],
  },
  {
    id: "health-wellness",
    label: "医疗健康",
    description: "医生、患者、心率、急救、药品、健康数据和医疗服务图标。",
    icons: [
      ["doctor", "医生"],
      ["patient", "患者"],
      ["stethoscope", "听诊器"],
      ["heart_pulse", "心率"],
      ["person_heart", "人员健康"],
      ["clipboard_heart", "健康记录"],
      ["briefcase_medical", "医疗箱"],
      ["pill", "药品"],
    ],
  },
  {
    id: "workflow-automation",
    label: "流程自动化",
    description: "任务、流程图、分支、路由、审批、扫描、二维码和自动化处理图标。",
    icons: [
      ["flowchart", "流程图"],
      ["document_flowchart", "文档流程图"],
      ["branch_fork", "分支"],
      ["arrow_routing", "路由"],
      ["clipboard_task_list", "任务清单"],
      ["approvals_app", "审批"],
      ["scan_qr_code", "扫码"],
      ["tasks_app", "任务应用"],
    ],
  },
  {
    id: "accessibility-inclusion",
    label: "无障碍与包容",
    description: "无障碍、人员支持、社区协作、可访问性状态和人群服务图标。",
    icons: [
      ["accessibility", "无障碍"],
      ["accessibility_checkmark", "无障碍确认"],
      ["accessibility_error", "无障碍异常"],
      ["accessibility_more", "更多无障碍"],
      ["accessibility_question_mark", "无障碍帮助"],
      ["person_standing", "站立人员"],
      ["person_running", "跑步人员"],
      ["person_support", "人员支持"],
      ["people_community", "社区人群"],
      ["people_community_add", "新增社区"],
      ["people_eye", "人群可见"],
      ["people_search", "人群搜索"],
    ],
  },
  {
    id: "retail-commerce",
    label: "零售商务",
    description: "购物、支付、钱包、票据、零售建筑、商品和库存流转图标。",
    icons: [
      ["cart", "购物车"],
      ["wallet", "钱包"],
      ["wallet_credit_card", "钱包信用卡"],
      ["payment", "付款"],
      ["payment_wireless", "无线付款"],
      ["receipt", "票据"],
      ["receipt_money", "收款票据"],
      ["building_retail", "零售建筑"],
      ["building_retail_money", "零售资金"],
      ["building_shop", "店铺"],
      ["box", "商品箱"],
      ["box_multiple", "多商品箱"],
    ],
  },
  {
    id: "mail-calendar",
    label: "邮件日程",
    description: "邮件、收件箱、日历、会议日程、同步、提醒和办公计划图标。",
    icons: [
      ["mail", "邮件"],
      ["mail_add", "新增邮件"],
      ["mail_checkmark", "邮件确认"],
      ["mail_clock", "定时邮件"],
      ["mail_inbox", "收件箱"],
      ["mail_multiple", "多封邮件"],
      ["calendar", "日历"],
      ["calendar_add", "新增日程"],
      ["calendar_checkmark", "日程确认"],
      ["calendar_clock", "日程时间"],
      ["calendar_month", "月历"],
      ["calendar_work_week", "工作周"],
    ],
  },
  {
    id: "meeting-devices",
    label: "会议与终端",
    description: "会议室设备、麦克风、扬声器、耳机、视频、电话和桌面终端图标。",
    icons: [
      ["device_meeting_room", "会议室设备"],
      ["device_meeting_room_all_in_one", "一体会议设备"],
      ["device_meeting_room_bar", "会议条形设备"],
      ["device_meeting_room_remote", "会议遥控器"],
      ["mic", "麦克风"],
      ["speaker_2", "扬声器"],
      ["headphones", "耳机"],
      ["video", "视频"],
      ["video_people", "视频人员"],
      ["phone", "电话"],
      ["desktop", "桌面终端"],
      ["laptop", "笔记本"],
    ],
  },
  {
    id: "forms-tables",
    label: "表单表格",
    description: "表单、复选框、表格、扫描表格、文本框和结构化录入图标。",
    icons: [
      ["form", "表单"],
      ["form_multiple", "多表单"],
      ["form_new", "新表单"],
      ["form_sparkle", "智能表单"],
      ["checkbox_checked", "已勾选"],
      ["checkbox_unchecked", "未勾选"],
      ["table", "表格"],
      ["table_add", "新增表格"],
      ["table_edit", "编辑表格"],
      ["table_search", "搜索表格"],
      ["scan_table", "扫描表格"],
      ["text_box_settings", "文本框设置"],
    ],
  },
  {
    id: "operations-maintenance",
    label: "运营维护",
    description: "扳手、工具箱、运维工具、数据工具、人员工具和趋势维修图标。",
    icons: [
      ["wrench", "扳手"],
      ["wrench_screwdriver", "扳手螺丝刀"],
      ["wrench_settings", "维修设置"],
      ["toolbox", "工具箱"],
      ["box_toolbox", "箱体工具"],
      ["document_toolbox", "文档工具"],
      ["data_usage_toolbox", "数据工具"],
      ["calendar_toolbox", "日历工具"],
      ["clock_toolbox", "时间工具"],
      ["people_toolbox", "人员工具"],
      ["person_wrench", "人员维修"],
      ["arrow_trending_wrench", "趋势维修"],
    ],
  },
  {
    id: "campus-education",
    label: "校园教育",
    description: "图书、白板、毕业、课件、实验、公式、证书和校园教学科研图标。",
    icons: [
      ["book", "图书"],
      ["book_open", "打开图书"],
      ["book_open_lightbulb", "知识灵感"],
      ["notebook", "笔记本"],
      ["whiteboard", "白板"],
      ["slide_text", "课件文本"],
      ["hat_graduation", "毕业"],
      ["beaker", "实验"],
      ["document_one_page_beaker", "实验文档"],
      ["microscope", "显微镜"],
      ["math_formula", "数学公式"],
      ["certificate", "证书"],
    ],
  },
  {
    id: "public-sector",
    label: "公共服务",
    description: "政府建筑、公共机构、位置、服务人群、安全确认、证书和支持服务图标。",
    icons: [
      ["building_government", "政府建筑"],
      ["building_government_search", "机构查询"],
      ["building_bank", "公共机构"],
      ["document_signature", "签署文档"],
      ["certificate", "证书"],
      ["ribbon", "荣誉"],
      ["shield_checkmark", "安全确认"],
      ["globe_location", "全球位置"],
      ["location", "位置"],
      ["people_community", "社区人群"],
      ["accessibility", "无障碍"],
      ["person_support", "人员支持"],
    ],
  },
  {
    id: "asset-logistics",
    label: "资产与物流",
    description: "箱体、库存、条码、二维码、运输车辆、单据、表格和任务跟踪图标。",
    icons: [
      ["box", "箱体"],
      ["box_multiple", "多箱体"],
      ["box_checkmark", "箱体确认"],
      ["box_search", "箱体搜索"],
      ["barcode_scanner", "条码扫描"],
      ["scan_qr_code", "二维码扫描"],
      ["vehicle_truck", "货车"],
      ["vehicle_truck_checkmark", "货车确认"],
      ["document_table_truck", "运输表单"],
      ["table", "表格"],
      ["clipboard_task_list", "任务清单"],
      ["receipt_cube", "物品票据"],
    ],
  },
  {
    id: "field-service",
    label: "现场服务",
    description: "现场检修、定位、电话、拍照、扫码、工单、日程和工具箱服务图标。",
    icons: [
      ["person_wrench", "人员检修"],
      ["wrench", "扳手"],
      ["toolbox", "工具箱"],
      ["vehicle_truck_profile", "服务车辆"],
      ["location", "现场位置"],
      ["phone", "电话"],
      ["camera", "相机"],
      ["scan", "扫描"],
      ["calendar_toolbox", "检修日程"],
      ["document_toolbox", "检修文档"],
      ["clipboard_task_list", "任务清单"],
      ["people_toolbox", "团队工具"],
    ],
  },
  {
    id: "energy-control",
    label: "能源与控制",
    description: "电源、电池、插头、闪电、同步、控制台、设置、数据和能量控制类 Fluent 图标。",
    icons: [
      ["power", "电源"],
      ["flash", "闪电"],
      ["flash_settings", "闪电设置"],
      ["battery_charge", "电池充电"],
      ["battery_warning", "电池告警"],
      ["plug_connected", "插头连接"],
      ["plug_connected_settings", "插头设置"],
      ["data_usage_settings", "数据设置"],
      ["desktop_pulse", "桌面脉冲"],
      ["window_console", "控制台"],
      ["arrow_sync", "同步"],
      ["settings", "设置"],
    ],
  },
  {
    id: "generation-link",
    label: "发电环节",
    description: "发电厂、发电电源、燃料、水务、日照、电池、并网、计量和发电侧控制类 Fluent 图标。",
    icons: [
      ["building_factory", "发电厂"],
      ["flash", "发电"],
      ["power", "电源"],
      ["gas_pump", "燃料"],
      ["water", "水务"],
      ["weather_sunny", "日照"],
      ["lightbulb", "电能"],
      ["battery_charge", "储能接入"],
      ["plug_connected", "并网连接"],
      ["gauge", "运行表计"],
      ["data_usage_settings", "数据设置"],
      ["desktop_pulse", "机组监控"],
    ],
  },
  {
    id: "transmission-link",
    label: "输电环节",
    description: "输电线路、杆塔、通道、网络、同步、拓扑、走廊和线路状态类 Fluent 图标。",
    icons: [
      ["desktop_tower", "杆塔"],
      ["line", "线路"],
      ["line_horizontal_3", "多回线路"],
      ["flash", "高压电能"],
      ["power", "输电电源"],
      ["virtual_network", "输电网络"],
      ["network_check", "网络校核"],
      ["arrow_sync", "潮流同步"],
      ["branch_compare", "线路分支"],
      ["location", "杆塔位置"],
      ["map_drive", "线路通道"],
      ["road", "运维通道"],
    ],
  },
  {
    id: "substation-link",
    label: "变电环节",
    description: "变电站、母线、屏柜、间隔、开关状态、保护、计量和站控层通用 Fluent 图标。",
    icons: [
      ["building_factory", "变电站"],
      ["building_desktop", "站控系统"],
      ["grid", "母线网格"],
      ["sub_grid", "间隔分区"],
      ["panel_left", "左侧屏柜"],
      ["panel_right", "右侧屏柜"],
      ["settings", "站内设置"],
      ["flash_settings", "电气设置"],
      ["plug_connected_settings", "连接设置"],
      ["database_lightning", "电气数据"],
      ["gauge", "站内表计"],
      ["shield_settings", "保护设置"],
    ],
  },
  {
    id: "distribution-link",
    label: "配电环节",
    description: "配电设备、分支、台区、馈线自动化、位置、网络状态和检修运维类 Fluent 图标。",
    icons: [
      ["box_toolbox", "配电箱检修"],
      ["box_checkmark", "配电箱正常"],
      ["branch_compare", "馈线分支"],
      ["flowchart", "配网拓扑"],
      ["plug_connected", "配电连接"],
      ["building_home", "台区"],
      ["home_add", "新增用户"],
      ["wifi_warning", "通信告警"],
      ["location", "设备位置"],
      ["wrench_settings", "设备运维"],
      ["clipboard_task", "巡检任务"],
      ["network_check", "网络校核"],
    ],
  },
  {
    id: "consumption-link",
    label: "用电环节",
    description: "用户、楼宇、家庭、负荷、电表、充电、能效、需求响应和用电监测类 Fluent 图标。",
    icons: [
      ["home", "居民用户"],
      ["building_home", "楼宇用户"],
      ["building_factory", "工业用户"],
      ["lightbulb", "照明负荷"],
      ["plug_connected", "用电连接"],
      ["battery_charge", "电池充电"],
      ["vehicle_car", "电动汽车"],
      ["gauge", "用电计量"],
      ["data_usage", "用电数据"],
      ["data_usage_settings", "能效设置"],
      ["desktop_pulse", "用电监测"],
      ["power", "用户电源"],
    ],
  },
  {
    id: "new-energy-equipment",
    label: "新能源设备",
    description: "风电、光伏、氢能、储能及新能源场站监控相关的通用 Fluent 图标。",
    icons: [
      ["weather_sunny", "光伏日照"],
      ["flash", "新能源电能"],
      ["battery_charge", "储能充电"],
      ["plug_connected", "并网接入"],
      ["gas_pump", "氢气燃料"],
      ["water", "制氢水源"],
      ["building_factory", "新能源场站"],
      ["data_usage_settings", "数据设置"],
      ["gauge", "运行表计"],
      ["desktop_pulse", "场站监控"],
      ["arrow_sync", "能量同步"],
      ["settings", "设备设置"],
    ],
  },
  {
    id: "power-electronics",
    label: "电力电子",
    description: "整流、逆变、变流、滤波、柔直、并网控制和电能质量相关的通用 Fluent 图标。",
    icons: [
      ["flash_settings", "电能控制"],
      ["plug_connected_settings", "并网设置"],
      ["power", "电源变换"],
      ["battery_charge", "储能变流"],
      ["database_lightning", "电气数据"],
      ["desktop_pulse", "波形监控"],
      ["data_usage_settings", "参数配置"],
      ["settings", "控制设置"],
      ["gauge", "变流表计"],
      ["virtual_network", "柔性网络"],
      ["network_check", "并网校核"],
      ["window_console", "控制台"],
    ],
  },
  {
    id: "cooling-heating-energy",
    label: "冷热能源",
    description: "供冷、供热、冷源、热源、温度、水系统、能源站和冷热负荷相关的通用 Fluent 图标。",
    icons: [
      ["weather_snowflake", "供冷"],
      ["temperature", "温度"],
      ["water", "水系统"],
      ["weather_sunny", "热源"],
      ["gas_pump", "燃气热源"],
      ["lightbulb", "冷热负荷"],
      ["building_factory", "冷热能源站"],
      ["gauge", "冷热计量"],
      ["data_usage_settings", "运行参数"],
      ["settings", "系统设置"],
      ["arrow_sync", "冷热平衡"],
      ["plug_connected", "电驱设备"],
    ],
  },
  {
    id: "gas-energy",
    label: "燃气能源",
    description: "燃气、气网、燃机、燃气锅炉、调压计量和气体安全相关的通用 Fluent 图标。",
    icons: [
      ["gas", "燃气"],
      ["gas_pump", "燃气站"],
      ["building_factory", "燃气设施"],
      ["gauge", "燃气计量"],
      ["settings", "调压设置"],
      ["data_usage_settings", "气网数据"],
      ["network_check", "管网校核"],
      ["location", "站点位置"],
      ["shield_settings", "安全保护"],
      ["flash", "燃机发电"],
      ["power", "气转电"],
      ["desktop_pulse", "气网监控"],
    ],
  },
  {
    id: "integrated-energy",
    label: "综合能源",
    description: "冷、热、电、气多能互补、综合能源站、能量枢纽和多能流调度相关的通用 Fluent 图标。",
    icons: [
      ["building_factory", "综合能源站"],
      ["weather_snowflake", "冷"],
      ["temperature", "热"],
      ["power", "电"],
      ["gas", "气"],
      ["battery_charge", "储能"],
      ["plug_connected", "电气连接"],
      ["water", "水系统"],
      ["lightbulb", "负荷"],
      ["arrow_sync", "多能协调"],
      ["data_usage", "多能数据"],
      ["desktop_pulse", "能源监控"],
    ],
  },
  {
    id: "meteorology-environment",
    label: "气象与环境",
    description: "晴雨、云、雪、雾、雷暴、湿度、温度、水务和天气环境类 Fluent 图标。",
    icons: [
      ["weather_sunny", "晴天"],
      ["weather_cloudy", "多云"],
      ["weather_rain", "降雨"],
      ["weather_snow", "降雪"],
      ["weather_thunderstorm", "雷暴"],
      ["weather_fog", "雾"],
      ["weather_humidity", "湿度"],
      ["weather_haze", "霾"],
      ["weather_drizzle", "毛毛雨"],
      ["weather_snowflake", "雪花"],
      ["temperature", "温度"],
      ["water", "水"],
    ],
  },
  {
    id: "communication-network",
    label: "通信网络",
    description: "WiFi、蜂窝、虚拟网络、信号、对讲、通信安全和云同步类 Fluent 图标。",
    icons: [
      ["wifi_3", "WiFi强信号"],
      ["wifi_settings", "WiFi设置"],
      ["wifi_warning", "WiFi告警"],
      ["cellular_5g", "5G蜂窝"],
      ["cellular_warning", "蜂窝告警"],
      ["network_check", "网络确认"],
      ["virtual_network", "虚拟网络"],
      ["desktop_signal", "桌面信号"],
      ["walkie_talkie", "对讲机"],
      ["communication_shield", "通信安全"],
      ["cloud_sync", "云同步"],
      ["database_plug_connected", "数据库连接"],
    ],
  },
);

const categoryPatterns = {
  commands: [
    "add",
    "subtract",
    "delete",
    "dismiss",
    "checkmark",
    "edit",
    "copy",
    "cut",
    "clipboard",
    "save",
    "arrow_undo",
    "arrow_redo",
    "arrow_download",
    "arrow_upload",
    "open",
    "print",
    "share",
    "send",
    "rename",
    "select",
    "compose",
    "settings",
    "options",
    "refresh",
    "sync",
    "apps_add",
  ],
  "navigation-view": [
    "search",
    "filter",
    "settings",
    "more",
    "zoom",
    "full_screen",
    "panel",
    "grid",
    "layer",
    "stack",
    "board",
    "cursor",
    "navigation",
    "drawer",
    "sidebar",
    "window",
    "view",
    "eye",
    "layout",
    "arrow",
    "chevron",
  ],
  "documents-files": [
    "document",
    "folder",
    "archive",
    "zip",
    "text",
    "page",
    "book",
    "notebook",
    "note",
    "form",
    "slide",
    "table",
    "file",
    "copy",
    "scan",
    "receipt",
    "clipboard",
  ],
  formatting: [
    "text",
    "font",
    "align",
    "bullet",
    "number",
    "paint",
    "draw",
    "shape",
    "color",
    "highlight",
    "paragraph",
    "indent",
    "line",
    "border",
    "resize",
    "crop",
    "image_edit",
  ],
  "data-charts": [
    "table",
    "chart",
    "data",
    "database",
    "calculator",
    "time",
    "history",
    "analytics",
    "poll",
    "gauge",
    "timer",
    "clock",
    "calendar",
    "money",
    "number",
    "branch_compare",
  ],
  collaboration: [
    "mail",
    "calendar",
    "people",
    "person",
    "chat",
    "call",
    "video",
    "cloud",
    "link",
    "attach",
    "comment",
    "presence",
    "contact",
    "group",
    "organization",
    "share",
    "meet",
  ],
  "media-assets": [
    "image",
    "camera",
    "video",
    "music",
    "mic",
    "speaker",
    "play",
    "pause",
    "stop",
    "record",
    "filmstrip",
    "picture",
    "audio",
    "video_clip",
    "scan_camera",
    "color",
  ],
  "status-security": [
    "checkmark",
    "error",
    "warning",
    "info",
    "alert",
    "lock",
    "shield",
    "key",
    "bug",
    "certificate",
    "password",
    "person_lock",
    "presence",
    "prohibited",
    "question",
    "status",
  ],
  "developer-integration": [
    "code",
    "branch",
    "window_dev_tools",
    "window_console",
    "plug",
    "usb",
    "battery",
    "flash",
    "wifi",
    "api",
    "connector",
    "bot",
    "database",
    "server",
    "cloud",
    "flow",
    "bundle",
  ],
  "canvas-modeling": [
    "arrow_move",
    "rotate",
    "resize",
    "align",
    "draw",
    "shape",
    "layer",
    "stack",
    "select",
    "board",
    "grid",
    "crop",
    "drag",
    "group",
    "transform",
    "position",
    "ink",
    "pen",
  ],
  "maps-places": [
    "location",
    "map",
    "maps",
    "navigation",
    "compass",
    "directions",
    "building",
    "home",
    "house",
    "office",
    "city",
    "street",
    "road",
    "park",
    "parking",
    "hotel",
    "store",
    "shop",
    "mailbox",
    "globe",
    "earth",
  ],
  "transport-facilities": [
    "vehicle",
    "car",
    "truck",
    "bus",
    "bicycle",
    "scooter",
    "airplane",
    "flight",
    "train",
    "tram",
    "subway",
    "ship",
    "boat",
    "gas",
    "fuel",
    "parking",
    "road",
    "traffic",
    "charger",
    "battery_charge",
  ],
  "business-finance": [
    "money",
    "payment",
    "wallet",
    "receipt",
    "briefcase",
    "contract",
    "document",
    "task",
    "target",
    "trophy",
    "reward",
    "people",
    "organization",
    "building_bank",
    "calendar",
    "box",
    "bundle",
    "cart",
    "shopping",
  ],
  "devices-hardware": [
    "server",
    "desktop",
    "laptop",
    "tablet",
    "phone",
    "device",
    "print",
    "printer",
    "scan",
    "camera",
    "plug",
    "usb",
    "battery",
    "connector",
    "sensor",
    "hard_drive",
    "keyboard",
    "mouse",
    "speaker",
    "mic",
  ],
  "energy-utilities": [
    "power",
    "battery",
    "plug",
    "flash",
    "lightbulb",
    "weather",
    "water",
    "gas",
    "factory",
    "building_factory",
    "earth",
    "leaf",
    "recycle",
    "home_energy",
    "saver",
    "warning",
  ],
  "cloud-ai-infrastructure": [
    "cloud",
    "server",
    "database",
    "data_usage",
    "bot",
    "brain",
    "sparkle",
    "automation",
    "flow",
    "connector",
    "virtual_network",
    "iot",
    "window_database",
    "api",
    "branch",
  ],
  "security-compliance": [
    "shield",
    "lock",
    "key",
    "certificate",
    "signature",
    "document_signature",
    "person_key",
    "person_lock",
    "warning_shield",
    "prohibited",
    "password",
    "fingerprint",
    "inprivate",
    "audit",
  ],
  "education-research": [
    "book",
    "notebook",
    "hat_graduation",
    "beaker",
    "microscope",
    "math",
    "formula",
    "whiteboard",
    "slide",
    "ribbon",
    "premium",
    "lightbulb",
    "question",
    "learning",
  ],
  "health-wellness": [
    "doctor",
    "patient",
    "stethoscope",
    "heart",
    "pulse",
    "medical",
    "pill",
    "briefcase_medical",
    "person_heart",
    "clipboard_heart",
    "home_heart",
    "document_heart",
  ],
  "workflow-automation": [
    "flowchart",
    "flow",
    "branch",
    "routing",
    "task",
    "tasks",
    "approvals",
    "scan",
    "qr_code",
    "barcode",
    "checkbox",
    "clipboard_task",
    "process",
    "arrow_repeat",
  ],
  "accessibility-inclusion": [
    "accessibility",
    "person",
    "people",
    "community",
    "support",
    "standing",
    "running",
    "eye",
    "search",
    "available",
    "question",
    "checkmark",
  ],
  "retail-commerce": [
    "cart",
    "wallet",
    "payment",
    "receipt",
    "retail",
    "shop",
    "store",
    "box",
    "money",
    "bag",
    "briefcase",
    "building_retail",
    "credit",
    "cash",
  ],
  "mail-calendar": [
    "mail",
    "mailbox",
    "inbox",
    "calendar",
    "clock",
    "agenda",
    "week",
    "month",
    "sync",
    "reply",
    "template",
    "briefcase",
    "checkmark",
  ],
  "meeting-devices": [
    "meeting",
    "device_meeting",
    "mic",
    "microphone",
    "speaker",
    "headphones",
    "video",
    "phone",
    "desktop",
    "laptop",
    "tablet",
    "remote",
    "camera",
  ],
  "forms-tables": [
    "form",
    "checkbox",
    "table",
    "scan_table",
    "textbox",
    "text_box",
    "document_table",
    "clipboard",
    "list",
    "field",
    "input",
    "settings",
  ],
  "operations-maintenance": [
    "wrench",
    "toolbox",
    "settings",
    "maintenance",
    "repair",
    "tool",
    "data_usage_toolbox",
    "document_toolbox",
    "calendar_toolbox",
    "clock_toolbox",
    "people_toolbox",
    "box_toolbox",
  ],
  "campus-education": [
    "book",
    "notebook",
    "whiteboard",
    "slide",
    "hat_graduation",
    "beaker",
    "microscope",
    "math",
    "formula",
    "certificate",
    "lightbulb",
    "question",
    "document_one_page",
  ],
  "public-sector": [
    "government",
    "building_government",
    "bank",
    "certificate",
    "signature",
    "ribbon",
    "shield",
    "globe_location",
    "location",
    "community",
    "accessibility",
    "support",
  ],
  "asset-logistics": [
    "box",
    "barcode",
    "qr_code",
    "scan",
    "vehicle_truck",
    "truck",
    "document_table",
    "receipt",
    "cube",
    "clipboard_task",
    "inventory",
    "warehouse",
  ],
  "field-service": [
    "wrench",
    "toolbox",
    "vehicle",
    "truck",
    "location",
    "phone",
    "camera",
    "scan",
    "calendar_toolbox",
    "document_toolbox",
    "clipboard_task",
    "people_toolbox",
    "person_wrench",
  ],
  "energy-control": [
    "power",
    "flash",
    "battery",
    "plug",
    "data_usage",
    "desktop_pulse",
    "console",
    "settings",
    "sync",
    "cloud_flow",
    "battery_warning",
    "plug_connected",
  ],
  "generation-link": [
    "factory",
    "power",
    "flash",
    "gas",
    "water",
    "weather_sunny",
    "lightbulb",
    "battery",
    "plug_connected",
    "gauge",
    "desktop_pulse",
    "data_usage",
  ],
  "transmission-link": [
    "tower",
    "line",
    "network",
    "virtual_network",
    "network_check",
    "sync",
    "branch",
    "location",
    "map",
    "road",
    "flash",
    "power",
  ],
  "substation-link": [
    "building",
    "grid",
    "sub_grid",
    "panel",
    "settings",
    "flash_settings",
    "plug_connected_settings",
    "database_lightning",
    "gauge",
    "shield_settings",
  ],
  "distribution-link": [
    "box",
    "branch",
    "flowchart",
    "plug_connected",
    "building_home",
    "home",
    "wifi_warning",
    "location",
    "wrench_settings",
    "clipboard_task",
    "network_check",
  ],
  "consumption-link": [
    "home",
    "building_home",
    "building_factory",
    "lightbulb",
    "plug_connected",
    "battery_charge",
    "vehicle_car",
    "gauge",
    "data_usage",
    "desktop_pulse",
    "power",
  ],
  "new-energy-equipment": [
    "weather_sunny",
    "flash",
    "battery",
    "plug_connected",
    "gas",
    "water",
    "factory",
    "data_usage",
    "gauge",
    "desktop_pulse",
    "sync",
    "settings",
  ],
  "power-electronics": [
    "flash_settings",
    "plug_connected_settings",
    "power",
    "battery_charge",
    "database_lightning",
    "desktop_pulse",
    "data_usage_settings",
    "settings",
    "gauge",
    "virtual_network",
    "network_check",
    "console",
  ],
  "cooling-heating-energy": [
    "weather_snowflake",
    "temperature",
    "water",
    "weather_sunny",
    "gas",
    "lightbulb",
    "building_factory",
    "gauge",
    "data_usage",
    "settings",
    "sync",
    "plug_connected",
  ],
  "gas-energy": [
    "gas",
    "gas_pump",
    "building_factory",
    "gauge",
    "settings",
    "data_usage",
    "network_check",
    "location",
    "shield",
    "flash",
    "power",
    "desktop_pulse",
  ],
  "integrated-energy": [
    "building_factory",
    "weather_snowflake",
    "temperature",
    "power",
    "gas",
    "battery",
    "plug_connected",
    "water",
    "lightbulb",
    "sync",
    "data_usage",
    "desktop_pulse",
  ],
  "meteorology-environment": [
    "weather",
    "temperature",
    "water",
    "cloud",
    "rain",
    "snow",
    "sunny",
    "fog",
    "humidity",
    "haze",
    "thunderstorm",
    "drizzle",
  ],
  "communication-network": [
    "wifi",
    "cellular",
    "network",
    "signal",
    "walkie",
    "communication",
    "cloud_sync",
    "database_plug",
    "virtual_network",
    "desktop_signal",
    "shield",
    "plug",
  ],
};

const categoryDenyPatterns = {
  "generation-link": [/_arrow_/i],
  "transmission-link": [
    /^arrow_/i,
    /_arrow_/i,
    /^pipeline_arrow_curve_down$/i,
    /^edit_line/i,
    /^line_horizontal/i,
    /^network_adapter$/i,
    /^star_line/i,
  ],
  "substation-link": [/^keyboard_/i, /^panel_(bottom|left|right|top)/i],
  "distribution-link": [/^arrow_/i, /_arrow_/i, /^chevron_/i, /^keyboard_/i],
  "energy-control": [/^xbox/i],
  "power-electronics": [/^filter(_|$)/i],
  "meteorology-environment": [
    /air_(balloon|horn|traffic)/i,
    /hot_air_balloon/i,
    /snow(boarding|mobile|shoeing)/i,
    /t_shirt_air/i,
  ],
};

const sourceAudit = {
  generatedAt: new Date().toISOString(),
  packageName,
  packageVersion,
  packageSpec,
  license: "MIT",
  sourceRepository: "https://github.com/microsoft/fluentui-system-icons",
  packageRegistry: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`,
  decision:
    "Used Microsoft Fluent UI System Icons from the MIT-licensed @fluentui/svg-icons package. Microsoft Office application brand icons and proprietary Office built-in icon assets were not copied.",
};

const mitLicenseText = `MIT License

Copyright (c) 2020 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function quoteWindowsArg(value) {
  const text = String(value);
  if (!/[ \t"&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '\\"')}"`;
}

function run(command, args, options = {}) {
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")]
      : args;
  const result = spawnSync(process.platform === "win32" ? "cmd.exe" : command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nerror:\n${result.error?.message || ""}\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`,
    );
  }
  return result.stdout.trim();
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nameTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1_$2")
    .replace(/(\d)([a-z])/g, "$1_$2")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function tokenMatchesPattern(tokens, pattern) {
  const patternTokens = nameTokens(pattern);
  if (patternTokens.length === 0) {
    return false;
  }
  return tokens.some((_, index) =>
    patternTokens.every((patternToken, offset) => tokens[index + offset] === patternToken),
  );
}

function categoryMatchScore(sourceName, patterns) {
  const tokens = nameTokens(sourceName);
  let score = 0;
  for (const pattern of patterns) {
    if (tokenMatchesPattern(tokens, pattern)) {
      score += nameTokens(pattern).length > 1 ? 6 : 4;
    }
  }
  return score;
}

function categoryRejectsSourceName(sourceName, patterns = []) {
  if (!patterns.length) {
    return false;
  }

  const rawName = String(sourceName || "").toLowerCase();
  const normalizedName = rawName.replace(/[-\s]+/g, "_");
  const tokens = nameTokens(sourceName);
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0;
      if (pattern.test(rawName)) {
        return true;
      }
      pattern.lastIndex = 0;
      return pattern.test(normalizedName);
    }
    return tokenMatchesPattern(tokens, pattern);
  });
}

function iconComplexity(sourceName) {
  return String(sourceName)
    .split(/[_-\s]+/)
    .filter(Boolean).length;
}

function displayNameForSource(sourceName) {
  return String(sourceName)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function listAvailableRegularIcons(iconsDir) {
  const files = await readdir(iconsDir);
  const iconMap = new Map();
  for (const fileName of files) {
    const match = /^(.+)_(\d+)_regular\.svg$/.exec(fileName);
    if (!match) {
      continue;
    }
    const [, sourceName, sizeText] = match;
    const size = Number(sizeText);
    if (!fallbackSizes.includes(size)) {
      continue;
    }
    const current = iconMap.get(sourceName);
    const currentRank = current ? fallbackSizes.indexOf(current.size) : Number.POSITIVE_INFINITY;
    const rank = fallbackSizes.indexOf(size);
    if (!current || rank < currentRank) {
      iconMap.set(sourceName, {
        sourceName,
        size,
        filePath: path.join(iconsDir, fileName),
        fileName,
      });
    }
  }
  return [...iconMap.values()].sort((a, b) => a.sourceName.localeCompare(b.sourceName, "en"));
}

function normalizeSvg(svg, icon, category, pickedSize) {
  const title = escapeXml(icon.name);
  const description = escapeXml(`${category.label} - ${icon.sourceName}, ${pickedSize}px regular`);
  const withColor = svg
    .replace(/<\?xml[^>]*>\s*/i, "")
    .replace(/\swidth="[^"]*"/i, ' width="24"')
    .replace(/\sheight="[^"]*"/i, ' height="24"')
    .replace(/<path\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<path fill="currentColor"$1>')
    .replace(
      /<svg\b([^>]*)>/i,
      `<svg$1 color="#2563eb" role="img" aria-labelledby="${icon.id}-title ${icon.id}-desc">`,
    );
  return withColor.replace(
    /<svg\b([^>]*)>/i,
    `<svg$1>\n  <title id="${icon.id}-title">${title}</title>\n  <desc id="${icon.id}-desc">${description}</desc>`,
  );
}

function duplicateSvgKey(svg) {
  return String(svg || "")
    .replace(/<\?xml[^>]*>\s*/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, "")
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>\s*/gi, "")
    .replace(/\bid="[^"]*"/gi, "")
    .replace(/\baria-labelledby="[^"]*"/gi, "")
    .replace(/\bcolor="[^"]*"/gi, "")
    .replace(/#[0-9a-f]{3,8}/gi, "#color")
    .replace(/\bcurrentcolor\b/gi, "currentColor")
    .replace(/\s+/g, " ")
    .trim();
}

function findIconFile(iconsDir, sourceName) {
  for (const size of fallbackSizes) {
    const filePath = path.join(iconsDir, `${sourceName}_${size}_regular.svg`);
    if (existsSync(filePath)) {
      return { filePath, size };
    }
  }
  throw new Error(`Missing Fluent UI icon: ${sourceName}`);
}

function renderReadme(manifest) {
  return `# Office Fluent Compatible Icon Library

This directory contains SVG icons selected from Microsoft Fluent UI System Icons.

Source:

- Package: \`${packageSpec}\`
- Repository: ${sourceAudit.sourceRepository}
- License: MIT

Scope:

- Included: generic Office-style UI, document, collaboration, data, media, status, developer, and canvas-modeling icons.
- Excluded: Microsoft Office application brand logos and proprietary Office built-in icon assets.

Generated output:

- Total icons: ${manifest.totalIcons}
- Style: mostly \`${preferredSize}px regular\`; a small number use the closest available regular size.
- Format: standalone SVG using Fluent UI's original path geometry and \`currentColor\`.

Categories:

${manifest.categories.map((category) => `- \`${category.id}\`: ${category.label} (${category.icons.length})`).join("\n")}

Rebuild:

\`\`\`bash
node scripts/generate-office-fluent-icons.mjs
\`\`\`
`;
}

function renderPreviewHtml(manifest) {
  const categoryOptions = manifest.categories
    .map((category) => `<option value="${escapeXml(category.id)}">${escapeXml(category.label)}</option>`)
    .join("");
  const sections = manifest.categories
    .map(
      (category) => `
      <section>
        <h2>${escapeXml(category.label)} <span>${escapeXml(category.id)}</span></h2>
        <p>${escapeXml(category.description)}</p>
        <div class="grid">
          ${category.icons
            .map(
              (icon) => `
              <article
                data-category="${escapeXml(category.id)}"
                data-search="${escapeXml(`${icon.name} ${icon.sourceName} ${category.id} ${category.label}`.toLowerCase())}">
                <img src="./${escapeXml(icon.file)}" alt="${escapeXml(icon.name)}" />
                <strong>${escapeXml(icon.name)}</strong>
                <code>${escapeXml(icon.sourceName)}</code>
              </article>`,
            )
            .join("")}
        </div>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(manifest.label)}</title>
  <style>
    :root {
      color: #111827;
      background: #f8fafc;
      font-family: Arial, "Microsoft YaHei", sans-serif;
    }
    body {
      margin: 0;
      padding: 28px;
    }
    header,
    section {
      max-width: 1120px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 24px;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(160px, 220px);
      gap: 10px;
      margin-top: 16px;
      align-items: center;
    }
    input,
    select {
      height: 36px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font: inherit;
      box-sizing: border-box;
    }
    .result-count {
      margin-top: 10px;
      color: #475569;
      font-size: 13px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.25;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      line-height: 1.3;
    }
    h2 span {
      color: #64748b;
      font-size: 13px;
      font-weight: 400;
    }
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }
    section {
      margin-bottom: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    article {
      min-height: 132px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      display: grid;
      place-items: center;
      padding: 12px;
      text-align: center;
      box-sizing: border-box;
    }
    img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      margin-bottom: 8px;
      color: #2563eb;
    }
    strong {
      display: block;
      font-size: 13px;
      line-height: 1.35;
    }
    code {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      word-break: break-word;
    }
    article[hidden],
    section[hidden] {
      display: none;
    }
    @media (max-width: 720px) {
      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(manifest.label)}</h1>
    <p>共 ${manifest.totalIcons} 个 Microsoft Fluent UI System Icons。MIT 许可；不包含 Microsoft Office 品牌图标。</p>
    <div class="toolbar" role="search">
      <input id="searchInput" type="search" placeholder="搜索名称、来源、分类，例如 save / chart / 图层" autocomplete="off" />
      <select id="categoryFilter" aria-label="分类筛选">
        <option value="">全部分类</option>
        ${categoryOptions}
      </select>
    </div>
    <div id="resultCount" class="result-count"></div>
  </header>
  ${sections}
  <script>
    const cards = Array.from(document.querySelectorAll("article"));
    const sections = Array.from(document.querySelectorAll("section"));
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const resultCount = document.getElementById("resultCount");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function filterCards() {
      const keyword = normalize(searchInput.value);
      const category = categoryFilter.value;
      let visible = 0;
      for (const card of cards) {
        const show =
          (!keyword || card.dataset.search.includes(keyword)) &&
          (!category || card.dataset.category === category);
        card.hidden = !show;
        if (show) visible += 1;
      }
      for (const section of sections) {
        section.hidden = !Array.from(section.querySelectorAll("article")).some((card) => !card.hidden);
      }
      resultCount.textContent = "当前显示 " + visible + " / " + cards.length + " 个图标";
    }

    searchInput.addEventListener("input", filterCards);
    categoryFilter.addEventListener("change", filterCards);
    filterCards();
  </script>
</body>
</html>
`;
}

await rm(tempDir, { recursive: true, force: true });
await rm(outputDir, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });
await mkdir(extractDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

const tarballName = run(npmCommand, ["pack", packageSpec, "--pack-destination", packDir, "--silent"]);
const tarballPath = path.join(packDir, tarballName.split(/\r?\n/).filter(Boolean).at(-1));
run("tar", ["-xzf", tarballPath, "-C", extractDir]);

const packageDir = path.join(extractDir, "package");
const iconsDir = path.join(packageDir, "icons");
const packageJson = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
if (packageJson.license !== "MIT") {
  throw new Error(`Unexpected license for ${packageSpec}: ${packageJson.license}`);
}

const manifest = {
  name: "office-fluent-compatible",
  label: "Office Fluent 兼容图标库",
  generatedAt: sourceAudit.generatedAt,
  sourcePolicy:
    "使用 MIT 许可的 Microsoft Fluent UI System Icons；未复制 Microsoft Office 品牌图标或专有 Office 内置图标；同一个 Fluent 源图标只保留一次，避免跨分类重复。",
  packageName,
  packageVersion,
  root: "/icon-library/office-fluent-compatible",
  categories: [],
};

const availableIcons = await listAvailableRegularIcons(iconsDir);
const availableBySourceName = new Map(availableIcons.map((icon) => [icon.sourceName, icon]));
const usedSourceNames = new Set();
const emittedGlobalSvgKeys = new Set();

for (const category of categories) {
  const categoryDir = path.join(outputDir, category.id);
  await mkdir(categoryDir, { recursive: true });

  const manifestCategory = {
    id: category.id,
    label: category.label,
    description: category.description,
    icons: [],
  };

  const selected = [];
  const selectedNames = new Set();
  for (const [sourceName, name] of category.icons) {
    if (usedSourceNames.has(sourceName)) {
      continue;
    }
    const iconFile = availableBySourceName.get(sourceName);
    if (!iconFile) {
      throw new Error(`Missing Fluent UI icon: ${sourceName}`);
    }
    selected.push({ ...iconFile, name, pickedBy: "curated" });
    selectedNames.add(sourceName);
    usedSourceNames.add(sourceName);
  }

  const patterns = categoryPatterns[category.id] || [];
  const denyPatterns = categoryDenyPatterns[category.id] || [];
  const candidates = availableIcons
    .filter((iconFile) => !selectedNames.has(iconFile.sourceName) && !usedSourceNames.has(iconFile.sourceName))
    .filter((iconFile) => !categoryRejectsSourceName(iconFile.sourceName, denyPatterns))
    .map((iconFile) => ({
      ...iconFile,
      name: displayNameForSource(iconFile.sourceName),
      score: categoryMatchScore(iconFile.sourceName, patterns),
      complexity: iconComplexity(iconFile.sourceName),
      pickedBy: "auto",
    }))
    .filter((iconFile) => iconFile.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.complexity - b.complexity ||
        a.sourceName.length - b.sourceName.length ||
        a.sourceName.localeCompare(b.sourceName, "en"),
    );

  for (const iconFile of candidates) {
    if (selected.length >= maxIconsPerCategory) {
      break;
    }
    selected.push(iconFile);
    selectedNames.add(iconFile.sourceName);
    usedSourceNames.add(iconFile.sourceName);
  }

  selected.sort((a, b) => `${a.pickedBy}:${a.sourceName}`.localeCompare(`${b.pickedBy}:${b.sourceName}`, "en"));

  const emittedSvgKeys = new Set();
  for (const iconFile of selected) {
    const id = iconFile.sourceName.replaceAll("_", "-");

    const sourceSvg = await readFile(iconFile.filePath, "utf8");
    const svgKey = duplicateSvgKey(sourceSvg);
    if (svgKey && emittedSvgKeys.has(svgKey)) {
      continue;
    }
    if (svgKey && emittedGlobalSvgKeys.has(svgKey)) {
      continue;
    }
    if (svgKey) {
      emittedSvgKeys.add(svgKey);
      emittedGlobalSvgKeys.add(svgKey);
    }
    const icon = { id, name: iconFile.name, sourceName: iconFile.sourceName };
    const fileName = `${id}.svg`;
    const outputPath = path.join(categoryDir, fileName);
    await writeFile(outputPath, normalizeSvg(sourceSvg, icon, category, iconFile.size), "utf8");

    manifestCategory.icons.push({
      id,
      name: icon.name,
      file: `${category.id}/${fileName}`,
      sourceName: iconFile.sourceName,
      sourceFile: iconFile.fileName,
      sourcePackage: packageSpec,
      license: "MIT",
      pickedBy: iconFile.pickedBy,
    });
  }

  manifest.categories.push(manifestCategory);
}

manifest.totalIcons = manifest.categories.reduce((sum, category) => sum + category.icons.length, 0);
const searchIndex = manifest.categories.flatMap((category) =>
  category.icons.map((icon) => ({
    id: icon.id,
    name: icon.name,
    file: icon.file,
    categoryId: category.id,
    categoryLabel: category.label,
    sourceId: "fluent-system",
    sourceLabel: "Fluent UI System Icons",
    sourceName: icon.sourceName,
    sourcePackage: icon.sourcePackage,
    license: icon.license,
    keywords: [icon.name, icon.sourceName, category.id, category.label, icon.license, icon.pickedBy],
  })),
);
await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "source-audit.json"), `${JSON.stringify(sourceAudit, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "LICENSE-MIT.txt"), mitLicenseText, "utf8");
await writeFile(path.join(outputDir, "README.md"), renderReadme(manifest), "utf8");
await writeFile(path.join(outputDir, "index.html"), renderPreviewHtml(manifest), "utf8");

console.log(`Generated ${manifest.totalIcons} SVG icons in ${path.relative(rootDir, outputDir)}`);
