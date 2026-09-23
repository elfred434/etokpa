import { useState, useEffect, useRef } from 'react';
import { DANTOKPA_COORDS, CLIENT_COORDS, RIDER_COORDS } from '../components/client/commandes/RealBeninMap';

// Segment d'itinéraire réel dans Cotonou : Dantokpa -> Boulevard St Michel -> Cadjehoun
const COTONOU_PATH: [number, number][] = [
  DANTOKPA_COORDS, // [6.3725, 2.4332]
  [6.3705, 2.4310],
  [6.3685, 2.4260],
  RIDER_COORDS,    // [6.3670, 2.4210]
  [6.3650, 2.4160],
  [6.3635, 2.4130],
  CLIENT_COORDS,   // [6.3620, 2.4100]
];

interface UseRiderLocationOptions {
  orderId: string;
  initialCoords?: [number, number];
  destinationCoords?: [number, number];
  simulatedSpeedMs?: number; // millisecondes entre chaque micro-déplacement
}

/**
 * Hook `useRiderLocation` — Récupère et met à jour la position GPS du livreur en temps réel (Laravel Echo WebSocket + Mode Simulation Cotonou)
 */
export function useRiderLocation({
  orderId,
  initialCoords = RIDER_COORDS,
  destinationCoords = CLIENT_COORDS,
  simulatedSpeedMs = 2500,
}: UseRiderLocationOptions) {
  const [riderCoords, setRiderCoords] = useState<[number, number]>(initialCoords);
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const pathIndexRef = useRef(3); // Démarre au niveau de la position du livreur sur le boulevard

  // Calcul dynamique de la distance restante (formule Haversine approximée)
  const calculateDistanceKm = (c1: [number, number], c2: [number, number]) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
    const dLng = ((c2[1] - c1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1[0] * Math.PI) / 180) *
        Math.cos((c2[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distanceKm = calculateDistanceKm(riderCoords, destinationCoords);
  // Estimation : ~25 km/h en ville à Cotonou
  const estimatedMinutes = Math.max(1, Math.round((distanceKm / 25) * 60));

  // Écoute temps réel Reverb — CANAL RÉEL DU BACKEND :
  //   private tracking.{orderId}  →  événement `livreur.position.updated`
  //   payload : {order_id, livreur_id, latitude, longitude, horodatage}
  // (voir routes/channels.php + app/Events/LivreurPositionUpdated.php du backend)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { Echo?: unknown }).Echo) {
      try {
        const echo = (window as unknown as {
          Echo: { private: (channel: string) => { listen: (event: string, cb: (e: { latitude: number; longitude: number }) => void) => void; stopListening: (event: string) => void } };
        }).Echo;
        const channel = echo.private(`tracking.${orderId}`);
        const handler = (data: { latitude: number; longitude: number }) => {
          setIsWebSocketActive(true);
          setRiderCoords([Number(data.latitude), Number(data.longitude)]);
        };
        channel.listen('livreur.position.updated', handler);
        return () => {
          try {
            channel.stopListening('livreur.position.updated');
          } catch {
            /* noop */
          }
        };
      } catch {
        setIsWebSocketActive(false);
      }
    }
    return undefined;
  }, [orderId]);

  // Fallback Simulation Temps Réel Cotonou (si WebSocket backend non connecté en local)
  useEffect(() => {
    if (isWebSocketActive) return;

    const interval = setInterval(() => {
      pathIndexRef.current = (pathIndexRef.current + 1) % COTONOU_PATH.length;
      const nextPoint = COTONOU_PATH[pathIndexRef.current];
      setRiderCoords(nextPoint);
    }, simulatedSpeedMs);

    return () => clearInterval(interval);
  }, [isWebSocketActive, simulatedSpeedMs]);

  return {
    riderCoords,
    estimatedMinutes,
    isWebSocketActive,
    distanceKm: Number(distanceKm.toFixed(2)),
  };
}
