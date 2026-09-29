import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('all-capabilities-test.js', root), 'utf8');
const contract = JSON.parse(fs.readFileSync(new URL('contracts/schema-v3/contract.json', root)));
const inspector = vm.createContext({}); vm.runInContext(contract.inspection.program, inspector);
const inspect = input => JSON.parse(inspector.__quInspect(input, contract));
assert.deepEqual(inspect({kind:'applicationScript',source}).errors, []);
const runtimePath = process.env.QU_RUNTIME || '/Users/qubolin/Desktop/rive/RiveLab/one/Qu/JavaScript/JavaScriptCore/QuRuntime.js';
const values = new Map(), observers = new Map(), store = new Map(), operations = new Set();
const schemas = [], triggers = new Set(), accessors = new Set();
let hooks, ctx, currentUI, failNetwork = false;
const emit = (id, value) => queueMicrotask(() => ctx.__runtimeDispatch(id, JSON.stringify(value)));
const notify = (path, v) => { for (const [id, x] of observers) if (x.path === path) emit(id, v); };
// Native dictionaries may serialize object keys in a different order; arrays retain order.
function reorder(value) {
  if (Array.isArray(value)) return value.map(reorder);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, reorder(value[k])]));
  return value;
}
function handle(method, a) {
  operations.add(method);
  switch(method) {
    case 'values.define': {
      const [path,type,v,options] = a; accessors.add(type);
      assert.match(path, /^[A-Za-z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*$/);
      assert.ok(options.label); assert.ok(!values.has(path) || values.get(path).type === type);
      values.set(path,{type,value:v}); return {created:true};
    }
    case 'values.get': assert.ok(values.has(a[0]), a[0]); return reorder(values.get(a[0]).value);
    case 'values.set': {
      const field = values.get(a[0]); assert.ok(field,a[0]); assert.equal(field.type,a[1]);
      if (field.type === 'json') assert.ok(a[2] && typeof a[2] === 'object');
      field.value = a[2]; notify(a[0],a[2]); return true;
    }
    case 'values.list': return [...values].map(([path,v]) => ({path,type:v.type,writable:true}));
    case 'values.remove': values.delete(a[0]); return true;
    case 'values.observe': assert.ok(values.has(a[1]),a[1]); observers.set(a[0],{path:a[1]}); return true;
    case 'cancel': observers.delete(a[0]); return true;
    case 'values.trigger': triggers.add(a[1]); emit(a[0],{ok:true,value:true}); return true;
    case 'ui.declare': {
      const r=inspect({kind:'ui',context:'applicationScript',sets:a[0]});
      assert.deepEqual(r.errors,[]); assert.deepEqual(r.warnings,[]);
      function bindings(nodes) {
        for (const c of nodes) {
          for (const [kind,b] of Object.entries(c.bindings || {})) {
            assert.ok(values.has(b.path),'missing binding '+b.path);
            if (kind === 'value') assert.equal(values.get(b.path).type,b.type==='list'?'json':b.type);
          }
          if(c.children)bindings(c.children);
        }
      }
      a[0].forEach(s=>bindings(s.components));
      currentUI=a[0]; schemas.push(a[0]); return true;
    }
    case 'ui.clear': currentUI=[]; return true;
    case 'ui.open': {
      assert.ok(currentUI.find(s => s.slot==='dialog').components.some(c=>c.id===a[1] && !['group','text','spacer'].includes(c.type)),a[1]);
      emit(a[0],{ok:true,value:true}); return true;
    }
    case 'storage.get': return store.has(a[0])?reorder(store.get(a[0])):a[1];
    case 'storage.set': store.set(a[0],a[1]); return true;
    case 'storage.remove': store.delete(a[0]); return true;
    case 'storage.clear': store.clear(); return true;
    case 'storage.keys': return [...store.keys()];
    case 'network.request': case 'network.download': case 'network.upload':
      emit(a[0],failNetwork?{ok:false,error:'ORIGINAL NETWORK ERROR'}:{ok:true,value:{status:200,body:'{}',token:'qjres://lab/download'}}); return true;
    case 'network.stream': emit(a[1],{text:'test'}); emit(a[0],{ok:true,value:{status:200}}); return true;
    case 'network.webSocket.open': emit(a[1],{type:'open'}); return true;
    case 'network.webSocket.send': case 'network.webSocket.close': return true;
    case 'resources.token': return 'qjres://lab/resource';
    case 'resources.readText': return '{"test":true}';
    case 'resources.readBinary': return 'AH+A/w==';
    case 'rive.state': return {artboard:'Test'};
    case 'rive.load': case 'rive.font.set': return true;
    case 'editor.read': return a[0]==='applicationScript'?source:a[1].file==='manifest'?'{}':'defineResourcePackage({});';
    case 'editor.apply': return true;
    default: throw new Error('unhandled '+method);
  }
}
ctx=vm.createContext({
  defineQuScript(value){hooks=value;},
  __hostAccessorTypes:contract.script.valueAccessorTypes,
  __hostOptionFields:contract.script.operationOptionFields,
  __javaScriptRuntimeCall(method,args){
    try{return JSON.stringify({ok:true,value:handle(method,JSON.parse(args))});}
    catch(e){return JSON.stringify({ok:false,error:String(e.stack)});}
  }
});
vm.runInContext(fs.readFileSync(runtimePath,'utf8'),ctx);
vm.runInContext(source+'\nglobalThis.lab={results,fields,action,seed,PUBLIC_FIELDS,sameData,errorText,assertData};',ctx);
assert.equal(ctx.lab.sameData({ a: 1, nested: { x: true, y: [1, 2] } }, { nested: { y: [1, 2], x: true }, a: 1 }), true);
for (const [a, b] of [[{a:1},{a:'1'}], [[1,2],[2,1]], [{a:1},{b:1}], [{a:1},{a:1,b:2}], [null,{}], [[1],{'0':1}]]) assert.equal(ctx.lab.sameData(a,b),false);
assert.equal(ctx.lab.errorText({toString(){return '原始错误说明';},stack:'invoke@runtime.js:7:38'}),'原始错误说明\ninvoke@runtime.js:7:38');
assert.throws(() => ctx.lab.assertData({a:2},{a:1},'回读不同'), /预期：.*\n实际：/);
for(const [path,type] of Object.entries(contract.qvmi.fieldTypes)) values.set(path,{type,value:type==='boolean'?false:type==='number'?1:type==='color'?'#6750A4':'test'});
await hooks.onStart(ctx.qu);
await Promise.resolve(); vm.runInContext('eventDeadline = 0;',ctx); hooks.onInterval();
assert.equal(ctx.lab.results['事件/连续三次同值'].state,'通过');
for(const [name,r] of Object.entries(ctx.lab.results)) assert.notEqual(r.state,'失败',name+': '+r.detail);
assert.equal(schemas.length,1);
assert.equal(new Set(currentUI.map(x=>x.slot)).size,4);
const types=new Set(); function walk(nodes){for(const c of nodes){types.add(c.type);if(c.children)walk(c.children);}}
currentUI.forEach(s=>walk(s.components));
assert.deepEqual([...types].sort(),Object.keys(contract.ui.typeFields).sort());
for(const [k,v] of Object.entries({uploadUrl:'https://example.com/upload',socketUrl:'wss://example.com/socket',resource:'qjres://lab/test',resourceId:'test',audioId:'test',fontPath:'font',fontId:'font',artboard:'Test'})) ctx.lab.fields[k].value=v;
for(const id of ['mutate','save','restore','sensors','stopSensors','request','download','stream','upload','socketOpen','socketSend','socketClose','notify','cancelNotify','alarm','cancelAlarm','logs','resources','rive','audio','readEditor','writeApp','writePackage','brand','restoreBrand','clearUI','clearStore',...['text','multiline','password','number','toggle','slider','choice','file'].map(k=>'dialog_'+k)]){
  if(id.startsWith('dialog_'))hooks.onInterval();
  await hooks.onUiAction(id,ctx.qu); await Promise.resolve();
}
for(const [name,r] of Object.entries(ctx.lab.results)) assert.notEqual(r.state,'失败',name+': '+r.detail);
assert.deepEqual([...accessors].sort(),[...contract.script.valueAccessorTypes].sort());
assert.deepEqual(contract.script.hostOperations.filter(x=>!operations.has(x)),[]);
assert.deepEqual(contract.qvmi.triggers.filter(x=>!triggers.has(x)),[]);
failNetwork=true; await hooks.onUiAction('request',ctx.qu);
assert.ok(ctx.lab.results['HTTP/text'].detail.includes('ORIGINAL NETWORK ERROR'));
assert.equal(ctx.lab.results['HTTP/text'].state,'失败');
await hooks.onStop(); assert.equal(observers.size,0);
console.log('PASS: cloud inspector + actual QuRuntime wrapper; all data types, UI types, 4 slots, 32 host operations, 11 triggers, error preservation and observer cleanup. Native host is mocked.');
