import json, pickle, os, base64, re, collections, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
B = '/tmp/claude-0/-home-claude/8061a408-6f71-550b-86a2-3e754e2d42b9/scratchpad/'
D = json.load(open(B + 'live_data.json', encoding='utf-8'))
M = pickle.load(open(B + 'shoecard.pkl', 'rb'))

# ---------- 베스트상품: 스타일 마스터(브랜드·대/중/소분류·가격)
rows = D['bun']['rows']
sm2 = collections.defaultdict(list); mid2big = {}
buf = []
for b, m, s in rows:            # 소분류 행들 → 중분류 합계행 → 대분류 합계행 순서
    if b and b != '합계' and m is None:
        for mm in buf: mid2big[mm] = b
        buf = []
    elif m and s is None: buf.append(m)
    if b and m and s:           # 첫 행 형태 ['신발','BUSINESS SHOES','BUSINESS CASUAL']
        pass
for b, m, s in rows:
    if m and s: sm2[s].append(m)
SPORT = {'NIKE', 'ADIDAS', 'NEW BALANCE', 'PUMA', 'FILA', 'ASICS', 'SKECHERS', 'REEBOK', 'MIZUNO', 'HOKA', 'SALOMON', 'UNDER ARMOUR', 'ON', 'SAUCONY', 'BROOKS', 'LE COQ SPORTIF', 'DESCENTE', 'KSWISS', 'K-SWISS', 'PROSPECS'}
def resolve(style, brand, name, sm):
    c = sm2.get(sm, [])
    if len(c) == 1: return c[0], False
    if not c: return '기타', True
    n = (name or '').upper()
    if re.search(r'\b(KIDS|JR|JUNIOR|INFANT|TODDLER)\b|\(PS\)|\(TD\)|\(GS\)| PS$| TD$', n) and 'KIDS' in c: return 'KIDS', True
    if brand in SPORT and 'SPORTS SHOES' in c: return 'SPORTS SHOES', True
    if re.match(r'^(W |WMNS|WOMEN)', n) and 'LADIESSHOES' in c: return 'LADIESSHOES', True
    if 'LEATHER CASUAL' in c: return 'LEATHER CASUAL', True
    return c[0], True
A = D['adv']['months']
styles = {}
for m in A:
    for g, bl in A[m]['best'].items():
        for r in bl: styles.setdefault(r[1], (r[0], r[2]))
ST = {}
for s, (brand, name) in styles.items():
    c = M.get(s)
    sm = c['sm'] if c else '기타'
    mid, est = resolve(s, brand, name, sm)
    big = mid2big.get(mid, '기타')
    ST[s] = [brand, name, big, mid, sm, int(c['price'] or 0) if c else 0, int(c['sale'] or 0) if c else 0, 1 if est else 0, sorted(c['colors'])[:4] if c else []]
import calendar
SP = pickle.load(open(B + 'sales26b.pkl', 'rb')); SK = pickle.load(open(B + 'stock26b.pkl', 'rb'))
agg = {k: v for k, v in SP['agg'].items() if k[1] in set(D['meta']['stores'])}; mast = SP['mast']
import datetime as _dt
DQ = pickle.load(open(B + 'daily26.pkl', 'rb'))
Q4 = collections.defaultdict(int)
for (d, s, st), q in DQ.items():
    if s not in set(D['meta']['stores']): continue
    for m in range(1, 11):
        e = _dt.date(2026, m, calendar.monthrange(2026, m)[1])
        if e - _dt.timedelta(days=27) <= d <= e: Q4[(m, s, st)] += q
LIVE10 = {g: {r[1]: (int(r[5]), r[6]) for r in A['10월']['best'].get(g, [])} for g in ['대경지역'] + D['meta']['stores']}
def rows_for(months, g, topn, sm):
    acc = collections.defaultdict(lambda: [0, 0, 0])
    for (m, store, st), v in agg.items():
        if m in months and (g == '대경지역' or store == g):
            a = acc[st]; a[0] += v[0]; a[1] += v[1]
            if m == sm: a[2] += v[2]
    ordered = [x for x in sorted(acc.items(), key=lambda x: -x[1][1]) if x[1][1] > 0]
    keep = set(st for st, _ in ordered[:topn])
    cat = lambda st: (mast.get(st) or ['', '기타', '기타', '기타'])[1:4]
    lim = (20, 10, 5) if g == '대경지역' else (8, 5, 3)   # 대분류·중분류·소분류별 상위
    for lv, n in enumerate(lim):
        cnt = collections.Counter()
        for st, _ in ordered:
            k = tuple(cat(st)[:lv + 1])
            if cnt[k] < n: cnt[k] += 1; keep.add(st)
    out = []
    for rk, (st, (q, sl, qt)) in enumerate(ordered, 1):
        if st not in keep: continue
        stock = sum(SK.get((sm, s, st), 0) for s in D['meta']['stores']) if g == '대경지역' else SK.get((sm, g, st), 0)
        q4 = sum(Q4.get((sm, s, st), 0) for s in D['meta']['stores']) if g == '대경지역' else Q4.get((sm, g, st), 0)
        w = round(stock / (q4 / 4), 1) if q4 > 0 else None
        out.append([st, int(q), int(sl), stock, w, rk])
    return out
PM = {}; used = set()
G = ['대경지역'] + D['meta']['stores']
for m in range(1, 11):
    PM[f'{m}월'] = {g: rows_for([m], g, 150 if g == '대경지역' else 40, m) for g in G}
ytd = [p for p in D['meta']['periods'] if p.startswith('누계')][0]
PM[ytd] = {g: rows_for(list(range(1, 11)), g, 300 if g == '대경지역' else 60, 10) for g in G}
for p in PM:
    for g in PM[p]:
        for r in PM[p][g]: used.add(r[0])
ST2 = {}
for st in used:
    c = M.get(st); mm = mast.get(st)
    if mm: brand, big, mid, sm, name = mm[0], mm[1] or '기타', mm[2] or '기타', mm[3] or '기타', mm[4]; est = 0
    else: brand, name, big, mid, sm, est = ST[st][0], ST[st][1], ST[st][2], ST[st][3], ST[st][4], ST[st][7]
    ST2[st] = [brand, name, big, mid, sm, int(c['price'] or 0) if c else 0, est]
IMG = json.load(open(B + 'img_map.json', encoding='utf-8'))
D['prod'] = {'st': ST2, 'm': PM, 'img': {k: v for k, v in IMG.items() if k in ST2}, 'noimg': [k for k in ST2 if k not in IMG], 'imgBase': 'https://image.a-rt.com/', 'imgAsof': '2026-11-15', 'full': '1~10월', 'top10': [], 'stockTo': '10월', 'nAll': {p: {g: 0 for g in G} for p in PM}, 'src': '스타일별 판매현황상세(1~10월) · 스타일 재고현황(1~10월 말)'}
print('img', len(D['prod']['img']), 'prod styles', len(ST2), 'rows', sum(len(x) for p in PM.values() for x in p.values()))
t = sum(r[2] for r in rows_for([10], '대경지역', 99999, 10)); print('10월 check', t, D['kpi']['10월']['대경지역']['cy_off']); t = sum(r[2] for r in rows_for([9], '대경지역', 99999, 9)); print('9월 check', t, D['kpi']['9월']['대경지역']['cy_off'])
# ---------- 상권 (대구경북 상권 레이더 · Notion 11/8 정기 회차 + 11/14 조기경보)
G4 = ['긴급', '경쟁·확장', '안정·기회', '모니터링']
CL = [
 dict(id='hp', name='홈플러스 성서점 지하2층', grade='긴급', addr='달서구 달구벌대로 1467', stores=['KM 성서홈플러스점', 'ST 성서홈플러스점'], unv=0,
  head='10주 연속 긴급 — 본사 자금난으로 몰 집객·임차 안정성이 계속 약해지는 중',
  now=['11/14 조기경보(미확정): 회사 관계자도 이달 전 점포 휴업 가능성을 배제하지 않음(머니투데이). 휴업 결정·대구 점포 직접 언급은 없음',
       '대구시 부지 사용료 56억 원 체납 → 월 10억 원가량 6회 분납, 전기요금 약 3개월 체납(단전 통보 없음)',
       '테넌트 이탈: 올리브영 9월 철수, 1층 iM뱅크 연말 철수 예정',
       '8월분 급여 절반만 지급(10/23·11/6 25%씩), 협력 중소기업 72%가 피해 응답(중기중앙회 11/8)',
       '매각: 인수의향서 마감 폐지·상시 접수, 유력 후보 미공개 — 우량 점포만 선별 인수 시 성서점 제외 위험'],
  comp='미확인 — 확인된 변화는 입점 테넌트 이탈(올리브영 철수, iM뱅크 철수 예정)',
  act=['주말 휴업 공지 여부·11/14 임금 지급 이행 여부를 최우선 확인', '휴업 시 2개 매장 재고·인력 대응안(점간 이동, 월배점 등 대체 입지) 사전 점검', '성서점 인력·진열·테넌트 추가 이탈 주간 점검'],
  tl=[['08-13', '재개장 — 7월 전기료 미납·단전 예고 이력'], ['09-06', '올리브영 철수(성서점 포함 7곳)·다이소 일부 철수'], ['09-17', '대형마트 67개점 M&A 공식 착수(대구 4개점 포함)'], ['09-27', '재개장 직후 일매출 36%↓·급여 분할 지급'], ['10-12', '국감: 매출 목표 대비 약 30%·분리매각 가능성'], ['10-29', '10월 일매출 20억 원대(재개장 직후의 약 1/5)·희망퇴직 철회'], ['11-02', '부지 사용료 56억 체납·iM뱅크 연말 철수 예정 보도'], ['11-08', '협력사 72% 피해·본사 전기료 약 100억 체납'], ['11-14', '전 점포 휴업 우려(미확정) 조기경보']]),
 dict(id='ds', name='동성로 스트리트', grade='경쟁·확장', addr='중구 동성로 일대', stores=['FH 대구동성로중앙점', 'GS 대구동성로중앙점', 'MS 대구중앙로역점', 'SP 대구동성로점'], unv=0,
  head='대구백화점 본점 매각 이행이 불확실한 가운데 SPA·편집숍 대형 매장 출점이 이어짐',
  now=['대구백화점 본점 1,300억 양도: 11/10 정정공시로 1차 중도금 25억 완납, 다음은 11/27 2차 30억',
       '매수인 계획은 철거 후 최고 45층 호텔·레지던스 복합시설 — 영업 종료 시점 미명시',
       '집객: 스파오 2호점(10/2, 384평)·탑텐 플래그십(10/23, 341평)·유니클로 동성로중앙점(5월)',
       '무신사 동성로 2개 매장 3년 누적 방문 660만 명(10~20대 66%) — 신발·스트릿 수요 경합 상시화',
       '기회: KB 상권 인사이트(대중교통 인구지수 대구 평균의 약 2.9배), 골목상권 가을축제(~11월 말)'],
  comp='무신사 스탠다드 동성로점·무신사 스토어 대구 운영 중 · 스파오 2호점 · 탑텐 플래그십 · 유니클로 동성로중앙점 · 아식스 동성로점(최근 상태 미재확인) · 아디다스 신규 출점(위치·규모 미확인)',
  act=['11/27 2차 중도금 이행·임시주총 일정 모니터링', '매수인 활용계획·영업 종료 시점이 구체화되면 4개 매장 집객 영향 재평가', '아우터·패딩 시즌 SPA 대형점과 겹치는 가격대 상품 진열·행사 점검'],
  tl=[['08-26', '대구백화점 인수 중도금 미납으로 매각 무산'], ['09-03', '세계마스터즈육상대회 종료 — 기간 중 외국인 3~4배'], ['10-02', '스파오 동성로 2호점 오픈(384평)'], ['10-13', '대구백화점 본점 1,300억 양도 계약'], ['10-22', '최대주주 주식 처분금지 가처분 인용'], ['10-23', '탑텐 동성로점 플래그십 재개점(341평)'], ['11-05', '1차 중도금 잔여 15억 납부 기한 재연장'], ['11-10', '정정공시: 1차 중도금 25억 완납']]),
 dict(id='sf', name='스타필드마켓 경산점 / 펜타힐즈', grade='안정·기회', addr='경산시 옥산로 227', stores=['SE 경산스타필드마켓점'], unv=1,
  head='홈플러스 경산점 마트 폐쇄 후 대형마트 수요 이동 기대 — 11월 신규 기사는 미확인',
  now=['홈플러스 경산점 6/4 마트 폐쇄 확정(임대매장·주차장 존속), 개별 부동산 매각 대상', 'SNS발 폐점정리 할인행사(스포츠·아웃도어 최대 90%)는 언론 교차검증 안 됨 — SNS 단계 정보', '펜타힐즈 W스퀘어 복합몰(점포 490여 개)·펜타힐즈W 3,443가구 — 중장기 경합·배후 변수'],
  comp='미확인(인근 홈플러스몰 내 나이키·아디다스·노스페이스는 폐점 수순)',
  act=['홈플러스 경산점 정리행사 진행 여부 현장 확인(스포츠 브랜드 할인 경합)', '10월 전년비 -38% 구간의 구매 고객 감소 원인 점검'],
  tl=[['06-04', '홈플러스 경산점 지하2층 마트 폐쇄'], ['09-11', 'SNS발 폐점정리행사 정보(미검증)'], ['11-02', '단석가 스타필드마켓 입점(영향 미미)']]),
 dict(id='is', name='롯데아울렛 이시아폴리스', grade='모니터링', addr='동구 팔공로49길 16', stores=['KM 대구이시아폴리스점', 'SE 대구이시아폴리스점'], unv=0,
  head='행사 위주의 평이한 흐름 — 중장기로는 인근 신세계사이먼 아울렛(2028)이 경합 변수',
  now=['서프라이스 위크(10/30~11/8) 종료 — 이시아폴리스점은 겨울 의류 중심', '직전 더블찬스위크(10/16~25)에는 ABC마트 할인 포함', '안심뉴타운 신세계사이먼 프리미엄 아울렛 2028년 하반기 개장 목표(같은 생활권 직접 경합)', '도시철도4호선(이시아폴리스 종점) 차량 방식 공론화 — 2030년 개통 불확실'],
  comp='나이키 팩토리 스토어 · 뉴발란스 메가숍(2025-09 리뉴얼) · 아디다스',
  act=['행사 종료 후 방문객·매출 변화 확인', '신세계사이먼 인허가·착공 일정 중장기 추적'],
  tl=[['08-31', 'NC아울렛 엑스코점 영업 종료(별개 상권)'], ['09-10', '도시철도4호선 공론화위 출범'], ['10-16', '더블찬스위크(ABC마트 할인 포함)'], ['10-20', '신세계사이먼 안심뉴타운 아울렛 2028 하반기 보도'], ['10-30', '서프라이스 위크(~11/8)']]),
 dict(id='yh', name='롯데아울렛 대구율하점', grade='안정·기회', addr='동구 안심로 80', stores=['KM 율하롯데아울렛점', 'ST 율하롯데아울렛점'], unv=0,
  head='범안로 무료화 이후 통행량 증가 — 스포츠 브랜드 할인 행사와 가격 경합',
  now=['서프라이스 위크: 나이키 등 스포츠 브랜드 추가 할인(~11/8) — 2층 ST 율하점은 가격 경합, 1층 KM 율하점은 유입 수혜 가능', '2층 스트릿 편집샵 위라이크잇 팝업 11/12 종료', '범안로 9/1 완전 무료화(통행량 5만→5.3만 대), 병목도 공존', '신세계사이먼 아울렛(2028 하반기)·율하교 동편 고가(2029/12)는 중장기 변수'],
  comp='미확인(팝업 편집샵은 한시 운영)',
  act=['팝업 종료 전후 2층 동선·스니커 매출 변화 점검', '행사 종료 후 유입 변화를 데이터로 확인'],
  tl=[['08-30', '모니터링 → 안정·기회 상향(범안로 무료화 확정)'], ['09-01', '범안로 통행료 완전 무료화'], ['10-05', '위라이크잇 팝업 시작(~11/12)'], ['10-30', '서프라이스 위크(나이키 등 스포츠 할인)']]),
 dict(id='wb', name='이마트 월배점 및 인근가', grade='모니터링', addr='달서구 진천로 92·95', stores=['KM 대구월배이마트점', 'ST 대구월배점'], unv=1,
  head='주거 배후 상권 — 최신 직접 기사는 미확인, 달서구 미분양 부담은 지속',
  now=['달서구 미분양 1,021가구로 구 중 최다(9월)', '대구 입주물량 2027년 공백 후 2028년 상인센트럴자이 1,498가구로 반등', '대구시 정비사업 활성화 지원 11월 시행(용적률 인센티브 최대 43%p)', '홈플러스 성서점 리스크가 커질수록 대체 입지로서 의미'],
  comp='미확인',
  act=['이마트 월배점 행사 일정 확인', 'ST 대구월배점 10월 구매전환율 -6.6%p 원인(인력·결품) 점검'],
  tl=[['09-08', '상인동 전세 오픈런 보도'], ['10-15', '달서구 골목형상점가 13곳 신규 지정'], ['10-26', '입주물량 2027년 급감 보도'], ['11-08', '대구시 정비사업 활성화 지원 시행']]),
 dict(id='lt', name='롯데백화점 대구점', grade='안정·기회', addr='북구 태평로 161', stores=['SE 대구롯데점'], unv=1,
  head='연말 아웃도어·패딩 시즌 진입 — 대구신세계 리뉴얼과의 신발 고객 경합 주시',
  now=['대구신세계 3층 패션잡화 리뉴얼(10/27): 오니츠카 타이거·어그·닥터마틴 재배치', '겨울 정기 세일은 작년 11/14~30 진행 — 올해 일정은 미확정', '액티브 위크(10/1~18) 종료'],
  comp='미확인',
  act=['겨울 정기 세일 일정 확인 후 행사 상품·인력 준비', '스포츠 카테고리 매출 추이 점검'],
  tl=[['08-30', '모니터링 → 안정·기회 상향(집객 이벤트 확인)'], ['10-01', '액티브 위크(~10/18)'], ['10-27', '대구신세계 3층 패션잡화 리뉴얼']]),
 dict(id='hd', name='현대아울렛 대구점', grade='안정·기회', addr='동구 동대구로 454', stores=['ST 대구현대아울렛점'], unv=0,
  head='이케아·대구신세계 리뉴얼로 동대구 앵커가 연달아 강화 — 신발 수요 경합은 주시',
  now=['이케아 대구1호점 9/17 오픈(대구신세계 8층)', '대구신세계 4층 해외디자이너관(9/20)·3층 패션잡화 리뉴얼(10/27)', '도시철도4호선 공론화 권고는 구속력 없음 — 2030년 개통 불확실', '개장 이후 방문객·매출 결산 보도는 아직 없음'],
  comp='미확인',
  act=['동대구 유동 증가가 매장 입점객으로 이어지는지 입점객·전환율로 확인', '오니츠카 타이거 등 인접 경합 브랜드 가격·행사 확인'],
  tl=[['08-30', '모니터링 → 안정·기회 상향(이케아 오픈 확정)'], ['09-17', '이케아 대구1호점 오픈'], ['09-20', '대구신세계 해외디자이너관 개장'], ['10-27', '대구신세계 3층 패션잡화 리뉴얼']]),
 dict(id='gc', name='롯데마트 김천점', grade='안정·기회', addr='김천시 시청로 80', stores=['ST 김천롯데마트점'], unv=1,
  head='공공기관 2차 이전 유치·송천 택지 등 중장기 정주 기반 — 최신 직접 기사는 미확인',
  now=['송천 택지 2,782세대 경북도 승인(실시계획인가 내년 2월 예정)', '공공기관 2차 이전 유치 건의 지속 — 구체 일정 없음'],
  comp='미확인',
  act=['공공기관 2차 이전 발표 시점 주시', '롯데마트 김천점 행사 일정 확인'],
  tl=[['08-30', '모니터링 → 안정·기회 상향(공공기관 2차 이전 유치 건의)'], ['09-07', '송천 택지 2,782세대 승인']]),
 dict(id='gm', name='구미 스트리트 · 롯데마트', grade='안정·기회', addr='구미 문화로·인동·구미대로', stores=['ST 구미롯데마트점', 'ST 구미원평점', 'ST 구미인동점'], unv=0,
  head='대규모 투자·산단 호재가 이어지지만 가동은 2029년 전후 — 단기 매출 효과는 제한적',
  now=['삼성SDS AI 데이터센터 기공식(11/2, 2029/3 가동 목표)', '구미 7개 기업 약 25조 투자계획(10/28)·KMW 희토류 3,500억·212명 채용 MOU(10/29)', '구미 파크원 데시앙 11월 분양 예정(도량동 2,648세대)', '구미역 상권 공실률 26.5→24.4% 개선'],
  comp='미확인',
  act=['파크원 데시앙 청약·입주 시점 확인', '문화로 자율상권 사업 후속 확인', '원평·인동점 10월 구매 고객 -21~-26% 원인 점검'],
  tl=[['08-26', '대구경북 광역철도 예타 통과(동구미역 신설)'], ['09-02', '구미역 상권 공실률 개선 보도'], ['10-01', '로봇 특화단지 통합 지정'], ['10-28', '7개 기업 약 25조 투자계획'], ['11-02', '삼성SDS AI 데이터센터 기공식']]),
 dict(id='st', name='개별 스트리트: 성서 · 신매 · 칠곡', grade='안정·기회', addr='달서구·수성구·북구', stores=['ST 대구성서점', 'ST 대구신매점', 'ST 대구칠곡점'], unv=1,
  head='소비 부양책은 우호적 — 성서점은 홈플러스 성서점과 같은 생활권이라 함께 주시',
  now=['골목상권 가을축제(10/24~11월 말)·대구대박세일은 생활상권 심리에 우호적', '달서구 미분양 1,021가구 최다, 칠곡 배후 학정동 1,098가구는 2027년 입주 예정', '성서점은 홈플러스 성서점 변동 시 유동 영향 가능'],
  comp='미확인',
  act=['홈플러스 성서점 휴업 시 ST 대구성서점 유입 변화 점검', '신매점 10월 구매 고객 -21% 원인 점검'],
  tl=[['09-03', '세계마스터즈육상대회 종료(신매점 인접 효과)'], ['10-12', '대구대박세일(~10/21)'], ['10-24', '골목상권 가을축제(~11월 말)']]),
]
dates = ['08-27', '08-30', '09-07', '09-13', '09-20', '09-27', '10-04', '10-11', '10-18', '10-25', '11-01', '11-08']
first = {'gc': '모니터링', 'lt': '모니터링', 'yh': '모니터링', 'hd': '모니터링'}
hist = {c['id']: [G4.index(first.get(c['id'], c['grade']) if i == 0 else c['grade']) for i in range(len(dates))] for c in CL}
NEWS = [
 ['11-14', '조기경보', 'hp', '홈플러스 전 점포 휴업 우려 확산 — 회사도 가능성 배제 안 함(미확정)', '지난주 하루 매출 30억 원 미만, 매입 물량 재개장 초기 대비 약 30% 감소. 휴업 결정·대구 점포 직접 언급은 없음', ''],
 ['11-10', '정규', 'ds', '대구백화점 본점 매각 1차 중도금 25억 완납(정정공시)', '다음 일정은 11/27 2차 중도금 30억. 자동해제 특약은 유지', ''],
 ['11-08', '정규', 'hp', '홈플러스 협력사 72% 피해·전기요금 약 100억 체납', '8월분 급여 절반 미지급, 매각은 상시 접수로 전환', 'https://www.idaegu.com/news/articleView.html?idxno=666804'],
 ['11-08', '정규', 'wb', '대구시 정비사업 활성화 지원 11월 시행', '주민 구역 제안·용적률 인센티브 최대 43%p. 9월 미분양 3,889가구(정점 대비 -72.2%), 달서구 최다', 'https://nocutnews.co.kr/news/6603668'],
 ['11-02', '정규', 'hp', '홈플러스 성서점 부지 사용료 56억 체납 → 6회 분납', '1층 iM뱅크 연말 철수 예정, 전기료 약 3개월 체납(단전 통보 없음)', 'https://www.idaegu.com/news/articleView.html?idxno=666680'],
 ['11-02', '정규', 'gm', '삼성SDS 구미 AI 데이터센터 기공식', '60MW, 2028/12 준공·2029/3 가동 목표 — 단기 매출 효과는 제한적', 'https://www.stnsports.co.kr/news/articleView.html?idxno=325004'],
 ['10-29', '참고', 'yh', '롯데아울렛 이시아폴리스·율하점 서프라이스 위크(10/30~11/8)', '율하점은 나이키 등 스포츠 브랜드 추가 할인', 'https://biz.heraldcorp.com/article/10919057'],
 ['10-28', '참고', 'gm', '구미 7개 기업 약 25조 투자계획', 'LG이노텍·SK실트론·삼성전자(로봇) 등, KMW 희토류 3,500억 MOU(10/29)', 'https://view.asiae.co.kr/article/2026102814073132011'],
 ['10-28', '참고', 'hd', '대구신세계 3층 패션잡화 리뉴얼(10/27 재개장)', '오니츠카 타이거·어그·닥터마틴 재배치 — 동대구·롯데백화점 신발 고객 경합', 'https://www.hidomin.com/news/articleView.html?idxno=726960'],
 ['10-26', '참고', 'ds', '무신사 동성로 2개 매장 3년 누적 방문 660만 명', '구매 고객 10~20대 66%. 2026년 아디다스·미쏘 등 신규 출점 이어짐(아디다스 위치·규모 미확인)', 'https://www.imaeil.com/page/view/2026102610595120064'],
 ['10-26', '참고', 'wb', '대구 아파트 입주물량 2027년 1,512가구(-85.9%)', '11~12월 입주 0, 2028년 상인센트럴자이 1,498가구로 반등', 'https://www.idaegu.com/news/articleView.html?idxno=666516'],
 ['10-21', '참고', 'ds', '탑텐 동성로점 플래그십 새단장(10/23, 약 341평)', '스파오 2호점(10/2)에 이은 SPA 대형매장 확대 — 아우터·패딩 수요 경합 가능', 'https://www.fnnews.com/news/202610210850568514'],
 ['10-20', '참고', 'is', '안심뉴타운 신세계사이먼 프리미엄 아울렛 2028년 하반기 개장 목표', '율하·이시아폴리스와 같은 생활권의 직접 경합 아웃렛(중장기)', 'https://www.hidomin.com/news/articleView.html?idxno=725782'],
 ['10-13', '참고', 'ds', '대구백화점 본점 1,300억 양도 계약', '중도금: 2차 30억(11/27)·3차 280억(2027/2/12)·잔금 950억(2027/12/15)', 'https://www.idaegu.com/news/articleView.html?idxno=666252'],
 ['10-13', '참고', '', '슈마커, 배민 장보기·쇼핑 입점(수도권 30개 매장 시작)', '대구 매장 포함 여부는 확인 안 됨 — 멀티숍 퀵커머스 확산 주시', 'https://www.fnnews.com/news/202610130925452852'],
]
D['area'] = {'asof': '2026-11-14', 'cover': '11/8 정기 갱신 + 11/14 조기경보 반영', 'src': '대구경북 상권 레이더(Notion · 매주 일요일 19시 갱신)', 'url': 'https://app.notion.com/p/3cb07482a72c8108b685cda33b148adf',
             'grades': G4, 'clusters': CL, 'dates': dates, 'hist': hist,
             'changes': [['08-30', 'gc', '모니터링', '안정·기회', '공공기관 2차 이전 유치 건의로 정주인구 확대 기대'], ['08-30', 'lt', '모니터링', '안정·기회', '집객 이벤트 확인'], ['08-30', 'yh', '모니터링', '안정·기회', '범안로 통행료 9/1 완전 무료화'], ['08-30', 'hd', '모니터링', '안정·기회', '이케아 대구점 9/17 오픈 확정']],
             'news': NEWS}
D['meta']['note'] = D['meta']['note'] + ' · 상권=상권 레이더(Notion) ' + D['area']['asof'] + ' 기준'
allst = set(D['meta']['stores']); cov = [s for c in CL for s in c['stores']]
assert set(cov) == allst and len(cov) == 22, (allst - set(cov), set(cov) - allst)
json.dump(D, open(B + 'dash_data_v5.json', 'w', encoding='utf-8'), ensure_ascii=False)
pw = open('/mnt/user-data/outputs/대시보드_접속암호.txt', encoding='utf-8').readline().strip()
salt = os.urandom(16); iv = os.urandom(12); it = 200000
k = PBKDF2HMAC(hashes.SHA256(), 32, salt, it).derive(pw.encode())
ct = AESGCM(k).encrypt(iv, json.dumps(D, ensure_ascii=False, separators=(',', ':')).encode(), None)
b = lambda x: base64.b64encode(x).decode()
os.makedirs(B + 'docs', exist_ok=True)
json.dump({"v": 1, "iter": it, "salt": b(salt), "iv": b(iv), "data": b(ct)}, open(B + 'docs/data.enc.json', 'w'))
print('enc MB', os.path.getsize(B + 'docs/data.enc.json') / 1e6)
