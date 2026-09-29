import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../ai-editor-assistant.js', import.meta.url), 'utf8');
const context = vm.createContext({ defineQuScript() {} });
vm.runInContext(source + `
globalThis.aiTest = {
  serviceEndpoints,
  refreshConversationUI,
  completionPayload,
  deliveryTool,
  parseAssistantReply,
  safeHistory,
  utf8Bytes,
  sha256Hex,
  completionInfo,
  requestWithRules,
  refreshRuleLibrary,
  readRule,
  setRequestCompletion(value) { requestCompletion = value; },
  setReadRule(value) { readRule = value; },
  setRequestText(value) { requestText = value; },
  clearRuleLibrary() { ruleLibrary = null; }
};`, context);

const api = context.aiTest;
let currentUI;
api.refreshConversationUI({ ui: { declare: sets => { currentUI = JSON.parse(JSON.stringify(sets)); } } });
assert.deepEqual(currentUI.map(set => set.slot).sort(), ['applicationScript', 'packageBuilder', 'scriptUi']);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.serviceEndpoints('https://api.openai.com/v1'))),
  {
    chat: 'https://api.openai.com/v1/chat/completions',
    models: 'https://api.openai.com/v1/models'
  }
);

const rulePayload = api.completionPayload('test-model', [], 'rules', 'applicationScript');
assert.equal(rulePayload.response_format, undefined);
assert.equal(rulePayload.tools[0].function.name, 'read_rules');
assert.equal(rulePayload.tool_choice, 'auto');

const deliveryPayload = api.completionPayload('test-model', [], 'delivery', 'resourcePackage');
assert.equal(deliveryPayload.tools[0].function.name, 'submit_result');
assert.equal(deliveryPayload.tool_choice, undefined);
assert.deepEqual(
  Object.keys(deliveryPayload.tools[0].function.parameters.properties.apply_files.properties),
  ['manifestJson', 'mainJavaScript']
);

const parsed = api.parseAssistantReply({
  reply: '完成',
  edits: [],
  apply_files: { applicationJavaScript: 'defineQuScript({ onStart() {} });' }
}, 'applicationScript', { applicationJavaScript: '' });
assert.equal(parsed.reply, '完成');
assert.equal(parsed.delivery.kind, 'files');

const history = api.safeHistory(Array.from({ length: 30 }, (_, index) => ({
  role: index % 2 ? 'assistant' : 'user',
  content: '内容'.repeat(5000)
})));
assert.ok(history.length <= 12);
assert.ok(api.utf8Bytes(JSON.stringify(history)).length <= 24000);

let directory = '{"version":1}';
let directoryReads = 0;
function publishedRules() {
  return JSON.stringify({
    schemaVersion: 3,
    files: [{
      name: 'context-map.json', version: 'test', sha256: api.sha256Hex(directory)
    }]
  });
}
const release = JSON.stringify({
  schemaVersion: 3,
  contractVersion: 'test',
  files: { 'contract.json': api.sha256Hex('contract') }
});
api.clearRuleLibrary();
api.setRequestText(async (_qu, url) => {
  if (url.endsWith('ai-rules/rules.json')) return publishedRules();
  if (url.endsWith('contracts/schema-v3/release.json')) return release;
  if (url.endsWith('ai-rules/context-map.json')) {
    directoryReads++;
    return directory;
  }
  throw new Error('unexpected URL: ' + url);
});
await api.refreshRuleLibrary({});
await api.readRule({}, 'ai-rules/context-map.json', '');
await api.refreshRuleLibrary({});
await api.readRule({}, 'ai-rules/context-map.json', '');
assert.equal(directoryReads, 1);
directory = '{"version":2}';
await api.refreshRuleLibrary({});
await api.readRule({}, 'ai-rules/context-map.json', '');
assert.equal(directoryReads, 2);

function response(message, finishReason = 'tool_calls') {
  return { body: { choices: [{ finish_reason: finishReason, message }] } };
}
function call(id, name, args) {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}

const responses = [
  response({ content: '先直接回答', tool_calls: [] }, 'stop'),
  response({ content: '', tool_calls: [call('bad', 'read_rules', { path: 'missing.json' })] }),
  response({ content: '', tool_calls: [call('good', 'read_rules', { path: 'ai-rules/context-map.json' })] }),
  response({ content: '规则已读取', reasoning_content: '规则读取完成', tool_calls: [] }, 'stop'),
  response({ content: '直接返回正文', reasoning_content: '准备结果', tool_calls: [] }, 'stop'),
  response({
    content: '',
    reasoning_content: '改用工具提交',
    tool_calls: [call('result', 'submit_result', { reply: '可以', edits: [], apply_files: {} })]
  })
];
api.setRequestCompletion(async () => responses.shift());
api.setReadRule(async (_qu, path) => {
  if (path === 'missing.json') throw new Error('不存在');
  return '{"content":"ok"}';
});
const messages = [{ role: 'system', content: 'test' }];
const result = await api.requestWithRules({}, 'https://example.com/v1/chat/completions', {},
  'test-model', messages, 'applicationScript');
assert.equal(result.value.reply, '可以');
assert.ok(messages.some(message => message.role === 'user' && message.content.includes('请先调用 read_rules')));
assert.ok(messages.some(message => message.role === 'assistant' && message.reasoning_content === '规则读取完成'));
assert.ok(messages.some(message => message.role === 'user' && message.content.includes('请调用 submit_result')));
assert.equal(responses.length, 0);

assert.throws(() => api.completionInfo({
  choices: [{ finish_reason: 'length', message: { content: '' } }],
  usage: { completion_tokens: 100 }
}), /截断/);

console.log('PASS ai-editor-assistant protocol and limits');
