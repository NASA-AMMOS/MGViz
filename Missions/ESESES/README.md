# Extended Solid Earth Science ESDR System (ESESES)

The Multi-Mission Geographic Information System (MMGIS) Global Navigation Satellite System (GNSS) Visualizer, or MGViz, is a web application developed for the NASA Making Earth Science Data Records for Use in Research Environments (MEaSUREs) Extended Solid Earth Science ESDR System (ESESES). MGViz is a map-based visualization tool for viewing GPS seismology data from ESESES including detailed information of measurement stations and historical time series data. It enables researchers to browse historical data and metadata from ESESES and related data from USGS, such as earthquakes, via a user-friendly map viewer and compare time series data across multiple sites. 

## Installation

### System Requirements

1. Install the latest version of [Node.js](https://nodejs.org/en/download/)
1. Install Node Version Manager (nvm): `curl https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash`  
1. Install [PostgreSQL v12+](https://www.postgresql.org/download/)
1. And do so with the [PostGIS](https://postgis.net/install/) extension enabled.
   Agree to any possible postgis installions or run `CREATE EXTENSION postgis;` afterwards.
1. Make a new PostgreSQL database and remember the user, password and database name.

1. PHP, GDAL and Python are weaker dependencies (without them not everything will work)

   - PHP 5.4.16+ \* php-pdo php-mysqli pdo_sqlite modules enabled
   - GDAL 2.4.4+ with Python bindings (RPM install for CentOS/RHEL 7 is available via: `sudo yum install -y "https://github.com/nasa-gibs/mrf/releases/download/v2.4.4/gibs-gdal-2.4.4-1.el7.x86_64.rpm`) 
   - Python 2.75+

### Setup

`/` will always refer to the repo's root directory

1. Clone the repo  
   `git clone https://github.com/NASA-AMMOS/MMGIS`
   
1. Clone the private tools repo in the `scripts/essence/MMGIS-Private-Tools` directory
   `git clone https://github.com/NASA-AMMOS/MMGIS-Private-Tools scripts/essence/MMGIS-Private-Tools`

1. From within `/`  
   `npm install`

1. From within `/API`  
   `npm install`

1. Copy `/sample.env` to `.env`  
   `cp sample.env .env`

1. Open `.env` and update the following:

   ```
   DB_NAME=<name>
   DB_USER=<user>
   DB_PASS=<password>
   ```

1. Within `/` run `npm start`

   - If you get errors, try running `npm start` a few times. Also make sure you ran `CREATE EXTENSION postgis;` on your database.
   - If you have multiple versions of node, try running the following to get a supported version: `nvm install 12.13.0`

1. Setup the admin account:

   - In your browser, navigate to `http://localhost:8888/configure`
   - Sign up for an Administrator account (The Administrator account is always the first user in the database and you are only prompted to create an Administrator account if there are no other users)

1. Now sign in with you Administrator credentials

Go to `http://localhost:8888` to see the `ESESES` mission

Further help with configuration in the documentation pages at `http://localhost:8888/docs`

## Data Refresh

MGViz loads site metadata from garner.ucsd.edu, time series data from sopac-ftp.ucsd.edu, and earthquakes from USGS. These datasets are refreshed nightly every 24 hours via a cron job. A cron job may be created via the following commands:

``` bash
crontab -e

0 0 * * * <git repo location>/private/eseses/cron.sh
```

Replace `<git repo location>` with the path to where you cloned the git repository.

The data may be refreshed manually via the following commands:

``` bash
cd private/eseses

# Defresh site metadata
python metadata.py

# Defresh time series data
python timeseries.py

# Download earthquake JSON files from USGS
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=2.0&maxmagnitude=2.999&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM2M3.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=3.0&maxmagnitude=6.0&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM3M6.json
curl "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson" -o ~/ESESES/Missions/ESESES/Layers/RecentSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-30 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=6.0&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/HistoricalSignificant.json
```

Queries for the earthquake data may be modified as desired.

## Updating Data Layers

1. In your browser, navigate to http://localhost:8888/configure
1. Navigate to the `Layers` tab
1. Visit http://localhost:8888/docs/?page=Layers_Tab for more configuration details
1. Note that filters for Earthquake layers may be modified by changing the cron job in the section above

## Updating User Interface

1. General user interface options may be modified via the administration interface http://localhost:8888/configure
2. Updates to MGViz specific tools currently require script updates - visit the README for the MGViz Private Tools for more specific information  