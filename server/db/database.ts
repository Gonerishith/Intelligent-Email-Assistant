import { getSupabaseClient } from './supabaseClient';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbConnectedAccount {
  id: string;
  user_id: string;
  provider: string;
  email: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbAiActivity {
  id: string;
  user_id: string;
  email_id?: string;
  action_type:
    | 'summary'
    | 'reply_generation'
    | 'priority_detection'
    | 'action_item_extraction'
    | 'date_extraction'
    | 'categorization'
    | 'email_received'
    | 'email_sent';
  title: string;
  description: string;
  generated_content?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DbEmailCategory {
  id: string;
  user_id: string;
  email_id: string;
  category: string;
  confidence?: number;
  reason?: string;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface DbUserPreferences {
  id: string;
  user_id: string;
  preferred_reply_tone: 'professional' | 'concise' | 'casual' | 'persuasive';
  summary_format: 'bullet_points' | 'executive_summary' | 'one_liner';
  auto_detect_action_items: boolean;
  notifications_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Fallback in-memory / local persistent state if Supabase table is bootstrapping or offline
class MemoryDb {
  users = new Map<string, DbUser>();
  connectedAccounts = new Map<string, DbConnectedAccount>(); // key: `${userId}_${provider}`
  aiActivities: DbAiActivity[] = [];
  userPreferences = new Map<string, DbUserPreferences>(); // key: userId
  emailCategories = new Map<string, DbEmailCategory>(); // key: `${userId}_${emailId}`
}

const memoryDb = new MemoryDb();

export class DatabaseService {
  // -------------------------------------------------------------
  // 1. Users Table
  // -------------------------------------------------------------
  static async upsertUser(user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  }): Promise<DbUser> {
    const now = new Date().toISOString();
    const dbRecord: DbUser = {
      id: user.id,
      email: user.email.toLowerCase().trim(),
      name: user.name || user.email.split('@')[0],
      avatar_url: user.avatarUrl,
      role: user.role || 'User',
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert(
            {
              ...dbRecord,
              created_at: now,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();

        if (!error && data) {
          memoryDb.users.set(dbRecord.id, data as DbUser);
          return data as DbUser;
        } else if (error) {
          console.warn('[Supabase users upsert warning]:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase users fallback]:', err.message);
      }
    }

    // Fallback store
    const existing = memoryDb.users.get(dbRecord.id);
    const saved: DbUser = {
      ...existing,
      ...dbRecord,
      created_at: existing?.created_at || now,
    };
    memoryDb.users.set(dbRecord.id, saved);
    return saved;
  }

  static async getUserById(id: string): Promise<DbUser | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return data as DbUser;
        }
      } catch (err: any) {
        console.warn('[Supabase getUserById fallback]:', err.message);
      }
    }

    return memoryDb.users.get(id) || null;
  }

  static async getUserByEmail(email: string): Promise<DbUser | null> {
    const normalized = email.toLowerCase().trim();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalized)
          .single();

        if (!error && data) {
          return data as DbUser;
        }
      } catch (err: any) {
        console.warn('[Supabase getUserByEmail fallback]:', err.message);
      }
    }

    for (const u of memoryDb.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  }

  // -------------------------------------------------------------
  // 2. Connected Accounts Table (Server-side storage of Gmail tokens)
  // -------------------------------------------------------------
  static async upsertConnectedAccount(account: {
    userId: string;
    provider: string;
    email: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    scope?: string;
    tokenExpiresAt?: string | Date;
  }): Promise<DbConnectedAccount> {
    const now = new Date().toISOString();
    const id = `ca_${account.userId}_${account.provider}`;
    const expiresAtStr = account.tokenExpiresAt
      ? typeof account.tokenExpiresAt === 'string'
        ? account.tokenExpiresAt
        : account.tokenExpiresAt.toISOString()
      : undefined;

    const dbRecord: DbConnectedAccount = {
      id,
      user_id: account.userId,
      provider: account.provider,
      email: account.email.toLowerCase().trim(),
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      token_type: account.tokenType || 'Bearer',
      scope: account.scope,
      token_expires_at: expiresAtStr,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('connected_accounts')
          .upsert(
            {
              ...dbRecord,
              created_at: now,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();

        if (!error && data) {
          memoryDb.connectedAccounts.set(`${account.userId}_${account.provider}`, data as DbConnectedAccount);
          return data as DbConnectedAccount;
        } else if (error) {
          console.warn('[Supabase connected_accounts upsert warning]:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase connected_accounts fallback]:', err.message);
      }
    }

    const key = `${account.userId}_${account.provider}`;
    const existing = memoryDb.connectedAccounts.get(key);
    const saved: DbConnectedAccount = {
      ...existing,
      ...dbRecord,
      created_at: existing?.created_at || now,
    };
    memoryDb.connectedAccounts.set(key, saved);
    return saved;
  }

  static async getConnectedAccount(userId: string, provider = 'google'): Promise<DbConnectedAccount | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', provider)
          .single();

        if (!error && data) {
          return data as DbConnectedAccount;
        }
      } catch (err: any) {
        console.warn('[Supabase getConnectedAccount fallback]:', err.message);
      }
    }

    return memoryDb.connectedAccounts.get(`${userId}_${provider}`) || null;
  }

  static async deleteConnectedAccount(userId: string, provider = 'google'): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('connected_accounts')
          .delete()
          .eq('user_id', userId)
          .eq('provider', provider);
      } catch (err: any) {
        console.warn('[Supabase deleteConnectedAccount fallback]:', err.message);
      }
    }

    memoryDb.connectedAccounts.delete(`${userId}_${provider}`);
    return true;
  }

  // -------------------------------------------------------------
  // 3. AI Activity Table
  // -------------------------------------------------------------
  static async logAiActivity(activity: {
    id?: string;
    userId: string;
    emailId?: string;
    actionType: DbAiActivity['action_type'];
    title: string;
    description: string;
    generatedContent?: string;
    metadata?: Record<string, any>;
  }): Promise<DbAiActivity> {
    const now = new Date().toISOString();
    const id = activity.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const dbRecord: DbAiActivity = {
      id,
      user_id: activity.userId,
      email_id: activity.emailId,
      action_type: activity.actionType,
      title: activity.title,
      description: activity.description,
      generated_content: activity.generatedContent,
      metadata: activity.metadata || {},
      created_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ai_activity')
          .insert(dbRecord)
          .select()
          .single();

        if (!error && data) {
          memoryDb.aiActivities.unshift(data as DbAiActivity);
          return data as DbAiActivity;
        } else if (error) {
          console.warn('[Supabase ai_activity insert warning]:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase ai_activity fallback]:', err.message);
      }
    }

    memoryDb.aiActivities.unshift(dbRecord);
    // Keep max 50 in memory
    if (memoryDb.aiActivities.length > 100) {
      memoryDb.aiActivities.pop();
    }
    return dbRecord;
  }

  static async getAiActivities(userId: string, options?: { limit?: number; actionType?: string }): Promise<DbAiActivity[]> {
    const limit = options?.limit || 50;
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        let query = supabase
          .from('ai_activity')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (options?.actionType && options.actionType !== 'all') {
          query = query.eq('action_type', options.actionType);
        }

        const { data, error } = await query;

        if (!error && data) {
          return data as DbAiActivity[];
        }
      } catch (err: any) {
        console.warn('[Supabase getAiActivities fallback]:', err.message);
      }
    }

    // Filter memory fallback by userId
    let list = memoryDb.aiActivities.filter((a) => a.user_id === userId);
    if (options?.actionType && options.actionType !== 'all') {
      list = list.filter((a) => a.action_type === options.actionType);
    }
    return list.slice(0, limit);
  }

  // -------------------------------------------------------------
  // 4. User Preferences Table
  // -------------------------------------------------------------
  static async getUserPreferences(userId: string): Promise<DbUserPreferences> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          return data as DbUserPreferences;
        }
      } catch (err: any) {
        console.warn('[Supabase getUserPreferences fallback]:', err.message);
      }
    }

    const cached = memoryDb.userPreferences.get(userId);
    if (cached) {
      return cached;
    }

    // Default preferences
    const defaultPrefs: DbUserPreferences = {
      id: `pref_${userId}`,
      user_id: userId,
      preferred_reply_tone: 'professional',
      summary_format: 'bullet_points',
      auto_detect_action_items: true,
      notifications_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryDb.userPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  static async upsertUserPreferences(
    userId: string,
    prefs: Partial<{
      preferred_reply_tone: 'professional' | 'concise' | 'casual' | 'persuasive';
      summary_format: 'bullet_points' | 'executive_summary' | 'one_liner';
      auto_detect_action_items: boolean;
      notifications_enabled: boolean;
    }>
  ): Promise<DbUserPreferences> {
    const existing = await this.getUserPreferences(userId);
    const now = new Date().toISOString();

    const updated: DbUserPreferences = {
      ...existing,
      ...prefs,
      user_id: userId,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              ...updated,
              id: existing.id || `pref_${userId}`,
              created_at: existing.created_at || now,
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single();

        if (!error && data) {
          memoryDb.userPreferences.set(userId, data as DbUserPreferences);
          return data as DbUserPreferences;
        } else if (error) {
          console.warn('[Supabase user_preferences upsert warning]:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase user_preferences fallback]:', err.message);
      }
    }

    memoryDb.userPreferences.set(userId, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // 5. Email Categorization Table (Supabase + In-Memory Fallback)
  // -------------------------------------------------------------
  static async upsertEmailCategory(params: {
    userId: string;
    emailId: string;
    category: string;
    confidence?: number;
    reason?: string;
    labels?: string[];
  }): Promise<DbEmailCategory> {
    const now = new Date().toISOString();
    const key = `${params.userId}_${params.emailId}`;
    const existing = memoryDb.emailCategories.get(key);

    const record: DbEmailCategory = {
      id: existing?.id || `cat_${params.userId}_${params.emailId}`,
      user_id: params.userId,
      email_id: params.emailId,
      category: params.category,
      confidence: params.confidence ?? 0.95,
      reason: params.reason || '',
      labels: params.labels || [params.category],
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_categories')
          .upsert(
            {
              id: record.id,
              user_id: record.user_id,
              email_id: record.email_id,
              category: record.category,
              confidence: record.confidence,
              reason: record.reason,
              labels: record.labels,
              created_at: record.created_at,
              updated_at: record.updated_at,
            },
            { onConflict: 'user_id,email_id' }
          )
          .select()
          .single();

        if (!error && data) {
          memoryDb.emailCategories.set(key, data as DbEmailCategory);
          return data as DbEmailCategory;
        } else if (error) {
          console.warn('[Supabase email_categories upsert fallback]:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase email_categories fallback exception]:', err.message);
      }
    }

    memoryDb.emailCategories.set(key, record);
    return record;
  }

  static async getEmailCategories(userId: string): Promise<DbEmailCategory[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_categories')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          // Sync with local memory cache
          for (const item of data) {
            memoryDb.emailCategories.set(`${userId}_${item.email_id}`, item);
          }
          return data as DbEmailCategory[];
        }
      } catch (err: any) {
        console.warn('[Supabase getEmailCategories fallback]:', err.message);
      }
    }

    const results: DbEmailCategory[] = [];
    for (const [key, item] of memoryDb.emailCategories.entries()) {
      if (key.startsWith(`${userId}_`)) {
        results.push(item);
      }
    }
    return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  static async getEmailCategory(userId: string, emailId: string): Promise<DbEmailCategory | null> {
    const key = `${userId}_${emailId}`;
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_categories')
          .select('*')
          .eq('user_id', userId)
          .eq('email_id', emailId)
          .single();

        if (!error && data) {
          memoryDb.emailCategories.set(key, data as DbEmailCategory);
          return data as DbEmailCategory;
        }
      } catch (err: any) {
        // Suppress single row not found
      }
    }

    return memoryDb.emailCategories.get(key) || null;
  }
}
