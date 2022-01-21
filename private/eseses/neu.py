import sys
import tarfile
import gzip
import shutil
import os
import os.path
import numpy as np
import json
import math
import urllib2
import re

# Get args
if str(sys.argv[1]).isalnum():   # site
    site = sys.argv[1]
if str(sys.argv[2]).isalnum():   # source
    source = sys.argv[2]
if str(sys.argv[3]).isalnum():   # Type
    fil = sys.argv[3]
if str(sys.argv[4]).isalnum():   # Trend/Detrend
    ttype = sys.argv[4]
if str(sys.argv[5]).isalnum():   # n e u
    neu = sys.argv[5]

sources = {'comb' : 'Comb',
        'combg' : 'Combg',
        'jpl' : 'JPL',
        'sopac' : 'SOPAC'}

filters = {'flt' : 'Filter',
        'clean' : 'Clean',
        'raw' : 'Raw',
        'rawm': 'Raw M'}

types = {'detrend' : 'Detrend',
        'trend' : 'Trend',
        'resid' : 'Resid',
        'strain' : 'Strain',
        'raw': 'Raw'}

name = site + ': ' + str(sources[source]) + '/' + filters[fil] + '/' + types[ttype] + ' -'
if fil == 'raw': # raw follows special path
    neu_file = 'private/eseses/data/' + source + '/' + site + str(filters['clean']) + str(types[ttype]) + '.neu'
    raw_file = 'private/eseses/data/' + source + '/' + site + 'r.neu'
    ttype = 'raw_' + ttype
elif fil == 'rawm': # rawm follows special path
    neu_file = 'private/eseses/data/' + source + '/' + site + str(filters['clean']) + str(types[ttype]) + '.neu'
    raw_file = 'private/eseses/data/' + source + '/' + site + 'RawTrend.neu'
    ttype = 'rawm_' + ttype
else:
    neu_file = 'private/eseses/data/' + source + '/' + site + str(filters[fil]) + str(types[ttype]) + '.neu'
    raw_file = None

if raw_file is not None:
    if os.path.exists(raw_file):
        rawf = open(raw_file, 'r')
    else:
        print('{"err": "Data not found for ' + site + '/' + source + '/' + fil + '/' + ttype + '/' + neu + '. ' + raw_file +'." }')
        sys.exit()

if os.path.exists(neu_file):
    f = open(neu_file, 'r')
else:
    print('{"err": "Data not found for ' + site + '/' + source + '/' + fil + '/' + ttype + '/' + neu + '. ' + neu_file + '."}')
    if raw_file is not None:
        rawf.close()
    sys.exit()

n_component_idx = None
e_component_idx = None
u_component_idx = None
scaling_factor_idx = None
times = []

plotline_dict = {"color": "green", "dashStyle": "solid", "width": 1}

def parse_component(idx_start, idx_stop, lines):
    component = {'site':site, 'name':name}
    plotlines = []
    for i in range(idx_start, idx_stop):
        if 'component' in str(lines[i]):
            neu = lines[i].split()[1]
            components = {'n': 'north slope(s)', 
                'e': 'east slope(s)',
                'u': 'up slope(s)',
                }
            component['component'] = components.get(neu) + ' (mm/yr)'
        if 'slope' in str(lines[i]):
            component['slope'] = lines[i].split(':')[1].strip()
        if 'offset' in str(lines[i]):
            offset_time = float(lines[i].split('[')[1].split(']')[0])
            plotline = plotline_dict.copy()
            if lines[i][1] == '*':
                plotline['color'] = 'orange'
            plotline['value'] = offset_time
            plotlines.append(plotline)
    component['plotlines'] = plotlines
    return component

def velTerm(t,velMmPerYr,refDecYr,startDate,endDate):
  if t>startDate and t< endDate:
    return(velMmPerYr*(t-refDecYr))
  else:
    return(0.0)

def velCumulative(t,model):
  velTotalTerm = 0
  for a in model['slope']:
     velTotalTerm=velTotalTerm+velTerm(t,a['slopeMmPerYear'],modelTerms['refDecYr'],a['startDate'],a['endDate'])
  return(velTotalTerm)

def annTerm(t,annAmpMm,annPhsDeg,refDecYr):
  annPhsRad=annPhsDeg*math.pi/180
  return(annAmpMm*math.sin(2*math.pi*(t-refDecYr//1)+annPhsRad))

def semiAnnTerm(t,semiAmpMm,semiPhsDeg,refDecYr):
  semiPhsRad=semiPhsDeg*math.pi/180
  return(semiAmpMm*math.sin(4*math.pi*(t-refDecYr//1)+semiPhsRad))

def offsetTerm(t,offsetMm,offsetDecYear):
  if t >= offsetDecYear:
    return(offsetMm)
  else:
    return(0.0)

def expDecayTerm(t,decayAmpMm,tauDays,decayDecYear):
  if t>decayDecYear:
    return(decayAmpMm*(1-math.exp(-1*(t-decayDecYear)*365.25/tauDays)))
  else:
    return(0)

def logDecayTerm(t,decayAmpMm,tauDays,decayDecYear):
  if t>decayDecYear:
    return(decayAmpMm*math.log(1+(t-decayDecYear)*365.25/tauDays))
  else:
    return(0)

def dms2dec(dmsStr):
  [d,m,s]=dmsStr.split()
  dec=float(d)+float(m)/60+float(s)/3600
  return(dec)

def getModelTerms(site,f,source,fil):
    modelTerms={}
    for coord in ["E","N","U"]:
        modelTerms[coord]={}
        modelTerms[coord]["intercept"]={'interceptMm':0.}
        modelTerms[coord]["slope"]=[]
        modelTerms[coord]["expDecay"]=[]
        modelTerms[coord]["logDecay"]=[]
        modelTerms[coord]["coSeisOffset"]=[]
        modelTerms[coord]["nonSeisOffset"]=[]
        modelTerms[coord]["annual"]=[]
        modelTerms[coord]["semiAnnual"]=[]
  
    # url='http://geoapp03.ucsd.edu/gpseDB/coord?op=getModelTerms&source='+source+'&site='+site+'&fil='+fil
    # try:
    #     request=urllib2.Request(url)
    #     response=urllib2.urlopen(request)
    # except:
    #     raise Exception('Could not access model terms from ' + url)
    # modelTermsOp=response.read().decode('utf-8').split("\n")

    f.seek(0)
    modelTermsOp=f.read().splitlines()

    for li in modelTermsOp:
        if len(li) == 0:
            continue
        if li[0] != '#': 
            if 'refDecYr' not in modelTerms:
                modelTerms['refDecYr'] = li.split(' ')[0]
        elif 'Reference position' in li:
            modelTerms['lat']=dms2dec(li[23:38])
            modelTerms['lon']=dms2dec(li[40:56])
            modelTerms['refDecYr']=modelTerms['E']['slope'][0]['startDate']  
        elif 'Latitude' in li and '(DD)' not in li:
            modelTerms['lat']=float(li.split(':')[1])
        elif 'Longitude' in li and '(DD)' not in li:
            modelTerms['lon']=float(li.split(':')[1])
            if modelTerms['lon'] > 180:
                modelTerms['lon'] = modelTerms['lon'] - 360
        elif 'East' in li or 'e component' in li:
            c='E'
        elif 'North' in li or 'n component' in li:
            c='N'
        elif 'Up' in li or 'u component' in li:
            c='U'
        #elif 'intercept' in li:
        #  m=re.search('intercept:\s*(?P<interceptMm>\S+)',li)
        #  modelTerms[c]['intercept']={"interceptMm":float(m.group('interceptMm'))}
        elif 'slope' in li:
          m=re.search('slope\s\d:\s*(?P<slopeMmPerYear>\S+)\s.*?\s\[(?P<startDate>\S+)\]\s.*?\s\[(?P<endDate>\S+)\]',li)
          modelTerms[c]['slope'].append({"slopeMmPerYear":float(m.group('slopeMmPerYear')),"startDate":float(m.group('startDate')),"endDate":float(m.group('endDate'))})
        elif 'offset' in li and 'coseismic' not in li:
          offsetType='nonSeisOffset'
          if li[1] == '*':
            offsetType='coSeisOffset'
          m=re.search('offset\s\d\d?:\s*(?P<Mm>\S+)\s.*?\[(?P<startDate>\S+)\]',li)
          modelTerms[c][offsetType].append({offsetType+'Mm':float(m.group('Mm')),"startDate":float(m.group('startDate'))})
        elif ' decay' in li and 'postseismic' not in li:
          decayType='expDecay'
          if li[1] == '!':
            decayType='logDecay'
          m=re.search('decay\s\d:\s*(?P<MmPerYear>\S+)\s.*?\[(?P<startDate>\S+)\].*?tau:\s*(?P<tauDays>\S+)\s',li)
          modelTerms[c][decayType].append({decayType+'MmPerYear':float(m.group('MmPerYear')),"tauDays":float(m.group('tauDays')),"startDate":float(m.group('startDate'))})
        elif ' annual' in li:
          m=re.search('annual:\s*(?P<annAmpMm>\S+).*?phase:\s*(?P<annPhsDeg>\S+)',li)
          modelTerms[c]['annual'].append({"annAmpMm":float(m.group('annAmpMm')),"annPhsDeg":float(m.group('annPhsDeg'))})
        elif 'semi-annual' in li:
          m=re.search('semi-annual:\s*(?P<semiAmpMm>\S+).*?phase:\s*(?P<semiPhsDeg>\S+)',li)
          modelTerms[c]['semiAnnual'].append({"semiAmpMm":float(m.group('semiAmpMm')),"semiPhsDeg":float(m.group('semiPhsDeg'))})
      
    return(modelTerms)

def modeledCoord(y,model,ttype,coordZero):
    modelPt = 0
    for a in model['annual']:
        modelPt=modelPt+annTerm(y,a['annAmpMm'],a['annPhsDeg'],modelTerms['refDecYr'])
    for a in model['semiAnnual']:
        modelPt=modelPt+semiAnnTerm(y,a['semiAmpMm'],a['semiPhsDeg'],modelTerms['refDecYr'])
    for a in model['expDecay']:
        modelPt=modelPt+expDecayTerm(y,a['expDecayMmPerYear'],a['tauDays'],a['startDate'])
    for a in model['logDecay']:
        modelPt=modelPt+logDecayTerm(y,a['logDecayMmPerYear'],a['tauDays'],a['startDate'])
  
    # Hang on to offset term; will want it for plotting estimated points
    offsetTotal=0.
    try:
        for a in model['coSeisOffset']:
            offsetTotal=offsetTotal+offsetTerm(y,a['coSeisOffsetMm'],a['startDate'])
        #for a in model['nonSeisOffset']:
        #    offsetTotal=offsetTotal+offsetTerm(y,a['coSeisOffsetMm'],a['startDate'])
    except KeyError:
        #No offsets of that type
        pass
  
    if 'raw_' in ttype:
        modelPt=modelPt+offsetTotal+coordZero
    else:
        modelPt=modelPt+offsetTotal
    return(modelPt)

def floatRange(start,stop,step):
  while start < stop:
    yield float(start)
    start += step

def calculate_points(modelTerms, f, neu_component, ttype):
    # modelTermsJSON=json.dumps(modelTerms,sort_keys=True,indent=2)
    # print(modelTermsJSON)

    fn={}
    fn['unf']='Clean'
    fn['flt']='Filter'
    year = []
    coord={}; coord['N']=[]; coord['E']=[]; coord['U']=[]

    f.seek(0)
    for li in f:
        if li.startswith('#') == False and len(li.strip()) > 0:
            num_columns = len(li.split())
            if 'raw_' in ttype:
                if num_columns == 7:
                    [y,n,e,u,x_sig,y_sig,z_sig]=li.rstrip().split()
                else:
                    [y,n,e,u,x_sig,y_sig,z_sig,corr_ne,corr_nu,corr_eu]=li.rstrip().split()[:10]
                coord['N'].append(float(n) * 1000)
                coord['E'].append(float(e) * 1000)
                coord['U'].append(float(u) * 1000)
            elif 'rawm' in ttype:
                if num_columns >9:
                    [y,yyyy,ddd,n,e,u,n_sig,e_sig,u_sig,corr_ne,corr_nu,corr_eu]=li.split()[:12]
                else:
                    [y,yyyy,ddd,n,e,u,n_sig,e_sig,u_sig]=li.split()
                coord['N'].append(float(n) * 1000)
                coord['E'].append(float(e) * 1000)
                coord['U'].append(float(u) * 1000)
            else:
                if num_columns > 9:
                    [y,yyyy,ddd,n,e,u,n_sig,e_sig,u_sig,corr_ne,corr_nu,corr_eu]=li.split()[:12]
                else:
                    [y,yyyy,ddd,n,e,u,n_sig,e_sig,u_sig]=li.split()
                coord['N'].append(float(n))
                coord['E'].append(float(e))
                coord['U'].append(float(u))
            year.append(float(y))

    c = neu_component
    ix=0
    deTrend=[]
    trend=[]
   
    modelDeTrend=[]
    modelTrend=[]
    if c in modelTerms:
      model=modelTerms[c]
    for y in year:
      if c in modelTerms:
  
          modelPt = modeledCoord(y,model,ttype,coord[c][0])

          slopeMmPerYear = 0.
          slopeMmPerYear = model['slope'][-1]['slopeMmPerYear']
          velTotalTerm = velCumulative(y,model)
           
          # Add a line break if outage is detected
          if len(modelDeTrend) > 0:
              if (y - modelDeTrend[-1][0]) > 0.1:
                  for yy in floatRange(modelDeTrend[-1][0],y,1/365.25):
                    modelDeTrend.append([yy,modeledCoord(yy,model,ttype,coord[c][0])])
                    modelTrend.append([yy,modeledCoord(yy,model,ttype,coord[c][0])+velCumulative(yy,model)+modelTerms[c]['intercept']['interceptMm']])
                  #modelDeTrend.append([modelDeTrend[-1][0]+0.1, None])
  
          modelDeTrend.append([y,round(modelPt,2)])
          modelTrend.append([y,round(modelPt+velTotalTerm+modelTerms[c]['intercept']['interceptMm'],2)])
  

      # add back offsets to estimated point, which have been removed in tar file, and remove velocity term for detrended
      if modelTerms != {}:
        if  'raw_' in ttype or 'rawm' in ttype:
          deTrend.append([y,round((coord[c][ix] - (y - year[0]) * slopeMmPerYear),2)])
        else:
          deTrend.append([y,round((coord[c][ix]),2)])
      if 'resid' not in ttype:
        trend.append([y,round((coord[c][ix]),2)])
      else:
        trend.append([y,round((coord[c][ix]),2)])
        
      ix=ix+1
    try:
      del modelTrend[-1]
    except:
      pass
    if 'detrend' not in ttype:
        try:
          return (trend, [] if 'raw' in ttype or 'resid' in ttype else modelTrend)
        except:
          return (trend,[])
    else:
        try:
          return (deTrend, [] if 'raw' in ttype or 'resid' in ttype else modelDeTrend)
        except:
          return (deTrend,[])


lines = f.readlines()
for idx, line in enumerate(lines):
    line = line.rstrip('\n')
    if str(line).startswith('#') == False and len(line) > 0:
        tokens = line.split()
        time = float(tokens[0])
        times.append(time)
    if 'n component' in line:
        n_component_idx = idx
    if 'e component' in line:
        e_component_idx = idx
    if 'u component' in line:
        u_component_idx = idx
    if 'Scaling factor' in line:
        if scaling_factor_idx is None:
            scaling_factor_idx = idx

try:
  modelTerms = getModelTerms(site,f,str(sources[source]),fil if fil=='flt' else 'unf')
  n_component = parse_component (n_component_idx, e_component_idx-1, lines)
  e_component = parse_component (e_component_idx, u_component_idx-1, lines)
  u_component = parse_component (u_component_idx, scaling_factor_idx, lines)
  time_min = min(times)
  time_max = max(times)
  n_component['time_min'] = time_min
  e_component['time_min'] = time_min
  u_component['time_min'] = time_min
  n_component['time_max'] = time_max
  e_component['time_max'] = time_max
  u_component['time_max'] = time_max

except:
  modelTerms = {}
  n_component = {'site':site, 'name':name, 'plotlines':[]}
  e_component = {'site':site, 'name':name, 'plotlines':[]}
  u_component = {'site':site, 'name':name, 'plotlines':[]}
  if ttype == 'detrend':
    print('{"err": "Cannot detrend ' + site + '/' + source + '/' + fil + '/' + ttype + '/' + neu + '." }')
    sys.exit()

if raw_file is not None: 

    n_component['data'],n_component['trace'] = calculate_points(modelTerms, rawf, 'N', ttype)
    e_component['data'],e_component['trace'] = calculate_points(modelTerms, rawf, 'E', ttype)
    u_component['data'],u_component['trace'] = calculate_points(modelTerms, rawf, 'U', ttype)
    rawf.close()
else:
    n_component['data'],n_component['trace'] = calculate_points(modelTerms, f, 'N', ttype)
    e_component['data'],e_component['trace'] = calculate_points(modelTerms, f, 'E', ttype)
    u_component['data'],u_component['trace'] = calculate_points(modelTerms, f, 'U', ttype)    

data = {}
if 'n' in neu:
    data['n'] = n_component
if 'e' in neu:
    data['e'] = e_component
if 'u' in neu:
    data['u'] = u_component

f.close()
print(json.dumps(data))
sys.exit()
