import $ from 'jquery'
import * as d3 from 'd3'
import F_ from '../Formulae_/Formulae_'
import L_ from '../Layers_/Layers_'
import { captureVector } from '../Layers_/LayerCapturer'
import {
    constructVectorLayer,
    constructSublayers,
} from '../Layers_/LayerConstructors'
import Viewer_ from '../Viewer_/Viewer_'
import Globe_ from '../Globe_/Globe_'
import ToolController_ from '../ToolController_/ToolController_'
import CursorInfo from '../../Ancillary/CursorInfo'
import Description from '../../Ancillary/Description'
import QueryURL from '../../Ancillary/QueryURL'
import { Kinds } from '../../../pre/tools'
import DataShaders from '../../Ancillary/DataShaders'
import calls from '../../../pre/calls'
import TimeControl from '../../Ancillary/TimeControl'

import gjv from 'geojson-validation'

let L = window.L

let essenceFina = function () {}

let Map_ = {
    //Our main leaflet map variable
    map: null,
    toolbar: null,
    tempOverlayImage: null,
    activeLayer: null,
    allLayersLoadedPassed: false,
    player: { arrow: null, lookat: null },
    vectorExaggeration: 1,
    vectorFilter: null,
    vectorOptions: null,
    //Initialize a map based on a config file
    init: function (essenceFinal) {
        essenceFina = essenceFinal

        //Repair Leaflet and plugin incongruities
        L.DomEvent._fakeStop = L.DomEvent.fakeStop

        //var fakeStop = L.DomEvent.fakeStop || L.DomEvent._fakeStop || stop;?
        /*
            var xhr = new XMLHttpRequest();
            try {
              xhr.open("GET", 'Missions/MTTT/Layers/TEMP/M2020_EDL_bufpoints_3m_geo/12/2929/1834.pbf');
              xhr.responseType = "arraybuffer";
              xhr.onerror = function() {
                console.log("Network error")
              };
              xhr.onload = function() {
                if (xhr.status === 200) {
                    var data = new Pbf(new Uint8Array(xhr.response)).readFields(readData, {});

                    console.log( data )

                    function readData(tag, data, pbf) {
                        if (tag === 1) data.name = pbf.readString();
                        else if (tag === 2) data.version = pbf.readVarint();
                        //else if (tag === 3) data.layer = pbf.readMessage(readLayer, {});
                    }
                    function readLayer(tag, layer, pbf) {
                        if (tag === 1) layer.name = pbf.readString();
                        else if (tag === 3) layer.size = pbf.readVarint();
                    }
                }
                else console.log(xhr.statusText);
                
              };
              xhr.send();
            } catch (err) {
              console.log(err.message)
            }
            */

        var hasZoomControl = false
        if (L_.configData.look && L_.configData.look.zoomcontrol)
            hasZoomControl = true

        Map_.mapScaleZoom = L_.configData.msv.mapscale || null

        if (this.map != null) this.map.remove()

        let shouldFade = true

        if (
            L_.configData.projection &&
            L_.configData.projection.custom === true
        ) {
            var cp = L_.configData.projection
            //console.log(cp)
            var crs = new L.Proj.CRS(
                Number.isFinite(parseInt(cp.epsg[0]))
                    ? `EPSG:${cp.epsg}`
                    : cp.epsg,
                cp.proj,
                {
                    origin: [
                        parseFloat(cp.origin[0]),
                        parseFloat(cp.origin[1]),
                    ],
                    resolutions: cp.res,
                    bounds: L.bounds(
                        [parseFloat(cp.bounds[0]), parseFloat(cp.bounds[1])],
                        [parseFloat(cp.bounds[2]), parseFloat(cp.bounds[3])]
                    ),
                },
                parseFloat(L_.configData.msv.radius.major)
            )
            crs.projString = cp.proj

            this.map = L.map('map', {
                zoomControl: hasZoomControl,
                editable: true,
                crs: crs,
                zoomDelta: 0.05,
                zoomSnap: 0,
                fadeAnimation: shouldFade,
                //wheelPxPerZoomLevel: 500,
            })

            window.mmgisglobal.customCRS = crs
        } else {
            //Make the empty map and turn off zoom controls
            this.map = L.map('map', {
                zoomControl: hasZoomControl,
                editable: true,
                continuousWorld: true,
                worldCopyJump: true
            })
            // Default CRS
            const projString = `+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +a=${F_.radiusOfPlanetMajor} +b=${F_.radiusOfPlanetMinor} +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`
            window.mmgisglobal.customCRS = new L.Proj.CRS(
                'EPSG:3857',
                projString,
                null,
                F_.radiusOfPlanetMajor
            )
            window.mmgisglobal.customCRS.projString = projString
        }

        if (this.map.zoomControl) this.map.zoomControl.setPosition('topright')

        if (Map_.mapScaleZoom) {
            L.control
                .scalefactor({
                    radius: parseInt(L_.configData.msv.radius.major),
                    mapScaleZoom: Map_.mapScaleZoom,
                })
                .addTo(this.map)
        }

        //Initialize the view to that set in config
        if (L_.FUTURES.mapView != null) {
            this.resetView(L_.FUTURES.mapView)
            if (L_.FUTURES.centerPin != null) {
                this._centerPin = new L.circleMarker(
                    [L_.FUTURES.mapView[0], L_.FUTURES.mapView[1]],
                    {
                        fillColor: '#000',
                        fillOpacity: 0,
                        color: 'lime',
                        weight: 2,
                    }
                )
                    .setRadius(4)
                    .addTo(this.map)
                if (
                    L_.FUTURES.centerPin.length > 0 &&
                    L_.FUTURES.centerPin != 'true'
                ) {
                    this._centerPin.on('mouseover', function () {
                        CursorInfo.update(L_.FUTURES.centerPin, null, false)
                    })
                    this._centerPin.on('mouseout', function () {
                        CursorInfo.hide()
                    })
                }
            }
        } else {
            this.resetView(L_.view)
        }

        //Remove attribution
        d3.select('.leaflet-control-attribution').remove()

        //Make our layers
        makeLayers(L_.layers.dataFlat)

        //Just in case we have no layers
        allLayersLoaded()

        //Add a graticule
        if (L_.configData.look && L_.configData.look.graticule == true) {
            this.toggleGraticule(true)
        }

        //When done zooming, hide the things you're too far out to see/reveal the things you're close enough to see
        this.map.on('zoomend', function () {
            L_.enforceVisibilityCutoffs()

            // Set all zoom elements
            $('.map-autoset-zoom').text(Map_.map.getZoom())
        })

        this.map.on('move', (e) => {
            const c = this.map.getCenter()
            Globe_.controls.link.linkMove(c.lng, c.lat)
        })
        this.map.on('mousemove', (e) => {
            Globe_.controls.link.linkMouseMove(e.latlng.lng, e.latlng.lat)
        })
        this.map.on('mouseout', (e) => {
            Globe_.controls.link.linkMouseOut()
        })

        // Clear the selected feature if clicking on the map where there are no features
        Map_.map.addEventListener('click', clearOnMapClick)

        //Build the toolbar
        buildToolBar()

        //Set the time for any time enabled layers
        TimeControl.updateLayersTime()

        //Open Chart tool
        ToolController_.makeTool( 'ChartTool' )
    },
    toggleGraticule: function (on) {
        if (on)
            this.graticule = L.latlngGraticule({
                showLabel: true,
                color: 'rgba(255,255,255,0.75)',
                weight: 1,
                zoomInterval: [
                    { start: 2, end: 3, interval: 40 },
                    { start: 4, end: 5, interval: 20 },
                    { start: 6, end: 7, interval: 10 },
                    { start: 8, end: 9, interval: 5 },
                    { start: 10, end: 11, interval: 0.4 },
                    { start: 12, end: 13, interval: 0.2 },
                    { start: 14, end: 15, interval: 0.1 },
                    { start: 16, end: 17, interval: 0.01 },
                    { start: 18, end: 19, interval: 0.005 },
                    { start: 20, end: 21, interval: 0.0025 },
                    { start: 21, end: 30, interval: 0.00125 },
                ],
            }).addTo(Map_.map)
        else {
            this.rmNotNull(this.graticule)
            this.graticule = null
        }
    },
    clear: function () {
        this.map.eachLayer(function (layer) {
            Map_.map.removeLayer(layer)
        })

        this.toolbar = null
        this.tempOverlayImage = null
        this.activeLayer = null
        this.allLayersLoadedPassed = false
        this.player = { arrow: null, lookat: null }
    },
    setZoomToMapScale() {
        this.map.setZoom(this.mapScaleZoom)
    },
    //Focuses the map on [lat, lon, zoom]
    resetView: function (latlonzoom, stopNextMove) {
        //Uses Leaflet's setView
        var lat = parseFloat(latlonzoom[0])
        if (isNaN(lat)) lat = 0
        var lon = parseFloat(latlonzoom[1])
        if (isNaN(lon)) lon = 0
        var zoom = parseInt(latlonzoom[2])
        if (zoom == null || isNaN(zoom))
            zoom =
                this.map.getZoom() ||
                L_.configData.msv.mapscale ||
                L_.configData.msv.view[2]
        this.map.setView([lat, lon], zoom)
        this.map.invalidateSize()
    },
    //returns true if the map has the layer
    hasLayer: function (layername) {
        if (L_.layers.layer[layername]) {
            return Map_.map.hasLayer(L_.layers.layer[layername])
        }
        return false
    },
    //adds a temp tile layer to the map
    tempTileLayer: null,
    changeTempTileLayer: function (url) {
        this.removeTempTileLayer()
        this.tempTileLayer = L.tileLayer(url, {
            minZoom: 0,
            maxZoom: 25,
            maxNativeZoom: 25,
            tms: true, //!!!
            noWrap: true,
            continuousWorld: true,
            reuseTiles: true,
        }).addTo(this.map)
    },
    //removes that layer
    removeTempTileLayer: function () {
        this.rmNotNull(this.tempTileLayer)
    },
    //Removes the map layer if it isnt null
    rmNotNull: function (layer) {
        if (layer != null) {
            this.map.removeLayer(layer)
            layer = null
        }
    },
    //Redraws all layers, starting with the bottom one
    orderedBringToFront: function () {
        let hasIndex = []
        let hasIndexRaster = []

        for (let i = L_._layersOrdered.length - 1; i >= 0; i--) {
            if (Map_.hasLayer(L_._layersOrdered[i])) {
                if (L_.layers.data[L_._layersOrdered[i]]) {
                    if (
                        L_.layers.data[L_._layersOrdered[i]].type === 'vector'
                    ) {
                        if (L_.layers.attachments[L_._layersOrdered[i]]) {
                            for (let s in L_.layers.attachments[
                                L_._layersOrdered[i]
                            ]) {
                                Map_.rmNotNull(
                                    L_.layers.attachments[L_._layersOrdered[i]][
                                        s
                                    ].layer
                                )
                            }
                        }
                        Map_.map.removeLayer(
                            L_.layers.layer[L_._layersOrdered[i]]
                        )
                        hasIndex.push(i)
                    } else if (
                        L_.layers.data[L_._layersOrdered[i]].type === 'tile' ||
                        L_.layers.data[L_._layersOrdered[i]].type === 'data'
                    ) {
                        hasIndexRaster.push(i)
                    }
                }
            }
        }

        // First only vectors
        for (let i = 0; i < hasIndex.length; i++) {
            if (L_.layers.attachments[L_._layersOrdered[hasIndex[i]]]) {
                for (let s in L_.layers.attachments[
                    L_._layersOrdered[hasIndex[i]]
                ]) {
                    if (
                        L_.layers.attachments[L_._layersOrdered[hasIndex[i]]][s]
                            .on
                    ) {
                        if (
                            L_.layers.attachments[
                                L_._layersOrdered[hasIndex[i]]
                            ][s].type !== 'model'
                        ) {
                            Map_.map.addLayer(
                                L_.layers.attachments[
                                    L_._layersOrdered[hasIndex[i]]
                                ][s].layer
                            )
                        }
                    }
                }
            }
            Map_.map.addLayer(L_.layers.layer[L_._layersOrdered[hasIndex[i]]])
        }

        L_.enforceVisibilityCutoffs()

        // Now only rasters
        // They're separate because its better to only change the raster z-index
        for (let i = 0; i < hasIndexRaster.length; i++) {
            L_.layers.layer[L_._layersOrdered[hasIndexRaster[i]]].setZIndex(
                L_._layersOrdered.length +
                    1 -
                    L_._layersOrdered.indexOf(
                        L_._layersOrdered[hasIndexRaster[i]]
                    )
            )
        }
    },
    refreshLayer: async function (layerObj) {
        // We need to find and remove all points on the map that belong to the layer
        // Not sure if there is a cleaner way of doing this
        for (var i = L_._layersOrdered.length - 1; i >= 0; i--) {
            if (
                L_.layers.data[L_._layersOrdered[i]] &&
                L_.layers.data[L_._layersOrdered[i]].type in ['vector', 'vectortile'] &&
                L_.layers.data[L_._layersOrdered[i]].name == layerObj.name
            ) {
                const wasOn = L_.layers.on[layerObj.name]
                if (wasOn) L_.toggleLayer(L_.layers.data[layerObj.name]) // turn off if on
                // fake on
                L_.layers.on[layerObj.name] = true
                await makeLayer(layerObj, true)
                L_.addVisible(Map_, [layerObj.name])

                // turn off if was off
                if (wasOn) L_.layers.on[layerObj.name] = false
                L_.toggleLayer(L_.layers.data[layerObj.name]) // turn back on/off

                L_.enforceVisibilityCutoffs()
                return
            }
        }
        // use old method for Velocities
        if (layerObj.display_name == 'Velocities') {
            this.map.eachLayer( function (layer) {
                if (layer.vtId == 'site') {
                    // Need to overcome some weirdness with points not being removed
                    Map_.map.removeLayer( layer );
                }
            });
            Map_.allLayersLoadedPassed = false;
            makeLayer(layerObj);
            allLayersLoaded();            
        }
    },
    setPlayerArrow(lng, lat, rot) {
        var playerMapArrowOffsets = [
            [0.06, 0],
            [-0.04, 0.04],
            [-0.02, 0],
            [-0.04, -0.04],
        ]
        var playerMapArrowPolygon = []

        if (Map_.map.hasLayer(Map_.player.arrow))
            Map_.map.removeLayer(Map_.player.arrow)
        var scalar = 512 / Math.pow(2, Map_.map.getZoom())
        var rotatedOffsets
        for (var i = 0; i < playerMapArrowOffsets.length; i++) {
            rotatedOffsets = F_.rotatePoint(
                {
                    x: playerMapArrowOffsets[i][0],
                    y: playerMapArrowOffsets[i][1],
                },
                [0, 0],
                -rot
            )
            playerMapArrowPolygon.push([
                lat + scalar * rotatedOffsets.x,
                lng + scalar * rotatedOffsets.y,
            ])
        }
        Map_.player.arrow = L.polygon(playerMapArrowPolygon, {
            color: 'lime',
            opacity: 1,
            lineJoin: 'miter',
            weight: 2,
        }).addTo(Map_.map)
    },
    setPlayerLookat(lng, lat) {
        if (Map_.map.hasLayer(Map_.player.lookat))
            Map_.map.removeLayer(Map_.player.lookat)
        if (lat && lng) {
            Map_.player.lookat = new L.circleMarker([lat, lng], {
                fillColor: 'lime',
                fillOpacity: 0.75,
                color: 'lime',
                opacity: 1,
                weight: 2,
            })
                .setRadius(5)
                .addTo(Map_.map)
        }
    },
    hidePlayer(hideArrow, hideLookat) {
        if (hideArrow !== false && Map_.map.hasLayer(Map_.player.arrow))
            Map_.map.removeLayer(Map_.player.arrow)
        if (hideLookat !== false && Map_.map.hasLayer(Map_.player.lookat))
            Map_.map.removeLayer(Map_.player.lookat)
    },
    getScreenDiagonalInMeters() {
        let bb = document.getElementById('map').getBoundingClientRect()
        let nwLatLng = Map_.map.containerPointToLatLng([0, 0])
        let seLatLng = Map_.map.containerPointToLatLng([bb.width, bb.height])
        return F_.lngLatDistBetween(
            nwLatLng.lng,
            nwLatLng.lat,
            seLatLng.lng,
            seLatLng.lat
        )
    },
    getCurrentTileXYZs() {
        const bounds = Map_.map.getBounds()
        const zoom = Map_.map.getZoom()

        const min = Map_.map
                .project(bounds.getNorthWest(), zoom)
                .divideBy(256)
                .floor(),
            max = Map_.map
                .project(bounds.getSouthEast(), zoom)
                .divideBy(256)
                .floor(),
            xyzs = [],
            mod = Math.pow(2, zoom)

        for (var i = min.x; i <= max.x; i++) {
            for (var j = min.y; j <= max.y; j++) {
                var x = ((i % mod) + mod) % mod
                var y = ((j % mod) + mod) % mod
                var coords = new L.Point(x, y)
                coords.z = zoom
                xyzs.push(coords)
            }
        }

        return xyzs
    },
    makeLayer: makeLayer,
    makeLayers: makeLayers,
    allLayersLoaded: allLayersLoaded,
}

//Takes an array of layer objects and makes them map layers
function makeLayers(layersObj) {
    //Make each layer (backwards to maintain draw order)
    for (var i = layersObj.length - 1; i >= 0; i--) {
        makeLayer(layersObj[i])
    }
}
//Takes the layer object and makes it a map layer
async function makeLayer(layerObj, evenIfOff, forceGeoJSON) {
    //Decide what kind of layer it is
    //Headers do not need to be made
    if (layerObj.type != 'header') {
        //Simply call the appropriate function for each layer type
        switch (layerObj.type) {
            case 'vector':
                await makeVectorLayer(evenIfOff, null, forceGeoJSON)
                break
            case 'tile':
                makeTileLayer()
                break
            case 'vectortile':
                makeVectorTileLayer()
                break
            case 'query':
                await makeVectorLayer(false, true, forceGeoJSON)
                break
            case 'data':
                makeDataLayer()
                break
            case 'model':
                //Globe only
                makeModelLayer()
                break
            default:
                console.warn('Unknown layer type: ' + layerObj.type)
        }
    }

    //Default is onclick show full properties and onhover show 1st property
    Map_.onEachFeatureDefault = onEachFeatureDefault
    function onEachFeatureDefault(feature, layer) {
        const pv = L_.getLayersChosenNamePropVal(feature, layer)

        layer['useKeyAsName'] = Object.keys(pv)[0]
        if (
            layer.hasOwnProperty('options') &&
            layer.options.hasOwnProperty('layerName')
        ) {
            L_.layers.data[layer.options.layerName].useKeyAsName =
                layer['useKeyAsName']
        }

        if (typeof layer['useKeyAsName'] === 'string') {
            //Add a mouseover event to the layer
            layer.on('mouseover', function () {
                //Make it turn on CursorInfo and show name and value
                CursorInfo.update(pv, null, false)
            })
            //Add a mouseout event
            layer.on('mouseout', function () {
                //Make it turn off CursorInfo
                CursorInfo.hide()
            })
        }

        if (
            !(
                feature.style &&
                feature.style.hasOwnProperty('noclick') &&
                feature.style.noclick
            )
        ) {
            //Add a click event to send the data to the info tab
            layer.on('click', (e) => {
                featureDefaultClick(feature, layer, e)
            })
        }
    }

    Map_.featureDefaultClick = featureDefaultClick
    function featureDefaultClick(feature, layer, e) {
        if (
            ToolController_.activeTool &&
            ToolController_.activeTool.disableLayerInteractions === true
        )
            return

        //Query dataset links if possible and add that data to the feature's properties
        if (
            layer.options.layerName &&
            L_.layers.data[layer.options.layerName] &&
            L_.layers.data[layer.options.layerName].variables &&
            L_.layers.data[layer.options.layerName].variables.datasetLinks
        ) {
            const dl =
                L_.layers.data[layer.options.layerName].variables.datasetLinks
            let dlFilled = dl
            for (let i = 0; i < dlFilled.length; i++) {
                dlFilled[i].search = F_.getIn(
                    layer.feature.properties,
                    dlFilled[i].prop.split('.')
                )
            }

            calls.api(
                'datasets_get',
                {
                    queries: JSON.stringify(dlFilled),
                },
                function (data) {
                    const d = data.body
                    for (let i = 0; i < d.length; i++) {
                        if (d[i].type == 'images') {
                            layer.feature.properties.images =
                                layer.feature.properties.images || []
                            for (let j = 0; j < d[i].results.length; j++) {
                                layer.feature.properties.images.push(
                                    d[i].results[j]
                                )
                            }
                            //remove duplicates
                            layer.feature.properties.images =
                                F_.removeDuplicatesInArrayOfObjects(
                                    layer.feature.properties.images
                                )
                        } else {
                            layer.feature.properties._data = d[i].results
                        }
                    }
                    keepGoing()
                },
                function (data) {
                    keepGoing()
                }
            )
        } else {
            keepGoing()
        }

        function keepGoing() {
            L_.setLastActivePoint(layer)
            layer.setStyle({ fillColor: 'red' })
            Map_.activeLayer = layer
            Description.updatePoint(Map_.activeLayer)

            //Updates for ChartTool
            if (ToolController_.activeToolName != 'ChartTool') {
                var prevActive = $( '#toolcontroller_incdiv .active' );
                prevActive.removeClass( 'active' ).css( { 'color': ToolController_.defaultColor, 'background': 'none' } );
                prevActive.parent().css( { 'background': 'none' } );
                var newActive = $( '#toolcontroller_incdiv #ChartTool' );
                newActive.addClass( 'active' ).css( { 'color': ToolController_.activeColor } );
                newActive.parent().css( { 'background': ToolController_.activeBG } );
                ToolController_.makeTool( 'ChartTool' );
            }
            if (ToolController_.getTool( 'ChartTool' ).append == false) {
                L_.resetLayerFills();
            }
            // get a list of already selected sites
            var sites = [];
            if($('#siteSelect').val() != null) {
                $("#siteSelect option").each(function(){
                    sites.push($(this).val());
                });
            }
            var pv = L_.getLayersChosenNamePropVal(feature, layer)
            if (sites.includes(pv.site)) { // unselect previously selected
                layer.setStyle({ fillColor: layerObj.style.fillColor});
                layer.setRadius(layerObj.radius);
                ToolController_.getTool( 'ChartTool' ).remove( feature );
            } else {
                layer.setStyle({ fillColor: 'magenta' });
                layer.setRadius(9);
                ToolController_.getTool( 'ChartTool' ).use( feature );
            }
            
            //View images
            var propImages = propertiesToImages(
                feature.properties,
                layer.options.metadata
                    ? layer.options.metadata.base_url || ''
                    : ''
            )

            // Kinds.use(
            //     L_.layers.data[layerObj.name].kind,
            //     Map_,
            //     feature,
            //     layer,
            //     layer.options.layerName,
            //     propImages,
            //     e
            // )

            //update url
            if (layer != null && layer.hasOwnProperty('options')) {
                var keyAsName
                if (layer.hasOwnProperty('useKeyAsName')) {
                    keyAsName = layer.feature.properties[layer.useKeyAsName]
                } else {
                    keyAsName = layer.feature.properties[0]
                }
            }

            Viewer_.changeImages(propImages, feature, layer)
            for (var i in propImages) {
                if (propImages[i].type == 'radargram') {
                    //Globe_.radargram( layer.options.layerName, feature.geometry, propImages[i].url, propImages[i].length, propImages[i].depth );
                    break
                }
            }

            //figure out how to construct searchStr in URL. For example: a ChemCam target can sometime
            //be searched by "target sol", or it can be searched by "sol target" depending on config file.
            var searchToolVars = L_.getToolVars('search')
            var searchfields = {}
            if (searchToolVars.hasOwnProperty('searchfields')) {
                for (var layerfield in searchToolVars.searchfields) {
                    var fieldString = searchToolVars.searchfields[layerfield]
                    fieldString = fieldString.split(')')
                    for (var i = 0; i < fieldString.length; i++) {
                        fieldString[i] = fieldString[i].split('(')
                        var li = fieldString[i][0].lastIndexOf(' ')
                        if (li != -1) {
                            fieldString[i][0] = fieldString[i][0].substring(
                                li + 1
                            )
                        }
                    }
                    fieldString.pop()
                    //0 is function, 1 is parameter
                    searchfields[layerfield] = fieldString
                }
            }

            var str = ''
            if (searchfields.hasOwnProperty(layer.options.layerName)) {
                var sf = searchfields[layer.options.layerName] //sf for search field
                for (var i = 0; i < sf.length; i++) {
                    str += sf[i][1]
                    str += ' '
                }
            }
            str = str.substring(0, str.length - 1)

            var searchFieldTokens = str.split(' ')
            var searchStr

            if (searchFieldTokens.length == 2) {
                if (
                    searchFieldTokens[0].toLowerCase() ==
                    layer.useKeyAsName.toLowerCase()
                ) {
                    searchStr = keyAsName + ' ' + layer.feature.properties.Sol
                } else {
                    searchStr = layer.feature.properties.Sol + ' ' + keyAsName
                }
            }

            QueryURL.writeSearchURL([searchStr], layer.options.layerName)
        }
    }

    //Pretty much like makePointLayer but without the pointToLayer stuff
    async function makeVectorLayer(evenIfOff, useEmptyGeoJSON, forceGeoJSON) {
        return new Promise((resolve, reject) => {
            if (forceGeoJSON) add(forceGeoJSON)
            else
                captureVector(
                    layerObj,
                    { evenIfOff: evenIfOff, useEmptyGeoJSON: useEmptyGeoJSON },
                    add
                )

            function add(data) {
                // []
                if (Array.isArray(data) && data.length === 0) {
                    data = { type: 'FeatureCollection', features: [] }
                }
                // [<FeatureCollection>]
                else if (
                    Array.isArray(data) &&
                    data[0] &&
                    data[0].type === 'FeatureCollection'
                ) {
                    const nextData = { type: 'FeatureCollection', features: [] }
                    data.forEach((fc) => {
                        if (fc.type === 'FeatureCollection')
                            nextData.features = nextData.features.concat(
                                fc.features
                            )
                    })
                    data = nextData
                }

                let invalidGeoJSONTrace = gjv.valid(data, true)
                const allowableErrors = [`position must only contain numbers`]
                invalidGeoJSONTrace = invalidGeoJSONTrace.filter((t) => {
                    if (typeof t !== 'string') return false
                    for (let i = 0; i < allowableErrors.length; i++) {
                        if (t.toLowerCase().indexOf(allowableErrors[i]) != -1)
                            return false
                    }
                    return true
                })
                if (
                    data == null ||
                    data === 'off' ||
                    invalidGeoJSONTrace.length > 0
                ) {
                    if (data != null && data != 'off') {
                        data = null
                        console.warn(
                            `ERROR: ${layerObj.display_name} has invalid GeoJSON!`
                        )
                    }
                    L_._layersLoaded[
                        L_._layersOrdered.indexOf(layerObj.name)
                    ] = true
                    L_.layers.layer[layerObj.name] = data == null ? null : false
                    allLayersLoaded()
                    resolve()
                    return
                }

                layerObj.style = layerObj.style || {}
                layerObj.style.layerName = layerObj.name

                layerObj.style.opacity = L_.layers.opacity[layerObj.name]
                //layerObj.style.fillOpacity = L_.layers.opacity[layerObj.name]

                const vl = constructVectorLayer(
                    data,
                    layerObj,
                    onEachFeatureDefault,
                    Map_
                )
                L_.layers.attachments[layerObj.name] = vl.sublayers
                L_.layers.layer[layerObj.name] = vl.layer

                d3.selectAll('.' + F_.getSafeName(layerObj.name)).data(
                    data.features
                )
                L_._layersLoaded[
                    L_._layersOrdered.indexOf(layerObj.name)
                ] = true
                allLayersLoaded()

                resolve()
            }
        })
    }

    function makeTileLayer() {
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl
        var bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        var tileFormat = 'tms'
        // For backward compatibility with the .tms option
        if (typeof layerObj.tileformat === 'undefined') {
            tileFormat =
                typeof layerObj.tms === 'undefined' ? true : layerObj.tms
            tileFormat = tileFormat ? 'tms' : 'wmts'
        } else tileFormat = layerObj.tileformat

        L_.layers.layer[layerObj.name] = L.tileLayer.colorFilter(layerUrl, {
            minZoom: layerObj.minZoom,
            maxZoom: layerObj.maxZoom,
            maxNativeZoom: layerObj.maxNativeZoom,
            tileFormat: tileFormat,
            tms: tileFormat === 'tms',
            //noWrap: true,
            continuousWorld: true,
            reuseTiles: true,
            bounds: bb,
            timeEnabled:
                layerObj.time != null && layerObj.time.enabled === true,
            time: typeof layerObj.time === 'undefined' ? '' : layerObj.time.end,
            compositeTile:
                typeof layerObj.time === 'undefined'
                    ? false
                    : layerObj.time.compositeTile || false,
            starttime:
                typeof layerObj.time === 'undefined' ? '' : layerObj.time.start,
            endtime:
                typeof layerObj.time === 'undefined' ? '' : layerObj.time.end,
        })

        L_.setLayerOpacity(layerObj.name, L_.layers.opacity[layerObj.name])

        L_._layersLoaded[L_._layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }

    function makeVectorTileLayer() {
        var geoJSON = '';
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl

        let urlSplit = layerObj.url.split(':')

        if (
            urlSplit[0].toLowerCase() === 'geodatasets' &&
            urlSplit[1] != null
        ) {
            layerUrl =
                `${
                    window.mmgisglobal.ROOT_PATH || ''
                }/api/geodatasets/get?layer=${urlSplit[1]}` +
                '&type=mvt&x={x}&y={y}&z={z}'
        }
        else {
            $.ajax( {
                type:'GET',
                url: layerUrl,
                dataType: 'json',
                async: false,
                success: function(data) {
                    geoJSON = data;
                }, 
                error: function (jqXHR, textStatus, errorThrown) {
                //Tell the console council about what happened
                console.warn(
                    'ERROR! ' +
                        textStatus +
                        ' in ' +
                        layerObj.url +
                        ' /// ' +
                        errorThrown
                )
                //Say that this layer was loaded, albeit erroneously
                L_.layersLoaded[
                    L_.layersOrdered.indexOf(layerObj.name)
                ] = true
                //Check again to see if all layers have loaded
                allLayersLoaded()
                }
            });
        }

        var bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        var clearHighlight = function () {
            for (let l of Object.keys(L_.layers.data)) {
                if (L_.layers.layer[l]) {
                    var highlight = L_.layers.layer[l].highlight
                    if (highlight) {
                        L_.layers.layer[l].resetFeatureStyle(highlight)
                    }
                    L_.layers.layer[l].highlight = null
                }
            }
        }
        var timedSelectTimeout = null
        var timedSelect = function (layer, layerName, e) {
            clearTimeout(timedSelectTimeout)
            timedSelectTimeout = setTimeout(
                (function (layer, layerName, e) {
                    return function () {
                        let ell = { latlng: null }
                        if (e.latlng != null)
                            ell.latlng = JSON.parse(JSON.stringify(e.latlng))

                        Kinds.use(
                            L_.layers.data[layerName].kind,
                            Map_,
                            L_.layers.layer[layerName].activeFeatures[0],
                            layer,
                            layerName,
                            null,
                            ell
                        )

                        ToolController_.getTool('InfoTool').use(
                            layer,
                            layerName,
                            L_.layers.layer[layerName].activeFeatures,
                            null,
                            null,
                            null,
                            ell
                        )
                        L_.layers.layer[layerName].activeFeatures = []
                    }
                })(layer, layerName, e),
                100
            )
        }

        switch ( layerObj.display_name ) {
            case 'Sites Global View':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                            return {
                                "color": "#0000FF",
                                "fill": true,
                                "fillColor": "#00FFFF",
                                "fillOpacity": 1,
                                "opacity": 0.5,
                                "radius": 4,
                                "weight": 1
                            }
                        }
                }
            break;
            case 'Historical Significant':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                          var radius = 1 * properties.mag;
                          if (properties.mag > 6) {
                            radius = radius + (Math.pow(properties.mag,3)/200)
                          }
                            return {
                              "color": "#000000",
                              "fill": true,
                              "fillColor": "#FF4400",
                              "fillOpacity": 0.8,
                              "opacity": 1,
                              "radius": radius,
                              "weight": 1
                            }
                        }
                }
            break;
            case 'Historical Moderate':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                          var radius = 1 * properties.mag;
                            return {
                              "color": "#000000",
                              "fill": true,
                              "fillColor": "#FF8C00",
                              "fillOpacity": 0.9,
                              "opacity": 1,
                              "radius": radius,
                              "weight": 1
                            }
                        }
                }
            break;
            case 'Recent Significant':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                          var radius = 1 * properties.mag;
                          if (properties.mag > 6) {
                            radius = radius + (Math.pow(properties.mag,3)/200)
                          }
                            return {
                              "color": "#000000",
                              "fill": true,
                              "fillColor": "#FF8C00",
                              "fillOpacity": 0.9,
                              "opacity": 1,
                              "radius": radius,
                              "weight": 1
                            }
                        }
                }
            break;
            case 'Recent M3-M6':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                          var radius = 1 * properties.mag;
                            return {
                              "color": "#000000",
                              "fill": true,
                              "fillColor": "#FF8C00",
                              "fillOpacity": 0.9,
                              "opacity": 1,
                              "radius": radius,
                              "weight": 1
                            }
                        }
                }
            break;
            case 'Recent M2-M3':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                          var radius = 1 * properties.mag;
                            return {
                              "color": "#000000",
                              "fill": true,
                              "fillColor": "#FFD700",
                              "fillOpacity": 1,
                              "opacity": 1,
                              "radius": radius,
                              "weight": 1
                            }
                        }
                }
            break;
            case 'Velocities':
                layerObj.style.vtLayer = {
                    "sliced": 
                        function(properties, zoom) {
                            var n = parseFloat(properties.n_vel);
                            var e = parseFloat(properties.e_vel);
                            var u = parseFloat(properties.u_vel);
                            var hide = false
                            if (Map_.vectorFilter == 'greater') { // Don't display points < 20 in any direction
                                if (Map_.vectorOptions == 'vertical') {
                                    if ((Math.abs(u)>=20) == false) {
                                        hide  = true
                                    }
                                } else {
                                    if ((Math.abs(n)>=20 || Math.abs(e)>=20) == false) {
                                        hide = true
                                    }
                                }
                            }
                            if (Map_.vectorOptions == 'vertical') {
                                var magScale = 2 * Map_.vectorExaggeration;
                                var logScaledU = Math.log(Math.abs(u) * 100);
                                var icon = 'Missions/MGViz/Images/arrow-inc-blue.png';
                                var yAnchor = 0;
                                if (u < 0) {
                                    icon = 'Missions/MGViz/Images/arrow-inc-blue.png';
                                    yAnchor = 0;
                                } else if (u > 0) {
                                    icon = 'Missions/MGViz/Images/arrow-inc-red.png';
                                    yAnchor = (magScale * logScaledU)*2;
                                }
                                var smallIcon = new L.Icon({
                                    iconSize: hide ? 0 : [magScale * logScaledU, (magScale * logScaledU)*2],
                                    iconAnchor: [(magScale * logScaledU)/2, yAnchor],
                                    iconUrl: icon
                                });
                                return {
                                    icon: smallIcon
                                };
                            } else {
                                var mag = Math.sqrt((n*n) + (e*e));
                                var magScale = 1.5 * Map_.vectorExaggeration;
                                var iconsize = (magScale * mag);
                                if (iconsize > 150) {
                                    iconsize = 150; // cap at 50
                                }
                                else if (iconsize < 20) {
                                    iconsize = 20; // min 20
                                }
                                var angle = Math.atan2(e,n) * (180 / Math.PI);
                                var deg = (Math.round(angle));
                                if (deg < 0) {
                                    deg = 360 + deg;
                                }
                                var smallIcon = new L.Icon({
                                    iconSize: hide ? 0 : [iconsize, iconsize],
                                    iconAnchor: [iconsize/2, iconsize/2],
                                    iconUrl: 'Missions/MGViz/Images/arrows/arrow-'+deg+'.png'
                                });
                                return {
                                    icon: smallIcon
                                };
                            }
                        }
                }
            break;
        }
        var vectorTileOptions = {
            layerName: layerObj.display_name,
            rendererFactory: ('Velocities' == layerObj.display_name) ? L.canvas.tile : L.svg.tile,
            vectorTileLayerStyles: layerObj.style.vtLayer || {},
            interactive: true,
            buffer: 1000,
            minZoom: layerObj.minZoom,
            maxZoom: layerObj.maxZoom,
            maxNativeZoom: layerObj.maxNativeZoom,
            getFeatureId: (function (vtId) {
                return function (f) {
                    if (
                        f.properties.properties &&
                        typeof f.properties.properties === 'string'
                    ) {
                        f.properties = JSON.parse(f.properties.properties)
                    }
                    return f.properties[vtId]
                }
            })(layerObj.style.vtId),
        }
        if ('sliced' in layerObj.style.vtLayer) {
            L_.layers.layer[layerObj.name] = L.vectorGrid.slicer(geoJSON, vectorTileOptions);
            // Set all vector tile points on top with same z index so that they're all selectable
            L_.layers.layer[layerObj.name].setZIndex(999999);
        } else {
            L_.layers.layer[layerObj.name] = L.vectorGrid
                .protobuf(layerUrl, vectorTileOptions)
                .on('click', function (e) {
                    let layerName = e.sourceTarget._layerName
                    let vtId = L_.layers.layer[layerName].vtId
                    clearHighlight()
                    L_.layers.layer[layerName].highlight = e.layer.properties[vtId]

                    L_.layers.layer[layerName].setFeatureStyle(
                        L_.layers.layer[layerName].highlight,
                        {
                            weight: 2,
                            color: 'red',
                            opacity: 1,
                            fillColor: 'red',
                            fill: true,
                            radius: 4,
                            fillOpacity: 1,
                        }
                    )
                    L_.layers.layer[layerName].activeFeatures =
                        L_.layers.layer[layerName].activeFeatures || []
                    L_.layers.layer[layerName].activeFeatures.push({
                        type: 'Feature',
                        properties: e.layer.properties,
                        geometry: {},
                    })

                    Map_.activeLayer = e.sourceTarget._layer
                    if (Map_.activeLayer) L_.Map_._justSetActiveLayer = true

                    let p = e.sourceTarget._point

                    for (var i in e.layer._renderer._features) {
                        if (
                            e.layer._renderer._features[i].feature._pxBounds.min
                                .x <= p.x &&
                            e.layer._renderer._features[i].feature._pxBounds.max
                                .x >= p.x &&
                            e.layer._renderer._features[i].feature._pxBounds.min
                                .y <= p.y &&
                            e.layer._renderer._features[i].feature._pxBounds.max
                                .y >= p.y &&
                            e.layer._renderer._features[i].feature.properties[
                                vtId
                            ] != e.layer.properties[vtId]
                        ) {
                            L_.layers.layer[layerName].activeFeatures.push({
                                type: 'Feature',
                                properties:
                                    e.layer._renderer._features[i].feature
                                        .properties,
                                geometry: {},
                            })
                        }
                    }

                    timedSelect(e.sourceTarget._layer, layerName, e)
                    L.DomEvent.stop(e)
                })
        }
        L_.layers.layer[layerObj.name].on(
            'mouseover',
            (function (vtKey) {
                return function (e, a, b, c) {
                    if (e.layer.properties['title'] != null) {
                        CursorInfo.update(
                            e.layer.properties['title'] + '<br>' +
                            'Depth: ' + e.layer.properties['depth'] + ' km' + '<br>' +
                            new Date(e.layer.properties.time).toUTCString() + '<br>' +
                            $('#mouseLngLat').text(),
                            null,
                            false,
                            null,
                            null,
                            null,
                            true
                        )
                    }
                    else if (e.layer.properties['n_vel'] != null) {
                        var values = 'N vel: ' + e.layer.properties.n_vel + ' mm/yr<br> E vel: ' + e.layer.properties.e_vel +
                        ' mm/yr<br> U vel: ' + e.layer.properties.u_vel + ' mm/yr';
                        CursorInfo.update( 'Site: ' + e.layer.properties.site + '<br>' +
                                                    values, null, false, null, null, null, true);
                    }
                    else if (vtKey != null) {
                        CursorInfo.update(
                            vtKey + ': ' + e.layer.properties[vtKey],
                            null,
                            false
                        )
                    }
                }
            })(layerObj.style.vtKey)
        )
        .on('mouseout', function () {
            CursorInfo.hide()
        })

        L_.layers.layer[layerObj.name].vtId = layerObj.style.vtId
        L_.layers.layer[layerObj.name].vtKey = layerObj.style.vtKey

        L_.setLayerOpacity(layerObj.name, L_.layers.opacity[layerObj.name])

        L_._layersLoaded[L_._layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }

    function makeModelLayer() {
        L_._layersLoaded[L_._layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }

    function makeDataLayer() {
        let layerUrl = layerObj.demtileurl
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl

        let bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        const shader = F_.getIn(layerObj, 'variables.shader') || {}
        const shaderType = shader.type || 'image'

        var uniforms = {}
        for (let i = 0; i < DataShaders[shaderType].settings.length; i++) {
            uniforms[DataShaders[shaderType].settings[i].parameter] =
                DataShaders[shaderType].settings[i].value
        }

        L_.layers.layer[layerObj.name] = L.tileLayer.gl({
            options: {
                tms: true,
                bounds: bb,
            },
            fragmentShader: DataShaders[shaderType].frag,
            tileUrls: [layerUrl],
            pixelPerfect: true,
            uniforms: uniforms,
        })

        if (DataShaders[shaderType].attachImmediateEvents) {
            DataShaders[shaderType].attachImmediateEvents(layerObj.name, shader)
        }

        L_.setLayerOpacity(layerObj.name, L_.layers.opacity[layerObj.name])

        L_._layersLoaded[L_._layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }
}

//Because some layers load faster than others, check to see if
// all our layers were loaded before moving on
function allLayersLoaded() {
    if (!Map_.allLayersLoadedPassed) {
        //Only continues if all layers have been loaded
        for (var i = 0; i < L_._layersLoaded.length; i++) {
            if (L_._layersLoaded[i] == false) {
                return
            }
        }
        Map_.allLayersLoadedPassed = true

        //Then do these
        essenceFina()
        L_.addVisible(Map_)
        L_.enforceVisibilityCutoffs()

        ToolController_.finalizeTools()

        L_.loaded()
        //OTHER TEMPORARY TEST STUFF THINGS

        // Turn on legend if displayOnStart is true
        if ('LegendTool' in ToolController_.toolModules) {
            if (
                ToolController_.toolModules['LegendTool'].displayOnStart == true
            ) {
                ToolController_.toolModules['LegendTool'].make(
                    'toolContentSeparated_Legend'
                )
                let _event = new CustomEvent('toggleSeparatedTool', {
                    detail: {
                        toggledToolName: 'LegendTool',
                        visible: true,
                    },
                })
                document.dispatchEvent(_event)
            }
        }
        // Turn on search if displayOnStart is true
        if ('SearchTool' in ToolController_.toolModules) {
            if (
                ToolController_.toolModules['SearchTool'].displayOnStart == true
            ) {
                ToolController_.toolModules['SearchTool'].make(
                    'toolContentSeparated_Search'
                )
                let _event = new CustomEvent('toggleSeparatedTool', {
                    detail: {
                        toggledToolName: 'SearchTool',
                        visible: true,
                    },
                })
                document.dispatchEvent(_event)
            }
        }
    }
}

function propertiesToImages(props, baseUrl) {
    baseUrl = baseUrl || ''
    var images = []
    //Use "images" key first
    if (props.hasOwnProperty('images')) {
        for (var i = 0; i < props.images.length; i++) {
            if (props.images[i].url) {
                var url = baseUrl + props.images[i].url
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                if (props.images[i].isModel) {
                    images.push({
                        url: url,
                        texture: props.images[i].texture,
                        name:
                            (props.images[i].name ||
                                props.images[i].url.match(/([^\/]*)\/*$/)[1]) +
                            ' [Model]',
                        type: 'model',
                        isPanoramic: false,
                        isModel: true,
                        values: props.images[i].values || {},
                        master: props.images[i].master,
                    })
                } else {
                    if (props.images[i].isPanoramic) {
                        images.push({
                            ...props.images[i],
                            url: url,
                            name:
                                (props.images[i].name ||
                                    props.images[i].url.match(
                                        /([^\/]*)\/*$/
                                    )[1]) + ' [Panoramic]',
                            type: 'photosphere',
                            isPanoramic: true,
                            isModel: false,
                            values: props.images[i].values || {},
                            master: props.images[i].master,
                        })
                    }
                    images.push({
                        url: url,
                        name:
                            props.images[i].name ||
                            props.images[i].url.match(/([^\/]*)\/*$/)[1],
                        type: props.images[i].type || 'image',
                        isPanoramic: false,
                        isModel: false,
                        values: props.images[i].values || {},
                        master: props.images[i].master,
                    })
                }
            }
        }
    }
    //If there isn't one, search all string valued props for image urls
    else {
        for (var p in props) {
            if (
                typeof props[p] === 'string' &&
                props[p].toLowerCase().match(/\.(jpeg|jpg|gif|png|xml)$/) !=
                    null
            ) {
                var url = props[p]
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                images.push({
                    url: url,
                    name: p,
                    isPanoramic: false,
                    isModel: false,
                })
            }
            if (
                typeof props[p] === 'string' &&
                (props[p].toLowerCase().match(/\.(obj)$/) != null ||
                    props[p].toLowerCase().match(/\.(dae)$/) != null)
            ) {
                var url = props[p]
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                images.push({
                    url: url,
                    name: p,
                    isPanoramic: false,
                    isModel: true,
                })
            }
        }
    }

    return images
}

function buildToolBar() {
    d3.select('#mapToolBar').html('')

    Map_.toolBar = d3
        .select('#mapToolBar')
        .append('div')
        .attr('class', 'row childpointerevents')
        .style('height', '100%')
    Map_.toolBar
        .append('div')
        .attr('id', 'scaleBarBounds')
        .style('width', '270px')
        .style('height', '36px')
        .append('svg')
        .attr('id', 'scaleBar')
        .attr('width', '270px')
        .attr('height', '36px')
}

function clearOnMapClick(event) {
    // Skip if ChartTool is being used
    if (ToolController_.activeToolName == 'ChartTool') {
        return
    }

    if (Map_._justSetActiveLayer) {
        Map_._justSetActiveLayer = false
        return
    }
    // Skip if there is no actively selected feature
    if (!Map_.activeLayer) {
        return
    }

    if ('latlng' in event) {
        // Position of clicked element
        const latlng = event.latlng

        let found = false
        // For all MMGIS layers
        for (let key in L_.layers.layer) {
            if (L_.layers.layer[key] === false || L_.layers.layer[key] == null)
                continue
            let layers

            // Layers can be a LayerGroup or an array of LayerGroup
            if ('getLayers' in L_.layers.layer[key]) {
                layers = L_.layers.layer[key].getLayers()
            }

            if (Array.isArray(L_.layers.layer[key])) {
                layers = L_.layers.layer[key]
            }

            for (let k in layers) {
                const layer = layers[k]
                if (!layer) continue
                if ('getLayers' in layer) {
                    const _layer = layer.getLayers()
                    for (let x in _layer) {
                        found = checkBounds(_layer[x])
                        // We should bubble down further for layers that have no fill, as it is possible
                        // for there to be layers with features under the transparent fill
                        if (found) {
                            if (layer.options.fill) {
                                break
                            } else {
                                found = false
                            }
                        }
                    }
                } else {
                    found = checkBounds(layer)
                    if (found) {
                        // We should bubble down further for layers that have no fill, as it is possible
                        // for there to be layers with features under the transparent fill
                        if (layer.options.fill) {
                            break
                        } else {
                            found = false
                        }
                    }
                }

                if (found) break
            }

            if (found) {
                // If a clicked feature is found, break out early because MMGIS can only select
                // a single feature at a time (i.e. no group select)
                break
            }

            function checkBounds(layer) {
                if (
                    layer.feature &&
                    layer.feature.geometry.type.toLowerCase() === 'polygon'
                ) {
                    if (
                        L.leafletPip.pointInLayer(
                            [latlng.lng, latlng.lat],
                            layer
                        ).length > 0
                    )
                        return true
                } else if ('getBounds' in layer) {
                    // Use the pixel bounds because longitude/latitude conversions for bounds
                    // may be odd in the case of polar projections
                    if (
                        layer._pxBounds &&
                        layer._pxBounds.contains(event.layerPoint)
                    ) {
                        return true
                    }
                } else if ('getLatLng' in layer) {
                    // A latlng is a latlng, regardless of the projection type
                    // WARNING: This is imperfect because the click latlng and marker center latlng
                    // can differ but still intersect
                    if (layer.getLatLng().equals(latlng)) {
                        return true
                    }
                }
                return false
            }
        }

        // If no feature was selected by this click event, clear the currently selected item
        if (!found) {
            L_.setActiveFeature(null)
        }
    }
}

export default Map_
