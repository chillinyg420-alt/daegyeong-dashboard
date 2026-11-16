import openpyxl,pickle,collections,datetime
wb=openpyxl.load_workbook('/mnt/user-data/uploads/2026_대경_판매현황상세_업데이트_업로드_.xlsx',read_only=True); ws=wb.worksheets[0]; ws.reset_dimensions()
Q=collections.defaultdict(int)
for r in ws.iter_rows(min_row=18,values_only=True):
    d=r[1]
    if d is None or r[8] is None: continue
    if not isinstance(d,(datetime.datetime,datetime.date)):
        try: d=datetime.datetime.strptime(str(d)[:10],'%Y-%m-%d')
        except: continue
    Q[(d.date() if isinstance(d,datetime.datetime) else d,str(r[3]).strip(),str(r[8]).strip())]+=r[20] or 0
pickle.dump(dict(Q),open('daily26.pkl','wb')); print('keys',len(Q))
