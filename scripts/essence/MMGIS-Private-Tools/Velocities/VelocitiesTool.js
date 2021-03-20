//New Tool Template
//In the very least, each tool needs to be defined through require.js and return
// an object with 'make' and 'destroy' functions
define(  [ 'jquery', 'd3', 'Formulae_', 'Layers_', 'Map_', 'Viewer_' ],
function (    $    ,  d3 ,      F_    ,     L_   ,  Map_ ,  Viewer_  ) {

  //Add the tool markup if you want to do it this way
  var markup = [].join('\n');

  var VelocitiesTool = {
    height: 'threefourths',
    width: 230,
    source: 'comb',
    direction: 'horizontal',
    vectorExaggeration: 1,
    vectorFilter: 'all',
    MMGISInterface: null,
    make: function() {
      this.MMGISInterface = new interfaceWithMMGIS();
      
      var velocityOptions = ['<br><b>Velocity Options</b><br>',
          '<br>Source:<br>',
          '<select id="selectVelocitySource" style="color:black">',
              '<option value="comb">Combination</option>',
              '<option value="jpl">JPL</option>',
              '<option value="sopac">SOPAC</option>',
          '</select><br>',
          '<br>Direction:<br>',
          '<select id="selectDirection" style="color:black">',
              '<option value="horizontal">Horizontal</option>',
              '<option value="vertical">Vertical</option>',
          '</select><br>',
          '<br>Display:<br>',
          '<select id="selectDisplay" style="color:black">',
              '<option value="all">All</option>',
              '<option value="greater">&gt;=20</option>',
          '</select><br>',
          '<span style="font-size:10px">Show only velocities (mm)<br>greater than selected value<br>in any direction.</span><br>',
          '<br>Exaggeration:<br>',
          '<select id="selectLength" style="color:black">',
              '<option value="1">1</option>',
              '<option value="2">2</option>',
              '<option value="3">3</option>',
          '</select><br>',
          '<span style="font-size:10px">Exaggerate the size<br>of arrows.</span><br>',
          '<br>'].join('\n');

      var tools = d3.select( '#tools' );
      tools.selectAll( '*' ).remove();
      this.velocitiesDiv = tools.append( 'div' )
      .attr('id', 'velocitiesDiv')
      .style( 'width', '230px' )
      .style( 'position', 'relative' )
      .style( 'float', 'left')
      .style( 'padding', '20px')
      .style( 'height', '100%')
      .html(velocityOptions);
      $("#selectVelocitySource").val(this.source);
      $("#selectDirection").val(this.direction);
      $("#selectDisplay").val(this.vectorFilter);
      $("#selectLength").val(this.vectorExaggeration);

      // Turn on Velocities if it's not already on
      if (L_.toggledArray['Velocities'] ==  false) {
        L_.toggleLayer( L_.layersNamed['Velocities'] );
      }

      $('#selectVelocitySource').on('change', function(e) {
        velocitiesUrl = L_.layersNamed['Velocities'].url.substring(0, L_.layersNamed['Velocities'].url.lastIndexOf('/') + 1);
        ToolController_.activeTool.source = this.value;
        L_.layersNamed['Velocities'].url = velocitiesUrl + this.value;
        Map_.refreshLayer( L_.layersNamed['Velocities']);
      });

      $('#selectLength').on('change', function(e) {
        ToolController_.activeTool.vectorExaggeration = this.value;
        Map_.vectorExaggeration = this.value;
        Map_.refreshLayer( L_.layersNamed['Velocities']);
      });

      $('#selectDirection').on('change', function(e) {
        ToolController_.activeTool.direction = this.value;
        Map_.vectorOptions = this.value;
        Map_.refreshLayer( L_.layersNamed['Velocities']);
      });

      $('#selectDisplay').on('change', function(e) {
        ToolController_.activeTool.vectorFilter = this.value;
        Map_.vectorFilter = this.value;
        Map_.refreshLayer( L_.layersNamed['Velocities']);
      });
      
    },
    destroy: function() {
      this.MMGISInterface.separateFromMMGIS();
    },
    getUrlString: function() {
      return '';
    }
  };

  //
  function interfaceWithMMGIS() {
    this.separateFromMMGIS = function(){ separateFromMMGIS(); }

    //MMGIS should always have a div with id 'tools'
    var tools = d3.select( '#tools' );
    //Clear it
    tools.selectAll( '*' ).remove();
    //Add a semantic container
    tools = tools.append( 'div' )
      .attr('class', 'center aligned ui padded grid' )
      .style( 'height', '100%' );
    //Add the markup to tools or do it manually
    //tools.html( markup );

    //Add event functions and whatnot

    //Share everything. Don't take things that aren't yours.
    // Put things back where you found them.
    function separateFromMMGIS() {

    }
  }

  //Other functions

  return VelocitiesTool;

} );