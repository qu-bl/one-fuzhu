import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const html=readFileSync(new URL('../../tools/one-fuzhu-admin.html',import.meta.url),'utf8');
const between=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
let checks=0;
async function test(name,run){try{await run();checks++;}catch(error){error.message=`${name}: ${error.message}`;throw error;}}
const urls=vm.createContext({location:{protocol:'https:'},CONFIG:{owner:'qu-bl',repo:'one-fuzhu'},uploadPreviews:new Map()});
vm.runInContext(between('function siteAssetUrl(', '// 加版本号'),urls);
await test('uploaded image versions survive preview URL resolution after reopening the admin',()=>{
 assert.equal(urls.siteAssetUrl('./assets/banner.avif?v=new#image'),'../site/assets/banner.avif?v=new#image');
});
await test('external signed image URLs preserve their query strings',()=>{
 assert.equal(urls.siteAssetUrl('https://example.com/image.avif?signature=test&v=2'),'https://example.com/image.avif?signature=test&v=2');
});
await test('staged local previews take precedence regardless of version',()=>{
 urls.uploadPreviews.set('site/assets/banner.avif','blob:staged');
 assert.equal(urls.siteAssetUrl('./assets/banner.avif?v=new'),'blob:staged');
 urls.uploadPreviews.clear();
});
await test('desktop standalone image previews preserve versions on their public URLs',()=>{
 urls.location.protocol='file:';
 assert.equal(urls.siteAssetUrl('./assets/banner.avif?v=3'),'https://qu-bl.github.io/one-fuzhu/site/assets/banner.avif?v=3');
});
function harness({fail=false}={}){
 const pendingUploads=new Map(),uploadPreviews=new Map(),requests=[],statuses=[];
 const content={cards:[{id:'sample',bannerCover:'./assets/banner-sample.avif?v=2'}]};
 const contentText=JSON.stringify(content)+'\n';
 const hash=createHash('sha256').update(contentText).digest('hex');
 const docs={content:contentText,contentVersion:JSON.stringify({version:hash})+'\n',contract:'{}',release:'{}'};
 const state={pendingUploads,uploadPreviews,requests,statuses,content,loadedTexts:{content:'old',contract:'{}',release:'{}'},loadedHeadSha:'old-head',token:'test-only',busy:false,activeView:'cards',clean:false,
  Blob,Uint8Array,btoa,atob,TextEncoder,TextDecoder,URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},
  CONFIG:{branch:'main',paths:{content:'site/data/content.json',contentVersion:'site/data/version.json',contract:'contracts/contract.json',release:'contracts/release.json',translation:'rive-editor/translation.json'}},REPO_API:'https://api.github.com/repos/test/example',
  setBusy(value){thisBusy(value);},setStatus(message,kind){statuses.push({message,kind});},
  buildPublishDocuments:async()=>docs,staleUploadPaths:async()=>[],renderAll(){},renderTranslations(){},
  gh:async(method,url,body)=>{
   requests.push({method,url,body});
   if(fail&&method==='POST')throw Error('network failed');
   if(url.includes('/git/ref/heads/'))return {object:{sha:'old-head'}};
   if(url.endsWith('/git/commits/old-head'))return {tree:{sha:'base-tree'}};
   if(url.endsWith('/git/blobs'))return {sha:'blob-'+requests.length};
   if(url.endsWith('/git/trees'))return {sha:'new-tree'};
   if(url.endsWith('/git/commits'))return {sha:'new-commit'};
   if(method==='PATCH')return {object:{sha:body.sha}};
   throw Error('Unexpected request '+url);
  },
 };
 const ctx=vm.createContext(state);
 function thisBusy(value){ctx.busy=value;}
 ctx.markClean=()=>{ctx.clean=true;};
 vm.runInContext(between('function b64encode(', 'async function sha256(')+between('function bytesToBase64(', '// 与官网保持相同')+between('async function stagePreparedUpload(', '\nfunction stageUpload(')+between('async function publishFiles(', '// 每个上传基名')+between('async function save(', '\nlet initialized'),ctx);
 const upload=()=>ctx.stagePreparedUpload({base:'site/assets/banner-sample'},{file:new Blob(['AVIF'],{type:'image/avif'}),ext:'.avif',backup:{file:new Blob(['WEBP'],{type:'image/webp'}),ext:'.webp'}});
 return {ctx,requests,statuses,pendingUploads,upload};
}
await test('saving a staged banner includes its JSON reference and both real image payloads in one commit',async()=>{
 const h=harness();await h.upload();await h.ctx.save();
 const tree=h.requests.find(x=>x.url.endsWith('/git/trees')).body;
 assert.equal(tree.base_tree,'base-tree');
 assert.deepEqual(Array.from(tree.tree,x=>x.path).sort(),['site/assets/banner-sample.avif','site/assets/banner-sample.webp','site/data/content.json','site/data/version.json']);
 const blobs=h.requests.filter(x=>x.url.endsWith('/git/blobs')).map(x=>Buffer.from(x.body.content,'base64').toString());
 assert.ok(blobs.includes('AVIF'));assert.ok(blobs.includes('WEBP'));
 const contentBlob=blobs.find(x=>x.includes('./assets/banner-sample.avif?v=2'));
 assert.ok(contentBlob);
 assert.ok(blobs.includes(JSON.stringify({version:createHash('sha256').update(contentBlob).digest('hex')})+'\n'));
 assert.equal(h.requests.at(-1).method,'PATCH');assert.equal(h.requests.at(-1).body.force,false);
 assert.equal(h.pendingUploads.size,0);assert.equal(h.ctx.clean,true);
});
await test('a failed save retains both image variants and leaves the draft retryable',async()=>{
 const h=harness({fail:true});await h.upload();await h.ctx.save();
 assert.equal(h.pendingUploads.size,2);assert.equal(h.ctx.clean,false);assert.equal(h.ctx.busy,false);
 assert.match(h.statuses.at(-1).message,/发布失败/);assert.equal(h.statuses.at(-1).kind,'err');
 assert.equal(h.requests.some(x=>x.method==='PATCH'),false);
});
function selectionHarness() {
 const callbacks=[],revoked=[],inputs=[];
 let resolvePrepared,rejectPrepared;
 const prepared=new Promise((resolve,reject)=>{resolvePrepared=resolve;rejectPrepared=reject;});
 const ctx=vm.createContext({busy:false,processingUpload:false,activeView:'cards',processingImagePreviews:new Map(),syncPreview(){},callbacks,
  el(){const node={events:{},files:[{name:'sample.png',size:5}],removed:false,addEventListener(type,run){this.events[type]=run;},remove(){this.removed=true;},click(){}};inputs.push(node);return node;},
  document:{body:{append(){}}},URL:{createObjectURL:()=> 'blob:selection',revokeObjectURL:url=>revoked.push(url)},
  setStatus(message){callbacks.push(['status',message]);},setBusy(value){ctx.busy=value;},markDirty(){callbacks.push(['dirty']);},
  prepareUpload:()=>prepared,stagePreparedUpload:async()=>{callbacks.push(['stage']);return {path:'site/assets/banner.avif',bytes:5,count:2};},
 });
 vm.runInContext(between('function stageUpload(', '\nfunction uploadHeroRive('),ctx);
 const start=(onPreview=()=>callbacks.push(['preview']),onError=error=>callbacks.push(['error',error.message]))=>{
  ctx.stageUpload({base:'site/assets/banner',convertToAvif:true,exts:['.png']},path=>callbacks.push(['committed',path]),{onPreview,onError});
  return inputs.at(-1).events.change();
 };
 return {ctx,inputs,callbacks,revoked,start,resolvePrepared,rejectPrepared};
}
await test('selection shows its local preview immediately while conversion is pending',async()=>{
 const h=selectionHarness(),task=h.start();
 assert.equal(h.callbacks.some(x=>x[0]==='preview'),true);
 assert.equal(h.callbacks.some(x=>x[0]==='committed'),false);
 assert.equal(h.inputs[0].removed,false);assert.equal(h.ctx.busy,true);assert.equal(h.ctx.processingUpload,true);
 assert.equal(h.ctx.processingImagePreviews.get('site/assets/banner'),'blob:selection');
 h.resolvePrepared({file:{size:5}});await task;
 assert.equal(h.callbacks.some(x=>x[0]==='committed'),true);
 assert.ok(h.callbacks.findIndex(x=>x[0]==='preview')<h.callbacks.findIndex(x=>x[0]==='committed'));
 assert.equal(h.inputs[0].removed,true);assert.equal(h.ctx.busy,false);assert.equal(h.ctx.processingUpload,false);
 assert.deepEqual(h.revoked,['blob:selection']);assert.equal(h.ctx.processingImagePreviews.size,0);
});
await test('opening the JSON panel during conversion cannot save an old image reference',async()=>{
 const h=selectionHarness(),task=h.start();
 h.ctx.activeView='raw';h.ctx.refreshRaw=()=>h.callbacks.push(['raw-refreshed']);
 h.resolvePrepared({file:{size:5}});await task;
 const commit=h.callbacks.findIndex(x=>x[0]==='committed'),refresh=h.callbacks.findIndex(x=>x[0]==='raw-refreshed'),dirty=h.callbacks.findIndex(x=>x[0]==='dirty');
 assert.ok(commit>=0&&refresh>commit&&dirty>refresh);
});
await test('conversion failure reports the actual cause, releases its preview and never stages an invalid image',async()=>{
 const h=selectionHarness(),task=h.start();h.rejectPrepared(Error('decoder failed'));await task;
 assert.equal(h.callbacks.some(x=>x[0]==='committed'||x[0]==='stage'||x[0]==='dirty'),false);
 assert.ok(h.callbacks.some(x=>x[0]==='error'&&x[1]==='decoder failed'));
 assert.equal(h.ctx.busy,false);assert.equal(h.ctx.processingUpload,false);assert.equal(h.inputs[0].removed,true);
 assert.deepEqual(h.revoked,['blob:selection']);assert.equal(h.ctx.processingImagePreviews.size,0);
});
await test('uploads without image preview hooks retain the existing Rive and notice workflow',async()=>{
 const h=selectionHarness();h.ctx.stageUpload({exts:['.png']},()=>h.callbacks.push(['committed']));
 const task=h.inputs[0].events.change();h.resolvePrepared({file:{size:5}});await task;
 assert.equal(h.callbacks.some(x=>x[0]==='committed'),true);assert.equal(h.ctx.busy,false);assert.equal(h.inputs[0].removed,true);
});
await test('the full website preview can show a new image during conversion without mutating saved content',()=>{
 const source={cards:[{id:'sample',cover:'./assets/cover-sample.avif',bannerCover:''}],notice:{image:'./assets/notice.avif'}};
 const previews=new Map([['site/assets/banner-sample','blob:original-image']]);
 const ctx=vm.createContext({content:source,processingImagePreviews:previews,uploadPreviews:new Map(),CONFIG:{uploads:{cardCover:{},noticeImage:{base:'site/assets/notice'}}}});
 vm.runInContext(between('function safeId(', 'function uploadCardCover(')+between('function previewContent(', 'function syncPreview('),ctx);
 const original=JSON.stringify(source),draft=ctx.previewContent();
 assert.equal(draft.cards[0].bannerCover,'blob:original-image');assert.equal(JSON.stringify(source),original);
 previews.clear();assert.equal(ctx.previewContent().cards[0].bannerCover,'');
});
console.log(`${checks} admin upload/save checks passed.`);
