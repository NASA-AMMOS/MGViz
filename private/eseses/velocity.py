import csv
import urllib
import subprocess
import sys
import os
from datetime import datetime, timedelta

# Get args
if str(sys.argv[1]).isalnum():
    source = sys.argv[1]

sources = {'comb' : 'comb_ats',
        'jpl' : 'jpl_ats',
        'sopac' : 'sopac_ats'}

src = str(sources[source])

if os.path.exists(src+'.json'):
    mtime = datetime.fromtimestamp(os.path.getmtime(src+'.json'))
    diff = datetime.now() - mtime
    if diff.days == 0:
        with open(src+'.json', 'r') as out:
            print(out.read())
        sys.exit()

url = 'http://geoapp02.ucsd.edu:8080/gpseDB/vel?op=getSingleVelNEUFile&coord='+src+'&site_list=all&out=GMT&fil=unf'
try:
    reader = csv.reader(urllib.urlopen(url), delimiter=' ')
except Exception as e:
    if os.path.exists(src+'.json'):
        with open(src+'.json', 'r') as out:
            print(out.read())
    sys.exit()

with open(src+'.csv', 'wb') as csvfile:
    wtr = csv.writer( csvfile )
    wtr.writerow( ('site', 'x', 'y', 'e_vel', 'n_vel', 'u_vel' ))
    try:
        for row in reader:
            if "'Error'" in str(row): # use the old version if there is an error
                with open(src+'.json', 'r') as out:
                    print(out.read())
            site = row[7]
            if float(row[0]) > 180:
                x = float(row[0]) - 360
            else:
                x = float(row[0])
            y = float(row[1])
            # convert from m to mm
            e_vel = float(row[2]) * 1000
            n_vel = float(row[3]) * 1000
            u_vel = float(row[8]) * 1000
            wtr.writerow( (site, str(x), str(y), str(e_vel), str(n_vel), str(u_vel)) )
    except csv.Error as e:
        sys.exit('url %s, line %d: %s' % (url, reader.line_num, e))

ogr2ogr_command_list = ["ogr2ogr", "-f", "geojson", "-oo", "X_POSSIBLE_NAMES=x", "-oo", "Y_POSSIBLE_NAMES=y", src+".json", src+".csv"]
process = subprocess.Popen(ogr2ogr_command_list,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
process.wait()
for output in process.stdout:
    print(output)
for error in process.stderr:
    print(error)

with open(src+'.json', 'r') as out:
    print(out.read())

sys.exit()
