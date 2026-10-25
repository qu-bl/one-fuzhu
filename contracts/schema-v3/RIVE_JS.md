# Rive JavaScript 接口（11.0.4）

权威字段为 contract.json 的 script.rive，由 generate_ai_profile.py 原样派生到精简索引。
该分区描述当前已经发布/提交客户端的公开包装，不把其它平台 SDK 的接口视为本端已有能力。
官方参考：[Apple](https://rive.app/docs/runtimes/apple/apple)、[Android](https://rive.app/docs/runtimes/android/android)。

## 能力查询与旧客户端

先检查 qu.rive.files / qu.rive.workers 是否存在；当前播放器查询 await qu.rive.capabilities()，
独立对象查询 await qu.rive.files.capabilities()。同名 JS 包装存在不表示原生接口可用。
新规则不能让旧客户端自动获得新 SDK 方法；未支持时报告实际错误，不模拟成功。
Apple 基线 1.9 (1.2.11)，Android 基线 1.0.11 (53)，鸿蒙需包含 e65ffb3 应用和 1291778 适配库或更新实现。

## 当前播放器

qu.rive.file 提供实际文件、模型、实例、枚举、资产目录查询；instance.name 与 viewModelName 含义不同。
playback 提供 pause/resume/isPaused/advance；单步先暂停，seconds 是秒。
volume 只控制当前画板，setFit 和 setFrameRate 使用对应 SDK 的公开策略。
globalViewModel(name) 提供显式覆盖实例的 get/bind/set；Apple 无 clear 接口，不用另建默认实例冒充清除。
backgroundColor 是原生清屏颜色，格式 #RRGGBB 或 #AARRGGBB。

实例标量 number/boolean/string/enumeration/color 支持 get/set/observe；Trigger 仅 fire/observe。
列表和嵌套实例保存真实身份。instance.close 只释放包装，不删除列表项或清除图中仍持有的绑定。
容器不做整表 JSON 双向镜像；列表结构订阅目前仅鸿蒙支持，逐项属性订阅使用 SDK 通知。
UI 继续通过所属作用域 QVMI 工作；JS 直接操作、清单 QVMI 绑定、JS 动态连接全部保留。
QVMI 的写入仍按声明、所有权和 writable 权限处理；需要回传由 JS 显式发布，不自动回流。

## 资源

当前图用 qu.rive.assets，独立文件用 file.assets。
decode(type, source) 接受所属资源引用或 Uint8Array；图片使用 riveImageMaxBytes，其他使用 riveAssetMaxBytes。
图片/字体/音频三端支持，Blob 仅 Apple/鸿蒙，systemFont 仅 Apple。
音频通过原生带外资源注册，不存在 RVMI Audio 属性。元数据来自 SDK，不按文件扩展名猜类型。
资源属性 set 接受已有字符串引用、同类型的解码引用或 null 清除，资源属性没有 get/observe。
register/unregister 的名称属于 Worker；close 不自动注销名称。延迟解码句柄不保证输入图片已完全解码。

## 独立对象与共享 Worker

```js
const worker = await qu.rive.workers.create({enableGPUCanvas: true});
const a = await worker.open('assets/a.riv');
const b = await qu.rive.files.open('assets/b.riv', {worker});
await worker.close(); // 已打开文件继续持有 Worker，但入口不能再打开文件
await a.close();      // 不关闭 b
await b.close();      // 最后一个文件关闭后释放底层 Worker
```

没有指定 Worker 时每个文件使用独立 Worker。enableGPUCanvas 创建时固定，传入 worker 时不能再指定。
Worker 是 Rive 的线程/队列对象，并非浏览器 SharedWorker 或可执行任意 JS 的后台线程。
同 Worker、同脚本的文件可传递真实实例和资源引用；模型兼容性由 SDK 判断，不以同名/同值猜测身份。
失败导入不能结束其它文件。独立文件不受播放器换图影响，脚本结束仍会统一清理。
文件提供元数据、assets、创建画板和实例；画板提供音量、状态机创建和按能力 resetSize。
关闭画板关闭其状态机，关闭文件使其句柄失效并取消订阅。

独立状态机显式 advance，没有另造播放时钟；bind(main, globals) 接受真实实例。
render({width,height}) 的每边为 1..4096 正整数；返回 format 指定的 rgba8/bgra8 原始 Uint8Array 像素。
若 SDK 跳帧仅返回 {skipped:true}，不返回伪造缓存画面。没有提供 PNG 编码或截图模拟接口。
Android 此对象入口实际使用 OpenGL CommandQueue，不能通过未提供的 backend 字段选择 Vulkan。
完整清单/脚本配套示例见 examples/rive-advanced；补齐其中注明的二进制文件后再打包。

## 原生输入与事件

settled 只表示状态机稳定，不表示作品播放结束。语义、焦点和输入能力分别检查 flags。
当前播放器系统视图仍处理官方触摸/键盘；JS 程序化输入的支持范围以包装实际公开接口为准。
Apple 的程序化焦点、指针、键盘/文本注入未开放；Android 未开放键盘/文本注入；鸿蒙有官方 C++ 适配。
按元数据得到语义节点后再执行 tap/increase/decrease 和焦点动作，不能猜造节点。
语义先 enable，独立图显式 advance/drain({width,height})；监听不会自己推进图或伪造初始树。
Apple/鸿蒙是官方增量 diff，Android 是官方当前树快照，不能混用其返回结构。
指针坐标与视口均用实际 Rive 视口物理像素。
鸿蒙当前播放器 keyInput 的字段为 key/modifiers/pressed/repeat；独立状态机为 key/modifiers/isPressed/isRepeat。
这是当前客户端的接收对象差异，规则不得把字段混用后声称跨接口一致。
所有 observe 返回同步取消函数；图/文件关闭或脚本结束释放其监听，不用轮询或 setter 回显模拟通知。
