'use strict';
const S={D:null,period:null,basis:'합계',group:'대경지역',tab:'summary',open:{},sort:{k:'hv',d:-1},topN:15};
const BASES=['합계','매장매출','재고통합'];const BK={'합계':'tot','매장매출':'off','재고통합':'int'};
const BNOTE={'합계':'매장매출 + 재고통합','매장매출':'offline · 재고통합 제외','재고통합':'online'};
const TABS=[['brief','브리핑'],['todo','매장 TO DO'],['summary','요약'],['bun','분류별'],['brd','브랜드별'],['inv','재고'],['tz','시간대별'],['ins','인시생산성']];
const $=s=>document.querySelector(s);
const nz=v=>v==null||isNaN(v)?null:v;
const fN=v=>nz(v)==null?'-':Math.round(v).toLocaleString('ko-KR');
const fEok=v=>{if(nz(v)==null)return '-';const a=Math.abs(v);if(a>=1e8)return (v/1e8).toFixed(2)+'억';if(a>=1e4)return Math.round(v/1e4).toLocaleString('ko-KR')+'만';return Math.round(v).toLocaleString('ko-KR')};
const fP=(v,d=1)=>nz(v)==null?'-':(v*100).toFixed(d)+'%';
const fPP=v=>nz(v)==null?'-':(v>=0?'+':'')+(v*100).toFixed(1)+'%p';
const dv=(a,b)=>b?a/b-1:null;
const sg=v=>nz(v)==null?'':(v>=0?'pos':'neg');
const fY=v=>nz(v)==null?'<span style="color:#999">-</span>':`<span class="${sg(v)}">${v>=0?'+':''}${(v*100).toFixed(1)}%</span>`;
const fD=v=>nz(v)==null?'-':`<span class="${sg(v)}">${v>=0?'+':''}${Math.round(v).toLocaleString('ko-KR')}</span>`;
const MONTHS=()=>S.D.meta.periods.filter(p=>!p.startsWith('누계')).map(p=>parseInt(p));
const LASTM=()=>Math.max(...MONTHS());
const plabel=p=>p.startsWith('누계')?`누계 (1~${LASTM()}월)`:p;
const gname=g=>g==='대경지역'?'지역 전체':g;
function addRows(a,b){return a.map((x,i)=>{const y=b[i];return [(x[0]||0)+(y[0]||0),(x[1]||0)+(y[1]||0),x[2],x[3]]})}
function pick(node,P,G){const d=node.data;if(S.basis==='매장매출')return d.off[P][G];if(S.basis==='재고통합')return d.int[P][G];return addRows(d.off[P][G],d.int[P][G])}
const bunRows=(P,G)=>pick(S.D.bun,P,G),brdRows=(P,G)=>pick(S.D.brd,P,G);
// 영향이 작은 항목 흐리게: 매출(또는 판매수량) 비중과 재고 비중이 모두 2% 미만
const FADE=0.02;const small=(a,A,b,B)=>{const x=A?(a||0)/A:0,y=B?(b||0)/B:0;return x<FADE&&y<FADE};
const fz=(a,A,b,B)=>small(a,A,b,B)?' fade':'';
function metrics(k,i){const b=S.basis,K=BK[b];
 const hv=b==='합계'?k.cy_tot:b==='매장매출'?k.cy_off:k.cy_int,hp=b==='합계'?k.py_tot:b==='매장매출'?k.py_off:k.py_int;
 const iv=K==='int'?null:i.cy[K],ipv=K==='int'?null:i.py[K];
 const ip=iv!=null&&i.cy.h?iv/i.cy.h:null,pip=ipv!=null&&i.py.h?ipv/i.py.h:null;
 return{hv,hp,yoy:dv(hv,hp),share:k.cy_tot?hv/k.cy_tot:null,tot:k.cy_tot,ptot:k.py_tot,yoyTot:dv(k.cy_tot,k.py_tot),off:k.cy_off,poff:k.py_off,yoyOff:dv(k.cy_off,k.py_off),intv:k.cy_int,pint:k.py_int,yoyInt:dv(k.cy_int,k.py_int),intShare:k.cy_tot?k.cy_int/k.cy_tot:null,target:k.target,ach:k.target?k.cy_tot/k.target:null,
 prof:k.cy_tot?k.cy_prof/k.cy_tot:null,pprof:k.py_tot?k.py_prof/k.py_tot:null,disc:k.cy_norm?1-k.cy_tot/k.cy_norm:null,pdisc:k.py_norm?1-k.py_tot/k.py_norm:null,
 conv:k.cy_vis?k.cy_buy/k.cy_vis:null,pconv:k.py_vis?k.py_buy/k.py_vis:null,atv:k.cy_cnt?k.cy_tot/k.cy_cnt:null,patv:k.py_cnt?k.py_tot/k.py_cnt:null,atvOff:k.cy_buy?k.cy_off/k.cy_buy:null,patvOff:k.py_buy?k.py_off/k.py_buy:null,atvInt:(k.cy_cnt-k.cy_buy)>0?k.cy_int/(k.cy_cnt-k.cy_buy):null,patvInt:(k.py_cnt-k.py_buy)>0?k.py_int/(k.py_cnt-k.py_buy):null,
 ip,pip,ipy:dv(ip,pip),ih:i.cy.h,pih:i.py.h,id:i.cy.d,pid:i.py.d}}
const MX=(p,g)=>metrics(S.D.kpi[p][g],S.D.ins[p][g]);
// ---------- 차트
function scaleMax(m){const e=Math.pow(10,Math.floor(Math.log10(m||1)));const f=m/e;return (f<=1?1:f<=2?2:f<=5?5:10)*e}
function barChart(labels,series,o={}){
 const W=o.w||700,H=o.h||230,P={l:54,r:8,t:10,b:o.rot?52:26},fmt=o.fmt||fEok;
 const max=scaleMax(Math.max(1,...series.flatMap(s=>s.vals.map(v=>v||0))));const n=labels.length,gw=(W-P.l-P.r)/n,bw=Math.min(26,gw*0.78/series.length);
 let g='';for(let i=0;i<=4;i++){const y=P.t+(H-P.t-P.b)*(1-i/4);g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" stroke="#e6eaf2"/><text x="${P.l-6}" y="${y+4}" font-size="10" text-anchor="end" fill="#6b7385">${fmt(max*i/4)}</text>`}
 labels.forEach((lb,i)=>{const cx=P.l+gw*(i+.5);series.forEach((s,j)=>{const v=s.vals[i]||0,h=Math.max(0,(H-P.t-P.b)*v/max),x=cx-bw*series.length/2+bw*j;g+=`<rect x="${x}" y="${H-P.b-h}" width="${bw-1}" height="${h}" rx="2" fill="${s.color}" ${o.hi&&o.hi.includes(i)?'':'opacity=".95"'}><title>${lb} ${s.name}: ${fN(v)}</title></rect>`});
  g+=`<text x="${cx}" y="${H-P.b+14}" font-size="10" text-anchor="${o.rot?'end':'middle'}" fill="#444" ${o.rot?`transform="rotate(-35 ${cx} ${H-P.b+14})"`:''}>${lb}</text>`});
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${g}</svg>`}
function lineChart(labels,series,o={}){
 const W=o.w||700,H=o.h||230,P={l:54,r:12,t:10,b:26},fmt=o.fmt||fEok;
 const all=series.flatMap(s=>s.vals.filter(v=>v!=null));const max=scaleMax(Math.max(1,...all));const n=labels.length,gw=(W-P.l-P.r)/(n-1||1);
 let g='';for(let i=0;i<=4;i++){const y=P.t+(H-P.t-P.b)*(1-i/4);g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" stroke="#e6eaf2"/><text x="${P.l-6}" y="${y+4}" font-size="10" text-anchor="end" fill="#6b7385">${fmt(max*i/4)}</text>`}
 labels.forEach((lb,i)=>{g+=`<text x="${P.l+gw*i}" y="${H-8}" font-size="10" text-anchor="middle" fill="#444">${lb}</text>`});
 series.forEach(s=>{let d='',pts='';s.vals.forEach((v,i)=>{if(v==null)return;const x=P.l+gw*i,y=H-P.b-(H-P.t-P.b)*v/max;d+=(d?'L':'M')+x+' '+y;pts+=`<circle cx="${x}" cy="${y}" r="3.5" fill="${s.color}"><title>${labels[i]} ${s.name}: ${fN(v)}</title></circle>`});g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4"/>${pts}`});
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${g}</svg>`}
const legend=(a)=>`<div class="legend">${a.map(([c,t])=>`<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;
const CY='#2f75b5',PY='#b3b3b3';
// ---------- 뷰
function vSummary(){
 const P=S.period,G=S.group,m=MX(P,G),D=S.D,b=S.basis,hap=b==='합계';
 const card=(t,v,s,cls='')=>`<div class="card ${cls}"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
 const BL={'합계':'실적합계 (매장+재고통합)','매장매출':'매장매출 (offline)','재고통합':'재고통합 (online)'};
 const sfx=hap?'':' <span style="font-size:10px">(합계 기준)</span>';
 let h='<div class="cards">';
 h+=card(BL[b],fEok(m.hv)+'원',`전년 ${fEok(m.hp)} · ${fY(m.yoy)}`,'big');
 h+=card('목표 달성율',hap&&m.ach!=null?fP(m.ach):'-',hap?(m.target?`목표 ${fEok(m.target)}`:'목표 없음'):'목표는 합계 기준으로만 산출');
 if(b!=='매장매출')h+=card('매장매출 (offline)',fEok(m.off),`전년 ${fEok(m.poff)} · ${fY(m.yoyOff)}`);
 if(b!=='재고통합')h+=card('재고통합 (online)',fEok(m.intv),`합계 대비 ${fP(m.intShare)} · 전년 ${fEok(m.pint)}`);
 if(!hap)h+=card('실적합계',fEok(m.tot)+'원',`전년 ${fEok(m.ptot)} · ${fY(m.yoyTot)}`);
 h+=card('이익율'+sfx,fP(m.prof),`전년 ${fP(m.pprof)} · ${fPP(m.prof!=null&&m.pprof!=null?m.prof-m.pprof:null)}`);
 h+=card('에누리율'+sfx,fP(m.disc),`전년 ${fP(m.pdisc)} · ${fPP(m.disc!=null&&m.pdisc!=null?m.disc-m.pdisc:null)}`);
 h+=card('구매전환율 (매장 구매객수÷입점객수)',fP(m.conv),`전년 ${fP(m.pconv)} · ${fPP(m.conv!=null&&m.pconv!=null?m.conv-m.pconv:null)}`);
 h+=card('객단가 · 합계',fN(m.atv)+'원',`전년 ${fN(m.patv)} · ${fY(dv(m.atv,m.patv))}`);
 h+=card('객단가 · 오프라인',fN(m.atvOff)+'원',`전년 ${fN(m.patvOff)} · ${fY(dv(m.atvOff,m.patvOff))}`);
 h+=card('객단가 · 온라인',fN(m.atvInt)+'원',`전년 ${fN(m.patvInt)} · ${fY(dv(m.atvInt,m.patvInt))}`);
 h+=b==='재고통합'?card('인시생산성','해당 없음','재고통합은 근무인시 연결 불가'):card('인시생산성'+(b==='매장매출'?' (매장매출)':''),fN(m.ip)+'원/h',`전년 ${fN(m.pip)} · ${fY(dv(m.ip,m.pip))}`);
 h+='</div>';
 const tr=D.trend[BK[b]][G],labels=MONTHS().map(x=>x+'월');
 h+=`<div class="panel"><h3>월별 ${b} 추이 · ${gname(G)}</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(labels,[{name:'금년',color:CY,vals:tr.cy},{name:'전년',color:PY,vals:tr.py}])}<div class="note">※ 전년 값이 비어 있는 달은 전년 미영업(신규·리뉴얼) 기간입니다.</div></div>`;
 if(G==='대경지역'){
  const cols=hap?[['hv','실적합계',fN,'cyc'],['yoy','전년비',fY],['ach','달성율',fP],['prof','이익율',fP],['disc','에누리율',fP],['conv','전환율',fP],['atv','객단가(합계)',fN],['atvOff','객단가(오프)',fN],['atvInt','객단가(온)',fN],['ip','인시생산성',fN]]
   :b==='매장매출'?[['hv','매장매출',fN,'cyc'],['hp','전년',fN],['yoy','전년비',fY],['share','합계 대비 비중',fP],['ip','인시생산성(매장)',fN],['ipy','인시 전년비',fY]]
   :[['hv','재고통합',fN,'cyc'],['hp','전년',fN],['yoy','전년비',fY],['share','합계 대비 비중',fP]];
  const rows=D.meta.stores.map(s=>({s,...MX(P,s)}));
  const k=cols.some(c=>c[0]===S.sort.k)?S.sort.k:'hv',d=S.sort.d;rows.sort((a,b2)=>((a[k]==null?-1e18:a[k])-(b2[k]==null?-1e18:b2[k]))*d);
  const th=(c)=>`<th class="sort" data-k="${c[0]}">${c[1]}${k===c[0]?(d<0?' ▼':' ▲'):''}</th>`;
  h+=`<div class="panel"><h3>지점별 현황 · ${b} · ${plabel(P)} <span class="note">(열 제목을 누르면 정렬 · 지점을 누르면 상세)</span></h3><div class="tw"><table class="t"><thead><tr><th>지점</th>${cols.map(th).join('')}</tr></thead><tbody>`+
  rows.map(r=>`<tr class="clk" data-g="${r.s}"><td>${r.s}</td>${cols.map(c=>`<td class="${c[3]||''}">${c[2](r[c[0]])}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>'+(hap?'':'<div class="note">※ 이익율·에누리율·전환율·객단가(3종)는 합계 탭 지점 표에서 확인할 수 있습니다.</div>')+'</div>';
 }else{
  const all=D.meta.stores.map(s=>({s,...MX(P,s)}));const r1=[...all].sort((a,b2)=>b2.hv-a.hv).findIndex(x=>x.s===G)+1;const r2=[...all].filter(x=>x.ip!=null).sort((a,b2)=>b2.ip-a.ip).findIndex(x=>x.s===G)+1;
  h+=`<div class="panel"><h3>지역 내 위치 · ${b} · ${plabel(P)}</h3><div class="note" style="font-size:14px">${b} <b>${r1}위</b> / 22개 점${b==='재고통합'?'':` · 인시생산성 <b>${r2||'-'}위</b> / ${all.filter(x=>x.ip!=null).length}개 점`}</div></div>`;
 }
 return h}
function vBun(){
 const P=S.period,G=S.group,D=S.D,rows=D.bun.rows,data=bunRows(P,G),bs=S.basis;
 const tree=[];let subs=[],mids=[],tot=null;
 rows.forEach((r,i)=>{const [dae,mid,sub]=r,v=data[i];
  if(dae==='합계'){tot={name:'합계',v};return}
  if(sub){subs.push({name:sub,v});return}
  if(mid){mids.push({name:mid,v,subs});subs=[];return}
  tree.push({name:dae,v,mids});mids=[];subs=[]});
 const T=tot?tot.v[0]:1,TP=tot?tot.v[1]:1,TS=tot?tot.v[2]:0;
 const row=(cls,nm,v,key,open)=>{const[c,p,sc,sp]=v;const bw=T?Math.max(0,c/T*100):0;return `<tr class="${cls}${cls==='tot'?'':fz(c,T,sc,TS)}" ${key?`data-k="${key}"`:''}><td>${key?(open?'▾ ':'▸ '):''}${nm}</td><td class="cyc">${fN(c)}</td><td>${T?fP(c/T):'-'}</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>${sc==null?'-':fN(sc)}</td><td>${sp==null?'-':fN(sp)}</td><td style="text-align:left"><span class="bar" style="width:${Math.min(100,bw*2)}px;background:${CY}"></span></td></tr>`};
 let b='';
 tree.forEach(d=>{b+=row('l0',d.name,d.v);d.mids.forEach(m=>{if(!(m.v[0]||m.v[1]))return;const key=d.name+'|'+m.name,op=!!S.open[key];b+=row('l1',m.name,m.v,m.subs.length?key:'',op);if(op)m.subs.forEach(s=>{if(s.v[0]||s.v[1])b+=row('l2',s.name,s.v)})})});
 if(tot)b+=row('tot',bs==='합계'?'합계 (분류 가능분)':'합계',tot.v);
 const ms=D.miss[P][G];let note2='';
 if(bs!=='매장매출'&&ms&&(ms[0]||ms[1])&&tot){const xr=(cls,nm,c,p)=>`<tr class="${cls}"><td>${nm}</td><td class="cyc">${fN(c)}</td><td>-</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>-</td><td>-</td><td></td></tr>`;
  b+=xr('l2','※ 분류 불가 재고통합 (판매상세 미포함)',ms[0],ms[1]);b+=xr('tot',bs==='합계'?'실적합계 (월 KPI 기준)':'재고통합 (월 KPI 기준)',T+ms[0],TP+ms[1]);
  note2=` · 판매상세에 재고통합 내역이 있는 9개점만 분류 가능 — 나머지 점의 재고통합은 '분류 불가' 행으로 표시(합계는 월 KPI와 일치)`}
 return `<div class="panel"><h3>분류별 실적 · ${bs} 기준 · ${gname(G)} · ${plabel(P)}</h3>${legend([[CY,'금년'],[PY,'전년']])}<div class="tw"><table class="t"><thead><tr><th>분류</th><th>금년 실적</th><th>구성비</th><th>전년 실적</th><th>전년비</th><th>증감</th><th>재고(금년)</th><th>재고(전년)</th><th>금년 비중</th></tr></thead><tbody>${b}</tbody></table></div><div class="note">※ ${bs} 기준(${BNOTE[bs]}) · 중분류 행을 누르면 소분류가 펼쳐집니다.${note2} · 재고는 재고현황 기말 수량(월=해당 월말, 누계=${LASTM()}월말 · 기준과 무관 · 스타일 코드로 판매 분류에 매칭, 미매칭분은 합계에만 포함)</div></div>`}
function vBrd(){
 const P=S.period,G=S.group,D=S.D,data=brdRows(P,G),names=D.brd.brands,bs=S.basis;
 const list=names.map((n,i)=>({n,v:data[i]})).filter(x=>x.n!=='합계'&&(x.v[0]||x.v[1])).sort((a,b)=>b.v[0]-a.v[0]);
 const tot=data[names.length-1];const T=tot[0],TP=tot[1];
 const top=S.topN>=999?list:list.slice(0,S.topN);
 const ch=list.slice(0,10);
 let h=`<div class="panel"><h3>브랜드별 신발 실적 TOP10 · ${bs} 기준 · ${gname(G)} · ${plabel(P)}</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(ch.map(x=>x.n),[{name:'금년',color:CY,vals:ch.map(x=>x.v[0])},{name:'전년',color:PY,vals:ch.map(x=>x.v[1])}],{rot:true,h:260})}</div>`;
 h+=`<div class="panel"><h3>브랜드 상세 <span class="note">표시 수: ${[10,15,30,999].map(n=>`<a href="#" class="topn" data-n="${n}" style="${S.topN===n?'font-weight:700':''}">${n===999?'전체':'TOP'+n}</a>`).join(' · ')}</span></h3><div class="tw"><table class="t"><thead><tr><th>순위·브랜드</th><th>금년 실적</th><th>비중</th><th>전년 실적</th><th>전년비</th><th>증감</th><th>재고(금년)</th><th>재고(전년)</th></tr></thead><tbody>`+
 top.map((x,i)=>{const[c,p,sc,sp]=x.v;return `<tr class="${fz(c,T,sc,tot[2])}"><td>${i+1}. ${x.n}</td><td class="cyc">${fN(c)}</td><td>${T?fP(c/T):'-'}</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>${sc==null?'-':fN(sc)}</td><td>${sp==null?'-':fN(sp)}</td></tr>`}).join('')+
 `<tr class="tot"><td>합계(표 브랜드)</td><td>${fN(T)}</td><td>100%</td><td>${fN(TP)}</td><td>${fY(dv(T,TP))}</td><td>${TP?fD(T-TP):'-'}</td><td>${tot[2]==null?'-':fN(tot[2])}</td><td>${tot[3]==null?'-':fN(tot[3])}</td></tr></tbody></table></div><div class="note">※ 신발 카테고리 · ${bs} 기준(${BNOTE[bs]})${bs==='매장매출'?'':' · 판매상세에 재고통합 내역이 있는 9개점만 반영(나머지 13개점은 매장매출만 포함)'} · 재고(신발)는 재고현황 기말 수량(월=해당 월말, 누계=${LASTM()}월말).</div></div>`;
 return h}
function vTz(){
 const G=S.group,D=S.D,P=S.period,t=D.tz.months[P][G],lab=D.meta.tzBands;
 const cy=t.cy,py=t.py,tc=cy.reduce((a,b)=>a+b,0),tp=py.reduce((a,b)=>a+b,0),cd=t.cday||tc,pd=t.pday||tp;
 const hasPy=tp>0;let pk=0;cy.forEach((v,i)=>{if(v/(lab[i].endsWith(':30')&&!lab[i].startsWith('1')?1:1)>cy[pk])pk=i});
 const unit=l=>{const a=l.split('~');const m=t2=>+t2.slice(0,2)*60+ +t2.slice(3);return m(a[1])-m(a[0])===30?'30분':'1시간'};
 let h='';if(S.basis!=='매장매출')h+=`<div class="banner">ℹ️ 시간대별은 전자저널(매장 POS) 기준이라 <b>매장매출</b>만 제공됩니다 (선택하신 ${S.basis} 기준과 무관).</div>`;
 h+=`<div class="panel"><h3>시간대별 매출 (${plabel(P)} · 전자저널 · 09:30~22:30) · ${gname(G)}</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(lab,[{name:'금년',color:CY,vals:cy},{name:'전년',color:PY,vals:py}],{rot:true,h:260})}<div class="note">09:30~12:00·20:00~22:30은 30분 단위, 12:00~20:00은 1시간 단위라 막대 길이를 그대로 비교하지 마세요. 1시간 구간 피크: <b>${(()=>{let k=-1;cy.forEach((v,i)=>{if(unit(lab[i])==='1시간'&&(k<0||v>cy[k]))k=i});return k<0?'-':lab[k]+' ('+fP(cd?cy[k]/cd:null)+')'})()}</b></div></div>`;
 h+=`<div class="panel"><div class="tw"><table class="t"><thead><tr><th>단위</th><th>시간대</th><th>금년</th><th>비중</th><th>전년</th><th>비중</th><th>증감</th><th>전년비</th></tr></thead><tbody>`+lab.map((l,i)=>`<tr><td>${unit(l)}</td><td>${l}</td><td class="cyc">${fN(cy[i])}</td><td>${cd?fP(cy[i]/cd):'-'}</td><td class="pyc">${hasPy?fN(py[i]):'-'}</td><td>${hasPy&&pd?fP(py[i]/pd):'-'}</td><td>${hasPy?fD(cy[i]-py[i]):'-'}</td><td>${hasPy?(py[i]?fY(dv(cy[i],py[i])):(cy[i]?'신규':'-')):'-'}</td></tr>`).join('')+`<tr class="tot"><td colspan="2">09:30~22:30 합계</td><td>${fN(tc)}</td><td>${cd?fP(tc/cd):'-'}</td><td>${hasPy?fN(tp):'-'}</td><td>${hasPy&&pd?fP(tp/pd):'-'}</td><td>${hasPy?fD(tc-tp):'-'}</td><td>${hasPy?fY(dv(tc,tp)):'-'}</td></tr></tbody></table></div><div class="note">※ 전자저널 정상·반품 거래, 거래번호 중복 제거. 비중은 하루 전체 매장매출 대비.</div></div>`;
 return h}
function vIns(){
 const P=S.period,G=S.group,D=S.D,b=S.basis;
 if(b==='재고통합')return `<div class="panel"><h3>인시생산성 · 재고통합 기준</h3><div class="banner">ℹ️ 재고통합(online)은 매장 근무인시와 연결되지 않아 인시생산성이 <b>해당 없음</b>입니다. 위에서 <b>합계</b> 또는 <b>매장매출</b> 기준을 선택해 주세요.</div></div>`;
 const m=MX(P,G),mo=MONTHS(),K=BK[b],BLn=b==='합계'?'실적합계':'매장매출';
 const ipm=(k)=>mo.map(x=>{const i=D.ins[x+'월'][G][k];return i.h?i[K]/i.h:null});
 let h='<div class="cards">';
 h+=`<div class="card big"><div class="t">인시생산성 (${BLn} ÷ 근무인시)</div><div class="v">${fN(m.ip)}원/h</div><div class="s">전년 ${fN(m.pip)} · ${fY(dv(m.ip,m.pip))}</div></div>`;
 h+=`<div class="card"><div class="t">근무인시</div><div class="v">${fN(m.ih)}h</div><div class="s">전년 ${fN(m.pih)} · ${fY(dv(m.ih,m.pih))}</div></div>`;
 h+=`<div class="card"><div class="t">근무인일</div><div class="v">${fN(m.id)}일</div><div class="s">전년 ${fN(m.pid)} · ${fY(dv(m.id,m.pid))}</div></div>`;
 h+='</div>';
 h+=`<div class="panel"><h3>월별 인시생산성 추이 (${BLn}) · ${gname(G)}</h3>${legend([[CY,'금년'],[PY,'전년']])}${lineChart(mo.map(x=>x+'월'),[{name:'금년',color:CY,vals:ipm('cy')},{name:'전년',color:PY,vals:ipm('py')}],{fmt:v=>Math.round(v/1000)+'천'})}<div class="note">※ 단위 원/시간 · 전년 영업월이 아닌 달은 비어 있습니다.</div></div>`;
 const rows=D.meta.stores.map(s=>({s,...MX(P,s)}));rows.sort((a,b2)=>(b2.ip||0)-(a.ip||0));
 h+=`<div class="panel"><h3>지점별 인시생산성 · ${BLn} 기준 · ${plabel(P)}</h3><div class="tw"><table class="t"><thead><tr><th>순위·지점</th><th>금년 인시생산성</th><th>전년</th><th>전년비</th><th>근무인시(금)</th><th>근무인시(전)</th><th>${BLn}(금)</th></tr></thead><tbody>`+
  rows.map((r,i)=>`<tr class="clk ${r.s===G?'me':''}" data-g="${r.s}"><td>${i+1}. ${r.s}</td><td class="cyc">${fN(r.ip)}</td><td class="pyc">${fN(r.pip)}</td><td>${fY(dv(r.ip,r.pip))}</td><td>${fN(r.ih)}</td><td>${fN(r.pih)}</td><td>${fN(b==='합계'?r.tot:r.off)}</td></tr>`).join('')+'</tbody></table></div><div class="note">※ 근무인시=근태현황 출근 근무시간 합(타매장 지원근무는 지원매장 기준).</div></div>';
 return h}
// ===== 고급 분석 뷰 (브리핑 · 매장 TO DO · 재고 · 분류/브랜드 상세) =====
(function(){const css=`.chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700;margin:2px 4px 2px 0;white-space:nowrap}
.chip.good{background:#e3f0fb;color:#1a6fc4}.chip.bad{background:#fde8e6;color:#c5221f}.chip.mid{background:#eef0f4;color:#4a5265}.chip.warn{background:#fff2cc;color:#7f6000}
.blist{margin:4px 0 0;padding-left:18px}.blist li{margin:5px 0;line-height:1.5}
.sec{font-size:13px;font-weight:700;color:var(--navy);margin:12px 0 4px}
.todo{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#fff}
.todo .n{flex:0 0 28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
.todo .w{font-size:12px;color:var(--mut);margin-top:3px}
.hbar{display:flex;height:22px;border-radius:6px;overflow:hidden;margin:6px 0}.hbar div{color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden}
.ai{background:#f4f8fd;border-radius:10px;padding:10px 12px;line-height:1.65;font-size:14px;margin:6px 0}
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.sgrid .card{cursor:pointer}`;
document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>')})();
const AM=()=>{const A=S.D.adv;return A.months?(A.months[S.period]?S.period:A.latest):A.month};
const AV=()=>{const A=S.D.adv;if(!A.months)return A;const k=AM();return Object.assign({month:k,note:A.note},A.months[k])};
const latestNote=()=>S.period!==AM()?`<div class="banner">ℹ️ 누계를 선택해 최신 마감월 <b>${AM()}</b> 기준으로 보여드립니다. 위 '구분'에서 월을 누르면 그 달 내용으로 바뀝니다.</div>`:'';
const chipS={'부족':'bad','과다':'warn','적정':'good','무판매':'mid','재고없음':'bad','품절위험':'bad','재고확보':'warn','안정':'good'};
const chip=(t,c)=>`<span class="chip ${c||chipS[t]||'mid'}">${t}</span>`;
const ul=a=>`<ul class="blist">${a.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const wkRows=w=>w.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="cyc">${fN(r[2])}</td><td class="pyc">${r[3]?fN(r[3]):'-'}</td><td>${fY(r[4])}</td><td>${r[5]==null?'-':fP(r[5])}</td></tr>`).join('');
function vBrief(){
 const A=AV(),G=S.group,isR=G==='대경지역',B=isR?A.brief:A.sbrief[G],r=B.m;let h=latestNote();
 const card=(t,v,s)=>`<div class="card"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
 h+=`<div class="panel"><h3>📌 핵심 현황 · ${A.month} · ${isR?'지역 전체':G}</h3><div class="cards">`+
  card('실적합계',fEok(r.tot)+'원',`전년 ${fEok(r.ptot)} · ${fY(r.yoy)}`)+card('목표 달성률',fP(r.ach),'월 목표 대비')+
  card('구매전환율',fP(r.cv),`전년 ${fP(r.pcv)} · ${fPP(r.cv-r.pcv)}`)+card('객단가(합계)',fN(r.atv)+'원',`전년 ${fN(r.patv)} · ${fY(dv(r.atv,r.patv))}`)+
  card('할인율(에누리)',fP(r.disc),`전년 ${fP(r.pdisc)} · ${fPP(r.disc-r.pdisc)}`)+card('인시생산성',fN(r.ip)+'원/h',`전년 ${fN(r.pip)} · ${fY(dv(r.ip,r.pip))}`)+'</div></div>';
 h+=isR?`<div class="panel"><h3>📈 주요 변화</h3><div class="sec">지역 전체</div>${ul(B.changes)}<div class="sec">수치가 튄 매장 <span class="note">(매장을 누르면 그 매장 브리핑으로 이동)</span></div><div class="tw"><table class="t"><thead><tr><th>매장</th><th style="text-align:left">신호</th></tr></thead><tbody>`+
  B.outliers.map(o=>`<tr class="clk" data-g="${o[0]}"><td>${o[0]}</td><td style="text-align:left;white-space:normal">${o[1].map(t=>chip(t[1],t[0])).join('')}</td></tr>`).join('')+'</tbody></table></div></div>'
  :`<div class="panel"><h3>📈 주요 변화 · ${G}</h3>${B.tags.length?'<div>'+B.tags.map(t=>chip(t[1],t[0])).join('')+'</div>':''}${ul(B.changes)}<div class="note"><span class="clk todo-go" data-g="${G}" style="cursor:pointer;color:var(--navy);font-weight:700">→ 이 매장 현황판 보기</span> · <span class="clk" data-g="대경지역" style="cursor:pointer;color:var(--navy)">지역 전체 브리핑으로</span></div></div>`;
 h+=`<div class="panel"><h3>🤖 월간 AI 해석</h3>${B.ai.map(p=>`<div class="ai">${p}</div>`).join('')}</div>`;
 h+=`<div class="panel"><h3>💡 자동분석 인사이트</h3>${ul(B.insights)}</div>`;
 h+=`<div class="panel"><h3>🗓️ 월간 리포트 · 주간 매출 흐름 (매장매출, 전년 같은 요일 대비)</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(B.weeks.map(w=>w[0]),[{name:'금년',color:CY,vals:B.weeks.map(w=>w[2])},{name:'전년',color:PY,vals:B.weeks.map(w=>w[3])}])}
 <div class="tw"><table class="t"><thead><tr><th>주차</th><th>기간</th><th>금년</th><th>전년</th><th>전년비</th><th>주간 달성률</th></tr></thead><tbody>${wkRows(B.weeks)}</tbody></table></div><div class="note">※ 주간 달성률 = 매장매출 ÷ (월 목표 × 그 주 일수/그 달 일수 × 매장매출 비중). 월초·월말 주차는 일수가 짧습니다.</div></div>`;
 const tr=S.D.trend.tot[G]||S.D.trend.tot['대경지역'],lab=MONTHS().map(x=>x+'월');
 h+=`<div class="panel"><h3>월간 매출 흐름 (실적합계 · ${isR?'지역 전체':G})</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(lab,[{name:'금년',color:CY,vals:tr.cy},{name:'전년',color:PY,vals:tr.py}])}</div>`;
 h+=`<div class="panel"><h3>✔ 데이터로 확인된 변화</h3>${ul(B.verified)}<h3 style="margin-top:12px">❓ 점검이 필요한 가설</h3>${ul(B.hyp)}<div class="note">${A.note||""}</div></div>`;
 return h}
function vTodo(){
 const G=S.group,T=AV().todo;let h=latestNote();
 if(G==='대경지역'){
  h+=`<div class="panel"><h3>✅ 매장을 고르세요 <span class="note">(위 '대상'에서 선택하거나 아래 매장을 누르세요)</span></h3><div class="sgrid">`+
   S.D.meta.stores.map(s=>{const st=T[s].status;return `<div class="card todo-go" data-g="${s}"><div class="t">${s}</div><div class="v" style="font-size:20px">${fP(st.ach)}</div><div class="s">${AM()} 달성률 · 전년비 ${fY(st.yoy)}</div></div>`}).join('')+'</div></div>';return h}
 const t=T[G],st=t.status;
 h+=`<div class="panel"><h3>1. 우리 매장 최근 상태 · ${AV().month}</h3><div class="cards">
 <div class="card big"><div class="t">실적합계</div><div class="v">${fEok(st.tot)}원</div><div class="s">전년 대비 ${fY(st.yoy)}</div></div>
 <div class="card"><div class="t">목표 달성률</div><div class="v">${fP(st.ach)}</div><div class="s">차이 ${fD(st.gap)}원</div></div>
 <div class="card"><div class="t">누계 달성률 (1~${AM()})</div><div class="v">${fP(st.cum)}</div><div class="s">차이 ${fD(st.cgap)}원</div></div></div>
 <div class="sec">주차별 달성률 흐름</div><div class="ai">${t.weeks.map(w=>`${w[0]} <b>${w[5]==null?'-':fP(w[5])}</b>`).join(' → ')}</div>
 <div class="two"><div><div class="sec">👍 좋아진 점</div>${t.good.length?ul(t.good):'<div class="note">해당 없음</div>'}</div><div><div class="sec">👎 나빠진 점</div>${t.bad.length?ul(t.bad):'<div class="note">해당 없음</div>'}</div></div>
 <div class="sec">주의해서 볼 지표</div><div>${t.watch.map(w=>chip(w[0]+' '+w[1],'mid')).join('')}</div></div>`;
 h+=`<div class="panel"><h3>2. 왜 이런 흐름이었을까</h3><div class="ai">${t.ai}</div><div class="sec">데이터로 확인된 변화 사실</div>${ul(t.facts)}<div class="sec">매장에서 점검이 필요한 요인</div>${ul(t.checks)}<div class="note">함께 나타난 숫자이며 원인을 확정한 것은 아닙니다.</div></div>`;
 h+=`<div class="panel"><h3>3. 이번 달 할 일 · 중요한 순 최대 3개</h3>${t.todo.map((x,i)=>`<div class="todo"><div class="n">${i+1}</div><div><div>${chip(x[0],'warn')} <b>${x[1]}</b></div><div class="w">근거: ${x[2]}</div></div></div>`).join('')}
 <div class="sec">다음 달에 확인할 숫자</div>${ul(t.next)}<div class="sec">주차별 상세</div><div class="tw"><table class="t"><thead><tr><th>주차</th><th>기간</th><th>매장매출</th><th>전년</th><th>전년비</th><th>주간 달성률</th></tr></thead><tbody>${wkRows(t.weeks)}</tbody></table></div></div>`;
 return h}
function detailPanel(key){
 const G=S.group,rows=AV().detail[G][key],nm=key==='brand'?'브랜드':'중분류';
 const sS=rows.reduce((a,r)=>a+(r[1]||0),0),sK=(AV().inv[G]||{total:[0]}).total[0]||rows.reduce((a,r)=>a+(r[4]||0),0);
 return `<div class="panel"><h3>🔎 ${nm}별 재고 과부족 · ${AV().month} · ${gname(G)}</h3><div class="tw"><table class="t"><thead><tr><th>${nm}</th><th>${AM()} 매장매출</th><th>판매수량</th><th>수량 전년비</th><th>재고</th><th>재고 전년비</th><th>재고주수</th><th>상태</th></tr></thead><tbody>`+
 rows.map(r=>`<tr class="${fz(r[1],sS,r[4],sK)}"><td>${r[0]}</td><td class="cyc">${fN(r[1])}</td><td>${fN(r[2])}</td><td>${r[3]?fY(dv(r[2],r[3])):'-'}</td><td>${fN(r[4])}</td><td>${r[5]?fY(dv(r[4],r[5])):'-'}</td><td>${r[6]==null?'-':r[6]+'주'}</td><td>${chip(r[7])}</td></tr>`).join('')+
 `</tbody></table></div><div class="note">※ 재고주수 = ${AM()} 말 재고 ÷ 그 달 마지막 4주 주평균 판매수량. 부족 = 8주 미만(판매 유지·증가), 과다 = 52주 초과 또는 재고 증가율이 판매 증가율보다 40%p 이상 높고 26주 초과.${AM()==='9월'?' 9월 판매에는 추석 수요가 포함돼 재고주수가 평소보다 짧게 나올 수 있습니다.':''}${AM()==='10월'?' 10월은 전년 추석(10/5~7)이 있던 달이라 판매·매출 전년비가 낮게 나옵니다(9·10월 합산 비교 권장).':''}</div></div>`}
function bestPanel(){
 const G=S.group,b=AV().best[G];
 return `<div class="panel"><h3>🏆 베스트 상품 TOP10 · 재고 점검 · ${gname(G)}</h3><div class="tw"><table class="t"><thead><tr><th>순위·브랜드</th><th>상품(스타일)</th><th>판매수량</th><th>매장매출</th><th>재고</th><th>재고주수</th><th>점검</th></tr></thead><tbody>`+
 b.map((r,i)=>`<tr><td>${i+1}. ${r[0]}</td><td style="text-align:left">${r[2]} <span class="note">${r[1]}</span></td><td>${fN(r[3])}</td><td class="cyc">${fN(r[4])}</td><td>${fN(r[5])}</td><td>${r[6]==null?'-':r[6]+'주'}</td><td>${chip(r[7])}</td></tr>`).join('')+
 `</tbody></table></div><div class="note">※ 품절위험 = 재고주수 2주 미만 또는 재고 0 → 즉시 보충 요청 · 재고확보 = 4주 미만.</div></div>`}
function vInv(){
 const G=S.group,I=AV().inv[G],t=I.total,hl=I.health,ht=Object.values(hl).reduce((a,b)=>a+b,0)||1;let h=latestNote();
 h+=`<div class="cards"><div class="card big"><div class="t">${AM()} 말 재고 수량</div><div class="v">${fN(t[0])}개</div><div class="s">전년 ${fN(t[1])} · ${fY(dv(t[0],t[1]))}</div></div>
 <div class="card"><div class="t">${AM()} 판매수량</div><div class="v">${fN(t[2])}</div><div class="s">전년 ${fN(t[3])} · ${fY(dv(t[2],t[3]))}</div></div>
 <div class="card"><div class="t">재고주수</div><div class="v">${t[4]==null?'-':t[4]+'주'}</div><div class="s">재고 ÷ 최근 4주 주평균 판매</div></div></div>`;
 const col={'부족':'#d93025','적정':'#2f75b5','과다':'#e3a400','무판매':'#8a93a6'};
 h+=`<div class="panel"><h3>🩺 재고 건강도 (스타일 기준, 수량 비중)</h3><div class="hbar">${Object.entries(hl).map(([k,v])=>v?`<div style="width:${v/ht*100}%;background:${col[k]}">${v/ht>0.06?k+' '+fP(v/ht,0):''}</div>`:'').join('')}</div>
 <div>${Object.entries(hl).map(([k,v])=>chip(`${k} ${fN(v)}개 (${fP(v/ht,0)})`,chipS[k])).join('')}</div><div class="note">부족 = 재고주수 4주 미만 · 적정 = 4~52주 · 과다 = 52주 초과 · 무판매 = 최근 8주 판매 0</div></div>`;
 h+=`<div class="panel"><h3>대분류별 재고 전년 대비</h3><div class="tw"><table class="t"><thead><tr><th>대분류</th><th>재고(금년)</th><th>재고(전년)</th><th>재고 전년비</th><th>판매수량</th><th>판매 전년비</th><th>재고주수</th></tr></thead><tbody>`+
  I.big.map(r=>`<tr class="${fz(r[3],t[2],r[1],t[0])}"><td>${r[0]}</td><td class="cyc">${fN(r[1])}</td><td class="pyc">${fN(r[2])}</td><td>${fY(dv(r[1],r[2]))}</td><td>${fN(r[3])}</td><td>${fY(dv(r[3],r[4]))}</td><td>${r[5]==null?'-':r[5]+'주'}</td></tr>`).join('')+'</tbody></table></div></div>';
 if(G==='대경지역'){h+=`<div class="panel"><h3>⚠️ 재고 과부족 점검 매장 (브랜드·분류) <span class="note">매장을 누르면 이동</span></h3><div class="tw"><table class="t"><thead><tr><th>매장</th><th>구분</th><th>이름</th><th>상태</th><th>재고</th><th>재고 전년비</th><th>판매수량</th><th>판매 전년비</th><th>재고주수</th></tr></thead><tbody>`+
  AV().check.map(r=>{const T0=(AV().inv[r[0]]||{total:[0,0,0]}).total;return [r,small(r[6],T0[2],r[4],T0[0])]}).sort((a,b)=>a[1]-b[1]).map(([r,sm])=>`<tr class="clk${sm?' fade':''}" data-g="${r[0]}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${chip(r[3])}</td><td>${fN(r[4])}</td><td>${fY(r[5])}</td><td>${fN(r[6])}</td><td>${fY(r[7])}</td><td>${r[8]==null?'-':r[8]+'주'}</td></tr>`).join('')+'</tbody></table></div></div>'}
 h+=detailPanel('mid');return h}

const OLDDATA=()=>`<div class="banner">⚠️ 이 탭의 자료가 아직 올라오지 않았습니다. 저장소 <b>docs</b> 폴더에 <b>최신 data.enc.json</b>을 다시 올린 뒤 새로고침해 주세요.</div>`;
const safe=f=>()=>S.D.adv?f():'';
const VIEWS={brief:vBrief,todo:vTodo,summary:vSummary,bun:()=>vBun()+safe(()=>latestNote()+detailPanel('mid'))(),brd:()=>vBrd()+safe(()=>latestNote()+bestPanel()+detailPanel('brand'))(),inv:vInv,tz:vTz,ins:vIns};
function render(){
 $('#basis').innerHTML=BASES.map(b=>`<button class="pill bs ${b===S.basis?'on':''}" data-b="${b}">${b}</button>`).join('');
 $('#periods').innerHTML=S.D.meta.periods.map(p=>`<button class="pill ${p===S.period?'on':''} ${p.startsWith('누계')?'ytd':''}" data-p="${p}">${p.startsWith('누계')?`누계 (1~${LASTM()}월)`:p}</button>`).join('');
 $('#group').value=S.group;
 $('#tabs').innerHTML=navHTML();
 $('#gnote').textContent=S.group==='대경지역'?'22개 점 합산':'';
 const miss=(NEED[S.tab]||[]).filter(k=>!S.D[k]);S.waiting=miss.length>0;
 try{ $('#main').innerHTML=miss.length?LOADING(miss):VIEWS[S.tab]() }catch(e){console.error(e);$('#main').innerHTML=S.pending?LOADING([]):`<div class="banner">⚠️ 이 화면을 표시하지 못했습니다(${e.message}). 새로고침해 주세요. 계속되면 관리자에게 알려 주세요.</div>`}
 if(typeof syncHome==='function')syncHome();
 location.hash=`#b=${encodeURIComponent(S.basis)}&p=${encodeURIComponent(S.period)}&g=${encodeURIComponent(S.group)}&t=${S.tab}`;
}
function bind(){
 $('#basis').onclick=e=>{const b=e.target.closest('[data-b]');if(b){S.basis=b.dataset.b;render()}};
 $('#periods').onclick=e=>{const b=e.target.closest('[data-p]');if(b){S.period=b.dataset.p;render()}};
 $('#group').onchange=e=>{S.group=e.target.value;render()};
 $('#tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){S.tab=b.dataset.t;render()}};
 $('#main').onclick=e=>{
  const th=e.target.closest('th.sort');if(th){const k=th.dataset.k;S.sort=S.sort.k===k?{k,d:-S.sort.d}:{k,d:-1};render();return}
  const tg=e.target.closest('.todo-go');if(tg&&tg.dataset.g){S.group=tg.dataset.g;S.tab='home';render();window.scrollTo(0,0);return}
  const tr=e.target.closest('tr.clk');if(tr&&tr.dataset.g){S.group=tr.dataset.g;if(S.tab==='summary'||S.tab==='ins'){}render();window.scrollTo(0,0);return}
  const l1=e.target.closest('tr.l1');if(l1&&l1.dataset.k){S.open[l1.dataset.k]=!S.open[l1.dataset.k];render();return}
  const tn=e.target.closest('a.topn');if(tn){e.preventDefault();S.topN=+tn.dataset.n;render()}};
}
function b64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function decrypt(enc,pass){const te=new TextEncoder();const km=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(enc.salt),iterations:enc.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(enc.iv)},key,b64(enc.data));return JSON.parse(new TextDecoder().decode(buf))}
// ── 자료 조각 불러오기: 핵심(약 70KB)을 먼저 열고, 나머지는 뒤에서 이어 받기
const NEED={home:[],brief:['adv'],todo:['adv'],summary:[],bun:['bun','adv'],brd:['brd','adv','prod'],inv:['adv','bun','brd'],tz:[],ins:['adv'],ai:['adv','bun','brd','prod'],area:[],best:['prod']};
const PNAME={adv:'브리핑·TO DO·재고',bun:'분류별',brd:'브랜드별',prod:'베스트상품'};
const LOADING=m=>`<div class="loadbox"><div class="spin"></div><div>자료를 불러오는 중입니다…<br><small>${m.map(k=>PNAME[k]||k).join(' · ')}</small></div></div>`;
function loadLib(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function gunzip(u8){
 if(typeof DecompressionStream!=='undefined'){const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(st).arrayBuffer())}
 if(!window.fflate)await loadLib('fflate.min.js');return window.fflate.gunzipSync(u8)}
async function loadPart(name){const r=await fetch(S.man.parts[name].f);if(!r.ok)throw new Error('자료 파일을 받지 못했습니다');
 const b=new Uint8Array(await r.arrayBuffer());const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},S.key,b.slice(12));
 return JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(pt))))}
async function unlock(pass){
 const mr=await fetch('manifest.json?v='+Date.now(),{cache:'no-store'});
 if(mr.ok){
  S.man=await mr.json();const te=new TextEncoder();
  const km=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
  S.key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(S.man.salt),iterations:S.man.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  S.D=await loadPart('core');
  const rest=Object.keys(S.man.parts).filter(k=>k!=='core');S.pending=rest.length;
  S.ready=Promise.all(rest.map(k=>loadPart(k).then(v=>{S.D[k]=v}).catch(e=>{console.error(k,e)}).finally(()=>{S.pending--;if(S.waiting&&!(NEED[S.tab]||[]).some(x=>!S.D[x]))render();else if(S.waiting&&!S.pending)render()})));
 }else{
  const enc=await (await fetch('data.enc.json?v='+Date.now(),{cache:'no-store'})).json();
  S.D=await decrypt(enc,pass);S.ready=Promise.resolve();S.pending=0;
 }
 const h=new URLSearchParams(location.hash.slice(1));
 S.basis=BASES.includes(h.get('b'))?h.get('b'):'합계';
 S.period=S.D.meta.periods.includes(h.get('p'))?h.get('p'):S.D.meta.periods[0];
 const my=lsGet('dg_store');S.group=S.D.meta.groups.includes(h.get('g'))?h.get('g'):(S.D.meta.groups.includes(my)?my:'대경지역');
 S.tab=(TABS.some(t=>t[0]===h.get('t'))&&h.get('t')!=='todo')?h.get('t'):'home';
 $('#asof').textContent='자료 기준일 '+S.D.meta.asof;if($('#hnote'))$('#hnote').textContent=S.D.meta.note;
 $('#group').innerHTML=S.D.meta.groups.map(g=>`<option value="${g}">${gname(g)}</option>`).join('');
 $('#gate').style.display='none';$('#app').style.display='block';bind();render();
 if(!h.get('g')&&!lsGet('dg_store'))openPicker(true);
}
function init(){
 const go=async()=>{$('#err').textContent='';$('#go').disabled=true;$('#go').textContent='여는 중…';const pw=$('#pw').value;
  try{await unlock(pw);if($('#remember')&&$('#remember').checked)lsSet('dg_pw',pw)}catch(e){console.error(e);$('#err').textContent='암호가 올바르지 않거나 자료를 읽지 못했습니다.'}
  finally{$('#go').disabled=false;$('#go').textContent='열기'}};
 const saved=lsGet('dg_pw');if(saved){$('#pw').value=saved;if($('#remember'))$('#remember').checked=true;
  unlock(saved).catch(()=>{lsDel('dg_pw');$('#pw').value='';$('#err').textContent='저장된 암호가 바뀌었습니다. 새 암호를 입력해 주세요.'})}
 $('#go').onclick=go;$('#pw').onkeydown=e=>{if(e.key==='Enter')go()};
}
if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init()}
if(typeof window!=='undefined')window.__app={S,render,unlock,TABS,MX,BASES};
// ===== 다운로드 (열람 중인 화면 → PDF 보기용 / 엑셀 편집용) =====
(function(){
 const css=`.dlbar{display:flex;justify-content:flex-end;gap:6px;margin:0 0 8px;flex-wrap:wrap}.dlbtn{border:1px solid #1f3864;background:#fff;color:#1f3864;border-radius:16px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}
.dlbtn.main{background:#1f3864;color:#fff}.dlbtn[disabled]{opacity:.55;cursor:wait}.dlmini{border:1px solid #c9d3e6;background:#fff;color:#1f3864;border-radius:10px;padding:1px 7px;font-size:11px;cursor:pointer;margin-left:6px;vertical-align:middle}`;
 document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
 const libs={};
 const need=src=>libs[src]||(libs[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src+'?v=1';s.onload=ok;s.onerror=()=>{delete libs[src];no(new Error('다운로드 기능을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'))};document.head.appendChild(s)}));
 const TN=()=>Object.fromEntries(TABS)[S.tab]||S.tab;
 const fname=(ext,s)=>`대경_${TN()}_${S.group==='대경지역'?'지역전체':S.group}_${plabel(S.period)}_${S.basis}${s?'_'+s:''}.${ext}`.replace(/[\\/:*?"<>|\s()]+/g,'_');
 const title=p=>{const h=p.querySelector('h3');if(!h)return '';const c=h.cloneNode(true);c.querySelectorAll('.note,.dlmini').forEach(x=>x.remove());return c.textContent.replace(/[📌📈🤖💡🗓️✔❓✅🔎🏆🩺⚠️]/gu,'').trim()};
 const sub=()=>`${gname(S.group)} · ${plabel(S.period)} · ${S.basis} 기준(${BNOTE[S.basis]}) · 자료 기준일 ${S.D.meta.asof}`;
 // ---------- 엑셀 (서식 포함)
 const NAVY='1F3864',bd={style:'thin',color:{rgb:'D0D7E5'}},BORDER={top:bd,bottom:bd,left:bd,right:bd};
 const ST={title:{font:{bold:true,sz:13,color:{rgb:NAVY}}},sub:{font:{sz:9,color:{rgb:'6B7385'}}},
  th:{font:{bold:true,color:{rgb:'FFFFFF'},sz:10},fill:{fgColor:{rgb:NAVY}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:BORDER}};
 const wlen=s=>[...String(s)].reduce((a,c)=>a+(c.charCodeAt(0)>255?2:1),0);
 function parse(x){const m=x.match(/^([+-]?[\d,]+(?:\.\d+)?)(%p|%|원\/h|원|주|개|h|일|억원|억)?$/);if(!m)return null;let n=parseFloat(m[1].replace(/,/g,''));if(isNaN(n))return null;const u=m[2]||'';
  if(u==='억'||u==='억원')return{v:n*1e8,z:'#,##0'};
  if(u==='%')return{v:n/100,z:/^[+-]/.test(x)?'+0.0%;-0.0%;0.0%':'0.0%'};if(u==='%p')return{v:n,z:'+0.0"%p";-0.0"%p";0.0"%p"'};
  if(u==='주'||(/\./.test(m[1])&&!u))return{v:n,z:'0.0'};return{v:n,z:'#,##0'}}
 function cellStyle(td,tr){const s={font:{sz:10,color:{rgb:'222222'}},border:BORDER,alignment:{vertical:'center'}};
  if(td.classList.contains('cyc')){s.fill={fgColor:{rgb:'D6E4F7'}};s.font.color={rgb:NAVY}}
  if(td.classList.contains('pyc')){s.fill={fgColor:{rgb:'E4E4E4'}};s.font.color={rgb:'3F3F3F'}}
  if(tr.classList.contains('tot')){s.fill={fgColor:{rgb:'D9E2F3'}};s.font.bold=true;s.font.color={rgb:NAVY}}
  if(tr.classList.contains('l0')){s.fill={fgColor:{rgb:'EEF3FA'}};s.font.bold=true}
  if(tr.classList.contains('me')){s.fill={fgColor:{rgb:'FFF2CC'}};s.font.bold=true}
  if(td.querySelector('.pos'))s.font.color={rgb:'1A6FC4'};if(td.querySelector('.neg'))s.font.color={rgb:'C5221F'};
  const ch=td.querySelector('.chip');if(ch){s.font.bold=true;s.alignment.horizontal='center';
   if(ch.classList.contains('bad'))s.font.color={rgb:'C5221F'},s.fill={fgColor:{rgb:'FDE8E6'}};else if(ch.classList.contains('warn'))s.font.color={rgb:'7F6000'},s.fill={fgColor:{rgb:'FFF2CC'}};else if(ch.classList.contains('good'))s.font.color={rgb:'1A6FC4'},s.fill={fgColor:{rgb:'E3F0FB'}}}
  return s}
 function tableSheet(tb,ttl){const aoa=[[ttl],[sub()],[]],styles=[],merges=[];let r0=3;const widths=[];
  tb.querySelectorAll('tr').forEach((tr,ri)=>{const row=[],sr=[];let c=0;
   tr.querySelectorAll('th,td').forEach(td=>{const x=td.textContent.replace(/[▸▾▼▲]/g,'').trim(),isH=td.tagName==='TH';
    const p=isH?null:parse(x);const cell=p?{v:p.v,t:'n',z:p.z}:{v:x,t:'s'};
    const st=isH?ST.th:cellStyle(td,tr);if(p)st.alignment=Object.assign({},st.alignment,{horizontal:'right'});if(td.classList.contains('l2')||(tr.classList.contains('l2')&&c===0))st.alignment=Object.assign({},st.alignment,{indent:2});
    cell.s=st;row[c]=cell;widths[c]=Math.max(widths[c]||6,Math.min(46,wlen(p?x:x)+2));
    const cs=+td.getAttribute('colspan')||1;if(cs>1){merges.push({s:{r:r0+ri,c},e:{r:r0+ri,c:c+cs-1}});for(let k=1;k<cs;k++)row[c+k]={v:'',t:'s',s:st}}c+=cs});
   aoa.push(row)});
  const ws=XLSX.utils.aoa_to_sheet(aoa.map(r=>r.map(x=>x&&typeof x==='object'?x.v:x)));
  aoa.forEach((r,ri)=>r.forEach((x,ci)=>{if(x&&typeof x==='object'){const a=XLSX.utils.encode_cell({r:ri,c:ci});ws[a]={v:x.v,t:x.t,s:x.s};if(x.z)ws[a].z=x.z}}));
  ws.A1.s=ST.title;ws.A2.s=ST.sub;ws['!merges']=merges;ws['!cols']=widths.map(w=>({wch:w}));ws['!rows']=[{hpt:22},{hpt:15},{hpt:6},{hpt:30}];
  return ws}
 function textSheet(rows,ttl){const aoa=[[ttl],[sub()],[]].concat(rows);const ws=XLSX.utils.aoa_to_sheet(aoa);ws.A1.s=ST.title;ws.A2.s=ST.sub;
  rows.forEach((r,i)=>{const a='A'+(i+4),b='B'+(i+4);if(ws[a])ws[a].s={font:{bold:true,color:{rgb:NAVY}},alignment:{vertical:'top'}};if(ws[b])ws[b].s={alignment:{wrapText:true,vertical:'top'},font:{sz:10}}});
  ws['!cols']=[{wch:16},{wch:110}];return ws}
 function cardsSheet(root){const rows=[];root.querySelectorAll('.card').forEach(c=>{const t=c.querySelector('.t'),v=c.querySelector('.v'),s=c.querySelector('.s');if(t)rows.push([t.textContent.trim(),v?v.textContent.trim():'',s?s.textContent.trim():''])});
  if(!rows.length)return null;const aoa=[['핵심 지표'],[sub()],[],['항목','값','비고']].concat(rows);const ws=XLSX.utils.aoa_to_sheet(aoa);ws.A1.s=ST.title;ws.A2.s=ST.sub;
  ['A4','B4','C4'].forEach(a=>ws[a].s=ST.th);rows.forEach((r,i)=>{const n=i+5;ws['A'+n].s={font:{bold:true,color:{rgb:NAVY}},border:BORDER,fill:{fgColor:{rgb:'F4F8FD'}}};ws['B'+n].s={font:{bold:true,sz:12},border:BORDER,alignment:{horizontal:'right'}};ws['C'+n].s={font:{color:{rgb:'6B7385'}},border:BORDER}});
  ws['!cols']=[{wch:36},{wch:18},{wch:44}];return ws}
 const sname=(t,i,used)=>{let n=((i+1)+'_'+(t||'표')).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31);while(used.has(n))n=n.slice(0,28)+'~'+used.size;used.add(n);return n};
 function listRows(p){const out=[];p.querySelectorAll('.sec,li,.ai,.todo').forEach(x=>{if(x.closest('table'))return;if(x.classList.contains('todo')){out.push(['할 일',x.innerText.replace(/\n+/g,' · ')]);return}if(x.closest('.todo'))return;out.push([x.classList.contains('sec')?x.innerText.trim():'',x.classList.contains('sec')?'':x.innerText.trim()])});return out}
 async function xlsAll(only){await need('xlsx-style.min.js');const wb=XLSX.utils.book_new(),used=new Set(),m=$('#main');
  if(!only){const cs=cardsSheet(m);if(cs)XLSX.utils.book_append_sheet(wb,cs,sname('핵심 지표',used.size,used))}
  let lt='';(only?[only]:[...m.querySelectorAll('.panel')]).forEach(p=>{const t=title(p)||(lt?lt+' 표':'표');lt=t;const tbs=p.querySelectorAll('table');
   if(tbs.length)tbs.forEach((tb,k)=>XLSX.utils.book_append_sheet(wb,tableSheet(tb,t),sname(t+(tbs.length>1?' '+(k+1):''),used.size,used)));
   else{const lr=listRows(p);if(lr.length)XLSX.utils.book_append_sheet(wb,textSheet(lr,t),sname(t,used.size,used))}});
  XLSX.writeFile(wb,fname('xlsx',only?title(only).slice(0,20):''))}
 // ---------- PDF (화면 그대로)
 async function pdfAll(){await need('html2canvas.min.js');await need('jspdf.min.js');const {jsPDF}=window.jspdf;const m=$('#main');
  const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'}),PW=297,PH=210,MG=8,W=PW-MG*2;let y=MG;
  const box=document.createElement('div');box.style.cssText='position:absolute;left:-30000px;top:0;width:1120px;padding:12px;background:#f4f6fa';
  box.innerHTML=`<style>.pdfx .tw{overflow:visible!important}.pdfx .dlbar,.pdfx .dlmini{display:none!important}.pdfx .two{grid-template-columns:1fr 1fr!important}.pdfx .card.big{grid-column:span 2!important}.pdfx table.t th{position:static!important}</style>`;
  const head=document.createElement('div');head.style.cssText='background:#1f3864;color:#fff;padding:12px 16px;border-radius:10px;margin-bottom:12px';
  head.innerHTML=`<div style="font-size:18px;font-weight:800">📊 대경지역 매출자료 · ${TN()}</div><div style="font-size:13px;opacity:.9;margin-top:4px">${sub()}</div>`;
  const cl=m.cloneNode(true);cl.classList.add('pdfx');cl.removeAttribute('id');cl.style.maxWidth='none';cl.style.padding='0';
  box.appendChild(head);box.appendChild(cl);box.classList.add('pdfx');document.body.appendChild(box);
  try{const blocks=[head,...[...cl.children].filter(x=>!x.classList.contains('dlbar')&&x.tagName!=='STYLE')];
   for(const el of blocks){const cv=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',logging:false,windowWidth:1200});
    const ratio=W/cv.width;let off=0;
    while(off<cv.height-1){const room=PH-MG-y,remain=(cv.height-off)*ratio;
     if(remain>room&&y>MG&&(room<40||remain<=PH-MG*2)){pdf.addPage();y=MG;continue}
     const take=Math.min(remain,room),hp=Math.round(take/ratio);const c2=document.createElement('canvas');c2.width=cv.width;c2.height=hp;
     c2.getContext('2d').drawImage(cv,0,off,cv.width,hp,0,0,cv.width,hp);
     pdf.addImage(c2.toDataURL('image/jpeg',0.9),'JPEG',MG,y,W,hp*ratio);y+=hp*ratio+3;off+=hp;
     if(off<cv.height-1){pdf.addPage();y=MG}}}
   pdf.save(fname('pdf'))}finally{box.remove()}}
 const run=(btn,f,label)=>{const t=btn.textContent;btn.disabled=true;btn.textContent='만드는 중…';Promise.resolve(S.ready).then(()=>f()).catch(e=>alert(e.message)).finally(()=>{btn.disabled=false;btn.textContent=t})};
 const _r=render;render=function(){_r();const m=$('#main');if(!m||!S.D)return;
  m.insertAdjacentHTML('afterbegin','<div class="dlbar"><button class="dlbtn main" id="dlpdf" title="지금 화면을 색·표·그래프 그대로 PDF로 저장 (보기·보고용)">📄 PDF 받기</button><button class="dlbtn" id="dlxls" title="지금 화면의 표를 서식 있는 엑셀로 저장 (편집·분석용)">📊 엑셀 받기</button></div>');
  m.querySelectorAll('.panel').forEach(p=>{const h=p.querySelector('h3');if(h&&p.querySelector('table'))h.insertAdjacentHTML('beforeend','<button class="dlmini" title="이 표만 엑셀로 저장">⬇ 엑셀</button>')});
  $('#dlpdf').onclick=e=>{e.stopPropagation();run(e.currentTarget,pdfAll)};$('#dlxls').onclick=e=>{e.stopPropagation();run(e.currentTarget,()=>xlsAll())};
  m.querySelectorAll('.dlmini').forEach(b=>b.onclick=e=>{e.stopPropagation();e.preventDefault();run(b,()=>xlsAll(b.closest('.panel')))})};
 if(typeof window!=='undefined')window.__app.render=render;
})();

// ===== 확장 탭: AI 분석 · 상권 · 베스트상품 (2026-11-15) =====
(function(){
 const css=`.qbox{display:flex;gap:8px;flex-wrap:wrap}.qbox input{flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:15px}
.qbox button{border:0;border-radius:10px;background:var(--navy);color:#fff;font-weight:700;padding:10px 16px;font-size:14px;cursor:pointer}
.sug{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.sug button{border:1px solid var(--line);background:#f4f8fd;border-radius:14px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--navy)}
.qa{border-left:4px solid var(--blue)}.qq{font-weight:700;color:var(--navy);font-size:15px;margin-bottom:2px}.qsub{font-size:12px;color:var(--mut);margin-bottom:8px}
.abar{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}.abtn{border:1px solid #c9d3e6;background:#fff;color:var(--navy);border-radius:12px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer}
.ah{font-size:14px;font-weight:700;color:var(--navy);margin:10px 0 4px}
.gr0{background:#fde8e6;color:#c5221f}.gr1{background:#ffe9d6;color:#b45309}.gr2{background:#e3f4e8;color:#1e7b3c}.gr3{background:#eceff4;color:#55607a}
.clu{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:#fff}.clu.g0{border-left:5px solid #d93025}.clu.g1{border-left:5px solid #e8833a}.clu.g2{border-left:5px solid #2e9e55}.clu.g3{border-left:5px solid #9aa3b5}
.clu h4{margin:0 0 4px;font-size:15px;color:var(--navy)}.clu .hd{font-size:13px;margin:4px 0 6px;font-weight:600}
.hm{border-collapse:collapse;font-size:12px;width:100%}.hm th,.hm td{padding:4px 5px;text-align:center;white-space:nowrap}.hm td:first-child,.hm th:first-child{text-align:left;position:sticky;left:0;background:#fff}
.hm .c{width:26px;height:20px;border-radius:4px;display:inline-block}
.tl{margin:4px 0 0;padding:0;list-style:none}.tl li{display:flex;gap:8px;padding:3px 0;font-size:13px;border-bottom:1px dashed var(--line)}.tl li b{flex:0 0 46px;color:var(--blue)}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}
.pc{border:1px solid var(--line);border-radius:12px;background:#fff;overflow:hidden;display:flex;flex-direction:column}
.pimg{height:128px;background:linear-gradient(135deg,#eef3fa,#dfe8f5);display:flex;align-items:center;justify-content:center;position:relative}
.pimg{height:168px}.pimg a{position:absolute;inset:0;display:block;background:#fff}.pimg img{width:100%;height:100%;object-fit:contain;background:#fff}.pimg .rk{z-index:2}.thumb{width:44px;height:44px;object-fit:contain;border-radius:6px;background:#fff;vertical-align:middle}.pimg .ph{font-size:12px;color:#6b7385;text-align:center;line-height:1.5}.pimg .ph b{display:block;font-size:20px;color:var(--navy)}
.pimg .rk{position:absolute;left:6px;top:6px;background:var(--navy);color:#fff;border-radius:10px;font-size:12px;font-weight:700;padding:1px 8px}
.pb{padding:8px 10px;display:flex;flex-direction:column;gap:3px;flex:1}.pb .nm{font-weight:700;font-size:13px;line-height:1.35}.pb .sty{font-size:11px;color:var(--mut)}
.pb .kv{display:flex;justify-content:space-between;font-size:12px}.pb .kv b{color:var(--navy)}
.plk{display:flex;gap:4px;flex-wrap:wrap;margin-top:auto;padding-top:4px}.plk a{font-size:11px;border:1px solid var(--line);border-radius:8px;padding:2px 6px;text-decoration:none;color:var(--navy);background:#f7f9fc}.plk a.m{background:var(--navy);color:#fff;border-color:var(--navy)}
.bhd{font-size:15px;font-weight:800;color:#fff;background:var(--navy);border-radius:8px;padding:6px 12px;margin:14px 0 6px;display:flex;justify-content:space-between}
.chd{font-size:13px;font-weight:700;color:var(--navy);margin:10px 0 6px;padding-left:8px;border-left:4px solid var(--blue)}
.fl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.fl select{min-width:120px;font-size:13px;padding:5px 8px}.fl label{font-size:12px;color:var(--mut)}`;
 document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
 TABS.push(['ai','AI 분석'],['area','상권'],['best','베스트상품']);
 const X={ai:[],seq:0,bf:{brand:'',big:'',mid:'',sm:'',scope:'auto',sort:'sales',view:'card'},af:''};
 const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const strip=h=>String(h).replace(/<[^>]+>/g,'');
 const chipx=(t,c)=>`<span class="chip ${c||'mid'}">${t}</span>`;
 const ulx=a=>`<ul class="blist">${a.map(x=>`<li>${x}</li>`).join('')}</ul>`;
 const LM=()=>LASTM()+'월',YTD=()=>S.D.meta.periods.find(p=>p.startsWith('누계'));
 const ADV=m=>S.D.adv&&S.D.adv.months&&S.D.adv.months[m];
 const advM=P=>ADV(P)?P:S.D.adv.latest;
 // ---------- 공통 지표
 const K=(P,G)=>S.D.kpi[P][G];
 const MET={
  tot:{l:'실적합계',re:/실적|매출|판매액|합계|성과/,f:'won',cy:(k,m)=>k.cy_tot,py:(k,m)=>k.py_tot},
  off:{l:'매장매출(오프라인)',re:/매장매출|오프라인/,f:'won',cy:k=>k.cy_off,py:k=>k.py_off},
  int:{l:'재고통합(온라인)',re:/재고통합|온라인/,f:'won',cy:k=>k.cy_int,py:k=>k.py_int},
  ach:{l:'목표 달성률',re:/달성|목표/,f:'pct',cy:k=>k.target?k.cy_tot/k.target:null,py:()=>null},
  yoy:{l:'전년비',re:/전년비|전년대비|전년 대비|신장|성장률|증감률/,f:'pctS',cy:k=>k.py_tot?k.cy_tot/k.py_tot-1:null,py:()=>null},
  conv:{l:'구매전환율',re:/전환/,f:'pct',cy:k=>k.cy_vis?k.cy_buy/k.cy_vis:null,py:k=>k.py_vis?k.py_buy/k.py_vis:null},
  atv:{l:'객단가(합계)',re:/객단가/,f:'num',cy:k=>k.cy_cnt?k.cy_tot/k.cy_cnt:null,py:k=>k.py_cnt?k.py_tot/k.py_cnt:null},
  disc:{l:'할인율(에누리)',re:/할인|에누리/,f:'pct',cy:k=>k.cy_norm?1-k.cy_tot/k.cy_norm:null,py:k=>k.py_norm?1-k.py_tot/k.py_norm:null},
  prof:{l:'이익율',re:/이익/,f:'pct',cy:k=>k.cy_tot?k.cy_prof/k.cy_tot:null,py:k=>k.py_tot?k.py_prof/k.py_tot:null},
  ip:{l:'인시생산성',re:/인시|생산성/,f:'num',cy:(k,i)=>i.cy.h?i.cy.tot/i.cy.h:null,py:(k,i)=>i.py.h?i.py.tot/i.py.h:null},
  vis:{l:'입점객수',re:/입점|방문객|유동|트래픽|내점/,f:'num',cy:k=>k.cy_vis,py:k=>k.py_vis},
  buy:{l:'매장 구매객수',re:/구매객|고객수|고객 수|객수|구매고객|구매 고객/,f:'num',cy:k=>k.cy_buy,py:k=>k.py_buy}};
 const mv=(key,P,G,py)=>{const k=K(P,G),i=S.D.ins[P][G];const v=(py?MET[key].py:MET[key].cy)(k,i);return v==null||isNaN(v)||(py&&!v)?null:v};
 const fmt=(key,v)=>{const f=MET[key].f;return v==null?'-':f==='won'?fEok(v)+'원':f==='pct'?fP(v):f==='pctS'?(v>=0?'+':'')+(v*100).toFixed(1)+'%':fN(v)+(key==='ip'?'원/h':key==='atv'?'원':'')};
 const chg=(key,c,p)=>{if(c==null||p==null)return null;const f=MET[key].f;return f==='pct'?{t:fPP(c-p),v:c-p}:{t:(c/p-1>=0?'+':'')+((c/p-1)*100).toFixed(1)+'%',v:c/p-1}};
 const chgH=c=>c?`<span class="${c.v>=0?'pos':'neg'}">${c.t}</span>`:'-';
 const cfmt=key=>MET[key].f==='won'?fEok:MET[key].f.startsWith('pct')?(v=>(v*100).toFixed(0)+'%'):(v=>v>=10000?Math.round(v/1000)+'천':fN(v));
 // ---------- 질문 해석
 const BKO={'나이키':'NIKE','뉴발란스':'NEW BALANCE','뉴발':'NEW BALANCE','아디다스':'ADIDAS','스케쳐스':'SKECHERS','스케처스':'SKECHERS','휠라':'FILA','푸마':'PUMA','크록스':'CROCS','컨버스':'CONVERSE','반스':'VANS','아식스':'ASICS','닥터마틴':'DR.MARTENS','호카':'HOKA','살로몬':'SALOMON','리복':'REEBOK','미즈노':'MIZUNO','팀버랜드':'TIMBERLAND','누오보':'NUOVO','호킨스':'HAWKINS','버켄스탁':'BIRKENSTOCK','어그':'UGG','헌터':'HUNTER','캉골':'KANGOL','디스커버리':'DISCOVERY','오니츠카':'ONITSUKA TIGER','언더아머':'UNDER ARMOUR','르꼬끄':'LE COQ SPORTIF','프로스펙스':'PROSPECS','스테파노로시':'STEFANO ROSSI'};
 const CKO={'운동화':'SPORTS SHOES','스포츠화':'SPORTS SHOES','스포츠':'SPORTS SHOES','러닝':'RUNNING','런닝':'RUNNING','스니커즈':'SNEAKER','스니커':'SNEAKER','샌들':'SANDAL','부츠':'BOOTS','키즈':'KIDS','아동':'KIDS','워킹':'WALKING','슬리퍼':'SLIDE','구두':'BUSINESS SHOES','양말':'SOCKS','가방':'BAG','깔창':'INSOLE','슈케어':'SHOES CARE','라이프스타일':'LIFE STYLE','농구':'BASKETBALL','축구':'SOCCER','트레킹':'TREKKING','등산':'TREKKING','여성화':'LADIESSHOES','숙녀화':'LADIESSHOES','캐주얼':'LEATHER CASUAL','모자':'HEADWEAR','방한':'WINTER BOOTS','신발':'신발','의류':'의류','용품':'용품'};
 const SALIAS={'롯데백화점':['SE 대구롯데점'],'백화점':['SE 대구롯데점'],'스타필드':['SE 경산스타필드마켓점'],'경산':['SE 경산스타필드마켓점'],'김천':['ST 김천롯데마트점'],'인동':['ST 구미인동점'],'원평':['ST 구미원평점'],'현대아울렛':['ST 대구현대아울렛점'],'현대':['ST 대구현대아울렛점'],'신매':['ST 대구신매점'],'칠곡':['ST 대구칠곡점'],'중앙로':['MS 대구중앙로역점'],'이시아':['KM 대구이시아폴리스점','SE 대구이시아폴리스점'],'율하':['KM 율하롯데아울렛점','ST 율하롯데아울렛점'],'홈플러스':['KM 성서홈플러스점','ST 성서홈플러스점'],'홈플러스성서':['KM 성서홈플러스점','ST 성서홈플러스점'],'롯데아울렛율하':['KM 율하롯데아울렛점','ST 율하롯데아울렛점'],'이마트월배':['KM 대구월배이마트점'],'롯데마트구미':['ST 구미롯데마트점'],'롯데마트김천':['ST 김천롯데마트점'],'성서홈플':['KM 성서홈플러스점','ST 성서홈플러스점'],'월배이마트':['KM 대구월배이마트점'],'이마트':['KM 대구월배이마트점'],'구미롯데마트':['ST 구미롯데마트점'],'동성로중앙':['FH 대구동성로중앙점','GS 대구동성로중앙점'],'구미':['ST 구미롯데마트점','ST 구미원평점','ST 구미인동점'],'동성로':['FH 대구동성로중앙점','GS 대구동성로중앙점','MS 대구중앙로역점','SP 대구동성로점'],'월배':['KM 대구월배이마트점','ST 대구월배점'],'성서':['ST 대구성서점']};
 function findStores(q){const n=q.replace(/\s/g,'').toUpperCase(),hits=[];
  S.D.meta.stores.forEach(s=>{const [pf,...r]=s.split(' '),core=r.join('').toUpperCase(),c2=core.replace(/점$/,''),c3=c2.replace(/^대구/,'');
   [[pf+core,9],[pf+c2,9],[pf+c3,9],[core,5],[c2,4],[c3+'점',6],[c3,3]].forEach(([a,w])=>{if(a.length<2)return;let i=n.indexOf(a);while(i>=0){hits.push({s:[s],i,e:i+a.length,w:w+a.length});i=n.indexOf(a,i+1)}})});
  Object.entries(SALIAS).forEach(([a,ss])=>{let i=n.indexOf(a);while(i>=0){hits.push({s:ss,i,e:i+a.length,w:a.length+4});i=n.indexOf(a,i+1)}});
  hits.sort((a,b)=>b.w-a.w||(b.e-b.i)-(a.e-a.i));const used=[],out=[];
  hits.forEach(h=>{if(used.some(u=>h.i<u.e&&h.e>u.i))return;used.push(h);
   let ss=h.s;if(ss.length>1){const pre=n.slice(Math.max(0,h.i-2),h.i),f=ss.filter(s=>pre===s.slice(0,2));if(f.length)ss=f}
   // 같은 위치에서 여러 점이 같은 점수로 잡히면(예: 이시아폴리스 KM·SE) 모두 포함
   hits.filter(o=>o!==h&&o.i===h.i&&o.e===h.e&&o.w===h.w).forEach(o=>o.s.forEach(s=>{if(!ss.includes(s))ss=ss.concat(s)}));
   ss.forEach(s=>{if(!out.includes(s))out.push(s)})});
  return out.sort((a,b)=>S.D.meta.stores.indexOf(a)-S.D.meta.stores.indexOf(b))}
 function findMonths(q){const L=LASTM(),all=MONTHS(),o=new Set();let m;
  const rg=/(\d{1,2})\s*월?\s*(?:~|-|부터|에서)\s*(\d{1,2})\s*월/g;while((m=rg.exec(q))){for(let i=+m[1];i<=+m[2];i++)if(all.includes(i))o.add(i)}
  if(!o.size){const r1=/(\d{1,2})\s*월/g;while((m=r1.exec(q)))if(all.includes(+m[1]))o.add(+m[1])}
  if(/상반기/.test(q))[1,2,3,4,5,6].forEach(i=>all.includes(i)&&o.add(i));if(/하반기/.test(q))all.filter(i=>i>=7).forEach(i=>o.add(i));
  const qt=q.match(/([1-4])\s*분기/);if(qt)all.filter(i=>Math.ceil(i/3)===+qt[1]).forEach(i=>o.add(i));
  if(/지난달|전월|최근월|이번달|이번 달|최근 달|마감월/.test(q))o.add(L);
  if(/최근\s*3\s*개월|최근 석달/.test(q))all.slice(-3).forEach(i=>o.add(i));
  return{list:[...o].sort((a,b)=>a-b),ytd:/누계|누적|올해|금년|연간|전체기간|1년/.test(q)}}
 function parseQ(q){const D=S.D,n=q.replace(/\s/g,'').toUpperCase();
  const stores=findStores(q),mo=findMonths(q);
  const brands=[];D.brd.brands.forEach(b=>{if(b==='합계')return;const k=b.replace(/[\s.\-]/g,'').toUpperCase();if(k.length>=3&&n.replace(/[.\-]/g,'').includes(k))brands.push(b)});
  Object.entries(BKO).forEach(([k,v])=>{if(q.includes(k)){const b=D.brd.brands.find(x=>x.toUpperCase()===v)||D.brd.brands.find(x=>x.toUpperCase().includes(v));if(b&&!brands.includes(b))brands.push(b)}});
  const cats=[];const names=new Set();D.bun.rows.forEach(r=>r.forEach(x=>{if(x&&x!=='합계')names.add(x)}));
  [...names].sort((a,b)=>b.length-a.length).forEach(c=>{const k=c.replace(/\s/g,'').toUpperCase();if(k.length>=3&&/[A-Z]/.test(k)&&n.includes(k)&&!cats.some(x=>x.toUpperCase().includes(c.toUpperCase())))cats.push(c)});
  Object.entries(CKO).forEach(([k,v])=>{if(q.includes(k)&&names.has(v)&&!cats.includes(v)&&!(['신발','의류','용품'].includes(k)&&!/분류|카테고리|대분류/.test(q)))cats.push(v)});
  const mets=Object.keys(MET).filter(k=>MET[k].re.test(q)&&!(k==='tot'&&/재고통합|매장매출|오프라인|온라인/.test(q)));
  const has=r=>r.test(q);
  const f={trend:has(/추이|추세|흐름|월별|변화|트렌드|그래프|차트|동향|언제|매월/),rank:has(/순위|랭킹|top|TOP|상위|하위|1등|1위|꼴찌|가장|제일|어디|어느|매장별|점별|지점별|전 매장|전매장|워스트|베스트 매장|우수|부진한 매장|부진 매장|낮은|높은/),
   low:has(/하위|꼴찌|부진|낮은|워스트|나쁜|저조|못한|떨어/),cmp:has(/비교|vs|VS|대비해|차이/),why:has(/왜|원인|이유|부진|하락|떨어|감소|줄었|안 좋|나빠|저조/),todo:has(/할 일|할일|todo|TODO|개선|대책|방안|조치|어떻게 해|액션|과제|해야/),
   area:has(/상권|경쟁사|경쟁점|동업계|뉴스|리스크|등급|개발|입점|폐점|무신사|슈마커|대백|대구백화점/),best:has(/베스트|인기|잘 ?팔|잘 ?나가|히트|상품|스타일|품절|효자|주력/),inv:has(/재고(?!통합)|과다|재고주수|품절|보충|소진/),tz:has(/시간대|피크|몇 ?시|시간별/),
   brand:has(/브랜드/),cat:has(/분류|카테고리|품목|카테/),week:has(/주차|주간|주별/),brief:has(/브리핑|요약|현황|어때|어떤가|정리|종합|상황|알려|보여/)};
  return{q,stores,mo,brands,cats,mets,f}}
 // ---------- 답변 조립
 const A=(title)=>({title,bul:[],blocks:[],notes:[]});
 const addT=(a,cap,head,rows,cls)=>a.blocks.push({t:'table',cap,head,rows,cls});
 const addC=(a,cap,html,leg)=>a.blocks.push({t:'chart',cap,html,leg});
 const PL=p=>p.startsWith('누계')?`누계(1~${LASTM()}월)`:p;
 const Gs=p=>p.stores.length?p.stores:[S.group];
 const Pof=p=>p.mo.ytd&&!p.mo.list.length?YTD():p.mo.list.length?p.mo.list[p.mo.list.length-1]+'월':S.period;
 const COL=['#2f75b5','#e8833a','#2e9e55','#8e5bd0','#d93025','#00a3a3','#b3b3b3'];
 function aTrend(p,key){key=key||'tot';const D=S.D,gs=Gs(p).slice(0,6),ms=p.mo.list.length>1?p.mo.list:MONTHS(),lab=ms.map(m=>m+'월');
  const a=A(`${gs.map(gname).join(' · ')} — ${MET[key].l} 월별 추이`);
  if(gs.length===1){const g=gs[0],cy=ms.map(m=>mv(key,m+'월',g)),py=ms.map(m=>mv(key,m+'월',g,true)),hasPy=py.some(v=>v!=null);
   const ser=[{name:'금년',color:CY,vals:cy}].concat(hasPy?[{name:'전년',color:PY,vals:py}]:[]);
   addC(a,'',MET[key].f==='won'||key==='vis'||key==='buy'?barChart(lab,ser,{fmt:cfmt(key)}):lineChart(lab,ser,{fmt:cfmt(key)}),hasPy?[[CY,'금년'],[PY,'전년']]:[[CY,'금년']]);
   const v=cy.map((x,i)=>({x,i})).filter(o=>o.x!=null);if(v.length){const hi=v.reduce((m,o)=>o.x>m.x?o:m),lo=v.reduce((m,o)=>o.x<m.x?o:m),last=v[v.length-1];
    a.bul.push(`최근 ${lab[last.i]} ${MET[key].l} <b>${fmt(key,last.x)}</b>${py[last.i]!=null?` (전년 ${fmt(key,py[last.i])}, ${chgH(chg(key,last.x,py[last.i]))})`:''}`);
    a.bul.push(`가장 높았던 달 <b>${lab[hi.i]}</b> ${fmt(key,hi.x)} · 가장 낮았던 달 <b>${lab[lo.i]}</b> ${fmt(key,lo.x)}`);
    if(hasPy){const up=v.filter(o=>py[o.i]!=null&&o.x>=py[o.i]).length,cnt=v.filter(o=>py[o.i]!=null).length;a.bul.push(`전년보다 좋았던 달 ${up}개 / 비교 가능한 ${cnt}개 달`)}
    if(v.length>=3){const l3=v.slice(-3).map(o=>o.x);a.bul.push(`최근 3개월 흐름: ${l3.map(x=>fmt(key,x)).join(' → ')} (${l3[2]>l3[0]?'상승':'하락'} 방향)`)}}
   addT(a,'',['월','금년'].concat(hasPy?['전년','증감']:[]),ms.map((m,i)=>[m+'월',fmt(key,cy[i])].concat(hasPy?[fmt(key,py[i]),chgH(chg(key,cy[i],py[i]))]:[])),['','cyc','pyc','']);
  }else{const ser=gs.map((g,j)=>({name:g,color:COL[j],vals:ms.map(m=>mv(key,m+'월',g))}));
   addC(a,'금년 기준',lineChart(lab,ser,{fmt:cfmt(key)}),gs.map((g,j)=>[COL[j],g]));
   const last=ms[ms.length-1]+'월';gs.forEach(g=>{const c=mv(key,last,g),pv=mv(key,last,g,true);a.bul.push(`<b>${g}</b> ${last} ${fmt(key,c)}${pv!=null?` (전년 대비 ${chgH(chg(key,c,pv))})`:''}`)});
   addT(a,'',['월'].concat(gs),ms.map(m=>[m+'월'].concat(gs.map(g=>fmt(key,mv(key,m+'월',g))))))}
  return a}
 function aRank(p,key){key=key||'tot';const P=Pof(p),D=S.D,asc=p.f.low;
  let rows=D.meta.stores.map(s=>({s,c:mv(key,P,s),p:mv(key,P,s,true)})).filter(r=>r.c!=null);rows.sort((x,y)=>asc?x.c-y.c:y.c-x.c);
  const a=A(`${PL(P)} 매장별 ${MET[key].l} 순위${asc?' (낮은 순)':''}`);const reg=mv(key,P,'대경지역');
  const t3=rows.slice(0,3),b3=rows.slice(-3).reverse();
  a.bul.push(`${asc?'가장 낮은':'가장 높은'} 3곳: ${t3.map(r=>`<b>${r.s}</b> ${fmt(key,r.c)}`).join(' · ')}`);
  a.bul.push(`${asc?'가장 높은':'가장 낮은'} 3곳: ${b3.map(r=>`<b>${r.s}</b> ${fmt(key,r.c)}`).join(' · ')}`);
  if(reg!=null)a.bul.push(`지역 전체 ${MET[key].l} ${fmt(key,reg)}${MET[key].f!=='won'&&key!=='vis'&&key!=='buy'?` — 지역 값보다 높은 매장 ${rows.filter(r=>r.c>reg).length}곳 / 낮은 매장 ${rows.filter(r=>r.c<reg).length}곳`:''}`);
  const mine=Gs(p).filter(g=>g!=='대경지역');mine.forEach(g=>{const i=rows.findIndex(r=>r.s===g);if(i>=0)a.bul.push(`<b>${g}</b>는 ${rows.length}개 점 중 <b>${i+1}위</b>`)});
  addC(a,'',barChart(rows.map(r=>r.s.replace(/^(\S+) (대구)?/,'$1 ').replace(/점$/,'')),[{name:MET[key].l,color:CY,vals:rows.map(r=>key==='yoy'?Math.max(0,r.c):r.c)}],{rot:true,h:280,fmt:cfmt(key)}),null);
  if(key==='yoy')a.notes.push('그래프는 0 미만(감소) 매장을 0으로 표시합니다. 정확한 값은 표를 보세요.');
  const hasPy=rows.some(r=>r.p!=null);
  addT(a,'',['순위','매장',MET[key].l].concat(hasPy?['전년','증감']:[]),rows.map((r,i)=>[i+1,r.s,fmt(key,r.c)].concat(hasPy?[fmt(key,r.p),chgH(chg(key,r.c,r.p))]:[])),['','','cyc','pyc','']);
  return a}
 function kpiRows(P,g){return ['tot','off','int','ach','conv','atv','disc','prof','ip','vis','buy'].map(k=>{const c=mv(k,P,g),pv=mv(k,P,g,true);return [MET[k].l,fmt(k,c),pv==null?'-':fmt(k,pv),chgH(chg(k,c,pv))]})}
 function aCompare(p,key){const P=Pof(p),gs=Gs(p).slice(0,6),keys=['tot','yoy','ach','conv','atv','disc','prof','ip','vis'];
  const a=A(`${gs.join(' vs ')} — ${PL(P)} 비교`);
  addT(a,'',['지표'].concat(gs),keys.map(k=>[MET[k].l].concat(gs.map(g=>fmt(k,mv(k,P,g))))));
  keys.slice(0,6).forEach(k=>{const v=gs.map(g=>({g,c:mv(k,P,g)})).filter(o=>o.c!=null);if(v.length>1){const hi=v.reduce((m,o)=>o.c>m.c?o:m);a.bul.push(`${MET[k].l}: <b>${hi.g}</b>가 가장 높음 (${fmt(k,hi.c)})`)}});
  const t=aTrend(p,key||'tot');a.blocks=a.blocks.concat(t.blocks.filter(b=>b.t==='chart').map(b=>Object.assign({},b,{cap:`${MET[key||'tot'].l} 월별 추이 (금년)`})));return a}
 function sumRow(node,P,G){const d=node.data;return d.off[P][G].map((x,i)=>{const y=d.int[P][G][i];return [(x[0]||0)+(y[0]||0),(x[1]||0)+(y[1]||0),x[2],x[3]]})}
 function aBrand(p){const D=S.D,P=Pof(p),g=Gs(p)[0],names=D.brd.brands,ms=MONTHS(),lab=ms.map(m=>m+'월');
  if(!p.brands.length){const d=sumRow(D.brd,P,g),list=names.map((n,i)=>({n,v:d[i]})).filter(x=>x.n!=='합계'&&x.v[0]).sort((x,y)=>y.v[0]-x.v[0]),T=d[names.length-1][0],top=list.slice(0,10);
   const a=A(`${gname(g)} — ${PL(P)} 브랜드별 신발 실적 TOP10`);
   a.bul.push(`1~3위: ${top.slice(0,3).map(x=>`<b>${x.n}</b> ${fEok(x.v[0])}원(비중 ${fP(x.v[0]/T)})`).join(' · ')}`);
   const up=[...list].filter(x=>x.v[1]>0&&x.v[0]>T*0.005).sort((x,y)=>dv(y.v[0],y.v[1])-dv(x.v[0],x.v[1]));if(up.length)a.bul.push(`전년 대비 가장 많이 늘어난 브랜드 <b>${up[0].n}</b> ${fY(dv(up[0].v[0],up[0].v[1]))} · 가장 많이 줄어든 브랜드 <b>${up[up.length-1].n}</b> ${fY(dv(up[up.length-1].v[0],up[up.length-1].v[1]))}`);
   addC(a,'',barChart(top.map(x=>x.n),[{name:'금년',color:CY,vals:top.map(x=>x.v[0])},{name:'전년',color:PY,vals:top.map(x=>x.v[1])}],{rot:true,h:260}),[[CY,'금년'],[PY,'전년']]);
   addT(a,'',['순위','브랜드','금년','비중','전년','전년비','재고'],top.map((x,i)=>[i+1,x.n,fN(x.v[0]),fP(x.v[0]/T),fN(x.v[1]),fY(dv(x.v[0],x.v[1])),x.v[2]==null?'-':fN(x.v[2])]),['','','cyc','','pyc','','']);
   a.notes.push('신발 카테고리 · 매장매출+재고통합(판매상세에 재고통합 내역이 있는 9개 점만 온라인 포함).');return a}
  const bs=p.brands.slice(0,4),idx=bs.map(b=>names.indexOf(b));
  const a=A(`${gname(g)} — ${bs.join(' · ')} 신발 실적`);
  const ser=bs.map((b,j)=>({name:b,color:COL[j],vals:ms.map(m=>sumRow(D.brd,m+'월',g)[idx[j]][0])}));
  if(bs.length===1){const py=ms.map(m=>sumRow(D.brd,m+'월',g)[idx[0]][1]);addC(a,'월별 추이',barChart(lab,[{name:'금년',color:CY,vals:ser[0].vals},{name:'전년',color:PY,vals:py}]),[[CY,'금년'],[PY,'전년']]);
   addT(a,'월별',['월','금년','전년','전년비'],ms.map((m,i)=>[m+'월',fN(ser[0].vals[i]),fN(py[i]),fY(dv(ser[0].vals[i],py[i]))]),['','cyc','pyc',''])}
  else{addC(a,'월별 추이 (금년)',lineChart(lab,ser),bs.map((b,j)=>[COL[j],b]));addT(a,'월별 (금년)',['월'].concat(bs),ms.map((m,i)=>[m+'월'].concat(ser.map(s=>fN(s.vals[i])))))}
  bs.forEach((b,j)=>{const d=sumRow(D.brd,P,g),v=d[idx[j]],T=d[names.length-1][0];a.bul.push(`<b>${b}</b> ${PL(P)} ${fEok(v[0])}원 · 전년비 ${fY(dv(v[0],v[1]))} · 신발 내 비중 ${fP(T?v[0]/T:null)}${v[2]!=null?` · 재고 ${fN(v[2])}개(전년 ${fN(v[3])})`:''}`)});
  if(g==='대경지역'){const b=bs[0],rk=D.meta.stores.map(s=>{const v=sumRow(D.brd,P,s)[idx[0]];return{s,c:v[0],p:v[1]}}).filter(r=>r.c>0).sort((x,y)=>y.c-x.c);
   addT(a,`${b} 매장별 실적 · ${PL(P)}`,['순위','매장','금년','전년','전년비'],rk.map((r,i)=>[i+1,r.s,fN(r.c),fN(r.p),fY(dv(r.c,r.p))]),['','','cyc','pyc','']);
   const dn=rk.filter(r=>r.p>0).sort((x,y)=>dv(x.c,x.p)-dv(y.c,y.p));if(dn.length)a.bul.push(`${b} 전년비가 가장 낮은 매장 <b>${dn[0].s}</b> ${fY(dv(dn[0].c,dn[0].p))} · 가장 높은 매장 <b>${dn[dn.length-1].s}</b> ${fY(dv(dn[dn.length-1].c,dn[dn.length-1].p))}`)}
  const dm=ADV(advM(P));if(dm){const r=dm.detail[g].brand.find(x=>x[0]===bs[0]);if(r)a.bul.push(`${advM(P)} 말 ${bs[0]} 재고 ${fN(r[4])}개 · 재고주수 ${r[6]==null?'-':r[6]+'주'} · 판정 ${chipx(r[7],r[7]==='과다'?'warn':r[7]==='부족'?'bad':'good')}`)}
  a.notes.push('신발 카테고리 · 매장매출+재고통합 기준.');return a}
 function aCat(p){const D=S.D,P=Pof(p),g=Gs(p)[0],rows=D.bun.rows,ms=MONTHS(),lab=ms.map(m=>m+'월');
  const find=c=>{let i=rows.findIndex(r=>r[2]===c);if(i<0)i=rows.findIndex(r=>r[1]===c&&r[2]==null);if(i<0)i=rows.findIndex(r=>r[0]===c&&r[1]==null);return i};
  if(!p.cats.length){const d=sumRow(D.bun,P,g),mids=rows.map((r,i)=>({n:r[1],i,v:d[i]})).filter(x=>rows[x.i][1]&&rows[x.i][2]==null&&x.v[0]).sort((x,y)=>y.v[0]-x.v[0]).slice(0,10),T=d[rows.length-1][0];
   const a=A(`${gname(g)} — ${PL(P)} 중분류별 실적 TOP10`);a.bul.push(`1~3위: ${mids.slice(0,3).map(x=>`<b>${x.n}</b> ${fEok(x.v[0])}원(${fP(x.v[0]/T)})`).join(' · ')}`);
   const mv2=mids.filter(x=>x.v[1]>0).sort((x,y)=>dv(y.v[0],y.v[1])-dv(x.v[0],x.v[1]));if(mv2.length)a.bul.push(`전년 대비 가장 늘어난 분류 <b>${mv2[0].n}</b> ${fY(dv(mv2[0].v[0],mv2[0].v[1]))} · 가장 줄어든 분류 <b>${mv2[mv2.length-1].n}</b> ${fY(dv(mv2[mv2.length-1].v[0],mv2[mv2.length-1].v[1]))}`);
   addC(a,'',barChart(mids.map(x=>x.n),[{name:'금년',color:CY,vals:mids.map(x=>x.v[0])},{name:'전년',color:PY,vals:mids.map(x=>x.v[1])}],{rot:true,h:260}),[[CY,'금년'],[PY,'전년']]);
   addT(a,'',['순위','중분류','금년','구성비','전년','전년비'],mids.map((x,i)=>[i+1,x.n,fN(x.v[0]),fP(x.v[0]/T),fN(x.v[1]),fY(dv(x.v[0],x.v[1]))]),['','','cyc','','pyc','']);return a}
  const cs=p.cats.slice(0,4).map(c=>({c,i:find(c)})).filter(x=>x.i>=0);const a=A(`${gname(g)} — ${cs.map(x=>x.c).join(' · ')} 분류 실적`);
  const ser=cs.map((x,j)=>({name:x.c,color:COL[j],vals:ms.map(m=>sumRow(D.bun,m+'월',g)[x.i][0])}));
  if(cs.length===1){const py=ms.map(m=>sumRow(D.bun,m+'월',g)[cs[0].i][1]);addC(a,'월별 추이',barChart(lab,[{name:'금년',color:CY,vals:ser[0].vals},{name:'전년',color:PY,vals:py}]),[[CY,'금년'],[PY,'전년']]);
   addT(a,'월별',['월','금년','전년','전년비'],ms.map((m,i)=>[m+'월',fN(ser[0].vals[i]),fN(py[i]),fY(dv(ser[0].vals[i],py[i]))]),['','cyc','pyc',''])}
  else{addC(a,'월별 추이 (금년)',lineChart(lab,ser),cs.map((x,j)=>[COL[j],x.c]));addT(a,'월별 (금년)',['월'].concat(cs.map(x=>x.c)),ms.map((m,i)=>[m+'월'].concat(ser.map(s=>fN(s.vals[i])))))}
  cs.forEach(x=>{const d=sumRow(D.bun,P,g),v=d[x.i],T=d[rows.length-1][0];a.bul.push(`<b>${x.c}</b> ${PL(P)} ${fEok(v[0])}원 · 전년비 ${fY(dv(v[0],v[1]))} · 구성비 ${fP(T?v[0]/T:null)}${v[2]!=null?` · 재고 ${fN(v[2])}개`:''}`)});
  if(g==='대경지역'&&cs.length){const x=cs[0],rk=D.meta.stores.map(s=>{const v=sumRow(D.bun,P,s)[x.i];return{s,c:v[0],p:v[1]}}).filter(r=>r.c>0).sort((u,w)=>w.c-u.c);
   addT(a,`${x.c} 매장별 실적 · ${PL(P)}`,['순위','매장','금년','전년','전년비'],rk.map((r,i)=>[i+1,r.s,fN(r.c),fN(r.p),fY(dv(r.c,r.p))]),['','','cyc','pyc',''])}
  a.notes.push('매장매출+재고통합 기준(재고통합은 분류 가능한 9개 점만 포함).');return a}
 function aTz(p){const D=S.D,P=Pof(p),g=Gs(p)[0],t=D.tz.months[P][g],lab=D.meta.tzBands,cy=t.cy,py=t.py,tc=cy.reduce((x,y)=>x+y,0),tp=py.reduce((x,y)=>x+y,0);
  const a=A(`${gname(g)} — ${PL(P)} 시간대별 매장매출`);const hr=lab.map((l,i)=>({l,i,v:cy[i]})).filter(o=>{const s=o.l.split('~');return (+s[1].slice(0,2)*60+ +s[1].slice(3))-(+s[0].slice(0,2)*60+ +s[0].slice(3))===60}).sort((x,y)=>y.v-x.v);
  a.bul.push(`매출이 가장 많은 시간(1시간 단위): ${hr.slice(0,3).map(o=>`<b>${o.l}</b> ${fP(tc?o.v/tc:null)}`).join(' · ')}`);
  if(tp){const d=lab.map((l,i)=>({l,d:dv(cy[i],py[i]),v:cy[i]})).filter(o=>o.d!=null&&o.v>tc*0.03).sort((x,y)=>y.d-x.d);if(d.length)a.bul.push(`전년 대비 가장 늘어난 시간대 <b>${d[0].l}</b> ${fY(d[0].d)} · 가장 줄어든 시간대 <b>${d[d.length-1].l}</b> ${fY(d[d.length-1].d)}`)}
  const ev=cy.slice(lab.findIndex(l=>l.startsWith('18:'))).reduce((x,y)=>x+y,0);a.bul.push(`18시 이후 매출 비중 ${fP(tc?ev/tc:null)} · 12시 이전 비중 ${fP(tc?cy.slice(0,5).reduce((x,y)=>x+y,0)/tc:null)}`);
  addC(a,'',barChart(lab,[{name:'금년',color:CY,vals:cy},{name:'전년',color:PY,vals:py}],{rot:true,h:260}),[[CY,'금년'],[PY,'전년']]);
  addT(a,'',['시간대','금년','비중','전년','전년비'],lab.map((l,i)=>[l,fN(cy[i]),fP(tc?cy[i]/tc:null),tp?fN(py[i]):'-',tp&&py[i]?fY(dv(cy[i],py[i])):'-']),['','cyc','','pyc','']);
  a.notes.push('전자저널(매장 POS) 기준 매장매출 · 09:30~12:00, 20:00~22:30은 30분 단위라 막대 길이를 1시간 구간과 그대로 비교하지 마세요.');return a}
 function aInv(p){const P=advM(Pof(p)),g=Gs(p)[0],M=ADV(P),I=M.inv[g],t=I.total,hl=I.health,ht=Object.values(hl).reduce((x,y)=>x+y,0)||1;
  const a=A(`${gname(g)} — ${P} 말 재고 분석`);
  a.bul.push(`재고 <b>${fN(t[0])}개</b> (전년 ${fN(t[1])}개, ${fY(dv(t[0],t[1]))}) · ${P} 판매수량 ${fN(t[2])}개(${fY(dv(t[2],t[3]))}) · 재고주수 <b>${t[4]==null?'-':t[4]+'주'}</b>`);
  a.bul.push(`재고 건강도: ${Object.entries(hl).map(([k,v])=>`${k} ${fP(v/ht,0)}`).join(' · ')}`);
  const br=M.detail[g].brand,over=br.filter(r=>r[7]==='과다').sort((x,y)=>y[4]-x[4]).slice(0,5),sh=br.filter(r=>r[7]==='부족').slice(0,5);
  if(over.length)a.bul.push(`과다 브랜드: ${over.map(r=>`<b>${r[0]}</b> ${fN(r[4])}개(${r[6]}주)`).join(' · ')}`);if(sh.length)a.bul.push(`부족 브랜드: ${sh.map(r=>`<b>${r[0]}</b> ${fN(r[4])}개(${r[6]}주)`).join(' · ')}`);
  const risk=M.best[g].filter(b=>b[7]!=='안정');if(risk.length)a.bul.push(`베스트 상품 재고 주의: ${risk.map(b=>`${b[0]} ${b[2]}(${b[1]}) ${fN(b[5])}개 ${chipx(b[7],b[7]==='품절위험'?'bad':'warn')}`).join(' · ')}`);
  const ms=MONTHS().filter(m=>ADV(m+'월'));addC(a,'월말 재고 수량 추이',barChart(ms.map(m=>m+'월'),[{name:'금년',color:CY,vals:ms.map(m=>ADV(m+'월').inv[g].total[0])},{name:'전년',color:PY,vals:ms.map(m=>ADV(m+'월').inv[g].total[1])}],{fmt:v=>fN(v)}),[[CY,'금년'],[PY,'전년']]);
  addT(a,'대분류별',['대분류','재고(금년)','재고(전년)','재고 전년비','판매수량','판매 전년비','재고주수'],I.big.map(r=>[r[0],fN(r[1]),fN(r[2]),fY(dv(r[1],r[2])),fN(r[3]),fY(dv(r[3],r[4])),r[5]==null?'-':r[5]+'주']),['','cyc','pyc','','','','']);
  addT(a,'브랜드별 재고 판정',['브랜드','매장매출','판매수량','재고','재고 전년비','재고주수','판정'],br.slice(0,15).map(r=>[r[0],fN(r[1]),fN(r[2]),fN(r[4]),r[5]?fY(dv(r[4],r[5])):'-',r[6]==null?'-':r[6]+'주',chipx(r[7],r[7]==='과다'?'warn':r[7]==='부족'||r[7]==='재고없음'?'bad':r[7]==='적정'?'good':'mid')]));
  a.notes.push('재고주수 = 월말 재고 ÷ 그 달 마지막 4주 주평균 판매수량 · 부족 8주 미만 / 과다 52주 초과(또는 재고 증가율이 판매 증가율보다 40%p 이상 높고 26주 초과).');return a}
 function aBest(p){const P=advM(Pof(p)),g=Gs(p)[0],b=ADV(P).best[g],st=S.D.prod?S.D.prod.st:{};const a=A(`${gname(g)} — ${P} 베스트 상품 TOP10`);
  if(!b.length){a.bul.push('이 달 판매 자료가 없습니다(미영업 기간).');return a}
  a.bul.push(`1~3위: ${b.slice(0,3).map(r=>`<b>${r[0]} ${esc(r[2])}</b> ${fN(r[3])}개·${fEok(r[4])}원`).join(' · ')}`);
  const bc={};b.forEach(r=>bc[r[0]]=(bc[r[0]]||0)+1);a.bul.push(`TOP10 브랜드 구성: ${Object.entries(bc).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${k} ${v}개`).join(' · ')}`);
  const rk=b.filter(r=>r[7]!=='안정');a.bul.push(rk.length?`재고 주의 ${rk.length}개: ${rk.map(r=>`${esc(r[2])} ${fN(r[5])}개(${r[7]})`).join(' · ')}`:'TOP10 모두 재고 안정(재고주수 4주 이상)');
  addT(a,'',['순위','브랜드','상품(스타일)','분류','판매수량','매장매출','재고','재고주수','점검'],b.map((r,i)=>{const s=st[r[1]];return [i+1,r[0],`${esc(r[2])} (${r[1]})`,s?`${s[3]} > ${s[4]}`:'-',fN(r[3]),fN(r[4]),fN(r[5]),r[6]==null?'-':r[6]+'주',chipx(r[7],r[7]==='품절위험'?'bad':r[7]==='재고확보'?'warn':'good')]}),['','','','','','cyc','','','']);
  a.notes.push("상품 사진과 브랜드·분류별 보기는 '베스트상품' 탭에서 확인할 수 있습니다.");return a}
 const CLof=g=>S.D.area.clusters.find(c=>c.stores.includes(g));
 function aArea(p){const AR=S.D.area;let cls=[];Gs(p).forEach(g=>{if(g==='대경지역')return;const c=CLof(g);if(c&&!cls.includes(c))cls.push(c)});
  AR.clusters.forEach(c=>{const k=c.name.replace(/\s/g,'');if(['홈플러스','동성로','스타필드','이시아폴리스','율하','월배','롯데백화점','현대아울렛','김천','구미'].some(w=>p.q.includes(w)&&k.includes(w))&&!cls.includes(c))cls.push(c)});
  if(/긴급|위험|리스크/.test(p.q)&&!cls.length)cls=AR.clusters.filter(c=>c.grade==='긴급'||c.grade==='경쟁·확장');
  const a=A(cls.length?`${cls.map(c=>c.name).join(' · ')} 상권 현황`:'대경지역 상권 현황 (11개 클러스터)');
  if(!cls.length){const cnt={};AR.clusters.forEach(c=>cnt[c.grade]=(cnt[c.grade]||0)+1);a.bul.push(`등급 분포: ${AR.grades.map(x=>`${x} ${cnt[x]||0}개`).join(' · ')}`);
   AR.clusters.filter(c=>c.grade==='긴급'||c.grade==='경쟁·확장').forEach(c=>a.bul.push(`${chipx(c.grade,'gr'+AR.grades.indexOf(c.grade))} <b>${c.name}</b> — ${c.head}`));
   addT(a,'',['클러스터','등급','매장',LM()+' 전년비','핵심 내용'],AR.clusters.map(c=>{const t=cluSum(c,LM());return [c.name,chipx(c.grade,'gr'+AR.grades.indexOf(c.grade)),c.stores.length+'개',fY(dv(t.cy,t.py)),c.head]}));
  }else cls.forEach(c=>{const t=cluSum(c,LM());a.bul.push(`${chipx(c.grade,'gr'+AR.grades.indexOf(c.grade))} <b>${c.name}</b> (${c.stores.join(', ')}) — ${c.head}`);c.now.forEach(x=>a.bul.push(x));
   a.bul.push(`${LM()} 클러스터 실적합계 ${fEok(t.cy)}원 · 전년비 ${fY(dv(t.cy,t.py))} · 달성률 ${fP(t.tg?t.cy/t.tg:null)} · 입점객 ${fY(dv(t.vis,t.pvis))}`);a.bul.push(`<b>권장 액션</b>: ${c.act.join(' / ')}`);
   const ms=MONTHS();addC(a,`${c.name} 월별 실적합계`,barChart(ms.map(m=>m+'월'),[{name:'금년',color:CY,vals:ms.map(m=>cluSum(c,m+'월').cy)},{name:'전년',color:PY,vals:ms.map(m=>cluSum(c,m+'월').py)}]),[[CY,'금년'],[PY,'전년']])});
  a.notes.push(`출처: ${AR.src} · ${AR.cover}. 공개 뉴스를 조사해 정리한 참고 자료이며 '미확정' 표시는 공식 발표 전 단계입니다.`);return a}
 function aTodo(p){const P=advM(Pof(p)),M=ADV(P),gs=Gs(p).filter(g=>g!=='대경지역');
  if(!gs.length){const a=A(`${P} 매장별 우선 할 일`);const rows=S.D.meta.stores.map(s=>({s,t:M.todo[s]})).sort((x,y)=>(x.t.status.ach||0)-(y.t.status.ach||0));
   a.bul.push(`달성률이 낮은 순으로 정리했습니다. 가장 낮은 3곳: ${rows.slice(0,3).map(r=>`<b>${r.s}</b> ${fP(r.t.status.ach)}`).join(' · ')}`);
   addT(a,'',['매장','달성률','전년비','1순위 할 일','근거'],rows.map(r=>[r.s,fP(r.t.status.ach),fY(r.t.status.yoy),r.t.todo[0]?`[${r.t.todo[0][0]}] ${r.t.todo[0][1]}`:'-',r.t.todo[0]?r.t.todo[0][2]:'-']));return a}
  const a=A(`${gs.join(' · ')} — ${P} 할 일`);gs.forEach(g=>{const t=M.todo[g];a.bul.push(`<b>${g}</b> ${P} 달성률 ${fP(t.status.ach)} · 전년비 ${fY(t.status.yoy)}`);
   addT(a,`${g} 할 일 (중요한 순)`,['순서','구분','할 일','근거'],t.todo.map((x,i)=>[i+1,x[0],x[1],x[2]]));a.blocks.push({t:'list',cap:`${g} 다음 달에 확인할 숫자`,items:t.next})});return a}
 function aWhy(p){const P=advM(Pof(p)),M=ADV(P),g=Gs(p)[0];
  if(g==='대경지역'){const B=M.brief,a=A(`지역 전체 — ${P} 실적 흐름의 배경`);B.verified.forEach(x=>a.bul.push(x));a.blocks.push({t:'list',cap:'점검이 필요한 가설',items:B.hyp});
   const dn=S.D.meta.stores.map(s=>({s,c:K(P,s).cy_tot,p:K(P,s).py_tot})).filter(r=>r.p).map(r=>Object.assign(r,{d:r.c-r.p})).sort((x,y)=>x.d-y.d);
   addT(a,'전년 대비 증감액이 큰 매장',['매장','금년','전년','증감액','전년비'],dn.slice(0,5).concat(dn.slice(-3).reverse()).map(r=>[r.s,fN(r.c),fN(r.p),fD(r.d),fY(dv(r.c,r.p))]),['','cyc','pyc','','']);
   addC(a,'주간 매출 흐름 (매장매출)',barChart(B.weeks.map(w=>w[0]),[{name:'금년',color:CY,vals:B.weeks.map(w=>w[2])},{name:'전년',color:PY,vals:B.weeks.map(w=>w[3])}]),[[CY,'금년'],[PY,'전년']]);a.notes.push('함께 나타난 숫자이며 원인을 확정한 것은 아닙니다.');return a}
  const t=M.todo[g],a=A(`${g} — ${P} 실적 흐름의 배경`);a.bul.push(strip(t.ai));
  if(t.bad.length)a.bul.push(`나빠진 점: ${t.bad.join(' / ')}`);if(t.good.length)a.bul.push(`좋아진 점: ${t.good.join(' / ')}`);
  a.blocks.push({t:'list',cap:'데이터로 확인된 변화',items:t.facts});a.blocks.push({t:'list',cap:'매장에서 점검이 필요한 요인',items:t.checks});
  const c=CLof(g);if(c)a.blocks.push({t:'list',cap:`상권(${c.name} · ${c.grade})`,items:[c.head].concat(c.now.slice(0,2))});
  addC(a,'주간 매출 흐름 (매장매출)',barChart(t.weeks.map(w=>w[0]),[{name:'금년',color:CY,vals:t.weeks.map(w=>w[2])},{name:'전년',color:PY,vals:t.weeks.map(w=>w[3])}]),[[CY,'금년'],[PY,'전년']]);
  addT(a,'주차별',['주차','기간','매장매출','전년','전년비','주간 달성률'],t.weeks.map(w=>[w[0],w[1],fN(w[2]),w[3]?fN(w[3]):'-',fY(w[4]),w[5]==null?'-':fP(w[5])]),['','','cyc','pyc','','']);
  a.notes.push('함께 나타난 숫자이며 원인을 확정한 것은 아닙니다.');return a}
 function aBrief(p){const P=Pof(p),g=Gs(p)[0],a=A(`${gname(g)} — ${PL(P)} 요약`);const k=key=>({c:mv(key,P,g),p:mv(key,P,g,true)});
  const t=k('tot'),ac=mv('ach',P,g),cv=k('conv'),at=k('atv');a.bul.push(`실적합계 <b>${fmt('tot',t.c)}</b>${t.p!=null?` · 전년 대비 ${chgH(chg('tot',t.c,t.p))}`:''} · 목표 달성률 <b>${fP(ac)}</b>`);
  a.bul.push(`구매전환율 ${fmt('conv',cv.c)}(${chgH(chg('conv',cv.c,cv.p))}) · 객단가 ${fmt('atv',at.c)}(${chgH(chg('atv',at.c,at.p))}) · 인시생산성 ${fmt('ip',mv('ip',P,g))}`);
  if(g!=='대경지역'){const all=S.D.meta.stores.map(s=>({s,c:mv('ach',P,s)})).filter(r=>r.c!=null).sort((x,y)=>y.c-x.c),i=all.findIndex(r=>r.s===g);if(i>=0)a.bul.push(`달성률 순위 ${all.length}개 점 중 <b>${i+1}위</b> (지역 전체 ${fP(mv('ach',P,'대경지역'))})`)}
  const M=ADV(advM(P));if(M){const B=g==='대경지역'?M.brief:M.sbrief[g];if(B){a.blocks.push({t:'list',cap:`${advM(P)} 해석`,items:B.ai.map(strip)});a.blocks.push({t:'list',cap:'주요 변화',items:B.changes})}}
  addT(a,'핵심 지표',['지표','금년','전년','증감'],kpiRows(P,g),['','cyc','pyc','']);
  const ms=MONTHS();addC(a,'월별 실적합계',barChart(ms.map(m=>m+'월'),[{name:'금년',color:CY,vals:ms.map(m=>mv('tot',m+'월',g))},{name:'전년',color:PY,vals:ms.map(m=>mv('tot',m+'월',g,true))}]),[[CY,'금년'],[PY,'전년']]);return a}
 function answer(q){const p=parseQ(q),f=p.f,key=p.mets[0];let a;
  if(f.area&&!key)a=aArea(p);
  else if(f.best&&!p.brands.length&&!f.brand)a=aBest(p);
  else if(f.inv&&!p.mets.includes('int'))a=aInv(p);
  else if(f.tz)a=aTz(p);
  else if(p.brands.length||f.brand)a=aBrand(p);
  else if(p.cats.length||f.cat)a=aCat(p);
  else if(f.todo)a=aBrief(p);
  else if(p.stores.length>=2&&!f.rank&&!f.trend)a=aCompare(p,key);
  else if(f.rank&&(p.stores.length<2))a=aRank(p,key);
  else if(f.trend||f.week&&false)a=aTrend(p,key);
  else if(f.why)a=aWhy(p);
  else if(key&&p.mo.list.length!==1&&!f.brief)a=aTrend(p,key);
  else a=aBrief(p);
  a.ctx=`해석: 대상 ${Gs(p).map(gname).join(', ')} · 기간 ${p.mo.list.length>1?p.mo.list[0]+'~'+p.mo.list[p.mo.list.length-1]+'월':((a.title.match(/누계\(1~\d+월\)|\d{1,2}월(?!별)/)||[])[0]||(/추이|상권/.test(a.title)?'전체 월':PL(Pof(p))))}${key?' · 지표 '+MET[key].l:''}${p.brands.length?' · 브랜드 '+p.brands.join(', '):''}${p.cats.length?' · 분류 '+p.cats.join(', '):''}`;
  return a}
 function aHtml(a){let h=`<div class="ah" style="font-size:15px;margin-top:0">${a.title}</div>`;if(a.bul.length)h+=ulx(a.bul);
  a.blocks.forEach(b=>{if(b.cap)h+=`<div class="ah">${b.cap}</div>`;
   if(b.t==='chart')h+=(b.leg?legend(b.leg):'')+b.html;
   else if(b.t==='list')h+=ulx(b.items);
   else h+=`<div class="tw"><table class="t"><thead><tr>${b.head.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${(b.cls&&b.cls[i])||''}" ${typeof c==='string'&&strip(c).length>26?'style="white-space:normal;text-align:left;min-width:220px"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`});
  a.notes.forEach(n=>h+=`<div class="note">※ ${n}</div>`);return h}
 function aText(q,a){let t=`[질문] ${q}\n[답변] ${strip(a.title)}\n`;a.bul.forEach(b=>t+=`- ${strip(b)}\n`);
  a.blocks.forEach(b=>{if(b.t==='chart')return;t+=`\n${b.cap?'■ '+strip(b.cap)+'\n':''}`;if(b.t==='list')b.items.forEach(x=>t+=`- ${strip(x)}\n`);else{t+=b.head.join('\t')+'\n';b.rows.forEach(r=>t+=r.map(c=>strip(c)).join('\t')+'\n')}});
  a.notes.forEach(n=>t+=`※ ${strip(n)}\n`);t+=`\n(대경지역 매출자료 대시보드 · 자료 기준일 ${S.D.meta.asof})`;return t}
 const SUG=()=>{const g=S.group==='대경지역'?'':S.group+' ';return [g+'매출 추이 보여줘','달성률 순위 알려줘','전환율 낮은 매장은 어디야?',g+'왜 부진했어?','나이키 실적 추이','러닝화 매장별 실적',g+'시간대별 피크는?',g+'재고 과다 브랜드',g+'베스트 상품 알려줘','홈플러스 성서점 상권 현황',g+'이번 달 할 일','구미인동점 원평점 비교']};
 function vAi(){let h=`<div class="panel"><h3>🤖 AI 분석 — 자료에 대해 물어보세요</h3><div class="qbox"><input id="aiq" placeholder="예) 구미인동점 전환율 추이 / 10월 달성률 순위 / 나이키 왜 줄었어?" autocomplete="off"><button id="aigo">질문하기</button></div>
  <div class="sug">${SUG().map(s=>`<button class="aisug">${s}</button>`).join('')}</div>
  <div class="note">질문 속의 <b>매장 · 월 · 지표 · 브랜드 · 분류</b> 단어를 읽어 대시보드 자료(1~${LASTM()}월)에서 답을 만듭니다. 매장이나 기간을 말하지 않으면 위에서 고른 대상(${gname(S.group)})·구분(${plabel(S.period)})을 씁니다. 자료에 없는 내용(개별 영수증, 직원별 실적 등)은 답할 수 없습니다.</div></div>`;
  if(!X.ai.length)h+=`<div class="panel"><div class="note" style="font-size:13px">아직 질문이 없습니다. 위 예시 버튼을 눌러 보세요. 답변마다 <b>📋 복사</b>(카톡·메일·엑셀에 붙여넣기)와 <b>⬇ 파일 받기</b> 버튼이 붙습니다.</div></div>`;
  X.ai.forEach(o=>{h+=`<div class="panel qa" data-id="${o.id}"><div class="qq">Q. ${esc(o.q)}</div><div class="qsub">${esc(o.a.ctx)}</div>${aHtml(o.a)}
   <div class="abar"><button class="abtn acopy">📋 복사</button><button class="abtn axls">⬇ 엑셀 파일</button><button class="abtn atxt">⬇ 텍스트 파일</button><button class="abtn adel">✕ 지우기</button></div></div>`});
  return h}
 function ask(q){q=(q||'').trim();if(!q)return;let a;try{a=answer(q)}catch(e){console.error(e);a=A('이 질문은 답을 만들지 못했습니다');a.bul.push('매장 이름·월·지표(매출, 달성률, 전환율, 객단가, 할인율, 인시생산성, 재고 등)를 넣어 다시 물어봐 주세요.');a.ctx='해석 실패: '+e.message}
  X.ai.unshift({id:++X.seq,q,a});if(X.ai.length>12)X.ai.pop();render();const i=$('#aiq');if(i)i.focus()}
 const dl=(name,blob)=>{const u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download=name;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)};
 const fnm=(o,ext)=>('대경_AI분석_'+o.q.slice(0,24)).replace(/[\\/:*?"<>|\s()]+/g,'_')+'.'+ext;
 async function copyT(t,btn){try{await navigator.clipboard.writeText(t)}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
  const o=btn.textContent;btn.textContent='✔ 복사됨';setTimeout(()=>btn.textContent=o,1500)}
 function loadX(){return window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='xlsx-style.min.js?v=1';s.onload=ok;s.onerror=()=>no(new Error('엑셀 기능을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));document.head.appendChild(s)})}
 async function xlsA(o){await loadX();const wb=XLSX.utils.book_new(),a=o.a,TH={font:{bold:true,color:{rgb:'FFFFFF'},sz:10},fill:{fgColor:{rgb:'1F3864'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
  const r1=[['질문',o.q],['답변',strip(a.title)],['해석',a.ctx],['자료 기준일',S.D.meta.asof],[]].concat(a.bul.map(b=>['핵심',strip(b)]));
  a.blocks.forEach(b=>{if(b.t==='list')b.items.forEach(x=>r1.push([strip(b.cap||''),strip(x)]))});a.notes.forEach(n=>r1.push(['참고',strip(n)]));
  const w1=XLSX.utils.aoa_to_sheet(r1);w1['!cols']=[{wch:16},{wch:110}];r1.forEach((r,i)=>{const c=w1['A'+(i+1)],d=w1['B'+(i+1)];if(c)c.s={font:{bold:true,color:{rgb:'1F3864'}},alignment:{vertical:'top'}};if(d)d.s={alignment:{wrapText:true,vertical:'top'}}});
  XLSX.utils.book_append_sheet(wb,w1,'답변');let n=0;
  a.blocks.filter(b=>b.t==='table').forEach(b=>{n++;const aoa=[b.head].concat(b.rows.map(r=>r.map(c=>{const x=strip(c),m=x.match(/^[+-]?[\d,]+(\.\d+)?$/);return m?parseFloat(x.replace(/,/g,'')):x})));const ws=XLSX.utils.aoa_to_sheet(aoa);
   b.head.forEach((x,i)=>{const c=ws[XLSX.utils.encode_cell({r:0,c:i})];if(c)c.s=TH});ws['!cols']=b.head.map((x,i)=>({wch:Math.min(60,Math.max(8,...aoa.map(r=>[...String(r[i]==null?'':r[i])].reduce((s,ch)=>s+(ch.charCodeAt(0)>255?2:1),0)))+2)}));
   aoa.slice(1).forEach((r,ri)=>r.forEach((v,ci)=>{const c=ws[XLSX.utils.encode_cell({r:ri+1,c:ci})];if(c&&typeof v==='number')c.z='#,##0.##'}));
   XLSX.utils.book_append_sheet(wb,ws,('표'+n+'_'+strip(b.cap||'')).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31))});
  XLSX.writeFile(wb,fnm(o,'xlsx'))}
 // ---------- 상권
 function cluSum(c,P){const o={cy:0,py:0,tg:0,vis:0,pvis:0,buy:0,pbuy:0};c.stores.forEach(s=>{const k=K(P,s);o.cy+=k.cy_tot||0;o.py+=k.py_tot||0;o.tg+=k.target||0;o.vis+=k.cy_vis||0;o.pvis+=k.py_vis||0;o.buy+=k.cy_buy||0;o.pbuy+=k.py_buy||0});return o}
 const GC=['#d93025','#e8833a','#2e9e55','#aab2c2'];
 function vArea(){const AR=S.D.area;if(!AR)return OLDDATA();const P=S.period,G=S.group,ms=MONTHS(),gi=c=>AR.grades.indexOf(c.grade);
  const mine=G==='대경지역'?null:CLof(G);const cnt={};AR.clusters.forEach(c=>cnt[c.grade]=(cnt[c.grade]||0)+1);
  let h=`<div class="banner">📡 상권 내용은 <b>${AR.src}</b> 기준입니다 (${AR.cover}). 매출·입점객은 대시보드 실적 자료와 연결했습니다. <a href="${AR.url}" target="_blank" rel="noopener">상권 레이더 원문 열기 →</a></div>`;
  h+=`<div class="cards">${AR.grades.map((g,i)=>`<div class="card"><div class="t">${chipx(g,'gr'+i)}</div><div class="v">${cnt[g]||0}개</div><div class="s">${AR.clusters.filter(c=>c.grade===g).map(c=>c.name.split(' ')[0]+(c.name.split(' ')[1]&&c.name.split(' ')[1].length<6?' '+c.name.split(' ')[1]:'')).join(', ')||'-'}</div></div>`).join('')}</div>`;
  // 등급 추이
  h+=`<div class="panel"><h3>📈 상권 등급 추이 (주간 정기 점검 · ${AR.dates[0]} ~ ${AR.dates[AR.dates.length-1]})</h3><div class="tw"><table class="hm"><thead><tr><th>클러스터</th>${AR.dates.map(d=>`<th>${d.replace('-','/')}</th>`).join('')}<th>현재</th></tr></thead><tbody>`+
   AR.clusters.map(c=>`<tr${mine===c?' style="outline:2px solid var(--blue)"':''}><td><b>${c.name}</b></td>${AR.hist[c.id].map(v=>`<td><span class="c" style="background:${GC[v]}" title="${AR.grades[v]}"></span></td>`).join('')}<td>${chipx(c.grade,'gr'+gi(c))}</td></tr>`).join('')+
   `</tbody></table></div><div class="legend" style="margin-top:6px">${AR.grades.map((g,i)=>`<span><i style="background:${GC[i]}"></i>${g}</span>`).join('')}</div>
   <div class="sec">등급이 바뀐 기록</div>${ulx(AR.changes.map(x=>`<b>${x[0].replace('-','/')}</b> ${AR.clusters.find(c=>c.id===x[1]).name}: ${x[2]} → <b>${x[3]}</b> — ${x[4]}`))}<div class="note">8/30 이후 정기 회차에서는 11개 클러스터 모두 등급이 유지되고 있습니다. 홈플러스 성서점은 8월 말부터 긴급 등급이 이어지고 있습니다.</div></div>`;
  // 상권별 실적 연결표
  const rows=AR.clusters.map(c=>{const t=cluSum(c,P),l3=ms.slice(-3).map(m=>{const x=cluSum(c,m+'월');return dv(x.cy,x.py)});return{c,t,l3}});
  h+=`<div class="panel"><h3>🧭 상권별 실적 현황 · ${plabel(P)} <span class="note">(행을 누르면 아래 상세로 이동)</span></h3><div class="tw"><table class="t"><thead><tr><th>클러스터</th><th>등급</th><th>매장 수</th><th>실적합계</th><th>전년비</th><th>달성률</th><th>입점객 전년비</th><th>구매전환율</th><th>최근 3개월 전년비 흐름</th></tr></thead><tbody>`+
   rows.map(({c,t,l3})=>`<tr class="clk agoto" data-c="${c.id}"><td>${c.name}${c.unv?' <span class="note">미확인</span>':''}</td><td>${chipx(c.grade,'gr'+gi(c))}</td><td>${c.stores.length}</td><td class="cyc">${fN(t.cy)}</td><td>${fY(dv(t.cy,t.py))}</td><td>${fP(t.tg?t.cy/t.tg:null)}</td><td>${fY(dv(t.vis,t.pvis))}</td><td>${fP(t.vis?t.buy/t.vis:null)}</td><td>${l3.map(v=>fY(v)).join(' → ')}</td></tr>`).join('')+
   `</tbody></table></div><div class="note">※ '미확인' = 이번 회차 검색에서 최신 기사를 확인하지 못한 클러스터(변동 없음이 아니라 확인 못 함).</div></div>`;
  // 클러스터 전년비 추이 차트
  const pick=mine?[mine]:AR.clusters.filter(c=>c.grade==='긴급'||c.grade==='경쟁·확장').concat(AR.clusters.filter(c=>c.id==='gm'||c.id==='yh'));
  h+=`<div class="panel"><h3>📉 상권별 실적합계 전년비 추이 (월별) ${mine?'· '+mine.name:'· 주요 상권'}</h3>${legend(pick.map((c,j)=>[COL[j],c.name]))}${lineChart(ms.map(m=>m+'월'),pick.map((c,j)=>({name:c.name,color:COL[j],vals:ms.map(m=>{const x=cluSum(c,m+'월');const d=dv(x.cy,x.py);return d==null?null:Math.max(0,1+d)})})),{fmt:v=>Math.round(v*100)+'%'})}<div class="note">※ 100% = 전년과 같은 수준. 전년 영업 기록이 없는 매장(FH 대구동성로중앙점, 6월 오픈)은 금년 실적만 더해져 동성로가 높게 나옵니다.</div></div>`;
  // 클러스터 카드
  const list=mine?[mine].concat(AR.clusters.filter(c=>c!==mine)):AR.clusters;
  h+=`<div class="panel"><h3>🏙️ 상권 상세 ${mine?`<span class="note">(${G}가 속한 상권을 맨 위에 표시)</span>`:''}</h3>`+list.map(c=>{const t=cluSum(c,P);
   return `<div class="clu g${gi(c)}" id="clu-${c.id}"><h4>${chipx(c.grade,'gr'+gi(c))} ${c.name}${c.unv?' <span class="note">· 최신 기사 미확인</span>':''}</h4><div class="note" style="margin:0">${c.addr} · ${c.stores.map(s=>`<span class="clk sgo" data-g="${s}" style="cursor:pointer;color:var(--navy);text-decoration:underline">${s}</span>`).join(', ')}</div>
   <div class="hd">${c.head}</div><div>${chipx(`${plabel(P)} 실적 ${fEok(t.cy)}원`,'mid')}${chipx(`전년비 ${strip(fY(dv(t.cy,t.py)))}`,dv(t.cy,t.py)>=0?'good':'bad')}${chipx(`달성률 ${fP(t.tg?t.cy/t.tg:null)}`,'mid')}${chipx(`입점객 ${strip(fY(dv(t.vis,t.pvis)))}`,dv(t.vis,t.pvis)>=0?'good':'bad')}</div>
   <div class="two" style="margin-top:6px"><div><div class="sec">지금 상황</div>${ulx(c.now)}<div class="sec">경쟁사 현황</div><div style="font-size:13px">${c.comp}</div></div><div><div class="sec">권장 액션</div>${ulx(c.act)}<div class="sec">주요 사건 흐름</div><ul class="tl">${c.tl.map(x=>`<li><b>${x[0].replace('-','/')}</b><span>${x[1]}</span></li>`).join('')}</ul></div></div></div>`}).join('')+'</div>';
  // 뉴스
  const nw=AR.news.filter(n=>!mine||!n[2]||n[2]===mine.id);
  h+=`<div class="panel"><h3>📰 최근 상권 뉴스 ${mine?'· '+mine.name+' 관련':''}</h3><div class="tw"><table class="t"><thead><tr><th>날짜</th><th>구분</th><th>상권</th><th style="text-align:left">내용</th><th>원문</th></tr></thead><tbody>`+
   nw.map(n=>{const c=AR.clusters.find(x=>x.id===n[2]);return `<tr><td>${n[0].replace('-','/')}</td><td>${chipx(n[1],n[1]==='조기경보'?'bad':n[1]==='정규'?'good':'mid')}</td><td>${c?c.name.split(' ').slice(0,2).join(' '):'대구 전역'}</td><td style="text-align:left;white-space:normal;min-width:260px"><b>${n[3]}</b><br><span class="note" style="margin:0">${n[4]}</span></td><td>${n[5]?`<a href="${n[5]}" target="_blank" rel="noopener">기사</a>`:'-'}</td></tr>`}).join('')+
   `</tbody></table></div><div class="note">※ 공개 뉴스를 조사해 정리한 참고 자료입니다. '미확정'은 공식 발표 전 단계이며, 최종 판단은 담당자 확인이 필요합니다.</div></div>`;
  return h}
 // ---------- 베스트상품
 const ART='https://m.abcmart.a-rt.com/display/search-word/result?searchWord=';
 function bestItems(){const P=S.period,G=S.group,PR=S.D.prod,ST=PR.st,rows=(PR.m&&PR.m[P]&&PR.m[P][G])||[],isY=P.startsWith('누계'),lim=(PR.top10||[]).includes(P);
  return{isY,lim,list:rows.map((r,i)=>{const s=ST[r[0]]||['-',r[0],'기타','기타','기타',0,0],w=r[4],stock=r[3];return{style:r[0],brand:s[0],name:s[1],big:s[2],mid:s[3],sm:s[4],price:s[5],est:s[6],qty:r[1],sales:r[2],stock,weeks:w,ark:r[5]||i+1,flag:stock==null?'':stock<=0||(w!=null&&w<2)?'품절위험':(w!=null&&w<4)?'재고확보':'안정'}})}}
 function vBest(){if(!S.D.prod)return OLDDATA();const P=S.period,G=S.group,f=X.bf,R=bestItems(),all=R.list,IMG=S.D.prod.img||{};const IB=S.D.prod.imgBase||'';
  const uniq=(k,src)=>[...new Set(src.map(o=>o[k]))].sort();
  let list=all.filter(o=>(!f.brand||o.brand===f.brand)&&(!f.big||o.big===f.big)&&(!f.mid||o.mid===f.mid)&&(!f.sm||o.sm===f.sm));
  [...list].sort((a,b)=>b.sales-a.sales).forEach((o,i)=>o.rk=i+1);
  list.sort((a,b)=>f.sort==='qty'?b.qty-a.qty:f.sort==='risk'?(!!b.flag&&b.flag!=='안정')-(!!a.flag&&a.flag!=='안정')||b.sales-a.sales:b.sales-a.sales);
  const sel=(id,cur,opts,lab)=>`<label>${lab} <select class="bsel" data-k="${id}"><option value="">전체</option>${opts.map(o=>`<option value="${esc(o)}" ${o===cur?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
  const fb=all.filter(o=>!f.brand||o.brand===f.brand),fg=fb.filter(o=>!f.big||o.big===f.big),fm=fg.filter(o=>!f.mid||o.mid===f.mid);
  const G0=G==='대경지역';
  const ST_TO=S.D.prod.stockTo||'';let h=`<div class="banner">🏆 <b>${gname(G)}</b> · ${R.isY?`누계(${S.D.prod.full})`:P} · 매출 상위 상품 + <b>대·중·소분류별 상위 상품</b>(의류·용품 포함) ${all.length}개${R.isY?` · 재고는 ${ST_TO} 말 기준`:''}${!R.isY&&ST_TO&&parseInt(P)>parseInt(ST_TO)?` · <b>${P} 스타일별 재고 자료가 아직 없어</b> 재고는 일부 상품만 표시됩니다`:''}. 위 '대상'에서 매장을, '구분'에서 월을 바꿔 볼 수 있습니다.</div>`;
  h+=`<div class="panel"><div class="fl">${sel('brand',f.brand,uniq('brand',all),'브랜드')}${sel('big',f.big,uniq('big',fb),'대분류')}${sel('mid',f.mid,uniq('mid',fg),'중분류')}${sel('sm',f.sm,uniq('sm',fm),'소분류')}
   <label>정렬 <select class="bsel" data-k="sort"><option value="sales" ${f.sort==='sales'?'selected':''}>매출 순</option><option value="qty" ${f.sort==='qty'?'selected':''}>수량 순</option><option value="risk" ${f.sort==='risk'?'selected':''}>재고 주의 먼저</option></select></label>
   <label>보기 <select class="bsel" data-k="view"><option value="card" ${f.view==='card'?'selected':''}>사진 카드</option><option value="table" ${f.view==='table'?'selected':''}>표</option></select></label>
   <button class="abtn" id="breset">초기화</button></div>
   <div class="note">상품 ${list.length}개 · 판매수량 ${fN(list.reduce((s,o)=>s+o.qty,0))}개 · 매장매출 ${fEok(list.reduce((s,o)=>s+o.sales,0))}원 · 재고 주의 ${list.filter(o=>o.flag&&o.flag!=='안정').length}개</div></div>`;
  if(!list.length)return h+'<div class="panel"><div class="note">조건에 맞는 상품이 없습니다. 필터를 줄여 보세요.</div></div>';
  // 브랜드 요약
  if(!f.brand&&!f.big){const cs={};all.forEach(o=>{const k=o.big;const c=cs[k]||(cs[k]={n:0,s:0,mids:{}});c.n++;c.s+=o.sales;const m=c.mids[o.mid]||(c.mids[o.mid]={n:0,s:0});m.n++;m.s+=o.sales});
   h+=`<div class="panel"><h3>분류별 베스트 구성 <span class="note">(행을 누르면 그 분류만 봅니다)</span></h3><div class="tw"><table class="t"><thead><tr><th>대분류</th><th>중분류</th><th>상품 수</th><th>매장매출(표시 상품 합)</th></tr></thead><tbody>`+
   Object.entries(cs).sort((a,b)=>b[1].s-a[1].s).map(([k,c])=>`<tr class="l0 clk cgo" data-big="${esc(k)}"><td>${k}</td><td></td><td>${c.n}</td><td>${fN(c.s)}</td></tr>`+Object.entries(c.mids).sort((a,b)=>b[1].s-a[1].s).map(([m,v])=>`<tr class="clk cgo" data-big="${esc(k)}" data-mid="${esc(m)}"><td></td><td style="text-align:left">${m}</td><td>${v.n}</td><td>${fN(v.s)}</td></tr>`).join('')).join('')+`</tbody></table></div></div>`}
  const bsum={};list.forEach(o=>{const b=bsum[o.brand]||(bsum[o.brand]={n:0,q:0,s:0,r:0});b.n++;b.q+=o.qty;b.s+=o.sales;if(o.flag&&o.flag!=='안정')b.r++});const bl=Object.entries(bsum).sort((a,b)=>b[1].s-a[1].s);
  if(!f.brand&&bl.length>1){const top=bl.slice(0,10);h+=`<div class="panel"><h3>브랜드별 베스트 구성</h3>${barChart(top.map(x=>x[0]),[{name:'매장매출',color:CY,vals:top.map(x=>x[1].s)}],{rot:true,h:220})}<div class="tw"><table class="t"><thead><tr><th>브랜드</th><th>상품 수</th><th>판매수량</th><th>매장매출</th><th>비중</th><th>재고 주의</th></tr></thead><tbody>${bl.map(([b,v])=>`<tr class="clk bgo" data-b="${esc(b)}"><td>${b}</td><td>${v.n}</td><td>${fN(v.q)}</td><td class="cyc">${fN(v.s)}</td><td>${fP(v.s/list.reduce((s,o)=>s+o.sales,0))}</td><td>${v.r?chipx(v.r+'개','warn'):'-'}</td></tr>`).join('')}</tbody></table></div><div class="note">브랜드 행을 누르면 그 브랜드만 봅니다.</div></div>`}
  const lk=o=>{const q=encodeURIComponent(o.style),q2=encodeURIComponent(o.brand+' '+o.style);return `<div class="plk"><a class="m" href="${ART}${q}" target="_blank" rel="noopener">아트닷컴</a><a href="https://www.google.com/search?tbm=isch&q=${q2}" target="_blank" rel="noopener">구글 이미지</a><a href="https://search.naver.com/search.naver?where=image&query=${q2}" target="_blank" rel="noopener">네이버 이미지</a></div>`};
  const fc=o=>!o.flag?'':chipx(o.flag,o.flag==='품절위험'?'bad':o.flag==='재고확보'?'warn':'good');
  const card=(o,i)=>`<div class="pc"><div class="pimg"><span class="rk">${o.rk}위</span>${(f.brand||f.big||f.mid||f.sm)&&o.ark!==o.rk?`<span class="rk" style="left:auto;right:6px;background:#8a93a6">전체 ${o.ark}위</span>`:''}<div class="ph"><b>${esc(o.brand)}</b>${esc(o.style)}<br>${IMG[o.style]?'사진 불러오는 중':'아래 버튼으로 사진 보기'}</div>${IMG[o.style]?`<a href="${ART}${encodeURIComponent(o.style)}" target="_blank" rel="noopener"><img loading="lazy" referrerpolicy="no-referrer" src="${IB}${IMG[o.style]}?shrink=388:388" alt="${esc(o.name)}" onerror="this.parentNode.remove()"></a>`:''}</div>
   <div class="pb"><div class="nm">${esc(o.name)}</div><div class="sty">${o.brand} · ${o.style}${o.price?' · 정상가 '+fN(o.price)+'원':''}</div><div>${chipx(o.sm,'mid')}${fc(o)}</div>
   <div class="kv"><span>판매</span><b>${fN(o.qty)}개 · ${fEok(o.sales)}원</b></div><div class="kv"><span>재고</span><b>${o.stock==null?'자료 없음':fN(o.stock)+'개'+(o.weeks!=null?' · '+o.weeks+'주':'')}</b></div>
   ${lk(o)}</div></div>`;
  if(f.view==='table'){h+=`<div class="panel"><h3>베스트상품 목록</h3><div class="tw"><table class="t"><thead><tr><th>순위</th><th>브랜드</th><th>대분류</th><th>중분류</th><th>소분류</th><th style="text-align:left">상품(스타일)</th><th>정상가</th><th>판매수량</th><th>매장매출</th><th>재고</th><th>재고주수</th><th>점검</th><th>사진</th></tr></thead><tbody>`+
   list.map((o,i)=>`<tr><td>${o.rk}</td><td>${o.brand}</td><td>${o.big}</td><td>${o.mid}${o.est?'*':''}</td><td>${o.sm}</td><td style="text-align:left">${esc(o.name)} <span class="note">${o.style}</span></td><td>${o.price?fN(o.price):'-'}</td><td>${fN(o.qty)}</td><td class="cyc">${fN(o.sales)}</td><td>${o.stock==null?'-':fN(o.stock)}</td><td>${o.weeks==null?'-':o.weeks+'주'}</td><td>${fc(o)}</td><td><a href="${ART}${encodeURIComponent(o.style)}" target="_blank" rel="noopener">${IMG[o.style]?`<img class="thumb" loading="lazy" referrerpolicy="no-referrer" src="${IB}${IMG[o.style]}?shrink=120:120" alt="" onerror="this.outerHTML='아트닷컴'">`:'아트닷컴'}</a></td></tr>`).join('')+'</tbody></table></div></div>'}
  else{// 브랜드 > 대분류 > 중분류 > 소분류
   const byB={};list.forEach(o=>(byB[o.brand]||(byB[o.brand]=[])).push(o));
   h+='<div class="panel"><h3>브랜드 › 대분류 › 중분류 › 소분류별 베스트상품</h3>';
   bl.forEach(([b,v])=>{h+=`<div class="bhd"><span>${b}</span><span style="font-weight:600;font-size:12px">${v.n}개 상품 · ${fN(v.q)}개 · ${fEok(v.s)}원</span></div>`;const byC={};byB[b].forEach(o=>{const k=o.big+' › '+o.mid+(o.est?'*':'')+' › '+o.sm;(byC[k]||(byC[k]=[])).push(o)});
    Object.entries(byC).sort((x,y)=>y[1].reduce((s,o)=>s+o.sales,0)-x[1].reduce((s,o)=>s+o.sales,0)).forEach(([k,arr])=>{h+=`<div class="chd">${k} <span class="note">${arr.length}개 · ${fEok(arr.reduce((s,o)=>s+o.sales,0))}원</span></div><div class="pgrid">${arr.map((o,i)=>card(o,i)).join('')}</div>`})});
   h+='</div>'}
  h+=`<div class="note">※ 순위·판매는 매장매출(오프라인) 기준, 분류는 판매현황상세의 대/중/소분류입니다. · 재고는 그 달 말(누계는 ${ST_TO} 말) 수량, 재고주수 = 월말 재고 ÷ 그 달 마지막 4주 주평균 판매수량(재고 탭과 같은 기준). · 품절위험 = 재고주수 2주 미만 또는 재고 0 / 재고확보 = 4주 미만.<br>※ 사진은 아트닷컴 상품 사진입니다(${S.D.prod.imgAsof||''} 수집, 이 화면 상품 ${list.filter(o=>IMG[o.style]).length}/${list.length}개). 아트닷컴에 없는 상품은 구글·네이버 이미지 버튼으로 확인하세요. 사진을 누르면 아트닷컴 검색 화면이 열립니다.</div>`;
  return h}
 VIEWS.ai=vAi;VIEWS.area=vArea;VIEWS.best=vBest;
 // ---------- 이벤트
 function hook(){const m=$('#main');if(!m||m.__x)return;m.__x=1;
  m.addEventListener('click',e=>{const t=e.target;
   if(t.id==='aigo'){ask($('#aiq').value);return}
   if(t.classList.contains('aisug')){ask(t.textContent);return}
   const qa=t.closest('.qa');if(qa&&t.classList.contains('abtn')){const o=X.ai.find(x=>x.id==qa.dataset.id);if(!o)return;
    if(t.classList.contains('acopy'))copyT(aText(o.q,o.a),t);
    else if(t.classList.contains('atxt'))dl(fnm(o,'txt'),new Blob(['﻿'+aText(o.q,o.a).replace(/\n/g,'\r\n')],{type:'text/plain;charset=utf-8'}));
    else if(t.classList.contains('axls')){t.disabled=true;xlsA(o).catch(er=>alert(er.message)).finally(()=>t.disabled=false)}
    else if(t.classList.contains('adel')){X.ai=X.ai.filter(x=>x!==o);render()}return}
   const ag=t.closest('.agoto');if(ag){const el=document.getElementById('clu-'+ag.dataset.c);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});e.stopPropagation();return}
   const sg=t.closest('.sgo');if(sg){S.group=sg.dataset.g;render();window.scrollTo(0,0);return}
   const cg=t.closest('.cgo');if(cg){X.bf.brand='';X.bf.big=cg.dataset.big;X.bf.mid=cg.dataset.mid||'';X.bf.sm='';render();return}
   const bg=t.closest('.bgo');if(bg){X.bf.brand=bg.dataset.b;X.bf.big=X.bf.mid=X.bf.sm='';render();return}
   if(t.id==='breset'){X.bf={brand:'',big:'',mid:'',sm:'',sort:'sales',view:X.bf.view};render();return}},true);
  m.addEventListener('keydown',e=>{if(e.target.id==='aiq'&&e.key==='Enter'){e.preventDefault();ask(e.target.value)}});
  m.addEventListener('change',e=>{const s=e.target.closest('.bsel');if(!s)return;const k=s.dataset.k;X.bf[k]=s.value;if(k==='brand')X.bf.big=X.bf.mid=X.bf.sm='';if(k==='big')X.bf.mid=X.bf.sm='';if(k==='mid')X.bf.sm='';render()})}
 const _r2=render;render=function(){_r2();hook()};
 if(typeof window!=='undefined'){window.__app.render=render;window.__app.ask=ask;window.__app.X=X;window.__app.answer=answer}
})();

// ===== 편의 기능: 내 매장 홈 · 암호 기억 · 모바일 화면 정리 (2026-11) =====
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function openPicker(first){
 const G=S.D.meta.groups,stores=G.filter(g=>g!=='대경지역'),my=lsGet('dg_store');
 const bySign={};stores.forEach(g=>{const k=g.split(' ')[0];(bySign[k]=bySign[k]||[]).push(g)});
 const btn=g=>`<button class="pk ${g===my?'on':''}" data-g="${g}">${g.replace(/^\S+\s/,'')}</button>`;
 const box=document.createElement('div');box.id='picker';
 box.innerHTML=`<div class="pkbox"><h3>${first?'어느 매장을 주로 보시나요?':'내 매장 바꾸기'}</h3>
 <p>고른 매장이 <b>다음부터 첫 화면</b>으로 바로 열립니다. (이 휴대폰·PC에만 저장)<br>다른 매장은 위쪽 <b>대상</b>에서 언제든 볼 수 있습니다.</p>
 <button class="pk all ${my==='대경지역'?'on':''}" data-g="대경지역">🗺 지역 전체 <small>(지역장·관리자용)</small></button>
 ${Object.entries(bySign).map(([k,a])=>`<div class="pkg"><div class="pkt">${k}</div><div class="pkl">${a.map(btn).join('')}</div></div>`).join('')}
 <div class="pkf"><button class="pkx">${first?'나중에 고르기':'닫기'}</button></div></div>`;
 box.onclick=e=>{const b=e.target.closest('.pk');if(b){lsSet('dg_store',b.dataset.g);S.group=b.dataset.g;S.tab='home';box.remove();render();window.scrollTo(0,0);toast('🏠 내 매장: '+gname(b.dataset.g));return}
  if(e.target.closest('.pkx')||e.target===box)box.remove()};
 document.body.appendChild(box)}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
function syncHome(){
 const my=lsGet('dg_store'),hb=$('#homeBtn'),sb=$('#setHome');if(!hb)return;
 if(my){hb.style.display='';hb.textContent='🏠 '+(my==='대경지역'?'지역 전체':my.replace(/^\S+\s/,''));hb.classList.toggle('on',S.group===my)}else hb.style.display='none';
 sb.style.display=(S.group===my)?'none':'';sb.textContent=my?'⭐ 이 대상을 내 매장으로':'⭐ 내 매장 정하기'}
(function(){
 if(typeof document==='undefined')return;
 const css=`
 .hbar{display:flex;gap:6px;align-items:center;margin-left:auto}
 .hbtn{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:14px;padding:4px 10px;font-size:12px;cursor:pointer}
 details.hn{width:100%;font-size:12px;opacity:.9}details.hn summary{cursor:pointer;list-style:none;display:inline-block}details.hn summary::-webkit-details-marker{display:none}
 details.hn div{margin-top:4px;line-height:1.5}
 .myb{border:1px solid var(--blue);background:#fff;color:var(--blue);border-radius:16px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
 .myb.on{background:var(--blue);color:#fff}
 #picker{position:fixed;inset:0;background:rgba(15,25,45,.55);z-index:50;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}
 .pkbox{background:#fff;border-radius:14px;max-width:560px;width:100%;padding:18px}
 .pkbox h3{margin:0 0 6px;color:var(--navy)}.pkbox p{font-size:13px;color:var(--mut);margin:0 0 12px}
 .pk{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 10px;margin:3px;font-size:14px;cursor:pointer}
 .pk.on{border-color:var(--blue);background:#eaf2fb;font-weight:700}.pk.all{width:calc(100% - 6px);text-align:left;font-weight:700}
 .pkg{display:flex;gap:6px;align-items:flex-start;margin-top:6px}.pkt{min-width:30px;font-weight:700;color:var(--navy);padding-top:12px;font-size:12px}
 .pkl{display:flex;flex-wrap:wrap}.pkf{text-align:right;margin-top:10px}.pkx{border:0;background:none;color:var(--mut);cursor:pointer;font-size:13px}
 .loadbox{display:flex;gap:12px;align-items:center;justify-content:center;padding:48px 12px;color:var(--mut)}
 .spin{width:26px;height:26px;border:3px solid #dbe4f3;border-top-color:var(--navy);border-radius:50%;animation:sp 0.9s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
 .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1f3864;color:#fff;padding:9px 16px;border-radius:20px;font-size:13px;z-index:60;box-shadow:0 4px 14px rgba(0,0,0,.2)}
 #totop{position:fixed;right:14px;bottom:18px;width:42px;height:42px;border-radius:50%;border:0;background:var(--navy);color:#fff;font-size:18px;box-shadow:0 3px 10px rgba(0,0,0,.25);display:none;z-index:40;cursor:pointer}
 table.t tr.fade td{opacity:.42}table.t tr.fade td:first-child::after{content:' · 영향 작음';font-size:10px;color:#6b7385}
 .gate-rem{display:flex;gap:6px;align-items:center;justify-content:center;font-size:12px;color:var(--mut);margin:-2px 0 10px}
 @media(max-width:700px){
  header{padding:10px 12px}header h1{font-size:16px}
  .ctrl{position:static;padding:6px 10px}
  .tabs{flex-wrap:wrap;gap:4px}.tab{padding:6px 10px;font-size:13px;border:1px solid var(--line);border-radius:14px;border-bottom-width:1px}
  .tab.on{background:var(--navy);color:#fff;border-color:var(--navy)}
  select{min-width:150px;flex:1 1 150px}
  .lbl{min-width:28px}
 }`;
 document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
 const setup=()=>{
  const hb=$('#homeBtn'),sb=$('#setHome'),lk=$('#lockBtn'),ch=$('#chgHome'),tt=$('#totop');
  if(hb)hb.onclick=()=>{const my=lsGet('dg_store');if(my){S.group=my;render();window.scrollTo(0,0)}};
  if(sb)sb.onclick=()=>{lsSet('dg_store',S.group);syncHome();toast('🏠 내 매장: '+gname(S.group))};
  if(ch)ch.onclick=()=>openPicker(false);
  if(lk)lk.onclick=()=>{if(confirmLock()){lsDel('dg_pw');location.reload()}};
  if(tt){window.addEventListener('scroll',()=>{tt.style.display=window.scrollY>600?'block':'none'},{passive:true});tt.onclick=()=>window.scrollTo({top:0,behavior:'smooth'})}};
 if(document.readyState!=='loading')setup();else document.addEventListener('DOMContentLoaded',setup);
})();
function confirmLock(){return true}


// ===== 현황판 · 메뉴 4개 묶음 (2026-11) =====
const NAV=[['home','현황판',['home','brief']],['cmp','매장 비교',['summary','tz','ins']],['prd','상품·재고',['bun','brd','best','inv']],['ext','상권·AI',['area','ai']]];
const SUBN={home:'현황판',brief:'브리핑 상세',summary:'요약·순위',tz:'시간대별',ins:'인시생산성',bun:'분류별',brd:'브랜드별',best:'베스트상품',inv:'재고',area:'상권',ai:'AI 분석'};
S.lastSub=S.lastSub||{};
function navHTML(){
 const cur=NAV.find(g=>g[2].includes(S.tab))||NAV[0];S.lastSub[cur[0]]=S.tab;
 const top=NAV.map(([k,t,subs])=>`<div class="tab ${k===cur[0]?'on':''}" data-t="${S.lastSub[k]||subs[0]}">${t}</div>`).join('');
 const sub=cur[2].length>1?`<div class="subnav">${cur[2].map(x=>`<span class="sn ${x===S.tab?'on':''}" data-t="${x}">${SUBN[x]}</span>`).join('')}</div>`:'';
 return `<div class="navtop">${top}</div>${sub}`}
TABS.push(['home','현황판']);
const DN=['입점객','구매전환율','객단가(매장)'];
function drv(k){
 if(!k||!(k.py_vis&&k.cy_vis&&k.py_buy&&k.cy_buy&&k.py_off&&k.cy_off))return null;
 const r=[[k.cy_vis,k.py_vis],[k.cy_buy/k.cy_vis,k.py_buy/k.py_vis],[k.cy_off/k.cy_buy,k.py_off/k.py_buy]];
 const L=r.map(([c,p])=>Math.log(c/p)),T=Math.log(k.cy_off/k.py_off),D=k.cy_off-k.py_off;
 return {D,c:L.map(l=>Math.abs(T)>1e-9?D*l/T:0),g:r.map(([c,p])=>c/p-1),cur:r.map(x=>x[0]),prev:r.map(x=>x[1])}}
const suspect=d=>d&&d.g[0]<=-0.3&&d.g[1]>=0.2;
const dotC=a=>a==null?'#b3b3b3':a>=1?'#1a6fc4':a>=0.9?'#e3a400':'#d93025';
const fE=v=>v==null?'-':(Math.abs(v)>=1e8?(v/1e8).toFixed(2)+'억':Math.round(v/1e4).toLocaleString('ko-KR')+'만');
const fES=v=>v==null?'-':`<span class="${v<0?'neg':'pos'}">${v>=0?'+':''}${fE(v)}</span>`;
function peerRows(G,P){
 const L=(S.D.peer||{})[G]||[];const ms=P.startsWith('누계')?MONTHS():[parseInt(P)];
 return L.map(c=>{let oc=0,op=0,cc=0,cp=0,n=0;ms.forEach(m=>{const i=m-1,k=S.D.kpi[m+'월']&&S.D.kpi[m+'월'][G];
   if(!k||c.cy[i]==null||c.py[i]==null||!k.cy_off||!k.py_off)return;oc+=k.cy_off;op+=k.py_off;cc+=c.cy[i];cp+=c.py[i];n++});
  const a=dv(oc,op),b=dv(cc,cp);return {n:c.n,mo:n,a,b,gap:(a!=null&&b!=null)?a-b:null,share:cc&&oc?cc/oc:null}})}
function promoOf(G){const L=((S.D.promo||{}).list)||[];return G==='대경지역'?L:L.filter(x=>x.s.includes(G))}
function vHome(){
 const P=S.period,G=S.group,isR=G==='대경지역',K=S.D.kpi[P],k=K[G];if(!k)return '<div class="banner">자료가 없습니다.</div>';
 const ach=k.target?k.cy_tot/k.target:null,gap=k.target?k.cy_tot-k.target:null;
 const cv=k.cy_vis?k.cy_buy/k.cy_vis:null,pcv=k.py_vis?k.py_buy/k.py_vis:null,at=k.cy_buy?k.cy_off/k.cy_buy:null,pat=k.py_buy?k.py_off/k.py_buy:null;
 const stores=S.D.meta.stores.map(s=>{const x=K[s];const d=drv(x);return {s,x,d,ach:x&&x.target?x.cy_tot/x.target:null,yoy:x?dv(x.cy_tot,x.py_tot):null,gap:x&&x.target?x.cy_tot-x.target:null}});
 const rk=[...stores].filter(z=>z.ach!=null).sort((a,b)=>b.ach-a.ach);
 const card=(t,v,sub,big)=>`<div class="card${big?' big':''}"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`;
 let h=`<div class="cards">`+card(`실적합계 · ${plabel(P)}`,fE(k.cy_tot),`전년 ${fE(k.py_tot)} · ${fY(dv(k.cy_tot,k.py_tot))}`,true)+
  card('목표 달성률',fP(ach),gap==null?'목표 없음':gap>=0?`목표 초과 <b class="pos">+${fE(gap)}</b>`:`목표까지 <b class="neg">${fE(-gap)}</b> 부족`)+
  card('구매전환율 (매장)',fP(cv),`전년 ${fP(pcv)} · ${cv!=null&&pcv!=null?fPP(cv-pcv):'-'}`)+
  card('객단가 (매장)',fN(at)+'원',`전년 ${fN(pat)} · ${fY(dv(at,pat))}`)+
  (isR?'':card('지역 내 달성률 순위',(rk.findIndex(z=>z.s===G)+1||'-')+' / '+rk.length,'22개점 중'))+'</div>';
 // 요인 분해
 const d=drv(k);
 if(d){const mx=Math.max(...d.c.map(Math.abs))||1;const neg=d.c.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
  const worst=neg[0],best=neg[2];
  const msg=d.D<0?`매장매출 ${fES(d.D)} 중 <b>${DN[worst[1]]}</b> 영향이 가장 큼(${fES(worst[0])})`+(best[0]>0?` · ${DN[best[1]]}는 오히려 ${fES(best[0])} 기여`:''):
   `매장매출 ${fES(d.D)} 증가 — <b>${DN[best[1]]}</b> 기여가 가장 큼(${fES(best[0])})`+(worst[0]<0?` · ${DN[worst[1]]}는 ${fES(worst[0])}`:'');
  h+=`<div class="panel"><h3>🔍 왜 늘었나·줄었나 · 매장매출 요인 분해 · ${gname(G)} · ${plabel(P)}</h3><div class="ai">${msg}</div>`+
   d.c.map((v,i)=>`<div class="drv"><span>${DN[i]}</span><div class="bw"><div class="b ${v<0?'n':'pp'}" style="width:${Math.abs(v)/mx*100}%"></div></div><b>${fES(v)}</b><em>${fY(d.g[i])}</em></div>`).join('')+
   `<div class="note">※ 매장매출 = 입점객 × 구매전환율 × 객단가(매장매출 ÷ 매장 구매객). 세 요인의 기여를 전년 대비 증감액으로 나눔(재고통합 제외).</div>`+
   (suspect(d)?`<div class="banner" style="margin-top:8px">⚠️ 입점객 ${fY(d.g[0])}·전환율 ${fY(d.g[1])}가 동시에 크게 움직였습니다. 입점 카운터 교체·기준 변경 여부를 먼저 확인해 주세요.</div>`:'')+`</div>`}
 else h+=`<div class="panel"><h3>🔍 매장매출 요인 분해</h3><div class="note">입점객 또는 전년 자료가 없어 분해할 수 없습니다${G==='FH 대구동성로중앙점'?' (2026년 6월 인수 매장)':''}.</div></div>`;
 if(isR){
  const sus=stores.filter(z=>suspect(z.d));
  if(sus.length)h+=`<div class="panel"><h3>⚠️ 자료 확인 필요 <span class="note">입점객 30% 이상 감소 + 전환율 20% 이상 상승이 함께 나타남</span></h3><div class="tw"><table class="t"><thead><tr><th>매장</th><th>입점객</th><th>구매전환율</th><th>점검</th></tr></thead><tbody>`+
   sus.map(z=>`<tr class="clk" data-g="${z.s}"><td>${z.s}</td><td>${fY(z.d.g[0])}</td><td>${fY(z.d.g[1])}</td><td style="text-align:left">입점 카운터 교체·위치·집계 기준 확인</td></tr>`).join('')+'</tbody></table></div></div>';
  const rows=[...stores].sort((a,b)=>(a.ach==null?9:a.ach)-(b.ach==null?9:b.ach));
  h+=`<div class="panel"><h3>🚦 매장 신호등 · 달성률 낮은 순 <span class="note">매장을 누르면 그 매장 현황판</span></h3><div class="tw"><table class="t"><thead><tr><th>매장</th><th>달성률</th><th>전년비</th><th>목표 대비</th><th>가장 큰 감소 요인</th></tr></thead><tbody>`+
   rows.map(z=>{let w='-';if(z.d){const i=[0,1,2].sort((a,b)=>z.d.c[a]-z.d.c[b])[0];w=z.d.c[i]<0?`${DN[i]} ${fY(z.d.g[i])}`:'모두 증가'}
    return `<tr class="clk" data-g="${z.s}"><td><span class="dot" style="background:${dotC(z.ach)}"></span>${z.s}${suspect(z.d)?' ⚠️':''}</td><td>${fP(z.ach)}</td><td>${z.yoy==null?'신규':fY(z.yoy)}</td><td>${z.gap==null?'-':fES(z.gap)}</td><td style="text-align:left">${w}</td></tr>`}).join('')+
   `</tbody></table></div><div class="note">● 파랑 100% 이상 · 노랑 90~100% · 빨강 90% 미만 · 달성률 = 실적합계(재고통합 포함) ÷ 목표</div></div>`;
 }else{
  const tr=S.D.trend.tot[G];if(tr){const lab=MONTHS().map(x=>x+'월');h+=`<div class="panel"><h3>월별 실적합계 흐름 · ${G}</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(lab,[{name:'금년',color:CY,vals:tr.cy},{name:'전년',color:PY,vals:tr.py}],{h:200})}</div>`}
 }
 // 동업계
 const pg=isR?Object.keys(S.D.peer||{}):[G];const pr=[];pg.forEach(g=>peerRows(g,P).forEach(r=>pr.push([g,r])));
 if(pr.length)h+=`<div class="panel"><h3>🏪 동업계 대비 · 매장매출 전년비 · ${plabel(P)}</h3><div class="tw"><table class="t"><thead><tr>${isR?'<th>매장</th>':''}<th>동업계</th><th>자사 전년비</th><th>동업계 전년비</th><th>차이</th><th>동업계 규모(자사=100)</th></tr></thead><tbody>`+
  pr.map(([g,r])=>`<tr${isR?` class="clk" data-g="${g}"`:''}>${isR?`<td>${g}</td>`:''}<td>${r.n}</td><td>${fY(r.a)}</td><td>${fY(r.b)}</td><td>${r.gap==null?'-':`<span class="${r.gap<0?'neg':'pos'}">${r.gap>=0?'+':''}${(r.gap*100).toFixed(1)}%p</span>`}</td><td>${r.share==null?'-':Math.round(r.share*100)}</td></tr>`).join('')+
  `</tbody></table></div><div class="note">※ 동업계 매출 자료가 있는 매장·월만 비교(같은 달끼리). 차이가 +면 자사가 동업계보다 잘한 것.</div></div>`;
 const pm=promoOf(G);
 if(pm.length)h+=`<div class="panel"><h3>🎯 운영 중·최근 행사</h3>${ul(pm.map(x=>`${isR?`<b>${x.s.join(' · ')}</b> — `:''}${x.from}${x.to?'~'+x.to:'~ 진행 중'} · ${x.t}`))}<div class="note">※ 지역장 입력 기준(${(S.D.promo||{}).asof||''}). 행사 효과는 행사가 없는 비슷한 매장과 같은 기간 전년비로 비교하세요.</div></div>`;
 if(!isR)h+=`<div class="note" style="margin:4px 2px 12px"><span class="clk sn-go" data-t="brief" style="cursor:pointer;color:var(--navy);font-weight:700">→ 이 매장 브리핑 상세 보기</span></div>`;
 return h}
VIEWS.home=vHome;
(function(){
 if(typeof document==='undefined')return;
 document.head.insertAdjacentHTML('beforeend',`<style>
 .tabs{flex-direction:column;align-items:stretch}.navtop{display:flex;gap:2px;overflow-x:auto}.subnav{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}
 .sn{border:1px solid var(--line);border-radius:14px;padding:4px 11px;font-size:12.5px;cursor:pointer;background:#fff;color:var(--txt)}.sn.on{background:var(--blue);border-color:var(--blue);color:#fff;font-weight:700}
 .drv{display:grid;grid-template-columns:96px 1fr 84px 64px;align-items:center;gap:8px;font-size:13px;margin:6px 0}.bw{background:#eef1f6;height:12px;border-radius:6px}
 .drv .b{height:12px;border-radius:6px}.drv .b.n{background:#d93025}.drv .b.pp{background:#2f75b5}.drv em{font-style:normal;font-size:12px}
 .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:middle}
 @media(max-width:700px){.cards{grid-template-columns:1fr 1fr;gap:8px}.card.big{grid-column:span 2}.card{padding:9px 11px}.card .v{font-size:19px}.card.big .v{font-size:24px}.navtop .tab{flex:1;text-align:center;padding:8px 4px}.drv{grid-template-columns:78px 1fr 70px 54px;font-size:12px}}
 </style>`);
 document.addEventListener('click',e=>{const t=e.target.closest('.sn-go');if(t){S.tab=t.dataset.t;render();window.scrollTo(0,0)}},true);
})();
