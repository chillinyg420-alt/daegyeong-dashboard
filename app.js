'use strict';
const S={D:null,period:null,basis:'합계',group:'대경지역',tab:'summary',open:{},sort:{k:'hv',d:-1},topN:15};
const BASES=['합계','매장매출','재고통합'];const BK={'합계':'tot','매장매출':'off','재고통합':'int'};
const BNOTE={'합계':'매장매출 + 재고통합','매장매출':'offline · 재고통합 제외','재고통합':'online'};
const TABS=[['summary','요약'],['bun','분류별'],['brd','브랜드별'],['tz','시간대별'],['ins','인시생산성']];
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
const plabel=p=>p.startsWith('누계')?'누계 (1~9월)':p;
const gname=g=>g==='대경지역'?'지역 전체':g;
function addRows(a,b){return a.map((x,i)=>{const y=b[i];return [(x[0]||0)+(y[0]||0),(x[1]||0)+(y[1]||0),x[2],x[3]]})}
function pick(node,P,G){const d=node.data;if(S.basis==='매장매출')return d.off[P][G];if(S.basis==='재고통합')return d.int[P][G];return addRows(d.off[P][G],d.int[P][G])}
const bunRows=(P,G)=>pick(S.D.bun,P,G),brdRows=(P,G)=>pick(S.D.brd,P,G);
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
 labels.forEach((lb,i)=>{const cx=P.l+gw*(i+.5);series.forEach((s,j)=>{const v=s.vals[i]||0,h=(H-P.t-P.b)*v/max,x=cx-bw*series.length/2+bw*j;g+=`<rect x="${x}" y="${H-P.b-h}" width="${bw-1}" height="${h}" rx="2" fill="${s.color}" ${o.hi&&o.hi.includes(i)?'':'opacity=".95"'}><title>${lb} ${s.name}: ${fN(v)}</title></rect>`});
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
 const tr=D.trend[BK[b]][G],labels=[1,2,3,4,5,6,7,8,9].map(x=>x+'월');
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
 const T=tot?tot.v[0]:1,TP=tot?tot.v[1]:1;
 const row=(cls,nm,v,key,open)=>{const[c,p,sc,sp]=v;const bw=T?Math.max(0,c/T*100):0;return `<tr class="${cls}" ${key?`data-k="${key}"`:''}><td>${key?(open?'▾ ':'▸ '):''}${nm}</td><td class="cyc">${fN(c)}</td><td>${T?fP(c/T):'-'}</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>${sc==null?'-':fN(sc)}</td><td>${sp==null?'-':fN(sp)}</td><td style="text-align:left"><span class="bar" style="width:${Math.min(100,bw*2)}px;background:${CY}"></span></td></tr>`};
 let b='';
 tree.forEach(d=>{b+=row('l0',d.name,d.v);d.mids.forEach(m=>{if(!(m.v[0]||m.v[1]))return;const key=d.name+'|'+m.name,op=!!S.open[key];b+=row('l1',m.name,m.v,m.subs.length?key:'',op);if(op)m.subs.forEach(s=>{if(s.v[0]||s.v[1])b+=row('l2',s.name,s.v)})})});
 if(tot)b+=row('tot',bs==='합계'?'합계 (분류 가능분)':'합계',tot.v);
 const ms=D.miss[P][G];let note2='';
 if(bs!=='매장매출'&&ms&&(ms[0]||ms[1])&&tot){const xr=(cls,nm,c,p)=>`<tr class="${cls}"><td>${nm}</td><td class="cyc">${fN(c)}</td><td>-</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>-</td><td>-</td><td></td></tr>`;
  b+=xr('l2','※ 분류 불가 재고통합 (판매상세 미포함)',ms[0],ms[1]);b+=xr('tot',bs==='합계'?'실적합계 (월 KPI 기준)':'재고통합 (월 KPI 기준)',T+ms[0],TP+ms[1]);
  note2=` · 판매상세에 재고통합 내역이 있는 9개점만 분류 가능 — 나머지 점의 재고통합은 '분류 불가' 행으로 표시(합계는 월 KPI와 일치)`}
 return `<div class="panel"><h3>분류별 실적 · ${bs} 기준 · ${gname(G)} · ${plabel(P)}</h3>${legend([[CY,'금년'],[PY,'전년']])}<div class="tw"><table class="t"><thead><tr><th>분류</th><th>금년 실적</th><th>구성비</th><th>전년 실적</th><th>전년비</th><th>증감</th><th>재고(금년)</th><th>재고(전년)</th><th>금년 비중</th></tr></thead><tbody>${b}</tbody></table></div><div class="note">※ ${bs} 기준(${BNOTE[bs]}) · 중분류 행을 누르면 소분류가 펼쳐집니다.${note2} · 재고는 재고현황 기말 수량(월=해당 월말, 누계=9월말 · 기준과 무관 · 스타일 코드로 판매 분류에 매칭, 미매칭분은 합계에만 포함)</div></div>`}
function vBrd(){
 const P=S.period,G=S.group,D=S.D,data=brdRows(P,G),names=D.brd.brands,bs=S.basis;
 const list=names.map((n,i)=>({n,v:data[i]})).filter(x=>x.n!=='합계'&&(x.v[0]||x.v[1])).sort((a,b)=>b.v[0]-a.v[0]);
 const tot=data[names.length-1];const T=tot[0],TP=tot[1];
 const top=S.topN>=999?list:list.slice(0,S.topN);
 const ch=list.slice(0,10);
 let h=`<div class="panel"><h3>브랜드별 신발 실적 TOP10 · ${bs} 기준 · ${gname(G)} · ${plabel(P)}</h3>${legend([[CY,'금년'],[PY,'전년']])}${barChart(ch.map(x=>x.n),[{name:'금년',color:CY,vals:ch.map(x=>x.v[0])},{name:'전년',color:PY,vals:ch.map(x=>x.v[1])}],{rot:true,h:260})}</div>`;
 h+=`<div class="panel"><h3>브랜드 상세 <span class="note">표시 수: ${[10,15,30,999].map(n=>`<a href="#" class="topn" data-n="${n}" style="${S.topN===n?'font-weight:700':''}">${n===999?'전체':'TOP'+n}</a>`).join(' · ')}</span></h3><div class="tw"><table class="t"><thead><tr><th>순위·브랜드</th><th>금년 실적</th><th>비중</th><th>전년 실적</th><th>전년비</th><th>증감</th><th>재고(금년)</th><th>재고(전년)</th></tr></thead><tbody>`+
 top.map((x,i)=>{const[c,p,sc,sp]=x.v;return `<tr><td>${i+1}. ${x.n}</td><td class="cyc">${fN(c)}</td><td>${T?fP(c/T):'-'}</td><td class="pyc">${fN(p)}</td><td>${fY(dv(c,p))}</td><td>${p?fD(c-p):'-'}</td><td>${sc==null?'-':fN(sc)}</td><td>${sp==null?'-':fN(sp)}</td></tr>`}).join('')+
 `<tr class="tot"><td>합계(표 브랜드)</td><td>${fN(T)}</td><td>100%</td><td>${fN(TP)}</td><td>${fY(dv(T,TP))}</td><td>${TP?fD(T-TP):'-'}</td><td>${tot[2]==null?'-':fN(tot[2])}</td><td>${tot[3]==null?'-':fN(tot[3])}</td></tr></tbody></table></div><div class="note">※ 신발 카테고리 · ${bs} 기준(${BNOTE[bs]})${bs==='매장매출'?'':' · 판매상세에 재고통합 내역이 있는 9개점만 반영(나머지 13개점은 매장매출만 포함)'} · 재고(신발)는 재고현황 기말 수량(월=해당 월말, 누계=9월말).</div></div>`;
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
 const m=MX(P,G),mo=[1,2,3,4,5,6,7,8,9],K=BK[b],BLn=b==='합계'?'실적합계':'매장매출';
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
const VIEWS={summary:vSummary,bun:vBun,brd:vBrd,tz:vTz,ins:vIns};
function render(){
 $('#basis').innerHTML=BASES.map(b=>`<button class="pill bs ${b===S.basis?'on':''}" data-b="${b}">${b}</button>`).join('');
 $('#periods').innerHTML=S.D.meta.periods.map(p=>`<button class="pill ${p===S.period?'on':''} ${p.startsWith('누계')?'ytd':''}" data-p="${p}">${p.startsWith('누계')?'누계 (1~9월)':p}</button>`).join('');
 $('#group').value=S.group;
 $('#tabs').innerHTML=TABS.map(([k,t])=>`<div class="tab ${k===S.tab?'on':''}" data-t="${k}">${t}</div>`).join('');
 $('#gnote').textContent=S.group==='대경지역'?'22개 점 합산':'';
 $('#main').innerHTML=VIEWS[S.tab]();
 location.hash=`#b=${encodeURIComponent(S.basis)}&p=${encodeURIComponent(S.period)}&g=${encodeURIComponent(S.group)}&t=${S.tab}`;
}
function bind(){
 $('#basis').onclick=e=>{const b=e.target.closest('[data-b]');if(b){S.basis=b.dataset.b;render()}};
 $('#periods').onclick=e=>{const b=e.target.closest('[data-p]');if(b){S.period=b.dataset.p;render()}};
 $('#group').onchange=e=>{S.group=e.target.value;render()};
 $('#tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){S.tab=b.dataset.t;render()}};
 $('#main').onclick=e=>{
  const th=e.target.closest('th.sort');if(th){const k=th.dataset.k;S.sort=S.sort.k===k?{k,d:-S.sort.d}:{k,d:-1};render();return}
  const tr=e.target.closest('tr.clk');if(tr&&tr.dataset.g){S.group=tr.dataset.g;if(S.tab==='summary'||S.tab==='ins'){}render();window.scrollTo(0,0);return}
  const l1=e.target.closest('tr.l1');if(l1&&l1.dataset.k){S.open[l1.dataset.k]=!S.open[l1.dataset.k];render();return}
  const tn=e.target.closest('a.topn');if(tn){e.preventDefault();S.topN=+tn.dataset.n;render()}};
}
function b64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function decrypt(enc,pass){const te=new TextEncoder();const km=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(enc.salt),iterations:enc.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(enc.iv)},key,b64(enc.data));return JSON.parse(new TextDecoder().decode(buf))}
async function unlock(pass){
 const enc=await (await fetch('data.enc.json')).json();
 S.D=await decrypt(enc,pass);
 const h=new URLSearchParams(location.hash.slice(1));
 S.basis=BASES.includes(h.get('b'))?h.get('b'):'합계';
 S.period=S.D.meta.periods.includes(h.get('p'))?h.get('p'):S.D.meta.periods[0];
 S.group=S.D.meta.groups.includes(h.get('g'))?h.get('g'):'대경지역';
 S.tab=TABS.some(t=>t[0]===h.get('t'))?h.get('t'):'summary';
 $('#asof').textContent='기준일 '+S.D.meta.asof+' · '+S.D.meta.note;
 $('#group').innerHTML=S.D.meta.groups.map(g=>`<option value="${g}">${gname(g)}</option>`).join('');
 $('#gate').style.display='none';$('#app').style.display='block';bind();render();
}
function init(){
 const go=async()=>{$('#err').textContent='';try{await unlock($('#pw').value)}catch(e){$('#err').textContent='암호가 올바르지 않거나 자료를 읽지 못했습니다.'}};
 $('#go').onclick=go;$('#pw').onkeydown=e=>{if(e.key==='Enter')go()};
}
if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init()}
if(typeof window!=='undefined')window.__app={S,render,unlock,TABS,MX,BASES};
