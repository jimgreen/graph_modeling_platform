<basevalue>
//   功率基值    功率系数    电压系数
@    p_base    p_scale    u_scale
</basevalue>

<basevoltage>
//   序号    名称    电压等级
@    idx    name    vltp
</basevoltage>

<subcontrolarea>
//   序号    名称
@    idx    name
</subcontrolarea>

<substation>
//   序号    名称    电压等级ID
@    idx    name    idv
</substation>

<node 中文名="节点" 类别库="交流设备" 类="ACNode+交流母线">
//   序号    名称    真实母线    所属厂站    电压等级    电压幅值    电压相角    电压上限    电压下限
@    idx    name    realbs    ist    vltp    v    a    vmax    vmin
</node>

<unit 中文名="机组" 类别库="交流设备" 类="交流电源">
//   序号    名称    设备类型    运行状态    所属厂站    首端节点    可调节    无功容量    容量    功率因数角    有功上限    有功下限    无功上限    无功下限    有功    无功    电压
@    idx    name    type    runstat    ist    ind    regable    pqv    mva    psa    wmx    wmn    rmx    rmn    p    q    v
</unit>

<load 中文名="负荷" 类别库="交流设备" 类="交流负荷">
//   序号    名称    运行状态    所属厂站    首端节点    有功上限    有功下限    无功上限    无功下限    有功    无功
@    idx    name    runstat    ist    ind    wmx    wmn    rmx    rmn    p    q
</load>

<estore 中文名="储能" 类别库="交流设备" 类="交流电化学储能">
//   序号    名称    设备类型    运行状态    所属厂站    可调节    最大充电功率    最小充电功率    最大放电功率    最小放电功率    荷电状态    最大充电容量    最大放电容量    充电效率    放电效率    自损耗率    SOC上限    SOC下限
@    idx    name    type    runstat    ild    regable    p_charge_max    p_charge_min    p_discharge_max    p_discharge_min    soc    cn_max    dcn_max    charge_efficiency    discharge_efficiency    slorate    soc_max    soc_min
</estore>

<cb 中文名="断路器" 类别库="交流设备" 类="交流开关">
//   序号    名称    设备类型    运行状态    所属厂站    首端节点    末端节点    测量点
@    idx    name    type    runstat    ist    ind    znd    point
</cb>

<line 中文名="线路" 类别库="交流设备" 类="交流线路">
//   序号    名称    运行状态    首端节点    末端节点    所属厂站    状态    容量    最大电流    电阻    电抗    电纳
@    idx    name    runstat    ind    znd    ist    zst    mva    imax    rij    xij    bch
</line>

<trfm  中文名="变压器" 类别库="交流设备" 类="双绕组变压器+三绕组变压器">
//   序号    名称   所属厂站    运行状态    容量
@    idx    name    ist    runstat    mva
</trfm>

<trans 中文名="变压器绕组" 类别库="交流设备" 类="ACTransWinding">
//   序号    名称    所属厂站    所属变压器    运行状态    首端节点    末端节点    容量    最大电流    电阻    电抗    电导    电纳    电压等级    阻抗电压    分接头类型    分接头
@    idx    name    ist    itrfm    runstat    ind    znd    mva    imax    rij    xij    gti    bti    vl    zvl    tij    taptype    tap
</trans>