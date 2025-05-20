import React from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Entreprise, EntrepriseType } from '../type.ts';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || '';

interface MapProps {
  data: Entreprise[];
  center: [number, number];
  filterRadius: number;
  onClickSetCenter: (lat: number, lng: number) => void;
}

const Map: React.FC<MapProps> = ({ data, center, filterRadius, onClickSetCenter }) => {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<mapboxgl.Map | null>(null);
  const markersRef = React.useRef<mapboxgl.Marker[]>([]);

  React.useEffect(() => {
    if (!mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center,
      zoom: 12,
    });
    map.current.on('click', (e) => {
      const features = map.current?.queryRenderedFeatures(e.point) || [];
      const clickedCircle = features.some(f => f.layer?.id === 'search-radius-circle');
      if (!clickedCircle) onClickSetCenter(e.lngLat.lat, e.lngLat.lng);
    });
    return () => map.current?.remove();
  }, []);

  React.useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    data.forEach(e => {
      let color = '#6B7280';
      if (e.type === EntrepriseType.Client)   color = '#10B981';
      if (e.type === EntrepriseType.Prospect) color = '#F59E0B';
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(
          `<div style="font-size:14px;line-height:1.3"><strong>${e.name}</strong><br/>Type : ${e.type}<br/>NAF : ${e.codeNAF}<br/>SIREN : ${e.siren}</div>`
        );
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(e.position)
        .setPopup(popup)
        .addTo(map.current!);
      markersRef.current.push(marker);
    });
  }, [data]);

  React.useEffect(() => {
    if (!map.current) return;
    const sourceId = 'search-radius-circle';
    const drawCircle = () => {
      const circle = turf.circle(center, filterRadius, { steps: 64, units: 'kilometers' });
      if (map.current!.getSource(sourceId)) {
        (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circle);
      } else {
        map.current!
          .addSource(sourceId, { type: 'geojson', data: circle })
          .addLayer({ id: sourceId, type: 'fill', source: sourceId, paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 } });
      }
    };
    if (map.current.isStyleLoaded()) drawCircle(); else map.current.once('style.load', drawCircle);
  }, [center, filterRadius]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;