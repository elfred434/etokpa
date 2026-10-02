import { useEffect, useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';
import PlatformOrdersPanel, { type PlatformOrder } from '../../components/orders/PlatformOrdersPanel';
import { adminApi, managerApi } from '../../services/api';
import { listOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { isAdminRole } from '../../routes/authGuard';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

/* eslint-disable @typescript-eslint/no-explicit-any */

function zoneIdOf(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function livreurZoneId(l: any): number | null {
  return zoneIdOf(l?.profil?.zone_id ?? l?.profil?.zone?.id ?? l?.zone_id ?? l?.zone?.id);
}

export default function ManagerOrdersPage() {
  useLanguage();
  const toutePlateforme = isAdminRole();
  const [reloadKey, setReloadKey] = useState(0);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [assignation, setAssignation] = useState<PlatformOrder | null>(null);
  const [livreurChoisi, setLivreurChoisi] = useState('');

  useEffect(() => {
    let alive = true;
    const load = toutePlateforme
      ? (async () => {
          const acc: any[] = [];
          for (let page = 1; page <= 20; page++) {
            const res = await adminApi.getUsers({ role: 'livreur', page });
            acc.push(...listOf(res));
            if (page >= Number(res?.meta?.last_page ?? res?.last_page ?? 1)) break;
          }
          return acc;
        })()
      : managerApi.getLivreurs().then((r) => listOf(r));
    load
      .then((rows) => alive && setLivreurs(rows))
      .catch(() => alive && setLivreurs([]));
    return () => { alive = false; };
  }, [toutePlateforme]);

  const zoneCommande = assignation ? zoneIdOf(assignation.landmark?.zone_id) : null;
  const livreursZone = zoneCommande ? livreurs.filter((l) => livreurZoneId(l) === zoneCommande) : [];
  const nomZone = livreurs.find((l) => livreurZoneId(l) === zoneCommande)?.profil?.zone?.nom as string | undefined;

  const confirmerAssignation = async () => {
    if (!assignation || !livreurChoisi) return;
    setErr(null);
    setInfo(null);
    try {
      await managerApi.assignLivreur(assignation.id, Number(livreurChoisi));
      setInfo(`Commande #${assignation.id} assignée avec succès.`);
      setAssignation(null);
      setLivreurChoisi('');
      setReloadKey((k) => k + 1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <ManagerLayout currentPath="/manager/commandes">
      <div className="space-y-6">
        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
            <p className="font-bold">{tx("Erreur API")}</p>
            <p>{err}</p>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-success bg-success-container p-4 text-label">{info}</div>
        )}
        <PlatformOrdersPanel
          source={toutePlateforme ? 'admin' : 'zone'}
          reloadKey={reloadKey}
          title={toutePlateforme ? tx("Toutes les commandes de la plateforme") : tx("Commandes de votre zone")}
          renderActions={(o) => !o.livreur && (
            <button
              type="button"
              className="btn btn-primary px-3 py-1.5 text-label"
              onClick={() => {
                setAssignation(o);
                setLivreurChoisi('');
              }}
            >
              {tx("Assigner")}
            </button>
          )}
        />
      </div>

      {assignation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignation(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[600px] flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <div>
                <h3 className="text-h3 font-h3 font-bold">Assigner un livreur — #{assignation.id}</h3>
                {nomZone && <p className="text-label text-text-secondary">{tx("Zone :")} {nomZone}</p>}
              </div>
              <button type="button" onClick={() => setAssignation(null)} className="p-1 text-text-secondary">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-label">
              {livreursZone.length === 0 && <p className="text-text-secondary">{tx("Aucun livreur disponible dans la zone.")}</p>}
              {livreursZone.map((l: any) => (
                <label
                  key={l.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    String(l.id) === livreurChoisi ? 'border-primary bg-primary-tint/50' : 'border-border-default'
                  }`}
                >
                  <input
                    type="radio"
                    name="livreur"
                    value={String(l.id)}
                    checked={String(l.id) === livreurChoisi}
                    onChange={() => setLivreurChoisi(String(l.id))}
                    className="accent-primary"
                  />
                  <span className="flex-1 font-semibold">{l.nom_complet ?? `${l.prenom ?? ''} ${l.nom ?? ''}`}</span>
                  <span className="text-text-secondary">{l.telephone ?? ''}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setAssignation(null)}>{tx("Annuler")}</button>
              <button type="button" className="btn btn-primary" onClick={confirmerAssignation} disabled={!livreurChoisi}>
                {tx("Assigner")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}
