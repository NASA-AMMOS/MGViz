#!/usr/bin/env python3

import sys
import os
import os.path
import json
from datetime import datetime, timedelta, timezone
import calendar
import time
import gzip


# Get args
if str(sys.argv[1]).isalnum():   # site
    site = sys.argv[1].upper()
if str(sys.argv[2]).isalnum():   # parameter
    param = sys.argv[2]
if str(sys.argv[3]).replace('-', '').isalnum():   # date
    date = datetime.strptime(sys.argv[3].replace('-', ''), '%Y%m%d')

param_uom = {'TROTOT': 'm',
             'TROTOTSTDEV': 'σ',
             'TRODRY': 'm',
             'TRODRYSTDEV': 'σ',
             'TROWET': 'm',
             'TROWETSTDEV': 'σ',
             'TGNWET': 'm',
             'TGNWETSTDEV': 'σ',
             'TGEWET': 'm',
             'TGEWETSTDEV': 'σ',
             'IWV': 'mm',
             'PRESS': 'hPa',
             'TEMDRY': 'K'}


def convert_seconds_to_date(seconds_since_2000):
    # Define the start date: January 1, 2000
    start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
    # Calculate the new date by adding the seconds
    new_date = start_date + timedelta(seconds=seconds_since_2000)
    # formatted_date = new_date.strftime("%Y-%m-%dT%H:%M:%SZ")
    # Format the date as JavaScript timestamp
    formatted_date = new_date.timestamp() * 1000
    return formatted_date


def tro2read(fn):
    trop = {}
    solutionBlock = False
    if fn.endswith('gz'):
        f = gzip.open(fn, 'r')
    else:
        f = open(fn, 'r')
    for ln in f:
        line = ln.decode('UTF-8')
        if line.startswith('*'):
            continue
        if not solutionBlock:
            if 'TROPO PARAMETER NAMES' in line:
                troParams = line.split()[3:]
                for p in range(len(troParams)):
                    if 'STDEV' in troParams[p]:
                        troParams[p] = troParams[p-1]+'STDEV'
            elif 'TROPO PARAMETER UNITS' in line:
                troUnits = line.split()[3:]
            elif '+TROP/SOLUTION' in line:
                solutionBlock = True
        elif '-TROP/SOLUTION' in line:
            break
        else:
            cols = line.split()
            e = cols[1]
            yy = e[:2]
            doy = e[3:6]
            sec = e[7:12]

            [hh, mm, ss] = str(timedelta(seconds=int(sec))).split(':')
            epoch = calendar.timegm(time.strptime(' '.join(
                [yy, doy, hh, mm, ss]), "%y %j %H %M %S"))-calendar.timegm(
                  time.strptime("2000 01 01 00 00", "%Y %m %d %H %M"))

            if cols[0] not in trop:
                trop[cols[0]] = {}
            trop[cols[0]][epoch] = {}
            for field in range(len(troParams)):
                candidate = float(cols[field+2])
                if candidate > -99.9:
                    trop[cols[0]][epoch][troParams[field]] = float(
                        cols[field+2])/float(troUnits[field])
    return (trop)


root = 'private/eseses/Troposphere/'
source_file = root + str(date.year) + '/' + date.strftime('%j') + '/JPS2_SES_FIN_' + date.strftime('%Y%j%H%M') + '_30H_05M_' + site + '_TRO.TRO.gz'

source = None
if source_file is not None:
    if os.path.exists(source_file):
        source = tro2read(source_file)
    else:
        print(('{"err": "Data not found for ' + site + '/' + param + '/' + sys.argv[3] + ' - ' + source_file + '." }'))
        sys.exit()
else:
    sys.exit()

data = {'data': [],
        'error': []}
times = source[site]
dates = []
for tm, val in times.items():
    date = convert_seconds_to_date(tm)
    dates.append(date)
    try:
        data['data'].append([date, val[param]])
    except KeyError:
        data['data'] = []
    if param in ['TROTOT', 'TRODRY', 'TROWET', 'TGNWET', 'TGEWET']:
        paramstd = param+'STDEV'
        try:
            error = [date,
                     val[param] - val[paramstd],
                     val[param] + val[paramstd]]
            data['error'].append(error)
        except KeyError:
            data['error'] = []
time_min = min(dates)
time_max = max(dates)
data['time_min'] = time_min
data['time_max'] = time_max
data['uom'] = str(param_uom[param])

print((json.dumps(data)))
sys.exit()
