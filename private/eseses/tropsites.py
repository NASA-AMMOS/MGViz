#!/usr/bin/env python3

import subprocess
import sys
import os
import json
from datetime import datetime


# Get args
if str(sys.argv[1]).isalnum():   # parameter
    param = sys.argv[1]
if str(sys.argv[2]).replace('-', '').isalnum():   # date
    date = datetime.strptime(sys.argv[2].replace('-', ''), '%Y%m%d')


parameters = {'TROTOT': 'TROTOT',
              'TROTOTSTDEV': 'TROTOTSTDEV',
              'TRODRY': 'TRODRY',
              'TRODRYSTDEV': 'TRODRYSTDEV',
              'TROWET': 'TROWET',
              'TROWETSTDEV': 'TROWETSTDEV',
              'TGNWET': 'TGNWET',
              'TGNWETSTDEV': 'TGNWETSTDEV',
              'TGEWET': 'TGEWET',
              'TGEWETSTDEV': 'TGEWETSTDEV',
              'IWV': 'IWV',
              'PRESS': 'PRESS',
              'TEMDRY': 'TEMDRY'}


root = 'Missions/MGViz/Layers//Troposphere/' + date.strftime('%Y%m%d')
if not os.path.exists(root):
    os.mkdir(root)
newsites_fp = root + '/' + param + '.json'
sites_fp = 'Missions/MGViz/Layers/Sites.json'
newsites = {"type": "FeatureCollection",
            "name": "out",
            "features": []}
if os.path.exists(sites_fp):
    with open(sites_fp, 'r') as sites_file:
        sites_json = json.load(sites_file)
        for feature in sites_json['features']:
            trop_command = ["private/eseses/trop.py",
                            feature['properties']['site'],
                            param,
                            date.strftime('%Y%m%d')]
            process = subprocess.Popen(trop_command,
                                       stdout=subprocess.PIPE,
                                       stderr=subprocess.PIPE)
            process.wait()
            site_json = {}
            for output in process.stdout:
                site_json = json.loads(output.decode('utf-8'))
            if 'data' in site_json:
                val = [item[1] for item in site_json['data']]
                avg = sum(val) / len(val)
                feature['properties']['val'] = avg
                print(feature['properties']['site'] + ' ' + str(avg))

            newsites['features'].append(feature)
else:
    print(json + ' does not exist')
    sys.exit()

# Now output the new json
print('Writing to: ' + newsites_fp)
with open(newsites_fp, 'w') as f:
    json.dump(newsites, f)
sys.exit()
