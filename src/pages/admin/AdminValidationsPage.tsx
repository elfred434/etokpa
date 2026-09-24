import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
import { fmtFcfa, dateCourte } from '../../services/api/unwrap';
import DESIGN_SCRIPT from './_scripts/AdminValidationsPage';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';

const DESIGN_CSS = `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .sidebar-active {
            background-color: #1F2937;
            color: #FFFFFF;
            border-left: 3px solid #F97316;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #F3F4F6;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #D1D5DB;
            border-radius: 10px;
        }
    `;

/**
 * AdminValidationsPage — copie conforme statique du design Stitch (code.html).
 * Interactions : script du design exécuté via useDesignScript (comportement copié).
 */
export default function AdminValidationsPage() {
  useDesignScript(DESIGN_SCRIPT);
  const { rows: proposals, err, loading, reload } = useLiveRows(() => adminApi.getProposals({ page: 1 }));
  const decider = async (pr: any, decision: 'accepte' | 'refuse') => {
    try { await adminApi.respondProposal(pr.id, { decision }); reload(); } catch (e: any) { window.alert(String(e?.message ?? e)); }
  };

  return (
    <AdminLayout currentPath="/admin/validations">
      {err && (
        <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
          <p className="font-bold">Erreur API</p>
          <p>{err}</p>
        </div>
      )}
      {loading && <p className="m-lg text-label text-text-secondary">Chargement des données réelles…</p>}
      <style>{DESIGN_CSS}</style>
  <header className="px-8 pt-8 pb-4 flex flex-col gap-4 bg-bg-app"> <div> <h1 className="text-2xl font-bold text-text-main">Validation des budgets</h1> <p className="text-text-secondary text-sm">7 propositions en attente de décision sur le marché TOKPa</p> </div>  <div className="flex gap-2"> <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-white shadow-sm shadow-primary/20">Toutes</button> <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-text-secondary border border-gray-200 hover:bg-gray-50 transition-colors">En attente</button> <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-text-secondary border border-gray-200 hover:bg-gray-50 transition-colors">Acceptées</button> <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-text-secondary border border-gray-200 hover:bg-gray-50 transition-colors">Refusées</button> </div> </header>  <div className="flex-1 flex overflow-hidden px-8 pb-8 gap-6">  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"> <div className="overflow-x-auto flex-1 custom-scrollbar"> <table className="w-full text-left border-collapse"> <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200"> <tr> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix vendeur</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix proposé</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Écart</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th> <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th> </tr> </thead> <tbody>
                {proposals.map((pr: any) => (
                  <tr key={pr.id} className="border-t border-border-default text-label">
                    <td className="px-lg py-3">{pr.client?.nom_complet ?? pr.user?.nom_complet ?? '—'}</td>
                    <td className="px-lg py-3">{pr.product?.nom ?? pr.produit ?? '—'}</td>
                    <td className="px-lg py-3">{fmtFcfa(pr.prix_vendeur ?? pr.original_price)}</td>
                    <td className="px-lg py-3 font-semibold">{fmtFcfa(pr.prix_propose ?? pr.proposed_price ?? pr.montant_propose)}</td>
                    <td className="px-lg py-3">{pr.ecart ?? '—'}</td>
                    <td className="px-lg py-3">{dateCourte(pr.created_at)}</td>
                    <td className="px-lg py-3">
                      <div className="flex gap-2">
                        <button type="button" className="font-semibold text-success hover:underline" onClick={() => decider(pr, 'accepte')}>Accepter</button>
                        <button type="button" className="font-semibold text-error hover:underline" onClick={() => decider(pr, 'refuse')}>Refuser</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody> </table> </div>  <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50"> <span className="text-xs text-text-secondary">Affichage de 4 sur 7 propositions en attente</span> <div className="flex gap-2"> <button className="p-1.5 rounded bg-white border border-gray-200 text-gray-400 cursor-not-allowed"> <MIcon name="chevron_left" className="text-[18px]" /> </button> <button className="p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-100 transition-colors"> <MIcon name="chevron_right" className="text-[18px]" /> </button> </div> </div> </div>  <aside className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col gap-4"> <h2 className="text-lg font-bold text-text-main">Détail de la proposition</h2> <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100"> <img className="h-full w-full object-cover" data-alt="Close-up of fresh red cherry tomatoes on a vine, displayed in a minimal, high-key studio lighting environment. The background is a crisp white with soft, professional shadows. The image style is sharp, clean, and modern, reflecting an upscale e-commerce platform for fresh produce with bright, vibrant saturated reds and greens." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCj7T1mCYafVJJWMOeoO9m2-n3rOgIwaFTYJoxHZb1fo4afEl_Yz-PXfiUZl3QZJJbjOvpkOOxdhqubvFztrgJ7fG2ARyaUFpIItBGLbC040zKkPL4f49pX5tNEw-iYHCge_91LbVE5oP2-gWNuyD5sl19gdNjue-JQatgGZvfobi4vo_UyEkDD4WpX4KvmVnNxVNaFdTC3ozJ0oqr4cMbfa5dgC8xUuyi6szQvTjm5_J1jhRpHPkAR_B1EraV1k9NXnAJ23NqvJU6T" /> </div> <div> <h3 className="text-base font-bold">Tomates cerises (Sceau)</h3> <p className="text-xs text-text-secondary uppercase font-medium tracking-wider mt-0.5">Catégorie : Fruits &amp; Légumes</p> </div> <div className="h-px bg-gray-100 w-full"></div>  <div> <h4 className="text-xs font-bold text-text-secondary uppercase mb-3 tracking-widest">Négociation</h4> <div className="space-y-4"> <div className="flex gap-3 relative"> <div className="absolute left-1.5 top-5 bottom-0 w-0.5 bg-gray-100"></div> <div className="h-3 w-3 rounded-full bg-success ring-4 ring-success-light z-10 mt-1"></div> <div className="flex flex-col"> <span className="text-xs font-medium">Client a proposé 3 000 FCFA</span> <span className="text-[10px] text-text-secondary">10:45</span> </div> </div> <div className="flex gap-3 relative"> <div className="absolute left-1.5 top-5 bottom-0 w-0.5 bg-gray-100"></div> <div className="h-3 w-3 rounded-full bg-gray-300 z-10 mt-1"></div> <div className="flex flex-col"> <span className="text-xs font-medium">Prix vendeur : 3 500 FCFA</span> <span className="text-[10px] text-text-secondary">10:40</span> </div> </div> <div className="flex gap-3"> <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-primary-tint z-10 mt-1"></div> <div className="flex flex-col"> <span className="text-xs font-bold text-primary">En attente de validation admin</span> <span className="text-[10px] text-text-secondary">maintenant</span> </div> </div> </div> </div> </div>  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col gap-4"> <div className="flex items-center justify-between"> <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Historique client</h4> <span className="bg-amber-light text-amber-text px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-text/10">Client Or</span> </div> <div className="grid grid-cols-2 gap-3"> <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col"> <span className="text-xl font-bold">15</span> <span className="text-[10px] text-text-secondary">commandes passées</span> </div> <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col"> <span className="text-xl font-bold text-success-dark">90%</span> <span className="text-[10px] text-text-secondary">taux d'acceptation</span> </div> </div> </div>  <div className="flex flex-col gap-2 mt-auto"> <button className="w-full py-3 bg-success hover:bg-success-dark text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-success/20 flex items-center justify-center gap-2"> <MIcon name="check_circle" className="text-[18px]" />
                        Accepter ce prix
                    </button> <button className="w-full py-3 bg-white border-2 border-primary text-primary hover:bg-primary-tint rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"> <MIcon name="edit" className="text-[18px]" />
                        Contre-proposer
                    </button> <button className="w-full py-3 bg-error-light text-error-dark border border-error-dark/20 hover:bg-error-dark hover:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"> <MIcon name="cancel" className="text-[18px]" />
                        Refuser et notifier
                    </button> </div> </aside> </div> 
    </AdminLayout>
  );
}
