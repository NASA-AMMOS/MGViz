#crontab -e
#0 0 * * * ~/ESESES/private/eseses/cron.sh
cd ~/ESESES/private/eseses
python metadata.py
python timeseries.py
