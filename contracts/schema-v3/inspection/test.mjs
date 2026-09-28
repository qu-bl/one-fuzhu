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
const mounted={id:'panel',slot:'scriptUi',components:[node]};
let result=inspect({kind:'ui',sets:mounted});
assert.deepEqual(result.errors,[]);
assert.equal(result.uiSets[0].scope,c.ui.validation.mountedScope);
assert.equal(result.uiSets[0].title,'');
assert.equal(result.uiSets[0].components[0].description,'');
const missing=structuredClone(mounted);delete missing.components[0].bindings;
assert.ok(inspect({kind:'ui',sets:missing}).errors.some(x=>x.includes('.bindings')));
assert.ok(inspect({kind:'ui',sets:[]}).errors.length);
const defaults={id:'status',slot:'dialog',components:[{id:'text',type:'text',label:'状态',bindings:{text:{path:'app.status',fallback:'就绪'}}}]};
result=inspect({kind:'ui',sets:defaults});
assert.deepEqual(result.errors,[]);
assert.equal(result.uiSets[0].scope,c.ui.validation.dialogScope);
assert.equal(result.uiSets[0].components[0].text,'就绪');
const tooMany={id:'many',slot:'scriptUi',components:[{id:'group',type:'group',label:'组',layout:'column',children:Array.from({length:c.ui.validation.limits.childrenMax+1},(_,i)=>({id:'item'+i,type:'spacer',label:'占位'}))}]};
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
