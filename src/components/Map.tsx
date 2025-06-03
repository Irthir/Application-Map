// src/components/Map.tsx
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import nafTree from '../data/naf-tree.json';
import sectionLabels from '../data/naf-sections.json';
import { Entreprise, EntrepriseType } from '../type';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || '';

interface MapProps {
  data: Entreprise[];
  center: [number, number];
  filterRadius: number;
  onClickSetCenter: (lat: number, lng: number) => void;
}

// Build lookups for NAF activity and section labels
const buildNafLabelMap = () => {
  const map: Record<string, string> = {};
  (nafTree as any[]).forEach(div => {
    div.children.forEach((act: any) => {
      map[act.id] = act.label;
    });
  });
  return map;
};
const nafLabelMap = buildNafLabelMap();

// --- MAPPING CODES EMPLOYES -> LABEL ---
const empCodeLabels: Record<string, string> = {
  "00": "0",
  "01": "1-2",
  "02": "3-5",
  "03": "6-9",
  "11": "10-19",
  "12": "20-49",
  "21": "50-99",
  "22": "100-199",
  "31": "200-249",
  "32": "250-499",
  "41": "500-999",
  "42": "1000-1999",
  "51": "2000-4999",
  "52": "5000-9999",
  "53": "10000+",
  "NN": "Donnée manquante",
  "": "Donnée manquante",
  null: "Donnée manquante",
  undefined: "Donnée manquante"
};

const Map: React.FC<MapProps> = ({ data, center, filterRadius, onClickSetCenter }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  // store marker & related enterprise info
  const markers = useRef<{ marker: mapboxgl.Marker; siren: string }[]>([]);

  // initialize map
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

  // update center: fly and open popup if matching marker
  useEffect(() => {
    if (!map.current) return;
    const fly = () => {
      map.current!.flyTo({ center, essential: true });
      // after move, find marker at center
      const found = markers.current.find(({ marker }) => {
        const pos = marker.getLngLat();
        return Math.abs(pos.lng - center[0]) < 1e-6 && Math.abs(pos.lat - center[1]) < 1e-6;
      });
      if (found) {
        // open popup
        const popup = found.marker.getPopup();
        if (popup) {
          popup.addTo(map.current!);
        }
      }
    };
    map.current.isStyleLoaded() ? fly() : map.current.once('style.load', fly);
  }, [center]);

  // draw filter circle
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'search-radius-circle';
    const draw = () => {
      const circle = turf.circle(center, filterRadius, { steps: 64, units: 'kilometers' });
      const existing = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existing) {
        existing.setData(circle);
      } else {
        map.current!
          .addSource(sourceId, { type: 'geojson', data: circle })
          .addLayer({ id: sourceId, type: 'fill', source: sourceId,
            paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 } });
      }
    };
    map.current.isStyleLoaded() ? draw() : map.current.once('style.load', draw);
  }, [center, filterRadius]);

  // update markers
  useEffect(() => {
    if (!map.current) return;
    // clear old
    markers.current.forEach(({ marker }) => marker.remove());
    markers.current = [];

    data.forEach(e => {
      const color =
        e.type === EntrepriseType.Client   ? '#10B981' :
        e.type === EntrepriseType.Prospect ? '#F59E0B' :
        '#6B7280';
      const typeLabel = e.type || 'Recherche';
      const nafSectionKey = e.codeNAF.slice(0, 2);
      const nafLabel = nafLabelMap[e.codeNAF] || sectionLabels[nafSectionKey as keyof typeof sectionLabels] || e.codeNAF;
      const catCode = e.employeesCategory;
      const empCat = empCodeLabels.hasOwnProperty(catCode)
        ? empCodeLabels[catCode]
        : "Donnée manquante";
      const addr = e.address || '';

      const html = `<div style="font-size:14px;line-height:1.4">
          <strong>${e.name}</strong><br/>
          Type : ${typeLabel}<br/>
          Catégorie : ${nafLabel}<br/>
          SIREN : ${e.siren}<br/>
          Employés : ${empCat}<br/>
          Adresse : ${addr}
        </div>`;

      const m = new mapboxgl.Marker({ color })
        .setLngLat(e.position)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(html))
        .addTo(map.current!);
      markers.current.push({ marker: m, siren: e.siren });
    });
  }, [data]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;
