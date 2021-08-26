import sys
import tarfile
import gzip
import shutil
import os
import glob
import subprocess
import time
from dateutil import parser
from ftplib import FTP

if not os.path.exists('./data'):
    os.makedirs('data')
if not os.path.exists('./data/jpl'):
    os.makedirs('data/jpl')
if not os.path.exists('./data/comb'):
    os.makedirs('data/comb')
if not os.path.exists('./data/combg'):
    os.makedirs('data/combg')
if not os.path.exists('./data/sopac'):
    os.makedirs('data/sopac')

def fetch_data(server, directory):

    lines = []
    files = []
    existing_files = glob.glob('data/*.tar')

    ftp = FTP(server)
    ftp.login()
    ftp.cwd(directory)
    ftp.dir('.', lines.append)

    # loop to find last modified files
    for line in lines:
        tokens = line.split()
        name = tokens[8]
        if str(name).endswith('.tar'): 
            files.append(name)

    # download files
    for file in files:
        if 'data/' + file in existing_files:
            print 'Skipping already downloaded ' + file
        else:
            for old_file in glob.glob('data/'+file[:-12]+'*'):
                print 'Removing ' + old_file
                os.remove(old_file)
            print 'Downloading ' + file
            f = open('./data/' + file, 'wb')
            ftp.retrbinary('RETR %s' % file, f.write)
            f.close()
    ftp.quit()

    # extract tar files
    for file in glob.glob('data/*.tar'):
        if file in existing_files:
            print 'Skipping already extracted ' + file
        else:
            print 'Extracting ' + file
            tar = tarfile.open(file)
            extract_dir = './data'
            if '_jpl_' in file:
                extract_dir = extract_dir + "/jpl"
            if '_combwm_' in file:
                extract_dir = extract_dir + "/comb"
            if '_combg_' in file:
                extract_dir = extract_dir + "/combg"
            if '_sopac_' in file:
                extract_dir = extract_dir + "/sopac"
            # need to limit to the relevant filename!
            #for oldF in [f for f in os.listdir(extract_dir)]:
            #  os.remove(os.path.join(extract_dir,oldF))
            tar.extractall(extract_dir)
            tar.close()

    # extract Z files
    print 'Uncompressing files...'
    for file in glob.glob('data/*/*.Z'):
        unzip_command = ['unzip', '-o', file, '-d', os.path.dirname(file)]
        process = subprocess.Popen(unzip_command,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        process.wait()
        #for output in process.stdout:
            #print output
        for error in process.stderr:
            print error
        os.remove(file)
        
    # truncate files
    for file in files:
        if 'data/' + file in existing_files:
            print 'Skipping already processed ' + file
        else:
            with open('data/' + file, 'w') as fp: # truncate file to save disk space
                print 'Truncating data/' + file

server = 'sopac-ftp.ucsd.edu'
# fetch global data
directory = 'pub/timeseries/measures/ats/Global/'
fetch_data(server, directory)
# fetch wnam data
directory = 'pub/timeseries/measures/ats/WesternNorthAmerica/'
fetch_data(server, directory)

sys.exit()
