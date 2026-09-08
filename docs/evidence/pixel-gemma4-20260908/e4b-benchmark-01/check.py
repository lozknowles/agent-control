import runpy
f=runpy.run_path('/candidate.py')['unique_sorted']
for v in [[],[3,1,3,2],[-3,0,-3,2],[7,7]]:
 old=v.copy(); result=f(v); assert result==sorted(set(v)); assert v==old; assert result is not v
print('PASS: four cases and input preservation')
