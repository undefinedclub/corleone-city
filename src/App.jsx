import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Bell, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Command, FilePlus2, FileText, LockKeyhole, LogOut, Menu, Plus,
  Search, Settings2, ShieldAlert, Trash2, TrendingDown, TrendingUp, UsersRound, Wallet,
  X, Pencil, Eye, CalendarClock, CalendarDays, Package, Warehouse, CarFront,
} from 'lucide-react';
import { displayValue, fieldOptions, moduleConfig, navigation, staticPages } from './data.js';
import { AuthGate, ConfigurationMessage } from './Auth.jsx';
import { cloudConfigured } from './supabase.js';
import { loadSharedData, saveSharedData, subscribeToSharedData } from './sharedData.js';
import { DATA_VERSION, exportData, initialData, validateImport } from './storage.js';

const money = (amount, currency = '$') => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Number(amount) || 0)} ${currency}`;
const dateLabel = (value) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE') : '—';
const today = () => new Date().toISOString().slice(0, 10);
const byDate = (a, b) => String(b.date || b.joined || '').localeCompare(String(a.date || a.joined || ''));

function saveDownload(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  if (!cloudConfigured) return <ConfigurationMessage />;
  return <AuthGate>{({ session, onSignOut }) => <FamilyApp session={session} onSignOut={onSignOut} />}</AuthGate>;
}

function FamilyApp({ session, onSignOut }) {
  const [data, setData] = useState(initialData);
  const [dataReady, setDataReady] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const [cloudError, setCloudError] = useState('');
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('imperio-view-role') || 'Boss');
  const [page, setPage] = useState(() => location.hash.slice(1) || 'dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedMember, setSelectedMember] = useState('');
  const importRef = useRef(null);
  const remoteUpdate = useRef(false);

  useEffect(() => {
    let active = true;
    loadSharedData().then((sharedData) => {
      if (!active) return;
      remoteUpdate.current = true;
      setData(sharedData);
      setDataReady(true);
      setCloudError('');
    }).catch(() => {
      if (!active) return;
      setCloudError('Die gemeinsamen Daten konnten nicht geladen werden. Prüfe Supabase-Schema und Zugriffsregeln.');
      setSaveState('error');
    });
    const unsubscribe = subscribeToSharedData((sharedData, updatedBy) => {
      if (updatedBy === session.user.id) return;
      remoteUpdate.current = true;
      setData(sharedData);
      setSaveState('saved');
      setCloudError('');
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [session.user.id]);
  useEffect(() => {
    if (!dataReady) return undefined;
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return undefined;
    }
    const timeout = setTimeout(() => {
      setSaveState('saving');
      saveSharedData(data, session.user.id).then(() => {
        setSaveState('saved');
        setCloudError('');
      }).catch(() => {
        setSaveState('error');
        setCloudError('Änderung konnte nicht mit der gemeinsamen Datenbank gespeichert werden.');
      });
    }, 450);
    return () => clearTimeout(timeout);
  }, [data, dataReady, session.user.id]);
  useEffect(() => {
    const handleHash = () => setPage(location.hash.slice(1) || 'dashboard');
    addEventListener('hashchange', handleHash);
    return () => removeEventListener('hashchange', handleHash);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => { setQuery(''); setFilter(''); setSort(''); setPageNumber(1); setMobileOpen(false); }, [page]);

  const notify = (message) => setToast(message);
  const go = (next) => { location.hash = next; };
  const addActivity = (label) => ({ id: crypto.randomUUID(), label, date: new Date().toISOString() });

  const openForm = (config, record = null) => {
    const fields = config.fields;
    const values = record ? { ...record } : Object.fromEntries(fields.map((field) => [field.key, '']));
    setModal({ mode: record ? 'edit' : 'create', config, record, values });
  };

  const storeRecord = (event, values) => {
    event.preventDefault();
    const { config, mode, record } = modal;
    for (const field of config.fields) {
      if (field.required && !String(values[field.key] || '').trim()) {
        notify(`${field.label} ist ein Pflichtfeld.`);
        return;
      }
    }
    const collection = config.collection;
    const saved = { ...values, id: record?.id || crypto.randomUUID(), updatedAt: new Date().toISOString() };
    setData((current) => ({
      ...current,
      [collection]: mode === 'edit'
        ? current[collection].map((item) => item.id === record.id ? saved : item)
        : [saved, ...current[collection]],
      activities: [addActivity(`${mode === 'edit' ? 'Bearbeitet' : 'Hinzugefügt'}: ${config.title} · ${config.label(saved, current)}`), ...current.activities].slice(0, 40),
    }));
    setModal(null);
    notify(mode === 'edit' ? 'Änderungen gespeichert.' : 'Eintrag wurde angelegt.');
  };

  const removeRecord = (config, record) => {
    if (!confirm(`„${config.label(record, data)}“ wirklich löschen?`)) return;
    setData((current) => ({
      ...current,
      [config.collection]: current[config.collection].filter((item) => item.id !== record.id),
      activities: [addActivity(`Gelöscht: ${config.title} · ${config.label(record, current)}`), ...current.activities].slice(0, 40),
    }));
    notify('Eintrag gelöscht.');
  };

  const changePage = (next) => { go(next); setModal(null); };
  const memberConfig = moduleConfig.members;
  const members = data.members;
  const memberName = (id) => {
    const member = members.find((item) => item.id === id);
    return member ? `${member.firstName} ${member.lastName}` : 'Unbekanntes Mitglied';
  };

  const financials = useMemo(() => {
    const balance = (account) => data.transactions.filter((item) => item.account === account)
      .reduce((sum, item) => sum + (item.type === 'Einnahme' ? 1 : -1) * Number(item.amount || 0), 0);
    return { black: balance('Schwarzgeld'), green: balance('Grüngeld') };
  }, [data.transactions]);
  const metrics = useMemo(() => {
    const isAway = (absence) => absence.status === 'Aktiv' && absence.start <= today() && absence.end >= today();
    return {
      total: members.length,
      active: members.filter((member) => member.status === 'Aktiv').length,
      inactive: members.filter((member) => member.status === 'Inaktiv').length,
      away: data.absences.filter(isAway).length,
      sanctions: data.sanctions.filter((item) => item.status === 'Aktiv').length,
      loans: data.loans.filter((item) => item.status !== 'Abgeschlossen').reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0) + Number(item.fee || 0) - Number(item.repaid || 0)), 0),
      stock: data.inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      low: data.inventory.filter((item) => Number(item.quantity || 0) < Number(item.minimum || 0)).length,
      treasury: financials.black + financials.green,
    };
  }, [data, members, financials]);

  const allNav = navigation.flatMap((group) => group.items.map(([id, label]) => ({ id, label })));
  const pageInfo = moduleConfig[page] || staticPages[page] || { title: 'Übersicht', subtitle: 'Die Familie im Überblick.' };
  const currentLabel = allNav.find((item) => item.id === page)?.label || pageInfo.title;
  const defaultAccess = (role, id, action) => {
    if (role === 'Boss') return true;
    if (role === 'Underboss') return id !== 'permissions' || action === 'view';
    if (role === 'Consigliere') {
      if (['settings', 'permissions'].includes(id)) return false;
      if (action === 'view') return true;
      if (action === 'delete') return ['members', 'absences', 'attendance', 'events', 'blacklist', 'football', 'minutes', 'sanctions', 'dues', 'treasury', 'loans', 'purchases', 'inventory', 'vehicles', 'families', 'news'].includes(id);
      return true;
    }
    if (role === 'Capo') {
      const visible = ['dashboard', 'members', 'phonebook', 'files', 'myfile', 'absences', 'attendance', 'events', 'football', 'inventory'];
      if (!visible.includes(id)) return false;
      if (action === 'view') return true;
      if (action === 'delete') return ['absences', 'attendance', 'events'].includes(id);
      return ['members', 'absences', 'attendance', 'events', 'football', 'inventory'].includes(id);
    }
    return action === 'view' && ['dashboard', 'phonebook', 'myfile', 'events', 'news'].includes(id);
  };
  const canAccess = (id, action = 'view') => data.permissions[activeRole]?.[id]?.[action] ?? defaultAccess(activeRole, id, action);

  const configFor = (module) => ({
    ...module,
    label: (record, source) => module.collection === 'members'
      ? `${record.firstName || ''} ${record.lastName || ''}`.trim()
      : displayValue(record, module.columns[0]?.[0], source),
  });

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!validateImport(imported)) throw new Error('Das JSON entspricht nicht dem erwarteten Datenformat.');
      saveDownload(`imperio-backup-v${DATA_VERSION}-${today()}.json`, exportData(data));
      setData({ ...imported, version: DATA_VERSION });
      notify('Daten importiert. Vorher wurde ein Backup heruntergeladen.');
    } catch (error) {
      notify(error.message || 'Die Datei konnte nicht gelesen werden.');
    }
  };

  const renderTable = (config, sourceRecords, options = {}) => {
    const records = [...sourceRecords];
    const searchKeys = config.searchKeys || config.columns.map(([key]) => key);
    const [activeFilterKey, activeFilterValue] = filter.split('::');
    const filtered = records.filter((record) => {
      const matchesQuery = !query || searchKeys.some((key) => String(displayValue(record, key, data)).toLowerCase().includes(query.toLowerCase()));
      return matchesQuery && (!filter || String(record[activeFilterKey] || '') === activeFilterValue);
    });
    const sorted = filtered.sort((a, b) => {
      const field = sort || options.defaultSort;
      if (!field) return byDate(a, b);
      const left = String(displayValue(a, field, data));
      const right = String(displayValue(b, field, data));
      return left.localeCompare(right, 'de', { numeric: true }) * (options.descending ? -1 : 1);
    });
    const perPage = 10;
    const pages = Math.max(1, Math.ceil(sorted.length / perPage));
    const shown = sorted.slice((pageNumber - 1) * perPage, pageNumber * perPage);
    return <>
      <div className="table-tools">
        <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }} placeholder="Suchen" aria-label="Tabelle durchsuchen" /></label>
        {options.filters?.length > 0 && <select className="filter-select" value={filter} onChange={(event) => { setFilter(event.target.value); setPageNumber(1); }} aria-label="Tabelle filtern"><option value="">Alle anzeigen</option>{options.filters.flatMap((key) => [...new Set(sourceRecords.map((record) => record[key]).filter(Boolean))].map((value) => <option key={`${key}-${value}`} value={`${key}::${value}`}>{value}</option>))}</select>}
        <span className="result-count">{filtered.length} Einträge</span>
      </div>
      <div className="table-wrap"><table><thead><tr>{config.columns.map(([key, title]) => <th key={key}><button className="sort-button" onClick={() => setSort(sort === key ? '' : key)}>{title}{sort === key ? ' ↓' : ''}</button></th>)}<th className="actions-heading">Aktionen</th></tr></thead>
        <tbody>{shown.map((record) => <tr key={record.id}>
          {config.columns.map(([key]) => <td key={key}>{key === 'status' || key === 'relation' || key === 'importance' ? <span className={`tag ${String(record[key]).toLowerCase().replaceAll(' ', '-')}`}>{displayValue(record, key, data)}</span> : <span className={key === 'name' || key === config.columns[0][0] ? 'primary-cell' : ''}>{displayValue(record, key, data)}</span>}</td>)}
              <td><div className="row-actions">{canAccess(page, 'view') && <button className="icon-button" title="Details" onClick={() => setModal({ mode: 'detail', config, record })}><Eye size={15} /></button>}{canAccess(page, 'edit') && <button className="icon-button" title="Bearbeiten" onClick={() => openForm(config, record)}><Pencil size={15} /></button>}{canAccess(page, 'delete') && <button className="icon-button danger" title="Löschen" onClick={() => removeRecord(config, record)}><Trash2 size={15} /></button>}</div></td>
        </tr>)}
        {!shown.length && <tr><td className="empty-row" colSpan={config.columns.length + 1}><div className="empty-state"><span className="empty-mark">—</span><strong>{query || filter ? 'Keine passenden Einträge' : 'Noch keine Einträge'}</strong><span>Die Übersicht füllt sich mit den gespeicherten Daten.</span></div></td></tr>}</tbody>
      </table></div>
      <div className="table-footer"><span>Seite {pageNumber} von {pages}</span><div className="pager"><button className="icon-button" disabled={pageNumber === 1} onClick={() => setPageNumber((value) => value - 1)} aria-label="Vorherige Seite"><ChevronLeft size={17} /></button><button className="icon-button" disabled={pageNumber === pages} onClick={() => setPageNumber((value) => value + 1)} aria-label="Nächste Seite"><ChevronRight size={17} /></button></div></div>
    </>;
  };

  const renderDashboard = () => {
    const nextEvents = [...data.events].filter((item) => item.date >= today() && item.status !== 'Abgesagt').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const inactive = members.filter((item) => item.status === 'Inaktiv').slice(0, 5);
    const recent = [...data.activities].slice(0, 6);
    const latestNews = [...data.news].sort(byDate).slice(0, 3);
    const metricsList = [
      ['Mitglieder gesamt', metrics.total, UsersRound, 'people'], ['Aktive Mitglieder', metrics.active, Check, 'green'],
      ['Inaktive Mitglieder', metrics.inactive, Clock3, 'muted'], ['Aktuell abgemeldet', metrics.away, CalendarOffIcon, 'gold'],
      ['Aktive Sanktionen', metrics.sanctions, ShieldAlert, 'red'], ['Familienkasse', money(metrics.treasury), Wallet, 'gold'],
      ['Offene Kredite', money(metrics.loans), TrendingDown, 'muted'], ['Lagerbestand', metrics.stock, Package, metrics.low ? 'red' : 'green'],
    ];
    return <>
      <div className="metric-grid">{metricsList.map(([label, value, Icon, tone]) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><Icon className={`metric-icon ${tone}`} size={17} /></div><strong>{value}</strong>{label === 'Lagerbestand' && metrics.low > 0 && <small>{metrics.low} unter Mindestbestand</small>}</article>)}</div>
      <div className="dashboard-grid">
        <section className="panel activity-panel"><PanelHeading icon={TrendingUp} title="Aktivitäten" detail="Zuletzt im Familienarchiv" />{recent.length ? <div className="activity-list">{recent.map((item) => <div className="activity-item" key={item.id}><span className="activity-dot" /><div><strong>{item.label}</strong><small>{new Date(item.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></div>)}</div> : <EmptyCompact text="Noch keine Aktivitäten gespeichert." />}</section>
        <section className="panel events-panel"><PanelHeading icon={CalendarClock} title="Nächste Termine" action="Alle Termine" onAction={() => changePage('events')} />{nextEvents.length ? nextEvents.map((item) => <div className="event-row" key={item.id}><div className="event-date"><strong>{new Date(`${item.date}T12:00:00`).getDate()}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('de-DE', { month: 'short' })}</span></div><div><strong>{item.title}</strong><small>{item.time || 'Uhrzeit offen'}{item.place ? ` · ${item.place}` : ''}</small></div></div>) : <EmptyCompact text="Keine kommenden Termine." />}</section>
        <section className="panel members-panel"><PanelHeading icon={UsersRound} title="Mitglieder im Blick" action="Mitgliederliste" onAction={() => changePage('members')} />{inactive.length ? inactive.map((member) => <button className="member-mini" key={member.id} onClick={() => setModal({ mode: 'detail', config: configFor(memberConfig), record: member })}><span className="avatar-small">{member.firstName?.[0]}{member.lastName?.[0]}</span><span><strong>{member.firstName} {member.lastName}</strong><small>{member.rank || 'Ohne Rang'}</small></span><span className="tag inaktiv">Inaktiv</span></button>) : <EmptyCompact text="Keine inaktiven Mitglieder." />}</section>
        <section className="panel treasury-panel"><PanelHeading icon={Wallet} title="Kassenübersicht" action="Buchungen" onAction={() => changePage('treasury')} /><div className="balance-line"><span>Schwarzgeld</span><strong>{money(financials.black, data.settings.currency)}</strong></div><div className="balance-line"><span>Grüngeld</span><strong>{money(financials.green, data.settings.currency)}</strong></div><div className="balance-total"><span>Gesamtbestand</span><strong>{money(metrics.treasury, data.settings.currency)}</strong></div><BalanceBars transactions={data.transactions} /></section>
        <section className="panel news-panel"><PanelHeading icon={Bell} title="Neuigkeiten" action="Alle Meldungen" onAction={() => changePage('news')} />{latestNews.length ? latestNews.map((item) => <button className="news-item" key={item.id} onClick={() => changePage('news')}><span className="news-category">{item.category || 'Allgemein'}</span><strong>{item.title}</strong><small>{dateLabel(item.date)} · {item.author || 'Leitung'}</small></button>) : <EmptyCompact text="Noch keine Ankündigungen veröffentlicht." />}</section>
      </div>
    </>;
  };

  const renderMemberDirectory = (type) => {
    const records = [...members];
    if (type === 'phonebook') records.sort((a, b) => (data.settings.ranks.indexOf(a.rank) - data.settings.ranks.indexOf(b.rank)) || a.lastName.localeCompare(b.lastName));
    const config = type === 'phonebook'
      ? { title: 'Telefonbuch', collection: 'members', label: (record) => `${record.firstName} ${record.lastName}`, searchKeys: ['firstName', 'lastName', 'phone', 'rank'], columns: [['name', 'Mitglied'], ['rank', 'Rang'], ['phone', 'Telefon'], ['status', 'Status']], fields: memberConfig.fields }
      : configFor(memberConfig);
    return <section className="panel table-panel">{renderTable(config, records, { filters: ['rank', 'status'] })}</section>;
  };

  const renderMemberFiles = () => <div className="file-layout"><section className="panel table-panel">{renderTable(configFor(memberConfig), members, { filters: ['rank', 'status'] })}</section><aside className="panel file-aside"><PanelHeading icon={FolderLock} title="Mitgliederakte" detail="Vorgänge aus allen Bereichen" />{members.length ? members.slice(0, 7).map((member) => <button className="file-link" key={member.id} onClick={() => setModal({ mode: 'detail', config: configFor(memberConfig), record: member })}><span className="avatar-small">{member.firstName?.[0]}{member.lastName?.[0]}</span><span><strong>{member.firstName} {member.lastName}</strong><small>{member.rank}</small></span><ChevronRight size={15} /></button>) : <EmptyCompact text="Lege zuerst Mitglieder an." />}</aside></div>;

  const renderMyFile = () => {
    const member = members.find((item) => item.id === selectedMember) || members[0];
    return <><div className="myfile-controls"><label className="select-label">Mitglied auswählen<select value={member?.id || ''} onChange={(event) => setSelectedMember(event.target.value)}><option value="">Mitglied wählen</option>{members.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></label></div>{member ? <MemberFile member={member} data={data} onEdit={() => openForm(configFor(memberConfig), member)} /> : <section className="panel empty-panel"><EmptyCompact text="Für die persönliche Akte müssen zuerst Mitglieder angelegt werden." /></section>}</>;
  };

  const renderModule = (module) => {
    const config = configFor(module);
    const values = data[module.collection] || [];
    const cards = module.collection === 'transactions' ? [
      ['Gesamtvermögen', money(metrics.treasury, data.settings.currency), Wallet], ['Schwarzgeld', money(financials.black, data.settings.currency), TrendingDown], ['Grüngeld', money(financials.green, data.settings.currency), TrendingUp],
    ] : module.collection === 'loans' ? [
      ['Offen', money(metrics.loans, data.settings.currency), Wallet], ['Kredite gesamt', values.length, FileText], ['Überfällig', values.filter((item) => item.status === 'Überfällig').length, Clock3],
    ] : module.collection === 'inventory' ? [
      ['Gesamtbestand', metrics.stock, Package], ['Artikel', values.length, Warehouse], ['Unter Mindestbestand', metrics.low, ShieldAlert],
    ] : module.collection === 'sanctions' ? [
      ['Aktiv', values.filter((item) => item.status === 'Aktiv').length, ShieldAlert], ['Abgeschlossen', values.filter((item) => item.status === 'Abgeschlossen').length, Check], ['Historie', values.length, FileText],
    ] : module.collection === 'dues' ? [
      ['Erledigt', values.filter((item) => item.status === 'Erledigt').length, Check], ['Offen', values.filter((item) => item.status === 'Offen').length, Clock3], ['Befreit', values.filter((item) => item.status === 'Befreit').length, ShieldAlert],
    ] : null;
    const extra = module.collection === 'treasury' ? <BalanceBars transactions={data.transactions} /> : null;
    return <>{cards && <div className="mini-metrics">{cards.map(([label, value, Icon]) => <div className="mini-metric" key={label}><Icon size={16} /><span>{label}</span><strong>{value}</strong></div>)}</div>}{extra}<section className="panel table-panel">{renderTable(config, values, { filters: module.filters })}</section></>;
  };

  const renderSettings = () => <div className="settings-grid">
    <section className="panel settings-panel">
      <PanelHeading icon={Settings2} title="Familienprofil" detail="Gemeinsam für alle angemeldeten Nutzer" />
      <label className="field-label">Familienname<input value={data.settings.familyName} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, familyName: event.target.value } }))} /></label>
      <div className="field-pair"><label className="field-label">Währung<input value={data.settings.currency} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, currency: event.target.value } }))} /></label><label className="field-label">Abgabe Geldbetrag<input type="number" value={data.settings.weeklyCash} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, weeklyCash: Number(event.target.value) } }))} /></label></div>
      <div className="field-pair"><label className="field-label">Abgabe Warenmenge<input type="number" value={data.settings.weeklyItem} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, weeklyItem: Number(event.target.value) } }))} /></label><label className="field-label">Warenname<input value={data.settings.weeklyItemName} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, weeklyItemName: event.target.value } }))} /></label></div>
      <label className="field-label">Rangliste <small>Kommagetrennt</small><input value={data.settings.ranks.join(', ')} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, ranks: event.target.value.split(',').map((rank) => rank.trim()).filter(Boolean) } }))} /></label>
      <p className="form-hint">Änderungen werden automatisch mit der gemeinsamen Datenbank synchronisiert.</p>
    </section>
    <section className="panel settings-panel">
      <PanelHeading icon={ArrowDownToLine} title="Datensicherung" detail="Versioniertes JSON-Backup" />
      <p className="settings-copy">Exportiere den gemeinsamen Familienbestand regelmäßig. Ein Import ersetzt die aktuellen Daten für alle angemeldeten Nutzer; vorher wird ein Backup heruntergeladen.</p>
      <div className="backup-actions"><button className="button button-primary" onClick={() => saveDownload(`imperio-backup-${today()}.json`, exportData(data))}><ArrowDownToLine size={16} /> JSON exportieren</button><button className="button button-secondary" onClick={() => importRef.current?.click()}><ArrowUpFromLine size={16} /> JSON importieren</button><input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={handleImport} /></div>
      <div className="storage-note"><LockKeyhole size={17} /><span>Supabase · Echtzeitaktualisierung · Formatversion {DATA_VERSION}</span></div>
      <button className="button button-danger" onClick={() => { if (confirm('Den gemeinsamen Imperio-Datenbestand unwiderruflich zurücksetzen? Erstelle vorher ein Backup.')) { setData(structuredClone(initialData)); notify('Der gemeinsame Datenbestand wird zurückgesetzt.'); } }}><Trash2 size={16} /> Gemeinsame Daten zurücksetzen</button>
    </section>
  </div>;

  const renderPermissions = () => {
    const roles = ['Boss', 'Underboss', 'Consigliere', 'Capo', 'Member'];
    const pages = navigation.flatMap((group) => group.items).filter(([id]) => id !== 'permissions');
    const actions = [['view', 'Anzeigen'], ['create', 'Erstellen'], ['edit', 'Bearbeiten'], ['delete', 'Löschen']];
    const toggleAccess = (role, id, action) => setData((current) => ({ ...current, permissions: { ...current.permissions, [role]: { ...current.permissions[role], [id]: { ...current.permissions[role]?.[id], [action]: !canAccessFor(role, id, action) } } } }));
    const canAccessFor = (role, id, action) => data.permissions[role]?.[id]?.[action] ?? defaultAccess(role, id, action);
    return <><div className="security-note"><ShieldAlert size={18} /><p><strong>Nur Oberflächensteuerung</strong><br />Ohne Backend sind Rollen und Rechte nicht sicherheitswirksam. Sie steuern ausschließlich diese Browseroberfläche und können technisch umgangen werden.</p></div><section className="panel table-panel permission-table"><div className="table-wrap"><table><thead><tr><th rowSpan="2">Modul</th>{roles.map((role) => <th className="role-group" colSpan="4" key={role}>{role}</th>)}</tr><tr>{roles.flatMap((role) => actions.map(([action, label]) => <th className="permission-action" key={`${role}-${action}`}>{label}</th>))}</tr></thead><tbody>{pages.map(([id, title]) => <tr key={id}><td className="primary-cell">{title}</td>{roles.flatMap((role) => actions.map(([action]) => <td key={`${role}-${action}`}><label className="permission-check"><input type="checkbox" checked={canAccessFor(role, id, action)} onChange={() => toggleAccess(role, id, action)} aria-label={`${role}: ${title} ${action}`} /><span><Check size={12} /></span></label></td>))}</tr>)}</tbody></table></div></section></>;
  };

  if (!dataReady) return <main className="access-screen"><section className="access-panel access-message"><div className="access-crest"><LockKeyhole size={23} /></div><div className="access-eyebrow">Corleone City</div><h1>IMPERIO</h1><p className="access-subtitle">{cloudError || 'Gemeinsame Daten werden geladen …'}</p>{cloudError && <button className="button button-secondary" onClick={() => location.reload()}>Erneut versuchen</button>}</section></main>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-crest"><span>♛</span></div><div><strong>IMPERIO</strong><small>Corleone City</small></div><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Menü schließen"><X size={18} /></button></div>
      <div className="sidebar-label">FAMILIENVERWALTUNG</div>
      <nav className="side-nav">{navigation.map((group) => { const items = group.items.filter(([id]) => canAccess(id, 'view')); return items.length ? <div className="nav-group" key={group.title}><div className="nav-heading"><group.icon size={14} /><span>{group.title}</span></div>{items.map(([id, label]) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => changePage(id)}><span className="nav-indicator" />{label}{id === 'news' && data.news.length > 0 && <span className="nav-count">{data.news.length}</span>}</button>)}</div> : null; })}</nav>
      <div className="sidebar-bottom"><div className="secure-badge"><span className="secure-dot" /><div><strong>Gemeinsamer Bestand</strong><small>Änderungen erscheinen live</small></div><CircleHelp size={15} title="Gemeinsame Supabase-Datenbank" /></div><div className="user-chip"><div className="user-monogram">C</div><div><strong>{session.user.email}</strong><small>{data.settings.familyName}</small></div><button className="icon-button" title="Einstellungen" onClick={() => changePage('settings')}><Settings2 size={16} /></button><button className="icon-button" title="Abmelden" onClick={onSignOut}><LogOut size={15} /></button></div></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Menü schließen" />}
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="menu-trigger icon-button" onClick={() => setMobileOpen(true)} aria-label="Menü öffnen"><Menu size={19} /></button><span>IMPERIO</span><span className="breadcrumb-slash">/</span><strong>{currentLabel}</strong></div><div className="topbar-right"><label className="role-picker">Ansicht<select value={activeRole} onChange={(event) => { setActiveRole(event.target.value); localStorage.setItem('imperio-view-role', event.target.value); }}>{['Boss', 'Underboss', 'Consigliere', 'Capo', 'Member'].map((role) => <option key={role}>{role}</option>)}</select></label><span className={`local-indicator cloud-status ${saveState}`}><span className="secure-dot" />{saveState === 'saving' ? 'Speichert …' : saveState === 'error' ? 'Speicherfehler' : 'Gemeinsam gespeichert'}</span><button className="topbar-date" onClick={() => changePage('events')}><CalendarDays size={15} />{new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</button><button className="icon-button topbar-signout" onClick={onSignOut} title="Abmelden" aria-label="Abmelden"><LogOut size={16} /></button></div></header>
      <div className="page-content"><div className="page-heading"><div><div className="page-overline">{navigation.find((group) => group.items.some(([id]) => id === page))?.title || 'IMPERIO'}</div><h1>{pageInfo.title}</h1><p>{pageInfo.subtitle}</p></div>{moduleConfig[page] && canAccess(page, 'create') && <button className="button button-primary" onClick={() => openForm(configFor(moduleConfig[page]))}><Plus size={16} /> Neuer Eintrag</button>}{['members', 'phonebook', 'files'].includes(page) && canAccess('members', 'create') && <button className="button button-primary" onClick={() => openForm(configFor(memberConfig))}><Plus size={16} /> Mitglied hinzufügen</button>}</div>
        {cloudError && <div className="cloud-error" role="alert">{cloudError}</div>}
        {!canAccess(page, 'view') ? <section className="panel empty-panel"><EmptyCompact text={`Die Rolle ${activeRole} hat keinen Ansichts-Zugriff auf diesen Bereich. Rechte können in der Berechtigungsmatrix angepasst werden.`} /></section> : <>
        {page === 'dashboard' && renderDashboard()}
        {page === 'members' && renderMemberDirectory('members')}
        {page === 'phonebook' && renderMemberDirectory('phonebook')}
        {page === 'files' && renderMemberFiles()}
        {page === 'myfile' && renderMyFile()}
        {moduleConfig[page] && renderModule(moduleConfig[page])}
        {page === 'settings' && renderSettings()}
        {page === 'permissions' && renderPermissions()}
        </>}
      </div>
      <footer className="app-footer"><span>IMPERIO <i>·</i> Corleone City</span><span>Manuelle Einträge <i>·</i> Keine Discord-Anbindung</span></footer>
    </main>
    {modal && <Modal modal={modal} setModal={setModal} saveRecord={storeRecord} data={data} notify={notify} />}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}

function CalendarOffIcon(props) { return <CalendarClock {...props} />; }

function PanelHeading({ icon: Icon, title, detail, action, onAction }) {
  return <div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><Icon size={16} /></span><div><h2>{title}</h2>{detail && <small>{detail}</small>}</div></div>{action && <button className="text-action" onClick={onAction}>{action}<ChevronRight size={14} /></button>}</div>;
}

function EmptyCompact({ text }) { return <div className="empty-compact"><span className="empty-mark">—</span><span>{text}</span></div>; }

function BalanceBars({ transactions }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const total = transactions.filter((item) => item.date === key).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { key, label: day.toLocaleDateString('de-DE', { weekday: 'short' }), total };
  });
  const max = Math.max(...days.map((day) => day.total), 1);
  return <div className="balance-chart" aria-label="Transaktionen der vergangenen sieben Tage">{days.map((day) => <div className="bar-column" key={day.key} title={`${day.label}: ${money(day.total)}`}><span className="bar-track"><i style={{ height: `${Math.max(4, day.total / max * 100)}%` }} /></span><small>{day.label.slice(0, 2)}</small></div>)}</div>;
}

function MemberFile({ member, data, onEdit }) {
  const linked = [
    ['Abwesenheiten', data.absences.filter((item) => item.memberId === member.id)],
    ['Sanktionen', data.sanctions.filter((item) => item.memberId === member.id)],
    ['Anwesenheit', data.attendance.filter((item) => item.memberId === member.id)],
  ];
  const totalAttendance = linked[2][1].length;
  const present = linked[2][1].filter((item) => item.status === 'Anwesend').length;
  return <section className="panel member-file"><div className="file-hero"><div className="avatar-large">{member.firstName?.[0]}{member.lastName?.[0]}</div><div className="file-identity"><span className="page-overline">PERSÖNLICHE AKTE</span><h2>{member.firstName} {member.lastName}</h2><p>{member.rank || 'Ohne Rang'} <i>·</i> Seit {dateLabel(member.joined)}</p></div><button className="button button-secondary" onClick={onEdit}><Pencil size={15} /> Bearbeiten</button></div><div className="file-facts"><Fact label="Telefon" value={member.phone || 'Nicht hinterlegt'} /><Fact label="Status" value={member.status || '—'} /><Fact label="Spielerkennung" value={member.playerId || 'Nicht hinterlegt'} /><Fact label="Anwesenheitsquote" value={totalAttendance ? `${Math.round(present / totalAttendance * 100)}%` : 'Noch keine Einträge'} /></div><div className="linked-records">{linked.map(([title, records]) => <section className="linked-section" key={title}><div className="linked-heading"><h3>{title}</h3><span>{records.length}</span></div>{records.length ? records.slice(0, 5).map((record) => <div className="linked-row" key={record.id}><span>{record.reason || record.occasion || record.type || record.status}</span><small>{dateLabel(record.start || record.date)}</small></div>) : <small className="muted-copy">Keine Einträge vorhanden.</small>}</section>)}</div><div className="personal-notes"><h3>Notizen</h3><p>{member.notes || 'Keine persönlichen Notizen hinterlegt.'}</p></div></section>;
}

function Fact({ label, value }) { return <div className="file-fact"><span>{label}</span><strong>{value}</strong></div>; }

function Modal({ modal, setModal, saveRecord, data, notify }) {
  const { config, record, mode } = modal;
  const detail = mode === 'detail';
  const [values, setValues] = useState(modal.values || {});
  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const close = () => setModal(null);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><span className="page-overline">{detail ? 'DETAILANSICHT' : mode === 'edit' ? 'EINTRAG BEARBEITEN' : 'NEUER EINTRAG'}</span><h2 id="modal-title">{detail ? config.label(record, data) : config.title}</h2></div><button className="icon-button" onClick={close} aria-label="Schließen"><X size={18} /></button></header>
    {detail ? <div className="detail-grid">{config.fields.map((field) => <div className="detail-field" key={field.key}><span>{field.label}</span><strong>{field.key === 'memberId' ? data.members.find((member) => member.id === record[field.key])?.firstName || 'Unbekanntes Mitglied' : record[field.key] || '—'}</strong></div>)}</div> : <form onSubmit={(event) => { event.preventDefault(); saveRecord(event, values); }}><div className="form-grid">{config.fields.map((field) => {
      const options = fieldOptions(field, data);
      return <label className={`field-label ${field.type === 'textarea' ? 'field-wide' : ''}`} key={field.key}>{field.label}{field.type === 'textarea' ? <textarea value={values[field.key] || ''} required={field.required} rows={3} onChange={(event) => setValue(field.key, event.target.value)} /> : field.type === 'select' ? <select value={values[field.key] || ''} required={field.required} onChange={(event) => setValue(field.key, event.target.value)}><option value="">Auswählen</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type={field.type || 'text'} value={values[field.key] || ''} required={field.required} min={field.type === 'number' ? 0 : undefined} onChange={(event) => setValue(field.key, event.target.value)} />}</label>;
    })}</div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Abbrechen</button><button type="submit" className="button button-primary"><Check size={16} /> Speichern</button></div></form>}
  </section></div>;
}