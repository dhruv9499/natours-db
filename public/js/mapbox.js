/*eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiZGI5MjYiLCJhIjoiY2s3c3N5dmZjMHBqeDNmcXR1b2owajZuMiJ9.OIpYVKy4pDcZQ21cC1FzoQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/db926/ck7st4n6s0pbg1irrh2tlvcur',
    scrollZoom: false
    //   center: [-118.091956, 34.06119],
    //   zoom: 10,
    //   interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add Popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day} : ${loc.description}</p>`)
      .addTo(map);

    // Extedn the map bound to extend the current loaction
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
