import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';
import { adminApi } from '../../services/api';
import { fmtFcfa, listOf, unwrap } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { absImageUrl } from '../../utils/imageUrl';

const CARD_W = 176;
const CARD_H = 208;

type Produit = {
  id: number;
  nom?: string;
  prix?: number | string;
  image_url?: string | null;
  stock?: number;
  categorie?: { id?: number; nom?: string } | null;
};

type PackLigne = {
  id: number;
  qte: number;
  x: number;
  y: number;
};

type Pack = {
  id: number;
  nom?: string;
  description?: string | null;
  prix_total?: number | string | null;
  prix_minimum?: number | string | null;
  disponible?: boolean;
  img_url?: string | null;
  produits?: Produit & { pivot?: { qte?: number } }[];
  products?: Produit & { pivot?: { qte?: number } }[];
};

type Recherche = { pack?: number; edit?: number; nouveau?: number };

type Pression = {
  mode: 'new' | 'move';
  id: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  moved: boolean;
};

function inclusDe(pack?: Pack | null) {
  return pack?.produits ?? pack?.products ?? [];
}

function prixDe(p?: Produit | null) {
  const n = Number(p?.prix ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function slot(index: number) {
  const cols = 3;
  return {
    x: 28 + (index % cols) * (CARD_W + 18),
    y: 28 + Math.floor(index / cols) * (CARD_H + 18),
  };
}

function dansLaPage(el: HTMLElement | null, x: number, y: number) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function positionDans(el: HTMLElement, clientX: number, clientY: number, offsetX: number, offsetY: number) {
  const r = el.getBoundingClientRect();
  const x = clientX - r.left - offsetX;
  const y = clientY - r.top - offsetY;
  return {
    x: Math.min(Math.max(16, x), Math.max(16, el.clientWidth - CARD_W - 16)),
    y: Math.min(Math.max(16, y), Math.max(16, el.clientHeight - CARD_H - 16)),
  };
}

async function chargerProduits() {
  const acc: Produit[] = [];
  for (let page = 1; page <= 10; page++) {
    const res: any = await adminApi.getProducts({ per_page: 100, page });
    acc.push(...listOf(res));
    if (page >= Number(res?.meta?.last_page ?? 1)) break;
  }
  return acc;
}

function Vignette({ produit, className }: { produit?: Produit | null; className?: string }) {
  const src = absImageUrl(produit?.image_url);
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-200 text-primary ${className ?? ''}`}>
        <MIcon name="inventory_2" />
      </div>
    );
  }
  return <img src={src} alt="" className={`object-cover ${className ?? ''}`} />;
}

export default function AdminPacksPage() {
  useLanguage();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Recherche;
  const [packs, setPacks] = useState<Pack[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [pret, setPret] = useState(false);
  const [err, setErr] = useState('');
  const [qPack, setQPack] = useState('');
  const [qProduit, setQProduit] = useState('');
  const [catRail, setCatRail] = useState('');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prixTotal, setPrixTotal] = useState('');
  const [prixMinimum, setPrixMinimum] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [lignes, setLignes] = useState<PackLigne[]>([]);
  const [extras, setExtras] = useState<Record<number, Produit>>({});
  const [ghost, setGhost] = useState<Pression & { x: number; y: number } | null>(null);
  const [surPage, setSurPage] = useState(false);
  const [pulse, setPulse] = useState<number | null>(null);
  const [sauve, setSauve] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Pack | null>(null);
  const [supprime, setSupprime] = useState(false);
  const [couverture, setCouverture] = useState('');
  const [large, setLarge] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const pageRef = useCanvasRef();
  const pressRef = useRef<Pression | null>(null);
  const hydrate = useRef('');

  const vue = search.edit || search.nouveau ? 'composer' : search.pack ? 'detail' : 'galerie';
  const packOuvert = packs.find((p) => Number(p.id) === Number(search.pack));
  const packEdite = packs.find((p) => Number(p.id) === Number(search.edit));

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const [liste, shelf] = await Promise.all([
          adminApi.getBundles().then((r) => listOf(unwrap(r)) as Pack[]),
          chargerProduits(),
        ]);
        if (stop) return;
        setPacks(liste);
        setProduits(shelf);
      } catch (e) {
        if (!stop) setErr(formatApiError(extractApiError(e)));
      } finally {
        if (!stop) setPret(true);
      }
    })();
    return () => { stop = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setLarge(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const cle = search.edit ? `e${search.edit}` : search.nouveau ? 'n' : '';
    if (!cle) {
      hydrate.current = '';
      return;
    }
    if (hydrate.current === cle) return;
    if (search.nouveau) {
      hydrate.current = cle;
      setNom('');
      setDescription('');
      setPrixTotal('');
      setPrixMinimum('');
      setDisponible(true);
      setLignes([]);
      setExtras({});
      setCouverture('');
      return;
    }
    if (!pret) return;
    const pack = packs.find((p) => Number(p.id) === Number(search.edit));
    if (!pack) {
      hydrate.current = cle;
      return;
    }
    hydrate.current = cle;
    const inclus = inclusDe(pack);
    const extra: Record<number, Produit> = {};
    inclus.forEach((p) => { extra[Number(p.id)] = p; });
    setExtras(extra);
    setNom(pack.nom ?? '');
    setDescription(pack.description ?? '');
    setPrixTotal(pack.prix_total == null ? '' : String(Number(pack.prix_total)));
    setPrixMinimum(pack.prix_minimum == null || pack.prix_minimum === '' ? '' : String(Number(pack.prix_minimum)));
    setDisponible(pack.disponible !== false);
    setLignes(inclus.map((p, i) => ({
      id: Number(p.id),
      qte: Math.max(1, Number(p.pivot?.qte ?? 1)),
      ...slot(i),
    })));
    const photoPack = absImageUrl(pack.img_url);
    const photoProduit = inclus.map((p) => absImageUrl(p.image_url)).find(Boolean) ?? '';
    setCouverture(photoPack || photoProduit || '');
  }, [search.edit, search.nouveau, pret, packs]);

  const parId = useMemo(() => {
    const map = new Map<number, Produit>();
    produits.forEach((p) => map.set(Number(p.id), p));
    Object.values(extras).forEach((p) => {
      if (!map.has(Number(p.id))) map.set(Number(p.id), p);
    });
    return map;
  }, [produits, extras]);

  const somme = lignes.reduce((total, ligne) => total + prixDe(parId.get(ligne.id)) * ligne.qte, 0);

  /**
   * Le prix du pack n'est plus saisi : il est toujours la somme de ses produits.
   * 0 produit → 0 · 1 produit à 100 → 100 · + un produit à 500 → 600.
   * Le prix suit aussi les quantités (quantité 2 sur un produit à 100 = 200).
   */
  useEffect(() => {
    if (vue !== 'composer') return;
    setPrixTotal(String(Math.round(somme)));
  }, [somme, vue]);

  /**
   * Un pack enregistré avant ce changement peut porter un prix différent de la somme.
   * L'enregistrement le remplacera : on le signale plutôt que de le faire en silence.
   */
  const prixEnregistre =
    packEdite?.prix_total == null || packEdite.prix_total === '' ? null : Number(packEdite.prix_total);
  const ecartPrix =
    vue === 'composer' &&
    Boolean(search.edit) &&
    prixEnregistre !== null &&
    Math.round(prixEnregistre) !== Math.round(somme);

  function aller(params: Recherche) {
    navigate({ to: '/admin/packs', search: { pack: undefined, edit: undefined, nouveau: undefined, ...params } });
  }

  function retour() {
    if (vue === 'composer' && (nom.trim() || lignes.length > 0)) {
      if (!window.confirm(tr('Quitter sans enregistrer ?', 'Leave without saving?'))) return;
    }
    setGhost(null);
    aller({});
  }

  function produitDe(id: number) {
    return parId.get(id);
  }

  function imageDe(id: number) {
    return absImageUrl(produitDe(id)?.image_url);
  }

  function poser(id: number, pos: { x: number; y: number } | 'suivant') {
    setLignes((prev) => {
      const deja = prev.find((l) => l.id === id);
      if (deja) {
        return prev.map((l) => (l.id === id ? { ...l, qte: l.qte + 1, ...(pos === 'suivant' ? {} : pos) } : l));
      }
      const place = pos === 'suivant' ? slot(prev.length) : pos;
      return [...prev, { id, qte: 1, ...place }];
    });
    setCouverture((cur) => cur || imageDe(id) || '');
    setPulse(id);
    window.setTimeout(() => setPulse((cur) => (cur === id ? null : cur)), 450);
  }

  function retirer(id: number) {
    setLignes((prev) => prev.filter((l) => l.id !== id));
  }

  function changerQte(id: number, delta: number) {
    setLignes((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const qte = l.qte + delta;
      return qte < 1 ? [] : [{ ...l, qte }];
    }));
  }

  function dragProps(mode: 'new' | 'move', id: number) {
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (!large) return;
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button, input, a, textarea, select')) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        pressRef.current = {
          mode,
          id,
          startX: e.clientX,
          startY: e.clientY,
          offsetX: mode === 'move' ? e.clientX - rect.left : 88,
          offsetY: mode === 'move' ? e.clientY - rect.top : 28,
          moved: false,
        };
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const press = pressRef.current;
        if (!press || press.id !== id || press.mode !== mode) return;
        const dist = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
        if (!press.moved && dist < 6) return;
        press.moved = true;
        setSurPage(dansLaPage(pageRef.current, e.clientX, e.clientY));
        setGhost({ ...press, x: e.clientX, y: e.clientY });
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        const press = pressRef.current;
        pressRef.current = null;
        setGhost(null);
        setSurPage(false);
        if (!press || press.id !== id) return;
        const page = pageRef.current;
        const dedans = dansLaPage(page, e.clientX, e.clientY);
        if (!press.moved && mode === 'new') {
          poser(id, 'suivant');
          return;
        }
        if (!(press.moved && dedans && page)) return;
        const pos = positionDans(page, e.clientX, e.clientY, press.offsetX, press.offsetY);
        if (mode === 'move') setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...pos } : l)));
        else poser(id, pos);
      },
      onPointerCancel: () => {
        pressRef.current = null;
        setGhost(null);
        setSurPage(false);
      },
      onClick: (e: { target: EventTarget | null }) => {
        if (large || mode !== 'new') return;
        if ((e.target as HTMLElement | null)?.closest('button, input, a, textarea, select')) return;
        poser(id, 'suivant');
      },
    };
  }

  async function enregistrer() {
    if (!nom.trim()) {
      window.alert(tx("Le nom du pack est obligatoire."));
      return;
    }
    if (prixTotal.trim() === '' || !Number.isFinite(Number(prixTotal)) || Number(prixTotal) < 0) {
      window.alert(tx("Le prix total est obligatoire."));
      return;
    }
    if (lignes.length === 0) {
      window.alert(tx("Ajoutez au moins un produit sur la page."));
      return;
    }
    if (prixMinimum.trim() !== '' && Number(prixMinimum) > Number(prixTotal)) {
      window.alert(tx("Le prix minimum ne peut pas dépasser le prix total."));
      return;
    }
    const payload = {
      nom: nom.trim(),
      description: description.trim() || null,
      prix_total: Number(prixTotal),
      prix_minimum: prixMinimum.trim() === '' ? null : Number(prixMinimum),
      disponible,
      img_url: couverture || null,
      products: lignes.map((l) => ({ id: l.id, qte: l.qte })),
    };
    setSauve(true);
    try {
      const res: any = search.edit
        ? await adminApi.updateBundle(Number(search.edit), payload)
        : await adminApi.createBundle(payload);
      const id = Number(res?.data?.id ?? res?.id ?? search.edit);
      const liste = listOf(unwrap(await adminApi.getBundles())) as Pack[];
      setPacks(liste);
      toast.success(tx("Pack enregistré."));
      hydrate.current = '';
      aller(id ? { pack: id } : {});
    } catch (e) {
      window.alert(formatApiError(extractApiError(e)));
    } finally {
      setSauve(false);
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setSupprime(true);
    try {
      await adminApi.deleteBundle(aSupprimer.id);
      setPacks((prev) => prev.filter((p) => Number(p.id) !== Number(aSupprimer.id)));
      toast.success(tx("Pack supprimé."));
      setASupprimer(null);
      if (Number(search.pack) === Number(aSupprimer.id) || Number(search.edit) === Number(aSupprimer.id)) aller({});
    } catch (e) {
      window.alert(formatApiError(extractApiError(e)));
    } finally {
      setSupprime(false);
    }
  }

  const packsFiltres = packs.filter((p) => {
    const q = qPack.trim().toLowerCase();
    if (!q) return true;
    return String(p.nom ?? '').toLowerCase().includes(q) || String(p.id).includes(q);
  });
  const rayon = produits.filter((p) => {
    const q = qProduit.trim().toLowerCase();
    const hit = !q || String(p.nom ?? '').toLowerCase().includes(q) || String(p.id).includes(q);
    const cok = !catRail || String(p.categorie?.id ?? '') === catRail;
    return hit && cok;
  });
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    produits.forEach((p) => {
      if (p.categorie?.id && p.categorie.nom) map.set(String(p.categorie.id), p.categorie.nom);
    });
    return [...map.entries()];
  }, [produits]);

  const ghostProduit = ghost ? produitDe(ghost.id) : null;
  const hauteurPage = Math.max(640, ...lignes.map((l) => l.y + CARD_H + 36), 640);

  return (
    <AdminLayout
      currentPath="/admin/packs"
      mainClassName={vue === 'galerie' ? undefined : 'ml-64 pt-[52px] min-h-screen bg-[#efe8e2]'}
    >
      <style>{`
        .pack-page-grid {
          background-color: #fff;
          background-image: radial-gradient(circle, rgba(249,115,22,0.16) 1.1px, transparent 1.2px);
          background-size: 22px 22px;
        }
        .pack-pop { animation: pack-pop 180ms ease-out; }
        @keyframes pack-pop { from { transform: scale(.94); opacity: .4; } to { transform: none; opacity: 1; } }
      `}</style>

      {err && (
        <div className="m-4 rounded-xl border border-error bg-error-container px-4 py-3 text-label text-on-error-container">{err}</div>
      )}

      {vue === 'galerie' && (
        <div className="space-y-6">
          <section className="grid items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3c2415] via-[#7c2d12] to-[#f97316] p-5 text-white shadow-xl sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-100">{tx("Gestion des packs")}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{tx("Atelier des packs")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-orange-50/90">{tx("Sur grand écran, glissez les produits sur la page blanche. Sur téléphone, touchez un produit pour l'ajouter.")}</p>
            </div>
            <button type="button" className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-bold text-primary-dark shadow-lg transition hover:-translate-y-0.5 sm:w-auto" onClick={() => aller({ nouveau: 1 })}>
              {tx("Composer un pack")}
            </button>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 w-full flex-1 sm:min-w-[240px]">
              <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input value={qPack} onChange={(e) => setQPack(e.target.value)} placeholder={tx("Rechercher un pack...")} className="w-full rounded-2xl border border-border-default bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
            </div>
            <span className="text-sm text-text-secondary">{packsFiltres.length} / {packs.length}</span>
          </div>

          {!pret && <p className="text-sm text-text-secondary">{tx("Chargement des données réelles…")}</p>}
          {pret && packsFiltres.length === 0 && (
            <div className="rounded-3xl border border-dashed border-primary/30 bg-white px-6 py-16 text-center">
              <MIcon name="package_2" className="text-5xl text-primary" />
              <p className="mt-3 text-lg font-bold">{tx("Aucun pack pour l'instant.")}</p>
              <button type="button" className="btn btn-primary mt-4" onClick={() => aller({ nouveau: 1 })}>{tx("Composer un pack")}</button>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {packsFiltres.map((pack) => {
              const inclus = inclusDe(pack);
              const cover = absImageUrl(pack.img_url) || inclus.map((p) => absImageUrl(p.image_url)).find(Boolean) || '';
              return (
                <article key={pack.id} className="group cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl" onClick={() => aller({ pack: Number(pack.id) })}>
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
                    {cover ? (
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : inclus.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-primary/70"><MIcon name="package_2" className="text-5xl" /></div>
                    ) : null}
                    {!cover && inclus.slice(0, 3).map((p, i) => (
                      <div key={p.id ?? i} className="absolute h-24 w-24 overflow-hidden rounded-2xl shadow-lg ring-4 ring-white" style={{ left: 28 + i * 46, top: 32 + (i % 2) * 12, transform: `rotate(${i * 7 - 8}deg)` }}>
                        <Vignette produit={p} className="h-full w-full" />
                      </div>
                    ))}
                    <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${pack.disponible !== false ? 'bg-white text-success-dark' : 'bg-white/90 text-text-secondary'}`}>
                      {pack.disponible !== false ? tx("Disponible") : tx("Rupture")}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-bold leading-tight">{pack.nom}</h2>
                      <span className="shrink-0 font-bold text-primary">{fmtFcfa(Number(pack.prix_total ?? 0))}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-text-secondary">{pack.description || tx("Aucune description.")}</p>
                    <p className="text-xs font-semibold text-text-tertiary">{tr(`${inclus.length} produit${inclus.length > 1 ? 's' : ''}`, `${inclus.length} product${inclus.length > 1 ? 's' : ''}`)}</p>
                    <div className="flex justify-end gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="text-sm font-semibold text-primary" onClick={() => aller({ edit: Number(pack.id) })}>{tx("Modifier")}</button>
                      <button type="button" className="text-sm font-semibold text-error" onClick={() => setASupprimer(pack)}>{tx("Supprimer")}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {vue === 'detail' && (
        <DetailPack
          pack={packOuvert}
          pret={pret}
          onBack={() => aller({})}
          onEdit={() => packOuvert && aller({ edit: Number(packOuvert.id) })}
          onDelete={() => packOuvert && setASupprimer(packOuvert)}
        />
      )}

      {vue === 'composer' && search.edit && pret && !packEdite ? (
        <div className="p-8">
          <p className="text-lg font-bold">{tx("Pack introuvable.")}</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => aller({})}>{tx("Retour aux packs")}</button>
        </div>
      ) : vue === 'composer' && (
        <div className="flex min-h-[70vh] flex-col lg:h-[calc(100vh-52px)] lg:min-h-[640px]">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/5 bg-white px-3 py-3 sm:gap-3 sm:px-4">
            <button type="button" className="rounded-xl p-2 hover:bg-bg-secondary" onClick={retour} aria-label={tx("Retour aux packs")}>
              <MIcon name="arrow_back" />
            </button>
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{search.edit ? tx("Modifier le pack") : tx("Nouveau pack")}</p>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={tx("Nom du pack — obligatoire")} className="w-full bg-transparent text-lg font-bold outline-none placeholder:font-medium placeholder:text-text-tertiary" />
            </div>
            <label className="order-3 flex w-full items-center gap-2 text-sm font-semibold sm:order-none sm:w-auto">
              <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="accent-primary" />
              {tx("Disponible à la vente")}
            </label>
            <button type="button" className="btn btn-primary order-2 sm:order-none" disabled={sauve} onClick={() => void enregistrer()}>
              {sauve ? tx("Enregistrement…") : tx("Enregistrer le pack")}
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="flex max-h-[42vh] w-full shrink-0 flex-col border-b border-black/5 bg-white lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r">
              <div className="space-y-2 border-b border-border-default p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{tx("Rayon produits")}</p>
                  <span className="text-xs text-text-tertiary">{rayon.length}</span>
                </div>
                <div className="relative">
                  <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary" />
                  <input value={qProduit} onChange={(e) => setQProduit(e.target.value)} placeholder={tx("Rechercher un produit...")} className="w-full rounded-xl border border-border-default py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
                </div>
                <select value={catRail} onChange={(e) => setCatRail(e.target.value)} className="w-full rounded-xl border border-border-default bg-white px-3 py-2 text-sm">
                  <option value="">{tx("Toutes les catégories")}</option>
                  {categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <p className="text-xs text-text-secondary">{large ? tx("Glissez un produit sur la page") : tx("Touchez un produit pour l'ajouter.")} {large ? tx("Cliquer ajoute aussi le produit.") : ''}</p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {rayon.map((p) => {
                  const deja = lignes.find((l) => l.id === Number(p.id));
                  return (
                    <div
                      key={p.id}
                      {...dragProps('new', Number(p.id))}
                      className={`flex cursor-grab touch-none items-center gap-3 rounded-2xl border bg-white p-2 shadow-sm active:cursor-grabbing ${deja ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border-default'}`}
                    >
                      <Vignette produit={p} className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.nom}</p>
                        <p className="text-xs font-bold text-primary">{fmtFcfa(prixDe(p))}</p>
                        {deja && <p className="text-[11px] font-semibold text-primary">{tx("Déjà dans le pack")} · {deja.qte}</p>}
                      </div>
                      {large ? <MIcon name="drag_indicator" className="text-text-tertiary" /> : (
                        <span className="shrink-0 rounded-lg bg-primary-tint px-2 py-1 text-xs font-bold text-primary-dark">{tx("Ajouter")}</span>
                      )}
                    </div>
                  );
                })}
                {pret && rayon.length === 0 && <p className="px-2 py-6 text-sm text-text-secondary">{tx("Aucun résultat pour ces filtres.")}</p>}
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                {!large && (
                  <div className="space-y-3">
                    {lignes.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-primary/30 bg-white px-4 py-10 text-center">
                        <MIcon name="touch_app" className="text-4xl text-primary" />
                        <p className="mt-3 text-lg font-bold">{tx("Touchez un produit pour l'ajouter.")}</p>
                        <p className="mt-1 text-sm text-text-secondary">{tx("La page du pack est encore vide.")}</p>
                      </div>
                    )}
                    {lignes.map((ligne) => {
                      const produit = produitDe(ligne.id);
                      const photo = imageDe(ligne.id);
                      return (
                        <div key={ligne.id} className={`flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 ${pulse === ligne.id ? 'ring-2 ring-primary' : ''}`}>
                          <Vignette produit={produit} className="h-16 w-16 shrink-0 rounded-xl" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{produit?.nom || tx("Produit retiré")}</p>
                            <p className="text-xs font-bold text-primary">{fmtFcfa(prixDe(produit))}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <button type="button" className="h-8 w-8 rounded-lg border border-border-default" onClick={() => changerQte(ligne.id, -1)}>-</button>
                              <span className="w-6 text-center text-sm font-bold">{ligne.qte}</span>
                              <button type="button" className="h-8 w-8 rounded-lg border border-border-default" onClick={() => changerQte(ligne.id, 1)}>+</button>
                            </div>
                          </div>
                          {photo && (
                            <button type="button" className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${couverture === photo ? 'bg-primary text-white' : 'bg-primary-tint text-primary-dark'}`} onClick={() => setCouverture(photo)}>
                              {tx("Photo")}
                            </button>
                          )}
                          <button type="button" aria-label={tx("Retirer")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-error" onClick={() => retirer(ligne.id)}>
                            <MIcon name="close" className="text-[18px]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div
                  ref={pageRef}
                  className={`${large ? '' : 'hidden'} pack-page-grid relative w-full rounded-[28px] shadow-2xl ring-1 transition ${surPage ? 'ring-4 ring-primary' : 'ring-black/5'}`}
                  style={{ minHeight: '100%', height: hauteurPage }}
                >
                  <p className="pointer-events-none absolute bottom-6 right-7 text-5xl font-black tracking-tight text-primary/10">TOKPa</p>
                  {lignes.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className={`flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed ${surPage ? 'border-primary bg-primary/10' : 'border-primary/30 bg-white/70'}`}>
                        <MIcon name="swipe_right" className="text-4xl text-primary" />
                      </div>
                      <p className="mt-4 text-xl font-bold">{surPage ? tx("Déposer ici") : tx("Déposez les produits ici")}</p>
                      <p className="mt-1 max-w-sm text-sm text-text-secondary">{tx("La page du pack est encore vide.")}</p>
                    </div>
                  )}
                  {surPage && lignes.length > 0 && (
                    <div className="pointer-events-none absolute inset-3 rounded-3xl border-2 border-dashed border-primary/70 bg-primary/5" />
                  )}
                  {lignes.map((ligne) => {
                    const produit = produitDe(ligne.id);
                    const bouge = ghost?.mode === 'move' && ghost.id === ligne.id;
                    return (
                      <div
                        key={ligne.id}
                        {...dragProps('move', ligne.id)}
                        className={`pack-pop absolute cursor-grab touch-none rounded-2xl bg-white shadow-xl ring-1 ring-black/5 active:cursor-grabbing ${pulse === ligne.id ? 'ring-2 ring-primary' : ''} ${bouge ? 'opacity-30' : ''}`}
                        style={{ left: ligne.x, top: ligne.y, width: CARD_W }}
                      >
                        {ligne.qte > 1 && <div className="absolute -bottom-1.5 -right-1.5 -z-10 h-full w-full rounded-2xl bg-primary-lighter ring-1 ring-primary/20" />}
                        <div className="relative">
                          <Vignette produit={produit} className="h-24 w-full rounded-t-2xl" />
                          <button type="button" aria-label={tx("Retirer")} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-text-secondary shadow hover:text-error" onClick={() => retirer(ligne.id)}>
                            <MIcon name="close" className="text-[16px]" />
                          </button>
                        </div>
                        <div className="space-y-1 p-2.5">
                          <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{produit?.nom || tx("Produit retiré")}</p>
                          <p className="text-xs font-bold text-primary">{fmtFcfa(prixDe(produit))}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-text-tertiary">{tx("Quantité")}</span>
                            <div className="flex items-center gap-1">
                              <button type="button" className="h-7 w-7 rounded-lg border border-border-default" onClick={() => changerQte(ligne.id, -1)}>-</button>
                              <span className="w-6 text-center text-sm font-bold">{ligne.qte}</span>
                              <button type="button" className="h-7 w-7 rounded-lg border border-border-default" onClick={() => changerQte(ligne.id, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {ecartPrix && (
                <div className="shrink-0 border-t border-amber-text/30 bg-amber-light px-3 py-2 text-xs text-amber-text">
                  {tx("Ce pack était enregistré à")} {fmtFcfa(prixEnregistre ?? 0)}
                  {'. '}
                  {tx("Le prix est maintenant la somme de ses produits :")} {fmtFcfa(somme)}
                  {'. '}
                  {tx("Enregistrer appliquera ce nouveau prix.")}
                </div>
              )}
              <div className="shrink-0 border-t border-black/5 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-text-secondary">{tx("Photo du pack")}</p>
                  {couverture && (
                    <button type="button" className="text-xs font-semibold text-text-tertiary" onClick={() => setCouverture('')}>{tx("Retirer")}</button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                  {couverture && <img src={couverture} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-primary" />}
                  {lignes.map((ligne) => {
                    const photo = imageDe(ligne.id);
                    if (!photo || photo === couverture) return null;
                    return (
                      <button key={ligne.id} type="button" className="shrink-0" title={tx("Choisir comme photo du pack")} onClick={() => setCouverture(photo)}>
                        <Vignette produit={produitDe(ligne.id)} className="h-12 w-12 rounded-xl" />
                      </button>
                    );
                  })}
                  {!couverture && <p className="text-xs text-text-secondary">{tx("Aucune photo pour l'instant. Ajoutez un produit qui en a une.")}</p>}
                </div>
              </div>
              <footer className="grid shrink-0 gap-3 border-t border-black/5 bg-white/95 p-3 md:grid-cols-[1.4fr_160px_160px_180px]">
                <label className="block text-xs text-text-secondary">
                  {tx("Description")}
                  <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-border-default px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs text-text-secondary">
                  {tx("Prix total")}
                  <input
                    value={prixTotal}
                    readOnly
                    aria-readonly="true"
                    title={tx("Calculé automatiquement à partir des produits du pack")}
                    className="mt-1 w-full cursor-not-allowed rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="block text-xs text-text-secondary">
                  {tx("Prix minimum")}
                  <input value={prixMinimum} onChange={(e) => setPrixMinimum(e.target.value)} className="mt-1 w-full rounded-xl border border-border-default px-3 py-2 text-sm" />
                </label>
                <div className="rounded-xl bg-primary-tint px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-dark">{tx("Calcul automatique")}</p>
                  <p className="text-lg font-black text-primary-dark">{fmtFcfa(somme)}</p>
                  <p className="text-[11px] leading-tight text-primary-dark">
                    {lignes.length} {tx("produit(s) · le prix suit les produits et leurs quantités")}
                  </p>
                </div>
              </footer>
            </section>
          </div>
        </div>
      )}

      {ghost && ghostProduit && (
        <div className="pointer-events-none fixed z-[80] w-[176px] -rotate-2 rounded-2xl bg-white shadow-2xl ring-2 ring-primary" style={{ left: ghost.x - ghost.offsetX, top: ghost.y - ghost.offsetY }}>
          <Vignette produit={ghostProduit} className="h-20 w-full rounded-t-2xl" />
          <p className="truncate px-2 py-2 text-sm font-bold">{ghostProduit.nom}</p>
        </div>
      )}

      {aSupprimer && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" onClick={() => setASupprimer(null)}>
          <div className="w-[min(92vw,36rem)] shrink-0 rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-light text-error">
              <MIcon name="delete" />
            </div>
            <h3 className="mt-4 text-center text-xl font-bold">{tx("Supprimer ce pack ?")}</h3>
            <p className="mt-1 text-center font-semibold">{aSupprimer.nom}</p>
            <p className="mt-2 text-center text-sm text-text-secondary">{tx("Cette action retire le pack du catalogue.")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setASupprimer(null)}>{tx("Annuler")}</button>
              <button type="button" className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={supprime} onClick={() => void confirmerSuppression()}>{tx("Supprimer")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function useCanvasRef() {
  return useRef<HTMLDivElement>(null);
}

function DetailPack({
  pack,
  pret,
  onBack,
  onEdit,
  onDelete,
}: {
  pack?: Pack;
  pret: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const inclus = inclusDe(pack);
  const somme = inclus.reduce((total, p) => total + prixDe(p) * Math.max(1, Number(p.pivot?.qte ?? 1)), 0);
  return (
    <div className="flex min-h-[70vh] flex-col lg:h-[calc(100vh-52px)] lg:min-h-[640px]">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/5 bg-white px-3 py-3 sm:gap-3 sm:px-4">
        <button type="button" className="rounded-xl p-2 hover:bg-bg-secondary" onClick={onBack} aria-label={tx("Retour aux packs")}>
          <MIcon name="arrow_back" />
        </button>
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{tx("Détails du pack")}</p>
          <h1 className="truncate text-lg font-bold">{pack?.nom || (pret ? tx("Pack introuvable.") : tx("Chargement des données réelles…"))}</h1>
        </div>
        {pack && (
          <>
            <button type="button" className="btn btn-ghost" onClick={onEdit}>{tx("Modifier")}</button>
            <button type="button" className="rounded-lg px-4 py-2 text-sm font-bold text-error hover:bg-error-light" onClick={onDelete}>{tx("Supprimer")}</button>
          </>
        )}
      </header>
      {!pack && pret && (
        <div className="p-8">
          <button type="button" className="btn btn-primary" onClick={onBack}>{tx("Retour aux packs")}</button>
        </div>
      )}
      {pack && (
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 overflow-y-auto border-b border-black/5 bg-white p-5 lg:border-b-0 lg:border-r">
            {absImageUrl(pack.img_url) && (
              <img src={absImageUrl(pack.img_url) ?? ''} alt="" className="h-40 w-full rounded-2xl object-cover" />
            )}
            <p className="text-3xl font-black text-primary">{fmtFcfa(Number(pack.prix_total ?? 0))}</p>
            <p className="text-sm text-text-secondary">{pack.description || tx("Aucune description.")}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">{tx("Identifiant")}</dt><dd className="font-semibold">{pack.id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">{tx("Prix minimum")}</dt><dd className="font-semibold">{pack.prix_minimum == null ? '—' : fmtFcfa(Number(pack.prix_minimum))}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">{tx("Somme des produits")}</dt><dd className="font-semibold">{fmtFcfa(somme)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">{tx("Statut")}</dt><dd className="font-semibold">{pack.disponible !== false ? tx("Disponible") : tx("Rupture")}</dd></div>
            </dl>
          </aside>
          <div className="min-h-0 overflow-auto p-6">
            <div className="pack-page-grid relative min-h-full rounded-[28px] p-8 shadow-2xl">
              <p className="pointer-events-none absolute bottom-6 right-7 text-5xl font-black tracking-tight text-primary/10">TOKPa</p>
              {inclus.length === 0 && <p className="text-text-secondary">{tx("Aucun produit pour l'instant.")}</p>}
              <div className="relative z-10 flex flex-wrap gap-4">
                {inclus.map((p) => (
                  <div key={p.id} className="w-[176px] rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                    <Vignette produit={p} className="h-24 w-full rounded-t-2xl" />
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-10 text-sm font-bold">{p.nom || tx("Produit retiré")}</p>
                      <p className="text-xs font-bold text-primary">{fmtFcfa(prixDe(p))}</p>
                      <p className="mt-1 text-xs text-text-secondary">{tx("Quantité")} {p.pivot?.qte ?? 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
