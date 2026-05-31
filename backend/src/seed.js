import db from './db.js'
import bcrypt from 'bcryptjs'

export function seed() {
  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as c FROM inspection_templates').get()
  if (existing.c > 0) return

  console.log('Seeding database...')

  // Create default admin user: admin / admin123
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run('admin', hash, '系统管理员', 'admin')

  // Templates and their items
  const templates = [
    {
      form_id: 'A1', title: '变配电室查验单', category: '设备机房查验',
      items: [
        ['变压器', 'Máy biến áp', '运行正常，无异常声响及振动，温控仪指示正常，绕组温度在允许范围内，冷却风扇运转正常', 'Vận hành bình thường, không tiếng ồn bất thường, đồng hồ nhiệt độ chỉ thị bình thường, nhiệt độ cuộn dây trong phạm vi cho phép, quạt làm mát hoạt động bình thường'],
        ['高压开关柜', 'Tủ đóng cắt cao áp', '指示仪表正常，分合闸指示正确，联锁机构可靠，五防功能齐全，柜内清洁无杂物', 'Đồng hồ chỉ thị bình thường, chỉ báo đóng cắt chính xác, cơ cấu liên động tin cậy, đủ 5 chức năng phòng hộ, trong tủ sạch sẽ'],
        ['低压配电柜', 'Tủ phân phối hạ áp', '仪表指示正常，开关操作灵活，接线牢固，相序标识清晰，抽屉式开关推拉顺畅', 'Đồng hồ chỉ thị bình thường, công tắc thao tác linh hoạt, đấu nối chắc chắn, ký hiệu thứ tự pha rõ ràng, công tắc kéo đẩy trơn tru'],
        ['电容补偿柜', 'Tủ bù tụ điện', '功率因数≥0.9，电容器无鼓包、无渗漏、无异常发热，自动投切正常', 'Hệ số công suất ≥0.9, tụ điện không phồng, không rò rỉ, không phát nhiệt bất thường, đóng cắt tự động bình thường'],
        ['直流屏/蓄电池', 'Tủ DC / Ắc quy', '电压正常，电池无鼓包、无漏液，充电模块工作正常，绝缘监测正常', 'Điện áp bình thường, ắc quy không phồng, không rò rỉ, mô-đun sạc hoạt động bình thường, giám sát cách điện bình thường'],
        ['模拟屏/系统图', 'Sơ đồ mô phỏng / Hệ thống', '模拟屏与实际运行方式相符，供配电系统图上墙张贴，一次系统图清晰完整', 'Sơ đồ mô phỏng phù hợp thực tế vận hành, sơ đồ hệ thống cấp điện được dán tường, sơ đồ nhất thứ rõ ràng đầy đủ'],
        ['电缆沟/桥架', 'Máng cáp / Thang cáp', '电缆沟防水完好无积水；电缆敷设在支架上排列整齐；沟盖板完整，电缆挂牌标识清晰', 'Máng cáp chống thấm tốt, không đọng nước; cáp đặt trên giá đỡ, sắp xếp gọn gàng; nắp máng đầy đủ, nhãn cáp rõ ràng'],
        ['接地系统', 'Hệ thống tiếp địa', '接地干线连接可靠，接地电阻符合设计要求（≤4Ω），等电位连接完好，接地标识清晰', 'Tiếp địa chính kết nối chắc chắn, điện trở tiếp địa đạt yêu cầu thiết kế (≤4Ω), liên kết đẳng thế tốt, ký hiệu tiếp địa rõ ràng'],
        ['绝缘安全工具', 'Dụng cụ cách điện an toàn', '绝缘手套、绝缘靴、验电器、接地线、绝缘拉杆等配备齐全，在检定有效期内', 'Găng tay cách điện, ủng cách điện, bút thử điện, dây tiếp địa, sào cách điện... đầy đủ, trong hạn kiểm định, bảo quản đúng quy cách'],
        ['环境与照明', 'Môi trường & Chiếu sáng', '温度＜40℃，湿度＜80%，通风良好；应急照明完好率100%，切换正常；地面铺设防滑地砖', 'Nhiệt độ < 40℃, độ ẩm < 80%, thông gió tốt; Đèn khẩn cấp hoạt động 100%, chuyển mạch bình thường; Nền lát gạch chống trượt'],
        ['消防器材', 'Thiết bị PCCC', '二氧化碳或干粉灭火器配置到位，数量合规，在有效期内；灭火毯、消防沙箱齐全', 'Bình chữa cháy CO2 hoặc bột khô được trang bị đầy đủ, số lượng đúng quy định, trong hạn sử dụng; chăn chữa cháy, thùng cát PCCC đầy đủ'],
        ['防小动物设施', 'Phòng chống động vật nhỏ', '挡鼠板完好（高度≥40cm），纱窗完好无损，电缆进出孔封堵严密', 'Tấm chắn chuột nguyên vẹn (cao ≥40cm), lưới chắn côn trùng nguyên vẹn, lỗ cáp ra vào được bịt kín'],
        ['标识及线路', 'Ký hiệu & Đường dây', '所有线路、开关标识清楚，配电柜前后均有名称编号标识，操作通道畅通', 'Tất cả đường dây, công tắc được ký hiệu rõ ràng, tủ điện có nhãn tên ở mặt trước và sau, lối thao tác thông thoáng']
      ]
    },
    {
      form_id: 'A2', title: '发电机房查验单', category: '设备机房查验',
      items: [
        ['发电机组', 'Tổ máy phát điện', '外观干净整洁，主机及配套设备油漆完好，启动迅速（≤15秒），运行平稳无异常声响', 'Bề ngoài sạch sẽ, sơn máy chính & thiết bị phụ nguyên vẹn, khởi động nhanh (≤15s), vận hành êm không tiếng ồn bất thường'],
        ['蓄电池', 'Ắc quy', '蓄电池完好，电压正常，配备蓄电池充电器，接线牢固无腐蚀', 'Ắc quy nguyên vẹn, điện áp bình thường, có bộ sạc ắc quy, đấu nối chắc chắn không ăn mòn'],
        ['自动转换柜(ATS)', 'Tủ chuyển đổi tự động (ATS)', '自动及手动转换功能正常，切换时间符合设计要求，配备备用蓄电池', 'Chuyển đổi tự động & thủ công bình thường, thời gian chuyển mạch đạt yêu cầu thiết kế, có ắc quy dự phòng, đèn chỉ thị chính xác'],
        ['机油箱及燃油系统', 'Bồn dầu & Hệ thống nhiên liệu', '油箱无渗漏，油位标识清晰可见；油箱房设防爆灯、通风良好；设≥2寸透气弯管', 'Bình nhiên liệu không rò rỉ, chỉ báo mức dầu rõ ràng; Phòng bình nhiên liệu có đèn chống nổ, thông gió tốt; Ống thông hơi ≥ 2 inch'],
        ['燃油储备', 'Dự trữ nhiên liệu', '机油、润滑油配备充分，燃油储备量满足满负荷连续运转≥8小时', 'Dầu máy, dầu bôi trơn đầy đủ, nhiên liệu dự trữ đủ vận hành đầy tải ≥8 giờ (hoặc theo hợp đồng)'],
        ['排烟系统', 'Hệ thống thoát khói', '排烟管保温完好，排烟过滤系统设自动补水装置且有水位标识，取得环保合格证', 'Ống thoát khói cách nhiệt tốt, hệ thống lọc khói có cấp nước tự động & ký hiệu mức nước, thoát khói không ảnh hưởng môi trường xung quanh, có chứng nhận môi trường'],
        ['通风降温', 'Thông gió & Làm mát', '机房通风良好，进/排风口面积足够，风机运转正常', 'Phòng máy thông gió tốt, diện tích cửa gió vào/ra đủ, quạt gió hoạt động bình thường'],
        ['降噪减震', 'Giảm ồn & Giảm chấn', '机组减震垫安装到位，排烟管设消声器，机房墙体及门有隔音措施', 'Đệm giảm chấn tổ máy lắp đúng vị trí, ống thoát khói có bộ tiêu âm, tường & cửa phòng máy có biện pháp cách âm, tiếng ồn đạt yêu cầu môi trường'],
        ['接地与线缆', 'Tiếp địa & Cáp', '发电机组可靠接地，电缆敷设在支架上，排列整齐，挂牌标识清晰', 'Tổ máy phát tiếp địa chắc chắn, cáp đặt trên giá đỡ, sắp xếp gọn gàng, nhãn cáp rõ ràng'],
        ['应急照明', 'Đèn khẩn cấp', '应急灯完好、切换正常，照度满足操作要求', 'Đèn khẩn cấp nguyên vẹn, chuyển mạch bình thường, độ rọi đáp ứng yêu cầu thao tác'],
        ['消防器材', 'Thiết bị PCCC', '灭火器配置到位在有效期内；储油间防火措施到位', 'Bình chữa cháy đủ số lượng, còn hạn sử dụng; Biện pháp PCCC kho nhiên liệu đầy đủ'],
        ['机房环境', 'Môi trường phòng máy', '地面铺设防滑地砖，墙面刷白，无积水无杂物，机房门锁通用', 'Nền lát gạch chống trượt, tường quét vôi trắng, không đọng nước không rác, cửa phòng máy khóa đồng bộ']
      ]
    },
    {
      form_id: 'A3', title: '水泵房及水箱间查验单', category: '设备机房查验',
      items: [
        ['生活水泵', 'Bơm sinh hoạt', '运行平稳、无异常振动及噪音，泵体无渗漏，轴封密封良好，电机温升正常', 'Vận hành êm, không rung động & tiếng ồn bất thường, thân bơm không rò rỉ, phớt trục kín tốt, nhiệt độ động cơ bình thường'],
        ['生活水泵控制柜', 'Tủ điều khiển bơm sinh hoạt', '变频器运行正常，压力设定值正确，自动恒压供水功能正常，手自动切换正常', 'Biến tần hoạt động bình thường, giá trị cài đặt áp suất chính xác, chức năng cấp nước áp lực không đổi tự động bình thường, chuyển mạch tay/tự động bình thường'],
        ['消防主泵', 'Bơm chữa cháy chính', '运行正常，出水压力达标，主泵/备泵自动切换正常', 'Vận hành bình thường, áp lực nước ra đạt tiêu chuẩn, chuyển đổi bơm chính/bơm dự phòng tự động bình thường'],
        ['消防稳压泵', 'Bơm duy trì áp lực PCCC', '启停压力设定正确，无频繁启动现象，气压罐压力正常', 'Cài đặt áp lực bật/tắt đúng, không khởi động thường xuyên, áp lực bình khí nén bình thường'],
        ['消防水泵控制柜', 'Tủ điều khiển bơm PCCC', '手自动切换正常，消防联动反馈信号正确，机械应急启泵功能有效', 'Chuyển mạch tay/tự động bình thường, tín hiệu phản hồi liên động PCCC chính xác, chức năng khởi động bơm cơ khí khẩn cấp hiệu quả'],
        ['生活水箱', 'Bể nước sinh hoạt', '无渗漏，人孔盖密闭加锁，爬梯牢固，液位显示正常，溢流管口设防虫网', 'Không rò rỉ, nắp lỗ thăm kín & có khóa, thang leo chắc chắn, hiển thị mức nước bình thường, ống tràn có lưới chống côn trùng'],
        ['消防水池', 'Bể nước PCCC', '水位正常，补水正常，无渗漏，液位报警装置正常，消防储备水量不得被动用', 'Mực nước bình thường, cấp nước bổ sung bình thường, không rò rỉ, thiết bị báo mức nước hoạt động bình thường, lượng nước dự trữ PCCC không bị sử dụng sai mục đích'],
        ['阀门', 'Van', '启闭灵活，无渗漏，阀杆密封完好，标识清晰挂牌正确', 'Đóng mở linh hoạt, không rò rỉ, phớt ty van nguyên vẹn, nhãn ghi chú rõ ràng đúng'],
        ['压力表/真空表', 'Đồng hồ áp suất / Chân không', '指示正常，在检定有效期内，表盘清晰，安装方向便于观察', 'Chỉ thị bình thường, trong hạn kiểm định, mặt đồng hồ rõ ràng, hướng lắp đặt thuận tiện quan sát'],
        ['管道及支架', 'Ống & Giá đỡ', '管道无锈蚀、无渗漏；支架牢固；按规范刷防锈漆和表面漆；流向标识清晰', 'Đường ống không rỉ sét, không rò rỉ; Giá đỡ chắc chắn; Sơn chống rỉ & sơn phủ đúng quy cách; Mũi tên chỉ hướng dòng chảy rõ ràng'],
        ['排水设施', 'Hệ thống thoát nước', '排水沟畅通，集水井排水泵运行正常，液位自动控制正常，止回阀有效', 'Rãnh thoát nước thông thoáng, bơm thoát nước hố thu hoạt động bình thường, điều khiển mức nước tự động bình thường, van một chiều hiệu quả'],
        ['检修吊钩', 'Móc cẩu bảo trì', '消防泵、生活泵上部安装足够承重的检修用吊钩，承重标识清晰', 'Phía trên bơm PCCC & bơm sinh hoạt có lắp móc cẩu chịu lực đủ tải, nhãn ghi rõ tải trọng'],
        ['通风除湿', 'Thông gió & Hút ẩm', '通风良好，无积水潮湿；地下泵房设机械通风', 'Thông gió tốt, không đọng nước ẩm ướt; Trạm bơm ngầm bố trí thông gió cơ khí'],
        ['应急照明与消防', 'Đèn khẩn cấp & PCCC', '应急照明完好率100%；灭火器配置到位且在有效期内', 'Đèn khẩn cấp hoạt động 100%; bình chữa cháy được trang bị đầy đủ & trong hạn sử dụng'],
        ['二次供水合格证', 'Giấy chứng nhận cấp nước thứ cấp', '二次供水系统具备清洗记录和二次供水合格证', 'Hệ thống cấp nước thứ cấp có nhật ký vệ sinh & Giấy chứng nhận đủ điều kiện']
      ]
    },
    {
      form_id: 'A4', title: '消防控制室查验单', category: '设备机房查验',
      items: [
        ['消防报警主机', 'Tủ trung tâm báo cháy', '运行正常，无故障报警，自检功能正常，报警/故障/联动信号指示清晰，打印机工作正常', 'Hoạt động bình thường, không báo lỗi, chức năng tự kiểm tra bình thường, tín hiệu báo động/sự cố/liên động rõ ràng, máy in hoạt động'],
        ['消防联动控制盘', 'Bàn điều khiển liên động PCCC', '手动/自动切换正常，联动逻辑正确，多线控制盘操作有效', 'Chuyển đổi bằng tay/tự động bình thường, logic liên động đúng, bàn điều khiển đa tuyến hoạt động hiệu quả'],
        ['消防电话主机', 'Tổng đài điện thoại PCCC', '通话清晰，与各分机通话正常，总机可呼叫所有分机', 'Đàm thoại rõ ràng, liên lạc với các máy nhánh bình thường, máy chủ gọi được tất cả máy nhánh'],
        ['消防广播系统', 'Hệ thống loa phát thanh PCCC', '功放正常，话筒播音清晰，分区广播功能正常，消防/背景音乐切换正常', 'Tăng âm bình thường, micro phát rõ ràng, phát thanh phân vùng bình thường, chuyển đổi PCCC/nhạc nền bình thường'],
        ['消防图形显示装置(CRT)', 'Thiết bị hiển thị đồ họa PCCC (CRT)', '显示正确，点位信息完整，报警点位置准确标注，平面图与实际楼层一致', 'Hiển thị chính xác, thông tin điểm đầy đủ, vị trí điểm báo cháy được đánh dấu chính xác, sơ đồ mặt bằng khớp thực tế'],
        ['防火卷帘控制', 'Điều khiển cửa cuốn chống cháy', '手动/联动控制正常，卷帘升降平稳，下降至1.8m后延时下降功能正常', 'Điều khiển bằng tay/liên động bình thường, cuốn lên xuống êm, chức năng dừng ở 1,8m rồi hạ tiếp hoạt động bình thường'],
        ['烟感/温感', 'Đầu báo khói / Nhiệt', '按规范配置，安装位置合理，报警功能正常（抽检≥10%），无屏蔽点位', 'Lắp đặt đúng quy phạm, vị trí hợp lý, chức năng báo cháy bình thường (kiểm tra ngẫu nhiên ≥10%), không có điểm bị vô hiệu hóa'],
        ['消防指示与疏散', 'Chỉ dẫn PCCC & Thoát hiểm', '消防指引牌数量及安装位置符合规范，疏散指示标志完好', 'Biển chỉ dẫn PCCC đủ số lượng & vị trí đúng quy chuẩn, biển báo thoát hiểm nguyên vẹn'],
        ['CO₂/气体灭火系统', 'Hệ thống chữa cháy CO₂ / Khí', '气瓶压力正常、在有效期内，控制系统完善可靠，报警信号传至消防主机', 'Áp lực bình khí bình thường, còn hạn kiểm định, hệ thống điều khiển hoàn chỉnh đáng tin cậy, tín hiệu báo động truyền về tủ trung tâm PCCC'],
        ['消防栓/灭火器', 'Trụ cứu hỏa / Bình chữa cháy', '消防栓安装牢固、阀门不渗漏；灭火器材按规范配置齐全、在有效期内', 'Họng cứu hỏa lắp chắc chắn, van không rò rỉ; Bình chữa cháy đủ số lượng đúng quy chuẩn, còn hạn sử dụng'],
        ['UPS不间断电源', 'UPS - Bộ lưu điện', '切换正常，续航时间≥30分钟，电池无老化', 'Chuyển mạch bình thường, thời gian lưu điện ≥ 30 phút, ắc quy không lão hóa'],
        ['环境与照明', 'Môi trường & Chiếu sáng', '温度＜30℃，通风/空调正常；防静电地板完好接地可靠；应急照明完好率100%', 'Nhiệt độ < 30℃, thông gió/điều hòa bình thường; Sàn chống tĩnh điện nguyên vẹn tiếp địa tin cậy; Đèn khẩn cấp hoạt động 100%'],
        ['排烟/防烟控制', 'Điều khiển hút khói / Ngăn khói', '正压送风机、排烟风机远程启动正常，280℃防火阀信号反馈正常', 'Quạt tăng áp cầu thang & quạt hút khói khởi động từ xa bình thường, tín hiệu phản hồi van chống cháy 280°C bình thường']
      ]
    },
    {
      form_id: 'A5', title: '电梯机房查验单', category: '设备机房查验',
      items: [
        ['机房通道与门锁', 'Lối vào & Khóa cửa phòng máy', '机房通道畅通无杂物；机房门锁通用，门外设警示标识', 'Lối vào phòng máy thông thoáng không vướng vật cản; Cửa phòng máy khóa đồng bộ, ngoài cửa có biển cảnh báo'],
        ['曳引机', 'Máy kéo', '运行平稳无异常振动及噪音，润滑油位正常，减速箱无渗漏，制动器动作灵活可靠', 'Vận hành êm không rung động & tiếng ồn bất thường, mức dầu bôi trơn bình thường, hộp giảm tốc không rò rỉ, phanh hoạt động linh hoạt tin cậy'],
        ['控制屏柜', 'Tủ điều khiển', '运行参数指示正常，变频器工作正常，接线整齐牢固，柜内清洁', 'Hiển thị thông số vận hành bình thường, biến tần hoạt động bình thường, đấu nối ngay ngắn chắc chắn, trong tủ sạch sẽ'],
        ['钢丝绳', 'Cáp thép', '标识清晰，无断丝断股严重磨损或锈蚀，张力均匀，绳头组合牢固', 'Nhãn rõ ràng, không đứt sợi bong bện mòn nặng hoặc rỉ sét, lực căng đều, đầu cáp liên kết chắc chắn'],
        ['限速器', 'Bộ hạn chế tốc độ', '动作正常，封记完好，在检定有效期内，联动试验功能正常', 'Hoạt động bình thường, niêm phong nguyên vẹn, trong hạn kiểm định, chức năng thử nghiệm liên động bình thường'],
        ['层门联锁', 'Khóa liên động cửa tầng', '各层层门电气联锁有效，层门自闭功能正常', 'Khóa liên động điện các tầng hiệu quả, chức năng tự đóng cửa tầng bình thường'],
        ['轿厢', 'Ca-bin', '无划伤，通风照明完好，紧急照明有效，对讲/报警装置与值班室通话清晰', 'Không trầy xước, thông gió chiếu sáng tốt, đèn khẩn cấp hoạt động, thiết bị đàm thoại/báo động liên lạc rõ với phòng trực'],
        ['超载装置', 'Thiết bị chống quá tải', '超载保护功能正常，超载时声光报警正确，电梯不能关门启动', 'Chức năng chống quá tải bình thường, khi quá tải báo động âm thanh & ánh sáng chính xác, thang máy không thể đóng cửa khởi động'],
        ['底坑', 'Hố thang', '底坑平整整洁，无积水渗漏，排水系统有效，急停开关及照明有效', 'Hố thang phẳng sạch, không đọng nước rò rỉ, hệ thống bơm thoát nước hiệu quả, công tắc dừng khẩn cấp & đèn chiếu sáng hoạt động'],
        ['通风降温', 'Thông gió & Làm mát', '机房通风降温设备正常，环境温度5~40℃，设百叶窗通风', 'Thiết bị thông gió làm mát phòng máy bình thường, nhiệt độ môi trường 5~40℃, bố trí cửa gió lá sách'],
        ['应急照明及消防', 'Đèn khẩn cấp & PCCC', '应急灯完好；灭火器配置到位且在有效期内', 'Đèn khẩn cấp nguyên vẹn; bình chữa cháy được trang bị đầy đủ & trong hạn sử dụng'],
        ['文件与标识', 'Tài liệu & Ký hiệu', '电梯准用证/合格证在有效期内，救援标识张贴清晰，机房内悬挂操作规程', 'Giấy phép sử dụng / Chứng nhận an toàn thang máy còn hạn, biển hướng dẫn cứu hộ dán rõ ràng, trong phòng máy treo quy trình vận hành']
      ]
    },
    {
      form_id: 'B1', title: '监控室及安防系统查验单', category: '公共区域及设施查验',
      items: [
        ['监视器/显示器', 'Màn hình giám sát', '图像清晰、色彩正常、无坏点，分割显示功能正常，轮巡切换正常', 'Hình ảnh rõ nét, màu sắc bình thường, không điểm chết, chức năng chia màn hình bình thường, chuyển đổi tuần tra bình thường'],
        ['硬盘录像机(NVR/DVR)', 'Đầu ghi hình (NVR/DVR)', '录像存储容量满足连续录像≥30天，回放功能正常，时间同步准确', 'Dung lượng lưu trữ đáp ứng ghi hình liên tục ≥ 30 ngày, chức năng phát lại bình thường, đồng bộ thời gian chính xác'],
        ['摄像头', 'Camera', '全部摄像头图像清晰稳定（白天/夜间），覆盖范围无死角，安装牢固', 'Tất cả camera hình ảnh rõ nét ổn định (ngày/đêm), phạm vi bao phủ không góc chết, lắp đặt chắc chắn'],
        ['UPS不间断电源', 'UPS - Bộ lưu điện', '切换正常，续航时间≥30分钟，电池无老化', 'Chuyển mạch bình thường, thời gian lưu điện ≥ 30 phút, ắc quy không lão hóa'],
        ['门禁系统', 'Hệ thống kiểm soát truy cập', '读卡器、电控锁工作正常，门禁控制器通讯正常，消防联动开门功能有效', 'Đầu đọc thẻ, khóa điện hoạt động bình thường, bộ điều khiển cửa truyền thông bình thường, chức năng mở cửa liên động PCCC hiệu quả'],
        ['周界报警系统', 'Hệ thống báo động vành đai', '红外对射/电子围栏安装完好，报警信号传至监控中心，与监控联动功能正常', 'Hồng ngoại đối xạ/hàng rào điện tử lắp đặt nguyên vẹn, tín hiệu báo động truyền về trung tâm giám sát, chức năng liên động với giám sát bình thường'],
        ['系统软件', 'Phần mềm hệ thống', '系统软件设置进入密码，具备操作员权限等级功能；已备份安装软件一套', 'Phần mềm hệ thống có đặt mật khẩu, có chức năng phân quyền người vận hành; đã sao lưu 01 bộ phần mềm cài đặt'],
        ['防静电地板', 'Sàn chống tĩnh điện', '完好、接地可靠，无破损翘起', 'Nguyên vẹn, tiếp địa tin cậy, không hư hỏng bong tróc'],
        ['空调/通风', 'Điều hòa / Thông gió', '温度＜30℃，通风良好，空调运行正常', 'Nhiệt độ < 30℃, thông gió tốt, điều hòa hoạt động bình thường'],
        ['应急照明及消防', 'Đèn khẩn cấp & PCCC', '应急照明完好率100%；灭火器配置到位且在有效期内', 'Đèn khẩn cấp hoạt động 100%; bình chữa cháy được trang bị đầy đủ & trong hạn sử dụng']
      ]
    },
    {
      form_id: 'B2', title: '园区道路及停车场查验单', category: '公共区域及设施查验',
      items: [
        ['主干道', 'Đường chính', '路面平整、无坑洼、无大面积裂缝，混凝土路面无起砂脱皮，标线清晰完好', 'Mặt đường bằng phẳng, không ổ gà, không nứt diện rộng, mặt bê tông không bong tróc, vạch kẻ đường rõ ràng nguyên vẹn'],
        ['支路/人行道', 'Đường nhánh / Vỉa hè', '铺装完好、无松动翘起，路面砖为防滑砖，平整无积水', 'Lát nền nguyên vẹn, không lỏng lẻo bong tróc, gạch lát nền là gạch chống trượt, bằng phẳng không đọng nước'],
        ['减速坡', 'Gờ giảm tốc', '主要道路设置减速坡，安装牢固、高度符合规范', 'Đường chính có gờ giảm tốc, lắp đặt chắc chắn, chiều cao đúng quy chuẩn'],
        ['停车场地面', 'Mặt sân bãi đỗ xe', '平整、不反砂、无破损，划线清晰，车位编号标识清楚', 'Bằng phẳng, không bong cát, không hư hỏng, vạch kẻ rõ ràng, số hiệu chỗ đỗ xe rõ ràng'],
        ['停车设施', 'Tiện ích bãi đỗ xe', '车位划线规范，导向标识清晰，挡车器完好，反光镜配置到位，监控镜头覆盖', 'Vạch kẻ chỗ đỗ xe đúng quy cách, biển chỉ dẫn rõ ràng, chặn bánh xe nguyên vẹn, gương cầu lồi được lắp đặt đầy đủ, camera giám sát bao phủ'],
        ['排水系统', 'Hệ thống thoát nước', '雨水井、排水沟畅通无堵塞，沟盖板完好无破损，重型车道井盖具有防震功能', 'Hố ga thu nước mưa, rãnh thoát nước thông thoáng không tắc, nắp rãnh nguyên vẹn, nắp hố ga đường xe nặng có chức năng chống rung'],
        ['道路照明', 'Đèn đường', '路灯安装牢固、灯杆垂直，照明覆盖全面，开关控制正常，灯具完好率≥98%', 'Đèn đường lắp đặt chắc chắn, cột đèn thẳng đứng, chiếu sáng bao phủ toàn diện, điều khiển đóng ngắt bình thường, tỷ lệ đèn nguyên vẹn ≥98%'],
        ['道路与绿化隔离', 'Phân cách đường & Cây xanh', '道路与绿化带隔离完好，路缘石无破损', 'Phân cách đường & dải cây xanh nguyên vẹn, bó vỉa không hư hỏng']
      ]
    },
    {
      form_id: 'B3', title: '绿化景观查验单', category: '公共区域及设施查验',
      items: [
        ['乔木', 'Cây thân gỗ', '成活率≥95%，无明显病虫害，支撑牢固，树形完整，无枯死枝干', 'Tỷ lệ sống ≥95%, không sâu bệnh rõ rệt, cọc chống chắc chắn, tán cây nguyên vẹn, không cành khô chết'],
        ['灌木/绿篱', 'Cây bụi / Hàng rào xanh', '生长良好、无大面积枯黄，修剪整齐，无严重病虫害', 'Sinh trưởng tốt, không vàng úa diện rộng, cắt tỉa gọn gàng, không sâu bệnh nghiêm trọng'],
        ['草坪', 'Thảm cỏ', '覆盖良好、无明显斑秃，无大面积枯黄或杂草丛生', 'Che phủ tốt, không trơ trụi rõ rệt, không vàng úa diện rộng hoặc cỏ dại mọc um tùm'],
        ['灌溉系统', 'Hệ thống tưới', '喷头完好、角度正确，阀门启闭正常、无跑冒滴漏，定时控制器工作正常', 'Đầu phun nguyên vẹn, góc phun đúng, van đóng mở bình thường không rò rỉ, bộ hẹn giờ hoạt động bình thường'],
        ['花池/花槽/花盆', 'Bồn hoa / Chậu hoa', '排水畅通不积水，土壤无板结，花池结构完好无破损', 'Thoát nước thông thoáng không đọng, đất không nén chặt, kết cấu bồn hoa nguyên vẹn không hư hỏng'],
        ['景观小品', 'Tiểu cảnh', '座椅、花坛、雕塑完好无破损，安装牢固，表面清洁', 'Ghế, bồn hoa, tượng nguyên vẹn không hư hỏng, lắp đặt chắc chắn, bề mặt sạch sẽ'],
        ['信息栏/标识牌', 'Bảng thông tin / Biển chỉ dẫn', '小区平面位置图设置合理，植物铭牌完整', 'Sơ đồ mặt bằng khu vực được bố trí hợp lý, nhãn tên cây trồng đầy đủ']
      ]
    },
    {
      form_id: 'B4', title: '围墙及大门查验单', category: '公共区域及设施查验',
      items: [
        ['围墙结构', 'Kết cấu tường rào', '结构牢固、无倾斜、无裂缝，墙面完好无破损，粉饰平整颜色一致', 'Kết cấu vững chắc, không nghiêng, không nứt, mặt tường nguyên vẹn, sơn phẳng đồng màu'],
        ['围栏/护墙', 'Hàng rào / Tường chắn', '安装牢固，焊点平滑，无脱漆、锈蚀、变形', 'Lắp đặt chắc chắn, mối hàn nhẵn, không bong sơn, gỉ sét, biến dạng'],
        ['主入口大门', 'Cổng chính', '启闭灵活无卡阻，门体无变形锈蚀，门禁联动正常，油漆光滑无色差', 'Đóng mở linh hoạt không kẹt, thân cổng không biến dạng rỉ sét, liên động kiểm soát vào ra bình thường, sơn mịn đều màu'],
        ['侧门/消防通道门', 'Cổng phụ / Cổng PCCC', '完好无损坏，开启方向正确，无堵塞锁闭，紧急时可从内方便开启', 'Nguyên vẹn không hư hỏng, chiều mở đúng, không bị chặn khóa, khi khẩn cấp mở được dễ dàng từ bên trong'],
        ['门卫室/岗亭', 'Phòng bảo vệ / Chốt gác', '面积满足需求，水电到位，通讯网络正常，视野开阔', 'Diện tích đáp ứng nhu cầu, điện nước đầy đủ, mạng viễn thông bình thường, tầm nhìn thoáng'],
        ['防爬/防盗设施', 'Thiết bị chống trèo / Chống trộm', '围墙顶部防爬刺/铁丝网完好，监控覆盖围墙周边', 'Hàng rào chống trèo/dây thép gai trên đỉnh tường nguyên vẹn, camera giám sát bao phủ xung quanh tường rào']
      ]
    },
    {
      form_id: 'B5', title: '物业用房查验单', category: '公共区域及设施查验',
      items: [
        ['面积', 'Diện tích', '符合合同约定面积，功能分区合理', 'Diện tích đúng hợp đồng, phân khu chức năng hợp lý'],
        ['墙面/地面/天花', 'Tường / Sàn / Trần', '墙面平整无裂缝渗水，地面平整不反砂，天花无渗漏痕迹，涂料均匀', 'Tường phẳng không nứt thấm nước, sàn phẳng không bong cát, trần không dấu vết thấm dột, sơn đều'],
        ['门窗', 'Cửa & Cửa sổ', '门窗完好、启闭灵活、锁具正常，玻璃无破损，密封条完好', 'Cửa & cửa sổ nguyên vẹn, đóng mở linh hoạt, khóa bình thường, kính không vỡ, gioăng cao su nguyên vẹn'],
        ['供水', 'Cấp nước', '自来水接通，水龙头完好，排水畅通', 'Nước máy đã đấu nối, vòi nước nguyên vẹn, thoát nước thông thoáng'],
        ['供电', 'Cấp điện', '电力接通，配电箱完好，开关插座通电正常，照明灯具正常', 'Điện đã đấu nối, tủ điện nguyên vẹn, công tắc ổ cắm có điện bình thường, đèn chiếu sáng bình thường'],
        ['通风/空调', 'Thông gió / Điều hòa', '自然通风良好，空调预留孔/室外机平台合规；地下用房有通风装置', 'Thông gió tự nhiên tốt, lỗ chờ điều hòa/sàn đặt dàn nóng đúng quy cách; Phòng ngầm có thiết bị thông gió'],
        ['通讯/网络', 'Liên lạc / Mạng', '电话线/网线接口到位，信号正常', 'Cổng điện thoại/mạng đã lắp đặt, tín hiệu bình thường'],
        ['消防', 'PCCC', '灭火器配置到位，疏散指示标志完好', 'Bình chữa cháy đầy đủ, biển báo thoát hiểm nguyên vẹn'],
        ['卫生设施', 'Thiết bị vệ sinh', '卫生间/洗手间设施完好，上下水通畅', 'Thiết bị vệ sinh / nhà tắm nguyên vẹn, cấp thoát nước thông suốt'],
        ['排烟/排水', 'Thoát khói / Thoát nước', '食堂有排烟排水设施；保洁工具间给排水到位通风良好', 'Nhà ăn có hệ thống hút khói & thoát nước; Phòng dụng cụ vệ sinh cấp thoát nước đầy đủ thông gió tốt']
      ]
    },
    {
      form_id: 'B6', title: '给排水外网及消防管网查验单', category: '公共区域及设施查验',
      items: [
        ['供水管网', 'Mạng lưới cấp nước', '管道安装垂直，固定牢固；供水总阀开关正常无渗漏；水表完好无损伤', 'Đường ống lắp thẳng đứng, cố định chắc chắn; Van tổng cấp nước hoạt động bình thường không rò rỉ; Đồng hồ nước nguyên vẹn'],
        ['排水管网', 'Mạng lưới thoát nước', '排水畅通无堵塞，检查井无淤积，井盖完好标识清晰，排水坡度正确', 'Thoát nước thông thoáng không tắc nghẽn, hố ga không bồi lắng, nắp hố ga nguyên vẹn ký hiệu rõ ràng, độ dốc thoát nước chính xác'],
        ['雨水系统', 'Hệ thống nước mưa', '雨水口/雨水井无堵塞，雨水管完好，天面/路面排水顺畅不积水', 'Cửa thu nước mưa/hố ga nước mưa không tắc, ống nước mưa nguyên vẹn, thoát nước mái/mặt đường thông suốt không đọng'],
        ['污水系统', 'Hệ thống nước thải', '污水管道畅通，化粪池无渗漏、通气正常，污水处理设施运行正常', 'Ống nước thải thông suốt, bể tự hoại không rò rỉ, thông hơi bình thường, thiết bị xử lý nước thải hoạt động bình thường'],
        ['室外消火栓', 'Trụ cứu hỏa ngoài trời', '安装牢固、阀门启闭灵活无渗漏，水压水量满足消防要求', 'Lắp chắc chắn, van đóng mở linh hoạt không rò rỉ, áp lực & lưu lượng đáp ứng yêu cầu PCCC'],
        ['室内消火栓', 'Trụ cứu hỏa trong nhà', '安装牢固、阀门不渗漏、锁扣无损坏，水带水枪齐全，箱体完好', 'Lắp chắc chắn, van không rò rỉ, khóa không hư hỏng, dây cứu hỏa & lăng phun đầy đủ, tủ nguyên vẹn'],
        ['喷淋系统', 'Hệ thống Sprinkler', '喷头安装牢固方向正确，末端试水装置正常，水力警铃正常', 'Đầu phun lắp chắc chắn đúng hướng, thiết bị thử nước cuối tuyến bình thường, chuông báo động thủy lực bình thường'],
        ['管网标识', 'Ký hiệu mạng lưới ống', '各类管网有功能标识及流向箭头，各阀门有控制范围标识挂牌', 'Các loại mạng lưới ống có ký hiệu chức năng & mũi tên hướng dòng chảy, các van có nhãn ghi rõ phạm vi kiểm soát'],
        ['自动排气阀', 'Van xả khí tự động', '消防栓系统在最高位置设置自动排气设备，功能正常', 'Hệ thống trụ cứu hỏa có lắp thiết bị xả khí tự động ở vị trí cao nhất, chức năng bình thường'],
        ['试验消火栓', 'Trụ cứu hỏa thử nghiệm', '天台设置试验消火栓，功能正常', 'Trên mái có lắp trụ cứu hỏa thử nghiệm, chức năng bình thường'],
        ['管道防腐', 'Chống ăn mòn đường ống', '明装管道按规范刷防锈漆和表面漆，支架无锈蚀', 'Đường ống lắp nổi sơn chống rỉ & sơn phủ đúng quy cách, giá đỡ không rỉ sét']
      ]
    },
    {
      form_id: 'B9', title: '室外基础设施及环卫工程查验单', category: '公共区域及设施查验',
      items: [
        ['公共照明系统', 'Hệ thống chiếu sáng công cộng', '庭院灯、景观灯、壁灯等灯具外观完好，灯杆垂直无锈蚀，灯具安装牢固，照度满足设计要求，定时/光控开关正常，线路绝缘良好无裸露', 'Đèn sân vườn, đèn cảnh quan, đèn tường nguyên vẹn, cột đèn thẳng đứng không rỉ sét, đèn lắp chắc chắn, độ rọi đạt yêu cầu thiết kế, công tắc hẹn giờ/cảm biến ánh sáng hoạt động bình thường, dây dẫn cách điện tốt không hở'],
        ['路灯及高杆灯', 'Đèn đường & đèn cột cao', '灯杆基础牢固无松动倾斜，灯杆防腐层完好，灯具及整流器功能正常，检修门锁完好，接地保护有效', 'Móng cột đèn chắc chắn không lỏng nghiêng, lớp chống rỉ cột đèn nguyên vẹn, đèn & chấn lưu hoạt động bình thường, cửa kiểm tra khóa tốt, tiếp địa bảo vệ hiệu quả'],
        ['检查井', 'Hố ga kiểm tra', '井盖完好无破损缺失，井圈与路面平齐，井内壁抹灰平整无脱落，井底无淤积，爬梯牢固无锈蚀，井内无杂物堵塞，防坠网安装到位', 'Nắp hố ga nguyên vẹn không vỡ thiếu, miệng hố ga bằng mặt đường, trát trong thành hố phẳng không bong, đáy hố không lắng cặn, thang bám chắc không rỉ, trong hố không rác tắc, lưới chống rơi lắp đầy đủ'],
        ['化粪池', 'Bể tự hoại', '池体结构完好无渗漏，进出口管道通畅，清掏口盖板完好牢固，通气管道畅通，池内无明显板结或堵塞，最近一次清掏记录齐全', 'Kết cấu bể nguyên vẹn không rò rỉ, đường ống vào ra thông thoáng, nắp miệng múc bùn nguyên vẹn chắc chắn, ống thông hơi thông suốt, trong bể không đóng váng hoặc tắc nghẽn, hồ sơ lần hút bùn gần nhất đầy đủ'],
        ['污水处理工程', 'Công trình xử lý nước thải', '处理设备外观完好无锈蚀，曝气/搅拌装置运行正常，加药系统功能正常，出水水质目测清澈无恶臭，在线监测仪表显示正常，备用设备可切换', 'Thiết bị xử lý bề ngoài nguyên vẹn không rỉ sét, thiết bị sục khí/khuấy trộn chạy bình thường, hệ thống định lượng hóa chất hoạt động bình thường, nước sau xử lý quan sát trong không mùi hôi, đồng hồ giám sát online chỉ thị bình thường, thiết bị dự phòng chuyển đổi được'],
        ['污水提升泵站', 'Trạm bơm nước thải', '水泵运行正常无异响振动，控制柜功能正常液位控制准确，备用泵自动切换正常，集水池无大量浮渣，格栅完好无堵塞，通风除臭装置有效', 'Bơm chạy bình thường không ồn rung, tủ điều khiển hoạt động tốt kiểm soát mức nước chính xác, bơm dự phòng tự động chuyển đổi bình thường, bể thu gom không nhiều váng nổi, song chắn rác nguyên vẹn không tắc, thiết bị thông gió khử mùi hiệu quả'],
        ['垃圾集中点/中转站', 'Điểm tập kết / Trạm trung chuyển rác', '地面硬化平整有排水坡度，冲洗龙头及排水地漏完好，照明及通风正常，围挡/围墙完好无破损，分类垃圾桶/箱配置齐全，无渗滤液外溢无异味扩散，灭蝇除臭设施正常运行', 'Nền bê tông phẳng có độ dốc thoát nước, vòi rửa & phễu thu nước hoạt động tốt, chiếu sáng & thông gió bình thường, tường rào/vách ngăn nguyên vẹn, thùng/thùng rác phân loại đầy đủ, không rò rỉ nước rỉ rác không lan mùi hôi, thiết bị diệt ruồi khử mùi hoạt động bình thường'],
        ['排水沟及雨水口', 'Rãnh thoát nước & miệng thu nước mưa', '排水沟砌筑完好无坍塌堵塞，沟盖板/雨水箅子完整无缺失，沟内无淤积杂物，排水坡度满足设计要求，接入市政管网处无倒灌', 'Rãnh thoát nước xây nguyên vẹn không sập tắc, tấm đậy rãnh/song chắn rác nguyên vẹn không thiếu, trong rãnh không lắng rác, độ dốc thoát nước đáp ứng thiết kế, chỗ đấu nối mạng lưới thoát nước đô thị không chảy ngược']
      ]
    },
    {
      form_id: 'C1', title: '室内土建部分查验单', category: '室内专有部分查验',
      items: [
        ['地面', 'Sàn', '水泥地面平整颜色均匀无空鼓裂缝脱皮起砂。瓷砖铺贴平整对缝整齐无空鼓开裂。地漏口低于周边0.5cm收边圆滑', 'Nền xi măng phẳng đều màu không bong rỗng nứt tróc cát. Gạch men lát phẳng khít mạch không bong rỗng nứt. Miệng thu nước thấp hơn mặt nền 0,5cm viền gọn mịn'],
        ['墙面', 'Tường', '水泥砂浆墙面平整无空鼓裂缝。乳胶漆墙面无裂缝污损返碱光感均匀。瓷片铺贴平整对缝整齐勾缝饱满均匀', 'Tường vữa xi măng phẳng không bong nứt. Tường sơn latex không nứt ố bẩn ố kiềm đều màu. Gạch men ốp tường phẳng khít mạch chà ron đầy đều'],
        ['天花/顶棚', 'Trần nhà', '毛坯天花平整无空鼓裂缝。乳胶漆天花无裂缝污损返碱。吊顶安装牢固平整线脚顺直。阴角线清晰顺直无缺损', 'Trần thô phẳng không bong rỗng nứt. Trần sơn latex không nứt ố bẩn ố kiềm. Trần thạch cao lắp chắc phẳng chỉ thẳng. Đường góc trong rõ thẳng không khuyết'],
        ['入户门', 'Cửa chính', '门扇开关平稳无噪音与门框垂直平整密合无变形。门锁灵活五金齐全。油漆润泽无色差无刮花', 'Cánh cửa đóng mở êm không ồn vuông góc với khung phẳng khít không biến dạng. Khóa linh hoạt phụ kiện đầy đủ. Sơn bóng đều màu không xước'],
        ['窗户', 'Cửa sổ', '玻璃完好无气泡波纹打胶均匀胶条无缺损。开启灵活密封条完好。窗框无变形锈蚀不渗漏', 'Kính nguyên vẹn không bọt sóng keo đều gioăng không thiếu. Đóng mở linh hoạt gioăng kín nguyên vẹn. Khung cửa sổ không biến dạng rỉ sét không thấm'],
        ['预留孔', 'Lỗ chừa sẵn', '空调抽油烟机热水器预留孔无遗漏位置合理。孔口内高外低倾斜约10°无阻隔收边平整圆滑', 'Lỗ chờ điều hòa, máy hút mùi, bình nước nóng không thiếu vị trí hợp lý. Miệng lỗ trong cao ngoài thấp dốc ~10° không cản trở viền phẳng mịn'],
        ['预留接口', 'Đầu nối chừa sẵn', '冷热水管煤气管空调冷凝水管预留接口位置正确高度合理。冷凝水管顺水三通灌水检验不渗漏', 'Đầu chờ ống nước nóng lạnh, ống gas, ống nước ngưng điều hòa vị trí đúng độ cao hợp lý. Ống nước ngưng dốc về phía thoát nước, Tê thu nước thử nước không rò rỉ'],
        ['阳台护栏/拦板', 'Lan can / Tay vịn ban công', '连接牢固焊点平滑与墙面连接处平整美观。油漆均匀饱满无色差龟裂脱皮', 'Liên kết chắc chắn mối hàn nhẵn chỗ tiếp giáp tường phẳng đẹp. Sơn đều đầy không lệch màu nứt bong'],
        ['楼梯', 'Cầu thang', '踏步及扶手稳固油漆均匀光滑无锈蚀。踏步高度宽度偏差≤15mm防滑地砖无损坏', 'Bậc thang & tay vịn chắc chắn sơn đều nhẵn không rỉ sét. Sai số chiều cao rộng bậc ≤ 15mm gạch chống trượt không hư hỏng'],
        ['室内清洁', 'Vệ sinh trong nhà', '室内卫生达到物业清房标准：无建筑垃圾残留，地面墙面清洁', 'Vệ sinh trong nhà đạt tiêu chuẩn dọn phòng: không còn rác xây dựng, sàn tường sạch sẽ']
      ]
    },
    {
      form_id: 'C2', title: '室内给排水设施查验单', category: '室内专有部分查验',
      items: [
        ['给水分户总阀', 'Van tổng cấp nước', '开关正常、操作灵活自如、无渗漏，位置设置合理便于操作', 'Công tắc bình thường, thao tác linh hoạt, không rò rỉ, vị trí đặt hợp lý thuận tiện thao tác'],
        ['水表', 'Đồng hồ nước', '外观无损伤，安装牢固，读数清晰，接头无渗漏', 'Bề ngoài không hư hỏng, lắp đặt chắc chắn, số đọc rõ ràng, mối nối không rò rỉ'],
        ['给水管道', 'Ống cấp nước', '管道安装牢固无渗漏管卡间距合理；明装管道有标识；水压满足正常使用', 'Đường ống lắp chắc chắn không rò rỉ, khoảng cách kẹp ống hợp lý; Ống lắp nổi có nhãn; Áp lực nước đáp ứng nhu cầu'],
        ['排水管道', 'Ống thoát nước', '排水畅通无堵塞，管道接口无渗漏，存水弯完好，无反臭现象', 'Thoát nước thông suốt không tắc, mối nối ống không rò rỉ, bẫy nước nguyên vẹn, không mùi hôi ngược'],
        ['地漏', 'Lưới thu nước sàn', '地漏位置合理排水顺畅周边收边圆滑；厨卫和阳台地面有坡向地漏不积水', 'Vị trí thu nước sàn hợp lý thoát tốt viền quanh mịn; Nền bếp, WC & ban công dốc về phía thu nước không đọng'],
        ['卫生洁具', 'Thiết bị vệ sinh', '洗手盆/座便器安装牢固表面完好无破损脱瓷；存水弯无渗漏排水畅通有吸力', 'Chậu rửa / Bồn cầu lắp chắc bề mặt nguyên vẹn không vỡ tróc men; Bẫy nước không rò rỉ thoát tốt có lực hút'],
        ['水龙头/花洒', 'Vòi nước / Sen tắm', '安装牢固端正开关自如表面无损伤锈蚀；出水流速及水量正常无滴漏现象', 'Lắp chắc ngay ngắn đóng mở dễ dàng bề mặt không hư hỏng rỉ sét; Lưu lượng & tốc độ nước ra bình thường không nhỏ giọt'],
        ['台面/地柜', 'Mặt bàn / Tủ bếp', '台面方正无破损污迹周边打胶饱满均匀；台面与洗手盆结合处打胶无渗漏', 'Mặt đá phẳng vuông không vỡ ố bẩn keo viền đầy đều; Chỗ tiếp giáp đá & chậu rửa keo kín không rò rỉ'],
        ['厨房设备', 'Thiết bị nhà bếp', '橱柜安装牢固配件齐全台面平整光亮；洗菜盆闭水器启闭灵活不渗漏排水畅通', 'Tủ bếp lắp chắc phụ kiện đầy đủ mặt bếp phẳng bóng; Nút chặn chậu rửa đóng mở linh hoạt không rò rỉ thoát nước tốt'],
        ['通风排气', 'Thông gió & Hút mùi', '排气风机逆风阀动作自如，排气管连接紧密无漏风', 'Quạt hút gió & van một chiều hoạt động tốt, ống thoát gió nối kín không lọt gió'],
        ['煤气/燃气', 'Khí đốt / Gas', '煤气管道安装平直牢固穿墙处封堵完好；分户总阀开关正常接口密封好无泄漏', 'Đường ống gas lắp thẳng chắc chắn chỗ xuyên tường bịt kín; Van tổng từng hộ đóng mở bình thường mối nối kín không rò rỉ']
      ]
    },
    {
      form_id: 'C3', title: '室内电气设施查验单', category: '室内专有部分查验',
      items: [
        ['配电箱', 'Tủ điện', '安装牢固位置合理箱体完好无锈蚀；箱内布线整齐接线牢固；回路标识清楚；漏电保护测试正常', 'Lắp chắc vị trí hợp lý vỏ tủ nguyên vẹn không rỉ sét; Đấu nối trong tủ gọn gàng chắc chắn; Nhãn mạch điện rõ ràng; Kiểm tra chống giật bình thường'],
        ['照明灯具', 'Đèn chiếu sáng', '灯具安装牢固无松动表面整洁完好；开关控制正常；灯泡/灯管完好规格型号正确', 'Đèn lắp chắc không lỏng bề mặt sạch nguyên vẹn; Công tắc điều khiển bình thường; Bóng đèn/ống đèn nguyên vẹn đúng chủng loại'],
        ['开关', 'Công tắc', '安装位置合理牢固面板完好无破损操作顺畅，各开关对应灯具正确', 'Vị trí lắp hợp lý chắc chắn mặt công tắc nguyên vẹn thao tác thuận tiện, các công tắc tương ứng đúng đèn'],
        ['插座', 'Ổ cắm', '安装牢固位置合理面板完好；通电正常，相线零线地线接线正确', 'Lắp chắc vị trí hợp lý mặt ổ nguyên vẹn; Có điện bình thường, dây pha dây trung tính dây tiếp địa đấu đúng'],
        ['空调插座', 'Ổ cắm điều hòa', '空调专用插座额定电流满足设备要求（≥15A），位置与空调预留孔室外机平台对应', 'Ổ cắm riêng cho điều hòa dòng định mức đáp ứng yêu cầu thiết bị (≥ 15A), vị trí tương ứng lỗ chờ & sàn đặt dàn nóng'],
        ['弱电接口', 'Cổng tín hiệu yếu', '电视电话网络接口位置合理安装牢固信号正常', 'Cổng TV, điện thoại, mạng vị trí hợp lý lắp chắc tín hiệu bình thường'],
        ['门铃/可视对讲', 'Chuông cửa / Video doorphone', '位置合理安装牢固完好无损，可视对讲图像清晰通话正常', 'Vị trí hợp lý lắp chắc nguyên vẹn, màn hình hình ảnh rõ ràng đàm thoại bình thường'],
        ['居家报警系统', 'Hệ thống báo động gia đình', '按设计要求完好无损，紧急按钮有效，报警信号传至监控中心', 'Theo yêu cầu thiết kế nguyên vẹn, nút khẩn cấp hoạt động, tín hiệu báo động truyền về trung tâm giám sát'],
        ['等电位连接', 'Liên kết đẳng thế', '卫生间等电位端子箱完好，连接可靠', 'Hộp đấu đẳng thế trong WC nguyên vẹn, kết nối tin cậy'],
        ['电表', 'Công tơ điện', '每户独立电表，安装牢固，读数清晰，接线正确，铅封完好', 'Mỗi hộ công tơ điện riêng, lắp chắc chắn, số đọc rõ ràng, đấu nối chính xác, niêm phong chì nguyên vẹn']
      ]
    },
    {
      form_id: 'C4', title: '可租房源（厂房/办公）查验单', category: '室内专有部分查验',
      items: [
        ['卷帘门/工业门', 'Cửa cuốn / Cửa công nghiệp', '门体无变形锈蚀，升降平稳无卡阻；手动/电动操作正常；限位器工作正常；密封条完好', 'Thân cửa không biến dạng rỉ sét, nâng hạ êm không kẹt; Vận hành tay/điện bình thường; Công tắc hành trình hoạt động bình thường; Gioăng kín nguyên vẹn'],
        ['入户门/防火门', 'Cửa chính / Cửa chống cháy', '门扇无变形开关平稳；门锁灵活五金齐全；闭门器力度适中；防火门等级标识清晰', 'Cánh cửa không biến dạng đóng mở êm; Khóa linh hoạt phụ kiện đầy đủ; Tay đẩy hơi lực vừa phải; Nhãn cấp chống cháy rõ ràng'],
        ['室内配电箱', 'Tủ điện trong nhà', '安装牢固箱体完好；总开关容量符合设计；布线整齐接线牢固；漏电保护测试正常；回路标识清楚', 'Lắp chắc vỏ tủ nguyên vẹn; Aptomat tổng công suất đúng thiết kế; Đấu nối gọn chắc; Chống giật test bình thường; Nhãn mạch rõ ràng'],
        ['室内照明', 'Đèn trong nhà', '灯具安装牢固表面整洁；开关控制正常；照度满足使用需求；防爆灯具符合设计要求', 'Đèn lắp chắc bề mặt sạch; Công tắc điều khiển bình thường; Độ rọi đáp ứng nhu cầu; Đèn chống nổ đúng thiết kế'],
        ['开关插座', 'Công tắc & Ổ cắm', '安装牢固位置合理；通电正常接线正确；工业插座类型和防护等级符合设计要求', 'Lắp chắc vị trí hợp lý; Có điện đấu nối đúng; Loại ổ cắm công nghiệp & cấp bảo vệ IP đúng thiết kế'],
        ['地面', 'Sàn', '水泥/环氧地坪平整无空鼓裂缝无起砂脱皮；按设计做耐磨/防静电/防腐处理；排水坡度正确', 'Nền xi măng / epoxy phẳng không bong rỗng nứt bở cát; Xử lý chống mài mòn / chống tĩnh điện / chống ăn mòn theo thiết kế; Độ dốc thoát nước đúng'],
        ['墙面', 'Tường', '平整无裂缝无渗水痕迹；涂料均匀无返碱色差；防火墙/防火分区隔墙符合设计要求', 'Phẳng không nứt không dấu vết thấm nước; Sơn đều không ố kiềm lệch màu; Tường ngăn cháy / vách phân vùng chống cháy đúng thiết kế'],
        ['屋顶/天花', 'Mái / Trần', '无渗漏痕迹天沟排水畅通；屋面板无变形损伤；采光板/通风器完好无破损；保温层完好', 'Không dấu vết thấm máng xối thoát nước tốt; Tấm lợp mái không biến dạng hư hỏng; Tấm lấy sáng / quạt thông gió nguyên vẹn; Lớp cách nhiệt nguyên vẹn'],
        ['窗户/通风窗', 'Cửa sổ / Cửa thông gió', '玻璃完好无破损；开启灵活；密封条完好；窗框无变形锈蚀；不渗漏', 'Kính nguyên vẹn không vỡ; mở linh hoạt; gioăng kín nguyên vẹn; khung cửa không biến dạng gỉ sét; không thấm dột'],
        ['给水接口', 'Đầu nối cấp nước', '给水管到位，阀门启闭灵活无渗漏；水表完好；供水压力满足使用需求', 'Ống cấp nước đã lắp đặt, van đóng mở linh hoạt không rò rỉ; đồng hồ nước nguyên vẹn; áp suất cấp nước đáp ứng nhu cầu sử dụng'],
        ['排水系统', 'Hệ thống thoát nước', '排水管畅通接口无渗漏；地漏位置合理排水顺畅；厂房排水沟坡度正确无堵塞；隔油池/沉淀池功能正常', 'Ống thoát nước thông mối nối không rò rỉ; Thu nước sàn vị trí hợp lý thoát tốt; Rãnh thoát nước nhà xưởng độ dốc đúng không tắc; Bể tách dầu / bể lắng hoạt động bình thường'],
        ['消防设施', 'Thiết bị PCCC', '喷淋头/消火栓按规范配置安装正确；灭火器配置到位在有效期内；烟感/温感探测器安装正确无屏蔽点', 'Đầu phun / Họng cứu hỏa bố trí đúng quy chuẩn lắp đặt đúng; Bình chữa cháy đầy đủ còn hạn; Đầu báo khói / đầu báo nhiệt lắp đúng không điểm bị vô hiệu'],
        ['通风/排烟', 'Thông gió / Thoát khói', '自然通风窗/通风器完好；机械通风风机运转正常风量达标；排烟口/排烟阀动作正常', 'Cửa gió tự nhiên / quạt thông gió nguyên vẹn; Quạt thông gió cơ khí vận hành bình thường lưu lượng gió đạt; Cửa hút khói / van hút khói hoạt động bình thường'],
        ['卫生间/洗手间', 'Nhà vệ sinh / Phòng rửa tay', '洁具安装牢固表面完好无破损；角阀启闭灵活无渗漏；排水畅通无反臭；通风良好', 'Thiết bị vệ sinh lắp chắc bề mặt nguyên vẹn; Van góc đóng mở linh hoạt không rò rỉ; Thoát nước tốt không mùi hôi; Thông gió tốt'],
        ['通讯/网络接口', 'Cổng Liên lạc / Mạng', '弱电箱/信息箱安装到位；电话/网络接口位置合理；光纤/网线预留到位', 'Tủ điện nhẹ / Tủ thông tin lắp đặt đầy đủ; Cổng điện thoại / mạng vị trí hợp lý; Cáp quang / cáp mạng đã kéo dự phòng'],
        ['空调预留', 'Chừa sẵn điều hòa', '空调预留孔位置正确高度合理；室外空调板/平台尺寸合规承重满足要求；空调专用电源到位', 'Lỗ chờ điều hòa vị trí đúng độ cao hợp lý; Sàn đặt dàn nóng / bệ đỡ kích thước đúng quy cách chịu tải đạt; Nguồn điện riêng cho điều hòa đã có'],
        ['压缩空气/工艺管道', 'Khí nén / Đường ống công nghệ', '管道安装牢固无渗漏；阀门启闭灵活；标识清晰；压力表在检定有效期内', 'Đường ống lắp chắc không rò rỉ; Van đóng mở linh hoạt; Nhãn rõ ràng; Đồng hồ áp lực còn hạn kiểm định'],
        ['结构安全', 'An toàn Kết cấu', '柱梁楼板无裂缝变形；钢结构无锈蚀螺栓连接牢固；吊车梁/行车轨道安装符合设计要求', 'Cột Dầm Sàn không nứt biến dạng; Kết cấu thép không rỉ sét bu lông liên kết chắc chắn; Dầm cầu trục / ray cầu trục lắp đặt đúng thiết kế']
      ]
    },
    {
      form_id: 'D1', title: '技术资料移交清单', category: '资料与物品移交',
      items: [
        // 一、投资与规划许可类
        ['投资登记证(IRC)及企业登记证(ERC)', 'Giấy chứng nhận đăng ký đầu tư (IRC) & Giấy chứng nhận đăng ký doanh nghiệp (ERC)', '外商投资项目基础证照，核实原件，留存公证翻译件', 'Giấy tờ cơ bản của dự án FDI, đối chiếu bản gốc, lưu bản dịch công chứng'],
        ['土地使用权证及土地租赁合同', 'Giấy chứng nhận quyền sử dụng đất (GCNQSDĐ) & Hợp đồng thuê đất', '产权类基础资料，核实原件或经认证复印件', 'Hồ sơ quyền sở hữu cơ bản, đối chiếu bản gốc hoặc bản sao có chứng thực'],
        ['1/500详细规划批复', 'Quyết định phê duyệt quy hoạch chi tiết 1/500', '建设密度、建筑限高、用地功能分区等规划指标批复文件', 'Văn bản phê duyệt các chỉ tiêu quy hoạch: mật độ xây dựng, chiều cao, phân khu chức năng'],
        ['环境影响评价批准/环境许可证', 'Quyết định phê duyệt ĐTM / Giấy phép môi trường', '2020年《环境保护法》要求，施工许可前置条件', 'Yêu cầu theo Luật Bảo vệ Môi trường 2020, điều kiện tiên quyết trước GPXD'],
        ['消防安全设计批准', 'Giấy chứng nhận thẩm duyệt thiết kế PCCC', '施工许可前置，公安消防部门出具', 'Điều kiện tiên quyết trước GPXD, do Cục PCCC cấp'],
        ['施工许可证', 'Giấy phép xây dựng', '施工许可类核心文件，核实原件', 'Văn bản cốt lõi về phép thi công, đối chiếu bản gốc'],
        ['用水/用电指标批文及合同', 'Văn bản phê duyệt chỉ tiêu cấp điện, cấp nước & Hợp đồng', '配套指标类资料', 'Hồ sơ chỉ tiêu phụ trợ'],
        ['电表检验合格证', 'Giấy chứng nhận kiểm định công tơ điện', 'EVN电力公司出具的全部电表合格证', 'Giấy chứng nhận công tơ điện do EVN cấp'],

        // 二、产权类
        ['房屋产权清册', 'Danh sách quyền sở hữu công trình', '产权类资料', 'Hồ sơ quyền sở hữu'],
        ['配套设施设备产权证明', 'Giấy chứng nhận quyền sở hữu thiết bị phụ trợ', '由物业填写规范表格，投资方加盖公章', 'BQL điền mẫu chuẩn, Chủ đầu tư đóng dấu'],

        // 三、竣工图类
        ['竣工总平面图/园区规划图', 'Bản vẽ Tổng mặt bằng Hoàn công / Sơ đồ Quy hoạch Khu CN', '竣工图类', 'Bản vẽ hoàn công'],
        ['单体建筑/结构竣工图', 'Bản vẽ hoàn công kiến trúc / kết cấu đơn thể', '竣工图类', 'Bản vẽ hoàn công'],
        ['单体设备/给排水/电气竣工图', 'Bản vẽ hoàn công thiết bị / cấp thoát nước / điện', '竣工图类', 'Bản vẽ hoàn công'],
        ['室外管网竣工图', 'Bản vẽ hoàn công mạng lưới đường ống ngoài nhà', '竣工图类', 'Bản vẽ hoàn công'],
        ['道路及停车场竣工图', 'Bản vẽ hoàn công đường giao thông & bãi đỗ xe', '竣工图类', 'Bản vẽ hoàn công'],
        ['绿化竣工图', 'Bản vẽ Hoàn công Cây xanh', '竣工图类', 'Bản vẽ hoàn công'],

        // 四、技术资料类
        ['地质勘察报告', 'Báo cáo Khảo sát Địa chất', '技术资料类', 'Hồ sơ kỹ thuật'],
        ['图纸会审记录', 'Biên bản thẩm tra bản vẽ', '技术资料类', 'Hồ sơ kỹ thuật'],
        ['工程设计变更通知及技术核定单', 'Thông báo thay đổi thiết kế & Phiếu xác nhận kỹ thuật', '技术资料类', 'Hồ sơ kỹ thuật'],
        ['隐蔽工程签证及验收合格证明', 'Biên bản nghiệm thu công tác khuất & Giấy chứng nhận', '技术资料类', 'Hồ sơ kỹ thuật'],
        ['沉降观察记录', 'Biên bản Quan trắc Lún', '技术资料类', 'Hồ sơ kỹ thuật'],
        ['施工日志', 'Nhật ký thi công', '第06/2021/NĐ-CP号法令附录VIb强制要求，质量管理档案必备', 'Bắt buộc theo Phụ lục VIb NĐ 06/2021/NĐ-CP, hồ sơ quản lý chất lượng'],

        // 五、政府验收类
        ['工程竣工验收备案证明', 'Giấy chứng nhận lưu hồ sơ nghiệm thu hoàn công', '政府验收类', 'Nghiệm thu Nhà nước'],
        ['消防验收认证', 'Giấy chứng nhận nghiệm thu PCCC', '公安消防部门现场检查后出具，投产前必备', 'Do Cục PCCC cấp sau kiểm tra thực địa, điều kiện bắt buộc trước khi vận hành'],
        ['环保达标验收合格证明', 'Giấy xác nhận hoàn thành công trình bảo vệ môi trường', '政府验收类', 'Nghiệm thu Nhà nước'],
        ['电梯安全检验合格证及准用文件', 'Giấy chứng nhận an toàn thang máy & Văn bản cho phép sử dụng', '政府验收类', 'Nghiệm thu Nhà nước'],
        ['燃气工程竣工验收合格证明（如适用）', 'Giấy chứng nhận nghiệm thu công trình khí đốt (nếu có)', '政府验收类 — 工业园通常无燃气设施', 'Nghiệm thu Nhà nước — KCN thường không có hạ tầng khí đốt'],

        // 六、设备资料类
        ['设备订货合同及合格证', 'Hợp đồng đặt hàng thiết bị & Giấy chứng nhận chất lượng', '含随机使用说明书、检验报告、工具清单', 'Kèm HDSD, báo cáo kiểm định, danh sách dụng cụ'],
        ['设施设备安装测试验收记录', 'Biên bản nghiệm thu lắp đặt & thử nghiệm thiết bị', '设备资料类', 'Hồ sơ thiết bị'],
        ['水电供应合同或批准文件', 'Hợp đồng cung cấp điện nước hoặc văn bản phê duyệt', '设备资料类', 'Hồ sơ thiết bị'],

        // 七、质保文件类
        ['钢材水泥等主材质保书', 'Giấy bảo hành vật liệu chính (thép, xi măng...)', '质保文件类', 'Hồ sơ bảo hành'],
        ['砂浆混凝土试块试压报告', 'Báo cáo Thử nén Mẫu Vữa & Bê tông', '质保文件类', 'Hồ sơ bảo hành'],
        ['各厂房平面图/水电线路图', 'Sơ đồ Mặt bằng Nhà xưởng & Sơ đồ Đường Điện Nước', '质保文件类', 'Hồ sơ bảo hành']
      ]
    },
    {
      form_id: 'D2', title: '钥匙及门禁移交清单', category: '资料与物品移交',
      items: [
        ['变配电室钥匙', 'Chìa khóa Trạm biến áp', '机房钥匙，需通用', 'Chìa khóa Phòng thiết bị, cần đồng bộ'],
        ['发电机房钥匙', 'Chìa khóa Phòng Máy phát điện', '机房钥匙，需通用', 'Chìa khóa Phòng thiết bị, cần đồng bộ'],
        ['水泵房钥匙', 'Chìa khóa Trạm bơm', '机房钥匙，需通用', 'Chìa khóa Phòng thiết bị, cần đồng bộ'],
        ['消防控制室钥匙', 'Chìa khóa Phòng Điều khiển PCCC', '机房钥匙，需通用', 'Chìa khóa Phòng thiết bị, cần đồng bộ'],
        ['电梯机房钥匙', 'Chìa khóa Phòng Thang máy', '机房钥匙，需通用（各机房钥匙互通）', 'Chìa khóa Phòng thiết bị, cần đồng bộ (các phòng dùng chung 1 chìa)'],
        ['监控室钥匙', 'Chìa khóa Phòng Giám sát', '机房钥匙', 'Chìa khóa Phòng thiết bị'],
        ['管道井钥匙', 'Chìa khóa Giếng ống kỹ thuật', '设备钥匙', 'Chìa khóa Thiết bị'],
        ['配电柜钥匙', 'Chìa khóa Tủ điện', '设备钥匙', 'Chìa khóa Thiết bị'],
        ['消防栓箱钥匙', 'Chìa khóa Tủ cứu hỏa', '设备钥匙', 'Chìa khóa Thiết bị'],
        ['各单元入户门钥匙', 'Chìa khóa Cửa vào các căn hộ', '房源钥匙', 'Chìa khóa Căn hộ'],
        ['物业办公室钥匙', 'Chìa khóa Văn phòng BQL', '用房钥匙', 'Chìa khóa Phòng chức năng'],
        ['保洁工具间钥匙', 'Chìa khóa Phòng Dụng cụ vệ sinh', '用房钥匙', 'Chìa khóa Phòng chức năng'],
        ['仓库钥匙', 'Chìa khóa Kho', '用房钥匙', 'Chìa khóa Phòng chức năng'],
        ['园区大门遥控器/钥匙', 'Điều khiển / Chìa khóa Cổng chính KCN', '公共区域', 'Khu vực công cộng'],
        ['门禁卡/门禁密码', 'Thẻ kiểm soát / Mã PIN cửa', '门禁系统', 'Hệ thống kiểm soát truy cập']
      ]
    },
    {
      form_id: 'D3', title: '设施设备台账（汇总）', category: '资料与物品移交',
      items: [
        ['变压器', 'Máy biến áp', '记录型号、容量、数量、安装位置', 'Ghi nhận Model, Công suất, Số lượng, Vị trí lắp đặt'],
        ['高压开关柜', 'Tủ đóng cắt cao áp', '记录型号、数量、安装位置', 'Ghi nhận Model, Số lượng, Vị trí lắp đặt'],
        ['低压配电柜', 'Tủ phân phối hạ áp', '记录型号、数量、安装位置', 'Ghi nhận Model, Số lượng, Vị trí lắp đặt'],
        ['电容补偿柜', 'Tủ bù tụ điện', '记录型号、容量、数量', 'Ghi nhận Model, Công suất, Số lượng'],
        ['直流屏', 'Tủ nguồn DC', '记录型号、电池规格', 'Ghi nhận Model, Thông số ắc quy'],
        ['柴油发电机组', 'Tổ máy phát điện diesel', '记录型号、功率、数量', 'Ghi nhận Model, Công suất, Số lượng'],
        ['ATS自动转换柜', 'Tủ ATS (Chuyển nguồn tự động)', '记录型号、切换时间', 'Ghi nhận Model, Thời gian chuyển mạch'],
        ['生活水泵', 'Bơm sinh hoạt', '记录型号、功率、扬程、数量', 'Ghi nhận Model, Công suất, Cột áp, Số lượng'],
        ['消防主泵', 'Bơm chữa cháy chính', '记录型号、功率、扬程、数量', 'Ghi nhận Model, Công suất, Cột áp, Số lượng'],
        ['消防稳压泵', 'Bơm duy trì áp lực PCCC', '记录型号、功率、数量', 'Ghi nhận Model, Công suất, Số lượng'],
        ['生活水箱', 'Bể nước sinh hoạt', '记录容积、材质', 'Ghi nhận Dung tích, Vật liệu'],
        ['消防水池', 'Bể nước PCCC', '记录容积', 'Ghi nhận Dung tích'],
        ['消防报警主机', 'Tủ trung tâm báo cháy', '记录型号、回路数', 'Ghi nhận Model, Số mạch (loop)'],
        ['电梯', 'Thang máy', '记录型号、载重、速度、层站数', 'Ghi nhận Model, Tải trọng, Tốc độ, Số tầng'],
        ['硬盘录像机(NVR)', 'Đầu ghi hình (NVR)', '记录型号、通道数、存储容量', 'Ghi nhận Model, Số kênh, Dung lượng lưu trữ'],
        ['监控摄像头', 'Camera giám sát', '记录类型、数量', 'Ghi nhận Loại, Số lượng'],
        ['门禁系统', 'Hệ thống kiểm soát truy cập', '记录型号、控制器数量', 'Ghi nhận Model, Số lượng đầu đọc'],
        ['周界报警系统', 'Hệ thống báo động vành đai', '记录类型、防区数', 'Ghi nhận Loại, Số vùng bảo vệ'],
        ['路灯', 'Đèn đường', '记录类型、数量', 'Ghi nhận Loại, Số lượng'],
        ['污水处理设施', 'Thiết bị xử lý nước thải', '记录型号、处理能力', 'Ghi nhận Model, Công suất xử lý']
      ]
    },
    {
      form_id: 'D4', title: '问题汇总及整改跟踪表', category: '资料与物品移交',
      items: [
        ['结构类问题', 'Vấn đề kết cấu', '承重结构、墙体、楼板等缺陷', 'Khiếm khuyết Kết cấu chịu lực, Tường, Sàn...'],
        ['设备类问题', 'Vấn đề thiết bị', '机电设备运行故障或缺陷', 'Sự cố hoặc khiếm khuyết Thiết bị Cơ điện'],
        ['电气类问题', 'Vấn đề điện', '配电系统、照明等缺陷', 'Khiếm khuyết Hệ thống Điện, Chiếu sáng...'],
        ['给排水类问题', 'Vấn đề cấp thoát nước', '管道渗漏、排水不畅等', 'Rò rỉ đường ống, Thoát nước kém...'],
        ['消防类问题', 'Vấn đề PCCC', '消防设施设备缺陷', 'Khiếm khuyết Thiết bị PCCC'],
        ['资料类问题', 'Vấn đề hồ sơ tài liệu', '移交资料缺失或不完整', 'Hồ sơ bàn giao thiếu hoặc không đầy đủ'],
        ['其他类问题', 'Vấn đề khác', '其他需要整改的事项', 'Các hạng mục cần khắc phục khác']
      ]
    }
  ]

  const insertTemplate = db.prepare(
    'INSERT INTO inspection_templates (form_id, title, category) VALUES (?, ?, ?)'
  )
  const insertItem = db.prepare(
    'INSERT INTO template_items (template_id, item_number, item_name, name_vi, check_standard, standard_vi, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const tx = db.transaction(() => {
    for (const t of templates) {
      const result = insertTemplate.run(t.form_id, t.title, t.category)
      const tid = result.lastInsertRowid
      t.items.forEach(([name, nameVi, standard, standardVi], idx) => {
        insertItem.run(tid, idx + 1, name, nameVi, standard, standardVi, idx)
      })
    }
  })
  tx()

  console.log(`Seeded ${templates.length} templates with ${templates.reduce((s, t) => s + t.items.length, 0)} items.`)
  console.log('Default admin account: admin / admin123')
}
