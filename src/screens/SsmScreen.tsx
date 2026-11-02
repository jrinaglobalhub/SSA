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
  Store,
  User,
  Phone,
  MapPin,
  Tag,
  Package,
  CreditCard,
  Calendar,
  Search,
  RefreshCw
} from "lucide-react-native";
import { AdminApi, SsmMerchant } from "../api/adminApi";

interface SsmScreenProps {
  isDark?: boolean;
}

export const SsmScreen: React.FC<SsmScreenProps> = ({ isDark = false }) => {
  const [merchants, setMerchants] = useState<SsmMerchant[]>([]);
  const [total, setTotal] = useState(0);
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
        statBoxBg: "#121926",
        accent: "#EA580C"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        inputBg: "#F1F5F9",
        statBoxBg: "#F8FAFC",
        accent: "#EA580C"
      };

  const loadMerchants = async (reset = false) => {
    if (reset) setLoading(true);

    try {
      const res = await AdminApi.getMerchants(1, 25, search);
      setMerchants(res.merchants);
      setTotal(res.total);
    } catch (err) {
      console.warn("Failed to load merchants:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMerchants(true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMerchants(true);
  };

  const renderItem = ({ item }: { item: SsmMerchant }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Store Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? "#1E293B" : "#F0FDF4" }]}>
            <Store size={20} color="#16A34A" />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.storeName, { color: colors.textMain }]} numberOfLines={1}>
              {item.storeName}
            </Text>
            <View style={styles.metaRow}>
              <User size={12} color={colors.textSub} style={{ marginRight: 3 }} />
              <Text style={[styles.metaText, { color: colors.textSub }]}>{item.ownerName}</Text>
              <Text style={[styles.dot, { color: colors.textSub }]}>•</Text>
              <MapPin size={12} color={colors.textSub} style={{ marginRight: 3 }} />
              <Text style={[styles.metaText, { color: colors.textSub }]}>{item.state}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.planBadge, { backgroundColor: "#FFF7ED" }]}>
          <CreditCard size={11} color="#EA580C" style={{ marginRight: 3 }} />
          <Text style={styles.planText}>{item.subscriptionPlan}</Text>
        </View>
      </View>

      <View style={[styles.phoneRow, { backgroundColor: colors.statBoxBg }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Phone size={12} color={colors.textSub} style={{ marginRight: 4 }} />
          <Text style={[styles.phoneText, { color: colors.textMain }]}>{item.phone}</Text>
        </View>
        {item.referralCode && item.referralCode !== "—" && (
          <View style={styles.referralBadge}>
            <Text style={styles.referralLabel}>REF: </Text>
            <Text style={styles.referralCodeText}>{item.referralCode}</Text>
          </View>
        )}
      </View>

      {/* Metrics Row: Offers last month & Total catalogue items */}
      <View style={styles.metricsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
          <View style={styles.statIconRow}>
            <Tag size={13} color="#EA580C" style={{ marginRight: 4 }} />
            <Text style={[styles.statLabel, { color: colors.textSub }]}>Prev Month Offers</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textMain }]}>{item.offersLastMonth}</Text>
          <Text style={[styles.statHint, { color: colors.textSub }]}>Published deals</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
          <View style={styles.statIconRow}>
            <Package size={13} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={[styles.statLabel, { color: colors.textSub }]}>Total Catalog</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textMain }]}>{item.totalCatalogItems}</Text>
          <Text style={[styles.statHint, { color: colors.textSub }]}>Active products</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
          <View style={styles.statIconRow}>
            <Calendar size={13} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={[styles.statLabel, { color: colors.textSub }]}>Plan Expiry</Text>
          </View>
          <Text style={[styles.statValueExpiry, { color: colors.textMain }]} numberOfLines={1}>
            {item.subscriptionExpiry}
          </Text>
          <Text style={[styles.statHint, { color: colors.textSub }]}>Current validity</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>SSM – Merchant Stores</Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Total enrolled stores: {total}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconBtn, { backgroundColor: colors.inputBg }]}
          onPress={() => loadMerchants(true)}
          activeOpacity={0.7}
        >
          <RefreshCw size={15} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textMain }]}
            placeholder="Search stores by name or phone..."
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
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading merchant catalog data...</Text>
        </View>
      ) : merchants.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No stores found</Text>
          <Text style={[styles.emptySub, { color: colors.textSub }]}>
            Verify database records or clear search query
          </Text>
        </View>
      ) : (
        <FlatList
          data={merchants}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500"
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden"
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  storeName: {
    fontSize: 15,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  metaText: {
    fontSize: 11
  },
  dot: {
    marginHorizontal: 5
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  planText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C"
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  phoneText: {
    fontSize: 12,
    fontWeight: "600"
  },
  referralBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  referralLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B"
  },
  referralCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5
  },
  metricsRow: {
    padding: 12,
    flexDirection: "row",
    gap: 8
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600"
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  statValueExpiry: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6
  },
  statHint: {
    fontSize: 9,
    marginTop: 2
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
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4
  }
});
