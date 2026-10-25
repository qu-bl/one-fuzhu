import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../',import.meta.url);
const read = name => fs.readFileSync(new URL(name,root),'utf8');
const contract=JSON.parse(read('contracts/schema-v3/contract.json'));
const rive=contract.script.rive;
assert.equal(rive.protocol,1);
assert.equal(rive.transport.newHostOperationsRequired,false);
for(const operation of [rive.transport.call,rive.transport.observe])assert.ok(contract.script.hostOperations.includes(operation));
for(const platform of ['apple','android','harmony']) {
 const c=rive.availability.currentPlayerFlags[platform],a=rive.availability.independentObjectFlags[platform];
 assert.equal(c.nestedObserve,false);
 assert.equal(c.listObserve,platform==='harmony');
 assert.equal(c.blobSet,platform!=='android');
 assert.equal(c.globalClear,platform!=='apple');
 assert.equal(a.sharedWorkerFiles,true);
 assert.equal(a.keyInput,platform==='harmony');
 assert.equal(a.systemFontDecode,platform==='apple');
}
assert.deepEqual(rive.parameters.keyInput.currentPlayerFields,['key','modifiers','pressed','repeat']);
assert.deepEqual(rive.parameters.keyInput.independentStateMachineFields,['key','modifiers','isPressed','isRepeat']);
assert.equal(rive.parameters.render.maximumDimension,4096);
const inspector=vm.createContext({});vm.runInContext(contract.inspection.program,inspector);
const inspect=input=>JSON.parse(inspector.__quInspect(input,contract));
const folder=rive.examples.package+'/';
const source=read(folder+'main.js'),manifest=read(folder+'resource-package.json');
for(const platform of ['ios','macos','android','harmony']) {
 const result=inspect({kind:'package',source:manifest,script:source,hasRive:true,hasPreview:true,platform});
 assert.deepEqual(result.errors,[],platform);assert.deepEqual(result.warnings,[],platform);
}
assert.deepEqual(JSON.parse(manifest).values,[]);assert.deepEqual(JSON.parse(manifest).bindings,[]);
// Test lifecycle behavior and error cleanup of the published source example. This is not native rendering.
for(const scenario of ['success','skipped','renderFailure','secondOpenFailure','missingCapability']) {
 let hooks,count=0,ownerClosed=0,active=new Set(),rendered=false;
 const qu={rive:{files:{capabilities:async()=>({sharedWorkerFiles:scenario!=='missingCapability',offscreenRender:true}),open:async()=>open()},workers:{create:async()=>worker}}};
 const state={setFit:async()=>{},advance:async seconds=>assert.equal(seconds,1/60),render:async()=>{rendered=true;if(scenario==='renderFailure')throw Error('native render failed');return scenario==='skipped'?{skipped:true}:{skipped:false,width:256,height:256,format:'rgba8',pixels:new Uint8Array(256*256*4)};}};
 const worker={open:async()=>open(),close:async()=>{ownerClosed++;}};
 const open=async()=>{if(++count===2&&scenario==='secondOpenFailure')throw Error('native open failed');const id=count;active.add(id);return {artboardNames:async()=>['Real artboard'],createArtboard:async name=>{assert.equal(name,'Real artboard');return {stateMachineNames:async()=>['Real state'],createStateMachine:async name=>{assert.equal(name,'Real state');return state;}};},close:async()=>active.delete(id)};};
 vm.runInNewContext(source,{defineResourcePackage:value=>hooks=value});
 if(['renderFailure','secondOpenFailure','missingCapability'].includes(scenario))await assert.rejects(hooks.activate(qu));
 else {await hooks.activate(qu);assert.equal(active.size,1);assert.ok(rendered);}
 await hooks.deactivate();assert.equal(active.size,0);assert.equal(ownerClosed,scenario==='missingCapability'?0:1);
}
console.log('PASS Rive contract, platform boundaries, paired package example and lifecycle error cleanup');
// Optional local check against the actual shipped bootstrap; CI does not need application sources.
if(process.argv[2]) {
 let context,counter=0;
 const reply=(id,value)=>queueMicrotask(()=>context.__runtimeDispatch(id,JSON.stringify({ok:true,value})));
 const command=(id,operation,handle,args)=>{
  let value=true;
  if(operation==='root'||operation==='create')value='instance-'+(++counter);
  if(operation==='objects.worker.create')value='worker:one';
  if(operation==='objects.open')value='object:file:';
  if(operation==='objects.artboard.create')value='object:file:board';
  if(operation==='objects.artboard.state.create')value='object:file:state';
  if(operation.startsWith('asset.'))value='asset-'+(++counter);
  reply(id,value);return {ok:true,value:true};
 };
 context=vm.createContext({__hostAccessorTypes:contract.script.valueAccessorTypes,__hostOptionFields:contract.script.operationOptionFields,__javaScriptRuntimeCall:(method,encoded)=>{const args=JSON.parse(encoded);if(method==='rive.instance.call')return JSON.stringify(command(...args));throw Error(method);}});
 vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),context);
 const q=context.qu.rive,instance=await q.viewModelInstance(),worker=await q.workers.create(),file=await worker.open('assets/scene.riv'),board=await file.createArtboard(),state=await board.createStateMachine();
 const asset=await q.assets.decode('image','assets/image.webp'),artboardResource=await q.assets.artboard();
 const objects={'qu.rive':q,'qu.rive.file':q.file,'qu.rive.files':q.files,'qu.rive.workers':q.workers,instance,scalar:instance.number('Number'),trigger:instance.trigger('Trigger'),resourceProperty:instance.image('Image'),nested:instance.viewModel('Nested'),list:instance.list('List'),global:q.globalViewModel('Global'),legacyFont:q.font('Font'),assets:q.assets,resource:asset,artboardResource,worker,file,artboard:board,stateMachine:state};
 function leafMethods(o,prefix=''){return Object.entries(o).flatMap(([k,v])=>typeof v==='function'?[prefix+k]:v&&typeof v==='object'?leafMethods(v,prefix+k+'.'):[]);}
 for(const [receiver,methods] of Object.entries(rive.api)) {
  const object=objects[receiver];assert.ok(object,receiver);
  for(const method of Object.keys(methods))assert.equal(typeof method.split('.').reduce((o,k)=>o?.[k],object),'function',receiver+'.'+method);
  let actual=leafMethods(object);
  if(receiver==='qu.rive')actual=actual.filter(x=>!['file.','files.','workers.','assets.'].some(p=>x.startsWith(p)));
  if(receiver==='file')actual=actual.filter(x=>!x.startsWith('assets.'));
  if(receiver==='artboardResource')actual=actual.filter(x=>!['equals','register','close'].includes(x));
  assert.deepEqual(actual.sort(),Object.keys(methods).sort(),'Exact public method coverage: '+receiver);
 }
 console.log('PASS exhaustive public method coverage against shipped JS bootstrap');
}
