import { loadData, normalizeData, saveData } from './storage.js';
import { supabase } from './supabase.js';

const TABLE = 'imperio_state';
const ROW_ID = 1;

export async function loadSharedData() {
  const { data: row, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (error) throw error;

  if (row) {
    const shared = normalizeData(row.data);
    saveData(shared);
    return shared;
  }

  const firstData = loadData();
  const { error: insertError } = await supabase
    .from(TABLE)
    .insert({ id: ROW_ID, data: firstData });
  if (insertError) {
    const { data: racedRow, error: retryError } = await supabase
      .from(TABLE)
      .select('data')
      .eq('id', ROW_ID)
      .single();
    if (retryError) throw insertError;
    const shared = normalizeData(racedRow.data);
    saveData(shared);
    return shared;
  }

  saveData(firstData);
  return firstData;
}

export async function saveSharedData(data, userId) {
  const normalized = normalizeData(data);
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: normalized, updated_by: userId }, { onConflict: 'id' });
  if (error) throw error;
  saveData(normalized);
}

export function subscribeToSharedData(onUpdate) {
  const channel = supabase
    .channel('imperio-shared-state')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: TABLE,
      filter: `id=eq.${ROW_ID}`,
    }, (payload) => onUpdate(normalizeData(payload.new.data), payload.new.updated_by))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
