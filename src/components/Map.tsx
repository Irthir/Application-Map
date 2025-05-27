// src/components/Map.tsx
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Entreprise, EntrepriseType } from '../type';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || '';

interface MapProps {
  data: Entreprise[];
  center: [number, number];
  filterRadius: number;
  onClickSetCenter: (lat: number, lng: number) => void;
}

const Map: React.FC<MapProps> = ({ data, center, filterRadius, onClickSetCenter }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // 1️⃣ Initialisation de la carte
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center,
      zoom: 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.on('click', e => {
      const features = map.current?.queryRenderedFeatures(e.point) || [];
      const clickedCircle = features.some(f => f.layer?.id === 'search-radius-circle');
      if (!clickedCircle) onClickSetCenter(e.lngLat.lat, e.lngLat.lng);
    });
  }, [onClickSetCenter]);

  // 2️⃣ Recentrage
  useEffect(() => {
    if (!map.current) return;
    const fly = () => map.current!.flyTo({ center, essential: true });
    map.current.isStyleLoaded() ? fly() : map.current.once('style.load', fly);
  }, [center]);

  // 3️⃣ Cercle de filtre
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'search-radius-circle';
    const drawCircle = () => {
      const circleGeo = turf.circle(center, filterRadius, { steps: 64, units: 'kilometers' });
      const source = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(circleGeo);
      } else {
        map.current!
          .addSource(sourceId, { type: 'geojson', data: circleGeo })
          .addLayer({
            id: sourceId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 },
          });
      }
    };
    map.current.isStyleLoaded() ? drawCircle() : map.current.once('style.load', drawCircle);
  }, [center, filterRadius]);

  // 4️⃣ Marqueurs
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(m => m.remove());
    markers.current = [];
    data.forEach(e => {
      const color =
        e.type === EntrepriseType.Client   ? '#10B981' :
        e.type === EntrepriseType.Prospect ? '#F59E0B' :
        '#6B7280';
      const m = new mapboxgl.Marker({ color })
        .setLngLat(e.position)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="font-size:14px;line-height:1.3">
              <strong>${e.name}</strong><br/>
              Type : ${e.type}<br/>
              NAF : ${e.codeNAF}<br/>
              SIREN : ${e.siren}
            </div>`
          )
        )
        .addTo(map.current!);
      markers.current.push(m);
    });
  }, [data]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;
