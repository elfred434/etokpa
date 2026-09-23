import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Coordonnées réelles du Bénin (Cotonou / Marché Dantokpa / Cadjehoun)
export const DANTOKPA_COORDS: [number, number] = [6.3725, 2.4332]; // Marché Dantokpa
export const RIDER_COORDS: [number, number] = [6.367, 2.421]; // Position actuelle Livreur Jean Kouassi sur Boulevard St Michel
export const CLIENT_COORDS: [number, number] = [6.362, 2.410]; // Destination Cadjehoun Cotonou

const ROUTE_PATH: [number, number][] = [
  DANTOKPA_COORDS,
  [6.3705, 2.431],
  [6.3685, 2.426],
  RIDER_COORDS,
  [6.365, 2.416],
  CLIENT_COORDS,
];

// Icônes personnalisées Leaflet Tokpa avec Material Symbols
const sellerIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="background-color: #f97316; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
      <span class="material-symbols-outlined" style="color: white; font-size: 20px;">store</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const riderIcon = L.divIcon({
  className: 'custom-leaflet-marker-rider',
  html: `
    <div style="background-color: #10B981; width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.5); animation: pulse 2s infinite;">
      <span class="material-symbols-outlined" style="color: white; font-size: 22px;">motorcycle</span>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const clientIcon = L.divIcon({
  className: 'custom-leaflet-marker-client',
  html: `
    <div style="background-color: #3B82F6; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
      <span class="material-symbols-outlined" style="color: white; font-size: 20px;">location_on</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapRecenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14, { animate: true });
  }, [center, map]);
  return null;
}

interface RealBeninMapProps {
  onRecenterRider?: () => void;
}

export default function RealBeninMap({ onRecenterRider }: RealBeninMapProps) {
  return (
    <div className="relative w-full h-full min-h-[450px] z-10">
      <MapContainer
        center={RIDER_COORDS}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full rounded-b-none"
        style={{ height: '100%', width: '100%', minHeight: '450px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenterController center={RIDER_COORDS} />

        {/* Tracé de l’itinéraire réel Cotonou */}
        <Polyline positions={ROUTE_PATH} color="#f97316" weight={5} opacity={0.85} dashArray="10, 8" />

        {/* Marqueur Marché Dantokpa */}
        <Marker position={DANTOKPA_COORDS} icon={sellerIcon}>
          <Popup>
            <div className="text-center font-sans p-1">
              <strong className="block text-primary font-bold">Marché Dantokpa</strong>
              <span className="text-xs text-gray-600">Cotonou, Bénin</span>
            </div>
          </Popup>
        </Marker>

        {/* Marqueur Livreur Jean Kouassi */}
        <Marker position={RIDER_COORDS} icon={riderIcon}>
          <Popup>
            <div className="text-center font-sans p-1">
              <strong className="block text-success-dark font-bold">Jean Kouassi (Livreur)</strong>
              <span className="text-xs text-gray-600">En déplacement vers Cadjehoun</span>
            </div>
          </Popup>
        </Marker>

        {/* Marqueur Client / Cadjehoun */}
        <Marker position={CLIENT_COORDS} icon={clientIcon}>
          <Popup>
            <div className="text-center font-sans p-1">
              <strong className="block text-info-dark font-bold">Votre Adresse Client</strong>
              <span className="text-xs text-gray-600">Cadjehoun, Cotonou, Bénin</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Control Button */}
      <button
        type="button"
        onClick={onRecenterRider}
        title="Recentrer sur le livreur au Bénin"
        className="absolute bottom-6 right-6 z-[400] w-12 h-12 bg-white rounded-full flex items-center justify-center border border-border-default shadow-xl hover:bg-bg-secondary transition-transform active:scale-95 cursor-pointer"
      >
        <span className="material-symbols-outlined text-text-main">my_location</span>
      </button>
    </div>
  );
}
