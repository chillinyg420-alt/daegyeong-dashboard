# -*- coding: utf-8 -*-
"""전년비 계산 대상(매장·월)만 남기도록 대시보드 자료를 고친다.
사용: python3 yoy_apply.py 원본자료.json yoy_mask.json 출력.json

규칙
- 계산 대상 = yoy_mask.json에서 True(MASTER 오픈·리뉴얼 기준) 이면서 전년 같은 달 실적합계 > 0
- 실적(금년)은 그대로 둔다. 대상이 아닌 매장·월은 전년 값을 비운다(None).
- 묶음(대경지역, 누계)은 전년 값을 '대상 매장·월'만 더한 값으로 바꾸고,
  전년비 계산용 금년 값(대상만 더한 값)을 따로 넣는다.
    kpi·ins : m_<항목> / m{...}
    분류·브랜드 행 : 5번째 값
    시간대 : m[]
    미분류 재고통합(miss) : 3번째 값
"""
import json, sys

F = ['tot', 'off', 'int', 'norm', 'prof', 'buy', 'cnt', 'vis']
REASON = {'open': '신규 오픈', 'renew': '리뉴얼', 'nopy': '전년 같은 달 실적 없음'}


def nz(x):
    return x or 0


def main(src, maskf, out):
    D = json.load(open(src, encoding='utf-8'))
    MJ = json.load(open(maskf, encoding='utf-8')); MK = MJ['valid']; DT = MJ.get('dates', {})
    ST = D['meta']['stores']
    MS = [p for p in D['meta']['periods'] if not p.startswith('누계')]
    YTD = [p for p in D['meta']['periods'] if p.startswith('누계')][0]
    K = D['kpi']

    # ---------- 1. 계산 대상 표
    V, why = {}, {}
    for s in ST:
        for i, m in enumerate(MS, 1):
            ok = MK[s][f'2026-{i:02d}']
            op, rn = DT.get(s, [None, None])
            if not ok or not K[m][s].get('py_tot'):
                if op and op >= '2025-01-01': why[(s, m)] = 'open'
                elif rn and rn >= '2025-01-01': why[(s, m)] = 'renew'
                else: why[(s, m)] = 'nopy'
                ok = False
            V[(s, m)] = ok
    INV = [(s, m) for (s, m), ok in V.items() if not ok]
    invm = {m: [s for s in ST if not V[(s, m)]] for m in MS}
    invs = {s: [m for m in MS if not V[(s, m)]] for s in ST}

    # ---------- 2. kpi
    def fix_kpi(e, parts, all_out):
        """e: 묶음 항목, parts: 빼야 할 (원본 매장·월 항목) 목록, all_out: 전부 빠지면 True"""
        if not parts: return
        for f in F:
            cy, py = 'cy_' + f, 'py_' + f
            if cy not in e: continue
            if all_out:
                e[py] = None; continue
            e[py] = nz(e.get(py)) - sum(nz(p.get(py)) for p in parts)
            e['m_' + f] = nz(e.get(cy)) - sum(nz(p.get(cy)) for p in parts)

    orig = json.loads(json.dumps(K))
    for s in ST:  # 매장 누계
        fix_kpi(K[YTD][s], [orig[m][s] for m in invs[s]], len(invs[s]) == len(MS))
    fix_kpi(K[YTD]['대경지역'], [orig[m][s] for (s, m) in INV], False)
    for m in MS:
        fix_kpi(K[m]['대경지역'], [orig[m][s] for s in invm[m]], False)
        for s in invm[m]:
            for f in F:
                if 'py_' + f in K[m][s]: K[m][s]['py_' + f] = None

    # ---------- 3. 인시(ins)
    I = D['ins']; oi = json.loads(json.dumps(I))
    def fix_ins(e, parts, all_out):
        if not parts: return
        if all_out:
            e['py'] = {k: None for k in e['py']}; return
        e['py'] = {k: nz(e['py'].get(k)) - sum(nz(p['py'].get(k)) for p in parts) for k in e['py']}
        e['m'] = {k: nz(e['cy'].get(k)) - sum(nz(p['cy'].get(k)) for p in parts) for k in e['cy']}
    for s in ST:
        fix_ins(I[YTD][s], [oi[m][s] for m in invs[s]], len(invs[s]) == len(MS))
    fix_ins(I[YTD]['대경지역'], [oi[m][s] for (s, m) in INV], False)
    for m in MS:
        fix_ins(I[m]['대경지역'], [oi[m][s] for s in invm[m]], False)
        for s in invm[m]:
            I[m][s]['py'] = {k: None for k in I[m][s]['py']}

    # ---------- 4. 월별 추이(trend): 그래프용 — 전년 값만 정리
    for b, T in D['trend'].items():
        ot = json.loads(json.dumps(T))
        for i, m in enumerate(MS):
            for s in invm[m]:
                T[s]['py'][i] = None
            if invm[m]:
                T['대경지역']['py'][i] = nz(ot['대경지역']['py'][i]) - sum(nz(ot[s]['py'][i]) for s in invm[m])
        # 비교용 금년(대상만): 대경지역만
        T['대경지역']['m'] = [nz(ot['대경지역']['cy'][i]) - sum(nz(ot[s]['cy'][i]) for s in invm[m]) for i, m in enumerate(MS)]

    # ---------- 5. 분류·브랜드 행 [금년, 전년, 재고, 전년재고, (비교용 금년)]
    def fix_rows(node):
        for b, PD in node['data'].items():
            O = json.loads(json.dumps(PD))
            def sub(rows, parts, all_out):
                if not parts: return
                for j, r in enumerate(rows):
                    if r is None: continue
                    if all_out:
                        r[1] = None; continue
                    c = nz(r[0]) - sum(nz(p[j][0]) for p in parts if p and p[j])
                    r[1] = nz(r[1]) - sum(nz(p[j][1]) for p in parts if p and p[j])
                    while len(r) < 4: r.append(None)
                    r[4:] = [c]
            for s in ST:
                if s in PD[YTD]:
                    sub(PD[YTD][s], [O[m].get(s) for m in invs[s]], len(invs[s]) == len(MS))
            sub(PD[YTD]['대경지역'], [O[m].get(s) for (s, m) in INV], False)
            for m in MS:
                sub(PD[m]['대경지역'], [O[m].get(s) for s in invm[m]], False)
                for s in invm[m]:
                    for r in PD[m].get(s) or []:
                        if r is not None: r[1] = None
    fix_rows(D['bun']); fix_rows(D['brd'])

    # ---------- 6. 미분류 재고통합(miss) [금년, 전년, (비교용 금년)]
    MI = D['miss']; om = json.loads(json.dumps(MI))
    def fix_miss(e, parts, all_out):
        if not parts: return
        if all_out: e[1] = None; return
        c = nz(e[0]) - sum(nz(p[0]) for p in parts); e[1] = nz(e[1]) - sum(nz(p[1]) for p in parts); e[2:] = [c]
    for s in ST:
        fix_miss(MI[YTD][s], [om[m][s] for m in invs[s]], len(invs[s]) == len(MS))
    fix_miss(MI[YTD]['대경지역'], [om[m][s] for (s, m) in INV], False)
    for m in MS:
        fix_miss(MI[m]['대경지역'], [om[m][s] for s in invm[m]], False)
        for s in invm[m]: MI[m][s][1] = None

    # ---------- 7. 시간대(tz) {cy[], py[], cday, pday, (m[])}
    TZ = D['tz']['months']; oz = json.loads(json.dumps(TZ))
    def fix_tz(e, parts, all_out):
        if not parts: return
        if all_out:
            e['py'] = [0] * len(e['py']); e['pday'] = 0; return
        e['py'] = [nz(v) - sum(nz(p['py'][i]) for p in parts) for i, v in enumerate(e['py'])]
        e['pday'] = nz(e.get('pday')) - sum(nz(p.get('pday')) for p in parts)
        e['m'] = [nz(v) - sum(nz(p['cy'][i]) for p in parts) for i, v in enumerate(e['cy'])]
    for s in ST:
        if s in TZ[YTD]:
            fix_tz(TZ[YTD][s], [oz[m][s] for m in invs[s] if s in oz[m]], len(invs[s]) == len(MS))
    fix_tz(TZ[YTD]['대경지역'], [oz[m][s] for (s, m) in INV if s in oz[m]], False)
    for m in MS:
        fix_tz(TZ[m]['대경지역'], [oz[m][s] for s in invm[m] if s in oz[m]], False)
        for s in invm[m]:
            if s in TZ[m]: TZ[m][s]['py'] = [0] * len(TZ[m][s]['py']); TZ[m][s]['pday'] = 0

    # ---------- 8. 화면 안내용 목록
    ex = {}
    for (s, m) in INV:
        ex.setdefault(s, {}).setdefault(why[(s, m)], []).append(int(m[:-1]))
    D['meta']['yoyEx'] = [[s, REASON[r], ms] for s in ST if s in ex for r, ms in ex[s].items()]
    D['meta']['yoyRule'] = '전년비는 전년 같은 달 실적이 있는 매장·월끼리만 비교합니다(신규 오픈·리뉴얼 달 제외). 실적은 전부 표시합니다.'
    json.dump(D, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for r in D['meta']['yoyEx']: print(r)
    return D


if __name__ == '__main__':
    main(*sys.argv[1:4])
