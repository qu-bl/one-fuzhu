// Annotation and UI cases moved from Android to the shared checker.
import assert from 'node:assert/strict';
export function testApplicationScript(inspect) {
  const script=source=>inspect({kind:'applicationScript',source});
  const sources=[
  "/**\n * @id DailyColor\n * @description 每日颜色\n * @interval 1000\n * @observe app.theme.brand\n * @observe app.theme.brand\n * @observe device.battery.level\n */\ndefineQuScript({});",
  "/**\n * @id ai-copilot\n * @description 带身份的脚本\n */\ndefineQuScript({});",
  "/**\n * @id panel\n * @ui\n * [\n *   {\n *     \"slot\": \"applicationScript\",\n *     \"id\": \"main\",\n *     \"title\": \"面板\",\n *     \"components\": [\n *       { \"id\": \"title\", \"type\": \"text\", \"label\": \"标题\", \"description\": \"\", \"text\": \"你好\" },\n *       { \"id\": \"value\", \"type\": \"input\", \"inputMode\": \"number\", \"label\": \"数值\", \"description\": \"\",\n *         \"bindings\": { \"value\": { \"path\": \"app.panel.value\", \"type\": \"number\", \"default\": 0 } } }\n *     ]\n *   }\n * ]\n */\ndefineQuScript({});"
];
  for(const source of sources)assert.deepEqual(script(source).errors,[]);
  const metadata=script(sources[0]).metadata;
  assert.equal(metadata.identity,'DailyColor');
  assert.equal(metadata.intervalMillis,1000);
  assert.deepEqual(metadata.observedValues,['app.theme.brand','device.battery.level']);
  const ui=script(sources[2]).metadata.uiSets[0];
  assert.equal(ui.slot,'applicationScript');
  assert.deepEqual(ui.components.map(x=>x.type),['text','input']);
  assert.equal(ui.components[1].bindings.value.path,'app.panel.value');
  for(const id of ['1bad','a'.repeat(65),'abc.def'])assert.ok(script(`/** @id ${id} */ defineQuScript({});`).errors.some(x=>x.startsWith('@id')));
  assert.ok(script('/** @description x */ defineQuScript({});').errors.some(x=>x.startsWith('@id')));
  assert.ok(script('/** @id TestScript @interval 999999999999999999999999999 */ defineQuScript({});').errors.some(x=>x.startsWith('@interval')));
  assert.ok(script('/** @id TestScript @interval 999 */').errors.length>=2);
  assert.deepEqual(script('/** @id TestScript @interval 0 */ defineQuScript({});').errors,[]);
  assert.deepEqual(script('/** @id TestScript @ui 见文档 */ defineQuScript({});').metadata.uiSets,[]);
  assert.ok(script('/**\n * @id TestScript\n * @ui\n * 不是 JSON\n */ defineQuScript({});').errors.some(x=>x.startsWith('@ui')));
  const uiText=[{id:'panel',slot:'scriptUi',components:[{id:'text',type:'text',label:'提示',
    text:'说明 @id Forged @observe device.battery.level @interval 999999'}]}];
  const withUI=header=>`/**\n${header}\n * @ui\n${JSON.stringify(uiText)}\n */\ndefineQuScript({});`;
  const isolated=script(withUI(' * @id Real'));
  assert.deepEqual(isolated.errors,[]);
  assert.equal(isolated.metadata.identity,'Real');
  assert.equal(isolated.metadata.intervalMillis,0);
  assert.deepEqual(isolated.metadata.observedValues,[]);
  assert.equal(isolated.metadata.uiSets[0].components[0].text,uiText[0].components[0].text);
  assert.ok(script(withUI('')).errors.some(x=>x.startsWith('@id')));
  const realObserve=script(withUI(' * @id Real\n * @observe device.battery.level\n * @interval 1000'));
  assert.deepEqual(realObserve.errors,[]);
  assert.deepEqual(realObserve.metadata.observedValues,['device.battery.level']);
  assert.equal(realObserve.metadata.intervalMillis,1000);
  console.log('PASS shared annotation, interval, identity, and declared UI cases');
}
