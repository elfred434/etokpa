import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
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
  <div className="flex-1 bg-white rounded-lg border border-border-default overflow-hidden flex flex-col"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead className="bg-bg-secondary border-b border-border-default"> <tr> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Nom</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">ID</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Zone</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Statut</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider">Succès (%)</th> <th className="px-md py-4 font-label text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th> </tr> </thead> <tbody>
                {livreurs.map((l: any) => (
                  <tr key={l.id} className="border-t border-border-default text-label">
                    <td className="px-lg py-3 font-semibold">{l.nom_complet ?? `${l.prenom ?? ''} ${l.nom ?? ''}`}</td>
                    <td className="px-lg py-3">ID: {l.id}</td>
                    <td className="px-lg py-3">{l.zone ?? l.profil?.zone ?? '—'}</td>
                    <td className="px-lg py-3">{l.statut ?? '—'}</td>
                    <td className="px-lg py-3">—</td>
                    <td className="px-lg py-3">—</td>
                  </tr>
                ))}
              </tbody> </table> </div>  <div className="mt-auto p-md border-t border-border-default flex justify-between items-center bg-bg-secondary"> <span className="text-secondary text-micro">Affichage de 1 à 10 sur 42 livreurs</span> <div className="flex gap-2"> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors"><MIcon name="chevron_left" className="text-[18px] align-middle" /></button> <button className="px-3 py-1 border border-primary-container bg-primary-container text-white rounded text-label">1</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors">2</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors">3</button> <button className="px-3 py-1 border border-border-default rounded hover:bg-white transition-colors"><MIcon name="chevron_right" className="text-[18px] align-middle" /></button> </div> </div> </div>  <aside className="w-80 bg-white rounded-lg border border-border-default flex flex-col p-lg transition-all transform translate-x-0" id="detailPanel"> <div className="flex justify-between items-start mb-lg"> <h3 className="font-h2 text-h2 text-primary">Détails du Livreur</h3> <button className="text-text-secondary hover:text-text-main" data-onclick="closeDetails()"><MIcon name="close" /></button> </div> <div className="flex flex-col items-center mb-xl"> <div className="relative mb-md"> <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-light"> <img className="w-full h-full object-cover" data-alt="High resolution profile shot of an African male courier, warm lighting, professional atmosphere, smiling confidently, soft-focus background of an office workspace." id="detailImg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFXqMWUNu20MY0q7Nr0f4bvkv1OshE74gu_Ah4xJYGLhRuE5KvdNPHitfHEz26UGQkaV7toqQnbZVE2Fx6vjEYRjPdGygEQNO55_up-v1t7LZNWiOtYpKmHBnZ4vmBrtTVAg9qjs1ch8jk_YqsBgb0GouDxBidel1hFSlacL96PZnedQzkjUkN0jPCh9bvlRpSrthgo9DeoP32n04mEjEvnvK-XyI2Cl2izAIwBFFdZFl4p-4WLJqb7YSpXIKYKJxCo8g7TnOAxDEZ" /> </div> <div className="absolute bottom-1 right-1 w-6 h-6 bg-success border-4 border-white rounded-full" id="detailStatusDot"></div> </div> <h4 className="font-h2 text-h2 text-center" id="detailName">Koffi Mensah</h4> <p className="text-text-secondary font-label" id="detailId">ID: #LVR-0922</p> </div> <div className="space-y-lg flex-1"> <div className="p-md bg-bg-secondary rounded-lg border border-border-default"> <p className="text-text-secondary text-micro uppercase mb-2">Performance Globale</p> <div className="flex justify-between items-end"> <span className="font-h1 text-h1 text-success" id="detailSuccess">98%</span> <span className="text-success text-label flex items-center"><MIcon name="trending_up" className="text-[16px]" /> +2.4%</span> </div> </div> <div className="space-y-md"> <div className="flex items-start gap-3"> <MIcon name="call" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Téléphone</p> <p className="font-body font-medium">+229 97 00 00 00</p> </div> </div> <div className="flex items-start gap-3"> <MIcon name="motorcycle" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Véhicule</p> <p className="font-body font-medium">Bajaj Pulsar (BJ-9921)</p> </div> </div> <div className="flex items-start gap-3"> <MIcon name="location_on" className="text-primary p-2 bg-primary-tint rounded-lg" /> <div> <p className="text-text-secondary text-micro">Zone Actuelle</p> <p className="font-body font-medium" id="detailZone">Cotonou - Akpakpa</p> </div> </div> </div> <div className="pt-lg border-t border-border-default"> <p className="font-label text-label mb-md">Activités récentes</p> <ul className="space-y-sm"> <li className="flex justify-between text-secondary"> <span className="font-body">Livraison #4421</span> <span className="font-micro">Il y a 10m</span> </li> <li className="flex justify-between text-secondary"> <span className="font-body">Prise en charge #4430</span> <span className="font-micro">Il y a 2h</span> </li> </ul> </div> </div> <div className="mt-xl flex gap-3"> <button className="flex-1 bg-white border border-primary-container text-primary-container py-2 rounded-lg font-bold hover:bg-primary-tint active:scale-97 transition-all">Contacter</button> <button className="flex-1 bg-primary-container text-white py-2 rounded-lg font-bold hover:bg-primary-hover active:scale-97 transition-all">Assigner</button> </div> </aside>  
    </AdminLayout>
  );
}
