import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CommunityService from '../services/CommunityService';

// ── Notification Center Modal ─────────────────────────────────────────────────

function NotificationCenter({ visible, notifications, onClose, onAccept }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ncStyles.container}>
        <View style={ncStyles.header}>
          <Text style={ncStyles.title}>Notifications</Text>
          <TouchableOpacity onPress={onClose} style={ncStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={ncStyles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
            <Text style={ncStyles.emptyText}>No pending notifications</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={ncStyles.item}>
                <View style={ncStyles.itemAvatar}>
                  <Text style={ncStyles.itemAvatarText}>
                    {item.from_user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={ncStyles.itemInfo}>
                  <Text style={ncStyles.itemName}>{item.from_user_name}</Text>
                  <Text style={ncStyles.itemSub}>sent you a friend request</Text>
                </View>
                <TouchableOpacity
                  style={ncStyles.acceptBtn}
                  onPress={() => onAccept(item.id)}
                >
                  <Text style={ncStyles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const ncStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#999' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemSub: { fontSize: 13, color: '#999', marginTop: 2 },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ── Challenge Card ─────────────────────────────────────────────────────────────

function ChallengeCard({ item }) {
  const isIP = item.type === 'ip' || item.type === 'mixed';
  const isEP = item.type === 'ep' || item.type === 'mixed';

  return (
    <View style={chStyles.card}>
      <View style={chStyles.cardHeader}>
        <View style={[chStyles.typeBadge, { backgroundColor: item.type === 'ep' ? '#2196F320' : '#4CAF5020' }]}>
          <Ionicons
            name={item.type === 'ep' ? 'pulse' : item.type === 'mixed' ? 'swap-horizontal' : 'barbell'}
            size={14}
            color={item.type === 'ep' ? '#2196F3' : '#4CAF50'}
          />
          <Text style={[chStyles.typeBadgeText, { color: item.type === 'ep' ? '#2196F3' : '#4CAF50' }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={chStyles.duration}>{item.duration_days} days</Text>
      </View>

      <Text style={chStyles.title}>{item.title}</Text>
      <Text style={chStyles.description}>{item.description}</Text>

      <View style={chStyles.targets}>
        {isIP && (
          <View style={chStyles.target}>
            <Ionicons name="barbell-outline" size={14} color="#4CAF50" />
            <Text style={[chStyles.targetText, { color: '#4CAF50' }]}>
              {item.target_ip.toLocaleString()} IP
            </Text>
          </View>
        )}
        {isEP && (
          <View style={chStyles.target}>
            <Ionicons name="pulse-outline" size={14} color="#2196F3" />
            <Text style={[chStyles.targetText, { color: '#2196F3' }]}>
              {item.target_ep.toLocaleString()} EP
            </Text>
          </View>
        )}
        {item.min_participants > 1 && (
          <View style={chStyles.target}>
            <Ionicons name="people-outline" size={14} color="#9C27B0" />
            <Text style={[chStyles.targetText, { color: '#9C27B0' }]}>
              {item.min_participants} participants
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const chStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  duration: { fontSize: 12, color: '#999' },
  title: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 6 },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetText: { fontSize: 13, fontWeight: '600' },
});

// ── Main Screen ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63'];

const CommunityScreen = () => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [invitedIds, setInvitedIds] = useState([]);

  const loadAll = async () => {
    try {
      const [fr, sg, ch, lb, nt] = await Promise.all([
        CommunityService.getFriends(),
        CommunityService.getSuggestions(),
        CommunityService.getChallenges(),
        CommunityService.getLeaderboard(),
        CommunityService.getNotifications(),
      ]);
      setFriends(Array.isArray(fr) ? fr : []);
      setSuggestions(Array.isArray(sg) ? sg : []);
      setChallenges(Array.isArray(ch) ? ch : []);
      setLeaderboard(Array.isArray(lb) ? lb : []);
      setNotifications(Array.isArray(nt) ? nt : []);
    } catch (e) {
      console.log('Community load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const handleInvite = async (userId) => {
    try {
      await CommunityService.inviteFriend(userId);
      setInvitedIds(prev => [...prev, userId]);
    } catch (e) {
      if (e.status === 409) {
        Alert.alert('Already sent', 'You already sent a request to this person.');
      } else {
        Alert.alert('Error', e.message || 'Failed to send invitation');
      }
    }
  };

  const handleAccept = async (notificationId) => {
    try {
      await CommunityService.acceptFriendRequest(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadAll(); // refresh friends list
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to accept request');
    }
  };

  const avatarColor = (name, idx) =>
    AVATAR_COLORS[(name?.charCodeAt(0) || idx) % AVATAR_COLORS.length];

  const renderFriend = ({ item, index }) => (
    <View style={styles.friendCard}>
      <View style={[styles.friendAvatar, { backgroundColor: avatarColor(item.display_name, index) }]}>
        <Text style={styles.avatarText}>{item.display_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.display_name}</Text>
        <View style={styles.friendStats}>
          <View style={styles.stat}>
            <Ionicons name="barbell" size={12} color="#4CAF50" />
            <Text style={styles.statText}>{item.iron_points.toLocaleString()} IP</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="pulse" size={12} color="#2196F3" />
            <Text style={styles.statText}>{item.endurance_points.toLocaleString()} EP</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSuggestion = ({ item, index }) => {
    const invited = invitedIds.includes(item.id);
    return (
      <View style={styles.friendCard}>
        <View style={[styles.friendAvatar, { backgroundColor: avatarColor(item.display_name, index + 10) }]}>
          <Text style={styles.avatarText}>{item.display_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.display_name}</Text>
          <View style={styles.friendStats}>
            <View style={styles.stat}>
              <Ionicons name="barbell" size={12} color="#4CAF50" />
              <Text style={styles.statText}>{item.iron_points.toLocaleString()} IP</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.inviteBtn, invited && styles.inviteBtnSent]}
          onPress={() => !invited && handleInvite(item.id)}
          disabled={invited}
        >
          <Text style={[styles.inviteBtnText, invited && styles.inviteBtnTextSent]}>
            {invited ? 'Sent' : 'Invite'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const MEDAL_ICONS = ['trophy', 'medal', 'ribbon'];
  const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Connect, compete, and grow together</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setNotifVisible(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {notifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['friends', 'challenges'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Friends Tab ──────────────────────────────────────── */}
            {activeTab === 'friends' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Friends</Text>
                {friends.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={32} color="#ccc" />
                    <Text style={styles.emptyText}>No friends yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    renderItem={renderFriend}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                )}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>People You May Know</Text>
                {suggestions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No suggestions available</Text>
                  </View>
                ) : (
                  <FlatList
                    data={suggestions}
                    renderItem={renderSuggestion}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                )}
              </View>
            )}

            {/* ── Challenges Tab ───────────────────────────────────── */}
            {activeTab === 'challenges' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Challenges</Text>
                {challenges.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No active challenges</Text>
                  </View>
                ) : (
                  challenges.map((c) => <ChallengeCard key={c.id} item={c} />)
                )}
              </View>
            )}

            {/* ── Weekly Leaderboard (always visible) ─────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.leaderboardCard}>
                <View style={styles.leaderboardHeader}>
                  <Text style={styles.leaderboardTitle}>Top Iron Points</Text>
                  <Ionicons name="barbell" size={18} color="rgba(255,255,255,0.8)" />
                </View>
                {leaderboard.length === 0 ? (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 16 }}>
                    No data yet
                  </Text>
                ) : (
                  leaderboard.map((entry) => (
                    <View key={entry.id} style={styles.leaderboardRow}>
                      <View style={styles.leaderboardPosition}>
                        <Ionicons
                          name={MEDAL_ICONS[entry.rank - 1] || 'ribbon'}
                          size={18}
                          color={MEDAL_COLORS[entry.rank - 1] || '#fff'}
                        />
                      </View>
                      <View style={[styles.leaderboardAvatar, { backgroundColor: avatarColor(entry.display_name, entry.rank) }]}>
                        <Text style={styles.avatarText}>{entry.display_name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>{entry.display_name}</Text>
                        <Text style={styles.leaderboardSub}>{entry.endurance_points.toLocaleString()} EP</Text>
                      </View>
                      <Text style={styles.leaderboardScore}>
                        {entry.iron_points.toLocaleString()} IP
                      </Text>
                    </View>
                  ))
                )}
              </LinearGradient>
            </View>
          </>
        )}
      </ScrollView>

      <NotificationCenter
        visible={notifVisible}
        notifications={notifications}
        onClose={() => setNotifVisible(false)}
        onAccept={handleAccept}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  notificationButton: { position: 'relative', padding: 4 },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#4CAF50', fontWeight: 'bold' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 14 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
    marginBottom: 8,
  },
  emptyText: { color: '#999', fontSize: 14 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  friendInfo: { flex: 1, marginLeft: 14 },
  friendName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  friendStats: { flexDirection: 'row', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#666' },
  inviteBtn: {
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  inviteBtnSent: { borderColor: '#ccc' },
  inviteBtnText: { color: '#4CAF50', fontWeight: '700', fontSize: 13 },
  inviteBtnTextSent: { color: '#ccc' },
  leaderboardCard: { borderRadius: 16, padding: 20 },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leaderboardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  leaderboardPosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 15, fontWeight: 'bold', color: 'white', marginBottom: 2 },
  leaderboardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  leaderboardScore: { fontSize: 16, fontWeight: 'bold', color: 'white' },
});

export default CommunityScreen;
