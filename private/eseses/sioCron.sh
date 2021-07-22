#crontab -e
#0 0 * * * ~/ESESES/private/eseses/cron.sh
source ~/.bashrc
cd ~/ESESES/private/eseses
python metadata.py
python timeseries.py
