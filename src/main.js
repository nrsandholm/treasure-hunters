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
}, {
  lonLat: [18.42416677, -33.9249],
  name: 'Cape Town'
}, {
  lonLat: [3.3792, 6.5244],
  name: 'Lagos'
}, {
  lonLat: [36.8219, -1.2921],
  name: 'Nairobi'
}, {
  lonLat: [13.2302, -8.8147],
  name: 'Luanda'
}, {
  lonLat: [17.0658, -22.5609],
  name: 'Windhoek'
}, {
  lonLat: [31.0492, -17.8216],
  name: 'Harare'
}, {
  lonLat: [35.7516, -6.1630],
  name: 'Dodoma'
}, {
  lonLat: [15.2663, -4.4419],
  name: 'Kinshasa'
}, {
  lonLat: [28.3228, -15.3875],
  name: 'Alger'
}, {
  lonLat: [45.3182, 2.0469],
  name: 'Moghadishu'
}, {
  lonLat: [-8.0029, 12.6392],
  name: 'Bamako'
}, {
  lonLat: [13.1913, 32.8872],
  name: 'Tripoli'
}, {
  lonLat: [15.0557, 12.1348],
  name: 'N\'Djamena'
}, {
  lonLat: [32.5599, 15.5007],
  name: 'Khartoum'
}, {
  lonLat: [31.5713, 4.8594],
  name: 'Juba'
}, {
  lonLat: [-10.8074, 6.3156],
  name: 'Monrovia'
}, {
  lonLat: [30.0619, -1.9441],
  name: 'Kigali'
}, {
  lonLat: [18.5582, 4.3947],
  name: 'Bangui'
}, {
  lonLat: [2.1254, 13.5116],
  name: 'Niamey'
}, {
  lonLat: [38.9251, 15.3229],
  name: 'Asmara'
}, {
  lonLat: [10.1815, 36.8065],
  name: 'Tunis'
}, {
  lonLat: [-13.1991, 27.1500],
  name: 'Laayoune'
},];

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
  return { fromCity, toCity, steps };
}

const paths = cities
  .map((fromCity, index, cities_) => {
    for (const toCity of cities_) {
      if (fromCity !== toCity) {
        const path = getPath(fromCity, toCity);
        fromCity.paths = (fromCity.paths || []).concat(path);
      }
    }
    fromCity.paths.sort((a, b) => {
      if (a.steps.length < b.steps.length) return -1;
      if (a.steps.length > b.steps.length) return 1;
      return 0;
    });
    // Max 2 paths per city
    fromCity.paths.forEach((path, index) => {
      if (index > 1) {
        path.disabled = true;
      }
    });
    return fromCity;
  }, [])
  // TODO: Remove duplication
  .reduce((paths_, city) => {
    return paths_.concat(city.paths);
  }, [])
  .reduce((paths_, path) => {
    if (!path.disabled) {
      paths_.push(path);
    }
    return paths_;
  }, []);

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
