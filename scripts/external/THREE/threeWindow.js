// As THREE.js comes with many addons/plugins mix them all into one three object here
define( [ 'threeCore' ],
function(  threeCore  ) {
  window.THREE = threeCore;
  return threeCore;
} );
