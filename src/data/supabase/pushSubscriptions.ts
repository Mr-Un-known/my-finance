import { getSupabase } from './client';

export async function savePushSubscription(sub: globalThis.PushSubscription): Promise<void> {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sin sesión activa.');

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('La suscripción push no trajo los datos esperados.');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: session.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}
