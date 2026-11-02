import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import {
  Share2,
  Store,
  Users,
  Search,
  RefreshCw,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react-native";
import { AdminApi, SsmReferralItem, SscReferralItem } from "../api/adminApi";

interface ReferralsScreenProps {
  isDark?: boolean;
}

export const ReferralsScreen: React.FC<ReferralsScreenProps> = ({ isDark = false }) => {
  const [tab, setTab] = useState<"ssm" | "ssc">("ssm");
  const [ssmReferrals, setSsmReferrals] = useState<SsmReferralItem[]>([]);
  const [sscReferrals, setSscReferrals] = useState<SscReferralItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        inputBg: "#1E293B",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#1E293B",
        tabInactiveText: "#94A3B8",
        accent: "#EA580C"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#F1F5F9",
        tabInactiveText: "#64748B",
        accent: "#EA580C"
      };

  const loadData = async (reset = false) => {
    if (reset) setLoading(true);
    try {
      const [ssmData, sscData] = await Promise.all([
        AdminApi.getSsmReferrals(),
        AdminApi.getSscReferrals()
      ]);
      setSsmReferrals(ssmData);
      setSscReferrals(sscData);
    } catch (e) {
      console.warn("Failed to load referrals:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const filteredSsm = ssmReferrals.filter(
    (s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.referralCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.referredByCode && s.referredByCode.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSsc = sscReferrals.filter(
    (c) =>
      c.consumerName.toLowerCase().includes(search.toLowerCase()) ||
      c.shopperPassCode.toLowerCase().includes(search.toLowerCase()) ||
      c.referredBy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>Referral Management</Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Attribution & pass management for SSC Consumers & SSM Merchants only
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
          onPress={() => onRefresh()}
          activeOpacity={0.7}
        >
          <RefreshCw size={15} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            { backgroundColor: tab === "ssm" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setTab("ssm")}
          activeOpacity={0.8}
        >
          <Store size={14} color={tab === "ssm" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
          <Text
            style={[
              styles.tabText,
              { color: tab === "ssm" ? "#FFFFFF" : colors.textSub, fontWeight: tab === "ssm" ? "800" : "600" }
            ]}
          >
            SSM Store Referrals ({ssmReferrals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            { backgroundColor: tab === "ssc" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setTab("ssc")}
          activeOpacity={0.8}
        >
          <Users size={14} color={tab === "ssc" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
          <Text
            style={[
              styles.tabText,
              { color: tab === "ssc" ? "#FFFFFF" : colors.textSub, fontWeight: tab === "ssc" ? "800" : "600" }
            ]}
          >
            SSC Consumer Passes ({sscReferrals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textMain }]}
            placeholder={tab === "ssm" ? "Search store code or name..." : "Search shopper pass, name or campaign..."}
            placeholderTextColor={colors.textSub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Fetching referral attributions...</Text>
        </View>
      ) : tab === "ssm" ? (
        <FlatList
          data={filteredSsm}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.textMain }]}>{item.storeName}</Text>
                  <Text style={[styles.subText, { color: colors.textSub }]}>
                    {item.phone} • {item.state}
                  </Text>
                </View>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeLabel}>PASS: </Text>
                  <Text style={styles.codeValue}>{item.referralCode}</Text>
                </View>
              </View>

              <View style={[styles.attributionRow, { backgroundColor: isDark ? "#121926" : "#F8FAFC" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Share2 size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={[styles.attrLabel, { color: colors.textSub }]}>Referred By: </Text>
                  <Text style={[styles.attrValue, { color: colors.textMain }]}>
                    {item.referredByCode || "Direct Onboarding"}
                  </Text>
                </View>
                {item.referredAt && (
                  <Text style={[styles.dateText, { color: colors.textSub }]}>{item.referredAt}</Text>
                )}
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredSsc}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.textMain }]}>{item.consumerName}</Text>
                  <Text style={[styles.subText, { color: colors.textSub }]}>
                    {item.consumerPhone} • Reg: {item.registeredAt}
                  </Text>
                </View>
                <View style={[styles.codeBadge, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[styles.codeLabel, { color: "#2563EB" }]}>CODE: </Text>
                  <Text style={[styles.codeValue, { color: "#1D4ED8" }]}>{item.shopperPassCode}</Text>
                </View>
              </View>

              <View style={[styles.attributionRow, { backgroundColor: isDark ? "#121926" : "#F8FAFC" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <ArrowRight size={13} color="#EA580C" style={{ marginRight: 6 }} />
                  <Text style={[styles.attrLabel, { color: colors.textSub }]}>Attributed To: </Text>
                  <Text style={[styles.attrValue, { color: colors.textMain }]}>{item.referredBy}</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Gift size={11} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={styles.rewardText}>{item.bonusReward}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  tabText: {
    fontSize: 12
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden"
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700"
  },
  subText: {
    fontSize: 11,
    marginTop: 2
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#EA580C"
  },
  codeValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 0.5
  },
  attributionRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attrLabel: {
    fontSize: 11
  },
  attrValue: {
    fontSize: 11,
    fontWeight: "700"
  },
  dateText: {
    fontSize: 10
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  rewardText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A"
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: "600"
  }
});
