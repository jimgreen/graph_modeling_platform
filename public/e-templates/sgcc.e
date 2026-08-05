<basevalue>
@p_base|p_scale|u_scale
//功率基值|功率系数|电压系数
</basevalue>

<basevoltage>
@idx|name|vltp
//序号|名称|电压等级
</basevoltage>

<subcontrolarea>
@idx|name
//序号|名称
</subcontrolarea>

<substation>
@idx|name|idv
//序号|名称|电压等级ID
</substation>

<node 中文名="节点" 类别库="交流设备" 元件库="ACNode">
@idx|name|realbs|ist|vltp|v|a|vmax|vmin
//序号|名称|真实变电站|状态|电压等级|电压幅值|电压相角|电压上限|电压下限
</node>

<unit 中文名="机组" 类别库="交流设备" 元件库="交流电源">
@idx|name|type|runstat|ist|ind|regable|pqv|mva|psa|wmx|wmn|rmx|rmn|p|q|v
//序号|名称|类型|运行状态|状态|节点ID|可调节|无功容量|容量|功率因数角|有功上限|有功下限|无功上限|无功下限|有功|无功|电压
</unit>

<load 中文名="负荷" 类别库="交流设备" 元件库="交流负荷">
@idx|name|runstat|ist|ind|wmx|wmn|rmx|rmn|p|q
//序号|名称|运行状态|状态|节点ID|有功上限|有功下限|无功上限|无功下限|有功|无功
</load>

<estore 中文名="储能" 类别库="交流设备" 元件库="交流储能">
@idx|name|type|runstat|ild|regable|p_charge_max|p_charge_min|p_discharge_max|p_discharge_min|soc|cn_max|dcn_max|charge_efficiency|discharge_efficiency|slorate|soc_max|soc_min
//序号|名称|类型|运行状态|状态|可调节|最大充电功率|最小充电功率|最大放电功率|最小放电功率|荷电状态|最大充电容量|最大放电容量|充电效率|放电效率|自损耗率|SOC上限|SOC下限
</estore>

<cb 中文名="断路器" 类别库="交流设备" 元件库="交流开关">
@idx|name|type|runstat|ist|ind|znd|point
//序号|名称|类型|运行状态|状态|节点ID|阻抗节点|测量点
</cb>

<line 中文名="线路" 类别库="交流设备" 元件库="交流线路">
@idx|name|runstat|ind|znd|ist|zst|mva|imax|rij|xij|bch
//序号|名称|运行状态|节点ID|阻抗节点|状态|状态|容量|最大电流|电阻|电抗|电纳
</line>

<trfm 中文名="变压器" 类别库="交流设备" 元件库="双绕组主变+三绕组主变">
@idx|name|ist|itrfm|runstat|ind|znd|mva|imax|rij|xij|gti|bti|vl|zvl|tij|taptype|tap
//序号|名称|状态|变压器节点|运行状态|节点ID|阻抗节点|容量|最大电流|电阻|电抗|电导|电纳|电压等级|阻抗电压|分接头类型|分接头
</trfm>
