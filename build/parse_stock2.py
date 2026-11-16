import openpyxl,pickle,collections
wb=openpyxl.load_workbook('/mnt/user-data/uploads/2026_대경_월별_기말_스타일_재고현황_업데이트_업로드_.xlsx',read_only=True)
print([ws.title for ws in wb.worksheets])
S=collections.defaultdict(int)
for ws in wb.worksheets:
    t=ws.title.strip()
    if not t.endswith('월'): continue
    m=int(t[:-1]); ws.reset_dimensions(); hdr=None; n=0
    for r in ws.iter_rows(values_only=True):
        if hdr is None:
            if r and r[0]=='No': hdr={str(c).strip():i for i,c in enumerate(r) if c}; print(m,hdr)
            continue
        if len(r)<=hdr['현재재고'] or r[hdr['점']] is None or r[hdr['스타일']] is None: continue
        try: S[(m,str(r[hdr['점']]).strip(),str(r[hdr['스타일']]).strip())]+=int(r[hdr['현재재고']] or 0); n+=1
        except: pass
    print(m,n,flush=True)
pickle.dump(dict(S),open('stock26b.pkl','wb'))
old=pickle.load(open('stock26.pkl','rb'))
for m in (9,10): print(m,sum(v for k,v in S.items() if k[0]==m), sum(v for k,v in old.items() if k[0]==m))
