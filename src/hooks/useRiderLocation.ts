// Suit la position GPS du livreur (WebSocket Reverb, polling API tracking ou simulation ?simu=1) et calcule l’ETA.
import { useState, useEffect, useRef } from 'react';
import { DANTOKPA_COORDS, CLIENT_COORDS, RIDER_COORDS } from '../components/client/commandes/RealBeninMap';

const COTONOU_PATH: [number, number][] = [
  DANTOKPA_COORDS,
  [6.3705, 2.4310],
  [6.3685, 2.4260],
  RIDER_COORDS,
  [6.3650, 2.4160],
  [6.3635, 2.4130],
  CLIENT_COORDS,
];

interface UseRiderLocationOptions {
  orderId?: string;
  enabled?: boolean;
  initialCoords?: [number, number];
  destinationCoords?: [number, number];
  simulatedSpeedMs?: number;
  realPosition?: [number, number] | null;
  allowSimulation?: boolean;
}

export type RiderPositionSource = 'websocket' | 'api' | 'simulation' | 'unavailable';

// Hook React useRiderLocation : encapsule l’état et les effets associés.
export function useRiderLocation({
  orderId,
  enabled,
  initialCoords = RIDER_COORDS,
  destinationCoords = CLIENT_COORDS,
  simulatedSpeedMs = 2500,
  realPosition = null,
  allowSimulation = false,
}: UseRiderLocationOptions) {
  const active = enabled !== false && !!orderId;
  const [riderCoords, setRiderCoords] = useState<[number, number]>(initialCoords);
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const [apiPositionUsed, setApiPositionUsed] = useState(false);
  const pathIndexRef = useRef(3);

  // Helper calculateDistanceKm : réalise le traitement métier associé.
  const calculateDistanceKm = (c1: [number, number], c2: [number, number]) => {
    const R = 6371;
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

  const source: RiderPositionSource = isWebSocketActive
    ? 'websocket'
    : apiPositionUsed
      ? 'api'
      : allowSimulation
        ? 'simulation'
        : 'unavailable';
  const hasFix = source !== 'unavailable';

  const distanceKm = hasFix ? calculateDistanceKm(riderCoords, destinationCoords) : null;
  const estimatedMinutes = distanceKm !== null ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null;

  // Abonne le composant au canal temps réel Reverb et nettoie l’écoute au démontage.
  useEffect(() => {
    if (!active || !orderId) return undefined;
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
          }
        };
      } catch {
        setIsWebSocketActive(false);
      }
    }
    return undefined;
  }, [orderId, active]);

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    if (!active || isWebSocketActive || !realPosition) return;
    setRiderCoords(realPosition);
    setApiPositionUsed(true);
  }, [active, isWebSocketActive, realPosition]);

  // Planifie le rafraîchissement ou minuteur périodique et le nettoie au démontage.
  useEffect(() => {
    if (!active || isWebSocketActive || apiPositionUsed || !allowSimulation) return;

    const interval = setInterval(() => {
      pathIndexRef.current = (pathIndexRef.current + 1) % COTONOU_PATH.length;
      const nextPoint = COTONOU_PATH[pathIndexRef.current];
      setRiderCoords(nextPoint);
    }, simulatedSpeedMs);

    return () => clearInterval(interval);
  }, [active, isWebSocketActive, apiPositionUsed, allowSimulation, simulatedSpeedMs]);

  return {
    riderCoords: (hasFix ? riderCoords : null) as [number, number] | null,
    estimatedMinutes,
    isWebSocketActive,
    source,
    distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
  };
}
