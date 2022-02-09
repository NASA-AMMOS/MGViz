import sys
import os
import os.path
import json
from lxml import etree
import collections
from collections import OrderedDict 
from datetime import datetime

m = collections.OrderedDict() # metadata

# Get args
if str(sys.argv[1]).isalnum():
    site = sys.argv[1]
if str(sys.argv[2]).isalnum():
    source = sys.argv[2]
if str(sys.argv[3]).isalnum():
    fil = sys.argv[3]
if str(sys.argv[4]).isalnum():
    ttype = sys.argv[4]

sources = {'comb' : 'Combination',
        'jpl' : 'JPL',
        'sopac' : 'SOPAC'}

filters = {'flt' : 'Filter',
        'clean' : 'Clean',
        'raw' : 'Raw'}

types = {'detrend' : 'Detrend',
        'trend' : 'Trend',
        'resid' : 'Resid',
        'strain' : 'Strain'}

def dms2dec(dmsStr):
  [d,m,s]=dmsStr.split()
  dec=float(d)+float(m)/60+float(s)/3600
  return(dec)
  
def getModelTerms(site,f,source,fil):
    modelTerms = OrderedDict()
    for coord in ["North","East","Up"]:
        modelTerms[coord]={}
        modelTerms[coord]["RMS"]=[]
        modelTerms[coord]["Slope"]=[]
        modelTerms[coord]["Decay (exponential)"]=[]
        modelTerms[coord]["Decay (logarithmic)"]=[]
        modelTerms[coord]["Offset (coseismic)"]=[]
        modelTerms[coord]["Offset (nonseismic)"]=[]
        modelTerms[coord]["Annual"]=[]
        modelTerms[coord]["Semiannual"]=[]
    f.seek(0)
    modelTermsOp=f.read().splitlines()

#    modelTerms = parseHeader(modelTermsOp,modelTerms)
    for li in modelTermsOp:
        if 'Reference' not in li:
            if 'East' in li or 'e component' in li:
                c='East'
            elif 'North' in li or 'n component' in li:
                c='North'
            elif 'Up' in li or 'u component' in li:
                c='Up'
            elif 'slope' in li:
                modelTerms[c]['Slope'].append(li.split(':',1)[1].strip())
            elif 'offset' in li and 'coseismic' not in li:
                offsetType='Offset (nonseismic)'
                if li[1] == '*':
                    offsetType='Offset (coseismic)'
                modelTerms[c][offsetType].append(li.split(':',1)[1].strip())
            elif ' decay' in li and 'postseismic' not in li:
                decayType='Decay (exponential)'
                if li[1] == '!':
                    decayType='Decay (logarithmic)'
                modelTerms[c][decayType].append(li.split(':',1)[1].strip())
            elif ' annual' in li:
                modelTerms[c]['Annual'].append(li.split(':',1)[1].strip())
            elif 'semi-annual' in li:
                modelTerms[c]['Semiannual'].append(li.split(':',1)[1].strip())    
            elif 'RMS n' in li:
                modelTerms['North']['RMS'].append(li.split(':')[1].split(',')[0] + ' mm')
                modelTerms['East']['RMS'].append(li.split(':')[1].split(',')[1] + ' mm')
                modelTerms['Up']['RMS'].append(li.split(':')[1].split(',')[2] + ' mm')
            elif 'available' in li:
                modelTerms['North']['Model']=['Not available']
                modelTerms['East']['Model']=['Not available']
                modelTerms['Up']['Model']=['Not available']
         
    return(modelTerms)

allModelTerms = OrderedDict()
for sourceKey in sorted(sources.iterkeys()):
    for ft in ['Filter','Clean']:
        model = sources[sourceKey] + ' - ' + ft
        neu_file = 'private/eseses/data/' + sourceKey + '/' + site + ft + 'Detrend.neu'
        if os.path.exists(neu_file):
            neu = open(neu_file, 'r')
            modelTerms = getModelTerms(site, neu, str(sources[sourceKey]), fil if fil=='flt' else 'unf')
            neu.close()
        else:
            modelTerms = OrderedDict()
            for coord in ["North","East","Up"]:
                modelTerms[coord]={}
        allModelTerms[model] = modelTerms

xml_file = 'private/eseses/metadata/' + site + '.xml'
xml = etree.parse(xml_file)
doc = xml.getroot()

indivSiteProcMetadata = doc.findall('.//{http://sopac.ucsd.edu/ns/geodesy/2014}indivSiteProcMetadata')[0]
sopacSiteID = indivSiteProcMetadata.attrib['sopacSiteID']
m['SOPAC Site ID'] = sopacSiteID
m['XML File'] = 'api/eseses/sitexml/' + site + '.xml'

neuMotionModelTerms = doc.findall('.//{http://sopac.ucsd.edu/ns/geodesy/2014}neuMotionModelTerms')[0]
if neuMotionModelTerms is not None:
    refLatLong = neuMotionModelTerms.findall('.//{http://sopac.ucsd.edu/ns/geodesy/2014}refLatLong')
    if len(refLatLong) > 0:
        lat = refLatLong[0].find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}lat').text
        lon = float(refLatLong[0].find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}lon').text)
        if lon > 180:
            lon = (360 - lon) * -1
        elev = refLatLong[0].find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}elev').text
        if lat is not None:
            m['Latitude'] = lat
        if lon is not None:
            m['Longitude'] = str(lon)
        if elev is not None:
            m['Elevation'] = elev
m['Component Terms'] = allModelTerms

equipmentMetadataEntries = list(reversed(doc.findall('.//{http://sopac.ucsd.edu/ns/geodesy/2014}equipmentMetadataEntry')))
equipment = []
for equipmentMetadataEntry in equipmentMetadataEntries:
    e = OrderedDict()
    dateInstalled = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}dateInstalled').text
    dateInstalled = datetime.strptime(dateInstalled, '%Y-%m-%dT%H:%M:%S.%f').strftime('%Y-%m-%d %H:%M')
    if dateInstalled is not None:
        e['Date Installed'] = dateInstalled
    if equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}dateRemoved') is not None:
        dateRemoved = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}dateRemoved').text
        dateRemoved = datetime.strptime(dateRemoved, '%Y-%m-%dT%H:%M:%S.%f').strftime('%Y-%m-%d %H:%M')
        e['Date Removed'] = dateRemoved
    siteProcAntenna = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}siteProcAntenna')
    if siteProcAntenna is not None:
        if 'igsModelCode' in siteProcAntenna.attrib:
            e['Ant Model'] = siteProcAntenna.attrib['igsModelCode']
    siteProcAntDome = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}siteProcAntDome')
    if siteProcAntDome is not None:
        if 'igsModelCode' in siteProcAntDome.attrib:
            e['Ant Dome'] = siteProcAntDome.attrib['igsModelCode']
    antennaHeightInfo = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}antennaHeightInfo')
    if antennaHeightInfo is not None:
        e['Ant Height'] = antennaHeightInfo.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}value').text + antennaHeightInfo.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}value').attrib['uom']
        referencePoint = antennaHeightInfo.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}referencePoint')
        if referencePoint is not None:
            e['Ant Ref Point'] = referencePoint.text
    manufacturerSerialNumber = siteProcAntenna.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}manufacturerSerialNumber')
    if manufacturerSerialNumber is not None:
        e['Ant Serial No.'] = manufacturerSerialNumber.text
    siteProcReceiver = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}siteProcReceiver')
    if siteProcReceiver is not None:
        if 'igsModelCode' in siteProcReceiver.attrib:
            e['Rec Model'] = siteProcReceiver.attrib['igsModelCode']
    firmwareVersion = equipmentMetadataEntry.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}firmwareVersion')
    if firmwareVersion is not None:
        e['Rec Firmware Ver.'] = firmwareVersion.text
    manufacturerSerialNumber = siteProcReceiver.find('.//{http://sopac.ucsd.edu/ns/geodesy/2014}manufacturerSerialNumber')
    if manufacturerSerialNumber is not None:
        e['Rec Serial No.'] = manufacturerSerialNumber.text
    equipment.append(e)
m['Equipment'] = equipment

print(json.dumps(m))
sys.exit()
