#crontab -e
#0 0 * * * ~/ESESES/private/eseses/cron.sh
source ~/.bashrc
cd ~/ESESES/private/eseses
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=2.0&maxmagnitude=2.999&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM2M3.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-2 months' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=3.0&maxmagnitude=6.0&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/RecentM3M6.json
curl "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson" -o ~/ESESES/Missions/ESESES/Layers/RecentSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-30 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=5.95&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/HistoricalSignificant.json
curl "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=`date --date '-30 years' +'%Y-%m-%d'`%2000%3A00%3A00&minmagnitude=5.50&maxmagnitude=5.95&orderby=time" -o ~/ESESES/Missions/ESESES/Layers/HistoricalModerate.json
python3 earthquake_reducer.py ~/ESESES/Missions/ESESES/Layers/RecentM2M3.json
python3 earthquake_reducer.py ~/ESESES/Missions/ESESES/Layers/RecentM3M6.json
python3 earthquake_reducer.py ~/ESESES/Missions/ESESES/Layers/RecentSignificant.json
python3 earthquake_reducer.py ~/ESESES/Missions/ESESES/Layers/HistoricalSignificant.json
python3 earthquake_reducer.py ~/ESESES/Missions/ESESES/Layers/HistoricalModerate.json
