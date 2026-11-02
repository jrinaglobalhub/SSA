import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import {
  Package,
  Users,
  Store,
  Truck,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2
} from "lucide-react-native";
import { AdminApi, OverviewMetrics } from "../api/adminApi";

interface OverviewScreenProps {
  isDark?: boolean;
  onNavigateToSection: (section: "overview" | "ssc" | "ssm" | "ssd" | "referrals") => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  isDark = false,
  onNavigateToSection
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        accent: "#EA580C"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        accent: "#EA580C"
      };

  const loadData = async (force = false) => {
    try {
      const data = await AdminApi.getOverviewMetrics(force);
      setMetrics(data);
    } catch (err) {
      console.warn("Failed to load metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Top Banner */}
      <View style={[styles.welcomeBanner, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeTitle, { color: colors.textMain }]}>
            SmartShopper Ecosystem Pulse
          </Text>
          <Text style={[styles.welcomeSub, { color: colors.textSub }]}>
            Live platform metrics • Shared Supabase backend • Updated: {metrics?.timestamp || "Loading..."}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
          onPress={() => onRefresh()}
          activeOpacity={0.7}
        >
          <RotateCw size={15} color={colors.accent} />
          <Text style={[styles.refreshBtnText, { color: colors.accent }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Aggregating ecosystem metrics...</Text>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          {/* 1. Today's Total Orders */}
          <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
                <Package size={22} color="#EA580C" />
              </View>
              <Text style={styles.trendBadge}>Today</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>
              {metrics?.todayOrders ?? 0}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMain }]}>Today's Total Orders</Text>
            <Text style={[styles.metricDetail, { color: colors.textSub }]}>Orders placed across all active stores</Text>
          </View>

          {/* 2. Today's Unique SSC Users */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssc")}
            activeOpacity={0.8}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <Users size={22} color="#2563EB" />
              </View>
              <Text style={[styles.trendBadge, { backgroundColor: "#EFF6FF", color: "#2563EB" }]}>SSC</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>
              {metrics?.todaySscUsers ?? 0}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMain }]}>Today's Unique SSC Users</Text>
            <Text style={[styles.metricDetail, { color: colors.textSub }]}>Active consumer profiles in ecosystem</Text>
          </TouchableOpacity>

          {/* 3. Today's Unique SSM Users */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssm")}
            activeOpacity={0.8}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
                <Store size={22} color="#16A34A" />
              </View>
              <Text style={[styles.trendBadge, { backgroundColor: "#F0FDF4", color: "#16A34A" }]}>SSM</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>
              {metrics?.todaySsmUsers ?? 0}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMain }]}>Today's Unique SSM Users</Text>
            <Text style={[styles.metricDetail, { color: colors.textSub }]}>Store partners managing inventory</Text>
          </TouchableOpacity>

          {/* 4. Today's Unique SSD Users */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssd")}
            activeOpacity={0.8}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#FAF5FF" }]}>
                <Truck size={22} color="#9333EA" />
              </View>
              <Text style={[styles.trendBadge, { backgroundColor: "#FAF5FF", color: "#9333EA" }]}>SSD</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>
              {metrics?.todaySsdUsers ?? 0}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMain }]}>Today's Unique SSD Users</Text>
            <Text style={[styles.metricDetail, { color: colors.textSub }]}>Verified delivery couriers on duty</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Nav Cards */}
      <View style={[styles.navSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.navTitle, { color: colors.textMain }]}>Administration Sections</Text>
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={[styles.navQuickBtn, { borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssc")}
          >
            <Users size={18} color="#2563EB" />
            <Text style={[styles.navQuickText, { color: colors.textMain }]}>SSC Consumers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navQuickBtn, { borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssm")}
          >
            <Store size={18} color="#16A34A" />
            <Text style={[styles.navQuickText, { color: colors.textMain }]}>SSM Merchants</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navQuickBtn, { borderColor: colors.border }]}
            onPress={() => onNavigateToSection("ssd")}
          >
            <Truck size={18} color="#9333EA" />
            <Text style={[styles.navQuickText, { color: colors.textMain }]}>SSD Approvals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navQuickBtn, { borderColor: colors.border }]}
            onPress={() => onNavigateToSection("referrals")}
          >
            <Share2 size={18} color="#EA580C" />
            <Text style={[styles.navQuickText, { color: colors.textMain }]}>Referrals (SSC & SSM)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20
  },
  welcomeBanner: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  welcomeSub: {
    fontSize: 12,
    marginTop: 4
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 16
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 8,
    marginBottom: 16
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  trendBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  metricDetail: {
    fontSize: 11,
    marginTop: 2
  },
  navSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14
  },
  navButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  navQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8
  },
  navQuickText: {
    fontSize: 13,
    fontWeight: "700"
  }
});
