import 'ol/ol.css';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {Icon, Style} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import cityIconSvg from './city-icon.svg';
import pathIconSvg from './path-icon.svg';
import playerIconSvg from './player-icon.svg';
import { fromLonLat } from 'ol/proj';
import { defaults } from 'ol/interaction';
import Drag from './drag';

let webSocket = new WebSocket('ws://localhost:8080');

webSocket.onmessage = function incoming(message) {
  console.log(message);

  const data = JSON.parse(message.data);

  const feature = playerVectorSource.getFeatureById(data.id);
  const geometry = feature.getGeometry();
  const coordinate = geometry.getCoordinates();

  const deltaX = data.coordinate[0] - coordinate[0];
  const deltaY = data.coordinate[1] - coordinate[1];

  geometry.translate(deltaX, deltaY);
};

webSocket.onclose = function close() {
  console.log('Connection closed');
}

const cities = [{
  lonLat: [-5.8340, 35.7595],
  name: 'Tangier',
}, {
  lonLat: [31.235712, 30.044420],
  name: 'Cairo',
}, {
  lonLat: [-17.467686, 14.716677],
  name: 'Dakar',
}];

const getPath = (fromCity, toCity) => {
  const [fromCityLon, fromCityLat] = fromCity.lonLat;
  const [toCityLon, toCityLat] = toCity.lonLat;
  const lonDiff = Math.abs(fromCityLon - toCityLon);
  const latDiff = Math.abs(fromCityLat - toCityLat);
  const stepCount = Math.ceil(Math.max(lonDiff, latDiff) / 3);
  const steps = [];
  for (let i = 1; i < stepCount; i++) {
    const lon = fromCityLon + lonDiff * (i / stepCount) * (fromCityLon < toCityLon ? 1 : -1);
    const lat = fromCityLat + latDiff * (i / stepCount) * (fromCityLat < toCityLat ? 1 : -1);
    steps.push([lon, lat]);
  }
  return { route: `${fromCity.name}-${toCity.name}`, steps };
}

const paths = [
  getPath(cities[0], cities[1]),
  getPath(cities[1], cities[2]),
  getPath(cities[2], cities[0]),
];

const players = [{
  lonLat: [-5.8340, 35.7595],
  name: 'Player #1'
}];

const cityIconStyle = new Style({
  image: new Icon({
    src: cityIconSvg
  }),
});

const pathIconStyle = new Style({
  image: new Icon({
    src: pathIconSvg
  }),
});

const playerIconStyle = new Style({
  image: new Icon({
    src: playerIconSvg
  }),
});

const getScale = (resolution) => 3000 / resolution

const cityVectorSource = new VectorSource({
  features: cities.map((c) => {
    const { name, lonLat } = c;
    const geometry = new Point(fromLonLat(lonLat));
    const f = new Feature({ name, geometry, droppable: true });
    f.setStyle((feature, resolution) => {
      cityIconStyle.getImage().setScale(getScale(resolution));
      return cityIconStyle;
    });
    return f;
  }),
});

const cityVectorLayer = new VectorLayer({
  source: cityVectorSource,
});

const pathVectorSource = new VectorSource({
  features: paths
    .reduce((steps, path) => {
      return steps.concat(path.steps);
    }, [])
    .map((step) => {
      const geometry = new Point(fromLonLat(step));
      const f = new Feature({ geometry, droppable: true });
      f.setStyle((feature, resolution) => {
        pathIconStyle.getImage().setScale(getScale(resolution));
        return pathIconStyle;
      });
      return f;
    })
});

const pathVectorLayer = new VectorLayer({
  source: pathVectorSource,
});

const playerVectorSource = new VectorSource({
  features: players.map((c, index) => {
    const { name, lonLat } = c;
    const geometry = new Point(fromLonLat(lonLat));
    const f = new Feature({ name, geometry, draggable: true });
    f.setId(index);
    f.setStyle((feature, resolution) => {
      playerIconStyle.getImage().setScale(getScale(resolution));
      return playerIconStyle;
    });
    return f;
  }),
});

const playerVectorLayer = new VectorLayer({
  source: playerVectorSource,
});

const mapLayer = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  interactions: defaults().extend([new Drag(webSocket)]),
  layers: [
    mapLayer,
    cityVectorLayer,
    pathVectorLayer,
    playerVectorLayer,
  ],
  target: 'map',
  view: new View({
    center: fromLonLat([12, 20]),
    zoom: 5,
    minZoom: 4,
    maxZoom: 5,
  }),
});
