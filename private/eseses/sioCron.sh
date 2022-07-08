#crontab -e
#0 0 * * * ~/ESESES/private/eseses/cron.sh
source ~/.bashrc
cd ~/ESESES/private/eseses
python metadata.py
python timeseries.py
curl -L "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ02siHNOTZ-yYFOQEghz-ZvF3X2s4AUf7zhkY2V57ggPlheYaF9SzRWfbdJJEnng/pub?gid=646720245&single=true&output=csv" -o metadata/subOptimalSites.csv
