import sys
import json

# Get filepath
filepath = sys.argv[1]

with open(filepath, 'r+') as f:
    data = json.load(f)
    # Create a new features dictionary with only the features we need
    new_features = []
    for feature in data['features']:
        new_feature = {}
        new_feature['geometry'] = feature['geometry']
        new_feature['properties'] = {}
        # Depth needs to be a property for the map viewer to use it
        new_feature['properties']['depth'] = feature['geometry']['coordinates'][2]
        new_feature['properties']['mag'] = feature['properties']['mag']
        new_feature['properties']['title'] = feature['properties']['title']
        new_feature['properties']['time'] = feature['properties']['time']
        new_features.append(new_feature)
    # Replace the old features
    data['features'] = new_features
    # Truncate and overwrite file
    f.seek(0)
    f.truncate(0)
    json.dump(data, f, ensure_ascii=True)
