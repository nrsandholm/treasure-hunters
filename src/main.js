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
import {fromLonLat} from 'ol/proj';

const cities = [{
  geometry: new Point(fromLonLat([-5.8340, 35.7595])),
  name: 'Tangier',
}, {
  geometry: new Point(fromLonLat([31.235712, 30.044420])),
  name: 'Cairo',
}, {
  geometry: new Point(fromLonLat([-17.467686, 14.716677])),
  name: 'Dakar',
}];

const cityIcon = new Style({
  image: new Icon({
    src: cityIconSvg
  }),
});

const vectorSource = new VectorSource({
  features: cities.map((c) => {
    const f = new Feature(c);
    f.setStyle(cityIcon);
    return f;
  }),
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
});

const mapLayer = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  layers: [
    mapLayer,
    vectorLayer,
  ],
  target: 'map',
  view: new View({
    center: fromLonLat([12, 20]),
    zoom: 5,
  }),
});
