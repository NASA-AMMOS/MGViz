#crontab -e
#0 0 * * * ~/ESESES/private/eseses/cron.sh
source ~/.bashrc
cd ~/ESESES/private/eseses
python metadata.py
python timeseries.py
# These are (?) run from within server.js
#cd ~/ESESES
#python private/eseses/psite.py
#python private/eseses/velocity.py jpl
#python private/eseses/velocity.py sopac
#python private/eseses/velocity.py comb
