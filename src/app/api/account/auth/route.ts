import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { GetServerSupabase } from '@/lib/db/getUser';

const supabaseAdmin = () => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
};

async function verifyToken(token: string) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
  const supabaseUrl = process.env.SUPABASE_URL!;
  const encoder = new TextEncoder();
  const secret = encoder.encode(jwtSecret);
  const { payload } = await jwtVerify(token, secret, {
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
  });
  return payload;
}

function isInSubscriptionPeriod(subscription: any): boolean {
  const now = new Date();
  const start = subscription.period_starts_at ? new Date(subscription.period_starts_at) : null;
  const end = subscription.period_ends_at ? new Date(subscription.period_ends_at) : null;
  return start !== null && end !== null && now >= start && now <= end;
}

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const payload = await verifyToken(token);
    const userId = payload.sub;
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized: Missing user ID in token' }, { status: 401 });
    }

    // PROFILE CHECK / CREATE
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ message: 'Database error', error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      const { error: insertProfileError } = await supabase.from('profiles').insert({
        id: userId,
        email: payload.email || null,
      });
      if (insertProfileError) {
        return NextResponse.json({ message: 'Failed to create profile', error: insertProfileError.message }, { status: 500 });
      }
    }

    // SUBSCRIPTION CHECK / CREATE
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ message: 'Database error', error: error.message }, { status: 500 });
    }

    if (!subscription) {
      const now = new Date();
      const trialEndsAt = new Date(now);
      trialEndsAt.setDate(now.getDate() + 7);

      const subscriptionData = {
        user_id: userId,
        status: 'active',
        plan: 'Free',
        period_starts_at: now.toISOString(),
        period_ends_at: trialEndsAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        billing_interval: 'monthly',
        current_usage: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { error: insertError } = await supabase.from('subscriptions').insert(subscriptionData);
      if (insertError) {
        return NextResponse.json({ message: 'Failed to create subscription', error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Free subscription created',
        access: 'granted',
        plan: 'Free',
        user: {
          id: userId,
          email: payload.email || null,
          name: payload.name || null,
        },
      });
    }

    // SUBSCRIPTION VALIDATION
    if (subscription.status !== 'active') {
      return NextResponse.json({ message: `Subscription status is '${subscription.status}'. Access denied.` }, { status: 403 });
    }

    if (!isInSubscriptionPeriod(subscription)) {
      return NextResponse.json({ message: 'Subscription period expired or not started' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Request allowed', subscription });
  } catch (err: any) {
    // console.error('Error in API route:', err);
    return NextResponse.json({ message: 'Unauthorized', error: err.message }, { status: 401 });
  }
}
