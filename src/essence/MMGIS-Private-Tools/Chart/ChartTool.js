//New Tool Template
//In the very least, each tool needs to be defined through require.js and return
// an object with 'make' and 'destroy' functions

import $ from 'jquery'
import * as d3 from 'd3'
import * as Highcharts from 'highcharts'
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/modules/export-data')(Highcharts);
require('highcharts/modules/offline-exporting')(Highcharts);
require('highcharts/modules/annotations')(Highcharts);

import F_ from '../../../../src/essence/Basics/Formulae_/Formulae_'
import L_ from '../../../../src/essence/Basics/Layers_/Layers_'
import ToolController_ from '../../../../src/essence/Basics/ToolController_/ToolController_'
import Viewer_ from '../../../../src/essence/Basics/Viewer_/Viewer_'
import Map_ from '../../../../src/essence/Basics/Map_/Map_'
import Globe_ from '../../../../src/essence/Basics/Globe_/Globe_'
import CursorInfo from '../../Ancillary/CursorInfo'
import Formulae_ from '../../../../src/essence/Basics/Formulae_/Formulae_.js'
import { mmgisAPI } from '../../../../src/essence/mmgisAPI/mmgisAPI.js'

import './ChartTool.css'

window.jspdf = require("jspdf/dist/jspdf.es.min.js")
window.svg2pdf = require("./external/svg2pdf.js")

function SiteOptions(sites, source, fil, type) {
  this.sites = sites;
  this.source = source;
  this.fil = fil;
  this.type = type;
}
SiteOptions.prototype.toString = function () {
  return this.sites + ', ' + this.source + ', ' + this.fil + ', ' + this.type;
};

//Add the tool markup if you want to do it this way
var markup = [].join('\n');

// var toolHeight = 1200; //recommended min height to avoid scrolling
// if (window.innerHeight < 1255) {
//   toolHeight = window.innerHeight - 55;
// }

var separatedDiv = d3.select('#splitscreens')
separatedDiv.style('left', '800px')
separatedDiv.style('width', 'calc(100% - 800px)')
// 188px

let distLineToMouse = null
let distMousePoint = null
const availableModes = ['segment', 'continuous', 'continuous_color']
let mode = 'segment'
const LOS = {
    on: false,
    observerHeight: 2,
    targetHeight: 0,
}
let profileData = []


var ChartTool = {
  drawing: null,
  clickedLatLngs: [],
  height: 0,
  width: 800,
  features: null,
  toolsDiv: null,
  contentDiv: null,
  infoDiv: null,
  optionsDiv: null,
  chart0Div: null,
  chart1Div: null,
  chart2Div: null,
  chart3Div: null,
  MMGISInterface: null,
  site: '',
  sites: [],
  siteOptionsList: [],
  source: 'comb',
  fil: 'clean',
  type: 'detrend',
  north: 'n',
  east: 'e',
  up: 'u',
  coseismics: true,
  stackOn: false,
  offset: 10,
  previousSites: [],
  append: true,
  make: function () {
    this.MMGISInterface = new interfaceWithMMGIS();
    // window.addEventListener('resize', resizeChartTool);

    var chartOptions = ['<a href="#" style="float:left;display:none;" id="showInfo">&#187; Show Site Info</a>',
      '<br><br><b>Chart Options</b><br>',
      '<br>Source:<br>',
      '<select id="selectSource" style="color:black">',
      '<option selected="selected" value="comb">Combination</option>',
      '<option value="jpl">JPL</option>',
      '<option value="sopac">SOPAC</option>',
      //'<option value="sopacR20">SOPACR20</option>',
      '</select>',
      '<br>Type:<br>',
      '<select id="selectFilter" style="color:black">',
      '<option selected="selected" value="clean">Clean</option>',
      '<option value="flt">Filter</option>',
      '<option value="raw">Raw</option>',
      '<option value="rawm">Raw M</option>',
      '</select>',
      '<br>Trend/Detrend:<br>',
      '<select id="selectType" style="color:black;margin-bottom:10px;">',
      '<option selected="selected" value="detrend">Detrend</option>',
      '<option value="trend">Trend</option>',
      '<option value="resid">Resid</option>',
      '</select><br>',
      '<input type="checkbox" name="checknorth" value="n" checked="checked"><span style="font-size:13px;"> North</span><br>',
      '<input type="checkbox" name="checkeast" value="e" checked="checked"><span style="font-size:13px;"> East</span><br>',
      '<input type="checkbox" name="checkup" value="u" checked="checked"><span style="font-size:13px;"> Up</span><br>',
      '<input type="checkbox" name="checkOffsets" value="true" checked="checked"><span style="font-size:13px;"> Show Offsets</span><br>',
      '<input type="checkbox" name="checkStack" value="true"><span style="font-size:13px;"> Stack On Charts</span><br>',
      '<input type="checkbox" name="checkSeparation" value="true" checked="checked" style="margin-bottom:8px;"><span style="font-size:13px;"> Stack Separation</span><br>',
      '<input id="textOffset" type="text" value="' + this.offset + '" name="offset" maxLength="4" style="color:#000000;width:40px;margin-bottom:10px;"/>',
      '<span style="font-size:10px;"> mm</span><button id="buttonApply" style="color:#000000;padding:2px;float:right;width:60px;font-size:11px;">Apply</button>',
      '<br>Site Code:<br>',
      '<input id="textSite" type="text" name="sitecode" style="color:#000000;width:60px;"/>',
      '<button id="buttonAdd" style="color:#000000;padding:2px;float:right;width:60px;font-size:11px;">Add</button><br>',
      '<span style="font-size:11px;text-align:left;float:left;" align="left">Hold control/command to plot or remove multiple sites.</span>',
      '<div id="sitesDiv" style="margin-top:4px;">',
      '<span style="float:left">All Sites:</span><span style="float:right">Saved:&nbsp;&nbsp;&nbsp;&nbsp;</span><br>',
      '<select multiple="multiple" id="siteSource" name="site-source[]" style="height:226px;width:60px;color:#000000;float:left;"></select>',
      '<span>&nbsp;&nbsp;</span>',
      '<select multiple="multiple" id="siteSelect" name="site-select[]" style="height:200px;width:60px;color:#000000;float:right;padding:5px"></select><br>',
      '<button id="buttonRemove" style="color:#000000;padding:2px;float:right;width:60px;font-size:11px;">Remove</button>',
      '<span style="padding-top:5px;padding-bottom:8px;float:left;font-size:11px;"><input type="checkbox" name="checkAppend" value="true" checked="checked"> Append Site Selection</span>',
      '<input id="textGroup" type="text" name="groupname" value="Default Group" align="center" style="color:#000000;text-align:center;width:143px;float:left;padding:3px;margin:3px;"/>',
      '<br><input id="inputImport" type="file" name="Import" style="display: none;"/>',
      '<button id="buttonDrawBox" style="color:#000000;width:143px;padding:3px;margin:3px;">Polygon Select</button>',
      '<button id="buttonImport" style="color:#000000;width:143px;padding:3px;margin:3px;">Load Saved Sites</button>',
      '<button id="buttonExport" style="color:#000000;width:143px;padding:3px;margin:3px;">Export Selected</button>',
      '<button id="buttonClear" style="color:#000000;width:143px;padding:3px;margin:3px;">Clear Selected</button>',
      '<a id="exportData" "display: none;"/></a>',
      '</div>'].join('\n');

    var siteInfo = ['<a href="#" style="float:left;" id="hideInfo">&#171; Hide Site Info</a>',
      '<a href="#" style="float:right;" id="showCharts">Show Charts &#187;</a><br><br><b>Site Information</b><br><br>',
      '<div style="height:95%;width:260px;overflow:auto;"><table id="siteInfo" colspan="2" class="site-table" style="width:240px;"><tbody><tr>',
      '</tr></tbody></table></div>'].join('\n');

    var introHtml = ['<div style="text-align:center;font-size:24px;"><strong>Welcome to MGViz - the MMGIS GNSS Visualizer</strong></div><br></br>',
      '<div style="font-size:16px;">The map to the right displays GNSS sites and earthquakes. Select a site (blue circle) to display a time series plot of the site\'s data or use the ',
      '<strong>Load Saved Sites</strong> button near the bottom of the left panel to load a list of sites from an existing file.<br></br>',
      'Use the Chart Options on the left to change the Source, Type, and Trend/Detrend.<br></br>',
      'Check/uncheck plot display options as needed. <strong>Stack On Charts</strong> will add data for additionally selected sites (up to 5).',
      '<strong>Stack Separation</strong> will add a vertical buffer between selected sites to mitigate overlapping points.<br></br>',
      'More sites may be added by manually inputting the <strong>Site Code</strong> or selecting from the <strong>All Sites</strong> list. ',
      'Selected sites will show up under the <strong>Saved</strong> list. Deselecting the <strong>Append Site Selection</strong> ',
      'option will result in only a single site being loaded at a time.<br></br>',
      'A polygon can also be drawn on the map to select sites. Click on the <strong>Polygon Select</strong> button to begin drawing on the map.',
      'Click on the first drawn point to complete the polygon selection.<br></br>',
      'To export the list of saved sites to a file, provide a group name in the <strong>Default Group</strong> ',
      'text box and then click the <strong>Export Selected</strong> button.<br></br>',
      'Hitting the <strong>Clear Selected</strong> button will reset the Chart tool.<br></br>',
      'Additional tools beyond charting may be found on the strip of icons on the far left of the screen.</div>'].join('\n')

    var tools = d3.select('#toolPanel');
    tools.selectAll('*').remove();
    tools.style('width', '800px')
    this.toolsDiv = tools.append('div')
      .style('height', '1200px')
      .style('width', '100%')
    this.infoDiv = this.toolsDiv.append('div')
      .attr('id', 'infoDiv')
      .style('width', '280px')
      .style('position', 'relative')
      .style('float', 'left')
      .style('padding-top', '8px')
      .style('padding-left', '20px')
      .style('padding-right', '20px')
      .style('border-left', '1px solid white')
      .style('border-right', '1px solid white')
      .style('height', '100%')
      .html(siteInfo);
    this.optionsDiv = this.toolsDiv.append('div')
      .attr('id', 'optionsDiv')
      .style('width', '190px')
      .style('position', 'relative')
      .style('float', 'left')
      .style('padding-top', '8px')
      .style('padding-left', '20px')
      .style('padding-right', '20px')
      .style('border-right', '1px solid white')
      .style('height', '100%')
      .style('background-color', '#282828')
      .style('overflow', 'auto')
      .style('display', 'none')
      .html(chartOptions);
    this.contentDiv = this.toolsDiv.append('div')
      .attr('id', 'contentDiv')
      .style('position', 'absolute')
      .style('left', '466px')
      .style('bottom', '10px')
      .style('padding', '10px')
      .style('height', '98%')
      .style('width', '58%')
      .style('overflow', 'auto')
      .style('display', 'none');
    this.introDiv = this.contentDiv.append('div')
      .attr('id', 'introDiv')
    this.chart0Div = this.contentDiv.append('div')
      .attr('id', 'chart0')
      .style('height', '110px')
      .style('padding', '6px');
    this.chart1Div = this.contentDiv.append('div')
      .attr('id', 'chart1')
      .style('height', '280px')
      .style('padding', '6px');
    this.chart2Div = this.contentDiv.append('div')
      .attr('id', 'chart2')
      .style('height', '280px')
      .style('padding', '6px');
    this.chart3Div = this.contentDiv.append('div')
      .attr('id', 'chart3')
      .style('height', '280px')
      .style('padding', '6px');
    // if (window.innerHeight < 1255) {
    //   this.height = window.innerHeight - 35;
    // } else {
    //   this.height = 1200; //recommended min height to avoid scrolling
    // }

    // Hide info; show charts by default
    $('#showCharts').html('&#171; Hide Charts');
    $('#contentDiv').show();
    $('#optionsDiv').show();
    $('#infoDiv').hide();
    $('#showInfo').show();
    $('#toolsWrapper').width('800px');
    $('#contentDiv').css('left', '188px');
    $('#contentDiv').css('width', '620px');

    // load list of sites
    $.ajax({
      url: 'api/eseses/psite',
      dataType: 'json',
      success: function (data) {
        $.each(data['features'], function (key, value) {
          $('#siteSource').append($('<option></option>')
            .attr('value', value.properties.site)
            .text(value.properties.site));
        });
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('Unable to retrieve site list');
      }
    });

    // reselect any previous selections
    if (this.previousSites.length > 0) {
      $.each(this.previousSites, function (key, value) {
        ToolController_.activeTool.sites.push(value);
        $('#siteSelect').append($('<option></option>')
          .attr('value', value)
          .text(value));
      });
    } else {
      // display initial instructions
      this.introDiv.html(introHtml)
    }

    // Reload sites on map and chart the last selected
    ToolController_.activeToolName = 'ChartTool'
    ToolController_.getTool('SearchTool').search(this.previousSites, 'Sites')

    this.previousSites = [];
    $('#selectSource').val(this.source);
    $('#selectFilter').val(this.fil);
    $('#selectType').val(this.type);
    if (this.north == 'x') {
      $('input[name=checknorth]').prop("checked", false);
    }
    if (this.east == 'x') {
      $('input[name=checkeast]').prop("checked", false);
    }
    if (this.up == 'x') {
      $('input[name=checkup]').prop("checked", false);
    }
    $('input[name=checkOffsets]').prop("checked", this.coseismics);
    $('input[name=checkStack]').prop("checked", this.stackOn);
    if (this.offset == 0) {
      $('input[name=checkSeparation]').prop("checked", false);
    }
    $('#textOffset').val(this.offset);

    $('#selectSource').on('change', function (e) {
      ChartTool.source = this.value;
      let siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east,ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('#selectFilter').on('change', function (e) {
      ChartTool.fil = this.value;
      if (typeof ChartTool.source !== "undefined") {
        let siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
        ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
      }
    });
    $('#selectType').on('change', function (e) {
      ChartTool.type = this.value;
      let siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('input[name=checknorth]').click(function () {
      if (this.checked) {
        var north = 'n';
      } else {
        var north = 'x';
      }
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('input[name=checkeast]').click(function () {
      if (this.checked) {
        var east = 'e';
      } else {
        var east = 'x';
      }
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('input[name=checkup]').click(function () {
      if (this.checked) {
        var up = 'u';
      } else {
        var up = 'x';
      }
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('input[name=checkOffsets]').click(function () {
      var coseismics = this.checked;
      ToolController_.activeTool.coseismics = this.checked;
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('input[name=checkStack]').click(function () {
      var stackOn = this.checked;
      ToolController_.activeTool.stackOn = this.checked;
      if (stackOn != true) {
        ToolController_.activeTool.siteOptionsList = [];
      }
      if (typeof ChartTool.source !== "undefined") {
        var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
        ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, stackOn);
      }
    });
    $('input[name=checkSeparation]').click(function () {
      if (this.checked) {
        var offset = $('#textOffset').val();
      } else {
        var offset = 0;
      }
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, offset, ChartTool.stackOn);
    });
    $('input[name=checkAppend]').click(function () {
      if (this.checked) {
        ToolController_.activeTool.append = true
        var siteList = [];
        if ($('#siteSelect').val() != null) {
          $("#siteSelect option").each(function () {
            siteList.push($(this).val());
          });
        }
        ToolController_.getTool('SearchTool').search(siteList, 'Sites');
      } else {
        ToolController_.activeTool.append = false
      }
    });
    $('#buttonApply').click(function () {
      var offset = 0
      if ($('input[name=checkSeparation]').prop('checked')) {
        offset = $('#textOffset').val();
      }
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, offset, ChartTool.stackOn);
    });
    $('#buttonRemove').click(function () {
      ToolController_.getTool('SearchTool').remove($('#siteSelect').val(), 'Sites');
      ToolController_.activeTool.sites.splice($('#siteSelect')[0].selectedIndex, 1);
      $('#siteSelect option:selected').remove();
      ToolController_.activeTool.siteOptionsList = [];
      $("#siteSelect").val($("#siteSelect option:first").val());
      var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
    });
    $('#siteSource').click(function () {
      var selectedSites = $('#siteSource').val().toString().split(',')
      for (var selectedSite of selectedSites) {
        selectedSite = selectedSite.trim();
        $('#siteSelect').append($('<option></option>')
          .attr('value', selectedSite)
          .text(selectedSite));
        ToolController_.activeTool.site = selectedSite;
        var features = { properties: { site: selectedSite } };
        ToolController_.activeTool.use(features);
        ToolController_.getTool('SearchTool').search([String(selectedSite)], 'Sites');
      }
    });
    $('#siteSelect').on('change', function () {
      var selectedSites = $('#siteSelect').val();
      var siteOptions = new SiteOptions(selectedSites, ChartTool.source, ChartTool.fil, ChartTool.type);
      ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
      ToolController_.getTool('SearchTool').search([selectedSites[selectedSites.length - 1]], 'Sites');
    });
    $('#buttonAdd').click(function () {
      var textSites = $('#textSite').val().toString().split(',');
      for (var textSite of textSites) {
        textSite = textSite.trim();
        if ($('#siteSource option:contains(' + textSite + ')').length == 1) {
          $('#siteSelect').append($('<option></option>')
            .attr('value', textSite)
            .text(textSite));
          ToolController_.activeTool.site = textSite;
          var features = { properties: { site: textSite } };
          ToolController_.activeTool.use(features);
          ToolController_.getTool('SearchTool').search([textSite], 'Sites');
          $('#textSite').val('')
        } else {
          alert(textSite + ' site does not exist.');
        }
      }
    });
    $('#textSite').select();
    $("#textSite").keyup(function (event) {
      if (event.keyCode === 13) {
        $("#buttonAdd").click();
      }
    });
    $('#buttonDrawBox').click(function () {
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
    });
    $('#buttonImport').click(function () {
      $('#inputImport').trigger('click');
    });
    $('#inputImport').on('change', function (e) {
      // Disable StackOn when importing
      $('input[name=checkStack]').prop('checked', false);
      ToolController_.activeTool.stackOn = false;
      ToolController_.activeTool.siteOptionsList = [];
      // Load file
      var file = e.target.files[0];
      $('#textGroup').val(file.name.split('.')[0].toString());
      // Read file
      var reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = readerEvent => {
        try {
          var content = JSON.parse(readerEvent.target.result);
          // Use search tool to load sites
          ToolController_.getTool('SearchTool').search(content.sites, 'Sites');
        } catch (err) {
          alert('Unable to load file ' + file.name + '.');
        }
      }
    });
    $('#buttonExport').click(function () {
      var siteList = [];
      if ($('#siteSelect').val() != null) {
        $("#siteSelect option").each(function () {
          siteList.push($(this).val());
        });
      }
      var data = { sites: siteList }
      var json = JSON.stringify(data),
        blob = new Blob([json], { type: "octet/stream" }),
        url = window.URL.createObjectURL(blob);
      var a = document.getElementById('exportData');
      a.href = url;
      a.download = $('#textGroup').val() + '.json';
      a.click();
      window.URL.revokeObjectURL(url);
    });
    $('#buttonClear').click(function () {
      $('#siteSelect').empty();
      $('#chart0').empty();
      $('#chart1').hide();
      $('#chart2').hide();
      $('#chart3').hide();
      $('#introDiv').show();
      $('#textGroup').val('Default Group');
      $('#inputImport').val('');
      ToolController_.activeTool.site = '';
      ToolController_.activeTool.sites = [];
      ToolController_.activeTool.siteOptionsList = [];
      ToolController_.activeTool.stackOn = false;
      $('input[name=checkStack]').prop("checked", ToolController_.activeTool.stackOn);
      L_.resetLayerFills();
    });
    $('#showCharts').click(function () {
      if ($('#contentDiv').is(":hidden")) {
        $('#showCharts').html('&#171; Hide Charts');
        // $('#toolsWrapper').width('1080px');
        d3.select('#splitscreens').style('left', '800px')
        d3.select('#splitscreens').style('width', 'calc(100% - 800px)')
        $('#toolPanel').width('1080px');
        $('#contentDiv').show();
        $('#optionsDiv').show();
        if ($('#siteSelect').has('option').length > 0) {
          var siteOptions = new SiteOptions($('#siteSelect').val(), ChartTool.source, ChartTool.fil, ChartTool.type);
          ToolController_.activeTool.loadChart(siteOptions, [ChartTool.north, ChartTool.east, ChartTool.up], ChartTool.coseismics, ChartTool.offset, ChartTool.stackOn);
        }
      } else {
        $('#showCharts').html('Show Charts &#187;');
        // $('#toolsWrapper').width('280px');
        d3.select('#splitscreens').style('left', '280px')
        d3.select('#splitscreens').style('width', 'calc(100% - 280px)')
        $('#toolPanel').width('280px');
        $('#contentDiv').hide();
        $('#optionsDiv').hide();
        $('input[name=checkStack]').prop('checked', false);
        ToolController_.activeTool.stackOn = false;
        ToolController_.activeTool.siteOptionsList = [];
      }
      window.dispatchEvent(new Event('resize'));
    });
    $('#hideInfo').click(function () {
      $('#infoDiv').hide();
      $('#showInfo').show();
      if ($('#contentDiv').is(":hidden")) {
        $('#toolPanel').width('0px');
        ToolController_.closeActiveTool();
      } else {
        $('#hideInfo').html('&#171; Hide Site Info');
        $('#toolPanel').width('800px');
        $('#contentDiv').css('left', '188px');
        $('#contentDiv').css('width', '620px');
      }
    });
    $('#showInfo').click(function () {
      $('#infoDiv').show();
      $('#hideInfo').show();
      $('#showInfo').hide();
      $('#toolsWrapper').width('1080px');
      $('#toolPanel').width('1080px');
      $('#contentDiv').css('left', '466px');
      $('#contentDiv').css('width', '58%');
    });
  },
  use: function (features, noreset, nochart = false) {
    this.features = features;
    try {
      if (ToolController_.activeTool.site == null) {
        return;
      }
    } catch (error) {
      return;
    }
    if (this.contentDiv == null) {
      return;
    }
    if (features == null) {
      return;
    }
    var site = features.properties.site;
    if (this.sites.length > 1) {
      noreset = true;
    }
    if ($('#optionsDiv').is(":hidden") && (typeof (noreset) == 'undefined')) {
      this.sites = []; // reset sites if charts are hidden
    }
    if (this.sites.indexOf(site) === -1) {
      if (this.sites.length > 0 && $('input[name=checkAppend]').prop('checked') == false) {
        var lastSite = this.sites.pop();
        for (var i = 0; i < this.siteOptionsList.length; i++) {
          if (this.siteOptionsList[i].sites.indexOf(lastSite) > -1) {
            this.siteOptionsList.splice(i, 1);
            i--;
          }
        }
      }
      this.sites.push(site);
    }
    $('#siteSelect').empty();
    $.each(this.sites, function (key, value) {
      $('#siteSelect').append($('<option></option>')
        .attr('value', value)
        .text(value));
    });

    $('#siteSelect').val(site);
    var selectedSites = $('#siteSelect').val();

    // display intro HTML if nothing to chart, otherwise remove
    if (selectedSites.length == 0) {
      $('#introDiv').show()
    } else {
      $('#introDiv').hide()
    }

    site = this.site;
    var sites = this.sites;
    var source = this.source;
    var fil = this.fil;
    var type = this.type;
    var north = this.north;
    var east = this.east;
    var up = this.up;
    var neu = [north, east, up];
    var coseismics = this.coseismics;
    var stackOn = this.stackOn;
    var offset = this.offset;

    var siteOptions = new SiteOptions(selectedSites, source, fil, type);
    if (nochart == false) {
      this.loadChart(siteOptions, neu, coseismics, offset, stackOn);
    }

  },

  remove: function (features, layer) {
    if (features == null) {
      return;
    }
    var site = features.properties.site;
    if (layer != null) {

    }
    var reload = false;
    if ($('#siteSelect').val() == site) {
      reload = true;
    }
    if (this.sites.indexOf(site) > -1) {
      this.sites.splice(this.sites.indexOf(site), 1);
      $('#siteSelect option[value="' + site + '"]').remove();
    }
    for (var i = 0; i < this.siteOptionsList.length; i++) {
      if (this.siteOptionsList[i].sites.indexOf(site) > -1) {
        this.siteOptionsList.splice(i, 1);
        i--;
      }
    }
    if (reload == true) {
      // close charts if removing the one that is shown
      if ($('#siteSelect option').length > 0) {
        features = { properties: { site: $($('#siteSelect option')[0]).val() } };
        this.use(features);
      } else {
        $('#siteSelect').empty();
        $('#chart0').empty();
        $('#chart1').hide();
        $('#chart2').hide();
        $('#chart3').hide();
        $('#introDiv').show()
        ToolController_.activeTool.sites = [];
        L_.resetLayerFills();
      }
    }
  },
  loadInfo: function (site, source, fil, type) {
    var propInfo = {};
    if (site.length == 1) {
      propInfo.site = site[0];
    } else {
      propInfo.site = '<select id="selectSites" style="color:black"></select>';
    }
    // Query ESESES metadata
    $.ajax({
      type: 'GET',
      url: 'api/eseses/site/' + site[0] + '/' + source + '/' + fil + '/' + type,
      async: false,
      dataType: 'json',
      success: function (data) {
        for (var d in data) {
          propInfo[d] = data[d];
        }
      }
    });
    // reset and populate table
    $('#siteInfo').html('<tbody><tr></tr></tbody></table>');
    for (var p in propInfo) {
      if (p == 'site') {
        $('#siteInfo tr:last').after('<tr><td>Site ID</td><td>' + propInfo[p] + '</td></tr>');
        if (site.length > 1) {
          $('#selectSites').on('change', function (e) {
            var selectedSite = this.value;
            var sortedSites = site.sort(function (x, y) { return x == selectedSite ? -1 : y == selectedSite ? 1 : 0; });
            ToolController_.activeTool.loadInfo(sortedSites, source, fil, type);
          });
          for (var s in site) {
            if (!$('#selectSites option:contains(' + site[s] + ')').length == 1) {
              $('#selectSites').append($('<option></option>')
                .attr('value', site[s])
                .text(site[s]));
            }
          }
        }
      }
      else if (p == 'Component Terms') {
        for (var i in propInfo[p]) {
          var modelId = 'model' + i.replace(' - ', '');
          $('#siteInfo tr:last').after('<tr><td colspan="2" align="center" style="background-color:#585b60;"><a href="#" id="' + modelId + '")>' + i + ' Model</a></td></tr>');
          $('#' + modelId).click(function () {
            if ($('.' + this.id).is(":visible")) {
              $('[class$=' + this.id + ']').hide();
            } else {
              $('.' + this.id).show();
            }
          });
          for (var m in propInfo[p][i]) {
            var componentId = 'component' + m + modelId;
            $('#siteInfo tr:last').after('<tr style="display:none;" class="' + modelId + '"><td colspan="2" align="center" style="background-color:#3a3c40;"><a href="#" id="' + componentId + '")>' + m + '</a></td></tr>');
            $('#' + componentId).click(function () {
              if ($('.' + this.id).is(":visible")) {
                $('.' + this.id).hide();
              } else {
                $('.' + this.id).show();
              }
            });
            var component = propInfo[p][i][m]
            for (var c in component) {
              for (var o in c) {
                if (typeof component[c][o] !== "undefined") {
                  $('#siteInfo tr:last').after('<tr style="display:none;" class="' + componentId + '"><td style="background-color:#46484d;">' + c + '</td><td style="background-color:#46484d;">' + component[c][o] + '</td></tr>');
                }
              }
            }
          }
          if (modelId.toLowerCase().includes(source) && modelId.toLowerCase().replace(/i/g, '').includes(fil.includes('raw') ? 'clean' : fil)) {
            $('.' + modelId).show();
          }
        }
      }
      else if (p == 'Equipment') {
        for (var i in propInfo[p]) {
          var equipmentId = 'equipment' + i;
          $('#siteInfo tr:last').after('<tr><td colspan="2" align="center" style="background-color:#585b60;"><a href="#" id="' + equipmentId + '")>' + p + ' - ' + propInfo[p][i]['Date Installed'] + '</a></td></tr>');
          $('#' + equipmentId).click(function () {
            if ($('.' + this.id).is(":visible")) {
              $('.' + this.id).hide();
            } else {
              $('.' + this.id).show();
            }
          });
          var equipment = propInfo[p][i]
          for (var e in equipment) {
            $('#siteInfo tr:last').after('<tr ' + ((i == 0) ? '' : 'style="display:none;"') + ' class="' + equipmentId + '"><td>' + e + '</td><td>' + equipment[e] + '</td></tr>');
          }
        }
      }
      else if (p == 'XML File') {
        $('#siteInfo tr:last').after('<tr><td>' + p + '</td><td><a href="' + propInfo[p] + '">Download</a></td></tr>');
      } else {
        $('#siteInfo tr:last').after('<tr><td>' + p + '</td><td>' + propInfo[p] + '</td></tr>');
      }
    };

  },
  loadChart: function (siteOptions, neu, coseismics, offset, stackOn) { // sites, source, fil, type, neu, coseismics, offset
    var sites = siteOptions.sites;
    var source = siteOptions.source;
    var fil = siteOptions.fil;
    var type = siteOptions.type;

    if (stackOn && siteOptions.sites != null) {
      if (siteOptions.sites.length == 0) {
        return;
      }
      // Don't stack previous sites if multiple sites are selected
      if (siteOptions.sites.length > 1) {
        this.siteOptionsList = [];
        stackOn = false;
        $('input[name=checkStack]').prop('checked', false);
      }
      else {
        if (this.siteOptionsList.length > 1) {
          // Don't repeat same site options
          var existingOptions = false;
          for (var i = 0; i < this.siteOptionsList.length; i++) {
            if (siteOptions.toString() == this.siteOptionsList[i].toString()) {
              existingOptions = true;
            }
          }
          if (existingOptions == false) {
            // Don't stack more than 5 sites
            if (this.siteOptionsList.length > 4) {
              this.siteOptionsList = this.siteOptionsList.slice(this.siteOptionsList.length - 4, this.siteOptionsList.length);
            }
            this.siteOptionsList.push(siteOptions);
          }
        } else {
          this.siteOptionsList.push(siteOptions);
        }
        sites = [];
        for (var i = 0; i < this.siteOptionsList.length; i++) {
          sites.push(this.siteOptionsList[i].sites[0]);
        }
      }
    }

    if (sites == null || sites.length == 0) {
      $('#chart0').empty();
      $('#chart1').empty();
      $('#chart2').empty();
      $('#chart3').empty();
      $('#introDiv').show()
      return;
    }
    if (sites.length > 1 && coseismics) { // don't show coseismics when selecting multiple sites
      if (!sites.every((val, i, arr) => val === arr[0])) {
        coseismics = false;
        $('input[name=checkOffsets]').prop('checked', false);
      }
    }
    if (sites.length > 5) {
      alert("Too many sites selected for charting.")
      return;
    }
    var site = sites[sites.length - 1];
    var loadMsg = '<div>Loading data for site: "' + site + '."</div>';
    var load = true;
    if ($('#contentDiv').is(":hidden")) {
      load = false;
    }
    if (($('#chart1').html() + $('#chart2').html() + $('#chart3').html()).includes('Loading')) {
      load = false;
    }

    // resync neu
    if ($('input[name=checknorth]').prop('checked')) {
      var north = 'n';
    } else {
      var north = 'x';
    }
    if ($('input[name=checkeast]').prop('checked')) {
      var east = 'e';
    } else {
      var east = 'x';
    }
    if ($('input[name=checkup]').prop('checked')) {
      var up = 'u';
    } else {
      var up = 'x';
    }
    neu = [north, east, up];

    // set chart heights based on selection
    if (neu.includes('x')) { // increase height if not displaying all charts
      var chartHeight = ((this.height - 190) / 2);
    } else {
      var chartHeight = ((this.height - 190) / 3);
    }
    // don't exceed minimum height
    if (chartHeight < 340) {
      chartHeight = 340;
    }
    if (neu.includes('n')) {
      $('#chart1').height(chartHeight);
    } else {
      $('#chart1').height('0px');
    }
    if (neu.includes('e')) {
      $('#chart2').height(chartHeight);
    } else {
      $('#chart2').height('0px');
    }
    if (neu.includes('u')) {
      $('#chart3').height(chartHeight);
    } else {
      $('#chart3').height('0px');
    }

    // load site info
    if (($('#chart1').html() + $('#chart2').html() + $('#chart3').html()).includes('Loading') == false) {
      this.loadInfo(sites, source, fil, type);
    }

    // if (!Highcharts.Series.prototype.renderCanvas) {
    //   throw 'Module not loaded';
    // }

    this.site = site;
    this.source = source;
    this.fil = fil;
    this.type = type;
    this.north = neu[0];
    this.east = neu[1];
    this.up = neu[2];
    this.coseismics = coseismics;
    this.stackOn = stackOn;
    this.offset = offset;

    var options = {
      chart: {
        zoomType: 'x',
        animation: false,
        resetZoomButton: {
          position: {
            verticalAlign: 'bottom',
            x: 0,
            y: 30
          }
        },
        marginTop: 70,
        marginBottom: 90
      },
      boost: {
        useGPUTranslations: false,
        usePreAllocated: true
      },
      exporting: {
        libURL: '/Missions/MGViz/Modules',
        buttons: {
          contextButton: {
            menuItems: [
              'viewFullscreen',
              'printChart',
              'downloadPNG',
              'downloadJPEG',
              'downloadPDF',
              'downloadSVG',
              'downloadCSV',
              'downloadXLS'
            ]
          }
        },
        sourceWidth: 600,
        sourceHeight: 600,
        scale: 3
      },
      legend: {
        enabled: false,
        itemStyle: {
          fontSize: '10px'
        }
      },
      xAxis: {
        title: {
          text: 'year'
        }
      },
      yAxis: {
        title: {
          text: 'position (mm)'
        },
        tickAmount: 5
      },
      title: {
        text: 'Title'
      },
      subtitle: {
        text: 'Slope(s)',
        style: {
          fontWeight: 'bold',
          fontSize: '10px'
        },
        verticalAlign: 'bottom',
        y: 15
      },
      credits: {
        enabled: false
      },
      accessibility: {
        enabled: false
      },
      tooltip: {
        positioner: function () {
          return { x: 5, y: 2 };
        },
        formatter: function () {
          var d = convertDecimalDate(this.x);
          var dateString = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + ' (' + d.getFullYear() + '-' + doy(d) + ')';
          return '<b>' + this.series.name + '</b><br><b>x: ' + dateString + '</b><br><b>y: ' + (Math.round(this.y * 100) / 100).toFixed(2) + ' mm</b>';
        },
        style: {
          fontWeight: 'bold',
          fontSize: '10px'
        },
        shadow: false,
        borderWidth: 0,
        backgroundColor: 'rgba(255,255,255,0.85)'
      },
      loading: {
        labelStyle: {
          fontStyle: 'italic',
          fontSize: '20px',
          color: 'black'
        }
      },
      series: [{
        name: 'coseismic',
        color: 'orange',
        animation: false,
        marker: {
          enabled: false
        },
        legendIndex: -2
      }, {
        name: 'nonseismic',
        color: 'green',
        animation: false,
        marker: {
          enabled: false
        },
        legendIndex: -1
      // }, {
      //   name: 'TACLS',
      //   color: 'blue',
      //   animation: false,
      //   marker: {
      //     enabled: false
      //   },
      //   legendIndex: 20
      }, {
        type: 'line',
        zIndex: 99,
        color: 'red',
        animation: false,
        marker: {
          enabled: false
        },
        states: {
          hover: {
            enabled: false
          },
          inactive: {
            opacity: 1
          }
        },
        label: {
          enabled: false
        },
        enableMouseTracking: true
      }, {
        type: 'scatter',
        animation: false,
        marker: {
          radius: 1.3,
          symbol: 'square'
        },
        cursor: 'pointer',
        point: {
          events: {
            click: function () {
              var d = convertDecimalDate(this.x);
              var dateString = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + ' (' + d.getFullYear() + '-' + doy(d) + ')';
              alert('x: ' + dateString + ',  y: ' + (Math.round(this.y * 100) / 100).toFixed(2) + ' mm');
            }
          }
        }
      }]
    };

    // create options for each chart type
    var optionsn = $.extend(true, {}, options);
    var optionse = $.extend(true, {}, options);
    var optionsu = $.extend(true, {}, options);
    var errorsn = 0;
    var errorse = 0;
    var errorsu = 0;
    var resultsn = [];
    var resultse = [];
    var resultsu = [];
    var asyncn = [];
    var asynce = [];
    var asyncu = [];
    var legendDefaultText = 'All selected sites shown. Click series below to remove from chart.';
    var legendText = legendDefaultText;

    for (var i = 0; i < sites.length; i++) {
      if (stackOn) {
        site = this.siteOptionsList[i].sites[0];
        source = this.siteOptionsList[i].source;
        fil = this.siteOptionsList[i].fil;
        type = this.siteOptionsList[i].type;
      } else {
        site = sites[i];
      }
      if (i > 0) { //create additional series
        optionsn.series.push($.extend(true, {}, options.series[2]));
        optionsn.series.push($.extend(true, {}, options.series[3]));
        optionse.series.push($.extend(true, {}, options.series[2]));
        optionse.series.push($.extend(true, {}, options.series[3]));
        optionsu.series.push($.extend(true, {}, options.series[2]));
        optionsu.series.push($.extend(true, {}, options.series[3]));
      }
      if (load && site != null) {
        const Chart1 = Highcharts.charts.find(chart => chart && chart.renderTo.id === 'chart1');
        if (typeof Chart1 !== 'undefined') {
          Chart1.showLoading();
        } else {
          $('#chart1').html(loadMsg);
        }
        if (neu.includes('n')) {
          asyncn[i] = $.ajax({
            idx: i,
            url: 'api/eseses/neu/' + site + '/' + source + '/' + fil + '/' + type + '/n',
            dataType: 'json',
            traceColors: ['red', 'fuchsia', 'brown', 'blue', 'black'],
            success: function (data) {
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
              if (data['err']) {
                if (sites.length < 2) {
                  $('#chart1').html(data['err']);
                  optionsn = null;
                }
                var legendTitle = $('.highcharts-legend-title').children(0).children(0);
                if (typeof legendTitle.html() !== 'undefined') {
                  legendText = $(legendTitle).html().replace(legendDefaultText, '').replace(data['err'].slice(0, -3) + '.', '') + data['err'].slice(0, -3) + '. ';
                  $(legendTitle).html(legendText);
                }
                errorsn++;
                return;
              }
              var datan = data['n'];
              if (optionsn.xAxis.min > datan['time_min']) {
                optionsn.xAxis.min = datan['time_min'];
              }
              if (optionsn.xAxis.max < datan['time_max']) {
                optionsn.xAxis.max = datan['time_max'];
              }
              optionsn.yAxis.minorTicks = true;
              optionsn.yAxis.startOnTick = false;
              optionsn.yAxis.endOnTick = false;
              optionsn.yAxis.minPadding = 0;
              if (this.idx == 0) {
                optionsn.title.text = datan['site'] + '<br>North';
                optionsn.subtitle.text = 'slope ' + datan['slope'];
                optionsn.series[2].name = datan['name'] + ' model trace';
                optionsn.series[3].name = datan['name'] + ' points';
                optionsn.series[2].data = datan['trace'];
                optionsn.series[3].data = datan['data'];
                optionsn.series[2].legendIndex = 3;
                optionsn.series[3].legendIndex = 2;
              } else {
                optionsn.subtitle.text = optionsn.subtitle.text + '<br>slope ' + datan['slope'];
                let offsetTracen = datan['trace'].map(n => [n[0], n[1] == null ? n[1] : (n[1] + offset * (this.idx - errorsn))]);
                let offsetDatan = datan['data'].map(n => [n[0], n[1] + offset * (this.idx - errorsn)]);
                if (typeof optionsn.series[(this.idx - errorsn) * 2 + 2] !== 'undefined') {
                  optionsn.series[(this.idx - errorsn) * 2 + 2].name = datan['name'] + ' model trace';
                  optionsn.series[(this.idx - errorsn) * 2 + 3].name = datan['name'] + ' points';
                  optionsn.series[(this.idx - errorsn) * 2 + 2].data = offsetTracen;
                  optionsn.series[(this.idx - errorsn) * 2 + 3].data = offsetDatan;
                  optionsn.series[(this.idx - errorsn) * 2 + 2].color = this.traceColors[this.idx];
                  optionsn.series[(this.idx - errorsn) * 2 + 2].legendIndex = (this.idx - errorsn) * 2 + 3;
                  optionsn.series[(this.idx - errorsn) * 2 + 3].legendIndex = (this.idx - errorsn) * 2 + 2;
                }
              }
              // plotlines
              if (datan['plotlines'].length == 0 || coseismics == false) {
                optionsn.series[0].showInLegend = false;
                optionsn.series[1].showInLegend = false;
              } else {
                optionsn.xAxis.plotLines = datan['plotlines'];
              }
            },
            error: function (jqXHR, textStatus, errorThrown) {
              optionsn = null;
              var errorMsg = '<div>Unable to retrieve data for site: "' + site + '." ' + errorThrown + '</div>';
              $('#chart1').html(errorMsg);
              $('#chart1').show();
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
            }
          });
        }
        const Chart2 = Highcharts.charts.find(chart => chart && chart.renderTo.id === 'chart2');
        if (typeof Chart2 !== 'undefined') {
          Chart2.showLoading();
        } else {
          $('#chart2').html(loadMsg);
        }
        if (neu.includes('e')) {
          asynce[i] = $.ajax({
            idx: i,
            url: 'api/eseses/neu/' + site + '/' + source + '/' + fil + '/' + type + '/e',
            dataType: 'json',
            traceColors: ['red', 'fuchsia', 'brown', 'blue', 'black'],
            success: function (data) {
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
              if (data['err']) {
                $('#chart2').html(data['err']);
                if (sites.length < 2) {
                  optionse = null;
                }
                var legendTitle = $('.highcharts-legend-title').children(0).children(0);
                if (typeof legendTitle.html() !== 'undefined') {
                  legendText = $(legendTitle).html().replace(legendDefaultText, '').replace(data['err'].slice(0, -3) + '.', '') + data['err'].slice(0, -3) + '. ';
                  $(legendTitle).html(legendText);
                }
                errorse++;
                return;
              }
              var datae = data['e'];
              if (optionse.xAxis.min > datae['time_min']) {
                optionse.xAxis.min = datae['time_min'];
              }
              if (optionse.xAxis.max < datae['time_max']) {
                optionse.xAxis.max = datae['time_max'];
              }
              optionse.yAxis.minorTicks = true;
              optionse.yAxis.startOnTick = false;
              optionse.yAxis.endOnTick = false;
              optionse.yAxis.minPadding = 0;
              if (this.idx == 0) {
                optionse.title.text = datae['site'] + '<br>East';
                optionse.subtitle.text = 'slope ' + datae['slope'];
                optionse.series[2].name = datae['name'] + ' model trace';
                optionse.series[3].name = datae['name'] + ' points';
                optionse.series[2].data = datae['trace'];
                optionse.series[3].data = datae['data'];
                optionse.series[2].legendIndex = 3;
                optionse.series[3].legendIndex = 2;
              } else {
                optionse.subtitle.text = optionse.subtitle.text + '<br>slope ' + datae['slope'];
                let offsetTracee = datae['trace'].map(n => [n[0], n[1] == null ? n[1] : (n[1] + offset * (this.idx - errorse))]);
                let offsetDatae = datae['data'].map(n => [n[0], n[1] + offset * (this.idx - errorse)]);
                if (typeof optionse.series[(this.idx - errorse) * 2 + 2] !== 'undefined') {
                  optionse.series[(this.idx - errorse) * 2 + 2].name = datae['name'] + ' model trace';
                  optionse.series[(this.idx - errorse) * 2 + 3].name = datae['name'] + ' points';
                  optionse.series[(this.idx - errorse) * 2 + 2].data = offsetTracee;
                  optionse.series[(this.idx - errorse) * 2 + 3].data = offsetDatae;
                  optionse.series[(this.idx - errorse) * 2 + 2].color = this.traceColors[this.idx];
                  optionse.series[(this.idx - errorse) * 2 + 2].legendIndex = (this.idx - errorse) * 2 + 3;
                  optionse.series[(this.idx - errorse) * 2 + 3].legendIndex = (this.idx - errorse) * 2 + 2;
                }
              }
              // plotlines
              if (datae['plotlines'].length == 0 || coseismics == false) {
                optionse.series[0].showInLegend = false;
                optionse.series[1].showInLegend = false;
              } else {
                optionse.xAxis.plotLines = datae['plotlines'];
              }
              // experimental tacls data
              if (['p058', 'p158'].includes(site)) {
                console.log('Getting tacls data')
                let sync_tacls = $.ajax({
                  url: 'api/eseses/tacls/' + site + '/' + source + '/' + fil + '/' + type + '/e',
                  dataType: 'json',
                  async: false,
                  success: function (data) {
                    for (i in optionse.xAxis.plotLines) {
                      data.push(optionse.xAxis.plotLines[i])
                    }
                    optionse.xAxis.plotLines = data;
                    console.log(optionse.xAxis.plotLines);
                  },
                  error: function (jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                  }
                })
              }

            },
            error: function (jqXHR, textStatus, errorThrown) {
              optionse = null;
              var errorMsg = '<div>Unable to retrieve data for site: "' + site + '." ' + errorThrown + '</div>';
              $('#chart2').html(errorMsg);
              $('#chart2').show();
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
            }
          });
        }
        if (neu.includes('u')) {
          const Chart3 = Highcharts.charts.find(chart => chart && chart.renderTo.id === 'chart3');
          if (typeof Chart3 !== 'undefined') {
            Chart3.showLoading();
          } else {
            $('#chart3').html(loadMsg);
          }
          asyncu[i] = $.ajax({
            idx: i,
            url: 'api/eseses/neu/' + site + '/' + source + '/' + fil + '/' + type + '/u',
            dataType: 'json',
            traceColors: ['red', 'fuchsia', 'brown', 'blue', 'black'],
            success: function (data) {
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
              if (data['err']) {
                $('#chart3').html(data['err']);
                if (sites.length < 2) {
                  optionsu = null;
                }
                var legendTitle = $('.highcharts-legend-title').children(0).children(0);
                if (typeof legendTitle.html() !== 'undefined') {
                  legendText = $(legendTitle).html().replace(legendDefaultText, '').replace(data['err'].slice(0, -3) + '.', '') + data['err'].slice(0, -3) + '. ';
                  $(legendTitle).html(legendText);
                }
                errorsu++;
                return;
              }
              var datau = data['u'];
              if (optionsu.xAxis.min > datau['time_min']) {
                optionsu.xAxis.min = datau['time_min'];
              }
              if (optionsu.xAxis.max < datau['time_max']) {
                optionsu.xAxis.max = datau['time_max'];
              }
              optionsu.yAxis.minorTicks = true;
              optionsu.yAxis.startOnTick = false;
              optionsu.yAxis.endOnTick = false;
              optionsu.yAxis.minPadding = 0;
              if (this.idx == 0) {
                optionsu.title.text = datau['site'] + '<br>Up';
                optionsu.subtitle.text = 'slope ' + datau['slope'];
                optionsu.series[2].name = datau['name'] + ' model trace';
                optionsu.series[3].name = datau['name'] + ' points';
                optionsu.series[2].data = datau['trace'];
                optionsu.series[3].data = datau['data'];
                optionsu.series[2].legendIndex = 3;
                optionsu.series[3].legendIndex = 2;
              } else {
                optionsu.subtitle.text = optionsu.subtitle.text + '<br>slope ' + datau['slope'];
                let offsetTraceu = datau['trace'].map(n => [n[0], n[1] == null ? n[1] : (n[1] + offset * (this.idx - errorsu))]);
                let offsetDatau = datau['data'].map(n => [n[0], n[1] + offset * (this.idx - errorsu)]);
                if (typeof optionsu.series[(this.idx - errorsu) * 2 + 2] !== 'undefined') {
                  optionsu.series[(this.idx - errorsu) * 2 + 2].name = datau['name'] + ' model trace';
                  optionsu.series[(this.idx - errorsu) * 2 + 3].name = datau['name'] + ' points';
                  optionsu.series[(this.idx - errorsu) * 2 + 2].data = offsetTraceu;
                  optionsu.series[(this.idx - errorsu) * 2 + 3].data = offsetDatau;
                  optionsu.series[(this.idx - errorsu) * 2 + 2].color = this.traceColors[this.idx];
                  optionsu.series[(this.idx - errorsu) * 2 + 2].legendIndex = (this.idx - errorsu) * 2 + 3;
                  optionsu.series[(this.idx - errorsu) * 2 + 3].legendIndex = (this.idx - errorsu) * 2 + 2;
                }
              }
              // plotlines
              if (datau['plotlines'].length == 0 || coseismics == false) {
                optionsu.series[0].showInLegend = false;
                optionsu.series[1].showInLegend = false;
              } else {
                optionsu.xAxis.plotLines = datau['plotlines'];
              }
            },
            error: function (jqXHR, textStatus, errorThrown) {
              optionsu = null;
              var errorMsg = '<div>Unable to retrieve data for site: "' + site + '." ' + errorThrown + '</div>';
              $('#chart3').html(errorMsg);
              $('#chart3').show();
              $('#optionsDiv').children().prop('disabled', false);
              $('#sitesDiv').children().prop('disabled', false);
            }
          });
        }
      }
    }

    var loadLegends = function (series) {
      var options = {
        title: {
          text: ''
        },
        tooltip: {
          enabled: false
        },
        legend: {
          enabled: true,
          verticalAlign: 'top',
          floating: true,
          itemStyle: {
            fontSize: '10px'
          },
          title: {
            text: legendText,
            style: {
              color: 'gray',
              fontSize: '10px'
            },
            textAlign: 'center',
          }
        },
        credits: {
          enabled: false
        },
        accessibility: {
          enabled: false
        }
      };

      options.plotOptions = {
        series: {
          events: {
            legendItemClick: function () {
              var sname = this.name.split(' - ')[0];
              // Ignore offsets
              if (this.name.includes('seismic')) {
                return false;
              }
              if (!confirm('Do you want to remove ' + sname + '?')) {
                return false;
              } else {
                for (var i = ToolController_.activeTool.siteOptionsList.length - 1; i > -1; i--) {
                  if (sname.toLowerCase().includes(ToolController_.activeTool.siteOptionsList[i].sites[0]) &&
                    sname.toLowerCase().includes(ToolController_.activeTool.siteOptionsList[i].source) &&
                    sname.toLowerCase().replace(/ /g, '').replace('filter', "flt").includes(ToolController_.activeTool.siteOptionsList[i].fil)) {
                    ToolController_.activeTool.siteOptionsList.splice(i, 1);
                  }
                }
                sites = []
                // var Chart0 = Highcharts.chart('chart0', options);
                const Chart0 = Highcharts.charts.find(chart => chart && chart.renderTo.id === 'chart0');
                // This catches multiple sites that are not stackOn
                if (Chart0.series.length > 4 && ToolController_.activeTool.siteOptionsList.length == 0) {
                  for (var j = ToolController_.activeTool.sites.length - 1; j > -1; j--) {
                    if (!sname.includes(ToolController_.activeTool.sites[j])) {
                      sites.push(ToolController_.activeTool.sites[j])
                    }
                  }
                  ToolController_.activeTool.sites = sites;
                }
                if (sites.length == 0 && ToolController_.activeTool.siteOptionsList.length == 0) {
                  // Don't display if all sites removed
                  $('#chart1').hide();
                  $('#chart2').hide();
                  $('#chart3').hide();
                  // var Chart0 = $('#chart0').highcharts();
                  for (var i = Chart0.series.length - 1; i > -1; i--) {
                    if (Chart0.series[i].name.includes(sname) || Chart0.series[i].name.includes('Series')) {
                      Chart0.series[i].remove();
                    }
                  }
                  return false;
                }
                if (ToolController_.activeTool.stackOn == false) {
                  ToolController_.activeTool.siteOptionsList = [];
                }
                // refresh chart with existing data
                siteOptions = new SiteOptions(
                  sites,
                  ToolController_.activeTool.source,
                  ToolController_.activeTool.fil,
                  ToolController_.activeTool.type
                );
                ToolController_.activeTool.loadChart(
                  siteOptions,
                  [ToolController_.activeTool.north,
                  ToolController_.activeTool.east,
                  ToolController_.activeTool.up
                  ],
                  ToolController_.activeTool.coseismics,
                  ToolController_.activeTool.offset,
                  ToolController_.activeTool.stackOn
                );
                // Remove from actual legend last
                // var Chart0 = $('#chart0').highcharts();
                for (var i = Chart0.series.length - 1; i > -1; i--) {
                  if (Chart0.series[i].name.includes(sname) || Chart0.series[i].name.includes('Series')) {
                    Chart0.series[i].remove();
                  }
                }
                return false;
              }
            }
          }
        }
      }
      // Remove unneeded data from legends
      for (var j = 0; j < series.length; j++) {
        series[j].data = [];
      }
      options.series = series;
      Highcharts.chart('chart0', options);
      // Remove unneeded chart elements; leave only legend elements
      $('.highcharts-legend').parent().children('g').each(function () {
        if ($(this).attr('class').includes('highcharts-legend') == false) {
          $(this).remove();
        }
      });
      $('.highcharts-legend').parent().children('defs').each(function () {
        $(this).remove();
      });
      $('.highcharts-legend-navigation').remove();
      $('.highcharts-legend-nav-active').remove();
      $('.highcharts-legend-nav-inactive').remove();
    };

    if (load) {
      for (var i = 0; i < sites.length; i++) {
        // Disable controls to prevent requests from racing each other
        $('#optionsDiv').children().prop('disabled', true);
        $('#sitesDiv').children().prop('disabled', true);
        // Load each chart
        resultsn.push(asyncn[i]);
        resultse.push(asynce[i]);
        resultsu.push(asyncu[i]);
      }
      $.when.apply(this, resultsn).done(function () {
        if (optionsn) {
          var missingData = 0;
          var returnedSites = []
          if (!sites.every((val, i, arr) => val === arr[0])) {
            optionsn.title.text = 'Multiple Sites<br>North';
          }
          for (var j = 0; j < optionsn.series.length; j++) {
            if (optionsn.series[j].type == 'scatter') {
              if ((typeof optionsn.series[j].name == 'undefined')) {
                missingData = missingData + 1;
                optionsn.series.splice(j - 1, 2);
                j = 0; // restart count if spliced
              } else {
                returnedSites.push(optionsn.series[j].name.split(':')[0]);
              }
            }
          }
          let missingSites = sites.filter(x => !returnedSites.includes(x));
          if (missingSites.length > 0) {
            console.log('Missing North data for ' + missingSites.join(' '));
            for (var i = 0; i < ToolController_.activeTool.siteOptionsList.length; i++) {
              if (missingSites.includes(ToolController_.activeTool.siteOptionsList[i].sites[0])) {
                ToolController_.activeTool.siteOptionsList.splice(ToolController_.activeTool.siteOptionsList.indexOf(ToolController_.activeTool.siteOptionsList[i]), 1);
              }
            }
            if (sites.length - missingData > 3) {
              optionsn.subtitle.text = '';
            }
            // remove empty series
            for (var j = 0; j < optionsn.series.length; j++) {
              if ((typeof optionsn.series[j].name == 'undefined')) {
                optionsn.series.splice(j, 2);
                j = 0; // restart count if spliced
              }
            }
          }
          // Move line traces to the end to be rendered last (on top)
          if (neu.includes('n')) {
            for (var j = 0; j < optionsn.series.length; j++) {
              if (typeof optionsn.series[j].name !== "undefined") {
                if (optionsn.series[j].name.includes("trace")) {
                  optionsn.series.push(optionsn.series[j]);
                  optionsn.series.splice(j, 1);
                }
              }
            }
          }
          var Chart1 = Highcharts.chart('chart1', optionsn);

          // Handle legends
          loadLegends(optionsn.series);
          var legend1Enabled = false;
          var showLegend1 = function () {
            Chart1.update({
              chart: {
                marginBottom: legend1Enabled ? 90 : 150
              },
              subtitle: {
                y: legend1Enabled ? -12 : -75
              },
              legend: {
                enabled: legend1Enabled ? false : true,
                itemStyle: {
                  fontSize: '10px'
                }
              }
            })
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend1Enabled = false;
            } else {
              legend1Enabled = !legend1Enabled;
            }
          };

          document.addEventListener("fullscreenchange", function () {
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend1Enabled = false;
            } else {
              legend1Enabled = true;
            }
            showLegend1();
          });

          var addLegendListeners1 = function () {
            var elements = document.getElementsByClassName('highcharts-menu-item');
            for (var i = 0; i < elements.length; i++) {
              elements[i].addEventListener('mouseenter', showLegend1, false);
              elements[i].addEventListener('mouseleave', showLegend1, false);
            }
          };

          var elements1 = document.getElementsByClassName('highcharts-contextbutton');
          for (var i = 0; i < elements1.length; i++) {
            elements1[i].addEventListener('click', addLegendListeners1, false);
          }

          if (neu.includes('n')) {
            $('#chart1').show();
          } else {
            $('#chart1').hide();
          }
        }
        if (sites.length == 1) {
          $('#siteSelect').val(sites[0]); // ensure focus is in sync
        }
      });
      $.when.apply(this, resultse).done(function () {
        if (optionse) {
          var missingData = 0;
          var returnedSites = []
          if (!sites.every((val, i, arr) => val === arr[0])) {
            optionse.title.text = 'Multiple Sites<br>East';
          }
          for (var j = 0; j < optionse.series.length; j++) {
            if (optionse.series[j].type == 'scatter') {
              if ((typeof optionse.series[j].name == 'undefined')) {
                missingData = missingData + 1;
                optionse.series.splice(j - 1, 2);
                j = 0; // restart count if spliced
              } else {
                returnedSites.push(optionse.series[j].name.split(':')[0]);
              }
            }
          }
          let missingSites = sites.filter(x => !returnedSites.includes(x));
          if (missingSites.length > 0) {
            console.log('Missing East data for ' + missingSites.join(' '));
            for (var i = 0; i < ToolController_.activeTool.siteOptionsList.length; i++) {
              if (missingSites.includes(ToolController_.activeTool.siteOptionsList[i].sites[0])) {
                ToolController_.activeTool.siteOptionsList.splice(ToolController_.activeTool.siteOptionsList.indexOf(ToolController_.activeTool.siteOptionsList[i]), 1);
              }
            }
            if (sites.length - missingData > 3) {
              optionse.subtitle.text = '';
            }
            // remove empty series
            for (var j = 0; j < optionse.series.length; j++) {
              if ((typeof optionse.series[j].name == 'undefined')) {
                optionse.series.splice(j, 2);
                j = 0; // restart count if spliced
              }
            }
          }
          // Move line traces to the end to be rendered last (on top)
          if (neu.includes('e')) {
            for (var j = 0; j < optionse.series.length; j++) {
              if (typeof optionse.series[j].name !== "undefined") {
                if (optionse.series[j].name.includes("trace")) {
                  optionse.series.push(optionse.series[j]);
                  optionse.series.splice(j, 1);
                }
              }
            }
          }
          var Chart2 = Highcharts.chart('chart2', optionse);

          // Handle legends
          loadLegends(optionse.series);
          var legend2Enabled = false;
          var showLegend2 = function () {
            Chart2.update({
              chart: {
                marginBottom: legend2Enabled ? 90 : 150
              },
              subtitle: {
                y: legend2Enabled ? -12 : -75
              },
              legend: {
                enabled: legend2Enabled ? false : true,
                itemStyle: {
                  fontSize: '10px'
                }
              }
            })
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend2Enabled = false;
            } else {
              legend2Enabled = !legend2Enabled;
            }
          };

          document.addEventListener("fullscreenchange", function () {
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend2Enabled = false;
            } else {
              legend2Enabled = true;
            }
            showLegend2();
          });

          var addLegendListeners2 = function () {
            var elements = document.getElementsByClassName('highcharts-menu-item');
            for (var i = 0; i < elements.length; i++) {
              elements[i].addEventListener('mouseenter', showLegend2, false);
              elements[i].addEventListener('mouseleave', showLegend2, false);
            }
          };

          var elements2 = document.getElementsByClassName('highcharts-contextbutton');
          for (var i = 0; i < elements2.length; i++) {
            elements2[i].addEventListener('click', addLegendListeners2, false);
          }

          if (neu.includes('e')) {
            $('#chart2').show();
          } else {
            $('#chart2').hide();
          }
        }
        if (sites.length == 1) {
          $('#siteSelect').val(sites[0]); // ensure focus is in sync
        }
      });
      $.when.apply(this, resultsu).done(function () {
        if (optionsu) {
          var missingData = 0;
          var returnedSites = []
          if (!sites.every((val, i, arr) => val === arr[0])) {
            optionsu.title.text = 'Multiple Sites<br>Up';
          }
          for (var j = 0; j < optionsu.series.length; j++) {
            if (optionsu.series[j].type == 'scatter') {
              if ((typeof optionsu.series[j].name == 'undefined')) {
                missingData = missingData + 1;
                optionsu.series.splice(j - 1, 2);
                j = 0; // restart count if spliced
              } else {
                returnedSites.push(optionsu.series[j].name.split(':')[0]);
              }
            }
          }
          let missingSites = sites.filter(x => !returnedSites.includes(x));
          if (missingSites.length > 0) {
            console.log('Missing Up data for ' + missingSites.join(' '));
            for (var i = 0; i < ToolController_.activeTool.siteOptionsList.length; i++) {
              if (missingSites.includes(ToolController_.activeTool.siteOptionsList[i].sites[0])) {
                ToolController_.activeTool.siteOptionsList.splice(ToolController_.activeTool.siteOptionsList.indexOf(ToolController_.activeTool.siteOptionsList[i]), 1);
              }
            }
            if (sites.length - missingData > 3) {
              optionsu.subtitle.text = '';
            }
            // remove empty series
            for (var j = 0; j < optionsu.series.length; j++) {
              if ((typeof optionsu.series[j].name == 'undefined')) {
                optionsu.series.splice(j, 2);
                j = 0; // restart count if spliced
              }
            }
          }
          // Move line traces to the end to be rendered last (on top)
          if (neu.includes('u')) {
            for (var j = 0; j < optionsu.series.length; j++) {
              if (typeof optionsu.series[j].name !== "undefined") {
                if (optionsu.series[j].name.includes("trace")) {
                  optionsu.series.push(optionsu.series[j]);
                  optionsu.series.splice(j, 1);
                }
              }
            }
          }
          var Chart3 = Highcharts.chart('chart3', optionsu);

          // Handle legends
          loadLegends(optionsu.series);
          var legend3Enabled = false;
          var showLegend3 = function () {
            Chart3.update({
              chart: {
                marginBottom: legend3Enabled ? 90 : 150
              },
              subtitle: {
                y: legend3Enabled ? -12 : -75
              },
              legend: {
                enabled: legend3Enabled ? false : true,
                itemStyle: {
                  fontSize: '10px'
                }
              }
            })
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend3Enabled = false;
            } else {
              legend3Enabled = !legend3Enabled;
            }
          };

          document.addEventListener("fullscreenchange", function () {
            if ((window.fullScreen) ||
              (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
              legend3Enabled = false;
            } else {
              legend3Enabled = true;
            }
            showLegend3();
          });

          var addLegendListeners3 = function () {
            var elements = document.getElementsByClassName('highcharts-menu-item');
            for (var i = 0; i < elements.length; i++) {
              elements[i].addEventListener('mouseenter', showLegend3, false);
              elements[i].addEventListener('mouseleave', showLegend3, false);
            }
          };

          var elements3 = document.getElementsByClassName('highcharts-contextbutton');
          for (var i = 0; i < elements3.length; i++) {
            elements3[i].addEventListener('click', addLegendListeners3, false);
          }

          if (neu.includes('u')) {
            $('#chart3').show();
          } else {
            $('#chart3').hide();
          }
        }
        if (sites.length == 1) {
          $('#siteSelect').val(sites[0]); // ensure focus is in sync
        }
      });
    }

  },
  destroy: function () {
    $("#siteSelect > option").each(function () {
      ToolController_.activeTool.previousSites.push(this.value);
    });
    $('#siteSelect').empty();
    $('#textGroup').val('Default Group');
    ToolController_.activeTool.site = '';
    ToolController_.activeTool.sites = [];
    ToolController_.activeTool.siteOptionsList = [];
    L_.resetLayerFills();
    this.MMGISInterface.separateFromMMGIS();
  },
  getUrlString: function () {
    return '';
  },
  clickMap: function (e) {
    if (ChartTool.drawing._errorShown == true) {
      return
    }
    CursorInfo.hide()
    var xy = { lat: ChartTool.drawing._currentLatLng.lat, lon: ChartTool.drawing._currentLatLng.lng }
    ChartTool.clickedLatLngs.push(xy)
  },
  drawStop: function (e) {
    if (ChartTool.clickedLatLngs.length > 0) {
      ToolController_.getTool('SearchTool').searchPoly(ChartTool.clickedLatLngs, 'Distance');
    }
    ChartTool.clickedLatLngs = []
    ChartTool.drawing.disable()
  }
};

//
function interfaceWithMMGIS() {
  this.separateFromMMGIS = function () { separateFromMMGIS(); }

  //MMGIS should always have a div with id 'tools'
  var tools = d3.select('#tools');
  //Clear it
  tools.selectAll('*').remove();
  //Add a semantic container
  tools = tools.append('div')
    .attr('class', 'center aligned ui padded grid')
    .style('overflow', 'auto')
    .style('height', '100%');
  //Add the markup to tools or do it manually
  //tools.html( markup );

  //Add event functions and whatnot

  //Share everything. Don't take things that aren't yours.
  // Put things back where you found them.
  function separateFromMMGIS() {

  }
}

// function resizeChartTool() {
//   if (window.innerHeight < 1255) {
//     var height = window.innerHeight - 55;
//   } else {
//     var height = 1200; //recommended min height to avoid scrolling
//   }
//   $('#toolsWrapper').height(height);
// }

//Other functions

function doy(dateObject) {
  var start = new Date(dateObject.getFullYear(), 0, 0);
  var diff = (dateObject - start) + ((start.getTimezoneOffset() - dateObject.getTimezoneOffset()) * 60 * 1000);
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return day;
}

function leapYear(year) {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}

function convertDecimalDate(decimalDate) {
  var year = parseInt(decimalDate);
  var reminder = decimalDate - year;
  var daysPerYear = leapYear(year) ? 366 : 365;
  var miliseconds = reminder * daysPerYear * 24 * 60 * 60 * 1000;
  var yearDate = new Date(year, 0, 1);
  return new Date(yearDate.getTime() + miliseconds);
}

export default ChartTool;