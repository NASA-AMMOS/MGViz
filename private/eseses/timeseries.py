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
if not os.path.exists('./data/sopac'):
    os.makedirs('data/sopac')

def fetch_data(server, directory):

    lines = []
    files = []
    existing_files = glob.glob('data/*.tar.gz')

    ftp = FTP(server)
    ftp.login()
    ftp.cwd(directory)
    ftp.dir('.', lines.append)

    # loop to find last modified files
    for line in lines:
        tokens = line.split()
        name = tokens[8]
        if str(name).endswith('.tar.gz'): 
            files.append(name)

    # download files
    for targzfile in files:
        if 'data/' + targzfile in existing_files:
            print 'Skipping already downloaded ' + targzfile
        else:
            for old_file in glob.glob('data/'+targzfile[:-12]+'*'):
                print 'Removing ' + old_file
                os.remove(old_file)
            print 'Downloading ' + targzfile
            f = open('./data/' + targzfile, 'wb')
            ftp.retrbinary('RETR %s' % targzfile, f.write)
            f.close()
    ftp.quit()

    # extract tar files
    for gztar in glob.glob('data/*.tar.gz'):
        tarfn = os.path.splitext(gztar)[0]
        if gztar in existing_files:
            print 'Skipping already extracted ' + gztar
        else:
            print 'Unzipping ' + gztar
            with gzip.open(gztar,'rb') as f_in:
              with open(tarfn,'wb') as f_out:
                shutil.copyfileobj(f_in,f_out)
            tar = tarfile.open(tarfn)
            extract_dir = './data'
            if '_jpl_' in tarfn:
                source = 'jpl'
            if '_comb_' in tarfn:
                source = 'comb'
            if '_sopac_' in tarfn:
                source = 'sopac'
            if source in ['jpl','comb','sopac']:  # if not one of these, file will be discarded
              print 'Untarring ' + tarfn
              extract_dir = extract_dir + "/" + source
              # need to limit to the relevant filename!
              #for oldF in [f for f in os.listdir(extract_dir)]:
              #  os.remove(os.path.join(extract_dir,oldF))
              tar.extractall(extract_dir)
              tar.close()
              # truncate files
              if  gztar in existing_files:
                  print 'Skipping already processed ' + gztar
              else:
                  with open(gztar, 'w') as fp: # truncate file to save disk space
                      print 'Truncating data/' + gztar
            print 'Unlinking ' + tarfn
            os.unlink(tarfn)


    # extract Z files
    print 'Uncompressing files...'
    for tsfile in glob.glob('data/*/*.Z'):
        unzip_command = ['unzip', '-o', tsfile, '-d', os.path.dirname(tsfile)]
        process = subprocess.Popen(unzip_command,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        process.wait()
        #for output in process.stdout:
            #print output
        for error in process.stderr:
            print error
        os.remove(tsfile)
        

server = 'sopac-ftp.ucsd.edu'
# fetch global data
directory = 'pub/timeseries/measures/ats/Global/'
fetch_data(server, directory)
# fetch wnam data
directory = 'pub/timeseries/measures/ats/WesternNorthAmerica/'
fetch_data(server, directory)

sys.exit()
