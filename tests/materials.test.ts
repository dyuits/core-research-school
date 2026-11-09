import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { corePrograms } from '../client/src/data/corePrograms';
import { pdfMaterials } from '../client/src/data/pdfMaterials';
import { reportSessions } from '../client/src/data/reportSessions';
import { siteTitle } from '../client/src/data/siteInfo';

test('실제 PDF 17개와 메타데이터·SHA-256이 일치한다',()=>{
  const root=new URL('../client/public/materials/',import.meta.url);
  assert.equal(pdfMaterials.length,17);
  assert.equal(readdirSync(root).filter(f=>f.endsWith('.pdf')).length,17);
  assert.equal(new Set(pdfMaterials.map(f=>f.file)).size,17);
  for (const item of pdfMaterials){
    assert.match(item.file,/^[a-z-]+\.pdf$/);
    const bytes=readFileSync(new URL(item.file,root));
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    assert.equal(bytes.length,item.size);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
    assert.ok(corePrograms.some(p=>p.id===item.programId));
  }
});
test('보고서 편성 10개 프로그램과 전체 22차시가 빠짐없이 연결된다',()=>{
  assert.equal(corePrograms.length,10);
  assert.equal(reportSessions.length,22);
  assert.deepEqual(reportSessions.map(s=>s.number).sort((a,b)=>a-b),Array.from({length:22},(_,i)=>i+1));
  for(const p of corePrograms){
    assert.ok(pdfMaterials.some(f=>f.programId===p.id&&f.category==='교수·학습 지도안'));
    assert.ok(reportSessions.some(s=>s.programId===p.id));
    assert.ok(p.goal&&p.standard);
  }
  assert.ok(corePrograms.some(p=>p.subject==='정보'));
  assert.equal(corePrograms.find(p=>p.subject==='윤리와 사상')?.sessions,'18–19차시');
  assert.equal(corePrograms.find(p=>p.subject==='영어Ⅱ')?.sessions,'20–21차시');
  assert.equal(corePrograms.find(p=>p.id==='creative-shortform')?.sessions,'22차시');
  assert.ok(readFileSync(new URL('../client/index.html',import.meta.url),'utf8').includes(siteTitle));
});
