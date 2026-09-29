import fs from 'node:fs';
import crypto from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import standalone from 'ajv/dist/standalone/index.js';
import { build } from 'esbuild';
const root = new URL('../', import.meta.url);
const schema = JSON.parse(fs.readFileSync(new URL('resource-package.schema.json', root)));
const contractPath = new URL('contract.json', root);
const contract = JSON.parse(fs.readFileSync(contractPath));
const ajv = new Ajv2020({allErrors:true, strict:false, inlineRefs:false, code:{source:true, esm:true}});
const packageShape=structuredClone(schema);
delete packageShape.$defs;
packageShape.properties.ui.items.properties.components.items={};
ajv.addSchema(packageShape, 'package');
// Pick a component by type rather than returning errors for every unrelated oneOf branch.
const variants = schema.$defs.uiComponent.oneOf;
for (const variant of variants) {
  const shape=structuredClone(variant);
  if(shape.properties.children)shape.properties.children.items={};
  ajv.addSchema(shape, variant.properties.type.const);
}
const set = structuredClone(packageShape.properties.ui.items);
set.required=['id','presentation','components'];
set.properties = {...set.properties, slot:{enum:contract.ui.validation.enums.slot}};
ajv.addSchema(set,'set');
const validators = {validatePackage:'package', validateSet:'set'};
for(const variant of variants) validators['validate_'+variant.properties.type.const]=variant.properties.type.const;
fs.mkdirSync(new URL('.generated/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('.generated/schema.mjs',import.meta.url), standalone(ajv, validators));
const result = await build({entryPoints:[new URL('inspector.mjs',import.meta.url).pathname], bundle:true, write:false, minify:true, format:'iife', target:'es2020', legalComments:'eof'});
const licenses=['acorn','ajv'].map(name=>`/* ${name}\n${fs.readFileSync(new URL('node_modules/'+name+'/LICENSE',import.meta.url),'utf8')} */`).join('\n');
const program=result.outputFiles[0].text+'\n'+licenses+'\n';
const inputs=['resource-package.schema.json','inspection/inspector.mjs','inspection/build.mjs','inspection/package-lock.json'];
const sourceHash=crypto.createHash('sha256');
for(const name of inputs) sourceHash.update(fs.readFileSync(new URL(name,root)));
const descriptor={protocol:1, sourceFiles:inputs, sourceSha256:sourceHash.digest('hex'), program};
if(process.argv.includes('--check')) {
  if(JSON.stringify(contract.inspection)!==JSON.stringify(descriptor)) throw Error('inspection program is stale; run npm run build');
} else {
  contract.inspection=descriptor;
  fs.writeFileSync(contractPath,JSON.stringify(contract,null,2)+'\n');
}
console.log(`shared inspector: ${Buffer.byteLength(program)} bytes`);
