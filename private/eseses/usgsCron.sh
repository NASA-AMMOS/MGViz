#crontab -e
#0 0 * * * ~/MGViz/private/MGViz/cron.sh
source ~/.bashrc
cd ~/MGViz/private/eseses
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=2.0&maxmagnitude=2.999&orderby=time" -o ~/MGViz/Missions/MGViz/Layers/RecentM2M3.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=3.0&maxmagnitude=6.0&orderby=time" -o ~/MGViz/Missions/MGViz/Layers/RecentM3M6.json
curl "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson" -o ~/MGViz/Missions/MGViz/Layers/RecentSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-40 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=5.95&orderby=time" -o ~/MGViz/Missions/MGViz/Layers/HistoricalSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-40 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=5.50&maxmagnitude=5.95&orderby=time" -o ~/MGViz/Missions/MGViz/Layers/HistoricalModerate.json
python3 earthquake_reducer.py ~/MGViz/Missions/MGViz/Layers/RecentM2M3.json
python3 earthquake_reducer.py ~/MGViz/Missions/MGViz/Layers/RecentM3M6.json
python3 earthquake_reducer.py ~/MGViz/Missions/MGViz/Layers/RecentSignificant.json
python3 earthquake_reducer.py ~/MGViz/Missions/MGViz/Layers/HistoricalSignificant.json
python3 earthquake_reducer.py ~/MGViz/Missions/MGViz/Layers/HistoricalModerate.json