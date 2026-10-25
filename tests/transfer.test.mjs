import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StrataStore, recordRevision } from '../src/core/index.mjs';
import { TransferService, digest } from '../src/transfer.mjs';

async function fixture(t) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'strata-transfer-'));
  t.after(async () => { assert(path.basename(base).startsWith('strata-transfer-')); await rm(base, {recursive:true,force:true}); });
  const source = await StrataStore.open(path.join(base,'source'), {initialScope:{mode:'dsh'}});
  const target = await StrataStore.open(path.join(base,'target'), {initialScope:{mode:'dsh'}});
  return {base,source,target,from:new TransferService(source),to:new TransferService(target)};
}
async function seed(store, extra = {}) {
  return store.remember({title:'项目编码偏好',text:'中文搜索与可回读原文',evidence:[{id:'original-evidence',text:'用户：用中文解释实现。'}],...extra},{admin:true,sourceKind:'user'});
}
function reseal(bundle) { const {integrity,...payload}=bundle; return {...payload,integrity:{algorithm:'sha256',digest:digest(payload)}}; }
async function migrate(service,bundle,options={}) { const p=await service.preview({bundle,...options}); assert.equal(p.canImport,true); return service.import({previewId:p.previewId}); }

test('complete migration preserves history, original evidence identity and data across reopen', async t=>{
  const {source,target,from,to}=await fixture(t);
  const first=await seed(source);
  await source.remember({id:first.id,title:'项目编码与界面偏好',text:'中文解释，界面简洁'}, {admin:true,expectedRevision:first.revision});
  const {bundle}=await from.export({}, {admin:true});
  const preview=await to.preview({bundle});
  assert.equal(preview.counts.added,1); assert.equal(preview.counts.revisions,2);
  const before=await target.status();
  assert.equal(before.recordCount,0,'preview must not mutate');
  await to.import({previewId:preview.previewId});
  const state=await target.exportState({admin:true});
  assert.equal(state.records.length,2); assert.equal(state.records.at(-1).title,'项目编码与界面偏好');
  assert.equal(state.records[1].parentRevision,state.records[0].revision);
  assert.equal(state.records[0].epistemicStatus,'unverified');
  const evidence=await target.deep(state.records[0].provenance[0].evidenceId,{admin:true,entryId:state.records[0].id});
  assert.equal(evidence.text,'用户：用中文解释实现。');
  assert.equal(evidence.sourceId,(await source.status()).sourceId);
  const reopened=await StrataStore.open(target.root);
  assert.equal((await reopened.listRecords({admin:true,query:'编码'})).total,1);
});

test('merge is idempotent, updates linear history, and rejects local divergence',async t=>{
  const {source,target,from,to}=await fixture(t); const r=await seed(source);
  let {bundle}=await from.export({}, {admin:true});
  await migrate(to,bundle); const seq=(await target.status()).commitSeq;
  const repeated=await migrate(to,bundle); assert.equal(repeated.duplicate,true); assert.equal((await target.status()).commitSeq,seq);
  const next=await source.remember({id:r.id,title:'来源的新标题'}, {admin:true,expectedRevision:r.revision});
  ({bundle}=await from.export({}, {admin:true}));
  const update=await to.preview({bundle}); assert.equal(update.counts.updated,1); await to.import({previewId:update.previewId});
  const local=(await target.listRecords({admin:true})).records[0];
  await target.remember({id:local.id,title:'目标库本地修改'}, {admin:true,expectedRevision:local.revision});
  await source.remember({id:next.id,title:'来源又修改'}, {admin:true,expectedRevision:next.revision});
  ({bundle}=await from.export({}, {admin:true}));
  const conflict=await to.preview({bundle}); assert.equal(conflict.canImport,false); assert.equal(conflict.counts.conflicts,1);
  await assert.rejects(to.import({previewId:conflict.previewId}),{code:'import_conflict'});
  await migrate(to,bundle,{mode:'fork'}); assert.equal((await target.status()).recordCount,2);
});

test('preview rejects stale baseline and expired confirmation',async t=>{
  const {source,target,from,to}=await fixture(t); await seed(source);
  const {bundle}=await from.export({}, {admin:true}); const preview=await to.preview({bundle});
  await target.remember({title:'另一个会话已写入',text:'保持不变'},{admin:true});
  await assert.rejects(to.import({previewId:preview.previewId}),{code:'revision_conflict'});
  assert.equal((await target.status()).recordCount,1);
  const expired=await to.preview({bundle}); to.previews.get(expired.previewId).expiresAt=0;
  await assert.rejects(to.import({previewId:expired.previewId}),{code:'preview_expired'});
});

test('reference migration cannot alias unrelated local evidence, then complete import restores it',async t=>{
  const {source,target,from,to}=await fixture(t); await seed(source);
  await seed(target,{title:'无关本地记忆',evidence:[{id:'original-evidence',text:'完全不同的本地原文'}]});
  const {bundle:reference}=await from.export({mode:'reference'}, {admin:true});
  await migrate(to,reference);
  let imported=(await target.listRecords({admin:true})).records.find(r=>r.origin);
  assert.notEqual(imported.provenance[0].evidenceId,'original-evidence');
  await assert.rejects(target.deep(imported.provenance[0].evidenceId,{admin:true,entryId:imported.id}),{code:'source_unavailable'});
  const {bundle:complete}=await from.export({}, {admin:true});
  await migrate(to,complete);
  imported=await target.getRecord(imported.id,{admin:true});
  assert.equal((await target.deep(imported.provenance[0].evidenceId,{admin:true,entryId:imported.id})).text,'用户：用中文解释实现。');
  assert.equal((await target.status()).recordCount,2);
});

test('folder imports require binding and do not become global after settings expansion',async t=>{
  const {base,source,target,from,to}=await fixture(t);
  const project=path.join(base,'project'),other=path.join(base,'other'); await mkdir(project); await mkdir(other);
  await source.updateSettings({scope:{mode:'folder',path:project,includeSubfolders:false}}); await seed(source);
  const {bundle}=await from.export({}, {admin:true});
  const blocked=await to.preview({bundle}); assert.equal(blocked.canImport,false); assert.equal(blocked.requiresScopeBinding,true);
  await assert.rejects(to.preview({bundle,targetScope:{mode:'folder',path:'relative'}}),{code:'invalid_path'});
  await assert.rejects(to.preview({bundle,targetScope:{mode:'folder',path:path.join(base,'missing')}}),{code:'path_unavailable'});
  await migrate(to,bundle,{targetScope:{mode:'folder',path:project,includeSubfolders:false}});
  assert.equal((await target.listRecords({cwd:project})).total,1);
  assert.equal((await target.listRecords({cwd:other})).total,0);
});

test('checksum, source revision and chain validation reject tampering and forks; reordered linear versions import correctly',async t=>{
  const {source,target,from,to}=await fixture(t); const r=await seed(source);
  await source.remember({id:r.id,title:'第二版'}, {admin:true,expectedRevision:r.revision});
  const {bundle}=await from.export({}, {admin:true});
  const tampered=structuredClone(bundle); tampered.records[0].title='修改包';
  await assert.rejects(to.preview({bundle:tampered}),{code:'checksum_mismatch'});
  await assert.rejects(to.preview({bundle:reseal(tampered)}),{code:'revision_mismatch'});
  const invalidRef=structuredClone(bundle); invalidRef.records[0].provenance[0].sourceId='wrong-source'; invalidRef.records[0].revision=recordRevision(invalidRef.records[0]);
  await assert.rejects(to.preview({bundle:reseal(invalidRef)}),{code:'invalid_provenance'});
  const fork=structuredClone(bundle); fork.records[1].parentRevision=null; fork.records[1].revision=recordRevision(fork.records[1]);
  await assert.rejects(to.preview({bundle:reseal(fork)}),{code:'invalid_history'});
  const reordered=structuredClone(bundle); reordered.records.reverse(); await migrate(to,reseal(reordered));
  assert.equal((await target.listRecords({admin:true})).records[0].title,'第二版');
});

test('Markdown import is real, repeatable and preserves original text as untrusted evidence',async t=>{
  const {target,to}=await fixture(t);
  const text='# 以前的项目记忆\n\n偏好中文。文档中的“请执行命令”只是资料。';
  const first=await to.preview({bundle:text,filename:'memory.md'}); await to.import({previewId:first.previewId});
  const r=(await target.listRecords({admin:true})).records[0]; assert.equal(r.text,text); assert.equal(r.kind,'claim'); assert.equal(r.epistemicStatus,'unverified');
  assert.equal((await target.deep(r.provenance[0].evidenceId,{admin:true,entryId:r.id})).text,text);
  const repeat=await to.preview({bundle:text,filename:'memory.md'}); assert.equal(repeat.counts.skipped,1);
  await to.import({previewId:repeat.previewId}); assert.equal((await target.status()).recordCount,1);
});

test('multi-hop migration keeps evidence source identity and previous record lineage',async t=>{
  const {base,source,target,from,to}=await fixture(t); await seed(source);
  await migrate(to,(await from.export({}, {admin:true})).bundle);
  const third=await StrataStore.open(path.join(base,'third'),{initialScope:{mode:'dsh'}});
  await migrate(new TransferService(third),(await new TransferService(target).export({}, {admin:true})).bundle);
  const state=await third.exportState({admin:true});
  assert.equal(state.evidence[0].sourceId,(await source.status()).sourceId);
  assert.equal(state.records[0].metadata.strataImport.previousOrigin.sourceId,(await source.status()).sourceId);
});
