import openpyxl,pickle,collections,datetime,sys
wb=openpyxl.load_workbook('/mnt/user-data/uploads/2026_대경_판매현황상세_업데이트_업로드_.xlsx',read_only=True); ws=wb.worksheets[0]; ws.reset_dimensions()
agg=collections.defaultdict(lambda:[0,0,0,0]); mast={}; dmin=dmax=None; n=0; dcnt=collections.Counter()
for i,r in enumerate(ws.iter_rows(min_row=18,values_only=True)):
    d=r[1]
    if d is None or r[8] is None: continue
    if not isinstance(d,(datetime.datetime,datetime.date)):
        try: d=datetime.datetime.strptime(str(d)[:10],'%Y-%m-%d')
        except: continue
    st=str(r[8]).strip(); store=str(r[3]).strip(); m=d.month
    a=agg[(m,store,st)]; a[0]+=r[16] or 0; a[1]+=r[17] or 0; a[2]+=r[20] or 0; a[3]+=r[21] or 0
    if st not in mast: mast[st]=[r[7],r[4],r[5],r[6],r[10],r[14] or 0,r[11]]
    elif (r[14] or 0)>mast[st][5]: mast[st][5]=r[14]
    dcnt[(d.month,d.day)]+=1; n+=1
    if n%100000==0: print(n,flush=True)
pickle.dump({'agg':dict(agg),'mast':mast,'days':dict(dcnt)},open('sales26b.pkl','wb'))
print('rows',n,'styles',len(mast),'keys',len(agg),'last',max(dcnt)); print(sorted(set(k[0] for k in dcnt)))
