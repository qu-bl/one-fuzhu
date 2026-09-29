import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const c=JSON.parse(fs.readFileSync(new URL('contract.json',root)));
const context=vm.createContext({});vm.runInContext(c.inspection.program,context);
const inspect=input=>JSON.parse(context.__quInspect(input,c));
const minimal=JSON.parse(fs.readFileSync(new URL('fixtures/valid/minimal.json',root)));
for(const name of fs.readdirSync(new URL('fixtures/valid/',root))) {
 const source=fs.readFileSync(new URL('fixtures/valid/'+name,root),'utf8');
 const result=inspect({kind:'manifest',source});
 assert.deepEqual(result.errors,[],name);
 console.log(name,'PASS');
}
assert.deepEqual(inspect({kind:'applicationScript',source:'/** @id Demo */\ndefineQuScript({onStart(){}});'}).errors,[]);
assert.ok(inspect({kind:'applicationScript',source:'/** @id Demo */\n// defineQuScript({})'}).errors.length);
assert.ok(inspect({kind:'applicationScript',source:'/** @id Demo */\ndefineQuScript({onStart(});'}).errors.length);
const errors=inspect({kind:'manifest',source:JSON.stringify({...minimal,id:'bad',name:'',license:{copyright:'',text:''}})}).errors;
assert.ok(errors.length>=4,JSON.stringify(errors));
assert.equal(inspect({kind:'package',source:'',script:'',hasRive:false,hasPreview:false}).waiting.length,3);
console.log('PASS shared inspector entry, syntax, multiple errors, waiting state');

for(const name of fs.readdirSync(new URL('fixtures/invalid/',root))) {
 const result=inspect({kind:'manifest',source:fs.readFileSync(new URL('fixtures/invalid/'+name,root),'utf8')});
 assert.ok(result.errors.length>0,`invalid fixture accepted: ${name}`);
}
assert.ok(inspect({kind:'manifest',source:JSON.stringify({...minimal,privatePlatformField:true})}).warnings.length>0);
assert.equal(inspect({kind:'manifest',source:JSON.stringify({...minimal,privatePlatformField:true})}).errors.length,0);
console.log('PASS all invalid fixtures and nonblocking platform warnings');
const examples=JSON.parse(fs.readFileSync(new URL('../../../ai-rules/examples.json',import.meta.url)));
const app=examples.examples.applicationScript.applicationJavaScript;
assert.deepEqual(inspect({kind:'applicationScript',source:app}).errors,[], 'published application example');
assert.deepEqual(inspect({kind:'applicationScript',source:'/** @id ObserveDemo\n * @observe device.*\n */\ndefineQuScript({});'}).metadata.observedValues,['device.*']);
console.log('PASS published application example and wildcard observation');

const {testApplicationScript}=await import('./application-script.test.mjs');
testApplicationScript(inspect);

// Import/export and runtime UI now use this same checker, including normalized output.
const node={id:'value',type:'input',label:'数值',inputMode:'number',bindings:{value:{path:'app.demo.value',type:'number',default:0}}};
const mounted={id:'panel',slot:'scriptUi',presentation:'inline',components:[node]};
let result=inspect({kind:'ui',sets:mounted});
assert.deepEqual(result.errors,[]);
assert.equal(result.uiSets[0].presentation,c.ui.validation.mountedPresentation);
assert.equal(result.uiSets[0].title,'');
assert.equal(result.uiSets[0].components[0].description,'');
const missing=structuredClone(mounted);delete missing.components[0].bindings;
assert.ok(inspect({kind:'ui',sets:missing}).errors.some(x=>x.includes('.bindings')));
assert.ok(inspect({kind:'ui',sets:[]}).errors.length);
const defaults={id:'status',slot:'dialog',presentation:'dialog',components:[{id:'text',type:'text',label:'状态',bindings:{text:{path:'app.status',fallback:'就绪'}}}]};
result=inspect({kind:'ui',sets:defaults});
assert.deepEqual(result.errors,[]);
assert.equal(result.uiSets[0].presentation,c.ui.validation.dialogPresentation);
assert.equal(result.uiSets[0].components[0].text,'就绪');
const tooMany={id:'many',slot:'scriptUi',presentation:'inline',components:[{id:'group',type:'group',label:'组',layout:'column',children:Array.from({length:c.ui.validation.limits.childrenMax+1},(_,i)=>({id:'item'+i,type:'spacer',label:'占位'}))}]};
assert.ok(inspect({kind:'ui',sets:tooMany}).errors.some(x=>x.includes('.children')));
const extra=structuredClone(mounted);extra.components[0].vendorField=true;
result=inspect({kind:'ui',sets:extra});assert.deepEqual(result.errors,[]);assert.ok(result.warnings.length);
const badAudio=structuredClone(minimal);badAudio.assets.audio=[{id:'sound',file:'assets/../escape.mp3',usage:'effect',volume:1,loop:false}];
assert.ok(inspect({kind:'manifest',source:JSON.stringify(badAudio)}).errors.some(x=>x.includes('.file')));
const absent=structuredClone(minimal);absent.capabilities.observe=['device.vendorSensor.value'];
for(const platform of ['android','harmony','ios','macos']) {
 result=inspect({kind:'manifest',source:JSON.stringify(absent),platform});
 assert.deepEqual(result.errors,[]);assert.ok(result.warnings.length);
}
console.log('PASS runtime UI normalization, required bindings, limits, paths and platform warnings');

const templateScript=c.templates.applicationScript.replace('{{identity}}','TemplateSmoke');
const templateResult=inspect({kind:'applicationScript',source:templateScript});
assert.deepEqual(templateResult.errors,[]);
assert.equal(templateResult.metadata.identity,'TemplateSmoke');
assert.deepEqual(templateResult.metadata.observedValues,[]);
assert.deepEqual(inspect({kind:'manifest',source:c.templates.packageManifest}).errors,[]);
assert.deepEqual(inspect({kind:'packageScript',source:c.templates.packageScript}).errors,[]);
assert.deepEqual(inspect({kind:'package',source:c.templates.packageManifest,script:c.templates.packageScript,hasRive:true,hasPreview:true}).errors,[]);
console.log('PASS cloud creation templates and empty default subscriptions');

// Package files and application runtime resource tokens belong to different contexts.
const resourceChoice={id:'file',type:'choice',label:'文件',description:'选择文件',
  bindings:{value:{path:'ui.file',type:'resource',default:''}},
  options:[{label:'已选择的文件',resource:'qjres://script-owner/file-id'}]};
const appResourceSet={id:'files',slot:'scriptUi',presentation:'inline',components:[resourceChoice]};
assert.deepEqual(inspect({kind:'ui',sets:appResourceSet,context:'applicationScript'}).errors,[]);
const pkgResourceSet={id:'files',title:'文件',presentation: 'inline',components:[resourceChoice]};
assert.ok(inspect({kind:'ui',sets:pkgResourceSet,context:'resourcePackage'}).errors.some(x=>x.includes('.resource')));
const localResourceSet=structuredClone(pkgResourceSet);
localResourceSet.components[0].options[0].resource='assets/file.txt';
assert.deepEqual(inspect({kind:'ui',sets:localResourceSet,context:'resourcePackage'}).errors,[]);
// Entries and annotations remain specific to their own script kinds.
assert.deepEqual(inspect({kind:'packageScript',source:'defineResourcePackage({});'}).errors,[]);
assert.ok(inspect({kind:'applicationScript',source:'defineResourcePackage({});'}).errors.length);
assert.ok(inspect({kind:'packageScript',source:'/** @id Demo */\ndefineQuScript({});'}).errors.length);
// Application UI can omit package-only title/description, but must have a mounting slot.
assert.deepEqual(inspect({kind:'ui',sets:{id:'plain',slot:'scriptUi',presentation:'inline',components:[{id:'t',type:'text',label:'文字'}]}}).errors,[]);
assert.ok(inspect({kind:'ui',context:'resourcePackage',sets:{id:'plain',presentation: 'inline',components:[{id:'t',type:'text',label:'文字'}]}}).errors.length);
assert.ok(inspect({kind:'ui',sets:pkgResourceSet,context:'applicationScript'}).errors.some(x=>x.includes('.slot')));
console.log('PASS context boundaries: resource paths, entry points, annotations, UI requirements');

for(const type of ['string','enum','list','resource']) {
 const choice={id:'select',type:'choice',label:'选择',bindings:{value:{path:'app.select',type,default:type==='list'?[]:''}}};
 const check=item=>inspect({kind:'ui',sets:{id:'panel',slot:'scriptUi',presentation:'inline',components:[item]}});
 const field=c.ui.validation.valueSemantics.choiceOptionFieldByValueType[type];
 for(const dynamic of [false,true]) {
  const item=structuredClone(choice);
  const options=[{label:'缺少值'}];
  if(dynamic)item.bindings.options={path:'app.options',fallback:options};else item.options=options;
  assert.ok(check(item).errors.some(x=>x.includes(`.${field}`)),`${type} ${dynamic}`);
  options[0][field]=type==='resource'?'qjres://owner/file':'item';
  assert.deepEqual(check(item).errors,[],`${type} ${dynamic}`);
 }
}
console.log('PASS choice option values: static and binding fallbacks for every value type');

// Preserve the pre-migration UI boundaries: labels are short, content is not a label.
const longText='长对话正文'.repeat(2000);
const panel=item=>({kind:'ui',sets:{id:'regression',slot:'scriptUi',presentation:'inline',components:[item]}});
for(const item of [
 {id:'text',type:'text',label:'正文',text:longText},
 {id:'text',type:'text',label:'正文',bindings:{text:{path:'app.reply',fallback:longText}}},
 {id:'input',type:'input',label:'输入',inputMode:'multiline',placeholder:longText,
  bindings:{value:{path:'app.draft',type:'string',default:longText}}}
])assert.deepEqual(inspect(panel(item)).errors,[]);
assert.ok(inspect(panel({id:'text',type:'text',label:longText})).errors.length);
let nested={id:'leaf',type:'text',label:'内容',text:longText};
for(let i=0;i<c.ui.validation.limits.depthMax;i++)nested={id:'g'+i,type:'group',label:'组',layout:'column',children:[nested]};
assert.deepEqual(inspect(panel(nested)).errors,[]);
nested={id:'tooDeep',type:'group',label:'组',layout:'column',children:[nested]};
assert.ok(inspect(panel(nested)).errors.some(x=>x.includes('嵌套')));
const prose='/**\n * @id ProseTest\n * 通过 @observe 驱动 UI 更新\n * @observe 驱动\n * @observe app.actual.value\n */\ndefineQuScript({onStart(){ /* 使用 @observe 驱动 */ }});';
assert.deepEqual(inspect({kind:'applicationScript',source:prose}).metadata.observedValues,['app.actual.value']);

// Run the repository AI script's real UI factory with saved long conversation history.
const aiSource=fs.readFileSync(new URL('../../../ai-editor-assistant.js',import.meta.url),'utf8');
const aiMetadata=inspect({kind:'applicationScript',source:aiSource});
assert.deepEqual(aiMetadata.errors,[]);
assert.ok(aiMetadata.metadata.observedValues.every(x=>x.startsWith('app.aiSupport.')));
const uiRequests=[];
const aiContext=vm.createContext({defineQuScript(){},capture:sets=>uiRequests.push(JSON.parse(JSON.stringify(sets)))});
vm.runInContext(aiSource+`\nhistories.applicationScript=[{role:'user',content:${JSON.stringify(longText)}},{role:'assistant',content:${JSON.stringify(longText)}}]; histories.resourcePackage=histories.applicationScript;refreshConversationUI({ui:{declare:capture}});`,aiContext);
assert.equal(uiRequests.length,1);
assert.deepEqual(inspect({kind:'ui',sets:uiRequests[0]}).errors,[]);
console.log('PASS real AI conversation UI, long content/defaults, prose subscriptions and legacy depth boundary');
const fullUISource=fs.readFileSync(new URL('../../../all-ui-components-test.js',import.meta.url),'utf8');
assert.deepEqual(inspect({kind:'applicationScript',source:fullUISource}).errors,[]);
console.log('PASS existing four-slot full UI script');

const tagged=inspect({kind:'applicationScript',source:'/**\n * 使用 @id Wrong 和 @interval 1 作为说明\n * @id Correct\n * @interval 1000\n * @description 说明中提到 @id Other\n */\ndefineQuScript({});'});
assert.deepEqual(tagged.errors,[]);assert.equal(tagged.metadata.identity,'Correct');assert.equal(tagged.metadata.intervalMillis,1000);
const extension=inspect(panel({id:'text',type:'text',label:'正文',bindings:{vendorInfo:{anything:true}}}));
assert.deepEqual(extension.errors,[]);assert.ok(extension.warnings.some(x=>x.includes('vendorInfo')));
assert.ok(inspect(panel({id:'text',type:'text',label:'正文',bindings:{value:{path:'app.bad',type:'string',default:''}}})).errors.length);
const malformed=structuredClone(minimal);malformed.rive.viewModel='Main';malformed.rive.instance='Main';malformed.name='';malformed.capabilities.observe=['device.*'];
malformed.bindings=[{id:'test',qu:123,quType:'number',rive:['value'],riveType:'number',direction:'toRive',mode:'latest',required:true}];
const multiple=inspect({kind:'manifest',source:JSON.stringify(malformed)});
assert.ok(multiple.errors.some(x=>x.includes('.qu')));assert.ok(multiple.errors.some(x=>x.includes('name')));
assert.ok(inspect(panel({id:'bad',type:'constructor',label:'错误类型'})).errors.length);
console.log('PASS unified annotations, extension warnings, known binding errors, multi-error collection');

// Presentation is explicit and has no legacy scope/lifetime compatibility.
const currentSet={id:'newUi',slot:'scriptUi',presentation:'inline',components:[]};
assert.deepEqual(inspect({kind:'ui',sets:currentSet}).errors,[]);
const legacySet={id:'oldUi',slot:'scriptUi',scope:'persistent',components:[]};
assert.ok(inspect({kind:'ui',sets:legacySet}).errors.some(x=>x.includes('presentation')));
for (const presentation of ['persistent','runtime']) {
 assert.ok(inspect({kind:'ui',sets:{...currentSet,presentation}}).errors.length);
}
console.log('PASS explicit inline/dialog presentation; old UI scope rejected');
