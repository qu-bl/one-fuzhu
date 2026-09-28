import {parse} from 'acorn';
import * as schemas from './.generated/schema.mjs';
const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const list=v=>Array.isArray(v)?v:[];
const text=v=>typeof v==='string'&&v.trim().length>0;
const at=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function run(input, c) {
  const errors=[], warnings=[], waiting=[];
  let document=null, uiSets=null;
  const add=(path,message)=>errors.push(`${path}: ${message}`);
  const warn=(path,message)=>warnings.push(`${path}: ${message}`);
  const unique=(items,path)=>{const seen=new Set(); for(const item of items) {if(seen.has(item)) add(path,`重复值 ${item}`);seen.add(item);}};
  const pattern=(value,name,path)=>{if(typeof value!=='string'|| !new RegExp(c.manifest.validation.patterns[name]).test(value)) add(path,`格式不符合 ${name}`);};
  const unknown=(o,fields,path)=>{if(!object(o))return;for(const key of Object.keys(o)) if(!fields.includes(key)) (c.compatibility.unknownObjectFields==='warn'?warn:add)(`${path}.${key}`,'未声明的附加字段');};
  const schema=(validator,value,path)=>{
    validator(value);
    for(const e of validator.errors||[]) {
      // Component branches are checked separately, avoiding oneOf noise.
      if(e.schemaPath.includes('/$defs/uiComponent/')||e.keyword==='oneOf'&&e.instancePath.includes('/components')) continue;
      const suffix=e.instancePath.replaceAll('/','.');
      const field=e.keyword==='required'?`.${e.params.missingProperty}`:e.params.propertyName?`.${e.params.propertyName}`:e.params.additionalProperty?`.${e.params.additionalProperty}`:'';
      add(path+suffix+field, `${e.keyword} · ${e.message}`);
    }
  };
  const safeResource=path=>typeof path==='string'&&path.startsWith(c.manifest.validation.packageFiles.assetPrefix)&&!/[\\\0]/.test(path)&&path.split('/').every(x=>x&&x!=='.'&&x!=='..');
  function normalizeUI(sets) {
    function normalize(item) {
      item.bindings ??= {};
      for(const key of ['description','text','placeholder','min','max','step','options']) {
        if(item[key]===undefined&&item.bindings[key]?.fallback!==undefined)item[key]=item.bindings[key].fallback;
      }
      item.description ??= '';
      for(const child of list(item.children))normalize(child);
    }
    for(const set of sets){set.title ??= '';for(const item of list(set.components))normalize(item);}
    return sets;
  }
  function components(items,set,context,path,depth,ids,allValues) {
    const uv=c.ui.validation, sem=uv.valueSemantics;
    for(const [i,item] of list(items).entries()) {
      const p=`${path}[${i}]`;
      if(!object(item)) {add(p,'组件必须是对象');continue;}
      if(!c.ui.typeFields[item.type]) {add(`${p}.type`,'未开放的组件类型');continue;}
      // Avoid recursively validating children twice.
      const shallow={...item};if(Array.isArray(shallow.children))shallow.children=[];
      schema(schemas['validate_'+item.type],shallow,p);
      if(list(item.children).length>uv.limits.childrenMax)add(`${p}.children`,'子组件超过上限');
      unknown(item,[...c.ui.commonFields,...c.ui.typeFields[item.type]],p);
      if(depth>uv.limits.depthMax)add(p,`嵌套超过 ${uv.limits.depthMax} 层`);
      if(ids.has(item.id))add(`${p}.id`, `控件 id 重复 ${item.id}`);ids.add(item.id);
      if(!text(item.label))add(`${p}.label`,'必须包含非空文字');
      if(context==='resourcePackage'&&!text(item.description))add(`${p}.description`,'资源包组件需要说明');
      const b=object(item.bindings)?item.bindings:{};
      for(const key of c.ui.forbiddenDeclarationFields||[])if(own(item,key))add(`${p}.${key}`,'已移除的声明字段');
      for(const [key,binding] of Object.entries(b)) {
        const kind=uv.bindingKinds[key];
        const fields=kind==='condition'?c.ui.conditionFields:kind==='value'?['path','type','default']:['path','fallback'];
        unknown(binding,fields,`${p}.bindings.${key}`);
        if(typeof binding?.fallback==='string'&&binding.fallback.length>uv.limits.labelMax)add(`${p}.bindings.${key}.fallback`,'文字超过上限');
      }
      for(const key of ['text','placeholder'])if(typeof item[key]==='string'&&item[key].length>uv.limits.labelMax)add(`${p}.${key}`,'文字超过上限');
      for(const [optionPath,options] of [[`${p}.options`,item.options],[`${p}.bindings.options.fallback`,b.options?.fallback]])
      for(const [index,option] of list(options).entries()) {
        const op=`${optionPath}[${index}]`;
        unknown(option,c.ui.optionFields,op);
        if(!text(option?.label))add(`${op}.label`,'选项文字不能为空');
        if(context==='resourcePackage'&&option?.resource!==undefined&&!safeResource(option.resource))add(`${op}.resource`,'需要 assets/ 下的相对资源路径');
      }
      if(context==='resourcePackage'&&item.type==='button'&&item.action==='emit'&&typeof item.text==='string'&&item.text.length>c.manifest.validation.limits.packageActionTextMax)add(`${p}.text`,'按钮文字超过上限');
      const facts={context,type:item.type,scope:set.scope,slot:set.slot,action:item.action,
        valueControl:uv.inputTypes.includes(item.type)||(item.type==='button'&&sem.buttonValueActions.includes(item.action))};
      for(const rule of uv.requiredWhen) {
        if(!Object.entries(rule.when).every(([k,v])=>equal(facts[k],v)))continue;
        for(const name of rule.required||[])if(at(item,name)==null)add(`${p}.${name}`,`缺少字段（${rule.id}）`);
        for(const name of rule.forbidden||[])if(at(item,name)!=null)add(`${p}.${name}`,`不允许使用（${rule.id}）`);
        for(const name of rule.requiredBindings||[])if(b[name]==null)add(`${p}.bindings.${name}`,'缺少绑定');
        for(const name of rule.forbiddenBindings||[])if(b[name]!=null)add(`${p}.bindings.${name}`,'不允许此绑定');
        if(rule.oneOf&&!rule.oneOf.some(name=>at(item,name)!=null))add(p,`至少提供 ${rule.oneOf.join(' 或 ')}`);
        if(rule.allowedScopes&&!rule.allowedScopes.includes(set.scope))add(p,`scope 必须为 ${rule.allowedScopes.join('/')}`);
      }
      for(const [key,binding] of Object.entries(b))if(object(binding)) {
        if(!text(binding.path)||binding.path.length>uv.limits.labelMax)add(`${p}.bindings.${key}.path`,'绑定路径无效');
      }
      const value=b.value;
      if(object(value)) {
        const parts=typeof value.path==='string'?value.path.split('.'):[];
        if(!parts.length||parts.length>uv.limits.bindingPathSegmentsMax||parts.some(x=>!text(x)))add(`${p}.bindings.value.path`,'字段路径无效');
        if(Array.isArray(value.default)&&value.default.length>uv.limits.listItemsMax)add(`${p}.bindings.value.default`,'列表超过上限');
        let allowed=sem.typesByComponent[item.type];
        if(item.type==='input')allowed=sem.inputTypesByMode[item.inputMode];
        if(item.type==='button'&&sem.buttonValueActions.includes(item.action))allowed=sem.buttonValueTypes;
        if(item.type==='choice')allowed=Object.keys(sem.choiceModeByValueType);
        if(allowed&&!allowed.includes(value.type))add(`${p}.bindings.value.type`,`此控件要求 ${allowed.join('/')}`);
        if(context==='resourcePackage') {
          const path=`${c.manifest.validation.runtimePathPrefix}${value.path}`;
          const old=allValues.get(path);
          if(old&&(old.type!==value.type||!old.writable||(old.defaultValue!==undefined&&!equal(old.defaultValue,value.default))))add(`${p}.bindings.value`,'与 values 声明不一致');
          allValues.set(path,{type:value.type,writable:true,defaultValue:value.default});
        }
      }
      if(item.type==='slider') {
        const min=item.min??b.min?.fallback, max=item.max??b.max?.fallback, step=item.step??b.step?.fallback;
        if(typeof min!=='number'||typeof max!=='number'||typeof step!=='number'||!(min<max)||!(step>0)||step>max-min)add(p,'滑杆需要有效 min/max/step（动态值需 fallback）');
      }
      if(item.type==='choice'&&!list(item.options).length&&!text(b.options?.path))add(`${p}.options`,'需要选项或动态选项绑定');
      if(item.type==='button'&&item.action==='emit'&&context==='resourcePackage') {
        const path=`${c.manifest.validation.runtimePathPrefix}${item.id}`,old=allValues.get(path);
        if(old&&(old.type!=='trigger'||!old.writable||old.defaultValue!==undefined))add(p,'事件字段与 values 声明不一致');
        allValues.set(path,{type:'trigger',writable:true});
      }
      if(depth<=uv.limits.depthMax)components(item.children,set,context,`${p}.children`,depth+1,ids,allValues);
    }
  }
  function ui(sets,context,allValues=new Map(),path='ui') {
    const uv=c.ui.validation;
    if(!Array.isArray(sets)){add(path,'必须是数组');return;}
    if(sets.length>uv.limits.setsMax)add(path,`最多 ${uv.limits.setsMax} 组`);
    unique(sets.map(x=>`${x?.slot||''}:${x?.id}`),`${path}.id`);
    const packageIDs=new Set(),persistentPaths=new Set();
    for(const [i,set] of sets.entries()) {
      const p=`${path}[${i}]`;if(!object(set)){add(p,'必须是对象');continue;}
      if(context==='applicationScript'&&set.scope==null)set.scope=set.slot==='dialog'?uv.dialogScope:uv.mountedScope;
      const shallow={...set,components:[]};schema(schemas.validateSet,shallow,p);
      unknown(set,context==='resourcePackage'?c.manifest.nested['ui[]']:c.ui.setFields,p);
      if(context==='resourcePackage'&&own(set,'slot')&&!uv.selfDrawnHasSlot)add(`${p}.slot`,'资源包不声明挂载位置');
      if(context==='applicationScript') {
        if(!uv.enums.slot.includes(set.slot))add(`${p}.slot`,'缺少或不支持的挂载位置');
        const expected=set.slot==='dialog'?uv.dialogScope:uv.mountedScope;
        if(set.scope!==expected)add(`${p}.scope`,`此位置要求 ${expected}`);
      }
      if(!Array.isArray(set.components)||set.components.length>uv.limits.componentsPerSetMax)add(`${p}.components`,'组件数组无效或超过上限');
      if(context==='resourcePackage'&&(!text(set.title)||!list(set.components).length))add(p,'资源包 UI 需要标题及组件');
      if(context==='resourcePackage'&&set.scope==='persistent') {
        const visit=items=>{for(const item of list(items)){const path=item?.bindings?.value?.path;if(path){if(persistentPaths.has(path))add(p,`重复的 UI 字段 ${path}`);persistentPaths.add(path);}visit(item?.children);}};
        visit(set.components);
      }
      components(set.components,set,context,`${p}.components`,1,context==='resourcePackage'?packageIDs:new Set(),allValues);
    }
  }
  function manifest(source) {
    let m;try{m=JSON.parse(source);}catch(e){add('resource-package.json',`JSON 解析失败：${e.message}`);return null;}
    // Validate root without components, then report each concrete component branch separately.
    const shallow=object(m)?{...m}:m;
    if(object(shallow)&&Array.isArray(m.ui))shallow.ui=m.ui.map(x=>object(x)?{...x,components:[]}:x);
    schema(schemas.validatePackage,shallow,'resource-package.json');
    if(!object(m))return null;
    const mv=c.manifest.validation;
    unknown(m,[...c.manifest.required,...c.manifest.optional],'resource-package.json');
    for(const [path,fields] of Object.entries(c.manifest.nested)) {
      let nodes=[m];for(const part of path.split('.')) {const array=part.endsWith('[]'),key=array?part.slice(0,-2):part;nodes=nodes.flatMap(n=>array?list(n?.[key]):n?.[key]==null?[]:[n[key]]);}
      nodes.forEach((node,i)=>unknown(node,fields,`${path}#${i}`));
    }
    for(const key of ['name','author'])if(!text(m[key]))add(key,'必须包含非空文字');
    for(const key of ['artboard','stateMachine','viewModel','instance'])if(m.rive?.[key]!=null) {
      const n=m.rive[key];if(!text(n)||n.length>mv.limits.riveNameMax||/[\/\0]/.test(n))add(`rive.${key}`,'Rive 名称无效');
    }
    if(list(m.bindings).length&&!text(m.rive?.viewModel))add('rive.viewModel','存在绑定时必须指定 View Model');
    const values=new Map();for(const [i,item] of list(m.values).entries())if(object(item)){if(values.has(item.path))add(`values[${i}].path`,'重复字段');values.set(item.path,item);}
    ui(m.ui,'resourcePackage',values);
    const observe=list(m.capabilities?.observe),trigger=list(m.capabilities?.trigger);
    unique(observe,'capabilities.observe');unique(trigger,'capabilities.trigger');unique(list(m.javascript?.networkDomains),'javascript.networkDomains');
    for(const path of [...observe,...trigger])pattern(path,'qvmiPath','capabilities');
    for(const path of trigger)if(typeof path==='string'&&mv.forbiddenTriggerPrefixes.some(p=>path.startsWith(p)))add('capabilities.trigger','网络和存储必须通过独立接口调用');
    unique(list(m.bindings).map(x=>x?.id),'bindings.id');
    for(const [i,b] of list(m.bindings).entries())if(object(b)) {
      const p=`bindings[${i}]`,r=mv.binding;
      pattern(b.id,'identifier',`${p}.id`);pattern(b.qu,'qvmiPath',`${p}.qu`);
      const image=b.quType==='resource'&&b.riveType==='image';
      if(!image&&b.quType!=='object'&&b.quType!==b.riveType)add(p,'QVMI 与 Rive 类型不匹配');
      if((image||r.structuredRiveTypes.includes(b.riveType))&&b.direction!==r.resourceToImageDirection)add(`${p}.direction`,'结构化属性只允许 toRive');
      if(!r.triggerTwoWayAllowed&&b.riveType==='trigger'&&b.direction==='twoWay')add(`${p}.direction`,'事件不允许双向状态同步');
      if(b.transform&&(b.quType!==r.transformSourceType||b.riveType!==r.transformTargetType||b.direction!==r.transformDirection))add(`${p}.transform`,'转换仅允许 number → number 的 toRive');
      if(Array.isArray(b.transform?.clamp)&&b.transform.clamp[0]>b.transform.clamp[1])add(`${p}.transform.clamp`,'区间顺序无效');
      for(const segment of list(b.rive))if(!text(segment)||segment.length>mv.limits.rivePropertySegmentMax||/[\/\0]/.test(segment))add(`${p}.rive`,'属性路径分段无效');
      const local=values.get(b.qu), declared=observe.some(x=>x===b.qu||(typeof x==='string'&&x.endsWith('.*')&&b.qu?.startsWith(x.slice(0,-1))));
      if(!local&&!declared)add(`${p}.qu`,'未在 values 或 capabilities.observe 中声明');
      if(b.direction!=='toRive'&&!local?.writable)add(`${p}.qu`,'反向写入需要可写的资源包字段');
    }
    unique(list(m.assets?.audio).map(x=>x?.id),'assets.audio.id');
    for(const [i,a] of list(m.assets?.audio).entries())if(object(a)){pattern(a.id,'identifier',`assets.audio[${i}].id`);if(a.loop&&a.usage!==mv.audio.loopUsage)add(`assets.audio[${i}].loop`,'仅音乐允许循环');}
    const published=Object.entries(c.qvmi.observable).flatMap(([group,fields])=>fields.map(field=>`${group}.${field}`))
      .filter(path=>!input.platform||!c.qvmi.availability[path]||c.qvmi.availability[path].includes(input.platform));
    const matches=(path,paths)=>typeof path==='string'&&(path.endsWith('.*')?paths.some(x=>x.startsWith(path.slice(0,-1))):paths.includes(path));
    const unavailable=c.compatibility.unavailablePublicCapabilities==='warn'?warn:add;
    for(const path of observe)if(typeof path==='string'&&['system.','device.','app.theme.'].some(prefix=>path.startsWith(prefix))&&!matches(path,published))unavailable('capabilities.observe',`当前平台未提供 ${path}`);
    for(const path of trigger)if(!matches(path,c.qvmi.triggers))unavailable('capabilities.trigger',`未提供 ${path}`);
    for(const [i,a] of list(m.assets?.audio).entries())if(!safeResource(a?.file))add(`assets.audio[${i}].file`,'需要 assets/ 下的相对资源路径');
    if(!errors.length)m.ui=normalizeUI(m.ui);
    return m;
  }
  function script(source,kind) {
    if(!text(source)){if(kind==='applicationScript')add('script','脚本内容为空');return null;}
    let ast,comments=[];
    try{ast=parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,onComment:comments});}
    catch(e){add(`script:${e.loc?.line||1}:${(e.loc?.column||0)+1}`,`语法错误：${e.message}`);return null;}
    const entry=kind==='applicationScript'?c.script.validation.entryFunction:c.manifest.validation.packageScriptEntryFunction;
    let found=false;
    function walk(node){if(!node||typeof node!=='object')return;if(node.type==='CallExpression'&&node.callee?.type==='Identifier'&&node.callee.name===entry)found=true;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
    walk(ast);if(!found)add('script',`必须调用 ${entry}`);
    if(kind!=='applicationScript')return null;
    // Read annotations only from comments, never from strings or executable expressions.
    const uiTag=/(?:^|\n)[ \t]*\*?[ \t]*@ui[ \t]*(?:\r?\n|$)/;
    const annotations=comments.map(x=>x.value.split(uiTag,1)[0]).join('\n');
    const capture=(name)=>annotations.match(new RegExp('@'+name+'[ \\t]+'+(name==='description'?'([^\\r\\n*]+)':'([^\\s*]+)')))?.[1]?.trim();
    const metadata={identity:capture('id')||'',description:capture('description')||'未填写说明',intervalMillis:0,observedValues:[],uiSets:[]};
    for(const name of c.script.validation.annotationsRequired)if(!capture(name))add(`@${name}`,'缺少必填注解');
    if(metadata.identity&&!new RegExp(c.script.idPattern).test(metadata.identity))add('@id','身份格式无效');
    const interval=capture('interval');
    if(interval!=null){const number=Number(interval);if(!/^\d+$/.test(interval)||!Number.isSafeInteger(number)||(number!==0&&number<c.script.minimumIntervalMs))add('@interval',`应为 0 或至少 ${c.script.minimumIntervalMs} 的整数`);else metadata.intervalMillis=number;}
    const observed=[...annotations.matchAll(/@observe[ \t]+([^\s*]+(?:\*)?)/g)].map(x=>x[1].trim());
    metadata.observedValues=[...new Set(observed)];
    for(const comment of comments) {
      const tag=comment.value.match(uiTag);
      if(!tag)continue;
      const raw=comment.value.slice(tag.index+tag[0].length).split('\n').map(x=>x.replace(/^\s*\*\s?/, '')).join('\n').trim();
      if(raw.length>c.script.validation.uiDeclarationMaxChars){add('@ui','声明超过长度上限');break;}
      if(!raw)break;
      try{const value=JSON.parse(raw);metadata.uiSets=Array.isArray(value)?value:[value];ui(metadata.uiSets,'applicationScript',new Map(),'@ui');if(!metadata.uiSets.length)add('@ui','UI 声明至少需要一组描述');if(!errors.length)normalizeUI(metadata.uiSets);}
      catch(e){add('@ui',`JSON 解析失败：${e.message}`);}break;
    }
    return metadata;
  }
  let metadata=null;
  if(input.kind==='manifest')document=manifest(input.source);
  else if(input.kind==='applicationScript')metadata=script(input.source,'applicationScript');
  else if(input.kind==='packageScript')script(input.source,'packageScript');
  else if(input.kind==='package') {
    const m=text(input.source)?manifest(input.source):null;
    if(!text(input.source))waiting.push(`等待 ${c.manifest.validation.packageFiles.required[0]}`);
    script(input.script||'','packageScript');
    if(m?.javascript&&!text(input.script))waiting.push(`等待 ${c.manifest.validation.fixedFiles.javascript}`);
    if(m&&!m.javascript&&text(input.script))add('javascript','存在脚本但清单未声明 javascript');
    if(!input.hasRive)waiting.push(`等待 ${c.manifest.validation.fixedFiles.rive}`);
    if(!input.hasPreview)waiting.push(`等待 ${c.manifest.validation.fixedFiles.preview}`);
  } else if(input.kind==='ui') {
    uiSets=Array.isArray(input.sets)?input.sets:[input.sets];
    if(!uiSets.length)add('ui','UI 声明至少需要一组描述');
    ui(uiSets,input.context||'applicationScript');
    if(!errors.length)normalizeUI(uiSets);
  }
  else throw Error('Unsupported inspection request');
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],waiting:[...new Set(waiting)],metadata,document,uiSets};
}
globalThis.__quInspect=(input,contract)=>JSON.stringify(run(input,contract));
