import { supabase } from "./supabaseClient";

export async function fetchItems(userId) {
  const { data, error } = await supabase.from("items").select("data").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.data);
}

export async function fetchSagas(userId) {
  const { data, error } = await supabase.from("sagas").select("data").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.data);
}

export async function upsertItem(userId, item) {
  const { error } = await supabase
    .from("items")
    .upsert({ id: item.id, user_id: userId, data: item, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function upsertItems(userId, items) {
  if (!items.length) return;
  const rows = items.map((item) => ({
    id: item.id, user_id: userId, data: item, updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("items").upsert(rows);
  if (error) throw error;
}

export async function deleteItemRemote(id) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertSaga(userId, saga) {
  const { error } = await supabase
    .from("sagas")
    .upsert({ id: saga.id, user_id: userId, data: saga, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteSagaRemote(id) {
  const { error } = await supabase.from("sagas").delete().eq("id", id);
  if (error) throw error;
}
