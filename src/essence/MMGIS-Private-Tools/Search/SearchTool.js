import $ from 'jquery'
import * as d3 from 'd3'
import jqueryUI from '../../../external/JQuery/jquery-ui'
import Dropy from '../../../external/Dropy/dropy'
import '../../../external/JQuery/jquery.autocomplete'
import * as turf from '@turf/turf'

import F_ from '../../../../src/essence/Basics/Formulae_/Formulae_'
import L_ from '../../../../src/essence/Basics/Layers_/Layers_'
import ToolController_ from '../../../../src/essence/Basics/ToolController_/ToolController_'
import Viewer_ from '../../../../src/essence/Basics/Viewer_/Viewer_'
import Map_ from '../../../../src/essence/Basics/Map_/Map_'
import ChartTool from '../../../../src/essence/MMGIS-Private-Tools/Chart/ChartTool'

import './Search.css'

var markup = [
  "<div id='searchTool' class='flexbetween'>",
  "<div style='padding-left: 8px; padding-right: 8px; color: var(--color-mmgis); line-height: 43px;'>",
    "<i id='searchPolygon' class='mdi mdi-vector-square mdi-18px' style='cursor: pointer;'></i></div>",
  "<select id='searchToolType' style='height: 43px; width: 80px' class='ui dropdown short lower searchToolSelect'>",
  "</select>",
    "<p style='padding-left: 8px; line-height: 43px;'><span id='searchType'>for</span></p>",
  "<div class='ui-widget' style='display: inline-block; padding: 9px 8px 8px 8px;'>",
    "<input id='auto_search' style='color: #111;'></input>",
  "</div>",
  "<p style='line-height: 43px;'>and</p>",
  "<div id='searchToolGo' class='mmgisButton' style='margin-right: 0;'>Go</div>",
  "<div id='searchToolSelect' class='mmgisButton' style='margin-left: 0; margin-right: 0;'>Select</div>",
  "<div id='searchToolBoth' class='mmgisButton' style='margin-left: 0;'>Both</div>",
"</div>"
].join('\n');

  var SearchTool = {
  height: 0,
  width: 600,
  lname: null,
  arrayToSearch: null,
  MMGISInterface: null,
  targetId: null,
  made: false,
  vars: {},
  searchFields: {},
  adjustedFieldUUIDs: [],
  adjustedFieldNames: [],
  crossMarker: {},
  initialize: function () {
    //Get tool variables
    this.vars = L_.getToolVars( 'search' );
    this.displayOnStart = L_.getToolVars('search')['displayOnStart']
    this.justification = L_.getToolVars('search')['justification']
    if (this.justification == 'right') {
        var toolController = d3.select('#toolcontroller_sepdiv')
        var toolContent = d3.select('#toolContentSeparated_Search')
        toolController.style('top', '20px')
        toolController.style('left', null)
        toolController.style('right', '40px')
        toolContent.style('left', '-570px')
        toolContent.style('top', '-40px')
    } 
  },
  init: function() {
    //Get tool variables
  //  this.vars = L_.getToolVars( 'search' );
  //  this.searchFields = makeSearchFields( this.vars );
  //  if( L_.searchStrings != null && L_.searchStrings.length > 0 && L_.searchFile != null ) {
  //    searchWithURLParams();
  //  }
  },
  make: function(targetId ) {
    this.targetId = targetId
    this.MMGISInterface = new interfaceWithMMGIS();

    L_.subscribeOnLayerToggle('SearchTool', () => {
        this.MMGISInterface = new interfaceWithMMGIS()
    })

    this.made = true
  },
  destroy: function() {
    this.MMGISInterface.separateFromMMGIS();
    this.targetId = null
    L_.unsubscribeOnLayerToggle('SearchTool')
    this.made = false
  },
  search: function (forceX, forceSTS) {
    doWithSearch('both', forceX, forceSTS, false);
  },
  remove: function (forceX, forceSTS) {
    doWithSearch('remove', forceX, forceSTS, false);
  },
  searchPoly: function (coords) {
    searchWithin(coords)
  }
};

function interfaceWithMMGIS(classSel) {
  this.separateFromMMGIS = function(){ separateFromMMGIS(); }

  this.vars = L_.getToolVars( 'search' );
  this.searchFields = makeSearchFields( this.vars );
  if( L_.searchStrings != null && L_.searchStrings.length > 0 && L_.searchFile != null ) {
    searchWithURLParams();
  }

  SearchTool.lname = null;
  SearchTool.arrayToSearch = [];


  SearchTool.adjustedFieldUUIDs = []
  SearchTool.adjustedFieldNames = []
  for (let l in SearchTool.searchFields) {
      if (
          L_.layers.data[l] &&
          (L_.layers.data[l].type == 'vector' ||
              L_.layers.data[l].type == 'vectortile')
      ) {
        SearchTool.adjustedFieldUUIDs.push(l)
        SearchTool.adjustedFieldNames.push(L_.layers.data[l].display_name)
      }
  }

  $('#SearchType').html(
      Dropy.construct(SearchTool.adjustedFieldNames, 'Search Layer...', 0)
  )
  Dropy.init($('#SearchType'), function (idx) {
      changeSearchField(SearchTool.adjustedFieldUUIDs[idx])
  })
  changeSearchField(SearchTool.adjustedFieldUUIDs[0])


  let tools = d3.select(
    SearchTool.targetId ? `#${SearchTool.targetId}` : '#toolPanel'
  )
  tools.style('background', 'var(--color-k)')
  tools.selectAll( '*' ).remove();
  tools = tools.append( 'div' )
    .attr('class', 'center aligned middle aligned ui padded grid' )
    .style( 'height', '43px' )
    .html(markup)

  var first = true;
  for( var l in this.searchFields ) {
    if( l == 'Sites' ) {
      d3.select( '#searchToolType' ).append( 'option' )
          .attr( 'value', l )
          .html( l );
      if( first ) {
        changeSearchField( l );
        first = false;
      }
    }
  }
  // $( '#searchToolType' ).dropdown( {
  //   onChange: function( val ) {
  //     changeSearchField( val );
  //   },
  //   direction: 'upward'
  // } );

  d3.select( '#searchToolType' ).on('change', function() {
    changeSearchField(  d3.select(this).property('value') )
  })

  d3.select("#searchPolygon").on("click", searchPolygon);
  d3.select("#searchToolGo").on("click", searchGo);
  d3.select("#searchToolSelect").on("click", searchSelect);
  d3.select("#searchToolBoth").on("click", searchBoth);

  $('#searchToolType').parent().css('width','600px');

  // ESESES customizations
  $('#auto_search').val('site');
  $( "#auto_search" ).focus(function() {
    if ($('#auto_search').val().includes('site') || $('#auto_search').val().includes('lat,lon')) {
      $('#auto_search').val('');
    }
  });
  d3.select( '#searchToolType' ).append( 'option' )
  .attr( 'value', 'Distance' )
  .html( 'Distance' );
  $('#auto_search').select();
  $("#auto_search").keyup(function(event) {
    if (event.keyCode === 13) {
        $("#searchToolBoth").click();
    }
  });
  
  // Clear out any existing crosshairs
  if (typeof SearchTool.crossMarker !== 'undefined') {
    Map_.map.removeLayer(SearchTool.crossMarker);
  };

  function separateFromMMGIS() {
    d3.select("#searchToolGo").on("click", null);
    d3.select("#searchToolSelect").on("click", null);
    d3.select("#searchToolBoth").on("click", null);
    if( $( '#auto_search' ).hasClass( 'ui-autocomplete-input' ) ) {
      $( '#auto_search' ).autocomplete( 'destroy' );
    }

    let tools = d3.select(
      SearchTool.targetId ? `#${SearchTool.targetId}` : '#toolPanel'
    )
    tools.style('background', 'var(--color-k)')
    //Clear it
    tools.selectAll('*').remove()
  }
}

function initializeSearch() {
  $(function() {
    $("#auto_search").autocomplete({
      source: function(request, response) {
        var re = $.ui.autocomplete.escapeRegex(request.term);
        var matcher = new RegExp("\\b" + re, "i");
        var a = $.grep(SearchTool.arrayToSearch, function(item,index) {
            return matcher.test(item);
        } );
        response(a);
      },
      //drop up
      position: { my: 'left bottom', at: 'left top', collision: 'flip' }

    });
    $(".ui-autocomplete").css(
      {
        'max-height': '40vh',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'border': 'none',
        'background-color': 'rgba(34,37,38,0.6)'
      }
    ).addClass( 'mmgisScrollbar' );
  });
}

function changeSearchField( val ) {
  if( Map_ != null ) {
    SearchTool.lname = val;
    var searchFile = L_.layers.layer[L_.asLayerUUID(L_.asLayerUUID('Sites'))].url
    // var searchFile = L_.layersNamed['Sites'].url;

    if (val == 'Sites') {
      $('#auto_search').val('site');
      $('#searchType').html('for')
    } else if (val == 'Distance') {
      $('#auto_search').val('lat,lon (33,-117)');
      $('#searchType').html("<input id='distance_search' style='color: #111; width:40px' title='Distance in km' value='25'></input> km")
    }

    // $.getJSON( L_.missionPath + searchFile, function(data) {
    $.getJSON( searchFile, function(data) {
      SearchTool.arrayToSearch = [];
      var props;
      for(var i = 0; i < data.features.length; i++){
        props = data.features[i].properties;
        SearchTool.arrayToSearch.push(props.site);
        SearchTool.arrayToSearch.push( getSearchFieldStringForFeature( SearchTool.lname, props ) );
      }
      if( document.getElementById( 'auto_search') != null) {
        document.getElementById( 'auto_search' ).placeholder = getSearchFieldKeys( SearchTool.lname );
      }
    });
    initializeSearch();
  }
}

function searchPolygon() {
  ChartTool.clickedLatLngs = [];
  ChartTool.drawing = new L.Draw.Polygon(Map_.map, {
    showArea: true,
    allowIntersection: false,
    guidelineDistance: 15,
    icon: new L.DivIcon({
        iconSize: new L.Point(10, 10),
        className: 'leaflet-div-icon leaflet-editing-icon',
    }),
    shapeOptions: {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0
   },
  })
  ChartTool.drawing.enable()
  Map_.map
      .on('click', ChartTool.clickMap)
      .on('draw:drawstop', ChartTool.drawStop)
}

function searchWithin( coords ) {

  // Turf expects last coord to match first
  coords.push(coords[0])

  // Initialize an empty 2D array
  var multiArray = [];

  // Loop through the data and populate the 2D array
  for (var i = 0; i < coords.length; i++) {
      var lat = coords[i].lat;
      var lon = coords[i].lon;
      multiArray.push([lat, lon]);
  }

  var searchWithin = turf.polygon([multiArray]);
  var sites = L_.layers.nameToUUID[SearchTool.lname];
  var markers = L_.layers.layer[sites]
  var latlngs = []

  markers.eachLayer(function(layer) {
    latlngs.push([layer.feature.properties.y, layer.feature.properties.x])
  });
  var points = turf.points(latlngs);
  var ptsWithin = turf.pointsWithinPolygon(points, searchWithin);

  var foundCoords = [];
  // Iterate through the features and extract coordinates
  ptsWithin.features.forEach(function(feature) {
      if (feature.geometry && feature.geometry.coordinates) {
        foundCoords.push(feature.geometry.coordinates.toString());
      }
  });

  var selectLayers = []
  markers.eachLayer(function(layer) {
    var coord = layer.feature.properties.y + ',' + layer.feature.properties.x
    if (foundCoords.includes(coord)) {
      selectLayers.push(layer)
    }
  });

  if( selectLayers.length > 1 ){
    var noreset;
    for( var i = 0; i < selectLayers.length; i++ ){
      selectLayers[i].setStyle({fillColor: 'magenta'});
      selectLayers[i].setRadius(9);
      selectLayers[i].bringToFront();
      if (ToolController_.activeToolName != 'ChartTool') {
        var prevActive = $( '#toolcontroller_incdiv .active' );
        prevActive.removeClass( 'active' ).css( { 'color': ToolController_.defaultColor, 'background': 'none' } );
        prevActive.parent().css( { 'background': 'none' } );
        var newActive = $( '#toolcontroller_incdiv #ChartTool' );
        newActive.addClass( 'active' ).css( { 'color': ToolController_.activeColor } );
        newActive.parent().css( { 'background': ToolController_.activeBG } );
        ToolController_.makeTool( 'ChartTool' );
      }
      ToolController_.getTool( 'ChartTool' ).use( selectLayers[i].feature, ((i == 0) ? noreset : true) );
    }
  }

}

function searchGo() {
  doWithSearch("goto", "false", "false", false);
}
function searchSelect() {
  doWithSearch("select", "false", "false", false);
}
function searchBoth() {
  doWithSearch("both", "false", "false", false);
}

//doX is either "goto", "select" or "both"
//forceX overrides searchbar entry, "false" for default
//forceSTS overrides dropdown, "false" for default
//function doWithSearch( doX, forceX, forceSTS ) {
function doWithSearch( doX, forceX, forceSTS, isURLSearch ) {
  forceSTS = L_.layers.nameToUUID['Sites']; // always use Sites with ESESES
  var x;
  var sTS;

  // Create/clear crosshair for coordinate search
  var smallIcon = new L.Icon({
    iconUrl: 'Missions/MGViz/Images/target.svg',
    iconSize: [30,30],
    iconAnchor: [15, 15]
  });
  if (typeof SearchTool.crossMarker !== 'undefined') {
    Map_.map.removeLayer(SearchTool.crossMarker);
  };

  if(forceX == "false" && !isURLSearch){
    x = [document.getElementById("auto_search").value]; //what the user entered in search field
  } else if (forceX == "false" && isURLSearch) {
    x = L_.searchStrings;
  }
  else x = forceX;

  if(forceSTS == "false") sTS = L_.layers.nameToUUID[SearchTool.lname];
  else sTS = forceSTS;

  var markers = L_.layers.layer[sTS]
  var selectLayers = [];
  var gotoLayers = [];
  var targetsID;
  var latlng = [];
  if( doX == 'both' || doX == 'select' ) {
    if (ToolController_.activeToolName != 'ChartTool') {
      L_.resetLayerFills();
    }
  }
  if (typeof markers != 'undefined') {
    // get latlng from site name if found when searching for distance
    if ($('#searchToolType').val() == 'Distance') {
      markers.eachLayer(function(layer) {
        if (layer.feature.properties.site.includes(x.toString().toLowerCase())) {
          latlng = [layer.feature.properties.y, layer.feature.properties.x];
        }
      });
    }
    // search loop
    markers.eachLayer(function(layer) {
      var props = layer.feature.properties;
      var clickI = 0;
      var shouldSearch = false;
      var comparer = getSearchFieldStringForFeature( SearchTool.lname, props );

      for( var i = 0; i < x.length; i++ ) {
        // Support for lat,lon
        if (x[i].includes(' ')) {
          latlng = x[i].split(' ');
        }
        if (x[i].includes(',')) {
          latlng = x[i].split(',');
        }
        if (x[i].includes('°') || x[i].split(' ').length >= 6) {
          // Support for D° M' S" N/S D° M' S" E/W
          var parts = x[i].split(/[^\d\w\.\-]+/);
          if (parts.length < 8) {
            var lat = ConvertDMSToDD(Math.abs(parseFloat(parts[0])), parts[1], parts[2], ((parseFloat(parts[0]) >= 0) ? 'N' : 'S'));
            var lng = ConvertDMSToDD(Math.abs(parseFloat(parts[3])), parts[4], parts[5], ((parseFloat(parts[3]) >= 0) ? 'E' : 'W'));
          } else {
            var lat = ConvertDMSToDD(parts[0], parts[1], parts[2], parts[3]);
            var lng = ConvertDMSToDD(parts[4], parts[5], parts[6], parts[7]);
          }
          latlng = [lat,lng];
        }
        if (latlng.length >= 2) {
          var radiusInKm = 25; //default search
          var kmInLongitudeDegree = 111.320 * Math.cos( parseFloat(latlng[0]) / 180.0 * Math.PI);
          if (isNaN($('#distance_search').val()) == false) {
            radiusInKm = parseFloat($('#distance_search').val());
          }
          var deltaLat = radiusInKm / 111.1;
          var deltaLong = radiusInKm / kmInLongitudeDegree;
          // Search for sites within radius 
          if ((Math.abs(props.x - parseFloat(latlng[1])) <= deltaLong) && (Math.abs(props.y - parseFloat(latlng[0])) <= deltaLat)) {
            shouldSearch = true;
            break;
          }
        } else if (x[i].toLowerCase().includes(props.site)) {
          shouldSearch = true;
          break;
        }
      }

      if( shouldSearch ) {
        if( doX == 'both' || doX == 'select' ) {
          selectLayers.push(layer);
        }
        if( doX == 'both' || doX == 'goto' ) {
          gotoLayers.push(layer);
        }
        if( doX == 'remove') {
          layer.setStyle({ fillColor: '#00FFFF'});
          layer.setRadius(layer.defaultOptions.radius);
        }
      }
    });

    if( selectLayers.length == 1 ){
      // Deselect existing selection if checked
      if ($('input[name=checkAppend]').prop('checked') == false) {
        L_.resetLayerFills();
      }
      selectLayers[0].setStyle({ fillColor: 'magenta' });
      selectLayers[0].setRadius(9);
      selectLayers[0].bringToFront();
      Map_.activeLayer = selectLayers[0];
      // Description.updatePoint( Map_.activeLayer );
      if (ToolController_.activeToolName != 'ChartTool') {
        var prevActive = $( '#toolcontroller_incdiv .active' );
        prevActive.removeClass( 'active' ).css( { 'color': ToolController_.defaultColor, 'background': 'none' } );
        prevActive.parent().css( { 'background': 'none' } );
        var newActive = $( '#toolcontroller_incdiv #ChartTool' );
        newActive.addClass( 'active' ).css( { 'color': ToolController_.activeColor } );
        newActive.parent().css( { 'background': ToolController_.activeBG } );
        ToolController_.makeTool( 'ChartTool' );
      }
      ToolController_.getTool( 'ChartTool' ).use( selectLayers[0].feature );
      // if( !isURLSearch ) {
      //   QueryURL.writeSearchURL( x, SearchTool.lname );
      // }
    } else if( selectLayers.length > 1 ){
      var noreset;
      for( var i = 0; i < selectLayers.length; i++ ){
        selectLayers[i].setStyle({fillColor: 'magenta'});
        selectLayers[i].setRadius(9);
        selectLayers[i].bringToFront();
        if (ToolController_.activeToolName != 'ChartTool') {
          var prevActive = $( '#toolcontroller_incdiv .active' );
          prevActive.removeClass( 'active' ).css( { 'color': ToolController_.defaultColor, 'background': 'none' } );
          prevActive.parent().css( { 'background': 'none' } );
          var newActive = $( '#toolcontroller_incdiv #ChartTool' );
          newActive.addClass( 'active' ).css( { 'color': ToolController_.activeColor } );
          newActive.parent().css( { 'background': ToolController_.activeBG } );
          ToolController_.makeTool( 'ChartTool' );
        }
        ToolController_.getTool( 'ChartTool' ).use( selectLayers[i].feature, ((i == 0) ? noreset : true) );
      }
      // if( !isURLSearch ) {
      //   QueryURL.writeSearchURL( x, SearchTool.lname );
      // }
    }

    if( gotoLayers.length > 0){
      if(selectLayers.length == 0) {
        L_.resetLayerFills();
        for( var i = 0; i < gotoLayers.length; i++ ){
          gotoLayers[i].setStyle({fillColor: 'lime'});
          gotoLayers[i].setRadius(9);
          gotoLayers[i].bringToFront();
        }
      }
      var coordinate = getMapZoomCoordinate([gotoLayers[gotoLayers.length-1]]);
      if (ToolController_.activeToolName == 'ChartTool' && $('#contentDiv').is(":hidden") == false) {
        // shift center slightly if Chart tool is visible
        coordinate.longitude = coordinate.longitude // - 1.75;
      }
      Map_.map.setView([coordinate.latitude, coordinate.longitude], coordinate.zoomLevel);
    } else if (doX == 'goto') {
      if (latlng.length > 0) {
        var dummyLayers = [];
        var dummyLayer = {feature: {geometry: {coordinates: [latlng[1],latlng[0]]}}};
        dummyLayers.push(dummyLayer);
        var coordinate = getMapZoomCoordinate(dummyLayers);
        if (ToolController_.activeToolName == 'ChartTool' && $('#contentDiv').is(":hidden") == false) {
          // shift center slightly if Chart tool is visible
          coordinate.longitude = coordinate.longitude // - 1.75;
        }
        Map_.map.setView([coordinate.latitude, coordinate.longitude], coordinate.zoomLevel);
      }
    }
    // Add crosshair to map if coordinates were provided
    if (latlng.length > 0) {
      SearchTool.crossMarker = L.marker(latlng, {
        icon: smallIcon
      }).addTo(Map_.map);
      SearchTool.crossMarker._icon.className = "leaflet-marker-icon leaflet-zoom-animated";
    }
  }
}

//Probably better to use a grammar
function makeSearchFields( vars ) {
  var searchfields = {};
  if( vars.hasOwnProperty( 'searchfields' ) ) {
    for( var layerfield in vars.searchfields ) {
      var fieldString = vars.searchfields[ layerfield ];
      fieldString = fieldString.split( ')' );
      for( var i = 0; i < fieldString.length; i++ ) {
          fieldString[i] = fieldString[i].split( '(' );
          var li = fieldString[i][0].lastIndexOf(' ');
          if( li != -1 ) {
            fieldString[i][0] = fieldString[i][0].substring( li + 1 );
          }
      }
      fieldString.pop();
      //0 is function, 1 is parameter
      searchfields[layerfield] = fieldString;
    }
  }
  return searchfields;
}

function getSearchFieldStringForFeature( name, props ) {
  var str = '';
  if( SearchTool.searchFields.hasOwnProperty(name) ) {
    var sf = SearchTool.searchFields[name]; //sf for search field
    for( var i = 0; i < sf.length; i++ ) {
      switch( sf[i][0].toLowerCase() ) {
        case '': //no function
            str += props[sf[i][1]];
          break;
        case 'round':
            str += Math.round( props[sf[i][1]] );
          break;
        case 'rmunder':
            str += props[sf[i][1]].replace( '_', ' ' );
          break;
      }
      str += ' ';
    }
  }
  return str;
}

function getSearchFieldKeys( name ) {
  var str = '';
  if( SearchTool.searchFields.hasOwnProperty(name) ) {
    var sf = SearchTool.searchFields[name]; //sf for search field
    for( var i = 0; i < sf.length; i++ ) {
      str += sf[i][1];
      str += ' ';
    }
  }
  return str.substring( 0, str.length - 1 );
}

function searchWithURLParams() {
  changeSearchField(L_.searchFile);
  doWithSearch("both", "false", "false", true);
}

function getMapZoomCoordinate(layers) {
  //The zoom levels are defined at http://wiki.openstreetmap.org/wiki/Zoom_levels
  var zoomLevels = [360, 180, 90, 45, 22.5, 11.25, 5.625, 2.813, 1.406, 0.703,
    0.352, 0.176, 0.088, 0.044, 0.022, 0.011, 0.005, 0.003, 0.001, 0.0005, 0.0003, 0.0001];
  var boundingBoxNorth = 90;
  var boundingBoxSouth = -90;
  var boundingBoxEast = 180;
  var boundingBoxWest = -180;
  var latitudeValidRange = [-90, 90];
  var longitudeValidRange = [-180, 180];

  for( var i = 0; i < layers.length; i++ ) {
    var latitude = layers[i].feature.geometry.coordinates[1];
    var longitude = layers[i].feature.geometry.coordinates[0];

    //make sure latitude and longitude are in [-90, 90] and [-180, 180]
    if( latitude < latitudeValidRange[0] || latitude > latitudeValidRange[1] ||
        longitude < longitudeValidRange[0] || longitude > longitudeValidRange[1]) {
      continue;
    }

    if( latitude <= boundingBoxNorth ) {
      boundingBoxNorth = latitude;
    }
    if( latitude >= boundingBoxSouth) {
      boundingBoxSouth = latitude;
    }
    if( longitude <= boundingBoxEast ) {
      boundingBoxEast = longitude;
    }
    if( longitude >= boundingBoxWest ) {
      boundingBoxWest = longitude;
    }
  }

  var latitudeDiff = Math.abs(boundingBoxNorth - boundingBoxSouth);
  var longitudeDiff = Math.abs(boundingBoxEast - boundingBoxWest);
  if( latitudeDiff == 0 && longitudeDiff == 0) {
    return {
      latitude: boundingBoxNorth,
      longitude: boundingBoxEast,
      zoomLevel: 8
    }
  } else {
    var maxDiff = latitudeDiff >= longitudeDiff ? latitudeDiff : longitudeDiff;
    for( var i = 0; i < zoomLevels.length; i++ ){
      if( maxDiff < zoomLevels[i] && i != zoomLevels.length - 1) {
        continue;
      }

      return {
        latitude: boundingBoxSouth + (boundingBoxNorth - boundingBoxSouth) / 2,
        longitude: boundingBoxWest + (boundingBoxEast - boundingBoxWest) / 2,
        zoomLevel: i
      }
    }
  }
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
  var dd = parseFloat(degrees) + parseFloat(minutes)/60 + parseFloat(seconds)/(60*60);
  if (direction == "S" || direction == "W") {
      dd = dd * -1;
  } // Don't do anything for N or E
  return dd;
}

SearchTool.init();

export default SearchTool;