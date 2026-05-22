INSERT INTO inspection_templates (form_id, title, category) VALUES ('A6', '冷水机组及冷却塔查验单', '设备机房查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '冷水机组外观', '机组外观完好，无锈蚀、无破损，保温层完整无脱落，铭牌清晰', 0),
  (last_insert_rowid(), 2, '冷水机组运行', '运行平稳无异常振动及噪音，电流电压在额定范围内，油位油温正常', 1),
  (last_insert_rowid(), 3, '冷冻水/冷却水参数', '冷冻水进出水温差3-5℃，冷却水进出水温差4-6℃，流量符合设计要求', 2),
  (last_insert_rowid(), 4, '冷却塔外观及结构', '塔体结构完好无变形，填料完整无堵塞，布水器旋转正常', 3),
  (last_insert_rowid(), 5, '冷却塔风机及电机', '风机叶片完好，运转平稳，电机绝缘良好，皮带松紧适度', 4),
  (last_insert_rowid(), 6, '冷却水循环泵', '泵体运行平稳，无异常噪音，机械密封无泄漏，压力表指示正常', 5),
  (last_insert_rowid(), 7, '管道及阀门', '管道保温完好，阀门开关灵活无泄漏，止回阀及过滤器工作正常', 6),
  (last_insert_rowid(), 8, '控制系统', '控制柜内部清洁，接线牢固，参数设定正确，故障报警功能正常', 7),
  (last_insert_rowid(), 9, '水处理装置', '水处理设备运行正常，水质化验报告符合标准，加药装置工作正常', 8),
  (last_insert_rowid(), 10, '冷凝水排水', '冷凝水排水通畅，存水弯完好，无积水及溢水现象', 9);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('A7', '新风及通风排烟系统查验单', '设备机房查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '新风机组（AHU）', '机组安装牢固，箱体密封良好，过滤器清洁，表冷器翅片无倒伏', 0),
  (last_insert_rowid(), 2, '风机运行', '运行平稳无异响，皮带松紧适度，轴承温度正常，电流在额定范围内', 1),
  (last_insert_rowid(), 3, '风管及风口', '风管安装牢固，保温完整，风口送风均匀，风阀调节灵活', 2),
  (last_insert_rowid(), 4, '排烟风机', '风机启动正常，风量风压符合设计要求，控制柜接线牢固', 3),
  (last_insert_rowid(), 5, '排烟风管及阀件', '风管耐火极限符合要求，防火阀安装正确，熔断机构完好', 4),
  (last_insert_rowid(), 6, '排烟口及控制', '排烟口安装位置正确，手动及自动开启功能正常，复位灵活', 5),
  (last_insert_rowid(), 7, '通风系统联动', '消防信号联动排烟风机启动/停止、防火阀关闭功能正常', 6),
  (last_insert_rowid(), 8, '温控及自控', '温度传感器读数准确，电动阀动作正常，DDC控制箱功能完好', 7);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('A8', '消防水系统查验单', '设备机房查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '自动喷淋系统（湿式报警阀）', '报警阀组安装牢固，压力表指示正常，延迟器及水力警铃功能正常', 0),
  (last_insert_rowid(), 2, '喷淋头', '喷头选型正确、安装牢固，无遮挡、无锈蚀，温度等级标识清晰', 1),
  (last_insert_rowid(), 3, '水流指示器', '安装方向正确，信号反馈正常，末端试水装置开关灵活', 2),
  (last_insert_rowid(), 4, '室内消火栓', '箱体安装牢固，水带水枪齐全，栓口方向正确，阀门操作灵活', 3),
  (last_insert_rowid(), 5, '室外消火栓', '栓体完好无锈蚀，启闭灵活无泄漏，排水阀功能正常', 4),
  (last_insert_rowid(), 6, '水泵接合器', '安装位置便于操作，止回阀及闸阀完好，标识清晰', 5),
  (last_insert_rowid(), 7, '消防水池/水箱', '液位计显示正常，补水阀工作正常，水质清洁，无渗漏', 6),
  (last_insert_rowid(), 8, '管网压力', '最不利点消火栓静压≥0.07MPa，动压≥0.25MPa（或设计值），无渗漏', 7),
  (last_insert_rowid(), 9, '系统联动', '末端试水/消火栓按钮启动消防泵功能正常，水流指示器及压力开关信号反馈到控制室', 8);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('A9', '消防报警及联动系统查验单', '设备机房查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '火灾报警控制器', '主机运行正常，按键灵敏，显示屏清晰，打印机工作正常', 0),
  (last_insert_rowid(), 2, '感烟探测器', '安装位置正确，无遮挡，加烟测试报警正常，地址码与图纸一致', 1),
  (last_insert_rowid(), 3, '感温探测器', '安装位置正确，加热测试报警正常，响应温度符合设计要求', 2),
  (last_insert_rowid(), 4, '手动报警按钮', '安装牢固，按下后信号正常反馈，复位钥匙完好', 3),
  (last_insert_rowid(), 5, '声光报警器', '触发后声光输出正常，音量及照度符合规范要求', 4),
  (last_insert_rowid(), 6, '消防广播', '功放及扬声器工作正常，语音清晰无杂音，应急电源切换正常', 5),
  (last_insert_rowid(), 7, '消防电话', '消防电话分机与控制室通话清晰，插孔式电话功能正常', 6),
  (last_insert_rowid(), 8, '联动逻辑测试', '报警→切非消防电源/迫降电梯/启动排烟/关闭防火卷帘 等逻辑正确', 7),
  (last_insert_rowid(), 9, '应急照明及疏散指示', '照度符合要求，电池放电时间≥90min，疏散方向正确', 8),
  (last_insert_rowid(), 10, '备电及双电源', '主备电自动切换正常，蓄电池容量充足，双电源转换开关可靠', 9);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('A10', '电梯轿厢及井道查验单', '设备机房查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '轿厢外观', '轿厢壁板完好无划伤，照明正常，通风良好，操作面板功能完整', 0),
  (last_insert_rowid(), 2, '层门及门锁', '层门开闭灵活无异响，门锁电气触点完好，门缝间隙符合要求', 1),
  (last_insert_rowid(), 3, '平层精度', '轿厢停靠各层站时平层误差在±15mm以内', 2),
  (last_insert_rowid(), 4, '安全触板/光幕', '安全触板或光幕动作灵敏，轿门关闭过程中遇阻即开', 3),
  (last_insert_rowid(), 5, '对讲及报警', '紧急呼叫装置功能正常，与控制室通话清晰，应急灯工作正常', 4),
  (last_insert_rowid(), 6, '限速器及安全钳', '限速器动作速度校验合格，安全钳联动试验可靠', 5),
  (last_insert_rowid(), 7, '导轨及导靴', '导轨安装牢固无变形，导靴磨损量在允许范围内，油杯油量充足', 6),
  (last_insert_rowid(), 8, '补偿装置', '补偿链/补偿绳完好，张紧装置正常，无碰擦异响', 7),
  (last_insert_rowid(), 9, '底坑', '底坑清洁无积水，缓冲器完好，急停开关及照明功能正常', 8),
  (last_insert_rowid(), 10, '井道照明及通风', '井道照明完好，通风孔无堵塞，各层门指示灯工作正常', 9);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('B7', '弱电智能化系统查验单', '公共区域及设施查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '视频监控系统', '摄像机安装牢固，图像清晰无干扰，录像存储正常（≥30天），时间同步准确', 0),
  (last_insert_rowid(), 2, '车辆出入管理', '道闸起落正常，车牌识别准确率≥95%，地感线圈灵敏，收费系统正常', 1),
  (last_insert_rowid(), 3, '人行门禁系统', '刷卡/人脸识别正常，门锁动作可靠，记录可查询，消防联动释放功能正常', 2),
  (last_insert_rowid(), 4, '电子巡更系统', '巡更点安装牢固，读卡正常，巡更路线及计划可在系统中设置', 3),
  (last_insert_rowid(), 5, '楼宇自控（BAS）', 'DDC控制器工作正常，传感器数据准确，执行器动作可靠，中央工作站界面完整', 4),
  (last_insert_rowid(), 6, '综合布线', '机柜安装牢固，配线架标签清晰，线缆绑扎整齐，光纤及网线测试合格', 5),
  (last_insert_rowid(), 7, '能耗计量系统', '电表/水表/气表通讯正常，数据采集完整，能耗报表可生成', 6),
  (last_insert_rowid(), 8, '信息发布系统', 'LED屏/信息屏显示正常，内容更新功能可用，亮度及对比度符合要求', 7);

INSERT INTO inspection_templates (form_id, title, category) VALUES ('B8', '防雷接地系统查验单', '公共区域及设施查验');
INSERT INTO template_items (template_id, item_number, item_name, check_standard, sort_order) VALUES
  (last_insert_rowid(), 1, '接闪器（避雷针/带/网）', '安装牢固无锈蚀，高度及覆盖范围符合设计要求，与引下线连接可靠', 0),
  (last_insert_rowid(), 2, '引下线', '引下线间距符合规范（一类≤12m，二类≤18m），连接方式正确，防腐措施完好', 1),
  (last_insert_rowid(), 3, '接地装置', '接地体埋深符合设计要求，焊接点防腐处理完好，接地电阻≤1Ω（或设计值）', 2),
  (last_insert_rowid(), 4, '等电位连接', '总等电位端子箱安装牢固，各金属管道及设备外壳等电位连接可靠', 3),
  (last_insert_rowid(), 5, '电气设备接地', '配电柜、电机外壳、桥架、金属线管等接地连接完好，接地线截面积符合要求', 4),
  (last_insert_rowid(), 6, '弱电设备防雷', 'SPD浪涌保护器安装正确，状态指示正常，接地线长度及截面积符合要求', 5),
  (last_insert_rowid(), 7, '测试点', '接地测试点设置合理，标识清晰，便于检测', 6),
  (last_insert_rowid(), 8, '防雷检测报告', '具备资质的第三方检测机构出具的防雷检测报告在有效期内', 7);
