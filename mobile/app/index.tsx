import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENV_API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const DEFAULT_API = ENV_API || 'http://10.0.2.2:4000/api';

const C = {
  forest: '#214D38',
  forest2: '#2E6549',
  sage: '#DCE9D9',
  lime: '#D8E9A8',
  cream: '#F7F7F0',
  white: '#FFFFFF',
  ink: '#183729',
  muted: '#718277',
  line: '#E5EADF',
  red: '#B4473E',
  pale: '#EEF3EA',
};

type Food = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  variant_count: number;
};

type Variant = {
  variant_id: string;
  variant_name: string;
  packaging_type: string;
  preparation_method: string;
  salt_status: string;
  calories_kcal?: number | null;
  verification_status?: string;
};

type BasketItem = {
  id: string;
  name: string;
  variant_name: string;
  quantity_g: number;
  calories_kcal?: number | null;
};

type User = {
  id: string;
  displayName: string;
  email: string;
};

type Tab = 'home' | 'explore' | 'basket' | 'profile';

async function apiRequest(
  base: string,
  path: string,
  token?: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body.error || body.message || `Request failed (${response.status})`
    );
  }

  return body;
}

function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.buttonSecondary,
        compact && s.buttonCompact,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export default function Home() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [apiDraft, setApiDraft] = useState(DEFAULT_API);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [tab, setTab] = useState<Tab>('home');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');

  const [foods, setFoods] = useState<Food[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [loadingBasket, setLoadingBasket] = useState(false);
  const [apiSettings, setApiSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const call = useCallback(
    (path: string, t?: string, options: RequestInit = {}) =>
      apiRequest(apiBase, path, t, options),
    [apiBase]
  );

  const loadFoods = useCallback(
    async (q = '') => {
      setLoadingFoods(true);
      try {
        const data = await call(
          `/products?q=${encodeURIComponent(q)}&limit=200`,
          token || undefined
        );
        setFoods(data.items || []);
      } finally {
        setLoadingFoods(false);
      }
    },
    [call, token]
  );

  const loadBasket = useCallback(
    async (t: string) => {
      setLoadingBasket(true);
      try {
        const data = await call('/basket', t);
        setBasket(data.items || []);
      } finally {
        setLoadingBasket(false);
      }
    },
    [call]
  );

  useEffect(() => {
    (async () => {
      const savedBase = await AsyncStorage.getItem('nt_api_base');
      const base = (savedBase || DEFAULT_API).replace(/\/+$/, '');

      setApiBase(base);
      setApiDraft(base);

      const savedToken = await AsyncStorage.getItem('nt_token');
      if (!savedToken) return;

      try {
        const me = await apiRequest(base, '/auth/me', savedToken);
        setToken(savedToken);
        setUser(me.user);

        const [foodData, basketData] = await Promise.all([
          apiRequest(base, '/products?limit=200', savedToken),
          apiRequest(base, '/basket', savedToken),
        ]);

        setFoods(foodData.items || []);
        setBasket(basketData.items || []);
      } catch {
        await AsyncStorage.removeItem('nt_token');
      }
    })();
  }, []);

  const totalItems = basket.length;

  const totalCalories = useMemo(
    () =>
      basket.reduce(
        (sum, item) =>
          sum +
          ((item.calories_kcal || 0) * (item.quantity_g || 0)) / 100,
        0
      ),
    [basket]
  );

  const submitAuth = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    if (mode === 'signup' && (!name.trim() || !email.trim())) {
      setError('Please enter your name and email too.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const payload =
        mode === 'signup'
          ? {
              displayName: name.trim(),
              username: username.trim(),
              email: email.trim(),
              password,
            }
          : {
              username: username.trim(),
              password,
            };

      const data = await call(`/auth/${mode}`, undefined, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await AsyncStorage.setItem('nt_token', data.token);

      setToken(data.token);
      setUser(data.user);
      setTab('home');

      const [foodData, basketData] = await Promise.all([
        call('/products?limit=200', data.token),
        call('/basket', data.token),
      ]);

      setFoods(foodData.items || []);
      setBasket(basketData.items || []);
    } catch (e: any) {
      setError(e.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const searchFoods = async () => {
    setError('');
    try {
      await loadFoods(query);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openFood = async (food: Food) => {
    setError('');
    setSelected(food);
    setVariants([]);

    try {
      const data = await call(
        `/products/${food.id}/variants`,
        token || undefined
      );
      setVariants(data.items || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addFood = async (variant: Variant) => {
    if (!token) return;

    setBusy(true);
    setError('');

    try {
      await call('/basket/items', token, {
        method: 'POST',
        body: JSON.stringify({
          variantId: variant.variant_id,
          quantityG: 100,
        }),
      });

      await loadBasket(token);
      setSelected(null);
      setTab('basket');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const refreshAll = async () => {
    if (!token) return;

    setRefreshing(true);

    try {
      await Promise.all([loadFoods(query), loadBasket(token)]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const saveApi = async () => {
    const cleaned = apiDraft.trim().replace(/\/+$/, '');

    if (!/^https?:\/\//i.test(cleaned) || !cleaned.endsWith('/api')) {
      setError(
        'Enter a full API URL ending in /api, e.g. http://192.168.1.5:4000/api'
      );
      return;
    }

    await AsyncStorage.setItem('nt_api_base', cleaned);
    setApiBase(cleaned);
    setApiDraft(cleaned);
    setApiSettings(false);
    setError('');

    Alert.alert(
      'API address saved',
      'Reconnect by signing in again if the app cannot reach your backend.'
    );
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('nt_token');
    setToken(null);
    setUser(null);
    setBasket([]);
    setFoods([]);
    setPassword('');
    setTab('home');
  };

  if (!token || !user) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content"  />

        <KeyboardAvoidingView
          style={s.authWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.authContent}
          >
            <View style={s.logoMark}>
              <Text style={s.logoLeaf}>✳</Text>
            </View>

            <Text style={s.brand}>
              nutri<Text style={s.brandLight}>track</Text>
            </Text>

            <Text style={s.kicker}>YOUR EVERYDAY FOOD COMPANION</Text>

            <Text style={s.authHero}>
              {mode === 'login'
                ? 'Eat well.\nFeel your best.'
                : 'A healthier routine\nstarts here.'}
            </Text>

            <Text style={s.mutedBody}>
              Explore familiar Indian groceries and make more informed food
              choices.
            </Text>

            <View style={s.authCard}>
              {mode === 'signup' && (
                <>
                  <Label>Full name</Label>
                  <TextInput
                    style={s.input}
                    placeholder="Your name"
                    value={name}
                    onChangeText={setName}
                  />
                </>
              )}

              <Label>Username</Label>
              <TextInput
                style={s.input}
                placeholder="Enter username"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              {mode === 'signup' && (
                <>
                  <Label>Email address</Label>
                  <TextInput
                    style={s.input}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </>
              )}

              <Label>Password</Label>
              <TextInput
                style={s.input}
                placeholder="Enter password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {!!error && <Text style={s.error}>{error}</Text>}

              <Button
                title={
                  busy
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'
                }
                onPress={submitAuth}
                disabled={busy}
              />

              <TouchableOpacity
                onPress={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
              >
                <Text style={s.switchText}>
                  {mode === 'login'
                    ? 'New to NutriTrack? Create an account'
                    : 'Already have an account? Sign in'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.apiLink}
              onPress={() => setApiSettings(true)}
            >
              <Text style={s.apiLinkText}>⚙  Connection settings</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <ApiModal
          visible={apiSettings}
          value={apiDraft}
          onChange={setApiDraft}
          onClose={() => setApiSettings(false)}
          onSave={saveApi}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={s.topBar}>
        <View>
          <Text style={s.brandSmall}>
            nutri<Text style={s.brandLight}>track</Text>
          </Text>
          <Text style={s.topGreeting}>
            Good to see you, {user.displayName?.split(' ')[0] || 'there'} 👋
          </Text>
        </View>

        <TouchableOpacity
          style={s.avatar}
          onPress={() => setTab('profile')}
        >
          <Text style={s.avatarText}>
            {(user.displayName || 'N').slice(0, 1).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'home' && (
        <ScrollView
          contentContainerStyle={s.pagePad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAll}
              tintColor={C.forest}
            />
          }
        >
          <View style={s.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>SMALL STEPS, BETTER HABITS</Text>
              <Text style={s.heroTitle}>Make every{'\\n'}bite count.</Text>
              <Text style={s.heroSub}>
                Discover foods that fit your everyday routine.
              </Text>
              <Button
                title="Explore foods  →"
                onPress={() => setTab('explore')}
                compact
              />
            </View>

            <View style={s.heroArt}>
              <Text style={s.heroEmoji}>🥑</Text>
              <Text style={s.heroEmoji2}>🥬</Text>
            </View>
          </View>

          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Your basket snapshot</Text>
            <TouchableOpacity onPress={() => setTab('basket')}>
              <Text style={s.textLink}>View basket →</Text>
            </TouchableOpacity>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statIcon}>🧺</Text>
              <Text style={s.statValue}>{totalItems}</Text>
              <Text style={s.statLabel}>Items added</Text>
            </View>

            <View style={s.statCard}>
              <Text style={s.statIcon}>⚡</Text>
              <Text style={s.statValue}>{Math.round(totalCalories)}</Text>
              <Text style={s.statLabel}>Est. kcal*</Text>
            </View>
          </View>

          <Text style={s.footnote}>
            *Estimated from available nutrition values in your basket.
          </Text>

          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Quick actions</Text>
          </View>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => setTab('explore')}
          >
            <View style={s.actionIcon}><Text>🔎</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Explore Indian groceries</Text>
              <Text style={s.actionSub}>
                Search foods and compare available variants
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => setTab('basket')}
          >
            <View style={s.actionIcon}><Text>🥗</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Review your basket</Text>
              <Text style={s.actionSub}>See the foods you've added</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          {!!error && <Text style={s.error}>{error}</Text>}
        </ScrollView>
      )}

      {tab === 'explore' && (
        <View style={s.flex}>
          <View style={s.pagePad}>
            <Text style={s.pageTitle}>Explore foods</Text>
            <Text style={s.pageSubtitle}>
              Find everyday favourites in the catalogue.
            </Text>

            <View style={s.searchRow}>
              <TextInput
                style={[s.input, s.searchInput]}
                placeholder="Search dal, oats, peanuts…"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={searchFoods}
                returnKeyType="search"
              />
              <Button title="Search" onPress={searchFoods} compact />
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}
          </View>

          {loadingFoods ? (
            <View style={s.center}>
              <ActivityIndicator color={C.forest} size="large" />
              <Text style={s.loadingText}>Loading foods…</Text>
            </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={item => item.id}
              contentContainerStyle={s.listPad}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshAll}
                  tintColor={C.forest}
                />
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.foodCard}
                  activeOpacity={0.8}
                  onPress={() => openFood(item)}
                >
                  <View style={s.foodIcon}>
                    <Text style={{ fontSize: 22 }}>🥣</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.foodName}>{item.name}</Text>
                    <Text style={s.foodMeta}>
                      {item.brand || item.category || 'Grocery'} ·{' '}
                      {item.variant_count} variant
                      {item.variant_count === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <EmptyState
                  title="No foods found"
                  body="Try another search, or check that the catalogue is available."
                />
              }
            />
          )}
        </View>
      )}

      {tab === 'basket' && (
        <View style={s.flex}>
          <View style={s.pagePad}>
            <Text style={s.pageTitle}>My basket</Text>
            <Text style={s.pageSubtitle}>
              Your selected groceries, all in one place.
            </Text>

            <View style={s.basketSummary}>
              <View>
                <Text style={s.summaryNumber}>{totalItems}</Text>
                <Text style={s.summaryLabel}>items in basket</Text>
              </View>

              <View style={s.summaryDivider} />

              <View>
                <Text style={s.summaryNumber}>
                  {Math.round(totalCalories)}
                </Text>
                <Text style={s.summaryLabel}>estimated kcal*</Text>
              </View>
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}
          </View>

          {loadingBasket ? (
            <View style={s.center}>
              <ActivityIndicator color={C.forest} size="large" />
            </View>
          ) : (
            <FlatList
              data={basket}
              keyExtractor={item => item.id}
              contentContainerStyle={s.listPad}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshAll}
                  tintColor={C.forest}
                />
              }
              renderItem={({ item }) => (
                <View style={s.basketItem}>
                  <View style={s.foodIcon}>
                    <Text style={{ fontSize: 22 }}>🛒</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.foodName}>{item.name}</Text>
                    <Text style={s.foodMeta}>{item.variant_name}</Text>
                    <Text style={s.quantity}>{item.quantity_g} g</Text>
                  </View>

                  <View style={s.kcalPill}>
                    <Text style={s.kcalText}>
                      {item.calories_kcal == null
                        ? '—'
                        : `${Math.round(
                            (item.calories_kcal * item.quantity_g) / 100
                          )} kcal`}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  title="Your basket is empty"
                  body="Explore the catalogue and add a food variant to get started."
                  action="Explore foods"
                  onAction={() => setTab('explore')}
                />
              }
            />
          )}
        </View>
      )}

      {tab === 'profile' && (
        <ScrollView contentContainerStyle={s.pagePad}>
          <Text style={s.pageTitle}>Your profile</Text>
          <Text style={s.pageSubtitle}>Account and app preferences.</Text>

          <View style={s.profileCard}>
            <View style={s.profileAvatar}>
              <Text style={s.profileAvatarText}>
                {(user.displayName || 'N').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={s.profileName}>{user.displayName}</Text>
            <Text style={s.profileEmail}>{user.email}</Text>
          </View>

          <Text style={s.sectionTitle}>App settings</Text>

          <TouchableOpacity
            style={s.settingRow}
            onPress={() => {
              setApiDraft(apiBase);
              setApiSettings(true);
            }}
          >
            <View>
              <Text style={s.actionTitle}>Backend connection</Text>
              <Text style={s.actionSub}>
                Change the API address for your phone
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          <View style={s.infoBox}>
            <Text style={s.infoTitle}>About your nutrition data</Text>
            <Text style={s.infoBody}>
              Nutrition information is shown only when available in the
              catalogue. Missing values are not treated as zero.
            </Text>
          </View>

          <Button title="Sign out" secondary onPress={signOut} />
        </ScrollView>
      )}

      <View style={s.bottomNav}>
        {(
          [
            ['home', '⌂', 'Home'],
            ['explore', '⌕', 'Explore'],
            ['basket', '▣', 'Basket'],
            ['profile', '○', 'Profile'],
          ] as [Tab, string, string][]
        ).map(([key, icon, label]) => (
          <TouchableOpacity
            key={key}
            style={s.navItem}
            onPress={() => {
              setTab(key);
              setError('');
              if (key === 'basket' && token) {
                loadBasket(token).catch((e: any) => setError(e.message));
              }
            }}
          >
            <Text style={[s.navIcon, tab === key && s.navActive]}>
              {icon}
            </Text>
            <Text style={[s.navLabel, tab === key && s.navActive]}>
              {label}
              {key === 'basket' && totalItems > 0 ? ` (${totalItems})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalShade}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{selected?.name}</Text>
                <Text style={s.modalSubtitle}>Choose a catalogue variant</Text>
              </View>

              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {variants.length === 0 ? (
              <View style={s.center}>
                <ActivityIndicator color={C.forest} />
                <Text style={s.loadingText}>Loading variants…</Text>
              </View>
            ) : (
              <ScrollView>
                {variants.map(v => (
                  <View style={s.variantCard} key={v.variant_id}>
                    <Text style={s.variantName}>{v.variant_name}</Text>
                    <Text style={s.foodMeta}>
                      {[v.packaging_type, v.preparation_method, v.salt_status]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>

                    <View style={s.variantBottom}>
                      <Text style={s.variantKcal}>
                        {v.calories_kcal == null
                          ? 'Nutrition unavailable'
                          : `${v.calories_kcal} kcal / 100 g`}
                      </Text>
                      <Button
                        title="Add 100 g"
                        onPress={() => addFood(v)}
                        compact
                        disabled={busy}
                      />
                    </View>

                    {v.verification_status ? (
                      <Text style={s.verification}>
                        {v.verification_status}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}
          </View>
        </View>
      </Modal>

      <ApiModal
        visible={apiSettings}
        value={apiDraft}
        onChange={setApiDraft}
        onClose={() => setApiSettings(false)}
        onSave={saveApi}
      />
    </SafeAreaView>
  );
}

function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>🌱</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {action && onAction ? (
        <Button title={action} onPress={onAction} compact />
      ) : null}
    </View>
  );
}

function ApiModal({
  visible,
  value,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.dialogShade}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>Backend connection</Text>
          <Text style={s.dialogBody}>
            For a real phone, use your laptop's Wi-Fi IPv4 address instead of
            localhost or 10.0.2.2.
          </Text>

          <TextInput
            style={s.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={value}
            onChangeText={onChange}
            placeholder="http://192.168.1.5:4000/api"
          />

          <Text style={s.dialogHint}>
            Example: http://192.168.1.5:4000/api
          </Text>

          <View style={s.dialogActions}>
            <Button title="Cancel" secondary onPress={onClose} compact />
            <Button title="Save address" onPress={onSave} compact />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },

  authWrap: { flex: 1 },
  authContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 38,
    justifyContent: 'center',
  },

  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLeaf: { fontSize: 26, color: C.forest },

  brand: {
    color: C.forest,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  brandLight: { color: '#86A18A', fontWeight: '500' },
  brandSmall: {
    color: C.forest,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1,
  },

  kicker: {
    color: '#8A9C73',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '800',
    marginTop: 5,
  },
  authHero: {
    color: C.ink,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 34,
  },
  mutedBody: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 24,
    maxWidth: 310,
  },

  authCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  label: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 11,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#FBFCF9',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.ink,
    fontSize: 14,
    marginTop: 7,
  },

  button: {
    backgroundColor: C.forest,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonSecondary: { backgroundColor: C.sage },
  buttonCompact: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginTop: 0,
  },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 14 },
  buttonTextSecondary: { color: C.forest },
  switchText: {
    color: C.forest2,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 18,
  },
  apiLink: { alignSelf: 'center', padding: 14, marginTop: 6 },
  apiLinkText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  error: { color: C.red, fontSize: 12, lineHeight: 18, marginTop: 10 },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topGreeting: { color: C.muted, fontSize: 12, marginTop: 3 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.forest, fontWeight: '900', fontSize: 17 },

  pagePad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  heroCard: {
    backgroundColor: C.forest,
    borderRadius: 24,
    padding: 20,
    minHeight: 215,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: C.lime,
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '900',
  },
  heroTitle: {
    color: C.white,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -0.7,
  },
  heroSub: {
    color: '#D4E1D4',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 190,
    marginTop: 8,
    marginBottom: 15,
  },
  heroArt: {
    width: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 67, transform: [{ rotate: '-12deg' }] },
  heroEmoji2: { fontSize: 34, marginTop: -10, marginLeft: 32 },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 12,
  },
  sectionTitle: { color: C.ink, fontSize: 17, fontWeight: '900' },
  textLink: { color: C.forest2, fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 15,
  },
  statIcon: { fontSize: 20 },
  statValue: {
    color: C.forest,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 7,
  },
  statLabel: { color: C.muted, fontSize: 11, marginTop: 1 },
  footnote: { color: '#8B998D', fontSize: 10, marginTop: 8 },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 13,
    borderRadius: 17,
    marginBottom: 9,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  actionSub: { color: C.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: '#9AAC9D', fontSize: 25, marginLeft: 8 },

  pageTitle: {
    color: C.ink,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  pageSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 15,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, marginTop: 0 },
  listPad: { paddingHorizontal: 20, paddingBottom: 24 },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 9,
  },
  foodIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodName: { color: C.ink, fontSize: 14, fontWeight: '800' },
  foodMeta: { color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: { color: C.muted, fontSize: 12, marginTop: 10 },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 9,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navIcon: { color: '#91A096', fontSize: 21, fontWeight: '700' },
  navLabel: { color: '#91A096', fontSize: 10, fontWeight: '700' },
  navActive: { color: C.forest },

  basketSummary: {
    flexDirection: 'row',
    backgroundColor: C.sage,
    borderRadius: 18,
    padding: 17,
    marginTop: 3,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryNumber: { color: C.forest, fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: C.forest2, fontSize: 10, marginTop: 1 },
  summaryDivider: {
    width: 1,
    height: 37,
    backgroundColor: '#B8CDB8',
    marginHorizontal: 28,
  },
  basketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 9,
  },
  quantity: {
    color: C.forest2,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  kcalPill: {
    backgroundColor: C.pale,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  kcalText: { color: C.forest, fontSize: 10, fontWeight: '800' },

  empty: { alignItems: 'center', paddingHorizontal: 34, paddingTop: 48 },
  emptyEmoji: { fontSize: 38, marginBottom: 12 },
  emptyTitle: { color: C.ink, fontSize: 17, fontWeight: '900' },
  emptyBody: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 18,
  },

  profileCard: {
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 20,
    padding: 23,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 65,
    height: 65,
    borderRadius: 23,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: C.forest, fontSize: 28, fontWeight: '900' },
  profileName: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  profileEmail: { color: C.muted, fontSize: 12, marginTop: 4 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 15,
    marginTop: 12,
  },
  infoBox: {
    backgroundColor: '#EDF2E8',
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
    marginBottom: 20,
  },
  infoTitle: { color: C.forest, fontSize: 12, fontWeight: '900' },
  infoBody: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },

  modalShade: {
    flex: 1,
    backgroundColor: '#14251D88',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '82%',
    backgroundColor: C.cream,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 25,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#C6D0C4',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { color: C.ink, fontSize: 21, fontWeight: '900' },
  modalSubtitle: { color: C.muted, fontSize: 11, marginTop: 3 },
  closeText: { color: C.forest, fontSize: 20, padding: 8 },
  variantCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 9,
  },
  variantName: { color: C.ink, fontSize: 14, fontWeight: '900' },
  variantBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  variantKcal: { color: C.forest2, fontSize: 11, fontWeight: '700' },
  verification: { color: C.muted, fontSize: 9, marginTop: 8 },

  dialogShade: {
    flex: 1,
    backgroundColor: '#14251D88',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  dialog: {
    width: '100%',
    backgroundColor: C.cream,
    borderRadius: 22,
    padding: 20,
  },
  dialogTitle: { color: C.ink, fontSize: 19, fontWeight: '900' },
  dialogBody: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  dialogHint: { color: C.muted, fontSize: 10, marginTop: 7 },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 18,
  },
});