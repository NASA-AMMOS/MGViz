import csv
import urllib
import subprocess
import sys
import os
from datetime import datetime, timedelta

if os.path.exists('out.json'):
    mtime = datetime.fromtimestamp(os.path.getmtime('out.json'))
    diff = datetime.now() - mtime
    if diff.days == 0:
        with open('out.json', 'r') as out:
            print(out.read())
        sys.exit()

url = 'http://geoapp03.ucsd.edu/gpseDB/psite?op=getNeuConversionSiteList'
try:
    reader = csv.reader(urllib.urlopen(url), delimiter=' ')
except Exception as e:
    if os.path.exists('out.json'):
        with open('out.json', 'r') as out:
            print(out.read())
    sys.exit()

with open('out.csv', 'wb') as csvfile:
    wtr = csv.writer( csvfile )
    wtr.writerow( ('site', 'x', 'y' ))
    try:
        for row in reader:
            if "'Error'" in str(row): # use the old version if there is an error
                with open('out.json', 'r') as out:
                    print(out.read())
            site = row[1]
            if float(row[3]) > 180:
                x = float(row[3]) - 360
            else:
                x = float(row[3])
            y = float(row[4])
            wtr.writerow( (site, str(x), str(y)) )
    except csv.Error as e:
        sys.exit('url %s, line %d: %s' % (url, reader.line_num, e))

# ogr2ogr -f geojson -oo X_POSSIBLE_NAMES=x -oo Y_POSSIBLE_NAMES=y out.json out.csv
ogr2ogr_command_list = ["ogr2ogr", "-f", "geojson", "-oo", "X_POSSIBLE_NAMES=x", "-oo", "Y_POSSIBLE_NAMES=y", "out.json", "out.csv"]
process = subprocess.Popen(ogr2ogr_command_list,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
process.wait()
for output in process.stdout:
    print(output)
for error in process.stderr:
    print(error)

with open('out.json', 'r') as out:
    print(out.read())

sys.exit()
