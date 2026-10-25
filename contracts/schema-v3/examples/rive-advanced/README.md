# 千机百变 Rive 高级对象源代码示例

清单与 main.js 必须一起使用。此目录有意不附带第三方 Rive 二进制和预览图，不能直接作为完整资源包导入。
main.riv 使用已由三端原生探针核验的官方 data_binding_test.riv（Artboard / State Machine 2）；
另提供 preview.webp 与 assets/scene.riv，scene.riv 至少包含一个画板和状态机。
官方主文件来源：https://github.com/rive-app/rive-ios/blob/main/Tests/Assets/data_binding_test.riv
脚本从实际元数据选择首个画板和状态机，不预设名称或数据属性。

字面 QVMI 路径对应表：无。values、bindings、UI 和系统观察/触发权限均为空；不访问网络，不持久化。
activate 创建一个真实 Worker 和两个文件，读取一帧原始像素；deactivate 关闭持有文件并清理引用。
若需要显示像素，需由调用方使用真实像素消费者；本例不声称新增了图片显示控件，也不把像素伪装成 PNG。
原有共享数据/UI 用例不需改成离屏方式；三种绑定路径均保持可用。

发布检查验证清单、脚本、API 与释放路径。原生绘制已经由客户端独立回归；此处替身测试不替代设备绘制。
