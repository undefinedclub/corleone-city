import { useEffect, useState } from 'react';
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { authEmailFromDiscordId } from './authIdentity.js';
import { supabase } from './supabase.js';

export function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <AccessMessage title="Verbindung wird geprüft" detail="Imperio lädt die gemeinsame Sitzung." />;
  if (!session) return <SignIn />;
  return children({ session, onSignOut: () => supabase.auth.signOut() });
}

export function ConfigurationMessage() {
  return <AccessMessage
    title="Supabase noch nicht verbunden"
    detail="Hinterlege VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local und starte den Entwicklungsserver neu. Für GitHub Pages müssen beide Werte als Actions-Secrets eingerichtet sein."
  />;
}

function SignIn() {
  const [discordId, setDiscordId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const email = authEmailFromDiscordId(discordId);
    if (!email) {
      setError('Gib eine gültige Discord-ID mit 17 bis 20 Ziffern ein.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes('email not confirmed')) {
          setError('Das Supabase-Konto ist noch nicht bestätigt. Bitte lasse es im Supabase-Dashboard unter Authentication > Users bestätigen; an die .invalid-Adresse kann keine E-Mail zugestellt werden.');
        } else if (message.includes('invalid login credentials')) {
          setError(`Discord-ID oder Passwort stimmen nicht mit einem Supabase-Konto überein. Prüfe, ob dessen E-Mail exakt ${email} lautet und ob das Passwort korrekt ist.`);
        } else {
          setError(`Supabase-Anmeldung fehlgeschlagen: ${authError.message}`);
        }
      }
    } catch (requestError) {
      setError(`Der Anmeldedienst ist nicht erreichbar: ${requestError.message}`);
    } finally {
      setBusy(false);
    }
  };

  return <main className="access-screen">
    <section className="access-panel">
      <div className="access-crest"><span>♛</span></div>
      <div className="access-eyebrow">Corleone City</div>
      <h1>IMPERIO</h1>
      <p className="access-subtitle">Gemeinsame Familienverwaltung</p>
      <div className="access-rule" />
      <form onSubmit={submit}>
        <label className="field-label">Discord-ID<input type="text" inputMode="numeric" autoComplete="username" pattern="[0-9]{17,20}" maxLength={20} minLength={17} required value={discordId} onChange={(event) => setDiscordId(event.target.value.replace(/\D/g, ''))} /></label>
        <label className="field-label">Passwort<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="access-error" role="alert">{error}</p>}
        <button className="button button-primary access-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}{busy ? 'Anmeldung läuft' : 'Anmelden'}</button>
      </form>
      <div className="access-footnote"><ShieldCheck size={14} /> Anmeldung mit Discord-ID und Passwort, ohne E-Mail-Eingabe.</div>
    </section>
  </main>;
}

function AccessMessage({ title, detail }) {
  return <main className="access-screen"><section className="access-panel access-message"><div className="access-crest"><KeyRound size={23} /></div><div className="access-eyebrow">Corleone City</div><h1>IMPERIO</h1><p className="access-subtitle">{title}</p><div className="access-rule" /><p>{detail}</p></section></main>;
}
