# -*- coding: utf-8 -*-
"""Generate reviewed food subset from USDA's official SR Legacy CSV archive.
Usage: python3 scripts/build-common-foods.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
"""
import csv, io, json, sys, zipfile
from pathlib import Path
z = zipfile.ZipFile(sys.argv[1])
def rows(file):
    name = next(n for n in z.namelist() if n.endswith('/' + file))
    return csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig')))
foods = {r['fdc_id']: r for r in rows('food.csv')}
selected = list(csv.reader(Path('scripts/common-food-selection.tsv').read_text().splitlines(), delimiter='\t'))
ids = {r[0] for r in selected}
nutrients = {id: {} for id in ids}
keys = {'1008': 'calories', '1003': 'protein', '1005': 'carbs', '1004': 'fat'}
for r in rows('food_nutrient.csv'):
    if r['fdc_id'] in ids and r['nutrient_id'] in keys:
        nutrients[r['fdc_id']][keys[r['nutrient_id']]] = float(r['amount'])
result=[]
for id, name, category, basis, icon in selected:
    assert set(nutrients[id]) == set(keys.values()), (id, nutrients[id])
    result.append(dict(id='common-usda-'+id, name=name, category=category, unit='g', basis=basis, icon=icon,
        kind='食材', source='USDA FDC SR Legacy · FDC '+id+' · 每100g可食部分参考均值',
        nutrition=nutrients[id], favorite=False, archived=False, updatedAt=0))
Path('src/data/common-foods.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
with Path('references/common-food-sources.csv').open('w') as f:
    w=csv.writer(f);w.writerow(['name','category','basis','fdc_id','USDA_description','source_url'])
    for id, name, category, basis, icon in selected:
        w.writerow([name,category,basis,id,foods[id]['description'],'https://fdc.nal.usda.gov/food-details/'+id+'/nutrients'])
print('Generated',len(result),'verified foods')
