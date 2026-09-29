/**
 * @id QuCapabilityLab1055
 * @description 综合能力测试：数据、四位置 UI、存储、硬件、联网与宿主接口联动。契约 11.0.0。
 * @interval 1000
 */
'use strict';
const PREFIX = 'app.capLab1055.';
const PUBLIC_FIELDS = {
  "app.theme.brand": "color",
  "system.time.epochMs": "number",
  "system.appearance.colorMode": "enum",
  "system.appearance.language": "string",
  "system.appearance.region": "string",
  "system.appearance.locale": "string",
  "system.appearance.timeZone": "string",
  "system.appearance.is24HourClock": "boolean",
  "system.appearance.fontSizeScale": "number",
  "system.appearance.fontWeightScale": "number",
  "system.appearance.hasPointerDevice": "boolean",
  "system.appearance.mcc": "string",
  "system.appearance.mnc": "string",
  "system.deviceInfo.type": "string",
  "system.deviceInfo.manufacturer": "string",
  "system.deviceInfo.brand": "string",
  "system.deviceInfo.marketName": "string",
  "system.deviceInfo.productSeries": "string",
  "system.deviceInfo.productModel": "string",
  "system.deviceInfo.productModelAlias": "string",
  "system.deviceInfo.softwareModel": "string",
  "system.deviceInfo.hardwareModel": "string",
  "system.deviceInfo.chipType": "string",
  "system.deviceInfo.abiList": "string",
  "system.deviceInfo.performanceClass": "number",
  "system.deviceInfo.displayVersion": "string",
  "system.deviceInfo.incrementalVersion": "string",
  "system.deviceInfo.osFullName": "string",
  "system.deviceInfo.osReleaseType": "string",
  "system.deviceInfo.securityPatchTag": "string",
  "system.deviceInfo.osMajorVersion": "number",
  "system.deviceInfo.osSeniorVersion": "number",
  "system.deviceInfo.osFeatureVersion": "number",
  "system.deviceInfo.osBuildVersion": "number",
  "system.deviceInfo.sdkApiVersion": "number",
  "system.deviceInfo.sdkMinorApiVersion": "number",
  "system.deviceInfo.sdkPatchApiVersion": "number",
  "system.deviceInfo.firstApiVersion": "number",
  "system.deviceInfo.versionId": "string",
  "system.deviceInfo.buildType": "string",
  "system.deviceInfo.buildTime": "string",
  "system.deviceInfo.distributionOSName": "string",
  "system.deviceInfo.distributionOSVersion": "string",
  "system.deviceInfo.distributionOSApiVersion": "number",
  "system.deviceInfo.distributionOSApiName": "string",
  "system.deviceInfo.distributionOSReleaseType": "string",
  "system.deviceInfo.bootCount": "number",
  "system.deviceInfo.deviceColor": "string",
  "system.battery.level": "number",
  "system.battery.isCharging": "boolean",
  "device.motion.accelerationX": "number",
  "device.motion.accelerationY": "number",
  "device.motion.accelerationZ": "number",
  "device.motion.rotationX": "number",
  "device.motion.rotationY": "number",
  "device.motion.rotationZ": "number",
  "device.motion.pitch": "number",
  "device.motion.roll": "number",
  "device.motion.yaw": "number",
  "device.ambientLight.normalized": "number",
  "device.proximity.isNear": "boolean",
  "device.proximity.normalized": "number",
  "device.location.latitude": "number",
  "device.location.longitude": "number",
  "device.location.altitude": "number",
  "device.location.speed": "number",
  "device.location.course": "number",
  "device.location.horizontalAccuracy": "number",
  "device.screen.width": "number",
  "device.screen.height": "number",
  "device.screen.density": "number",
  "device.screen.orientation": "enum",
  "device.touch.x": "number",
  "device.touch.y": "number",
  "device.touch.isDown": "boolean",
  "device.touch.phase": "enum",
  "device.touch.pointerId": "number",
  "system.network.isConnected": "boolean",
  "system.network.type": "enum"
};
const fields = {}, results = {}, localOff = [], hardwareOff = [];
let api, stopped = false, dirty = true, restoreUI = false, socket = null;
let stateCallbacks = 0, stateExpected = null;
let events = 0, eventExpected = null, eventDeadline = 0, originalBrand, busy = false;
const seed = {
  number: ['number', 25], enabled: ['boolean', true], visible: ['boolean', true],
  readOnly: ['boolean', false], text: ['string', '你好，千机百变'],
  multiline: ['string', '第一行\n第二行：四个位置共享这些数据。'], password: ['string', 'test-only'],
  color: ['color', '#6750A4'], colorText: ['string', '#6750A4'], enumeration: ['enum', '甲'], single: ['string', '甲'],
  object: ['json', { count: 0, source: 'local' }], list: ['json', ['甲']],
  options: ['json', ['甲', '乙', '丙']], resource: ['resource', ''], image: ['image', ''],
  binary: ['binary', new Uint8Array([0, 127, 128, 255])], event: ['trigger', false],
  min: ['number', 0], max: ['number', 100], step: ['number', 1],
  summary: ['string', '准备中'], report: ['string', '尚未测试'], error: ['string', ''],
  title: ['string', '联动数值'], hint: ['string', '输入与滑杆使用同一个字段'],
  placeholder: ['string', '请输入'],
  url: ['string', 'https://qu-bl.github.io/one-fuzhu/contracts/schema-v3/release.json'],
  uploadUrl: ['string', ''], socketUrl: ['string', ''],
  resourceId: ['string', ''], audioId: ['string', ''], fontPath: ['string', ''],
  fontId: ['string', ''], artboard: ['string', ''], stateMachine: ['string', ''],
  viewModel: ['string', ''], instanceKind: ['string', 'none'], instance: ['string', '']
};
const value = key => fields[key].value;
const set = (key, next) => { fields[key].value = next; dirty = true; };
const stringify = x => JSON.stringify(x, (_k, v) => v instanceof Uint8Array ? Array.from(v) : v);
// Object key order is insignificant; array order and value types are significant.
function sameData(a, b) {
  if (a === b) return true;
  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    return a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameData(v, b[i]));
  }
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.prototype.hasOwnProperty.call(b, k) && sameData(a[k], b[k]));
}
function errorText(e) {
  const message = String(e), stack = String(e && e.stack || '');
  return stack.includes(message) ? stack : message + (stack ? '\n' + stack : '');
}
function assertData(actual, expected, message) {
  assert(sameData(actual, expected), message + '\n预期：' + stringify(expected) + '\n实际：' + stringify(actual));
}
function record(name, state, detail) {
  results[name] = { state, detail: typeof detail === 'string' ? detail : stringify(detail), time: new Date().toISOString() };
  dirty = true;
}
function requireValue(key) {
  const v = String(value(key)).trim();
  if (!v) { const e = new Error('请先填写：' + key); e.waiting = true; throw e; }
  return v;
}
function assert(ok, message) { if (!ok) throw new Error(message); }
async function check(name, task) {
  record(name, '执行中', '');
  try {
    const result = await task();
    if (!stopped) record(name, result === undefined ? '已执行' : '通过', result === undefined ? '调用完成；子项结果与设备实际效果请分别确认' : result);
    return result;
  } catch (e) {
    if (!stopped) record(name, e.waiting ? '待配置' : '失败', errorText(e));
  }
}
const fire = (name, payload) => api.viewModel.trigger('runtime.' + name).fire(payload);
const binding = key => ({ path: PREFIX + key, type: key === 'list' ? 'list' : seed[key][0], default: seed[key][1] });
const condition = key => ({ path: PREFIX + key, equals: true, fallback: false });
let nextId = 0;
const node = (type, label, extra) => Object.assign({ id: 'c' + (++nextId), type, label }, extra || {});
const button = (id, label) => ({ id, type: 'button', label, text: label, action: 'emit' });
const group = (label, children, extra) => node('group', label, Object.assign({ layout: 'column', children }, extra));
const input = (key, label, mode) => node('input', label, { inputMode: mode || 'text', bindings: { value: binding(key) } });
const toggle = (key, label) => node('toggle', label, { bindings: { value: binding(key) } });
const text = (key, label) => node('text', label, { copyable: true, bindings: { text: { path: PREFIX + key, fallback: '等待数据' } } });
function controls() {
  const choice = key => node('choice', key === 'list' ? '多选' : '单选 ' + key, {
    options: ['甲', '乙', '丙'].map(v => ({ label: v, value: v })),
    bindings: { value: binding(key), options: { path: PREFIX + 'options', fallback: ['甲', '乙', '丙'].map(v => ({ label: v, value: v })) } }
  });
  const number = input('number', '联动数值', 'number');
  Object.assign(number.bindings, {
    label: { path: PREFIX + 'title', fallback: '联动数值' },
    description: { path: PREFIX + 'hint', fallback: '共享数据' },
    placeholder: { path: PREFIX + 'placeholder', fallback: '输入' },
    error: { path: PREFIX + 'error', fallback: '' }, readOnly: condition('readOnly')
  });
  return [
    group('状态', [toggle('enabled', '启用控件'), toggle('visible', '显示联动组'), toggle('readOnly', '数值只读')]),
    group('共享数据', [number,
      node('slider', '同一数值', { min: 0, max: 100, step: 1, bindings: {
        value: binding('number'), min: { path: PREFIX + 'min', fallback: 0 },
        max: { path: PREFIX + 'max', fallback: 100 }, step: { path: PREFIX + 'step', fallback: 1 }
      } }),
      input('text', '文本'), input('multiline', '多行内容', 'multiline'), input('password', '测试密码', 'password'),
      choice('single'), choice('enumeration'), choice('list')
    ], { bindings: { enabled: condition('enabled'), visible: { path: PREFIX + 'visible', in: [true], fallback: false } } }),
    node('button', '选择测试文件', { action: 'pickFile', maxBytes: 1048576,
      acceptedFileExtensions: ['json', 'txt', 'riv'], bindings: { value: binding('resource') } }),
    node('choice', '当前文件引用', { bindings: { value: binding('resource'), options: { path: PREFIX + 'resourceOptions', fallback: [] } } }),
    group('相对叠放', [node('text', '顶部', { text: '顶部 · 叠放布局' }),
      group('底部', [node('text', '底部内容', { text: '底部 · 自适应' })], { layout: 'stack', align: 'end', valign: 'bottom' })
    ], { layout: 'stack', align: 'start', valign: 'top' }),
    group('横向排列', [node('text', '左侧', { text: '左侧' }), node('spacer', '弹性占位'), node('text', '右侧', { text: '右侧' })], { layout: 'row' }),
    text('summary', '联动摘要')
  ];
}
function declareUI() {
  nextId = 0;
  const commands = [
    ['local', '运行全部本地测试'], ['mutate', '修改数据和动态选项'],
    ['save', '保存数据快照'], ['restore', '恢复数据快照'], ['clearStore', '清除本脚本存储'],
    ['sensors', '订阅全部公共字段（可能请求权限）'], ['stopSensors', '停止公共字段订阅'],
    ['request', 'HTTP 三种响应类型'], ['download', '下载到宿主'], ['stream', '流式读取'],
    ['upload', '上传选中的文件到填写的地址'], ['socketOpen', '打开 WebSocket'],
    ['socketSend', '发送文本和二进制'], ['socketClose', '关闭 WebSocket'],
    ['notify', '发布通知'], ['cancelNotify', '取消通知'], ['alarm', '一分钟后闹钟'], ['cancelAlarm', '取消闹钟'],
    ['logs', '输出三级日志'], ['resources', '读取文件和包资源'], ['rive', '探测 Rive 与字体接口'],
    ['audio', '测试包音频接口'], ['readEditor', '读取两种编辑器'],
    ['writeApp', '原样回写当前脚本（可能重启）'], ['writePackage', '原样回写当前资源包'],
    ['brand', '应用测试品牌色'], ['restoreBrand', '恢复品牌色'], ['clearUI', '清除 UI，一秒后恢复']
  ];
  api.ui.declare([
    { id: 'labConfig', slot: 'scriptUi', presentation: 'inline', title: '综合能力测试', components: [
      text('summary', '状态'), group('测试项目', [
        group('操作', commands.map(([id, label]) => button(id, label))),
        group('原生弹窗', ['text', 'multiline', 'password', 'number', 'toggle', 'slider', 'choice', 'file'].map(k => button('dialog_' + k, '弹窗 · ' + k))),
        group('连接配置', [input('url', 'HTTPS 测试地址'), input('uploadUrl', '上传 HTTPS 地址'), input('socketUrl', 'WebSocket WSS 地址')]),
        group('资源包上下文配置', ['resourceId', 'audioId', 'fontPath', 'fontId', 'artboard', 'stateMachine', 'viewModel', 'instanceKind', 'instance'].map(k => input(k, k))),
        input('colorText', '测试品牌色（#RRGGBB）'), text('report', '可复制原始报告')
      ], { scroll: true })
    ] },
    { id: 'labApp', slot: 'applicationScript', presentation: 'inline', title: '数据联动', components: [group('控件测试', controls(), { scroll: true })] },
    { id: 'labBuilder', slot: 'packageBuilder', presentation: 'inline', title: '测试结果', components: [
      input('number', '跨面板共享数值', 'number'), group('报告', [text('report', '原始结果')], { scroll: true })
    ] },
    { id: 'labDialog', slot: 'dialog', presentation: 'dialog', title: '同一数据 · 弹窗', components: [
      ...['text', 'multiline', 'password', 'number'].map(k => Object.assign(input(k, '共享 ' + k, k === 'text' ? 'text' : k), { id: 'dlg_' + k })),
      Object.assign(toggle('enabled', '启用控件'), { id: 'dlg_toggle' }),
      { id: 'dlg_slider', type: 'slider', label: '数值', min: 0, max: 100, step: 1, bindings: { value: binding('number') } },
      { id: 'dlg_choice', type: 'choice', label: '多选', options: ['甲', '乙', '丙'].map(v => ({ label: v, value: v })), bindings: { value: binding('list') } },
      { id: 'dlg_file', type: 'button', label: '选择文件', action: 'pickFile', maxBytes: 1048576, bindings: { value: binding('resource') } }
    ] }
  ]);
}
function refresh() {
  if (!dirty || stopped) return;
  dirty = false;
  const counts = {};
  Object.keys(results).forEach(k => { counts[results[k].state] = (counts[results[k].state] || 0) + 1; });
  fields.summary.value = '数值 ' + value('number') + ' · 文本 ' + value('text') + '\n已收到事件 ' + events + ' · ' + stringify(counts);
  fields.report.value = Object.keys(results).map(k => '[' + results[k].state + '] ' + k + '\n' + results[k].detail).join('\n\n') || '尚未测试';
}
async function localTests() {
  for (const [type, initial, next] of [
    ['number', 0, 12.5], ['boolean', false, true], ['string', '', '中文🙂\n第二行'],
    ['color', '#6750A4', '#008577'], ['enum', '甲', '乙'], ['resource', '', ''], ['image', '', ''],
    ['json', {}, { text: '中文', n: 1, list: [true, '嵌套', 2] }], ['binary', new Uint8Array(0), new Uint8Array([0, 127, 128, 255])]
  ]) await check('数据/' + type, () => {
    const path = PREFIX + 'test' + type;
    api.viewModel.define(path, type, initial, { label: type });
    const accessor = api.viewModel[type === 'enum' ? 'enumeration' : type](path);
    accessor.value = next;
    assertData(accessor.value, next, '读写回环不一致');
    assert(api.viewModel.list().some(x => x.path === path), 'list 未包含定义字段');
    api.viewModel.remove(path);
    assert(!api.viewModel.list().some(x => x.path === path), 'remove 后仍存在');
    return type === 'image' || type === 'resource' ? '空引用读写通过；真实资源需选文件/包上下文测试' : stringify(next);
  });
  await check('数据/list', () => {
    set('list', ['甲', '丙']); assertData(value('list'), ['甲', '丙'], '列表读写不一致');
    return value('list');
  });
  await check('存储/JSON 类型', () => {
    const kinds = [null, false, 12.5, '中文🙂', ['甲', 2], { lat: 31.23, lon: 121.47 }];
    kinds.forEach((v, i) => {
      const k = 'probe.' + i; api.storage.set(k, v);
      assertData(api.storage.get(k), v, '存储回读不一致：' + k);
      assert(api.storage.keys().includes(k), 'keys 缺少：' + k);
      api.storage.remove(k); assert(api.storage.get(k, 'missing') === 'missing', 'remove 失败');
    });
    return '六种 JSON 值回读、列举、删除通过';
  });
  stateExpected = Number(value('number')) === 42 ? 43 : 42;
  set('number', stateExpected);
  record('状态/订阅', '等待回调', '目标数值 ' + stateExpected);
  eventExpected = events + 3; eventDeadline = Date.now() + 5000;
  fields.event.fire(); await api.viewModel.trigger(PREFIX + 'event').fire(); fields.event.fire();
  record('事件/连续三次同值', '等待回调', '目标计数 ' + eventExpected);
}
function stopSensors() { while (hardwareOff.length) hardwareOff.pop()(); }
function sensors() {
  stopSensors();
  Object.keys(PUBLIC_FIELDS).forEach(path => {
    try {
      const type = PUBLIC_FIELDS[path];
      const handle = api.viewModel[type === 'enum' ? 'enumeration' : type](path);
      record(path, '等待回调', '已请求订阅；等待实际数据');
      let count = 0;
      hardwareOff.push(handle.observe(v => {
        if (stopped) return;
        record(path, '收到数据', { count: ++count, value: v });
        if (path === 'device.location.latitude' || path === 'device.location.longitude') {
          const snapshot = value('object');
          set('object', Object.assign({}, snapshot, { [path.split('.').pop()]: v }));
        }
      }));
    } catch (e) { record(path, '未能订阅', errorText(e)); }
  });
}
const snapshotKeys = ['number', 'text', 'multiline', 'color', 'enumeration', 'single', 'list', 'object', 'enabled', 'visible', 'readOnly'];
function save() {
  const snapshot = {}; snapshotKeys.forEach(k => { snapshot[k] = value(k); });
  api.storage.set('snapshot', snapshot); return snapshot;
}
function restore() {
  const snapshot = api.storage.get('snapshot', null);
  if (!snapshot) return '尚无快照';
  snapshotKeys.forEach(k => { if (Object.prototype.hasOwnProperty.call(snapshot, k)) set(k, snapshot[k]); });
  return '已恢复数据（资源令牌与 QVMI 字段本身不持久化）';
}
async function resources() {
  await check('资源/token', () => api.resources.token(requireValue('resourceId')));
  for (const method of ['readText', 'readJson', 'readBinary']) {
    await check('资源/' + method, () => {
      const result = api.resources[method](requireValue('resource'));
      return result instanceof Uint8Array ? { bytes: result.length, head: Array.from(result.slice(0, 32)) } : result;
    });
  }
}
async function rive() {
  // 应用脚本通常不拥有 Rive 上下文：保留宿主原文，不伪造成功。
  await check('Rive/state', () => api.rive.state());
  await check('Rive/load', () => {
    requireValue('artboard');
    return api.rive.load({ artboard: value('artboard'), stateMachine: value('stateMachine'),
      viewModel: value('viewModel'), instanceKind: value('instanceKind'), instance: value('instance') });
  });
  await check('Rive/font', () => api.rive.font(requireValue('fontPath')).set(requireValue('fontId')));
}
async function audio() {
  const id = requireValue('audioId');
  for (const [op, payload] of [
    ['play', { audio: id, policy: 'restart', volume: 0.25 }],
    ['setVolume', { audio: id, volume: 0.5 }], ['pause', { audio: id }], ['stop', { audio: id }]
  ]) await check('音频/' + op, () => fire('audio.' + op, payload));
}
async function action(id) {
  const actions = {
    local: localTests,
    mutate: () => {
      set('number', (Number(value('number')) + 10) % 101); set('text', '数据更新 ' + Date.now());
      set('options', ['甲', '乙', '丙', '丁']); set('title', '动态标题'); set('hint', '标题、描述、选项均已更新');
      set('placeholder', '动态占位'); set('error', value('error') ? '' : '测试错误提示（再次点击清除）');
      set('max', value('max') === 100 ? 200 : 100); set('step', value('step') === 1 ? 2 : 1);
      return value('object');
    },
    save, restore,
    clearStore: () => { api.storage.clear(); assert(api.storage.keys().length === 0, 'clear 后仍有数据'); return '仅清除了本脚本存储'; },
    sensors, stopSensors,
    request: async () => {
      for (const responseType of ['text', 'json', 'binary']) await check('HTTP/' + responseType, async () => {
        const r = await api.network.request(requireValue('url'), { method: 'GET', responseType, timeoutMs: 10000, redirect: 'follow' });
        assert(r.status >= 200 && r.status < 300, stringify(r)); return r;
      });
    },
    download: async () => {
      const r = await api.network.download(requireValue('url'), { timeoutMs: 30000 });
      assert(r.status >= 200 && r.status < 300 && r.token, stringify(r)); set('resource', r.token); return r;
    },
    stream: async () => {
      let chunks = 0;
      const r = await api.network.stream(requireValue('url'), { method: 'GET', timeoutMs: 10000 }, chunk => {
        record('流/最近片段', '收到数据', { count: ++chunks, chunk });
      });
      return { chunks, result: r };
    },
    upload: async () => {
      const r = await api.network.upload(requireValue('uploadUrl'), requireValue('resource'), { method: 'POST', timeoutMs: 30000 });
      assert(r.status >= 200 && r.status < 300, stringify(r)); return r;
    },
    socketOpen: () => {
      if (socket) socket.close();
      socket = api.network.webSocket.open(requireValue('socketUrl'), {}, event => record('WebSocket/事件', '收到事件', event));
      return '已提交连接请求；握手与收发结果见 WebSocket/事件';
    },
    socketSend: () => { assert(socket, '请先建立连接'); socket.send(value('text')); socket.send(value('binary'), true); return '已提交文本和二进制；请检查服务器回包'; },
    socketClose: () => { if (socket) socket.close(1000, 'test complete'); socket = null; },
    notify: () => fire('notification.publish', { id: 'capLab', title: '综合测试', body: value('text') }),
    cancelNotify: () => fire('notification.cancel', { id: 'capLab' }),
    alarm: () => fire('alarm.schedule', { id: 'capLab', fireAt: Date.now() + 60000, title: '综合测试闹钟', body: value('text') }),
    cancelAlarm: () => fire('alarm.cancel', { id: 'capLab' }),
    logs: async () => { for (const level of ['info', 'warn', 'error']) await fire('log.' + level, { message: '【主动测试日志】' + level + ' ' + value('text') }); },
    resources, rive, audio,
    readEditor: async () => {
      await check('编辑器/脚本读取', () => ({ length: api.editor.read('applicationScript').length }));
      for (const file of ['manifest', 'script']) await check('编辑器/包/' + file, () => ({ length: api.editor.read('resourcePackage', { file }).length }));
    },
    writeApp: () => api.editor.apply({ target: 'applicationScript', mode: 'replace', applicationJavaScript: api.editor.read('applicationScript') }),
    writePackage: () => api.editor.apply({ target: 'resourcePackage', mode: 'replace', manifestJson: api.editor.read('resourcePackage', { file: 'manifest' }), mainJavaScript: api.editor.read('resourcePackage', { file: 'script' }) }),
    brand: () => {
      const h = api.viewModel.color('app.theme.brand'); if (originalBrand === undefined) originalBrand = h.value;
      set('color', value('colorText')); h.value = value('color'); return h.value;
    },
    restoreBrand: () => { assert(originalBrand !== undefined, '尚未修改品牌色'); api.viewModel.color('app.theme.brand').value = originalBrand; originalBrand = undefined; },
    clearUI: () => { restoreUI = true; api.ui.clear(); }
  };
  if (id.startsWith('dialog_')) actions[id] = () => api.viewModel.openUi('dlg_' + id.slice(7));
  if (!actions[id]) return;
  if (busy) { record('操作', '等待', '上一项仍在执行'); return; }
  busy = true;
  try { await check('操作/' + id, actions[id]); } finally { busy = false; refresh(); }
}
defineQuScript({
  async onStart(qu) {
    api = qu;
    Object.keys(seed).forEach(k => { fields[k] = qu.viewModel.define(PREFIX + k, seed[k][0], seed[k][1], { label: k }); });
    fields.resourceOptions = qu.viewModel.define(PREFIX + 'resourceOptions', 'json', [], { label: '文件选项' });
    localOff.push(fields.event.observe(v => { if (v === true) events++; dirty = true; }));
    ['number', 'text', 'list', 'enumeration', 'resource'].forEach(k => {
      localOff.push(fields[k].observe(() => {
        if (stopped) return;
        if (k === 'number') { stateCallbacks++; if (value('number') === stateExpected) { record('状态/订阅', '通过', { value: value('number'), callbacks: stateCallbacks }); stateExpected = null; } }
        set('object', Object.assign({}, value('object'), { count: value('number'), text: value('text'), selected: value('list'), mode: value('enumeration') }));
        if (k === 'resource') fields.resourceOptions.value = value('resource') ? [value('resource')] : [];
        dirty = true;
      }));
    });
    await check('启动/存储恢复', () => {
      const starts = Number(qu.storage.get('starts', 0)) + 1; qu.storage.set('starts', starts);
      return { scriptStarts: starts, snapshot: restore() };
    });
    declareUI(); await localTests(); refresh();
  },
  onInterval() {
    if (restoreUI) { declareUI(); restoreUI = false; record('UI/恢复', '通过', '已重新声明四个位置'); }
    if (eventExpected !== null && Date.now() > eventDeadline) {
      record('事件/连续三次同值', events === eventExpected ? '通过' : '失败', { expected: eventExpected, actual: events }); eventExpected = null;
    }
    refresh();
  },
  onUiAction(id) { return action(id); },
  onStorageChange() { record('存储/外部变更', '收到事件', api.storage.get('snapshot', null)); },
  onStop() {
    stopped = true;
    while (localOff.length) localOff.pop()(); stopSensors();
    if (socket) socket.close();
    if (originalBrand !== undefined) api.viewModel.color('app.theme.brand').value = originalBrand;
  }
});
