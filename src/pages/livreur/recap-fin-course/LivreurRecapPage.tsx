import { useEffect, useState } from 'react';
import { Link, useRouterState, useSearch } from '@tanstack/react-router';
import LivreurLayout from '../../../components/layout/livreur/LivreurLayout';
import MIcon from '../../../components/shared/MIcon';
import ApiErrorState from '../../../components/shared/ApiErrorState';
import LoadingState from '../../../components/shared/LoadingState';
import { livreurApi } from '../../../services/api';
import { fmtFcfa, listOf } from '../../../services/api/unwrap';
import { alertApiError } from '../../../utils/apiError';
import { currentUserName } from '../../../routes/authGuard';
import { articlesCount, destination, tokRef, unwrapOrder, type LivreurOrder } from '../livreurData';
import { useLanguage } from '../../../context/LanguageContext';
import { tr, tx } from '../../../i18n/tx';
import { orderLineName } from '../../../utils/orderLine';


/**
 * Récapitulatif de fin de course — design Stitch « r_capitulatif_de_fin_de_course_tokpa », données
 * réelles : la commande livrée (état transmis par la course active, sinon GET /livreur/history).
 * Retirés (aucune donnée dans l'API) : pourboire, distance, temps, note client, vendeurs des articles.
 */
export default function LivreurRecapPage() {
  useLanguage();
  const { commande } = useSearch({ from: '/livreur/recapitulatif' });
  const navState = useRouterState({ select: (s) => s.location.state as { order?: LivreurOrder; deliveredAt?: string | null } | undefined });
  const [order, setOrder] = useState<LivreurOrder | null>(navState?.order && navState.order.id === commande ? navState.order : null);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const deliveredAt = navState?.order?.id === commande ? (navState?.deliveredAt ?? null) : null;
  const prenom = (currentUserName() ?? '').split(' ')[0];

  // Rechargement de la page (plus d'état de navigation) → commande relue dans l'historique réel.
  useEffect(() => {
    if (order || !commande) return;
    let alive = true;
    setErr(null);
    livreurApi
      .getHistory(1)
      .then((res: unknown) => {
        if (!alive) return;
        const found = listOf(res).map(unwrapOrder).find((o) => o.id === commande);
        if (found) setOrder(found);
        else setErr(tr(`La commande ${tokRef(commande)} ne figure pas parmi vos dernières livraisons.`, `Order ${tokRef(commande)} is not in your recent deliveries.`));
      })
      .catch((e) => alive && setErr(alertApiError(e, 'livreur-load')));
    return () => {
      alive = false;
    };
  }, [order, commande, reloadKey]);

  const heure = deliveredAt
    ? new Date(deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <LivreurLayout>
      <div className="flex flex-col items-center p-xl">
        <div className="w-full max-w-[800px] lg:max-w-[1100px]">
          {!order ? (
            err || !commande ? (
              <ApiErrorState
                title={tx("Récapitulatif indisponible")}
                message={err ?? tx("Aucune commande indiquée.")}
                onRetry={commande ? () => setReloadKey((k) => k + 1) : undefined}
                className="rounded-[14px] border-[0.5px] border-border-default bg-bg-card px-md"
              />
            ) : (
              <LoadingState label={tx("Chargement du récapitulatif…")} className="rounded-[14px] border-[0.5px] border-border-default bg-bg-card" />
            )
          ) : (
            <>
              {/* Success Header */}
              <header className="mb-xl text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#10B981]/30 bg-success-light shadow-sm">
                  <MIcon name="check_circle" className="text-[38px] text-[#10B981]" />
                </div>
                <h1 className="text-[28px] font-bold leading-tight text-text-main">{tx("Course terminée avec succès !")}</h1>
                <p className="mt-1.5 text-[15px] text-text-secondary">
                  Félicitations pour cette livraison{prenom ? `, ${prenom}` : ''}.
                </p>
              </header>

              <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-lg">
                {/* Main Summary Card */}
                <section className="mb-6 overflow-hidden rounded-[14px] border-[0.5px] border-border-default bg-bg-card shadow-sm lg:mb-0">
                  {/* Section 1: Montants réels */}
                  <div className="border-b border-border-default bg-bg-card p-6 text-center">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">{tx("Frais de livraison")}</p>
                    <h2 className="flex flex-wrap items-center justify-center gap-2 text-[32px] font-bold text-text-main">
                      <span>{tx("Course :")}</span>
                      <span className="font-bold text-[#F97316]">{fmtFcfa(order.frais_livraison)}</span>
                    </h2>
                    <div className="mt-5 flex items-center justify-center gap-10 border-t border-border-default pt-4">
                      <div className="text-center">
                        <p className="text-xs font-medium text-text-secondary">{tx("Montant de la commande")}</p>
                        <p className="mt-0.5 text-base font-semibold text-text-main">{fmtFcfa(order.montant_total)}</p>
                      </div>
                      <div className="h-8 w-px bg-border-default" />
                      <div className="text-center">
                        <p className="text-xs font-medium text-text-secondary">{tx("Articles")}</p>
                        <p className="mt-0.5 text-base font-semibold text-text-main">{articlesCount(order)}</p>
                      </div>
                    </div>
                  </div>
                  {/* Section 2: Course Details */}
                  <div className="grid grid-cols-1 gap-4 border-b border-border-default bg-bg-secondary p-5 sm:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{tx("Commande")}</span>
                      <span className="mt-0.5 text-sm font-bold text-text-main">{tokRef(order.id)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{tx("Heure de livraison")}</span>
                      <span className="mt-0.5 text-sm font-medium text-text-main">{heure}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{tx("Destination")}</span>
                      <span className="mt-0.5 text-sm font-medium text-text-main">{destination(order)}</span>
                    </div>
                  </div>
                </section>

                {/* Order Summary Card */}
                <section className="mb-8 rounded-[14px] border-[0.5px] border-border-default bg-bg-card p-6 shadow-sm lg:mb-0">
                  <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-text-main">
                    <MIcon name="shopping_basket" className="text-[20px] text-text-secondary" />
                    <span>{tx("Détails de la commande")}</span>
                  </h3>
                  <ul className="divide-y divide-[#F3F4F6]">
                    {(order.items ?? []).map((it) => (
                      <li key={it.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-light/50 bg-primary-lighter text-xs font-bold text-[#F97316]">
                            {it.quantite}x
                          </span>
                          <span className="text-sm font-medium text-text-main">{tx(orderLineName(it))}</span>
                        </div>
                        <span className="rounded-full bg-bg-app px-2.5 py-1 text-xs font-medium text-text-secondary">{fmtFcfa(it.prix_unitaire)}</span>
                      </li>
                    ))}
                    {(order.items ?? []).length === 0 && <li className="py-3 text-sm text-text-secondary">{tx("Aucun article transmis.")}</li>}
                  </ul>
                </section>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/livreur"
              className="flex w-full max-w-full items-center justify-center gap-2.5 rounded-[10px] bg-[#F97316] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#EA580C] active:scale-95 sm:w-auto sm:min-w-[220px]"
            >
              <MIcon name="dashboard" className="text-[20px]" />
              <span>{tx("Retour au tableau de bord")}</span>
            </Link>
            <Link
              to="/livreur/historique"
              className="flex w-full max-w-full items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-primary-light bg-primary-lighter px-6 py-3.5 text-center text-sm font-semibold text-[#C2410C] transition-all duration-150 hover:bg-primary-light active:scale-95 sm:w-auto sm:min-w-[220px]"
            >
              <MIcon name="receipt_long" className="text-[20px]" />
              <span>{tx("Voir l'historique complet")}</span>
            </Link>
          </div>
        </div>
      </div>
    </LivreurLayout>
  );
}
