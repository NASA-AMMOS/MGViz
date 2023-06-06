# ESESES Tools API

## metadata

./metadata.py runs as a script that will download and extract site metadata from garner.ucsd.edu. It will replace existing site metadata with new contents. Execute the following to run manually `python3 metadata.py`

## neu

./neu.py acts as a web service that will return time series data to a client for charting. The API for the service is as follows:

http://localhost:8888/api/eseses/neu/{site}/{source}/{filter}/{type}/{direction}

**site**: the 4 letter site code

**source**: one of either *comb*, *sopac*, or *jpl*

**filter**: one of either *flt*, *clean*, *raw*, or *rawm*

**type**: one of either *detrend*, *trend*, *resid*, *strain*, or *raw*

**direction**: one of either *n*, *e*, or *u*

## psite

./psite.py acts as a web service that will return a list of sites as GeoJSON for the web mapping client. It obtains data from http://geoapp03.ucsd.edu/gpseDB/psite?op=getNeuConversionSiteList when it is accessible. The web service will cache the list of sites for a day to prevent multiple repeated requests to the external site.

http://localhost:8888/api/eseses/psite

## site

./site.py runs as a web service that will return all of the metadata for a given site. The API for the service is as follows:

http://localhost:8888/api/eseses/site/{site}/{source}/{filter}/{type}

**site**: the 4 letter site code

**source**: one of either *comb*, *sopac*, or *jpl*

**filter**: one of either *flt*, *clean*, *raw*, or *rawm*

**type**: one of either *detrend*, *trend*, *resid*, *strain*, or *raw*

## timeseries

./timeseries.py runs as a script that will download and extract time series data from sopac-ftp.ucsd.edu. It will replace existing time series data if new contents are found. An empty file containing the tar filename is left remaining to let the script know the current version of the data, which is used to determine if download and extraction of the most recent version of the file are necessary. Execute the following to run manually `python3 timeseries.py`

## velocity

./velocity.py acts as a web service that will return a list of site velocities as GeoJSON for the web mapping client. It obtains data from http://geoapp03.ucsd.edu/gpseDB/vel?op=getSingleVelNEUFile&coord={source}&site_list=all&out=GMT&fil=unf when it is accessible. The web service will cache the list of site velocites for a day to prevent multiple repeated requests to the external site. The web service takes in *source* as an input value.

http://localhost:8888/api/eseses/velocity/{source}

**source**: one of either *comb*, *sopac*, or *jpl*

## *Data Refresh*

MGViz loads site metadata from garner.ucsd.edu, time series data from sopac-ftp.ucsd.edu, and earthquakes from USGS. These datasets are refreshed nightly every 24 hours via a cron job. A cron job may be created via the following commands:

``` bash
crontab -e

0 0 * * * <git repo location>/private/eseses/cron.sh
```

Replace `<git repo location>` with the path to where you cloned the git repository.

The data may be refreshed manually via the following commands:

``` bash
cd private/eseses

# Refresh site metadata
python metadata.py

# Refresh time series data
python timeseries.py

# Download earthquake JSON files from USGS
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=2.0&maxmagnitude=2.999&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM2M3.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=3.0&maxmagnitude=6.0&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM3M6.json
curl "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson" -o ~/ESESES/Missions/ESESES/Layers/RecentSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-30 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=6.0&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/HistoricalSignificant.json
```

Queries for the earthquake data may be modified as desired.
