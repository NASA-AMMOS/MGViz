import L_ from '../Basics/Layers_/Layers_'
import ToolController_ from '../Basics/ToolController_/ToolController_'
import QueryURL from '../Ancillary/QueryURL'
import TimeControl from '../Ancillary/TimeControl'
let L = window.L

var mmgisAPI_ = {
    // Exposes Leaflet map object
    map: null,
    // Initialize the map variable
    fina: function (map_) {
        mmgisAPI_.map = map_.map
        mmgisAPI.map = map_.map
        if( typeof mmgisAPI_.onLoadCallback === 'function' ) mmgisAPI_.onLoadCallback()
    },
    // Returns an array of all features in a given extent
    featuresContained: function () {
        if (!mmgisAPI_.map) {
            console.warn(
                'Warning: Unable to find features contained as the Leaflet map object is not initialized'
            )
        }

        const extent = mmgisAPI_.map.getBounds()
        let features = {}

        // For all MMGIS layers
        for (let key in L_.layersGroup) {
            if (L_.layersGroup[key].hasOwnProperty('_layers')) {
                // For normal layers
                const foundFeatures = findFeaturesInLayer(extent, L_.layersGroup[key])
                features[key] = foundFeatures
            } else if (key.startsWith('DrawTool_') && Array.isArray(L_.layersGroup[key])) {
                // If layer is a DrawTool array of layers
                for (let layer in L_.layersGroup[key]) {
                    let foundFeatures
                    if ('getLayers' in L_.layersGroup[key][layer]) {
                        if (L_.layersGroup[key][layer]?.feature?.properties?.arrow) {
                            // If the DrawTool sublayer is an arrow 
                            foundFeatures = findFeaturesInLayer(extent, L_.layersGroup[key][layer])

                            // As long as one of the layers of the arrow layer is in the current Map bounds,
                            // return the parent arrow layer's feature
                            if (foundFeatures && foundFeatures.length > 0) {
                                foundFeatures = L_.layersGroup[key][layer].feature
                            }
                        } else {
                            // If the DrawTool sublayer is Polygon or Line
                            foundFeatures = findFeaturesInLayer(extent, L_.layersGroup[key][layer])
                        }

                    } else if ('getLatLng' in L_.layersGroup[key][layer]) {
                        // If the DrawTool sublayer is a Point
                        if (isLayerInBounds(L_.layersGroup[key][layer])) {
                            foundFeatures = [L_.layersGroup[key][layer].feature]
                        }
                    } 

                    if (foundFeatures) {
                        features[key] = key in features ? features[key].concat(foundFeatures) : foundFeatures
                    }
                }
            }
        }

        return features;

        function isLayerInBounds(layer) {
            // Use the pixel coordinates instead of latlong as latlong does not work well with polar projections
            const { x: xMapSize, y: yMapSize } = mmgisAPI_.map.getSize()

            const epsilon = 1e-6
            const nw = mmgisAPI_.map.project(extent.getNorthWest())
            const se = mmgisAPI_.map.project(extent.getSouthEast())
            const ne = mmgisAPI_.map.project(extent.getNorthEast())
            const sw = mmgisAPI_.map.project(extent.getSouthWest())

            let _extent
            if (Math.abs((Math.abs(nw.x - se.x) - xMapSize)) < epsilon
                    && Math.abs((Math.abs(nw.y - se.y) - yMapSize)) < epsilon) {
                _extent = L.bounds(nw, se)
            } else {
                _extent = L.bounds(ne, sw)
            }

            let found = false
            if ('getBounds' in layer) {
                const layerBounds = layer.getBounds()
                const nwLayer = mmgisAPI_.map.project(layerBounds.getNorthEast())
                const seLayer = mmgisAPI_.map.project(layerBounds.getSouthWest())
                const _bounds = L.bounds(nwLayer, seLayer)

                if (_extent.intersects(_bounds)) {
                    found = true
                }
            } else if ('getLatLng' in layer) {
                const _latLng = mmgisAPI_.map.project(layer.getLatLng())

                if (_extent.contains(_latLng)) {
                    found = true
                }
            }

            return found
        }

        function findFeaturesInLayer(extent, layer) {
            let features = []
            const layers = layer.getLayers()

            layers.forEach((layer) => {
                const found = isLayerInBounds(layer)

                if (found) {
                    features.push(layer.feature)
                }
            })

            return features
        }
    },
    // Returns the currently active feature (i.e. feature thats clicked and displayed in the InfoTool)
    getActiveFeature: function () {
        const infoTool = ToolController_.getTool('InfoTool')

        if (infoTool.currentLayer && infoTool.currentLayer.feature) {
            const activeFeature = {}
            activeFeature[infoTool.currentLayerName] = [infoTool.currentLayer.feature] 
            return activeFeature
        }

        return null;
    },
    // Returns an object with the visiblity state of all layers
    getVisibleLayers: function () {
        // Also return the visibility of the DrawTool layers
        var drawToolVisibility = {}
        for (let l in L_.layersGroup) {
            if (!(l in L_.toggledArray)) {
                var s = l.split('_')
                var onId = s[1] != 'master' ? parseInt(s[1]) : s[1]
                if (s[0] == 'DrawTool') {
                    drawToolVisibility[l] = ToolController_.getTool('DrawTool').filesOn.indexOf(onId) != -1
                }
            }
        }

        return { ...L_.toggledArray, ...drawToolVisibility }
    },
    // Adds map event listener
    addEventListener: function (eventName, functionReference) {
        const listener = mmgisAPI_.getLeafletMapEvent(eventName)
        if (listener) {
            console.log('Add listener', listener)
            mmgisAPI_.map.addEventListener(listener, functionReference)
        } else {
            console.warn(
                'Warning: Unable to add event listener for ' +
                    eventName
            )
        }
    },
    // Removes map event listener added using the MMGIS API
    removeEventListener: function (eventName, functionReference) {
        const listener = mmgisAPI_.getLeafletMapEvent(eventName)
        if (listener) {
            console.log('Remove listener', listener)
            mmgisAPI_.map.removeEventListener(listener, functionReference)
        } else {
            console.warn(
                'Warning: Unable to remove event listener for ' +
                    eventName
            )
        }
    },
    getLeafletMapEvent: function (eventName) {
        if (eventName === 'onPan') {
            return 'dragend'
        } else if (eventName === 'onZoom') {
            return 'zoomend'
        } else if (eventName === 'onClick') {
            return 'click'
        }
        return null 
    },
    writeCoordinateURL: function() {
        return QueryURL.writeCoordinateURL(false);
    },
    onLoadCallback: null,
    onLoaded: function(onLoadCallback) {
        mmgisAPI_.onLoadCallback = onLoadCallback
    },
}

var mmgisAPI = {
    /**
     * Clears a layer with a specified name
     * @param {string} - layerName - name of layer to clear
     */
    clearVectorLayer: L_.clearVectorLayer,
    /**
     * Updates a specified layer with GeoJSON data
     * @param {string} - layerName - name of layer to update
     * @param {GeoJSON} - inputData - valid GeoJSON data
     * @param {number} - keepN - number of features to keep. A value less than or equal to 0 keeps all previous features
     */
    updateVectorLayer: L_.updateVectorLayer,

    // Time Control API functions

    /**
     * This function toggles the visibility of ancillary Time Control User Interface.
     * It is useful in situations where time functions are controlled by an external application.
     * @param {boolean} - Whether to turn the TimeUI on or off. If true, makes visible.
     * @returns {boolean} - Whether the TimeUI is now on or off
     */
    toggleTimeUI: TimeControl.toggleTimeUI,

    /**
     * This function sets the global time properties for all of MMGIS.
     * All time enabled layers that are configured to use the `Global` time type will be updated by this function.
     * @param {string} [startTime] - Can be either YYYY-MM-DDThh:mm:ssZ if absolute or hh:mm:ss or seconds if relative
     * @param {string} [endTime] - Can be either YYYY-MM-DDThh:mm:ssZ if absolute or hh:mm:ss or seconds if relative
     * @param {boolean} [isRelative=false] - If true, startTime and endTime are relative to currentTime
     * @param {string} [timeOffset=0] - Offset of currentTime; Can be either hh:mm:ss or seconds
     * @returns {boolean} - Whether the time was successfully set
     */
    setTime: TimeControl.setTime,

    /** This function sets the start and end time for a single layer.
     * It will override the global time for that layer.
     * @param {string} [layerName]
     * @param {string} [startTime] - YYYY-MM-DDThh:mm:ssZ
     * @param {string} [endTime] - YYYY-MM-DDThh:mm:ssZ
     * @returns {boolean} - Whether the time was successfully set
     */
    setLayerTime: TimeControl.setLayerTime,
    
    /** 
     * @returns {string} - The current time on the map with offset included
     */
    getTime: TimeControl.getTime,

    /** 
     * @returns {string} - The start time on the map with offset included
     */   
    getStartTime: TimeControl.getStartTime,

    /** 
     * @returns {string} - The end time on the map with offset included
     */  
    getEndTime: TimeControl.getEndTime,

    /** 
     * @param {string} [layerName]
     * @returns {string} - The start time for an individual layer
     */   
    getLayerStartTime: TimeControl.getLayerStartTime,
 
    /** 
     * @param {string} [layerName]
     * @returns {string} - The end time for an individual layer
     */  
    getLayerEndTime: TimeControl.getLayerEndTime,

    /** reloadTimeLayers will reload every time enabled layer
     * @returns {array} - A list of layers that were reloaded
     */
     reloadTimeLayers: TimeControl.reloadTimeLayers,

    /** reloadLayer will reload a given time enabled layer
     * @param {string} [layerName]
     * @returns {boolean} - Whether the layer was successfully reloaded
     */
    reloadLayer: TimeControl.reloadLayer,

    /** setLayersTimeStatus - will set the status color for all global time enabled layers
     * @param {string} [color]
     * @returns {array} - A list of layers that were set
     */    
    setLayersTimeStatus: TimeControl.setLayersTimeStatus,

    /** setLayerTimeStatus - will set the status color for the given layer
      * @param {string} [layerName]
      * @param {string} [color]
      * @returns {boolean} - True if time status was successfully set
     */    
    setLayerTimeStatus: TimeControl.setLayerTimeStatus,

    /** updateLayersTime - will synchronize every global time enabled layer with global times.
     * Probably should be a private function, but could be useful for edge cases when things
     * may need to be re-synchronized.
     * @returns {array} - A list of layers that were reloaded
     */
     updateLayersTime: TimeControl.updateLayersTime,

    /** map - exposes Leaflet map object.
     * @returns {object} - The Leaflet map object 
     */
     map: null,

    /** featuresContained - returns an array of all features in the current map view.
     * @returns {object} - An object containing layer names as keys and values as arrays with all features (as GeoJson Feature objects) contained in the current map view
     */
    featuresContained: mmgisAPI_.featuresContained,

     /** getActiveFeature - returns the currently active feature (i.e. feature thats clicked and displayed in the InfoTool)
     * @returns {object} - The currently selected active feature as an object with the layer name as key and value as an array containing the GeoJson Feature object (MMGIS only allows the section of a single feature).
     */
    getActiveFeature: mmgisAPI_.getActiveFeature,

     /** getVisibleLayers - returns an object with the visiblity state of all layers
     * @returns {object} - an object containing the visibility state of each layer
     */
    getVisibleLayers: mmgisAPI_.getVisibleLayers,

    /** addEventListener - adds map event listener.
     * @param {string} - eventName - name of event to add listener to. Available events: onPan, onZoom, onClick
     * @param {function} - functionReference - function reference to listener event callback function. null value removes all functions for a given eventName

     */
    addEventListener: mmgisAPI_.addEventListener,

    /** removeEventListener - removes map event listener added using the MMGIS API. 
     * @param {string} - eventName - name of event to add listener to. Available events: onPan, onZoom, onClick
     * @param {function} - functionReference - function reference to listener event callback function. null value removes all functions for a given eventName
     */
    removeEventListener: mmgisAPI_.removeEventListener,

    /** writeCoordinateURL - writes out the current view as a url. This returns the long form of
     * the 'Copy Link' feature and does not save a short url to the database.
     * @returns {string} - a string containing the current view as a url
     */
    writeCoordinateURL: mmgisAPI_.writeCoordinateURL,

    /** onLoaded - calls onLoadCallback as a function once MMGIS has finished loading.
     * @param {function} - onLoadCallback - function reference to function that is called when MMGIS is finished loading
     */
    onLoaded: mmgisAPI_.onLoaded,
}

window.mmgisAPI = mmgisAPI

export { mmgisAPI_, mmgisAPI }