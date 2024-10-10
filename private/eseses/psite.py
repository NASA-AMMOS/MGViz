import csv
import urllib.request
import subprocess
import sys
import os
from datetime import datetime
import geopandas as gpd

json = 'Missions/MGViz/Layers/Sites.json'

# Get args
if len(sys.argv) > 1:
    if str(sys.argv[1]).replace('%20', '').isalnum():
        state = sys.argv[1].replace('%20', ' ').lower()
        json = json.replace('Sites', 'Sites-' + state)

if os.path.exists(json):
    mtime = datetime.fromtimestamp(os.path.getmtime(json))
    diff = datetime.now() - mtime
    if diff.days == 0:
        with open(json, 'r') as out:
            print(out.read())
        sys.exit()

url = 'http://geoapp01.ucsd.edu:8080/gpseDB/psite?op=getNeuConversionSiteList'
try:
    reader = csv.reader(urllib.request.urlopen(url).read().decode('utf-8').splitlines(), delimiter=' ')
except Exception as e:   # On error, print the saved version and exit
    if os.path.exists(json):
        with open(json, 'r') as out:
            print(out.read())

    else:
        print(e)
    sys.exit()


# save a copy of the web service response
csvLines = []
for line in reader:
    csvLines.append(line)

if len(csvLines) < 2:   # an empty response from web service
    if os.path.exists(json):   # print the saved copy
        with open(json, 'r') as out:
            print(out.read())
        sys.exit() 

# Got some csv from the url, now in cvsLines
with open('out.csv', 'w') as csvfile:
    wtr = csv.writer(csvfile)
    wtr.writerow(('site', 'x', 'y'))
    try:
        for row in csvLines:
            if "'Error'" in str(row):  # use the old version if there is an error
                with open(json, 'r') as out:
                    print(out.read())
                    sys.exit()
            site = row[1]
            if float(row[3]) > 180:
                x = float(row[3]) - 360
            else:
                x = float(row[3])
            y = float(row[4])
            wtr.writerow( (site, str(x), str(y)) )
    except csv.Error as e:
        sys.exit('url %s, line %d: %s' % (url, row, e))


# ogr2ogr -f geojson -oo X_POSSIBLE_NAMES=x -oo Y_POSSIBLE_NAMES=y out.json out.csv
# generate new json from the csv
ogr2ogr_command_list = ["ogr2ogr", "-f", "geojson", "-oo", "X_POSSIBLE_NAMES=x", "-oo", "Y_POSSIBLE_NAMES=y", json, "out.csv"]
process = subprocess.Popen(ogr2ogr_command_list, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
process.wait()
for output in process.stdout:
    print(output)
for error in process.stderr:
    print(error)

# filter by state if requested
if state:
    # Load the states json file
    states_json_path = "./private/eseses/gz_2010_us_040_00_500k.json"
    states_json = gpd.read_file(states_json_path)

    # Use lowercase state names
    states_json["name"] = states_json["NAME"].str.lower()

    # Load the features json file
    features_json = gpd.read_file(json)

    # Filter the states GeoDataFrame to get the polygon of the specified state
    state_polygon = states_json[states_json["name"] == state].geometry.values[0]

    # Filter the features to keep only the features within the polygon
    filtered_features_gdf = features_json[features_json.geometry.within(state_polygon)]

    # Save the filtered json
    filtered_features_gdf.to_file(json, driver="GeoJSON")

# Now output the new json
with open(json, 'r') as out:
    print(out.read())

sys.exit()
