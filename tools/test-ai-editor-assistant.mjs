import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../ai-editor-assistant.js', import.meta.url), 'utf8');
const context = vm.createContext({ defineQuScript() {} });
vm.runInContext(source + `
globalThis.aiTest = {
  serviceEndpoints,
  completionPayload,
  deliveryTool,
  parseAssistantReply,
  safeHistory,
  utf8Bytes,
  completionInfo,
  requestWithRules,
  setRequestCompletion(value) { requestCompletion = value; },
  setReadRule(value) { readRule = value; }
};`, context);

const api = context.aiTest;
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
assert.equal(deliveryPayload.tool_choice.function.name, 'submit_result');
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

function response(message, finishReason = 'tool_calls') {
  return { body: { choices: [{ finish_reason: finishReason, message }] } };
}
function call(id, name, args) {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}

const responses = [
  response({ content: '先直接回答', tool_calls: [] }, 'stop'),
  response({ content: '', tool_calls: [call('bad', 'read_rules', { path: 'missing.json' })] }),
  response({ content: '', tool_calls: [call('good', 'read_rules', { path: 'ai-rules/README.md' })] }),
  response({ content: '规则已读取', tool_calls: [] }, 'stop'),
  response({
    content: '',
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
assert.equal(responses.length, 0);

assert.throws(() => api.completionInfo({
  choices: [{ finish_reason: 'length', message: { content: '' } }],
  usage: { completion_tokens: 100 }
}), /截断/);

console.log('PASS ai-editor-assistant protocol and limits');
