// Carte Leaflet centrée sur Cotonou affichant le marché Dantokpa, le livreur et la destination.
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../../context/LanguageContext';
import { tr, tx } from '../../../i18n/tx';

export const DANTOKPA_COORDS: [number, number] = [6.3725, 2.4332];
export const RIDER_COORDS: [number, number] = [6.367, 2.421];
export const CLIENT_COORDS: [number, number] = [6.362, 2.410];

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
    <div style="background-color: #10B981; width: 46px; height: 46px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(16,185,129,0.6); animation: pulse 1.8s infinite;">
      <span class="material-symbols-outlined" style="color: white; font-size: 24px;">motorcycle</span>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
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

// Composant React MapRecenterController : prépare l’état et affiche son interface.
function MapRecenterController({ center }: { center: [number, number] }) {
  useLanguage();
  const map = useMap();
  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface RealBeninMapProps {
  riderCoords?: [number, number] | null;
  riderName?: string;
  destinationCoords?: [number, number] | null;
  destinationLabel?: string;
  onRecenterRider?: () => void;
}

// Composant React RealBeninMap : prépare l’état et affiche son interface.
export default function RealBeninMap({
  riderCoords = null,
  riderName,
  destinationCoords = null,
  destinationLabel,
  onRecenterRider,
}: RealBeninMapProps) {
  useLanguage();
  const mapCenter: [number, number] = riderCoords ?? destinationCoords ?? DANTOKPA_COORDS;
  const routePath: [number, number][] = [
    DANTOKPA_COORDS,
    ...(riderCoords ? [riderCoords] : []),
    ...(destinationCoords ? [destinationCoords] : []),
  ];

  // Retourne le rendu JSX du composant.
  return (
    <div className="relative w-full h-full min-h-[450px] z-10 dark:ring-1 dark:ring-border-default dark:ring-offset-0 dark:[&_.leaflet-tile-pane]:brightness-90 dark:[&_.leaflet-tile-pane]:contrast-105">
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full rounded-b-none"
        style={{ height: '100%', width: '100%', minHeight: '450px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; OSM France'
          maxZoom={19}
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
        />

        <MapRecenterController center={mapCenter} />

        <Polyline positions={routePath} color="#f97316" weight={5} opacity={0.85} dashArray="10, 8" />

        <Marker position={DANTOKPA_COORDS} icon={sellerIcon}>
          <Popup>
            <div className="text-center font-sans p-1">
              <strong className="block text-primary font-bold">{tx("Marché Dantokpa")}</strong>
              <span className="text-xs text-gray-600">{tx("Cotonou, Bénin")}</span>
            </div>
          </Popup>
        </Marker>

        {riderCoords && (
          <Marker position={riderCoords} icon={riderIcon}>
            <Popup>
              <div className="text-center font-sans p-1">
                <strong className="block text-success-dark font-bold">{riderName ? tr(`${riderName} (Livreur)`, `${riderName} (Rider)`) : tx("Livreur TOKPa")}</strong>
                <span className="text-xs text-gray-600">{tr(`GPS : ${riderCoords[0].toFixed(4)}, ${riderCoords[1].toFixed(4)}`, `GPS: ${riderCoords[0].toFixed(4)}, ${riderCoords[1].toFixed(4)}`)}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {destinationCoords && (
          <Marker position={destinationCoords} icon={clientIcon}>
            <Popup>
              <div className="text-center font-sans p-1">
                <strong className="block text-info-dark font-bold">{destinationLabel || tx("Point de livraison")}</strong>
                <span className="text-xs text-gray-600">{tx("Destination de la commande")}</span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <button
        type="button"
        onClick={onRecenterRider}
        title={tx("Recentrer sur la position temps réel du livreur")}
        className="absolute bottom-6 right-6 z-[400] w-12 h-12 bg-bg-card rounded-full flex items-center justify-center border border-border-default shadow-xl hover:bg-bg-secondary transition-transform active:scale-95 cursor-pointer"
      >
        <span className="material-symbols-outlined text-text-main">my_location</span>
      </button>
    </div>
  );
}
