// src/components/Map.tsx
import React, { useRef, useEffect } from 'react';
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

  // 2️⃣ À chaque fois que `center` change, on recentre vraiment
  useEffect(() => {
    if (!map.current) return;

    console.log('Recentrage demandé sur :', center);

    // si le style est déjà chargé on peut voler  
    if (map.current.isStyleLoaded()) {
      map.current.flyTo({ center, essential: true });
    } else {
      // sinon on attend le chargement complet avant de voler
      map.current.once('style.load', () => {
        map.current!.flyTo({ center, essential: true });
      });
    }
  }, [center]);

  // 3️⃣ Marqueurs
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(m => m.remove());
    markers.current = [];
    data.forEach(e => {
      const color =
        e.type === EntrepriseType.Client   ? '#10B981' :
        e.type === EntrepriseType.Prospect ? '#F59E0B' :
        '#6B7280';
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(e.position)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-size:14px;line-height:1.3">
            <strong>${e.name}</strong><br/>
            Type : ${e.type}<br/>
            NAF : ${e.codeNAF}<br/>
            SIREN : ${e.siren}
          </div>
        `))
        .addTo(map.current!);
      markers.current.push(marker);
    });
  }, [data]);

  // 4️⃣ Cercle de filtre (avec attente du style)
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'search-radius-circle';
    const draw = () => {
      const circle = turf.circle(center, filterRadius, { steps: 64, units: 'kilometers' });
      if (map.current!.getSource(sourceId)) {
        (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circle);
      } else {
        map.current!
          .addSource(sourceId, { type: 'geojson', data: circle })
          .addLayer({
            id: sourceId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 }
          });
      }
    };

    if (map.current.isStyleLoaded()) {
      draw();
    } else {
      map.current.once('style.load', draw);
    }
  }, [center, filterRadius]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;
