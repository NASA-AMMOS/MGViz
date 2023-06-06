import sys
import tarfile
import gzip
import shutil
import os
from ftplib import FTP

if not os.path.exists('./metadata'):
    os.makedirs('metadata')
for filename in os.listdir('./metadata'):
    if filename.endswith('.tar'):
        print('Removing ' + filename)
        os.remove('./metadata/' + filename)

ftp = FTP('garner.ucsd.edu')
ftp.login()
ftp.cwd('pub/gamit/setup/metadata/standard/xml/') 
years = ftp.nlst()
ftp.cwd(max(years))
files = ftp.nlst()
mfile = './metadata/' + max(files)
f = open(mfile, 'wb')
ftp.retrbinary('RETR %s' % max(files), f.write)
f.close()
ftp.quit()
print('Downloaded ' + mfile)
tar = tarfile.open(mfile)
tar.extractall('./metadata')
tar.close()
print('Extracted ' + mfile)

for filename in os.listdir('./metadata'):
    if filename.endswith('.gz'):
        with gzip.open('./metadata/' + filename, 'rb') as f_in:
            with open('./metadata/' + filename.replace('.gz',''), 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        os.remove('./metadata/' + filename)

sys.exit()
