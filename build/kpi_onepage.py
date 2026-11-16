# -*- coding: utf-8 -*-
"""관리지표 보고서 매장당 A4 가로 2쪽(앞: 표 / 뒤: 코멘트) 레이아웃 변환기.
기존 레이아웃(섹션별 세로 나열, 코멘트 1줄=1행) 파일을 읽어 매장 시트를 1페이지 양식으로 재구성한다.
사용: python3 kpi_onepage.py 입력.xlsx 출력.xlsx
- 금액은 셀 원값(원) 그대로 두고 표시만 천원 단위(#,##0,)
- 파생값(전년비·구성비·합계)은 수식으로 다시 작성
"""
import sys, math, re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.worksheet.pagebreak import Break

FONT = 'Malgun Gothic'
NAVY = '1F3864'; SEC = 'D9E2F3'; CUR = 'D6E4F7'; PREV = 'E4E4E4'; TOT = 'E2EFDA'; YEL = 'FFF2CC'; LBL = 'EEF3FA'
THIN = Side(style='thin', color='B4C6E7')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
F_AMT = '#,##0,'            # 천원 표시
F_INT = '#,##0'
F_PCT = '0.0%;[Red]\\-0.0%'
F_PCTD = '\\+0.0%;[Red]\\-0.0%;0.0%'
F_PCTP = '\\+0.0%p;[Red]\\-0.0%p;0.0%p'
NCOL = 16
WIDTHS = [10.5] + [7.9] * 15
BASE = 8.5


def fill(c):
    return PatternFill('solid', fgColor=c)


def put(ws, r, c, v, fmt=None, bold=False, bg=None, color=None, size=BASE, h='center', wrap=False, border=True, v_='center', shrink=False):
    cell = ws.cell(r, c, v)
    cell.font = Font(name=FONT, size=size, bold=bold, color=color)
    if bg:
        cell.fill = fill(bg)
    cell.alignment = Alignment(horizontal=h, vertical=v_, wrap_text=wrap, shrink_to_fit=(shrink and not wrap))
    if fmt:
        cell.number_format = fmt
    if border:
        cell.border = BORDER
    return cell


def merge(ws, r1, c1, r2, c2):
    if (r1, c1) != (r2, c2):
        ws.merge_cells(start_row=r1, start_column=c1, end_row=r2, end_column=c2)
        for rr in range(r1, r2 + 1):
            for cc in range(c1, c2 + 1):
                ws.cell(rr, cc).border = BORDER


def sec_title(ws, r, c1, c2, text, note=None):
    t = text if not note else f'{text}   ·  {note}'
    put(ws, r, c1, t, bold=True, bg=SEC, h='left', size=BASE + 0.5)
    for cc in range(c1 + 1, c2 + 1):
        ws.cell(r, cc).fill = fill(SEC)
    merge(ws, r, c1, r, c2)


def hdr(ws, r, c, text, span=1):
    put(ws, r, c, text, bold=True, bg=NAVY, color='FFFFFF', wrap=True, size=BASE - 0.5)
    if span > 1:
        merge(ws, r, c, r, c + span - 1)


def yoy(a, b):
    return f'=IFERROR(IF(OR({a}="",{b}="",N({b})=0),"",{a}/{b}-1),"")'


# ---------------- 추출 ----------------
def extract(wv, wf):
    """wv: data_only 시트, wf: 수식 시트."""
    last = max(r for r in range(1, wv.max_row + 1) if any(wv.cell(r, c).value not in (None, '') for c in range(1, 13)))
    secs = {}
    for r in range(1, last + 1):
        v = wv.cell(r, 1).value
        if isinstance(v, str) and v.startswith('■'):
            secs[v] = r
    def find(key):
        for k, r in secs.items():
            if key in k:
                return r, k
        raise KeyError(key)
    V = lambda r, c: wv.cell(r, c).value
    d = {'title': V(1, 1)}
    # 기본정보
    r, _ = find('기본 정보')
    d['basic'] = [(V(r + 1, c), V(r + 2, c)) for c in range(1, 13)]
    # KPI
    r, k = find('매출 유형 (핵심')
    d['kpi_h'] = [V(r + 1, c) for c in range(1, 12)]
    d['kpi_prev'] = [V(r + 2, c) for c in range(1, 12)]
    d['kpi_cur'] = [V(r + 3, c) for c in range(1, 12)]
    d['kpi_fmt'] = [wf.cell(r + 2, c).number_format for c in range(1, 12)]
    d['kpi_dfmt'] = [wf.cell(r + 4, c).number_format for c in range(1, 12)]
    d['kpi_dform'] = [wf.cell(r + 4, c).value for c in range(1, 12)]
    # 월별
    r, k = find('월별 매장매출')
    d['monthly_note'] = V(r, 6)
    g = r + 1
    comps = []
    for c0 in (5, 9):
        nm = V(g, c0)
        rows = [(V(g + 2 + i, c0), V(g + 2 + i, c0 + 1)) for i in range(12)]
        has = any(x not in (None, '', 0) for pr in rows for x in pr)
        comps.append({'name': nm, 'rows': rows, 'has': has})
    d['monthly'] = {'months': [V(g + 2 + i, 1) for i in range(12)],
                    'own': [(V(g + 2 + i, 2), V(g + 2 + i, 3)) for i in range(12)],
                    'comps': comps}
    # 동업계 매출 유형
    r, k = find('동업계 매출 유형')
    d['peer_h'] = [V(r + 1, c) for c in range(1, 9)]
    peers = []
    rr = r + 2
    while rr <= last and not (isinstance(V(rr, 1), str) and V(rr, 1).startswith('■')):
        vals = [V(rr, c) for c in (1, 2, 4, 6, 8)]
        if any(x not in (None, '') for x in vals):
            peers.append(vals)
        rr += 1
    d['peers'] = peers
    # 카테고리
    r, k = find('카테고리 실적')
    rows = []
    rr = r + 2
    while V(rr, 1) not in (None, ''):
        rows.append((V(rr, 1), V(rr, 2), V(rr, 3), V(rr, 4)))
        rr += 1
    d['cat'] = rows
    # 시간대
    r, k = find('시간대별')
    rows = []
    rr = r + 2
    while V(rr, 1) not in (None, '') and V(rr, 1) != '합계':
        rows.append((V(rr, 1), V(rr, 2), V(rr, 3)))
        rr += 1
    d['tb'] = rows
    # 브랜드
    r, k = find('TOP 5 브랜드')
    d['brand_note'] = V(r, 6)
    rows = []
    for i in range(5):
        rr = r + 2 + i
        rows.append((V(rr, 1), V(rr, 2), V(rr, 3), V(rr, 4), V(rr, 7), V(rr, 8)))
    d['brand'] = rows
    d['shoe_tot'] = (V(r + 2, 10), V(r + 2, 11))
    # 상품
    r, k = find('BEST 5 상품')
    cur, prev = [], []
    for i in range(5):
        cur.append([V(r + 2 + i, c) for c in range(2, 9)])
        prev.append([V(r + 8 + i, c) for c in range(2, 9)])
    d['prod_cur'], d['prod_prev'] = cur, prev
    d['prod_title'] = k.replace('■', '').strip()
    # 층별
    r, k = find('층별 비중')
    d['floor_note'] = V(r, 6)
    rows = []
    rr = r + 2
    while V(rr, 1) not in (None, '') and V(rr, 1) != '합계':
        rows.append((V(rr, 1), V(rr, 2), V(rr, 4), V(rr, 6)))
        rr += 1
    d['floor'] = rows
    # 재고
    r, k = find('대분류별 총 재고')
    rows = []
    rr = r + 2
    while V(rr, 1) not in (None, '') and V(rr, 1) != '합계':
        rows.append((V(rr, 1), V(rr, 2), V(rr, 3)))
        rr += 1
    d['stock'] = rows
    # 코멘트
    r, k = find('매출 실적 분석')
    d['cmt_title'] = k.replace('■', '').strip()
    groups = []
    for rr in range(r + 2, last + 1):
        a, b = V(rr, 1), V(rr, 2)
        if a not in (None, ''):
            groups.append([a, []])
        if b not in (None, '') and groups:
            groups[-1][1].append(str(b))
    d['cmt'] = groups
    return d


# ---------------- 줄 수 추정 ----------------
def text_w(s, size):
    w = 0.0
    for ch in s:
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3 or 0x3130 <= o <= 0x318F or 0x2E80 <= o <= 0x9FFF:
            w += size * 0.98
        elif ch in '▪⊙▷★※·→↔【】':
            w += size * 0.98
        elif ch == ' ':
            w += size * 0.30
        else:
            w += size * 0.56
    return w


def n_lines(lines, width_units, size):
    cap = width_units * 5.45 - 6  # pt
    n = 0
    for ln in lines:
        n += max(1, math.ceil(text_w(ln, size) / cap))
    return n


# ---------------- 작성 ----------------
def build(ws, d):
    for i, w in enumerate(WIDTHS, 1):
        ws.column_dimensions[CL(i)].width = w
    ws.sheet_view.showGridLines = False
    r = 1
    put(ws, r, 1, d['title'], bold=True, size=14, h='left', border=False, color=NAVY)
    merge(ws, r, 1, r, 10)
    for cc in range(1, 11):
        ws.cell(r, cc).border = Border()
    put(ws, r, 11, '금액 단위: 천원  |  연파랑=금년 · 회색=전년 · 노랑=수기입력', size=7, h='right', border=False, color='595959')
    ws.merge_cells(start_row=r, start_column=11, end_row=r, end_column=16)
    ws.row_dimensions[r].height = 22
    r += 1
    ws.row_dimensions[r].height = 4
    r += 1

    # ── Block1: 기본정보(A-F, 2단) | 동업계 매출유형(I-P)
    top = r
    sec_title(ws, r, 1, 6, '■ 기본 정보')
    b = d['basic']
    for half in range(2):
        hr = r + 1 + half * 2
        for j in range(6):
            lab, val = b[half * 6 + j]
            hdr(ws, hr, 1 + j, lab)
            c = put(ws, hr + 1, 1 + j, val, bg=YEL, size=BASE, shrink=True)
            if hasattr(val, 'year'):
                c.number_format = 'yyyy-mm-dd'
        ws.row_dimensions[hr].height = 22
    # 총인원(계산): 기본정보 11번째 = 두번째 줄 5번째 칸 → E6:J6 합계 = 2단 기준 E(1행)+F(1행)+A~D(2행)
    calc_r, calc_c = r + 4, 5
    ws.cell(calc_r, calc_c).value = f'=SUM({CL(5)}{r+2}:{CL(6)}{r+2},{CL(1)}{r+4}:{CL(4)}{r+4})'
    ws.cell(calc_r, calc_c).fill = fill('FFFFFF')
    # 동업계 매출유형
    sec_title(ws, r, 9, 16, '■ 동업계 매출 유형 (금년)')
    ph = ['동업계 명', '합계', '자사대비', '매장매출', '자사대비', '온라인', '자사대비', '본사제공\n단체매출']
    for j, t in enumerate(ph):
        hdr(ws, r + 1, 9 + j, t)
    peers = d['peers'] or [[None] * 5]
    peer_rows = []
    for i, p in enumerate(peers[:3]):
        rr = r + 2 + i
        peer_rows.append(rr)
        put(ws, rr, 9, p[0], bold=True, bg='C9D8EE', size=BASE - 0.5, shrink=True)
    d['_peer_rows'] = peer_rows
    r = r + 5
    r += 1
    # 동업계 자사대비 수식은 KPI 위치가 정해진 뒤 채운다

    # ── Block2: KPI(A-K) | 재고(L-O)
    sec_title(ws, r, 1, 11, '■ 매출 유형 (핵심 KPI)')
    for j, t in enumerate(d['kpi_h']):
        hdr(ws, r + 1, 1 + j, t)
    rp, rc, rd = r + 2, r + 3, r + 4
    amt_cols = set()
    for j in range(11):
        hj = str(d['kpi_h'][j] or '')
        is_amt = j in (1, 2, 3, 4, 5)
        if is_amt:
            amt_cols.add(j)
        if j == 0:
            put(ws, rp, 1, d['kpi_prev'][0], bg=PREV, bold=True)
            put(ws, rc, 1, d['kpi_cur'][0], bg=CUR, bold=True)
            put(ws, rd, 1, '전년비/증감', bg=TOT, bold=True, size=BASE - 0.5)
            continue
        f = F_AMT if is_amt else d['kpi_fmt'][j]
        put(ws, rp, 1 + j, d['kpi_prev'][j], fmt=f, bg=PREV, h='right')
        put(ws, rc, 1 + j, d['kpi_cur'][j], fmt=f, bg=CUR, h='right', bold=True)
        P, C_ = f'{CL(1+j)}{rp}', f'{CL(1+j)}{rc}'
        df = d['kpi_dfmt'][j]
        orig = str(d['kpi_dform'][j] or '')
        if '-' in orig and '/' not in orig:
            fml = f'=IFERROR({C_}-{P},"")'
        else:
            fml = f'=IFERROR(IF(OR({P}=0,{C_}=0),"",{C_}/{P}-1),"")'
        put(ws, rd, 1 + j, fml, fmt=df, bg=TOT, h='right', bold=True)
    kpi_cur_row = rc
    sec_title(ws, r, 12, 16, '■ 대분류별 재고 (EA)')
    for j, t in enumerate(['대분류', '금년', '전년', '전년비']):
        hdr(ws, r + 1, 12 + j, t)
    hdr(ws, r + 1, 16, '구성비')
    s0 = r + 2
    st = d['stock']
    for i, (nm, cu, pv) in enumerate(st):
        rr = s0 + i
        put(ws, rr, 12, nm, bold=True)
        put(ws, rr, 13, cu, fmt=F_INT, h='right', bg=CUR)
        put(ws, rr, 14, pv, fmt=F_INT, h='right', bg=PREV)
        put(ws, rr, 15, yoy(f'M{rr}', f'N{rr}'), fmt=F_PCT, h='right')
    rt = s0 + len(st)
    put(ws, rt, 12, '합계', bold=True, bg=TOT)
    put(ws, rt, 13, f'=SUM(M{s0}:M{rt-1})', fmt=F_INT, h='right', bg=TOT, bold=True)
    put(ws, rt, 14, f'=SUM(N{s0}:N{rt-1})', fmt=F_INT, h='right', bg=TOT, bold=True)
    put(ws, rt, 15, yoy(f'M{rt}', f'N{rt}'), fmt=F_PCT, h='right', bg=TOT, bold=True)
    for rr in range(s0, rt + 1):
        put(ws, rr, 16, f'=IFERROR(M{rr}/M${rt},"")', fmt=F_PCT, h='right', bg=TOT if rr == rt else None, bold=rr == rt)
    ws.row_dimensions[r + 1].height = 24
    # 동업계 자사대비 (KPI 금년 행 참조)
    for i, rr in enumerate(d['_peer_rows']):
        p = d['peers'][i] if d['peers'] else [None] * 5
        put(ws, rr, 10, p[1], fmt=F_AMT, h='right')
        put(ws, rr, 11, f'=IFERROR(IF(OR(J{rr}="",$B${kpi_cur_row}=0),"",J{rr}/$B${kpi_cur_row}),"")', fmt=F_PCT, h='right')
        put(ws, rr, 12, p[2], fmt=F_AMT, h='right')
        put(ws, rr, 13, f'=IFERROR(IF(OR(L{rr}="",$C${kpi_cur_row}=0),"",L{rr}/$C${kpi_cur_row}),"")', fmt=F_PCT, h='right')
        put(ws, rr, 14, p[3], fmt=F_AMT, h='right')
        put(ws, rr, 15, f'=IFERROR(IF(OR(N{rr}="",$D${kpi_cur_row}=0),"",N{rr}/$D${kpi_cur_row}),"")', fmt=F_PCT, h='right')
        put(ws, rr, 16, p[4], fmt=F_AMT, h='right')
    ws.row_dimensions[top + 1].height = 22
    r = max(rd, rt) + 1
    r += 1

    # ── Block3: 월별 (가로 전개)
    m = d['monthly']
    note = '매장매출(오프라인) 기준' + (f" · {d['_yx_note']}" if d.get('_yx_note') else '')
    sec_title(ws, r, 1, 16, '■ 월별 매장매출 · 자사 vs 동업계', note)
    hdr(ws, r + 1, 1, '구분', 2)
    for i, mn in enumerate(m['months']):
        hdr(ws, r + 1, 3 + i, mn)
    hdr(ws, r + 1, 15, '연 누계', 2)
    rr = r + 2
    def mrow(label, vals, bg, bold=False, fmt=F_AMT):
        put(ws, rr, 1, label, bold=True, bg=bg, h='left', size=BASE - 0.5, shrink=True)
        merge(ws, rr, 1, rr, 2)
        for i, v in enumerate(vals):
            put(ws, rr, 3 + i, v, fmt=fmt, h='right', bg=bg, bold=bold)
    own_c = rr
    mrow('자사 금년', [a for a, _ in m['own']], CUR, True)
    put(ws, rr, 15, f'=SUM(C{rr}:N{rr})', fmt=F_AMT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
    rr += 1
    own_p = rr
    mrow('자사 전년', [b for _, b in m['own']], PREV)
    put(ws, rr, 15, f'=SUMIF(C{own_c}:N{own_c},"<>",C{rr}:N{rr})', fmt=F_AMT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
    rr += 1
    mrow('자사 전년비', [yoy(f'{CL(3+i)}{own_c}', f'{CL(3+i)}{own_p}') for i in range(12)], None, fmt=F_PCT)
    # 누계 전년비: 전년 실적이 있는 달의 금년만 더해 비교
    put(ws, rr, 15, f'=IFERROR(IF(N(O{own_p})=0,"",SUMIFS(C{own_c}:N{own_c},C{own_p}:N{own_p},">0")/O{own_p}-1),"")', fmt=F_PCT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
    rr += 1
    shown = [c for c in m['comps'] if c['has']]
    for cp in shown:
        nm = re.sub(r'\s*\(동업계\d\)\s*$', '', str(cp['name'] or '동업계'))
        cc_ = rr
        mrow(f'{nm} 금년', [a for a, _ in cp['rows']], None)
        put(ws, rr, 15, f'=SUM(C{rr}:N{rr})', fmt=F_AMT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
        rr += 1
        cp_ = rr
        mrow(f'{nm} 전년', [b for _, b in cp['rows']], PREV)
        put(ws, rr, 15, f'=SUMIF(C{cc_}:N{cc_},"<>",C{rr}:N{rr})', fmt=F_AMT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
        rr += 1
        mrow(f'{nm} 전년비', [yoy(f'{CL(3+i)}{cc_}', f'{CL(3+i)}{cp_}') for i in range(12)], None, fmt=F_PCT)
        put(ws, rr, 15, yoy(f'O{cc_}', f'O{cp_}'), fmt=F_PCT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
        rr += 1
        mrow(f'{nm} 자사대비', [f'=IFERROR(IF(OR({CL(3+i)}{cc_}="",N({CL(3+i)}{own_c})=0),"",{CL(3+i)}{cc_}/{CL(3+i)}{own_c}),"")' for i in range(12)], None, fmt=F_PCT)
        put(ws, rr, 15, f'=IFERROR(O{cc_}/O{own_c},"")', fmt=F_PCT, h='right', bg=TOT, bold=True); merge(ws, rr, 15, rr, 16)
        rr += 1
    r = rr + 1

    # ── Block4: 시간대 (가로 전개)
    tb = d['tb']
    sec_title(ws, r, 1, 16, '■ 시간대별 매장매출')
    hdr(ws, r + 1, 1, '시간대')
    for i, (lab, _, _) in enumerate(tb[:14]):
        hdr(ws, r + 1, 2 + i, lab)
    hdr(ws, r + 1, 16, '합계')
    tc, tp, ty, ts = r + 2, r + 3, r + 4, r + 5
    put(ws, tc, 1, '금년', bold=True, bg=CUR); put(ws, tp, 1, '전년', bold=True, bg=PREV)
    put(ws, ty, 1, '전년비', bold=True); put(ws, ts, 1, '금년 구성비', bold=True, size=BASE - 0.5)
    n = min(14, len(tb))
    for i in range(n):
        c = 2 + i
        put(ws, tc, c, tb[i][1], fmt=F_AMT, h='right', bg=CUR)
        put(ws, tp, c, tb[i][2], fmt=F_AMT, h='right', bg=PREV)
        put(ws, ty, c, yoy(f'{CL(c)}{tc}', f'{CL(c)}{tp}'), fmt=F_PCT, h='right')
        put(ws, ts, c, f'=IFERROR({CL(c)}{tc}/$P${tc},"")', fmt=F_PCT, h='right')
    last_c = CL(1 + n)
    put(ws, tc, 16, f'=SUM(B{tc}:{last_c}{tc})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, tp, 16, f'=SUM(B{tp}:{last_c}{tp})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, ty, 16, yoy(f'P{tc}', f'P{tp}'), fmt=F_PCT, h='right', bg=TOT, bold=True)
    put(ws, ts, 16, f'=IFERROR(P{tc}/$P${tc},"")', fmt=F_PCT, h='right', bg=TOT, bold=True)
    r = ts + 2

    # ── Block5: 카테고리(A-F) | 브랜드 + 층별(H-P)
    b5 = r
    sec_title(ws, r, 1, 6, '■ 카테고리 실적 (대/중분류)')
    for j, t in enumerate(['대분류', '중분류', '금년', '전년', '전년비', '구성비']):
        hdr(ws, r + 1, 1 + j, t)
    c0 = r + 2
    _z = lambda v: v in (None, '', 0)
    cats = [c for c in d['cat'] if not (_z(c[2]) and _z(c[3]))] or d['cat']
    for i, (big, mid, cu, pv) in enumerate(cats):
        rr = c0 + i
        put(ws, rr, 1, big, bold=True)
        put(ws, rr, 2, mid, size=BASE - 0.5, shrink=True)
        put(ws, rr, 3, cu, fmt=F_AMT, h='right', bg=CUR)
        put(ws, rr, 4, pv, fmt=F_AMT, h='right', bg=PREV)
        put(ws, rr, 5, yoy(f'C{rr}', f'D{rr}'), fmt=F_PCT, h='right')
    cN = c0 + len(cats)
    put(ws, cN, 1, '합계', bold=True, bg=TOT); merge(ws, cN, 1, cN, 2)
    put(ws, cN, 3, f'=SUM(C{c0}:C{cN-1})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, cN, 4, f'=SUM(D{c0}:D{cN-1})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, cN, 5, yoy(f'C{cN}', f'D{cN}'), fmt=F_PCT, h='right', bg=TOT, bold=True)
    for rr in range(c0, cN + 1):
        put(ws, rr, 6, f'=IFERROR(IF(N(C{rr})=0,"",C{rr}/$C${cN}),"")', fmt=F_PCT, h='right', bg=TOT if rr == cN else None, bold=rr == cN)
    # 대분류 세로 병합
    i = 0
    while i < len(cats):
        j = i
        while j + 1 < len(cats) and cats[j + 1][0] == cats[i][0]:
            j += 1
        if j > i:
            merge(ws, c0 + i, 1, c0 + j, 1)
        i = j + 1
    # 브랜드
    sec_title(ws, r, 8, 16, '■ 매출 TOP5 브랜드 (신발 매장매출)')
    for j, t in enumerate(['순위', '브랜드', '금년 재고', '금년 실적', '금년 비중', '전년비', '전년 재고', '전년 실적', '전년 비중']):
        hdr(ws, r + 1, 8 + j, t)
    ws.row_dimensions[r + 1].height = 20
    b0 = r + 2
    for i, (rk, br, cs, csl, ps, psl) in enumerate(d['brand']):
        rr = b0 + i
        put(ws, rr, 8, rk, fmt='0')
        put(ws, rr, 9, br, bold=True, size=BASE - 0.5, shrink=True)
        put(ws, rr, 10, cs, fmt=F_INT, h='right', bg=CUR)
        put(ws, rr, 11, csl, fmt=F_AMT, h='right', bg=CUR, bold=True)
        put(ws, rr, 12, f'=IFERROR(K{rr}/$K${b0+5},"")', fmt=F_PCT, h='right', bg=CUR)
        put(ws, rr, 13, yoy(f'K{rr}', f'O{rr}'), fmt=F_PCT, h='right')
        put(ws, rr, 14, ps, fmt=F_INT, h='right', bg=PREV)
        put(ws, rr, 15, psl, fmt=F_AMT, h='right', bg=PREV)
        put(ws, rr, 16, f'=IFERROR(O{rr}/$O${b0+5},"")', fmt=F_PCT, h='right', bg=PREV)
    bt = b0 + 5
    put(ws, bt, 8, '신발 매장매출 합계', bold=True, bg=TOT, size=BASE - 0.5); merge(ws, bt, 8, bt, 10)
    put(ws, bt, 11, d['shoe_tot'][0], fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, bt, 12, f'=IFERROR(SUM(K{b0}:K{b0+4})/K{bt},"")', fmt=F_PCT, h='right', bg=TOT)
    put(ws, bt, 13, yoy(f'K{bt}', f'O{bt}'), fmt=F_PCT, h='right', bg=TOT, bold=True)
    put(ws, bt, 14, None, bg=TOT)
    put(ws, bt, 15, d['shoe_tot'][1], fmt=F_AMT, h='right', bg=TOT, bold=True)
    put(ws, bt, 16, f'=IFERROR(SUM(O{b0}:O{b0+4})/O{bt},"")', fmt=F_PCT, h='right', bg=TOT)
    # 층별
    fr = bt + 1
    fnote = '단층 매장은 영업 층만 입력'
    sec_title(ws, fr, 8, 16, '■ 층별 비중 · M-POS', fnote)
    for j, t in enumerate(['층', '금년 매출', '금년 비중', 'M-POS 매출', 'M-POS 비중', '전년 매출', '전년 비중', '전년비']):
        hdr(ws, fr + 1, 8 + j, t)
    hdr(ws, fr + 1, 16, '')
    ws.row_dimensions[fr + 1].height = 22
    f0 = fr + 2
    fl = [f for f in d['floor'] if not (_z(f[1]) and _z(f[2]) and _z(f[3]))] or d['floor']
    for i, (nm, cu, mp, pv) in enumerate(fl):
        rr = f0 + i
        put(ws, rr, 8, nm, bold=True, size=BASE - 0.5, shrink=True)
        put(ws, rr, 9, cu, fmt=F_AMT, h='right', bg=CUR)
        put(ws, rr, 11, mp, fmt=F_AMT, h='right', bg=YEL)
        put(ws, rr, 13, pv, fmt=F_AMT, h='right', bg=PREV)
    ft = f0 + len(fl)
    put(ws, ft, 8, '합계', bold=True, bg=TOT)
    for c, col in ((9, 'I'), (11, 'K'), (13, 'M')):
        put(ws, ft, c, f'=SUM({col}{f0}:{col}{ft-1})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    for rr in range(f0, ft + 1):
        tb_ = TOT if rr == ft else None
        put(ws, rr, 10, f'=IFERROR(I{rr}/$I${ft},"")', fmt=F_PCT, h='right', bg=tb_)
        put(ws, rr, 12, f'=IFERROR(IF(N(I{rr})=0,"",K{rr}/I{rr}),"")', fmt=F_PCT, h='right', bg=tb_)
        put(ws, rr, 14, f'=IFERROR(M{rr}/$M${ft},"")', fmt=F_PCT, h='right', bg=tb_)
        put(ws, rr, 15, yoy(f'I{rr}', f'M{rr}'), fmt=F_PCT, h='right', bg=tb_)
        put(ws, rr, 16, None, bg=tb_)
    r = max(cN, ft) + 2

    # ── 2페이지 구성: 1쪽 = 표, 2쪽 = 코멘트 (A4 가로, 두 쪽 같은 배율)
    tables_last = r - 2
    def est_h(r1, r2):
        t = 0.0
        for rr in range(r1, r2 + 1):
            hh = ws.row_dimensions[rr].height
            if hh is None:
                hh = 5 if all(ws.cell(rr, c).value in (None, '') for c in range(1, NCOL + 1)) else 12
            t += hh
        return t
    PAGE_W, PAGE_H = 842 - 2 * 0.25 * 72, 595 - 2 * 0.3 * 72 - 10
    W_pt = sum(WIDTHS) * 5.7
    scale = min(PAGE_W / W_pt, PAGE_H / est_h(1, tables_last), 1.0)
    pct = int(scale * 100)
    ws.row_breaks.append(Break(id=tables_last))
    r = tables_last + 1
    ws.row_dimensions[r].height = 5
    r += 1
    put(ws, r, 1, f"{d['title']}  —  베스트 상품 · 분석 코멘트 (2/2)", bold=True, size=12, h='left', border=False, color=NAVY)
    merge(ws, r, 1, r, 16)
    for cc in range(1, 17):
        ws.cell(r, cc).border = Border()
    ws.row_dimensions[r].height = 20
    r += 1
    p2_top = r
    # ── Block6: TOP5 상품 금년(A-H) | 전년(I-P)
    sec_title(ws, r, 1, 16, '■ ' + d['prod_title'])
    for side, (rows, c0_, bg, lab) in enumerate(((d['prod_cur'], 1, CUR, '금년'), (d['prod_prev'], 9, PREV, '전년'))):
        heads = [(f'{lab}', 1), ('브랜드', 1), ('상품명', 2), ('스타일 / 컬러', 2), ('수량', 1), ('실매출', 1)]
        cc = c0_
        for t, sp in heads:
            hdr(ws, r + 1, cc, t, span=sp)
            cc += sp
        for i, row in enumerate(rows):
            rr = r + 2 + i
            rk, br, sty, nm, col, q, s_ = row
            put(ws, rr, c0_, rk, fmt='0', bg=bg, bold=True)
            put(ws, rr, c0_ + 1, br, size=BASE - 1, shrink=True)
            put(ws, rr, c0_ + 2, nm, size=BASE - 1, h='left', wrap=True); merge(ws, rr, c0_ + 2, rr, c0_ + 3)
            sc = ' / '.join(str(x) for x in (sty, col) if x not in (None, ''))
            put(ws, rr, c0_ + 4, sc, size=BASE - 2, h='left', wrap=True); merge(ws, rr, c0_ + 4, rr, c0_ + 5)
            put(ws, rr, c0_ + 6, q, fmt=F_INT, h='right')
            put(ws, rr, c0_ + 7, s_, fmt=F_AMT, h='right', bold=True)
        rr = r + 7
        put(ws, rr, c0_, '소계', bold=True, bg=TOT); merge(ws, rr, c0_, rr, c0_ + 5)
        put(ws, rr, c0_ + 6, f'=SUM({CL(c0_+6)}{r+2}:{CL(c0_+6)}{r+6})', fmt=F_INT, h='right', bg=TOT, bold=True)
        put(ws, rr, c0_ + 7, f'=SUM({CL(c0_+7)}{r+2}:{CL(c0_+7)}{r+6})', fmt=F_AMT, h='right', bg=TOT, bold=True)
    for i in range(5):
        ws.row_dimensions[r + 2 + i].height = 20
    r = r + 9

    p2_used = est_h(p2_top, r - 1)
    sec_title(ws, r, 1, 16, '■ ' + d['cmt_title'])
    ws.row_dimensions[r].height = 15
    r += 1
    glist = [(g, lines) for g, lines in d['cmt'] if lines]
    half_units = sum(WIDTHS[0:8])
    # 표 쪽 배율과 코멘트 글자 크기를 함께 정함: 두 쪽 모두 한 장에 들어가면서 실제 인쇄 글자가 가장 크게
    pre2 = est_h(tables_last + 1, r - 1) + 6
    best_score = None
    for CS_ in (11.0, 10.5, 10.0, 9.5, 9.0, 8.5, 8.0, 7.5):
        lh_ = round(CS_ * 1.5, 1)
        nd_ = [max(2, n_lines(['■ ' + g] + lines, half_units, CS_) + 1) for g, lines in glist]
        if len(glist) >= 2:
            bk_ = min(range(1, len(glist)), key=lambda k: max(sum(nd_[:k]), sum(nd_[k:])))
        else:
            bk_ = len(glist)
        N2 = max(sum(nd_[:bk_]), sum(nd_[bk_:]), 1)
        sc_ = min(scale, PAGE_H / (pre2 + N2 * lh_))
        score = min(BASE, CS_) * sc_
        if best_score is None or score > best_score + 1e-9:
            best_score, CS, line_h, needs, best, pct = score, CS_, lh_, nd_, bk_, int(sc_ * 100)
    d['_cs'] = CS
    sides = [(glist[:best], needs[:best], 1, 1, 8), (glist[best:], needs[best:], 9, 9, 16)]
    N = max(sum(needs[:best]), sum(needs[best:]), 1)
    for items, nd, c_lab, c_t1, c_t2 in sides:
        cur = r
        for i, ((g, lines), n_) in enumerate(zip(items, nd)):
            span = (r + N - cur) if i == len(items) - 1 else n_
            c_ = put(ws, cur, c_t1, '\n'.join(['■ ' + g] + lines), h='left', v_='top', wrap=True, size=CS)
            try:
                from openpyxl.cell.rich_text import CellRichText, TextBlock
                from openpyxl.cell.text import InlineFont
                c_.value = CellRichText(TextBlock(InlineFont(rFont=FONT, sz=CS, b=True, color=NAVY), '■ ' + g + '\n'),
                                        TextBlock(InlineFont(rFont=FONT, sz=CS), '\n'.join(lines)))
            except Exception:
                pass
            merge(ws, cur, c_t1, cur + span - 1, c_t2)
            cur += span
    for i in range(N):
        ws.row_dimensions[r + i].height = line_h
    r += N
    last = r - 1

    # 기본 행높이
    for rr in range(2, last + 1):
        empty = all(ws.cell(rr, c).value in (None, '') for c in range(1, NCOL + 1)) and not any(
            rr in range(m.min_row, m.max_row + 1) for m in ws.merged_cells.ranges if m.min_row < rr)
        if empty:
            ws.row_dimensions[rr].height = 5
        elif ws.row_dimensions[rr].height is None:
            ws.row_dimensions[rr].height = 12
    # 인쇄 설정: A4 가로 2쪽(앞: 표 / 뒤: 코멘트), 두 쪽 같은 배율
    ws.print_area = f'A1:P{last}'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'landscape'
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=False)
    ws.page_setup.scale = pct
    ws.page_margins.left = ws.page_margins.right = 0.25
    ws.page_margins.top = 0.3
    ws.page_margins.bottom = 0.3
    ws.page_margins.header = ws.page_margins.footer = 0.1
    ws.print_options.horizontalCentered = True
    d['_pct'] = pct
    ws.freeze_panes = None
    return last


def summary_print(ws):
    last = max(r for r in range(1, ws.max_row + 1) if any(ws.cell(r, c).value not in (None, '') for c in range(1, 18)))
    lastc = max(c for c in range(1, 30) if any(ws.cell(r, c).value not in (None, '') for r in range(1, last + 1)))
    ws.print_area = f'A1:{CL(lastc)}{last}'
    # 글이 긴 칸(신호·할 일 등)은 줄바꿈 + 행 높이 자동 산정
    merged_rows = set()
    for m in ws.merged_cells.ranges:
        if m.max_col - m.min_col >= 3:
            merged_rows.update(range(m.min_row, m.max_row + 1))
    for r in range(1, last + 1):
        if r in merged_rows:
            continue
        need = 1
        for c in range(1, lastc + 1):
            v = ws.cell(r, c).value
            nxt = ws.cell(r, c + 1).value if c < lastc else 'x'
            if isinstance(v, str) and not v.startswith('=') and (nxt not in (None, '') or c == lastc):
                w = ws.column_dimensions[CL(c)].width or 8.43
                sz = ws.cell(r, c).font.sz or 10
                n = n_lines(v.split('\n'), w, sz)
                if n > 1:
                    al = ws.cell(r, c).alignment
                    ws.cell(r, c).alignment = Alignment(horizontal=al.horizontal, vertical='center', wrap_text=True)
                need = max(need, n)
        if need > 1:
            sz = 10
            ws.row_dimensions[r].height = max(ws.row_dimensions[r].height or 15, need * 12.5 + 3)
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'landscape'
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_margins.left = ws.page_margins.right = 0.25
    ws.page_margins.top = ws.page_margins.bottom = 0.3
    ws.print_options.horizontalCentered = True


# ---------------- 전년비 제외(신규 오픈·리뉴얼) ----------------
def load_mask(maskf):
    if not maskf:
        return None
    import json
    M = json.load(open(maskf, encoding='utf-8'))
    dates = M.get('dates', {})
    def why(s):
        op, rn = dates.get(s, [None, None])
        if op and op >= '2025-01-01': return '신규 오픈'
        if rn and rn >= '2025-01-01': return '리뉴얼'
        return '전년 실적 없음'
    return M['valid'], why


def apply_mask(d, store, MK):
    """전년 실적이 없거나 MASTER 기준 제외 달 → 전년 값 비움"""
    if not MK or store not in MK[0]:
        return set()
    valid, why = MK
    mt = re.search(r'(\d{4})년\s*(\d+)월', str(d.get('title') or ''))
    year = int(mt.group(1)) if mt else 2026
    rm = int(mt.group(2)) if mt else None
    own = d['monthly']['own']
    bad = set()
    for i, (cy, py) in enumerate(own):
        key = f'{year}-{i+1:02d}'
        if cy in (None, ''):
            continue
        if not isinstance(py, (int, float)) or py == 0:
            bad.add(i + 1)              # 전년 실적 없음(빈칸·0·'리뉴얼폐점' 등 글자) → 글자는 그대로 둠
            if not isinstance(py, str): own[i] = (cy, None)
        elif not valid[store].get(key, True):
            bad.add(i + 1)
            own[i] = (cy, None)
    if bad:
        ms = sorted(bad)
        d['_yx_note'] = f"전년비는 전년 실적이 있는 달만 비교(제외: {'·'.join(map(str, ms))}월, {why(store)})"
    if rm in bad:
        d['kpi_prev'] = [d['kpi_prev'][0]] + [None] * (len(d['kpi_prev']) - 1)
        d['tb'] = [(a, b, None) for a, b, _ in d['tb']]
        d['cat'] = [(a, b, c, None) for a, b, c, _ in d['cat']]
        d['brand'] = [(a, b, c, e, None, None) for a, b, c, e, _, _ in d['brand']]
        d['shoe_tot'] = (d['shoe_tot'][0], None)
        d['floor'] = [(a, b, c, None) for a, b, c, _ in d['floor']]
    return {rm} & bad and rm


def fix_summary(ws, MK, ex):
    """요약 시트: 제외 매장은 전년 비우고 '제외', 지역 전년비는 비교 가능 매장끼리"""
    rows = {}
    for r in range(1, ws.max_row + 1):
        v = ws.cell(r, 1).value
        if isinstance(v, str):
            rows[v.strip()] = r
    if '대경지역' not in rows:
        return
    st = [n for n in rows if n in MK[0]]
    if not st:
        return
    r0 = rows['대경지역']; r1, r2 = min(rows[n] for n in st), max(rows[n] for n in st)
    for n, why in ex.items():
        r = rows.get(n)
        if r:
            ws.cell(r, 3).value = None
            ws.cell(r, 4).value = f'제외({why})'
    ws.cell(r0, 3).value = f'=SUM(C{r1}:C{r2})'
    ws.cell(r0, 4).value = f'=IFERROR((B{r0}-SUMIFS(B{r1}:B{r2},C{r1}:C{r2},""))/C{r0}-1,"")'
    if ex:
        note = '※ 전년비는 전년 실적이 있는 매장끼리 비교(제외: ' + ', '.join(f'{n} {w}' for n, w in ex.items()) + ') · 실적합계는 전체 포함'
        c = ws.cell(r0 - 2 if r0 > 3 else r0 + 0, 1)
        if c.value in (None, ''):
            c.value = note
        else:
            c.value = str(c.value) + '\n' + note
            c.alignment = Alignment(wrap_text=True, vertical='top', horizontal='left')


def main(src, dst, maskf=None):
    MK = load_mask(maskf)
    wv = openpyxl.load_workbook(src, data_only=True)
    wf = openpyxl.load_workbook(src)
    names = wf.sheetnames
    def is_store(ws):
        return any(ws.cell(r, 1).value == '■ 기본 정보' for r in range(1, 12))
    suffix = None
    for name in names:
        v = wf[name]['A1'].value
        if isinstance(v, str) and '·' in v and '관리 지표' in v:
            suffix = v.split('·', 1)[1].strip()
            break
    ex = {}
    summ = []
    for idx, name in enumerate(names):
        ws_old = wf[name]
        if not is_store(ws_old):
            summ.append(ws_old)
            continue
        d = extract(wv[name], ws_old)
        if apply_mask(d, name, MK):
            ex[name] = MK[1](name)
        if not d['title']:
            d['title'] = f'{name} · {suffix}' if suffix else name
            print(f'  ※ {name}: 제목 누락 → 자동 보완')
        tab = ws_old.sheet_properties.tabColor
        wf.remove(ws_old)
        ws = wf.create_sheet(name, idx)
        if tab is not None:
            ws.sheet_properties.tabColor = tab
        last = build(ws, d)
        print(f"{name}: {last}행 · 배율 {d['_pct']}% · 코멘트 {d['_cs']}pt")
    for ws in summ:
        if MK:
            fix_summary(ws, MK, ex)
        summary_print(ws)
    wf.active = 0
    wf.save(dst)


if __name__ == '__main__':
    # 사용: python3 kpi_onepage.py 원본.xlsx 출력.xlsx [yoy_mask.json]
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
