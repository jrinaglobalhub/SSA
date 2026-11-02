import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  Alert
} from "react-native";
import {
  Search,
  UserCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Hash
} from "lucide-react-native";
import { AdminApi, SscConsumer } from "../api/adminApi";

interface SscScreenProps {
  isDark?: boolean;
}

const PAGE_SIZE = 10;

export const SscScreen: React.FC<SscScreenProps> = ({ isDark = false }) => {
  const [consumers, setConsumers] = useState<SscConsumer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedConsumer, setSelectedConsumer] = useState<SscConsumer | null>(null);

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        inputBg: "#1E293B",
        badgeActiveBg: "#064E3B",
        badgeActiveText: "#34D399",
        badgeInactiveBg: "#1E293B",
        badgeInactiveText: "#94A3B8",
        badgeBannedBg: "#450A0A",
        badgeBannedText: "#F87171",
        accent: "#EA580C",
        modalOverlay: "rgba(0, 0, 0, 0.75)",
        metaBoxBg: "#121926",
        pillActiveBg: "#EA580C",
        pillActiveText: "#FFFFFF",
        pillInactiveBg: "#1E293B",
        pillInactiveText: "#94A3B8"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        inputBg: "#F1F5F9",
        badgeActiveBg: "#ECFDF5",
        badgeActiveText: "#059669",
        badgeInactiveBg: "#F1F5F9",
        badgeInactiveText: "#64748B",
        badgeBannedBg: "#FEE2E2",
        badgeBannedText: "#DC2626",
        accent: "#EA580C",
        modalOverlay: "rgba(15, 23, 42, 0.6)",
        metaBoxBg: "#F8FAFC",
        pillActiveBg: "#EA580C",
        pillActiveText: "#FFFFFF",
        pillInactiveBg: "#F1F5F9",
        pillInactiveText: "#64748B"
      };

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load real consumers from Supabase
  const loadConsumers = useCallback(async (resetPage = false, isPullRefresh = false) => {
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await AdminApi.getConsumers(targetPage, PAGE_SIZE, debouncedSearch, statusFilter);
      setConsumers(res.consumers);
      setTotal(res.total);
    } catch (err: any) {
      console.error("[SscScreen] Error fetching real consumers:", err);
      setErrorMessage(err?.message || "Unable to load consumer data from Supabase backend.");
      setConsumers([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    loadConsumers();
  }, [loadConsumers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const renderStatusBadge = (status: string) => {
    let bg = colors.badgeInactiveBg;
    let text = colors.badgeInactiveText;
    let label = "INACTIVE";

    if (status === "active") {
      bg = colors.badgeActiveBg;
      text = colors.badgeActiveText;
      label = "ACTIVE";
    } else if (status === "banned") {
      bg = colors.badgeBannedBg;
      text = colors.badgeBannedText;
      label = "BANNED";
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{label}</Text>
      </View>
    );
  };

  const renderConsumerCard = ({ item }: { item: SscConsumer }) => {
    const initials = item.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("") || "SS";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => setSelectedConsumer(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarBox, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED" }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerTitleCol}>
              <View style={styles.nameRow}>
                <Text style={[styles.consumerName, { color: colors.textMain }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.subMetaRow}>
                <View style={[styles.idBadge, { borderColor: colors.border }]}>
                  <Hash size={11} color={colors.accent} style={{ marginRight: 2 }} />
                  <Text style={[styles.idBadgeText, { color: colors.accent }]}>
                    {item.customerId}
                  </Text>
                </View>
                <View style={styles.locationPill}>
                  <MapPin size={11} color={colors.textSub} style={{ marginRight: 2 }} />
                  <Text style={[styles.locationText, { color: colors.textSub }]}>{item.state}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {renderStatusBadge(item.accountStatus)}
            <ChevronRight size={16} color={colors.textSub} style={{ marginTop: 4 }} />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Contact info grid */}
        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Phone size={12} color={colors.textSub} style={{ marginRight: 6 }} />
            <Text style={[styles.contactValue, { color: colors.textMain }]} numberOfLines={1}>
              {item.phone}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Mail size={12} color={colors.textSub} style={{ marginRight: 6 }} />
            <Text style={[styles.contactValue, { color: colors.textMain }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        </View>

        {/* Dates summary */}
        <View style={[styles.datesContainer, { backgroundColor: colors.metaBoxBg }]}>
          <View style={styles.dateCol}>
            <View style={styles.dateLabelRow}>
              <Calendar size={11} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[styles.dateLabel, { color: colors.textSub }]}>Registered</Text>
            </View>
            <Text style={[styles.dateValue, { color: colors.textMain }]}>{item.registrationDate}</Text>
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

          <View style={styles.dateCol}>
            <View style={styles.dateLabelRow}>
              <Clock size={11} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[styles.dateLabel, { color: colors.textSub }]}>Last Active</Text>
            </View>
            <Text style={[styles.dateValue, { color: colors.textMain }]}>{item.lastActiveDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Section Header */}
      <View style={[styles.topBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.topBarTitle, { color: colors.textMain }]}>SSC – Consumer Directory</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.greenPulse} />
              <Text style={styles.liveIndicatorText}>LIVE SUPABASE</Text>
            </View>
          </View>
          <Text style={[styles.topBarSub, { color: colors.textSub }]}>
            {loading ? "Querying database..." : `Verified database records: ${total} consumers`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => loadConsumers(false, true)}
          disabled={loading || refreshing}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={colors.accent} />
          <Text style={[styles.refreshBtnText, { color: colors.accent }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Controls */}
      <View style={[styles.controlsBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={15} color={colors.textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textMain }]}
            placeholder="Search by name, phone, email, or pass ID..."
            placeholderTextColor={colors.textSub}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
              <X size={14} color={colors.textSub} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "all" ? colors.pillActiveBg : colors.pillInactiveBg
              }
            ]}
            onPress={() => {
              setStatusFilter("all");
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "all" ? colors.pillActiveText : colors.pillInactiveText }
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "active" ? colors.pillActiveBg : colors.pillInactiveBg
              }
            ]}
            onPress={() => {
              setStatusFilter("active");
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "active" ? colors.pillActiveText : colors.pillInactiveText }
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "inactive" ? colors.pillActiveBg : colors.pillInactiveBg
              }
            ]}
            onPress={() => {
              setStatusFilter("inactive");
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "inactive" ? colors.pillActiveText : colors.pillInactiveText }
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.statusTitle, { color: colors.textMain, marginTop: 14 }]}>
            Connecting to Supabase Database...
          </Text>
          <Text style={[styles.statusSub, { color: colors.textSub }]}>
            Querying verified smartshopper consumer profiles
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <View style={styles.errorIconCircle}>
            <AlertCircle size={32} color="#DC2626" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.textMain }]}>Unable to load consumer data</Text>
          <Text style={[styles.statusSub, { color: colors.textSub }]}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadConsumers(true)}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : consumers.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
            <Search size={30} color={colors.textSub} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.textMain }]}>No consumers found</Text>
          <Text style={[styles.statusSub, { color: colors.textSub }]}>
            No real consumer records match &quot;{debouncedSearch || statusFilter}&quot;
          </Text>
          {(search !== "" || statusFilter !== "all") && (
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: colors.border }]}
              onPress={handleClearFilters}
            >
              <Text style={[styles.clearBtnText, { color: colors.accent }]}>Clear Search & Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={consumers}
          keyExtractor={(item) => item.id}
          renderItem={renderConsumerCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConsumers(false, true)}
              tintColor={colors.accent}
            />
          }
          ListFooterComponent={
            total > PAGE_SIZE ? (
              <View style={[styles.paginationRow, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    { borderColor: colors.border },
                    page <= 1 && styles.pageBtnDisabled
                  ]}
                  onPress={handlePrevPage}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={16} color={page <= 1 ? colors.textSub : colors.textMain} />
                  <Text
                    style={[
                      styles.pageBtnText,
                      { color: page <= 1 ? colors.textSub : colors.textMain }
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.pageInfoText, { color: colors.textSub }]}>
                  Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    { borderColor: colors.border },
                    page >= totalPages && styles.pageBtnDisabled
                  ]}
                  onPress={handleNextPage}
                  disabled={page >= totalPages}
                >
                  <Text
                    style={[
                      styles.pageBtnText,
                      { color: page >= totalPages ? colors.textSub : colors.textMain }
                    ]}
                  >
                    Next
                  </Text>
                  <ChevronRight size={16} color={page >= totalPages ? colors.textSub : colors.textMain} />
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}

      {/* Consumer Detailed Profile Modal */}
      <Modal
        visible={!!selectedConsumer}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedConsumer(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ShieldCheck size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Consumer Profile Dossier</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedConsumer(null)}
              >
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {selectedConsumer && (
              <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Banner */}
                <View style={[styles.profileBanner, { backgroundColor: colors.metaBoxBg }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: "#EA580C" }]}>
                    <Text style={styles.modalAvatarText}>
                      {selectedConsumer.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0].toUpperCase())
                        .join("") || "SS"}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={[styles.modalName, { color: colors.textMain }]}>
                      {selectedConsumer.name}
                    </Text>
                    <Text style={[styles.modalUsername, { color: colors.textSub }]}>
                      @{selectedConsumer.username}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                      {renderStatusBadge(selectedConsumer.accountStatus)}
                      <View style={[styles.modalPassPill, { borderColor: colors.border }]}>
                        <Text style={styles.modalPassText}>{selectedConsumer.customerId}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Section: Contact Details */}
                <Text style={[styles.sectionHeading, { color: colors.textSub }]}>
                  COMMUNICATION & IDENTITY
                </Text>
                <View style={[styles.infoBlock, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
                  <View style={styles.infoRow}>
                    <Phone size={15} color={colors.accent} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Registered Mobile</Text>
                      <Text selectable style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.phone}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoRow}>
                    <Mail size={15} color={colors.accent} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Verified Email</Text>
                      <Text selectable style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.email}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoRow}>
                    <MapPin size={15} color={colors.accent} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>State & Region</Text>
                      <Text style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.state}
                        {selectedConsumer.city && selectedConsumer.city !== "Not available" ? ` (${selectedConsumer.city})` : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section: Activity & Timestamps */}
                <Text style={[styles.sectionHeading, { color: colors.textSub }]}>
                  LIFECYCLE TIMESTAMPS
                </Text>
                <View style={[styles.infoBlock, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
                  <View style={styles.infoRow}>
                    <Calendar size={15} color="#2563EB" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Account Registered</Text>
                      <Text style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.registrationDate}
                        {selectedConsumer.registrationTimestamp ? ` • ${new Date(selectedConsumer.registrationTimestamp).toLocaleTimeString()}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoRow}>
                    <Clock size={15} color="#16A34A" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Last Ecosystem Sign-In</Text>
                      <Text style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.lastActiveDate}
                        {selectedConsumer.lastActiveTimestamp ? ` • ${new Date(selectedConsumer.lastActiveTimestamp).toLocaleTimeString()}` : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section: Referral & Pass Attribution */}
                <Text style={[styles.sectionHeading, { color: colors.textSub }]}>
                  REFERRAL ENGINE & PASS ATTRIBUTION
                </Text>
                <View style={[styles.infoBlock, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
                  <View style={styles.infoRow}>
                    <Share2 size={15} color="#9333EA" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Assigned Shopper Pass Code</Text>
                      <Text selectable style={[styles.infoVal, { color: colors.textMain, fontWeight: "700" }]}>
                        {selectedConsumer.referralCode}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoRow}>
                    <CheckCircle2 size={15} color="#9333EA" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoKey, { color: colors.textSub }]}>Referred By</Text>
                      <Text style={[styles.infoVal, { color: colors.textMain }]}>
                        {selectedConsumer.referredByCode}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* System ID Metadata */}
                <View style={styles.systemMetadataBox}>
                  <Text style={[styles.systemMetaText, { color: colors.textSub }]}>
                    Internal Auth UUID: {selectedConsumer.id}
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Modal Actions */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.accent }]}
                onPress={() => setSelectedConsumer(null)}
              >
                <Text style={styles.closeModalBtnText}>Close Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 4
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: 0.5
  },
  topBarSub: {
    fontSize: 12,
    marginTop: 2
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5
  },
  controlsBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0
  },
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700"
  },
  listContainer: {
    padding: 16,
    paddingBottom: 36
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden"
  },
  cardHeader: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EA580C"
  },
  headerTitleCol: {
    marginLeft: 10,
    flex: 1
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  consumerName: {
    fontSize: 14,
    fontWeight: "700"
  },
  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 8
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "transparent"
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: "700"
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center"
  },
  locationText: {
    fontSize: 11
  },
  headerRight: {
    alignItems: "flex-end"
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  divider: {
    height: 1
  },
  contactRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  contactValue: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1
  },
  datesContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center"
  },
  dateCol: {
    flex: 1
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "600"
  },
  dateValue: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 10
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    marginTop: 6
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  pageBtnDisabled: {
    opacity: 0.4
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: "500"
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30
  },
  errorIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  },
  statusSub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "88%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  modalCloseBtn: {
    padding: 4
  },
  modalScrollContent: {
    padding: 16
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  modalAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800"
  },
  modalName: {
    fontSize: 16,
    fontWeight: "800"
  },
  modalUsername: {
    fontSize: 12,
    marginTop: 2
  },
  modalPassPill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  modalPassText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C"
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10
  },
  infoBlock: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  infoKey: {
    fontSize: 11,
    fontWeight: "500"
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  systemMetadataBox: {
    marginTop: 10,
    marginBottom: 16,
    alignItems: "center"
  },
  systemMetaText: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: "flex-end"
  },
  closeModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  }
});
