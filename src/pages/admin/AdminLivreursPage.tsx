import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows, zoneNom, escArg, fireDesign, initials } from '../../services/api/useLiveRows';
import DESIGN_SCRIPT from './_scripts/AdminLivreursPage';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';

const DESIGN_CSS = `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .sidebar-item-active { background-color: #fea619 !important; color: #684000 !important; font-weight: 700; border-radius: 0.5rem; }
    `;

/**
 * AdminLivreursPage — copie conforme statique du design Stitch (code.html).
 * Interactions : script du design exécuté via useDesignScript (comportement copié).
 */
export default function AdminLivreursPage() {
  useDesignScript(DESIGN_SCRIPT);
  const { rows: livreurs, err, loading } = useLiveRows(() => adminApi.getUsers({ role: 'livreur' }));

  return (
    <AdminLayout currentPath="/admin/livreurs" mainClassName="ml-64 h-screen pt-[52px] p-lg flex gap-lg overflow-hidden">
      {err && (
        <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
          <p className="font-bold">Erreur API</p>
          <p>{err}</p>
        </div>
      )}
      {loading && <p className="m-lg text-label text-text-secondary">Chargement des données réelles…</p>}
      <style>{DESIGN_CSS}</style>
  <div className="flex-1 bg-white rounded-lg border border-border-default overflow-hidden flex flex-col"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead className="bg-bg-secondary border-b border-border-default"> <tr> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Nom</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">ID</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Zone</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Statut</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Succès (%)</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th> </tr> </thead> <tbody className="divide-y divide-border-default">
                {livreurs.map((l: any) => {
                  const nom = l.nom_complet ?? l.name ?? '—';
                  const zone = zoneNom(l.zone ?? l.profil?.zone);
                  const v = String(l.statut ?? '').toLowerCase();
                  const st = v.includes('livraison') || v.includes('course')
                    ? { label: 'En course', badge: 'bg-amber-light text-amber-text text-micro font-bold', dot: 'bg-amber-text' }
                    : v.includes('disponible') || v.includes('ligne') || v.includes('actif') || v.includes('service')
                      ? { label: 'En ligne', badge: 'bg-success-light text-success-dark text-micro font-bold', dot: 'bg-success' }
                      : v.includes('hors') || v.includes('inactif') || v.includes('suspend')
                        ? { label: 'Hors ligne', badge: 'bg-error-light text-error-dark text-micro font-bold', dot: 'bg-error' }
                        : { label: String(l.statut ?? '—'), badge: 'bg-surface-container text-text-tertiary text-micro font-bold', dot: 'bg-text-tertiary' };
                  const pct = Number(l.taux_succes ?? l.taux_reussite ?? l.succes);
                  const pctLabel = Number.isFinite(pct) ? `${Math.round(pct)}%` : '—';
                  const code = `showDetails('${escArg(l.id)}', '${escArg(nom)}', '${escArg(zone)}', '${escArg(st.label)}', '${escArg(pctLabel)}')`;
                  return (
                    <tr key={l.id} className="hover:bg-primary-tint transition-colors cursor-pointer group" data-onclick={code} onClick={fireDesign}>
                      <td className="px-md py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border-default bg-surface-variant flex items-center justify-center font-label text-label text-text-secondary">{initials(nom)}</div>
                          <span className="font-h3 text-h3">{nom}</span>
                        </div>
                      </td>
                      <td className="px-md py-4 font-body text-text-secondary">#{l.id}</td>
                      <td className="px-md py-4 font-body text-text-secondary">{zone}</td>
                      <td className="px-md py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${st.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${st.dot}`}></span>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-md py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-border-default rounded-full overflow-hidden">
                            <div className="h-full bg-success" style={{ width: Number.isFinite(pct) ? `${Math.max(0, Math.min(100, pct))}%` : '0%' }}></div>
                          </div>
                          <span className="font-body text-success font-bold">{pctLabel}</span>
                        </div>
                      </td>
                      <td className="px-md py-4 text-right space-x-2">
                        <button className="p-2 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}><MIcon name="edit" className="text-[20px]" /></button>
                        <button className="p-2 hover:text-error transition-colors" onClick={(e) => e.stopPropagation()}><MIcon name="delete" className="text-[20px]" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody> </table> </div>  <div className="mt-auto p-md border-t border-border-default flex justify-between items-center bg-bg-secondary"> <span className="text-secondary text-micro">Affichage de 1 à 10 sur 42 livreurs</span> <div className="flex gap-2"> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors"><MIcon name="chevron_left" className="text-[18px] align-middle" /></button> <button className="px-3 py-1 border border-primary-container bg-primary-container text-white rounded text-label">1</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors">2</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors">3</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors"><MIcon name="chevron_right" className="text-[18px] align-middle" /></button> </div> </div> </div>  <aside className="w-80 bg-white rounded-lg border border-border-default flex flex-col p-lg transition-all transform translate-x-0" id="detailPanel"> <div className="flex justify-between items-start mb-lg"> <h3 className="font-h2 text-h2 text-primary">Détails du Livreur</h3> <button className="text-text-secondary hover:text-text-main" data-onclick="closeDetails()"><MIcon name="close" /></button> </div> <div className="flex flex-col items-center mb-xl"> <div className="relative mb-md"> <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-light"> <img className="w-full h-full object-cover" data-alt="High resolution profile shot of an African male courier, warm lighting, professional atmosphere, smiling confidently, soft-focus background of an office workspace." id="detailImg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFXqMWUNu20MY0q7Nr0f4bvkv1OshE74gu_Ah4xJYGLhRuE5KvdNPHitfHEz26UGQkaV7toqQnbZVE2Fx6vjEYRjPdGygEQNO55_up-v1t7LZNWiOtYpKmHBnZ4vmBrtTVAg9qjs1ch8jk_YqsBgb0GouDxBidel1hFSlacL96PZnedQzkjUkN0jPCh9bvlRpSrthgo9DeoP32n04mEjEvnvK-XyI2Cl2izAIwBFFdZFl4p-4WLJqb7YSpXIKYKJxCo8g7TnOAxDEZ" /> </div> <div className="absolute bottom-1 right-1 w-6 h-6 bg-success border-4 border-white rounded-full" id="detailStatusDot"></div> </div> <h4 className="font-h2 text-h2 text-center" id="detailName">Koffi Mensah</h4> <p className="text-text-secondary font-label" id="detailId">ID: #LVR-0922</p> </div> <div className="space-y-lg flex-1"> <div className="p-md bg-bg-secondary rounded-lg border border-border-default"> <p className="text-text-secondary text-micro uppercase mb-2">Performance Globale</p> <div className="flex justify-between items-end"> <span className="font-h1 text-h1 text-success" id="detailSuccess">98%</span> <span className="text-success text-label flex items-center"><MIcon name="trending_up" className="text-[16px]" /> +2.4%</span> </div> </div> <div className="space-y-md"> <div className="flex items-start gap-3"> <MIcon name="call" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Téléphone</p> <p className="font-body font-medium">+229 97 00 00 00</p> </div> </div> <div className="flex items-start gap-3"> <MIcon name="motorcycle" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Véhicule</p> <p className="font-body font-medium">Bajaj Pulsar (BJ-9921)</p> </div> </div> <div className="flex items-start gap-3"> <MIcon name="location_on" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Zone Actuelle</p> <p className="font-body font-medium" id="detailZone">Cotonou - Akpakpa</p> </div> </div> </div> <div className="pt-lg border-t border-border-default"> <p className="font-label text-label mb-md">Activités récentes</p> <ul className="space-y-sm"> <li className="flex justify-between text-secondary"> <span className="font-body">Livraison #4421</span> <span className="font-micro">Il y a 10m</span> </li> <li className="flex justify-between text-secondary"> <span className="font-body">Prise en charge #4430</span> <span className="font-micro">Il y a 2h</span> </li> </ul> </div> </div> <div className="mt-xl flex gap-3"> <button className="flex-1 bg-white border border-primary-container text-primary-container py-2 rounded-lg font-bold hover:bg-primary-tint active:scale-97 transition-all">Contacter</button> <button className="flex-1 bg-primary-container text-white py-2 rounded-lg font-bold hover:bg-primary-hover active:scale-97 transition-all">Assigner</button> </div> </aside>  
    </AdminLayout>
  );
}
