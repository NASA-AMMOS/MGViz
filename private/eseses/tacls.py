import sys
import os
import os.path
import json
import glob

# Get args
if str(sys.argv[1]).isalnum():   # site
    site = sys.argv[1]
if str(sys.argv[2]).isalnum():   # source
    source = sys.argv[2]
if str(sys.argv[3]).isalnum():   # Type
    fil = sys.argv[3]
if str(sys.argv[4]).isalnum():   # Trend/Detrend
    ttype = sys.argv[4]
if str(sys.argv[5]).isalnum():   # n e u
    neu = sys.argv[5]

sources = {'comb': 'Comb',
           'combg': 'Combg',
           'jpl': 'JPL',
           'sopac': 'SOPAC'}

filters = {'flt': 'Filter',
           'clean': 'Clean',
           'raw': 'Raw',
           'rawm': 'Raw M'}

types = {'detrend': 'Detrend',
         'trend': 'Trend',
         'resid': 'Resid',
         'strain': 'Strain',
         'raw': 'Raw'}

name = site + ': ' + str(sources[source]) + '/' + filters[fil] + '/' + types[ttype] + ' -'
# test_file = 'private/eseses/tacls/' + site + '.json'
# file_list = glob.glob('private/eseses/tacls/' + 
#                       site + '-WNAM_' + filters[fil].replace(' ', '_') + '_' + types[ttype] +
#                       'NeuTimeSeries_' + source + '_*.json')
file_list = glob.glob('private/eseses/tacls/' + site + '*.json')
for f in sorted(file_list):
    test_file = f
if os.path.exists(test_file):
    with open(test_file, 'r') as f:
        tacls = json.load(f)
    # print('\n' + json.dumps(tacls, indent=4) + '\n')
else:
    print(f'{test_file} does not exist')
    exit()

plotline_dict = {"color": "blue", "dashStyle": "solid", "width": 2}
plotlines = []

for detection in tacls['detections']:
    plotline = plotline_dict.copy()
    plotline['value'] = detection['startdate']
    plotlines.append(plotline)

print((json.dumps(plotlines)))
sys.exit()
