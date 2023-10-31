// TimeControl sets up a div that displays the time controller
import * as d3 from 'd3'
import * as moment from 'moment'
import $ from 'jquery'
import F_ from '../Basics/Formulae_/Formulae_'
import L_ from '../Basics/Layers_/Layers_'
import Map_ from '../Basics/Map_/Map_'
import TimeUI from './TimeUI'

import './TimeControl.css'

// Can be either hh:mm:ss or just seconds
const relativeTimeFormat = new RegExp(
    /^(-?)(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]$/
)

var TimeControl = {
    enabled: false,
    isRelative: true,
    currentTime: null,
    timeOffset: '01:00:00',
    startTime: null,
    endTime: null,
    relativeStartTime: '01:00:00',
    relativeEndTime: '00:00:00',
    globalTimeFormat: null,
    _updateLockedForAcceptingInput: false,
    timeUI: null,
    init: function () {
        if (L_.configData.time && L_.configData.time.enabled === true) {
            TimeControl.enabled = true
            TimeControl.globalTimeFormat = d3.utcFormat(
                L_.configData.time.format
            )
        } else {
            $('#toggleTimeUI').css({ display: 'none' })
            $('#CoordinatesDiv').css({ marginRight: '0px' })
            return
        }

        TimeControl.timeUI = TimeUI.init(timeInputChange, TimeControl.enabled)

        //updateTime()

        initLayerTimes()
        initLayerDataTimes()
    },
    fina: function () {
        if ((TimeControl.enabled = true && TimeControl.timeUI != null))
            TimeControl.timeUI.fina()
    },
    setTime: function (
        startTime,
        endTime,
        isRelative,
        timeOffset = '00:00:00',
        currentTime
    ) {
        if (!TimeControl.enabled || startTime == null || endTime == null)
            return false

        const now = new Date()
        let offset = 0
        if (relativeTimeFormat.test(timeOffset)) {
            offset = parseTime(timeOffset)
        } else {
            // assume seconds otherwise
            offset = parseInt(timeOffset)
        }
        if (currentTime != null) {
            const currentTimeD = new Date(currentTime)
            TimeControl.currentTime =
                currentTimeD.toISOString().split('.')[0] + 'Z'
            currentTime = new moment(currentTimeD)
        } else {
            currentTime = new moment(now).add(offset, 'seconds')
            TimeControl.currentTime =
                currentTime.toDate().toISOString().split('.')[0] + 'Z'
        }

        if (isRelative == true) {
            const start = parseTime(startTime)
            const end = parseTime(endTime)
            const startTimeM = new moment(currentTime).subtract(
                start,
                'seconds'
            )
            const endTimeM = new moment(currentTime).add(end, 'seconds')

            TimeControl.startTime = startTimeM.toISOString().split('.')[0] + 'Z'
            TimeControl.endTime = endTimeM.toISOString().split('.')[0] + 'Z'
        } else {
            const startTimeD = new Date(startTime)
            const endTimeD = new Date(endTime)
            TimeControl.startTime = startTimeD.toISOString().split('.')[0] + 'Z'
            TimeControl.endTime = endTimeD.toISOString().split('.')[0] + 'Z'
        }

        TimeControl.timeUI.updateTimes(
            TimeControl.startTime,
            TimeControl.endTime,
            TimeControl.currentTime
        )
        return true
    },
    setLayerTime: function (layer, startTime, endTime) {
        if (typeof layer == 'string') {
            layer = L_.asLayerUUID(layer)
            layer = L_.layers.data[layer]
        }
        if (layer.time && layer.time.enabled == true) {
            layer.time.start = startTime
            layer.time.end = endTime
            d3.select('.starttime.' + F_.getSafeName(layer.name)).text(
                layer.time.start
            )
            d3.select('.endtime.' + F_.getSafeName(layer.name)).text(
                layer.time.end
            )

            if (layer.type == 'tile') {
                TimeControl.setLayerWmsParams(layer)
            }
        }
        return true
    },
    getTime: function () {
        return TimeControl.currentTime
    },
    getStartTime: function () {
        return TimeControl.startTime
    },
    getEndTime: function () {
        return TimeControl.endTime
    },
    getLayerStartTime: function (layer) {
        if (typeof layer == 'string') {
            layer = L_.asLayerUUID(layer)
            layer = L_.layers.data[layer]
        }
        if (layer.time) return layer.time.start
        return false
    },
    getLayerEndTime: function (layer) {
        if (typeof layer == 'string') {
            layer = L_.asLayerUUID(layer)
            layer = L_.layers.data[layer]
        }
        if (layer.time) return layer.time.end
        return false
    },
    reloadLayer: async function (layer, evenIfOff, evenIfControlled) {
        // reload layer
        if (typeof layer == 'string') {
            layer = L_.asLayerUUID(layer)
            layer = L_.layers.data[layer]
        }

        if (L_.layers.layer[layer.name] === null) return

        var layerTimeFormat = d3.utcFormat(layer.time.format)
        layer.time.current = TimeControl.currentTime // keeps track of when layer was refreshed

        if (layer.type === 'tile') {
            if (layer.time && layer.time.enabled === true) {
                TimeControl.setLayerWmsParams(layer)
            }
            if (evenIfControlled === true || layer.controlled !== true) {
                if (L_.layers.on[layer.name] || evenIfOff) {
                    L_.layers.layer[layer.name].refresh()
                }
            }
        } else {
            var originalUrl = layer.url

            // replace start/endtime keywords
            if (layer.time && layer.time.enabled === true) {
                if (
                    layer.time.type === 'global' ||
                    layer.time.type === 'requery'
                ) {
                    layer.url = layer.url
                        .replace(
                            /{starttime}/g,
                            layerTimeFormat(Date.parse(layer.time.start))
                        )
                        .replace(
                            /{endtime}/g,
                            layerTimeFormat(Date.parse(layer.time.end))
                        )
                }
            }
            if (
                layer.type === 'vector' &&
                layer.time.type === 'local' &&
                layer.time.endProp != null
            ) {
                if (evenIfControlled === true || layer.controlled !== true)
                    L_.timeFilterVectorLayer(
                        layer.name,
                        new Date(layer.time.start).getTime(),
                        new Date(layer.time.end).getTime()
                    )
            } else {
                // refresh map
                if (evenIfControlled === true || layer.controlled !== true)
                    if (L_.layers.on[layer.name] || evenIfOff) {
                        await Map_.refreshLayer(layer)
                    }
                // put start/endtime keywords back
                if (layer.time && layer.time.enabled === true)
                    layer.url = originalUrl
            }
        }

        return true
    },
    reloadTimeLayers: function () {
        // refresh time enabled layers
        var reloadedLayers = []
        for (let layerName in L_.layers.data) {
            const layer = L_.layers.data[layerName]
            if (layer.time && layer.time.enabled === true) {
                TimeControl.reloadLayer(layer)
                reloadedLayers.push(layer.name)
            }
        }
        return reloadedLayers
    },
    updateLayersTime: function () {
        var updatedLayers = []
        for (let layerName in L_.layers.data) {
            const layer = L_.layers.data[layerName]
            if (layer.time && layer.time.enabled === true) {
                layer.time.start = TimeControl.startTime
                layer.time.end = TimeControl.currentTime
                d3.select('.starttime.' + F_.getSafeName(layer.name)).text(
                    layer.time.start
                )
                d3.select('.endtime.' + F_.getSafeName(layer.name)).text(
                    layer.time.end
                )
                updatedLayers.push(layer.name)
                if (layer.type === 'tile') {
                    TimeControl.setLayerWmsParams(layer)
                }
            }
        }
        return updatedLayers
    },
    setLayerTimeStatus: function (layer, color) {
        if (typeof layer == 'string') {
            layer = L_.asLayerUUID(layer)
            layer = L_.layers.data[layer]
        }
        if (layer.time) {
            layer.time.status = color
            d3.select('#timesettings' + F_.getSafeName(layer.name)).style(
                'color',
                layer.time.status
            )
        }
        return true
    },
    setLayersTimeStatus: function (color) {
        var updatedLayers = []
        for (let layerName in L_.layers.data) {
            const layer = L_.layers.data[layerName]
            if (
                layer.time &&
                layer.time.enabled === true &&
                (layer.time.type === 'global' || layer.time.type === 'requery')
            ) {
                TimeControl.setLayerTimeStatus(layer, color)
                updatedLayers.push(layer.name)
            }
        }
        return updatedLayers
    },
    setLayerWmsParams: function (layer) {
        var layerTimeFormat = d3.utcFormat(layer.time.format)
        const l = L_.layers.layer[layer.name]

        if (l != null && layer.type === 'tile') {
            l.options.time = layerTimeFormat(Date.parse(layer.time.end))
            l.options.starttime = layerTimeFormat(Date.parse(layer.time.start))
            l.options.endtime = layerTimeFormat(Date.parse(layer.time.end))
        }
    },
}

function initLayerDataTimes() {
    for (let i in L_.layers.dataFlat) {
        const layer = L_.layers.dataFlat[i]
        if (layer.time && layer.time.enabled === true) {
            layer.time.start = L_.FUTURES.startTime
                ? L_.FUTURES.startTime.toISOString().split('.')[0] + 'Z'
                : TimeControl.startTime
            layer.time.end = L_.FUTURES.endTime
                ? L_.FUTURES.endTime.toISOString().split('.')[0] + 'Z'
                : TimeControl.endTime
        }
    }
}

function initLayerTimes() {
    for (let layerName in L_.layers.data) {
        const layer = L_.layers.data[layerName]
        if (layer.time && layer.time.enabled === true) {
            layer.time.start = L_.FUTURES.startTime
                ? L_.FUTURES.startTime.toISOString().split('.')[0] + 'Z'
                : TimeControl.startTime
            layer.time.end = L_.FUTURES.endTime
                ? L_.FUTURES.endTime.toISOString().split('.')[0] + 'Z'
                : TimeControl.endTime
            d3.select('.starttime.' + F_.getSafeName(layer.name)).text(
                layer.time.start
            )
            d3.select('.endtime.' + F_.getSafeName(layer.name)).text(
                layer.time.end
            )

            // Make sure to set the WMS parameters for WMS layers,
            // otherwise the first load will not have the WMS parameters
            TimeControl.setLayerWmsParams(layer)
        }
    }
}

function timeInputChange(startTime, endTime, currentTime, skipUpdate) {
    TimeControl.startTime = startTime
    TimeControl.currentTime = currentTime == null ? endTime : currentTime
    TimeControl.endTime = endTime

    if (L_?._timeChangeSubscriptions)
        Object.keys(L_._timeChangeSubscriptions).forEach((k) => {
            L_._timeChangeSubscriptions[k]({ startTime, currentTime, endTime })
        })

    if (skipUpdate !== true) {
        // Update layer times and reload
        TimeControl.updateLayersTime()
        TimeControl.reloadTimeLayers()
    }
}

function parseTime(t) {
    if (t.toString().indexOf(':') == -1) {
        return parseInt(t)
    }
    var s = t.split(':')
    var seconds = +s[0].replace('-', '') * 60 * 60 + +s[1] * 60 + +s[2]
    if (t.charAt(0) === '-') {
        seconds = seconds * -1
    }
    return seconds
}

export default TimeControl
