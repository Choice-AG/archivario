import React, { useState, useEffect, useMemo, useCallback } from "react";

import { STORAGE_KEYS, storageLoad, storageSave } from "./lib/storage";
import { SEED_SAGAS, SEED_ITEMS } from "./lib/seedData";
import { supabase } from "./lib/supabaseClient";
import { fetchItems, fetchSagas, upsertItem, upsertItems, deleteItemRemote, upsertSaga, deleteSagaRemote } from "./lib/db";
import { AuthScreen } from "./auth/AuthScreen";
import { EmptyState } from "./components/ui/atoms";
import { Sidebar } from "./components/Sidebar";
import { ItemFormModal } from "./forms/ItemFormModal";
import { SagaFormModal } from "./forms/SagaFormModal";
import { Dashboard } from "./views/Dashboard";
import { LibraryView } from "./views/LibraryView";
import { SagasView, SagaDetailView } from "./views/SagasView";
import { BacklogView } from "./views/BacklogView";
import { TimelineView } from "./views/TimelineView";
import { SettingsView } from "./views/SettingsView";

/* ============================================================
   ROOT APP
   ============================================================ */

const DEFAULT_FILTERS = { search: "", types: [], statuses: [], priorities: [], sagaId: "all", tag: "all", minScore: "0" };

function App_MediaTracker() {
  const [session, setSession] = useState(undefined); // undefined = comprobando, null = sin sesión
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [items, setItems] = useState([]);
  const [sagas, setSagas] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [display, setDisplay] = useState("grid");
  const [nav, setNav] = useState({ tab: "dashboard" });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [itemModal, setItemModal] = useState(null); // { mode:'new'|'edit', item, defaultType, defaultSagaId }
  const [sagaModal, setSagaModal] = useState(null); // { mode, saga }

  // sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // carga de datos (una vez hay sesión)
  useEffect(() => {
    if (!session) return;
    setReady(false);
    setLoadError("");
    (async () => {
      try {
        const userId = session.user.id;
        const [it, sg, prefs] = await Promise.all([
          fetchItems(userId),
          fetchSagas(userId),
          storageLoad(STORAGE_KEYS.prefs, { darkMode: true, display: "grid" }),
        ]);
        const isFirstRun = it.length === 0 && sg.length === 0;
        if (isFirstRun) {
          await Promise.all([
            upsertItems(userId, SEED_ITEMS),
            ...SEED_SAGAS.map((s) => upsertSaga(userId, s)),
          ]);
          setItems(SEED_ITEMS);
          setSagas(SEED_SAGAS);
        } else {
          setItems(it);
          setSagas(sg);
        }
        setDarkMode(prefs.darkMode);
        setDisplay(prefs.display || "grid");
        setReady(true);
      } catch (err) {
        console.error(err);
        setLoadError(err.message || "No se pudo cargar tu colección.");
      }
    })();
  }, [session]);

  useEffect(() => { if (ready) storageSave(STORAGE_KEYS.prefs, { darkMode, display }); }, [darkMode, display, ready]);

  const goTo = useCallback((next) => {
    setNav(next);
    if (next.type) setFilters((f) => ({ ...f, types: [next.type] }));
  }, []);

  const allTags = useMemo(() => Array.from(new Set(items.flatMap((i) => i.tags || []))).sort(), [items]);
  const sagaMap = useMemo(() => Object.fromEntries(sagas.map((s) => [s.id, s])), [sagas]);

  const openItemNew = (defaultType, defaultSagaId) => setItemModal({ mode: "new", defaultType, defaultSagaId });
  const openItemEdit = (item) => setItemModal({ mode: "edit", item });

  const userId = session?.user?.id;

  const saveItem = (item) => {
    const exists = items.some((p) => p.id === item.id);
    setItems(exists ? items.map((p) => (p.id === item.id ? item : p)) : [...items, item]);
    upsertItem(userId, item).catch(console.error);
    setItemModal(null);
  };
  const deleteItem = (id) => {
    setItems(items.filter((p) => p.id !== id));
    deleteItemRemote(userId, id).catch(console.error);
    setItemModal(null);
  };

  const saveSaga = (saga) => {
    const exists = sagas.some((p) => p.id === saga.id);
    setSagas(exists ? sagas.map((p) => (p.id === saga.id ? saga : p)) : [...sagas, saga]);
    upsertSaga(userId, saga).catch(console.error);
    setSagaModal(null);
  };
  const deleteSaga = (id) => {
    const clearedItems = items.map((it) => (it.sagaId === id ? { ...it, sagaId: "" } : it));
    setSagas(sagas.filter((p) => p.id !== id));
    setItems(clearedItems);
    deleteSagaRemote(userId, id).catch(console.error);
    upsertItems(userId, clearedItems.filter((it) => it.sagaId === "")).catch(console.error);
    setSagaModal(null);
    setNav({ tab: "sagas" });
  };

  const reorderBacklog = (a, b) => {
    if (!b) return;
    const updatedA = { ...a, priority: b.priority };
    const updatedB = { ...b, priority: a.priority };
    setItems(items.map((it) => (it.id === a.id ? updatedA : it.id === b.id ? updatedB : it)));
    upsertItems(userId, [updatedA, updatedB]).catch(console.error);
  };

  const handleImport = (data) => {
    const existingItemIds = new Set(items.map((p) => p.id));
    const incomingItems = data.items.filter((i) => !existingItemIds.has(i.id));
    setItems([...items, ...incomingItems]);
    upsertItems(userId, incomingItems).catch(console.error);

    const existingSagaIds = new Set(sagas.map((p) => p.id));
    const incomingSagas = (data.sagas || []).filter((s) => !existingSagaIds.has(s.id));
    setSagas([...sagas, ...incomingSagas]);
    Promise.all(incomingSagas.map((s) => upsertSaga(userId, s))).catch(console.error);
  };

  const onOrderModeChange = (sagaId, mode) => {
    const saga = sagas.find((s) => s.id === sagaId);
    if (!saga) return;
    const updated = { ...saga, orderMode: mode };
    setSagas(sagas.map((s) => (s.id === sagaId ? updated : s)));
    upsertSaga(userId, updated).catch(console.error);
  };

  const reorderSagaItem = (a, b, orderMode) => {
    if (!b) return;
    const key = orderMode === "chronological" ? "chronoOrder" : "releaseOrder";
    const updatedA = { ...a, [key]: b[key] };
    const updatedB = { ...b, [key]: a[key] };
    setItems(items.map((it) => (it.id === a.id ? updatedA : it.id === b.id ? updatedB : it)));
    upsertItems(userId, [updatedA, updatedB]).catch(console.error);
  };

  const reorderSagaDrag = (orderMode, orderedIds) => {
    const key = orderMode === "chronological" ? "chronoOrder" : "releaseOrder";
    const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
    const updated = items.map((it) => (orderMap.has(it.id) ? { ...it, [key]: orderMap.get(it.id) } : it));
    setItems(updated);
    upsertItems(userId, updated.filter((it) => orderMap.has(it.id))).catch(console.error);
  };

  const renameArc = (sagaId, oldArc, newArc) => {
    const updated = items.map((it) => (
      it.sagaId === sagaId && (it.arc || "") === oldArc ? { ...it, arc: newArc } : it
    ));
    setItems(updated);
    upsertItems(userId, updated.filter((it) => it.sagaId === sagaId && it.arc === newArc)).catch(console.error);
  };

  const updateItemField = (id, field, value) => {
    const updated = items.map((it) => (it.id === id ? { ...it, [field]: value, updatedAt: Date.now() } : it));
    setItems(updated);
    const changed = updated.find((it) => it.id === id);
    if (changed) upsertItem(userId, changed).catch(console.error);
  };

  if (session === undefined) {
    return (
      <div className="mt-app mt-loading">
        <div className="mt-spinner" />
        <p>Comprobando sesión…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (loadError) {
    return (
      <div className="mt-app mt-loading">
        <p style={{ color: "var(--stamp)" }}>{loadError}</p>
        <button className="mt-tab" onClick={() => setSession({ ...session })}>Reintentar</button>
        <button className="mt-tab" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-app mt-loading">
        <div className="mt-spinner" />
        <p>Cargando tu colección…</p>
      </div>
    );
  }

  let body = null;
  if (nav.tab === "dashboard") {
    body = <Dashboard items={items} sagas={sagas} onOpenItem={openItemEdit} goTo={goTo} />;
  } else if (nav.tab === "library") {
    body = (
      <LibraryView
        items={items} sagas={sagas} filters={filters} setFilters={setFilters}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
        display={display} setDisplay={setDisplay}
        onOpenItem={openItemEdit} onAdd={() => openItemNew(filters.types[0] || "game")}
        allTags={allTags}
      />
    );
  } else if (nav.tab === "sagas") {
    body = <SagasView sagas={sagas} items={items} onOpenSaga={(id) => setNav({ tab: "sagaDetail", sagaId: id })} onAddSaga={() => setSagaModal({ mode: "new" })} />;
  } else if (nav.tab === "sagaDetail") {
    const saga = sagaMap[nav.sagaId];
    if (!saga) {
      body = <EmptyState text="Esta saga ya no existe." />;
    } else {
      body = (
        <SagaDetailView
          saga={saga} items={items}
          onBack={() => setNav({ tab: "sagas" })}
          onOpenItem={openItemEdit}
          onAdd={() => openItemNew("game", saga.id)}
          onEditSaga={() => setSagaModal({ mode: "edit", saga })}
          onOrderModeChange={(mode) => onOrderModeChange(saga.id, mode)}
          onReorder={(a, b) => reorderSagaItem(a, b, saga.orderMode)}
          onDragReorder={(orderedIds) => reorderSagaDrag(saga.orderMode, orderedIds)}
          onRenameArc={(oldArc, newArc) => renameArc(saga.id, oldArc, newArc)}
          onEditItemField={updateItemField}
        />
      );
    }
  } else if (nav.tab === "backlog") {
    body = <BacklogView items={items} sagas={sagas} onOpenItem={openItemEdit} onReorder={reorderBacklog} />;
  } else if (nav.tab === "timeline") {
    body = <TimelineView items={items} sagas={sagas} onOpenItem={openItemEdit} />;
  } else if (nav.tab === "settings") {
    body = <SettingsView items={items} sagas={sagas} onImport={handleImport} />;
  }

  return (
    <div className={`mt-app ${darkMode ? "dark" : ""}`}>
      <div className="mt-shell">
        <Sidebar
          tab={nav.tab} goTo={goTo} darkMode={darkMode} setDarkMode={setDarkMode}
          userEmail={session.user.email}
          onSignOut={() => supabase.auth.signOut()}
        />
        <main className="mt-main">{body}</main>
      </div>

      {itemModal && (
        <ItemFormModal
          initial={itemModal.mode === "edit" ? itemModal.item : null}
          sagas={sagas}
          defaultType={itemModal.defaultType}
          defaultSagaId={itemModal.defaultSagaId}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
          onDelete={deleteItem}
          onCreateSaga={saveSaga}
        />
      )}
      {sagaModal && (
        <SagaFormModal
          initial={sagaModal.mode === "edit" ? sagaModal.saga : null}
          onSave={saveSaga}
          onClose={() => setSagaModal(null)}
          onDelete={deleteSaga}
        />
      )}
    </div>
  );
}

export default App_MediaTracker;
