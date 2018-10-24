let map;
// Create a new blank array for all the listing markers.
let markers = [];

let polygon = null;

function initMap() {

  const styles = [
                  {featureType: 'water', stylers: [{ color: '#19a0d8'}]},
                  {featureType: 'administrative', elementType: 'labels.text.stroke', stylers: [{color: '#ffffff'},{weight: 6}]},
                  {featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{color: '#e85113'}]},
                  {featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{color: '#efe9e4'}, {lightness: -40}]},
                  {featureType: 'transit.station', stylers: [{weight: 9}, {hue: '#e85113'}]},
                  {featureType: 'road.highway', elementType: 'labels.icon', stylers: [{ visibility: 'off' }]},
                  {featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ lightness: 100 }]},
                  {featureType: 'water', elementType: 'labels.text.fill', stylers: [{lightness: -100 }]},
                  {featureType: 'poi', elementType: 'geometry', stylers: [{visibility: 'on'}, {color: '#f0e4d3'}]},
                  {featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{color: '#efe9e4'}, {lightness: -25}]}
                ];

  // Constructor creates a new map - only center and zoom are required.
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 40.7413549, lng: -73.9980244},
    zoom: 13,
    styles: styles,
    mapTypeControl: false
  });

  /*These are the real estate listings that will be shown to the user.
    Normally we'd have these in a database instead.*/
  const locations = [
    {title: 'Park Ave Penthouse', location: {lat: 40.7713024, lng: -73.9632393}},
    {title: 'Chelsea Loft', location: {lat: 40.7444883, lng: -73.9949465}},
    {title: 'Union Square Open Floor Plan', location: {lat: 40.7347062, lng: -73.9895759}},
    {title: 'East Village Hip Studio', location: {lat: 40.7281777, lng: -73.984377}},
    {title: 'TriBeCa Artsy Bachelor Pad', location: {lat: 40.7195264, lng: -74.0089934}},
    {title: 'Chinatown Homey Space', location: {lat: 40.7180628, lng: -73.9961237}}
  ];

  const largeInfowindow = new google.maps.InfoWindow();

  // Initialize the drawing manager.
  const drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYGON
      ]
    }
  });

  // Style the markers a bit. This will be our listing marker icon.
  const defaultIcon = makeMarkerIcon('0091ff');
  
  // Create a "highlighted location" marker color for when the user mouses over the marker.
  const highlightedIcon = makeMarkerIcon('FFFF24');


  // The following group uses the location array to create an array of markers on initialize.
  markers = locations.map((position, index) => {
    const marker = new google.maps.Marker({
      position: position.location,
      title: position.title,
      animation: google.maps.Animation.DROP,
      icon: defaultIcon,
      id: index
    });

    marker.addListener('click', function() {
      populateInfoWindow(this, largeInfowindow);
    });

    marker.addListener('mouseover', function () {
      this.setIcon(highlightedIcon);
    });
    marker.addListener('mouseout', function () {
      this.setIcon(defaultIcon);
    })

    return marker;
  });

  document.getElementById('show-listings').addEventListener('click', showListings);
  document.getElementById('hide-listings').addEventListener('click', hideListings);
  document.getElementById('toggle-drawing').addEventListener('click', function() {
    toggleDrawing(drawingManager);
  });
  
  /*Add an event listener so that the polygon is captured, call the searchWithinPolygon function. 
    This will show the markers in the polygon, and hide any outside of it.*/
  drawingManager.addListener('overlaycomplete', function(event) {
    /*First, check if there is an existing polygon.
    If there is, get rid of it and remove the markers*/
    if (polygon) {
      polygon.setMap(null);
      hideListings(markers);
    }
    // Switching the drawing mode to the HAND (i.e., no longer drawing).
    drawingManager.setDrawingMode(null);
    // Creating a new editable polygon from the overlay.
    polygon = event.overlay;
    polygon.setEditable(true);
    // Searching within the polygon.
    searchWithinPolygon();
    // Make sure the search is re-done if the poly is changed.
    polygon.getPath().addListener('set_at', searchWithinPolygon);
    polygon.getPath().addListener('insert_at', searchWithinPolygon);
  });
}

/*This function populates the infowindow when the marker is clicked.
  We'll only allow one infowindow which will open at the marker that is clicked, 
  and populate based on that markers position.*/
function populateInfoWindow(marker, infowindow) {
  // Check to make sure the infowindow is not already opened on this marker.
  if (infowindow.marker != marker) {
    // Clear the infowindow content to give the streetview time to load.
    infowindow.setContent('');
    infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
    infowindow.addListener('closeclick',function(){
      infowindow.setMarker = null;
    });

    const streetViewService = new google.maps.StreetViewService();
    const radius = 50;

    /*In case the status is OK, which means the pano was found, compute the
      position of the streetview image, then calculate the heading, then get a
      panorama from that and set the options*/
    function getStreetView(data, status) {
      if (status == google.maps.StreetViewStatus.OK) {
        const nearStreetViewLocation = data.location.latLng;
        const heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation, marker.position);
          infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
          const panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 30
            }
          };
        const panorama = new google.maps.StreetViewPanorama(
          document.getElementById('pano'), panoramaOptions);
      } else {
        infowindow.setContent('<div>' + marker.title + '</div>' +
          '<div>No Street View Found</div>');
      }
    }
    /*Use streetview service to get the closest streetview image within
      50 meters of the markers position*/
    streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
    // Open the infowindow on the correct marker.
    infowindow.open(map, marker);
  }
}

 // This function will loop through the markers array and display them all.
function showListings() {

  const bounds = new google.maps.LatLngBounds();
  // Extend the boundaries of the map for each marker and display the marker
  markers = markers.map((marker) => {
    marker.setMap(map);
    bounds.extend(marker.position);
    return marker;
  });
  map.fitBounds(bounds);
}
// This function will loop through the listings and hide them all.
function hideListings() {
  markers = markers.map((marker) => {
    marker.setMap(null);
    return marker;
  });
}

function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    `http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|${markerColor}|40|_|%E2%80%A2`,
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21,34));
  return markerImage;
}

// This shows and hides the drawing options.
function toggleDrawing(drawingManager) {
  if(drawingManager.map) {
    drawingManager.setMap(null);

    if(polygon) {
      polygon.setMap(null);
    }
  } else {
    drawingManager.setMap(map);
  }
}

function searchWithinPolygon() {
  markers = markers.map( marker => {
    google.maps.geometry.poly.containsLocation(marker.position, polygon) ? marker.setMap(map) : marker.setMap(null);
    return marker;
  });

  alert(google.maps.geometry.spherical.computeArea(polygon.getPath()).toFixed(2) +' m²');
}

initMap();
