# -*- coding: utf-8 -*-
"""브리핑·재고 분석 문장(adv)을 다시 만든다.
사용: python3 adv_text.py 자료.json(yoy_apply.py 결과) 출력.json

- 전년비는 전년 실적이 있는 매장·월끼리만 비교(yoy_apply.py와 같은 기준).
- 문장에서 빼는 작은 항목: 매출 비중과 재고 비중이 모두 1% 미만인 분류·브랜드 (화면 흐림 기준 2%와 별개).
- 명절 설명·상권 머리말은 이전 문장에서 그대로 가져온다(사실 기록).
"""
import json, sys, math, re

TXT_MIN = 0.01          # 문장 제외 기준
OUT_GOOD = dict(ach=1.05, yoy=0.15, cv=0.025, buy=0.20)
OUT_BAD = dict(ach=0.85, yoy=-0.15, cv=-0.025, buy=-0.20, disc=0.03)


# ---------------- 숫자 표기
def eok(v):
    if v is None: return '-'
    return f'{v/1e8:.2f}억' if abs(v) >= 1e8 else f'{round(v/1e4):,}만'
def pc(v, d=1): return '-' if v is None else f'{v*100:.{d}f}%'
def ps(v, d=1): return '-' if v is None else f'{v*100:+.{d}f}%'
def pp(v): return '-' if v is None else f'{v*100:+.1f}%p'
def n0(v): return '-' if v is None else f'{round(v):,}'
def dv(a, b): return a / b - 1 if (a is not None and b) else None
def sd(a, b): return a / b if (a is not None and b) else None
def nz(x): return x or 0


def main(src, out):
    D = json.load(open(src, encoding='utf-8'))
    ST = D['meta']['stores']; MS = [p for p in D['meta']['periods'] if not p.startswith('누계')]
    K = D['kpi']; I = D['ins']; A = D['adv']['months']
    EX = {}
    for s, why, ms in D['meta'].get('yoyEx', []):
        for m in ms: EX[(s, f'{m}월')] = why
    valid = lambda s, m: (s, m) not in EX

    def yc(k, f):
        return k.get('m_' + f) if k.get('m_' + f) is not None else k.get('cy_' + f)

    def met(m, g):
        k, i = K[m][g], I[m][g]; im = i.get('m') or i['cy']
        r = dict(tot=k['cy_tot'], ptot=k.get('py_tot'), yoy=dv(yc(k, 'tot'), k.get('py_tot')),
                 ach=sd(k['cy_tot'], k.get('target')), cv=sd(k.get('cy_buy'), k.get('cy_vis')),
                 pcv=sd(k.get('py_buy'), k.get('py_vis')), atv=sd(k['cy_tot'], k.get('cy_cnt')),
                 patv=sd(k.get('py_tot'), k.get('py_cnt')), disc=(1 - k['cy_tot'] / k['cy_norm']) if k.get('cy_norm') else None,
                 pdisc=(1 - k['py_tot'] / k['py_norm']) if k.get('py_norm') and k.get('py_tot') is not None else None,
                 ip=sd(i['cy']['tot'], i['cy']['h']), pip=sd(i['py'].get('tot'), i['py'].get('h')))
        r['ipy'] = dv(sd(im['tot'], im['h']), r['pip'])
        r['buyy'] = dv(yc(k, 'buy'), k.get('py_buy'))
        r['visy'] = dv(yc(k, 'vis'), k.get('py_vis'))
        r['cnty'] = dv(yc(k, 'cnt'), k.get('py_cnt'))
        r['atvOff'] = sd(k.get('cy_off'), k.get('cy_buy')); r['patvOff'] = sd(k.get('py_off'), k.get('py_buy'))
        r['offy'] = dv(yc(k, 'off'), k.get('py_off'))
        r['inty'] = dv(yc(k, 'int'), k.get('py_int')) if nz(k.get('py_int')) >= 0.03 * nz(k.get('py_tot')) else None
        return r

    def mm(r):  # 화면 카드용
        return {k: (round(v, 6) if isinstance(v, float) else v) for k, v in r.items()
                if k in ('tot', 'ptot', 'yoy', 'ach', 'cv', 'pcv', 'atv', 'patv', 'disc', 'pdisc', 'ip', 'pip', 'ipy')}

    def decomp(cur, prev, f1c, f1p):
        """매출 = 고객수 × 객단가 → (증감, 고객수 효과, 객단가 효과)"""
        if not (cur and prev and f1c and f1p): return None
        T = math.log(cur / prev); Dd = cur - prev
        if abs(T) < 1e-9: return (Dd, 0, 0)
        e1 = Dd * math.log(f1c / f1p) / T
        return (Dd, e1, Dd - e1)

    def small(r, Ts, Tk):
        x = (nz(r[1]) / Ts) if Ts else 0; y = (nz(r[4]) / Tk) if Tk else 0
        return x < TXT_MIN and y < TXT_MIN

    old = json.loads(json.dumps(A))
    first_hol = {}
    for m in MS:
        for x in old[m]['brief'].get('verified', []):
            if '명절' in x or '연휴' in x: first_hol[m] = x; break
    typ = {s: old[MS[-1]]['todo'][s]['status'].get('typ') for s in ST}
    clu = {s: old[MS[-1]]['todo'][s]['status'].get('cluster') for s in ST}
    WHY = {'신규 오픈': '신규 오픈 매장이라 전년 같은 달 실적이 없어', '리뉴얼': '전년 같은 달이 리뉴얼 공사 기간이라',
           '전년 같은 달 실적 없음': '전년 같은 달 실적이 없어'}

    for mi, m in enumerate(MS):
        M = A[m]; mon = int(m[:-1])
        Rg = met(m, '대경지역')
        SM = {s: met(m, s) for s in ST}
        inv_st = [s for s in ST if not valid(s, m)]

        # ---- 주차: 매장 무효달은 전년 비움, 지역은 대상 매장끼리
        for s in ST:
            for w in M['sbrief'][s]['weeks']:
                if not valid(s, m): w[3] = None; w[4] = None
            M['todo'][s]['weeks'] = M['sbrief'][s]['weeks']
        ow = old[m]['brief']['weeks']
        for j, w in enumerate(M['brief']['weeks']):
            c = nz(ow[j][2]) - sum(nz(old[m]['sbrief'][s]['weeks'][j][2]) for s in inv_st if j < len(old[m]['sbrief'][s]['weeks']))
            p = nz(ow[j][3]) - sum(nz(old[m]['sbrief'][s]['weeks'][j][3]) for s in inv_st if j < len(old[m]['sbrief'][s]['weeks']))
            w[4] = round(dv(c, p), 6) if p else None

        # ---- 재고·상세: 무효달은 전년 비움, 지역은 대상 매장끼리 비교값 추가
        for s in inv_st:
            for key in ('brand', 'mid'):
                for r in M['detail'][s][key]: r[3] = 0; r[5] = 0
            t = M['inv'][s]['total']; t[1] = None; t[3] = None
            for r in M['inv'][s]['big']: r[2] = None; r[4] = None
        for r in M['check']:
            if not valid(r[0], m): r[5] = None; r[7] = None
        od = old[m]['detail']
        for key in ('brand', 'mid'):
            for r in M['detail']['대경지역'][key]:
                sub = [x for s in inv_st for x in od[s][key] if x[0] == r[0]]
                if sub:
                    r[3] = nz(r[3]) - sum(nz(x[3]) for x in sub); r[5] = nz(r[5]) - sum(nz(x[5]) for x in sub)
                    r[8:] = [nz(r[2]) - sum(nz(x[2]) for x in sub), nz(r[4]) - sum(nz(x[4]) for x in sub)]
        oi = old[m]['inv']
        if inv_st:
            t = M['inv']['대경지역']['total']; ot = oi['대경지역']['total']
            t[1] = nz(ot[1]) - sum(nz(oi[s]['total'][1]) for s in inv_st); t[3] = nz(ot[3]) - sum(nz(oi[s]['total'][3]) for s in inv_st)
            t[5:] = [nz(ot[0]) - sum(nz(oi[s]['total'][0]) for s in inv_st), nz(ot[2]) - sum(nz(oi[s]['total'][2]) for s in inv_st)]
            for r in M['inv']['대경지역']['big']:
                sub = [x for s in inv_st for x in oi[s]['big'] if x[0] == r[0]]
                r[2] = nz(r[2]) - sum(nz(x[2]) for x in sub); r[4] = nz(r[4]) - sum(nz(x[4]) for x in sub)
                r[6:] = [nz(r[1]) - sum(nz(x[1]) for x in sub), nz(r[3]) - sum(nz(x[3]) for x in sub)]

        def invline(g):
            t = M['inv'][g]['total']; st = t[5] if len(t) > 5 else t[0]; q = t[6] if len(t) > 6 else t[2]
            return t, dv(st, t[1]), dv(q, t[3])

        # ---- 매장별 문장
        for s in ST:
            r = SM[s]; ok = valid(s, m); k = K[m][s]; why = EX.get((s, m))
            cum_c = sum(nz(K[x][s]['cy_tot']) for x in MS[:mi + 1]); cum_t = sum(nz(K[x][s].get('target')) for x in MS[:mi + 1])
            same = [SM[x]['ach'] for x in ST if typ[x] == typ[s] and SM[x]['ach'] is not None]
            avg = sum(same) / len(same) if same else None
            tags = []
            if r['ach'] is not None:
                if r['ach'] >= OUT_GOOD['ach']: tags.append(['good', f"달성률 {pc(r['ach'])}"])
                elif r['ach'] < OUT_BAD['ach']: tags.append(['bad', f"달성률 {pc(r['ach'])}"])
            if ok:
                if r['yoy'] is not None and r['yoy'] >= OUT_GOOD['yoy']: tags.append(['good', f"전년비 {ps(r['yoy'])}"])
                elif r['yoy'] is not None and r['yoy'] <= OUT_BAD['yoy']: tags.append(['bad', f"전년비 {ps(r['yoy'])}"])
                if r['cv'] is not None and r['pcv'] is not None:
                    d = r['cv'] - r['pcv']
                    if d >= OUT_GOOD['cv']: tags.append(['good', f'전환율 {pp(d)}'])
                    elif d <= OUT_BAD['cv']: tags.append(['bad', f'전환율 {pp(d)}'])
                if r['buyy'] is not None:
                    if r['buyy'] >= OUT_GOOD['buy']: tags.append(['good', f"구매고객 {ps(r['buyy'], 0)}"])
                    elif r['buyy'] <= OUT_BAD['buy']: tags.append(['bad', f"구매고객 {ps(r['buyy'], 0)}"])
                if r['disc'] is not None and r['pdisc'] is not None and r['disc'] - r['pdisc'] >= OUT_BAD['disc']:
                    tags.append(['bad', f"할인율 {pp(r['disc'] - r['pdisc'])}"])
            wk = [w for w in M['sbrief'][s]['weeks'] if w[4] is not None]
            ch = [f"실적합계 {eok(r['tot'])} " + (f"전년비 {ps(r['yoy'])}" if ok else f"전년비 제외({why})") +
                  f" (지역 전체 {ps(Rg['yoy'])}) · 목표 달성률 {pc(r['ach'])} (지역 {pc(Rg['ach'])})",
                  f"유사 매장({typ[s]}) 평균보다 달성률 {pp(r['ach'] - avg) if (r['ach'] is not None and avg is not None) else '-'} · 누계(1~{mon}월) 달성률 {pc(sd(cum_c, cum_t))}"]
            if ok and len(wk) >= 2:
                b = max(wk, key=lambda w: w[4]); l = min(wk, key=lambda w: w[4])
                ch.append(f"주차별로 가장 좋았던 구간 {b[0]}({b[1]}) {ps(b[4])}, 가장 약했던 구간 {l[0]}({l[1]}) {ps(l[4])} (매장매출, 전년 같은 요일 대비)")
            # 해석 문장
            pre = ''
            o0 = (old[m]['sbrief'][s].get('ai') or [''])[0]
            mt = re.match(r'^(\[[^\]]+\][^\n]*?)(?=\s*\d+월 실적합계)', o0)
            if mt: pre = mt.group(1).strip() + ' '
            if ok:
                dd = decomp(yc(k, 'off'), k.get('py_off'), yc(k, 'buy'), k.get('py_buy'))
                main_ = '고객 수' if dd and abs(dd[1]) >= abs(dd[2]) else '객단가'
                ai = (f"{pre}{m} 실적합계 {eok(r['tot'])}(전년비 {ps(r['yoy'])}), 목표 달성률 {pc(r['ach'])}. "
                      f"구매 고객 {ps(r['buyy'], 0)}·객단가 {ps(dv(r['atvOff'], r['patvOff']), 0)}로 {main_} 변화가 실적을 좌우했습니다.")
                if m in first_hol: ai += (' 전년 추석이 10월이라 전년비는 보수적으로 보세요.' if m == '10월' else
                                          ' 명절 위치가 달라 전년비 해석에 주의하세요.')
            else:
                dd = None
                ai = f"{pre}{m} 실적합계 {eok(r['tot'])}, 목표 달성률 {pc(r['ach'])}. {WHY.get(why, '')} 전년비는 계산하지 않고 목표 대비 흐름 위주로 판단합니다."
            # 순위
            yv = sorted([x for x in ST if valid(x, m) and SM[x]['yoy'] is not None], key=lambda x: -SM[x]['yoy'])
            av = sorted([x for x in ST if SM[x]['ach'] is not None], key=lambda x: -SM[x]['ach'])
            iv = sorted([x for x in ST if SM[x]['ip'] is not None], key=lambda x: -SM[x]['ip'])
            rk = lambda L: f'{L.index(s) + 1}위/{len(L)}' if s in L else '제외'
            t, sty, qy = invline(s)
            hl = M['inv'][s]['health']; ht = sum(hl.values()) or 1
            ins = [f"지역 {len(ST)}개 점 중 전년비 {rk(yv)} · 달성률 {rk(av)} · 인시생산성 {rk(iv)}",
                   f"객단가(합계) {n0(r['atv'])}원 ({ps(dv(r['atv'], r['patv'])) if ok else '전년 비교 제외'}) · 오프라인 {n0(r['atvOff'])}원",
                   f"{m} 말 재고 {n0(t[0])}개" + (f" (전년 {ps(sty)})" if ok and sty is not None else '') +
                   f" · 재고주수 {t[4] if t[4] is not None else '-'}주 · 과다 스타일 비중 {pc(hl.get('과다', 0) / ht, 0)}"]
            # 확인된 사실 / 점검 가설
            ver = []
            if m in first_hol: ver.append(first_hol[m])
            if ok and dd:
                if abs(dd[1]) >= abs(dd[2]): ver.append(f"매장매출 변화({eok(dd[0])})에서 가장 큰 요소: 구매 고객 수 {ps(r['buyy'], 0)} (금액 효과 {eok(dd[1])})")
                else: ver.append(f"매장매출 변화({eok(dd[0])})에서 가장 큰 요소: 객단가 {ps(dv(r['atvOff'], r['patvOff']), 0)} (금액 효과 {eok(dd[2])})")
            if not ok: ver.append(f"{WHY.get(why, '')} 전년비 계산에서 제외 (실적은 그대로 표시)")
            hyp = []
            det = M['detail'][s]; reg = M['detail']['대경지역']
            if ok:
                cands = []
                for key, lab in (('mid', '분류'), ('brand', '브랜드')):
                    rows = det[key]; Ts = sum(nz(x[1]) for x in rows); Tk = sum(nz(x[4]) for x in rows)
                    rmap = {x[0]: x for x in reg[key]}
                    for x in rows:
                        if small(x, Ts, Tk) or nz(x[3]) < 20 or x[0] not in rmap: continue
                        rr = rmap[x[0]]; rq = dv(rr[8] if len(rr) > 8 else rr[2], rr[3]); q = dv(x[2], x[3])
                        if q is None or rq is None: continue
                        cands.append((q - rq, lab, x[0], q, rq))
                weak = sorted([c for c in cands if c[3] < 0], key=lambda c: c[0])
                seen = set()
                for c in weak:
                    if c[1] in seen: continue
                    seen.add(c[1]); ver.append(f"{c[1]} {c[2]} 판매수량 전년 대비 {ps(c[3], 0)} (지역 전체 {ps(c[4], 0)})")
                    if len(seen) == 2: break
                strong = sorted(cands, key=lambda c: -c[0])
                if strong and strong[0][0] > 0:
                    c = strong[0]; ver.append(f"강점: {c[1]} {c[2]} 판매수량 전년 대비 {ps(c[3], 0)} (지역 전체 {ps(c[4], 0)})")
                if r['disc'] is not None and r['pdisc'] is not None and r['disc'] > r['pdisc']:
                    hyp.append(f"할인율 {pc(r['disc'])}(전년 {pc(r['pdisc'])}) — 할인한 만큼 판매가 늘었는지(행사 상품 진열·재고) 확인")
            rows = det['brand']; Ts = sum(nz(x[1]) for x in rows); Tk = sum(nz(x[4]) for x in rows)
            over = sorted([x for x in rows if x[7] == '과다' and not small(x, Ts, Tk)], key=lambda x: -nz(x[4]))[:2]
            short = sorted([x for x in rows if x[7] == '부족' and not small(x, Ts, Tk) and nz(x[2]) >= 10], key=lambda x: -nz(x[2]))[:1]
            for x in over: hyp.append(f"{x[0]} 재고 {n0(x[4])}개(재고주수 {x[6]}주) 과다 — 점간 이동·재고통합 노출 검토")
            for x in short: hyp.append(f"{x[0]} 재고 {n0(x[4])}개(재고주수 {x[6]}주) 부족 — 인기 사이즈 추가 입고·점간 이동 요청")
            SB = M['sbrief'][s]
            SB.update(m=mm(r), tags=tags, changes=ch, ai=[ai], insights=ins, verified=ver, hyp=hyp)
            # 할 일(분석 답변용)
            good, bad = [], []
            if ok:
                for lab, v in (('실적합계 전년 같은 달 대비', r['yoy']), ('구매 고객 수 전년 대비', r['buyy']),
                               ('객단가(오프라인) 전년 대비', dv(r['atvOff'], r['patvOff'])), ('인시생산성 전년 대비', r['ipy']),
                               ('재고통합(온라인) 매출 전년 대비', r['inty'])):
                    if v is None: continue
                    (good if v > 0 else bad).append((abs(v), f'{lab} {ps(v, 0)}'))
                if r['cv'] is not None and r['pcv'] is not None and abs(r['cv'] - r['pcv']) >= 0.005:
                    (good if r['cv'] > r['pcv'] else bad).append((abs(r['cv'] - r['pcv']) * 10, f"구매전환율 {pc(r['cv'])} (전년 {pc(r['pcv'])})"))
                if r['disc'] is not None and r['pdisc'] is not None and abs(r['disc'] - r['pdisc']) >= 0.005:
                    (good if r['disc'] < r['pdisc'] else bad).append((abs(r['disc'] - r['pdisc']) * 10, f"할인율(에누리) {pc(r['disc'])} (전년 {pc(r['pdisc'])})"))
            good = [x[1] for x in sorted(good, reverse=True)[:4]]; bad = [x[1] for x in sorted(bad, reverse=True)[:4]]
            todo = []
            for x in over[:1]: todo.append(['재고', f'{x[0]} 과다 재고 점간 이동 요청 리스트 작성', f'재고주수 {x[6]}주'])
            for x in short[:1]: todo.append(['재고', f'{x[0]} 부족 사이즈 추가 입고 요청', f'재고주수 {x[6]}주'])
            if ok and r['cv'] is not None and r['pcv'] is not None and r['cv'] - r['pcv'] <= -0.01:
                todo.append(['판매', '주말 피크 시간대(14~17시) 접객 인원 배치 점검', f"전환율 {pc(r['cv'])}(전년 {pc(r['pcv'])})"])
            if ok and r['disc'] is not None and r['pdisc'] is not None and r['disc'] - r['pdisc'] >= 0.02:
                todo.append(['가격', '할인 행사 상품 재고·진열 점검(할인 대비 판매 증가 여부)', f"할인율 {pc(r['disc'])}(전년 {pc(r['pdisc'])})"])
            if r['ach'] is not None and r['ach'] < 0.9 and k.get('target'):
                todo.append(['목표', f"목표 대비 부족분 {eok(k['target'] - r['tot'])} — 다음 달 주말 행사 상품 전면 진열", f"달성률 {pc(r['ach'])}"])
            nxt = [f"목표 달성률 100% 이상 (지금 {pc(r['ach'])})"]
            if ok and r['buyy'] is not None: nxt.append(f"구매 고객 전년 대비 −5% 이내 (지금 {ps(r['buyy'], 0)})")
            if ok and r['pcv'] is not None: nxt.append(f"구매전환율 전년 수준 {pc(r['pcv'])} 이상 (지금 {pc(r['cv'])})")
            M['todo'][s].update(
                status=dict(tot=r['tot'], yoy=r['yoy'], ach=r['ach'], gap=(r['tot'] - k['target']) if k.get('target') else None,
                            cum=sd(cum_c, cum_t), cgap=cum_c - cum_t if cum_t else None, typ=typ[s], cluster=clu[s]),
                good=good, bad=bad,
                watch=[['달성률', pc(r['ach'])], ['전년비', ps(r['yoy']) if ok else '제외'], ['할인율', pc(r['disc'])],
                       ['구매고객', ps(r['buyy'], 0) if ok else '-'],
                       ['유사 매장 대비', pp(r['ach'] - avg) if (r['ach'] is not None and avg is not None) else '-']],
                facts=ver, checks=hyp, todo=todo[:3], next=nxt, ai=ai)

        # ---- 지역 브리핑
        r = Rg; k = K[m]['대경지역']; wk = [w for w in M['brief']['weeks'] if w[4] is not None]
        b = max(wk, key=lambda w: w[4]) if wk else None; l = min(wk, key=lambda w: w[4]) if wk else None
        t, sty, qy = invline('대경지역'); hl = M['inv']['대경지역']['health']; ht = sum(hl.values()) or 1
        exs = [(s, EX[(s, m)]) for s in inv_st]
        exs_t = sum(nz(K[m][s]['cy_tot']) for s in inv_st)
        ex_txt = ', '.join(f'{s}({w})' for s, w in exs)
        ch = [f"실적합계 {eok(r['tot'])} 전년비 {ps(r['yoy'])}{' (비교 가능 매장 기준)' if exs else ''}, 목표 달성률 {pc(r['ach'])}"
              + (f" — 가장 강한 주 {b[0]}({b[1]}) {ps(b[4])}" if b else ''),
              f"구매전환율 {pc(r['cv'])}({pp(r['cv'] - r['pcv']) if r['pcv'] is not None else '-'}) · 객단가(합계) {n0(r['atv'])}원({ps(dv(r['atv'], r['patv']))})",
              f"할인율 {pc(r['disc'])}({pp(r['disc'] - r['pdisc']) if r['pdisc'] is not None else '-'}) · 인시생산성 {n0(r['ip'])}원/h({ps(r['ipy'])})",
              f"{m} 말 재고 {n0(t[0])}개(전년 {ps(sty)}) vs {m} 판매수량 {ps(qy)}"]
        if exs: ch.append(f"전년비 제외 매장: {ex_txt} — 실적 {eok(exs_t)}은 합계에 포함")
        outl = [[s, SM_t] for s in ST for SM_t in [M['sbrief'][s]['tags']] if SM_t]
        dd = decomp(yc(k, 'tot'), k.get('py_tot'), yc(k, 'cnt'), k.get('py_cnt'))
        dec = [(s, yc(K[m][s], 'tot') - K[m][s]['py_tot']) for s in ST if valid(s, m) and K[m][s].get('py_tot')]
        down = sorted([x for x in dec if x[1] < 0], key=lambda x: x[1])
        hol = first_hol.get(m)
        ai = [f"{m} 실적합계는 {eok(r['tot'])} 원으로 전년보다 {ps(r['yoy'])}{'(비교 가능 매장 기준)' if exs else ''}, 목표 달성률은 {pc(r['ach'])}입니다."
              + (f' {hol}.' if hol else '') + (f" 주차별로는 {b[0]}({b[1]})가 {ps(b[4])}로 가장 강했고 {l[0]}({l[1]})가 {ps(l[4])}로 가장 약했습니다." if b and l and b is not l else '')]
        if dd:
            s2 = f"비교 가능 매장 기준 전년 대비 증감 {eok(dd[0])} 중 고객 수 효과({eok(dd[1])})와 객단가 효과({eok(dd[2])}) 가운데 {'고객 수' if abs(dd[1]) >= abs(dd[2]) else '객단가'} 쪽이 더 크게 움직였습니다."
            if exs: s2 += f" 전년 실적이 없는 {ex_txt}의 실적 {eok(exs_t)}은 전년비 계산에서 뺐습니다."
            s2 += f" 매장 구매전환율은 {pc(r['cv'])}로 전년({pc(r['pcv'])})보다 {pp(r['cv'] - r['pcv']) if r['pcv'] is not None else '-'} 변했습니다."
            ai.append(s2)
        s3 = f"전년보다 매출이 줄어든 매장은 {len(down)}곳입니다" + (f"(감소폭 큰 순: {', '.join(x[0] for x in down[:5])})." if down else '.')
        for c in D['area']['clusters']:
            if c['grade'] == '긴급' and c['stores'] and all(x in dict(down) for x in c['stores']):
                s3 += f" {c['name']} 입점 {len(c['stores'])}개점은 상권 자체의 집객 약화와 함께 움직이고 있어 매장 노력만으로 회복이 어렵습니다."
        ai.append(s3)
        ai.append(f"할인율은 전년보다 {pp(r['disc'] - r['pdisc']) if r['pdisc'] is not None else '-'} 변했고 객단가(합계)는 {ps(dv(r['atv'], r['patv']))} 변했습니다. "
                  f"재고는 전년보다 {ps(sty)}, 재고주수 {t[4]}주이며 재고주수 52주를 넘는 과다 스타일이 재고의 {pc(hl.get('과다', 0) / ht, 0)}입니다.")
        a100 = sum(1 for s in ST if SM[s]['ach'] is not None and SM[s]['ach'] >= 1); a90 = sum(1 for s in ST if SM[s]['ach'] is not None and SM[s]['ach'] < 0.9)
        avg = lambda T: (lambda L: sum(L) / len(L) if L else None)([SM[s]['ach'] for s in ST if typ[s] == T and SM[s]['ach'] is not None])
        cvu = [s for s in ST if valid(s, m) and SM[s]['pcv'] is not None and SM[s]['cv'] is not None]
        chk = 0
        for x in M['check']:
            T0 = M['inv'].get(x[0], {'total': [0, 0, 0]})['total']
            if not ((nz(x[6]) / T0[2] if T0[2] else 0) < TXT_MIN and (nz(x[4]) / T0[0] if T0[0] else 0) < TXT_MIN): chk += 1
        insg = [f"달성률 100% 이상 매장 {a100}곳 / 90% 미만 {a90}곳",
                f"로드샵 평균 달성률 {pc(avg('로드샵'))} vs 몰·마트 입점 {pc(avg('몰·마트 입점'))}",
                f"구매전환율이 전년보다 오른 매장 {sum(1 for s in cvu if SM[s]['cv'] > SM[s]['pcv'])}곳 / 내린 매장 {sum(1 for s in cvu if SM[s]['cv'] < SM[s]['pcv'])}곳",
                f"객단가(오프라인)가 전년보다 오른 매장 {sum(1 for s in cvu if (dv(SM[s]['atvOff'], SM[s]['patvOff']) or 0) > 0)}곳",
                f"재고 과부족 점검 대상(브랜드·분류) {chk}건 — 재고 탭에서 매장별 확인"]
        if exs: insg.append(f"전년비 제외: {ex_txt}")
        ver = ([hol] if hol else [])
        if dd: ver.append(f"비교 가능 매장 기준 실적합계 증감 {eok(dd[0])}" + (f" (전년비 제외: {ex_txt}, 실적 {eok(exs_t)})" if exs else ''))
        if dd: ver.append(f"고객 수 효과 {eok(dd[1])} · 객단가 효과 {eok(dd[2])} (합계 기준, 총객수 {ps(r['cnty'])}, 객단가 {ps(dv(yc(k, 'tot') / yc(k, 'cnt') if yc(k, 'cnt') else None, r['patv']))})")
        if b and l and b is not l: ver.append(f"주차별 가장 좋았던 구간 {b[0]}({b[1]}) {ps(b[4])}, 가장 약했던 구간 {l[0]}({l[1]}) {ps(l[4])} (매장매출, 전년 같은 요일 대비)")
        if dec:
            lo = min(dec, key=lambda x: x[1]); hi = max(dec, key=lambda x: x[1])
            ver.append(f"전년 대비 가장 많이 줄어든 매장 {lo[0]} {eok(lo[1])} · 가장 많이 늘어난 매장 {hi[0]} {eok(hi[1])} (줄어든 매장 {len(down)}곳)")
        hyp = []
        if r['pdisc'] is not None:
            hyp.append(f"할인율(에누리) {pc(r['disc'])}(전년 {pc(r['pdisc'])}, {pp(r['disc'] - r['pdisc'])}) → " +
                       ('할인 축소가 정상가 판매로 이어졌는지, 행사 축소로 고객이 줄었는지 확인' if r['disc'] < r['pdisc'] else '할인 확대만큼 판매 수량이 늘었는지 확인'))
        if r['pcv'] is not None: hyp.append(f"구매전환율 {pc(r['cv'])}(전년 {pc(r['pcv'])}) → 입점객 대비 구매 연결(인력·진열·사이즈 결품) 현장 확인")
        l3 = MS[max(0, mi - 2):mi + 1]
        low3 = [s for s in ST if len(l3) == 3 and all(SM[s]['ach'] is not None for _ in [0]) and all((sd(K[x][s]['cy_tot'], K[x][s].get('target')) or 9) < 0.9 for x in l3)]
        if low3: hyp.append(f"최근 3개월 연속 목표 90% 미만 매장 {len(low3)}곳({', '.join(low3)}) → 목표 수준 문제인지 매장 운영 문제인지 구분 필요")
        if r['ipy'] is not None: hyp.append(f"인시생산성 전년 대비 {ps(r['ipy'])} → 근무 시간 배치가 매출 흐름(주말·행사)과 맞았는지 확인")
        M['brief'].update(m=mm(r), changes=ch, outliers=outl, ai=ai, insights=insg, verified=ver, hyp=hyp)

    D['adv']['note'] = (D['adv'].get('note') or '') + (' 전년비는 전년 실적이 있는 매장·월끼리만 비교합니다(신규 오픈·리뉴얼 달 제외).' if '신규 오픈·리뉴얼' not in (D['adv'].get('note') or '') else '')
    D['meta']['note'] = D['meta']['note'].replace('브리핑·매장 TO DO·재고 분석', '브리핑·재고 분석')
    json.dump(D, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return D


if __name__ == '__main__':
    main(*sys.argv[1:3])
