import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Linking,
  ScrollView,
  Alert
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
  RefreshCw,
  Megaphone,
  Check,
  X,
  Clock,
  ExternalLink,
  Eye,
  Sliders,
  Plus,
  Minus,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react-native";
import {
  AdminApi,
  SsmMerchant,
  SsmAdApplication,
  BannerSlotControls,
  BannerDailySlot
} from "../api/adminApi";

interface SsmScreenProps {
  isDark?: boolean;
}

export const SsmScreen: React.FC<SsmScreenProps> = ({ isDark = false }) => {
  // Main Sub-Tab State: 'manage' or 'applications'
  const [activeSubTab, setActiveSubTab] = useState<"manage" | "applications">("manage");

  // ============================================================================
  // Manage Sub-Tab State
  // ============================================================================
  const [merchants, setMerchants] = useState<SsmMerchant[]>([]);
  const [totalMerchants, setTotalMerchants] = useState(0);
  const [searchMerchant, setSearchMerchant] = useState("");
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [refreshingMerchants, setRefreshingMerchants] = useState(false);

  // ============================================================================
  // Applications Sub-Tab State
  // ============================================================================
  const [adApplications, setAdApplications] = useState<SsmAdApplication[]>([]);
  const [totalAds, setTotalAds] = useState(0);
  const [adStatusFilter, setAdStatusFilter] = useState<
    "all" | "pending" | "under_review" | "approved" | "rejected"
  >("all");
  const [searchAd, setSearchAd] = useState("");
  const [loadingAds, setLoadingAds] = useState(true);
  const [refreshingAds, setRefreshingAds] = useState(false);
  const [processingAdId, setProcessingAdId] = useState<string | null>(null);

  // Applications Sub-Tab View Mode: 'calendar' (default) or 'list'
  const [appsViewMode, setAppsViewMode] = useState<"calendar" | "list">("calendar");

  // Helper: Today's date formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Advertising Calendar State
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayDateString());
  const [monthSlotsMap, setMonthSlotsMap] = useState<Record<string, BannerDailySlot>>({});
  const [selectedDateSlot, setSelectedDateSlot] = useState<BannerDailySlot>({
    date: getTodayDateString(),
    totalCapacity: 4,
    bookedSlots: 0,
    availableSlots: 4,
    scheduledAppsCount: 0,
    isFullyBooked: false,
    isPartiallyBooked: false,
    isFullyAvailable: true
  });
  const [selectedDateApps, setSelectedDateApps] = useState<SsmAdApplication[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingDateApps, setLoadingDateApps] = useState(false);
  const [updatingDailySlot, setUpdatingDailySlot] = useState(false);

  // Legacy fallback slot controls state
  const [slotControls, setSlotControls] = useState<BannerSlotControls>({
    totalCapacity: 4,
    bookedSlots: 0,
    availableSlots: 4
  });
  const [updatingSlots, setUpdatingSlots] = useState(false);

  // Bulk Selection State for Pending Applications
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [selectAllPendingAcrossAllPages, setSelectAllPendingAcrossAllPages] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Inspection & Action Modals State
  const [selectedAd, setSelectedAd] = useState<SsmAdApplication | null>(null);
  const [rejectingAd, setRejectingAd] = useState<SsmAdApplication | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        inputBg: "#1E293B",
        statBoxBg: "#121926",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#1E293B",
        tabInactiveText: "#94A3B8",
        badgePendingBg: "#451A03",
        badgePendingText: "#FBBF24",
        badgeReviewBg: "#172554",
        badgeReviewText: "#60A5FA",
        badgeApprovedBg: "#064E3B",
        badgeApprovedText: "#34D399",
        badgeRejectedBg: "#450A0A",
        badgeRejectedText: "#F87171",
        slotBannerBg: "#1E293B",
        slotBannerBorder: "#334155",
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
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#F1F5F9",
        tabInactiveText: "#64748B",
        badgePendingBg: "#FEF3C7",
        badgePendingText: "#D97706",
        badgeReviewBg: "#EFF6FF",
        badgeReviewText: "#2563EB",
        badgeApprovedBg: "#ECFDF5",
        badgeApprovedText: "#059669",
        badgeRejectedBg: "#FEE2E2",
        badgeRejectedText: "#DC2626",
        slotBannerBg: "#FFFFFF",
        slotBannerBorder: "#E2E8F0",
        accent: "#EA580C"
      };

  // 1. Fetch Merchants (Manage Sub-Tab)
  const loadMerchants = async (reset = false) => {
    if (reset) setLoadingMerchants(true);
    try {
      const res = await AdminApi.getMerchants(1, 50, searchMerchant);
      setMerchants(res.merchants);
      setTotalMerchants(res.total);
    } catch (err) {
      console.warn("Failed to load merchants:", err);
    } finally {
      setLoadingMerchants(false);
      setRefreshingMerchants(false);
    }
  };

  // 2. Fetch Calendar Month Slots & Scheduled Counts
  const loadCalendarData = async (monthDate: Date, targetSelectedDate?: string) => {
    setLoadingCalendar(true);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const firstDayStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const lastDayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const slots = await AdminApi.getMonthSlotData(firstDayStr, lastDayStr);
      setMonthSlotsMap(slots);

      const dateToLoad = targetSelectedDate || selectedCalendarDate;
      if (dateToLoad) {
        loadDateDetails(dateToLoad);
      }
    } catch (err) {
      console.warn("Failed to load calendar data:", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // 3. Fetch Single Date Slots & Applications for selected date
  const loadDateDetails = async (dateStr: string) => {
    setLoadingDateApps(true);
    try {
      const [slotData, apps] = await Promise.all([
        AdminApi.getDailySlot(dateStr),
        AdminApi.getAdApplicationsByDate(dateStr)
      ]);
      setSelectedDateSlot(slotData);
      setSelectedDateApps(apps);
    } catch (err) {
      console.warn("Failed to load date details:", err);
    } finally {
      setLoadingDateApps(false);
    }
  };

  // 4. Fetch All Ads Applications for List View
  const loadAds = async (reset = false) => {
    if (reset) setLoadingAds(true);
    try {
      const res = await AdminApi.getAdApplications(adStatusFilter, 1, 50);
      setAdApplications(res.applications);
      setTotalAds(res.total);
    } catch (err) {
      console.warn("Failed to load ad applications:", err);
    } finally {
      setLoadingAds(false);
      setRefreshingAds(false);
    }
  };

  useEffect(() => {
    loadMerchants(true);
  }, [searchMerchant]);

  useEffect(() => {
    loadAds(true);
    setSelectedAppIds([]);
    setSelectAllPendingAcrossAllPages(false);
  }, [adStatusFilter]);

  useEffect(() => {
    if (activeSubTab === "applications") {
      loadCalendarData(currentCalendarMonth, selectedCalendarDate);
    }
  }, [activeSubTab]);

  const onRefresh = () => {
    if (activeSubTab === "manage") {
      setRefreshingMerchants(true);
      loadMerchants(true);
    } else {
      setRefreshingAds(true);
      loadAds(true);
      loadCalendarData(currentCalendarMonth, selectedCalendarDate);
    }
  };

  // ============================================================================
  // Calendar: Month Navigation & Date Selection
  // ============================================================================
  const handlePrevMonth = () => {
    const prev = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1);
    setCurrentCalendarMonth(prev);
    const newDateStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
    setSelectedCalendarDate(newDateStr);
    loadCalendarData(prev, newDateStr);
  };

  const handleNextMonth = () => {
    const next = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1);
    setCurrentCalendarMonth(next);
    const newDateStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
    setSelectedCalendarDate(newDateStr);
    loadCalendarData(next, newDateStr);
  };

  const handleJumpToToday = () => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = getTodayDateString();
    setCurrentCalendarMonth(month);
    setSelectedCalendarDate(todayStr);
    loadCalendarData(month, todayStr);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    loadDateDetails(dateStr);
  };

  // ============================================================================
  // Date-Specific Slot Controls: Manual Adjustment (+1 / -1) bounded strictly [0, 4]
  // ============================================================================
  const handleAdjustDailySlot = async (delta: number) => {
    const nextVal = selectedDateSlot.bookedSlots + delta;
    if (nextVal < 0 || nextVal > selectedDateSlot.totalCapacity) return;

    setUpdatingDailySlot(true);
    // Optimistic local update
    const updatedSlot: BannerDailySlot = {
      ...selectedDateSlot,
      bookedSlots: nextVal,
      availableSlots: selectedDateSlot.totalCapacity - nextVal,
      isFullyBooked: nextVal >= selectedDateSlot.totalCapacity,
      isPartiallyBooked: nextVal > 0 && nextVal < selectedDateSlot.totalCapacity,
      isFullyAvailable: nextVal === 0
    };
    setSelectedDateSlot(updatedSlot);
    setMonthSlotsMap((prev) => ({
      ...prev,
      [selectedCalendarDate]: {
        ...(prev[selectedCalendarDate] || updatedSlot),
        ...updatedSlot
      }
    }));

    try {
      const res = await AdminApi.updateDailyBookedSlots(selectedCalendarDate, delta);
      if (res.success && res.data) {
        setSelectedDateSlot(res.data);
        setMonthSlotsMap((prev) => ({
          ...prev,
          [selectedCalendarDate]: {
            ...(prev[selectedCalendarDate] || res.data!),
            ...res.data!
          }
        }));
      } else {
        // Rollback on failure
        loadDateDetails(selectedCalendarDate);
        Alert.alert("Slot Update Error", res.error || "Failed to update daily slot count.");
      }
    } catch (err: any) {
      loadDateDetails(selectedCalendarDate);
      Alert.alert("Slot Update Error", err?.message || "Failed to update daily slot count.");
    } finally {
      setUpdatingDailySlot(false);
    }
  };
  // ============================================================================
  // Legacy slot controls loader
  const loadSlotControls = async () => {
    try {
      const slots = await AdminApi.getSlotControls();
      setSlotControls(slots);
    } catch (err) {
      console.warn("Failed to load slot controls:", err);
    }
  };

  const handleAdjustSlots = async (delta: number) => {
    const nextVal = slotControls.bookedSlots + delta;
    if (nextVal < 0 || nextVal > slotControls.totalCapacity) return;

    setUpdatingSlots(true);
    // Optimistic UI update
    setSlotControls((prev) => ({
      ...prev,
      bookedSlots: nextVal,
      availableSlots: prev.totalCapacity - nextVal
    }));

    try {
      const res = await AdminApi.updateSlotControls(delta);
      if (res.success && res.data) {
        setSlotControls(res.data);
      } else {
        // Rollback on failure
        loadSlotControls();
        Alert.alert("Slot Update Error", res.error || "Failed to update slot count.");
      }
    } catch (err: any) {
      loadSlotControls();
      Alert.alert("Slot Update Error", err?.message || "Failed to update slot count.");
    } finally {
      setUpdatingSlots(false);
    }
  };

  // ============================================================================
  // Individual Application Review Actions
  // ============================================================================
  const handleApproveAd = async (app: SsmAdApplication) => {
    setProcessingAdId(app.id);
    try {
      const res = await AdminApi.reviewAdApplication(app.id, "approve");
      if (res.success) {
        const updater = (a: SsmAdApplication) =>
          a.id === app.id
            ? {
                ...a,
                status: (res.status as any) || "approved",
                uiStatus: "approved" as const,
                reviewedAt: new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              }
            : a;

        setAdApplications((prev) => prev.map(updater));
        setSelectedDateApps((prev) => prev.map(updater));
        loadCalendarData(currentCalendarMonth);
        if (selectedAd && selectedAd.id === app.id) setSelectedAd(null);
      } else {
        Alert.alert("Approval Blocked", res.error || "Unable to approve application.");
      }
    } catch (err: any) {
      Alert.alert("Approval Error", err?.message || "Error processing approval.");
    } finally {
      setProcessingAdId(null);
    }
  };

  const handleStartReviewAd = async (app: SsmAdApplication) => {
    setProcessingAdId(app.id);
    try {
      const res = await AdminApi.reviewAdApplication(app.id, "under_review");
      if (res.success) {
        const updater = (a: SsmAdApplication) =>
          a.id === app.id
            ? {
                ...a,
                status: "review_started" as const,
                uiStatus: "under_review" as const
              }
            : a;

        setAdApplications((prev) => prev.map(updater));
        setSelectedDateApps((prev) => prev.map(updater));
        if (selectedAd && selectedAd.id === app.id) setSelectedAd(null);
      } else {
        Alert.alert("Action Failed", res.error || "Could not move to Under Review.");
      }
    } catch (err: any) {
      Alert.alert("Action Error", err?.message || "Error starting review.");
    } finally {
      setProcessingAdId(null);
    }
  };

  const handleConfirmRejectAd = async () => {
    if (!rejectingAd) return;
    setProcessingAdId(rejectingAd.id);
    try {
      const res = await AdminApi.reviewAdApplication(
        rejectingAd.id,
        "reject",
        rejectionNotes.trim() || undefined
      );
      if (res.success) {
        const updater = (a: SsmAdApplication) =>
          a.id === rejectingAd.id
            ? {
                ...a,
                status: "rejected" as const,
                uiStatus: "rejected" as const,
                rejectionReason: rejectionNotes.trim() || "Declined by SSA Administrator",
                reviewedAt: new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              }
            : a;

        setAdApplications((prev) => prev.map(updater));
        setSelectedDateApps((prev) => prev.map(updater));
        loadCalendarData(currentCalendarMonth);
        if (selectedAd && selectedAd.id === rejectingAd.id) setSelectedAd(null);
        setRejectingAd(null);
        setRejectionNotes("");
      } else {
        Alert.alert("Rejection Failed", res.error || "Could not reject application.");
      }
    } catch (err: any) {
      Alert.alert("Rejection Error", err?.message || "Error rejecting application.");
    } finally {
      setProcessingAdId(null);
    }
  };

  // ============================================================================
  // Bulk Review Logic (Pending -> Under Review)
  // ============================================================================
  const pendingApps = adApplications.filter((a) => a.uiStatus === "pending");

  const toggleSelectApp = (id: string) => {
    setSelectAllPendingAcrossAllPages(false);
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPending = () => {
    if (selectAllPendingAcrossAllPages) {
      setSelectAllPendingAcrossAllPages(false);
      setSelectedAppIds([]);
    } else {
      setSelectAllPendingAcrossAllPages(true);
      setSelectedAppIds(pendingApps.map((a) => a.id));
    }
  };

  const handleExecuteBulkUnderReview = async () => {
    setBulkProcessing(true);
    try {
      const res = await AdminApi.bulkReviewUnderReview(
        selectedAppIds,
        selectAllPendingAcrossAllPages
      );
      if (res.success) {
        setShowBulkConfirmModal(false);
        setSelectedAppIds([]);
        setSelectAllPendingAcrossAllPages(false);
        // Refresh list
        loadAds(true);
      } else {
        Alert.alert("Bulk Action Failed", res.error || "Could not complete bulk review.");
      }
    } catch (err: any) {
      Alert.alert("Bulk Review Error", err?.message || "Error processing bulk review.");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filter Ads by local search term
  const filteredAds = adApplications.filter((ad) => {
    const term = searchAd.toLowerCase().trim();
    if (!term) return true;
    return (
      ad.shopName.toLowerCase().includes(term) ||
      ad.ownerName.toLowerCase().includes(term) ||
      ad.title.toLowerCase().includes(term) ||
      ad.id.toLowerCase().includes(term) ||
      ad.storeId.toLowerCase().includes(term) ||
      ad.state.toLowerCase().includes(term) ||
      (ad.paymentOrderId && ad.paymentOrderId.toLowerCase().includes(term))
    );
  });

  // Render Merchant Item (Manage Sub-Tab) - 100% Preserved
  const renderMerchantItem = ({ item }: { item: SsmMerchant }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
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

  // Render Ad Application Item (Applications Sub-Tab) - Displays all required 8 points
  const renderAdItem = ({ item }: { item: SsmAdApplication }) => {
    const isPending = item.uiStatus === "pending";
    const isUnderReview = item.uiStatus === "under_review";
    const isApproved = item.uiStatus === "approved";
    const isRejected = item.uiStatus === "rejected";

    const isSelected =
      selectAllPendingAcrossAllPages || selectedAppIds.includes(item.id);

    const badgeStyle = isPending
      ? { bg: colors.badgePendingBg, text: colors.badgePendingText, label: "Pending" }
      : isUnderReview
      ? { bg: colors.badgeReviewBg, text: colors.badgeReviewText, label: "Under Review" }
      : isApproved
      ? { bg: colors.badgeApprovedBg, text: colors.badgeApprovedText, label: "Approved" }
      : { bg: colors.badgeRejectedBg, text: colors.badgeRejectedText, label: "Rejected" };

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {/* Card Header: Shop Name & Owner Name + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isPending && (
              <TouchableOpacity
                style={styles.checkboxTouchArea}
                onPress={() => toggleSelectApp(item.id)}
                activeOpacity={0.7}
              >
                {isSelected ? (
                  <CheckSquare size={18} color={colors.accent} />
                ) : (
                  <Square size={18} color={colors.textSub} />
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.iconBox, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED" }]}>
              <Megaphone size={18} color="#EA580C" />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              {/* 2. Shop Name */}
              <Text style={[styles.storeName, { color: colors.textMain }]} numberOfLines={1}>
                {item.shopName}
              </Text>
              {/* 3. Owner Name */}
              <View style={styles.metaRow}>
                <User size={11} color={colors.textSub} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: colors.textSub, fontWeight: "700" }]}>
                  {item.ownerName}
                </Text>
                <Text style={[styles.dot, { color: colors.textSub }]}>•</Text>
                <MapPin size={11} color={colors.textSub} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: colors.textSub }]}>{item.state}</Text>
              </View>
            </View>
          </View>

          {/* 8. Application Status */}
          <View style={[styles.planBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.planText, { color: badgeStyle.text }]}>{badgeStyle.label}</Text>
          </View>
        </View>

        {/* 1. Banner Image */}
        {item.bannerUrl ? (
          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => setSelectedAd(item)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: item.bannerUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlayBadge}>
              <Eye size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.bannerOverlayText}>View Banner</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Headline / Campaign Title */}
        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: colors.textMain }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.adDescription, { color: colors.textSub }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>

        {/* 4. Duration, 5. Amount, 6. From Date, 7. To Date */}
        <View style={styles.metricsRow}>
          {/* Duration */}
          <View style={[styles.statBox, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
            <View style={styles.statIconRow}>
              <Calendar size={12} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={[styles.statLabel, { color: colors.textSub }]}>Duration</Text>
            </View>
            <Text style={[styles.statValueExpiry, { color: colors.textMain }]} numberOfLines={1}>
              {item.durationDays} {item.durationDays === 1 ? "Day" : "Days"}
            </Text>
            <Text style={[styles.statHint, { color: colors.textSub }]}>Campaign period</Text>
          </View>

          {/* Amount */}
          <View style={[styles.statBox, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
            <View style={styles.statIconRow}>
              <CreditCard size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={[styles.statLabel, { color: colors.textSub }]}>Amount</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textMain }]}>
              ₹{item.totalAmount}
            </Text>
            <Text style={[styles.statHint, { color: "#16A34A", fontWeight: "700" }]}>
              Paid & Verified
            </Text>
          </View>

          {/* From Date & To Date */}
          <View style={[styles.statBox, { flex: 1.4, backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
            <View style={styles.statIconRow}>
              <Clock size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={[styles.statLabel, { color: colors.textSub }]}>Advertising Schedule</Text>
            </View>
            <Text style={[styles.statScheduleDates, { color: colors.textMain }]} numberOfLines={1}>
              {item.startDate} → {item.endDate}
            </Text>
            <Text style={[styles.statHint, { color: colors.textSub }]}>
              Requested placement dates
            </Text>
          </View>
        </View>

        {/* Card Footer: Individual Review Actions */}
        <View style={[styles.adFooter, { backgroundColor: colors.statBoxBg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.inspectBtn, { borderColor: colors.border }]}
            onPress={() => setSelectedAd(item)}
            activeOpacity={0.7}
          >
            <Eye size={13} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.inspectBtnText, { color: colors.accent }]}>Full Details</Text>
          </TouchableOpacity>

          {(isPending || isUnderReview) && (
            <View style={styles.actionButtonGroup}>
              {/* Individual Move to Under Review (if currently pending) */}
              {isPending && (
                <TouchableOpacity
                  style={[styles.underReviewBtn, processingAdId === item.id && { opacity: 0.5 }]}
                  onPress={() => handleStartReviewAd(item)}
                  disabled={processingAdId === item.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.underReviewBtnText}>Review</Text>
                </TouchableOpacity>
              )}

              {/* Individual Reject Button */}
              <TouchableOpacity
                style={[styles.rejectBtn, processingAdId === item.id && { opacity: 0.5 }]}
                onPress={() => {
                  setRejectingAd(item);
                  setRejectionNotes("");
                }}
                disabled={processingAdId === item.id}
                activeOpacity={0.7}
              >
                <X size={13} color="#DC2626" style={{ marginRight: 3 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              {/* Individual Approve Button */}
              <TouchableOpacity
                style={[
                  styles.approveBtn,
                  (processingAdId === item.id || slotControls.availableSlots <= 0) && {
                    opacity: slotControls.availableSlots <= 0 ? 0.4 : 0.6
                  }
                ]}
                onPress={() => handleApproveAd(item)}
                disabled={processingAdId === item.id}
                activeOpacity={0.7}
              >
                <Check size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}

          {isApproved && (
            <View style={styles.reviewedRow}>
              <Check size={13} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={[styles.reviewedText, { color: "#16A34A", fontWeight: "700" }]}>
                Approved {item.reviewedAt !== "—" ? `• ${item.reviewedAt}` : ""}
              </Text>
            </View>
          )}

          {isRejected && (
            <View style={styles.reviewedRow}>
              <X size={13} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={[styles.reviewedText, { color: "#DC2626", fontWeight: "700" }]}>
                Rejected {item.rejectionReason ? `: ${item.rejectionReason}` : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 1. Top Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>
            {activeSubTab === "manage" ? "SSM – Merchant Stores" : "SSM – Home Banner Applications"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            {activeSubTab === "manage"
              ? `Total enrolled stores: ${totalMerchants}`
              : `Home banner advertising review console • Total: ${totalAds}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconBtn, { backgroundColor: colors.inputBg }]}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={15} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* 2. Exactly Two Sub-Tabs: Manage & Applications */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[
            styles.subTabBtn,
            { backgroundColor: activeSubTab === "manage" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setActiveSubTab("manage")}
          activeOpacity={0.8}
        >
          <Store
            size={14}
            color={activeSubTab === "manage" ? "#FFFFFF" : colors.textSub}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.subTabText,
              {
                color: activeSubTab === "manage" ? "#FFFFFF" : colors.textSub,
                fontWeight: activeSubTab === "manage" ? "800" : "600"
              }
            ]}
          >
            Manage ({totalMerchants})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabBtn,
            { backgroundColor: activeSubTab === "applications" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setActiveSubTab("applications")}
          activeOpacity={0.8}
        >
          <Megaphone
            size={14}
            color={activeSubTab === "applications" ? "#FFFFFF" : colors.textSub}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.subTabText,
              {
                color: activeSubTab === "applications" ? "#FFFFFF" : colors.textSub,
                fontWeight: activeSubTab === "applications" ? "800" : "600"
              }
            ]}
          >
            Applications ({totalAds})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================================== */}
      {/* 3. MANAGE SUB-TAB CONTENT (Preserved 100%)                             */}
      {/* ===================================================================== */}
      {activeSubTab === "manage" && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Search stores by name, phone or state..."
                placeholderTextColor={colors.textSub}
                value={searchMerchant}
                onChangeText={setSearchMerchant}
              />
            </View>
          </View>

          {loadingMerchants ? (
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
              renderItem={renderMerchantItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshingMerchants} onRefresh={onRefresh} tintColor={colors.accent} />
              }
            />
          )}
        </View>
      )}

      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* 4. APPLICATIONS SUB-TAB CONTENT                                       */}
      {/* ===================================================================== */}
      {activeSubTab === "applications" && (
        <View style={{ flex: 1 }}>
          {/* Applications View Switcher */}
          <View style={styles.viewModeSwitcher}>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                appsViewMode === "calendar" && { backgroundColor: colors.tabActiveBg }
              ]}
              onPress={() => setAppsViewMode("calendar")}
              activeOpacity={0.8}
            >
              <Calendar
                size={14}
                color={appsViewMode === "calendar" ? "#FFFFFF" : colors.textSub}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: appsViewMode === "calendar" ? "#FFFFFF" : colors.textSub }
                ]}
              >
                Advertising Calendar & Daily Slots
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                appsViewMode === "list" && { backgroundColor: colors.tabActiveBg }
              ]}
              onPress={() => setAppsViewMode("list")}
              activeOpacity={0.8}
            >
              <Megaphone
                size={14}
                color={appsViewMode === "list" ? "#FFFFFF" : colors.textSub}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: appsViewMode === "list" ? "#FFFFFF" : colors.textSub }
                ]}
              >
                All Applications ({totalAds})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ================================================================= */}
          {/* VIEW MODE 1: ADVERTISING CALENDAR & DATE-SPECIFIC SLOT MANAGEMENT */}
          {/* ================================================================= */}
          {appsViewMode === "calendar" && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshingAds} onRefresh={onRefresh} tintColor={colors.accent} />
              }
            >
              {/* Month Navigation & Calendar Card */}
              <View style={[styles.calendarCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {/* Month Navigation Bar */}
                <View style={styles.calendarMonthNavRow}>
                  <View style={styles.calendarMonthNavLeft}>
                    <TouchableOpacity
                      style={[styles.calendarNavBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                      onPress={handlePrevMonth}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={16} color={colors.textMain} />
                    </TouchableOpacity>

                    <Text style={[styles.calendarMonthTitle, { color: colors.textMain }]}>
                      {currentCalendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </Text>

                    <TouchableOpacity
                      style={[styles.calendarNavBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                      onPress={handleNextMonth}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={16} color={colors.textMain} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.calendarTodayBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={handleJumpToToday}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calendarTodayBtnText, { color: colors.accent }]}>Today</Text>
                  </TouchableOpacity>
                </View>

                {/* Calendar Legend Bar */}
                <View style={[styles.calendarLegendRow, { borderColor: colors.border }]}>
                  <View style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: "#10B981" }]} />
                    <Text style={[styles.calendarLegendText, { color: colors.textSub }]}>Available (4/4)</Text>
                  </View>
                  <View style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: "#F59E0B" }]} />
                    <Text style={[styles.calendarLegendText, { color: colors.textSub }]}>Partial (1-3 booked)</Text>
                  </View>
                  <View style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: "#EF4444" }]} />
                    <Text style={[styles.calendarLegendText, { color: colors.textSub }]}>Full (Locked)</Text>
                  </View>
                  <View style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: "#2563EB" }]} />
                    <Text style={[styles.calendarLegendText, { color: colors.textSub }]}>Scheduled Ads</Text>
                  </View>
                  <View style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: "#94A3B8" }]} />
                    <Text style={[styles.calendarLegendText, { color: colors.textSub }]}>Past Date</Text>
                  </View>
                </View>

                {/* Weekday Headers */}
                <View style={styles.calendarWeekdayRow}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w, idx) => (
                    <Text key={idx} style={[styles.calendarWeekdayText, { color: colors.textSub }]}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid of Days */}
                <View style={styles.calendarGrid}>
                  {(() => {
                    const year = currentCalendarMonth.getFullYear();
                    const month = currentCalendarMonth.getMonth();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const todayStr = getTodayDateString();

                    const cells = [];

                    for (let i = 0; i < firstDayIndex; i++) {
                      cells.push(<View key={`blank-${i}`} style={styles.calendarDayCellBlank} />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const slot = monthSlotsMap[dateStr] || {
                        date: dateStr,
                        totalCapacity: 4,
                        bookedSlots: 0,
                        availableSlots: 4,
                        scheduledAppsCount: 0,
                        isFullyBooked: false,
                        isPartiallyBooked: false,
                        isFullyAvailable: true
                      };

                      const isSelected = selectedCalendarDate === dateStr;
                      const isPast = dateStr < todayStr;
                      const isToday = dateStr === todayStr;

                      let badgeBg = isDark ? "#064E3B" : "#ECFDF5";
                      let badgeTextColor = isDark ? "#34D399" : "#059669";
                      let badgeLabel = `${slot.availableSlots} avail`;

                      if (slot.isFullyBooked) {
                        badgeBg = isDark ? "#450A0A" : "#FEE2E2";
                        badgeTextColor = isDark ? "#F87171" : "#DC2626";
                        badgeLabel = "Full";
                      } else if (slot.isPartiallyBooked) {
                        badgeBg = isDark ? "#451A03" : "#FEF3C7";
                        badgeTextColor = isDark ? "#FBBF24" : "#D97706";
                        badgeLabel = `${slot.bookedSlots}/4`;
                      }

                      cells.push(
                        <TouchableOpacity
                          key={dateStr}
                          style={[
                            styles.calendarDayCell,
                            { backgroundColor: colors.statBoxBg, borderColor: colors.border },
                            isSelected && {
                              borderColor: "#2563EB",
                              borderWidth: 2,
                              backgroundColor: isDark ? "#172554" : "#EFF6FF"
                            },
                            isPast && { opacity: 0.6 }
                          ]}
                          onPress={() => handleSelectDate(dateStr)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.calendarDayCellTop}>
                            <Text
                              style={[
                                styles.calendarDayNumber,
                                { color: colors.textMain },
                                isSelected && { color: "#2563EB", fontWeight: "900" },
                                isToday && { color: "#EA580C", fontWeight: "900" }
                              ]}
                            >
                              {day}
                            </Text>
                            {isToday && <View style={styles.todayIndicatorDot} />}
                          </View>

                          <View style={[styles.daySlotBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.daySlotBadgeText, { color: badgeTextColor }]}>
                              {badgeLabel}
                            </Text>
                          </View>

                          {slot.scheduledAppsCount > 0 && (
                            <View style={styles.scheduledAdsPill}>
                              <View style={styles.scheduledAdsDot} />
                              <Text style={styles.scheduledAdsText}>
                                {slot.scheduledAppsCount} ad{slot.scheduledAppsCount > 1 ? "s" : ""}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }

                    return cells;
                  })()}
                </View>
              </View>

              {/* Date-Specific Slot Controls Panel */}
              <View style={[styles.slotPanel, { backgroundColor: colors.slotBannerBg, borderColor: colors.slotBannerBorder }]}>
                <View style={styles.slotPanelHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Calendar size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.slotPanelTitle, { color: colors.textMain }]}>
                      Date Slot Controls: {selectedCalendarDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.slotStatusPill,
                      {
                        backgroundColor:
                          selectedDateSlot.availableSlots === 0 ? "#FEE2E2" : "#ECFDF5"
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotStatusPillText,
                        {
                          color:
                            selectedDateSlot.availableSlots === 0 ? "#DC2626" : "#059669"
                        }
                      ]}
                    >
                      {selectedDateSlot.availableSlots === 0
                        ? "Full Capacity • Locked"
                        : `${selectedDateSlot.availableSlots} Slots Available`}
                    </Text>
                  </View>
                </View>

                <View style={styles.slotControlsRow}>
                  {/* Total Capacity Display */}
                  <View style={[styles.slotMetricCard, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
                    <Text style={[styles.slotMetricLabel, { color: colors.textSub }]}>Total Capacity</Text>
                    <Text style={[styles.slotMetricValue, { color: colors.textMain }]}>
                      {selectedDateSlot.totalCapacity}
                    </Text>
                    <Text style={[styles.slotMetricSub, { color: colors.textSub }]}>Per-date max: 4</Text>
                  </View>

                  {/* Booked Slots with Manual + / - Stepper */}
                  <View style={[styles.slotMetricCard, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
                    <Text style={[styles.slotMetricLabel, { color: colors.textSub }]}>Booked Slots</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            opacity: selectedDateSlot.bookedSlots <= 0 || updatingDailySlot ? 0.35 : 1
                          }
                        ]}
                        onPress={() => handleAdjustDailySlot(-1)}
                        disabled={selectedDateSlot.bookedSlots <= 0 || updatingDailySlot}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={colors.textMain} />
                      </TouchableOpacity>

                      <Text style={[styles.slotMetricValue, { color: colors.textMain, marginHorizontal: 12 }]}>
                        {selectedDateSlot.bookedSlots}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            opacity:
                              selectedDateSlot.bookedSlots >= selectedDateSlot.totalCapacity || updatingDailySlot
                                ? 0.35
                                : 1
                          }
                        ]}
                        onPress={() => handleAdjustDailySlot(1)}
                        disabled={selectedDateSlot.bookedSlots >= selectedDateSlot.totalCapacity || updatingDailySlot}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={colors.textMain} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.slotMetricSub, { color: colors.textSub }]}>Manual admin control</Text>
                  </View>

                  {/* Available Slots Display */}
                  <View style={[styles.slotMetricCard, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
                    <Text style={[styles.slotMetricLabel, { color: colors.textSub }]}>Available Slots</Text>
                    <Text
                      style={[
                        styles.slotMetricValue,
                        { color: selectedDateSlot.availableSlots === 0 ? "#DC2626" : "#16A34A" }
                      ]}
                    >
                      {selectedDateSlot.availableSlots}
                    </Text>
                    <Text style={[styles.slotMetricSub, { color: colors.textSub }]}>Capacity - Booked</Text>
                  </View>
                </View>
              </View>

              {/* Date-Specific Applications Section */}
              <View style={styles.selectedDateSectionHeader}>
                <Text style={[styles.selectedDateSectionTitle, { color: colors.textMain }]}>
                  Scheduled Ads for {selectedCalendarDate}
                </Text>
                <View style={[styles.selectedDateCountBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.selectedDateCountText, { color: colors.textSub }]}>
                    {selectedDateApps.length} Application{selectedDateApps.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              {loadingDateApps ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.textSub, marginTop: 8 }]}>
                    Checking scheduled ads for {selectedCalendarDate}...
                  </Text>
                </View>
              ) : selectedDateApps.length === 0 ? (
                <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, marginHorizontal: 20, padding: 24, alignItems: "center" }]}>
                  <Calendar size={32} color={colors.textSub} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textMain, fontSize: 14 }]}>
                    No Applications on this Date
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSub, textAlign: "center" }]}>
                    No advertising campaigns are running or scheduled for {selectedCalendarDate}.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20 }}>
                  {selectedDateApps.map((item) => (
                    <React.Fragment key={item.id}>
                      {renderAdItem({ item })}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* ================================================================= */}
          {/* VIEW MODE 2: ALL APPLICATIONS REGISTRY & BULK REVIEW              */}
          {/* ================================================================= */}
          {appsViewMode === "list" && (
            <View style={{ flex: 1 }}>
              {/* Secondary Status Filter Tabs */}
              <View style={styles.filterTabBar}>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "pending", label: "Pending" },
                    { key: "under_review", label: "Under Review" },
                    { key: "approved", label: "Approved" },
                    { key: "rejected", label: "Rejected" }
                  ] as const
                ).map((tab) => {
                  const isActive = adStatusFilter === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.filterTabBtn,
                        {
                          backgroundColor: isActive ? colors.tabActiveBg : colors.tabInactiveBg
                        }
                      ]}
                      onPress={() => setAdStatusFilter(tab.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          {
                            color: isActive ? colors.tabActiveText : colors.tabInactiveText,
                            fontWeight: isActive ? "800" : "600"
                          }
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bulk Selection Toolbar (When Pending applications exist) */}
              {pendingApps.length > 0 && (
                <View style={[styles.bulkActionBar, { backgroundColor: colors.statBoxBg, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.bulkSelectAllBtn}
                    onPress={handleToggleSelectAllPending}
                    activeOpacity={0.7}
                  >
                    {selectAllPendingAcrossAllPages ? (
                      <CheckSquare size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    ) : (
                      <Square size={16} color={colors.textSub} style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.bulkSelectAllText, { color: colors.textMain }]}>
                      Select All Pending ({pendingApps.length})
                    </Text>
                  </TouchableOpacity>

                  {(selectedAppIds.length > 0 || selectAllPendingAcrossAllPages) && (
                    <View style={styles.bulkActionRight}>
                      <Text style={[styles.bulkSelectedCount, { color: colors.textSub }]}>
                        {selectAllPendingAcrossAllPages ? pendingApps.length : selectedAppIds.length} selected
                      </Text>

                      <TouchableOpacity
                        style={styles.bulkApplyBtn}
                        onPress={() => setShowBulkConfirmModal(true)}
                        activeOpacity={0.8}
                      >
                        <ShieldCheck size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.bulkApplyBtnText}>Bulk Action: Under Review</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Search Box */}
              <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textMain }]}
                    placeholder="Search by shop name, owner, title or ID..."
                    placeholderTextColor={colors.textSub}
                    value={searchAd}
                    onChangeText={setSearchAd}
                  />
                </View>
              </View>

              {/* Application List (Chronologically sorted by requested From Date) */}
              {loadingAds ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.textSub }]}>
                    Loading genuine advertising applications...
                  </Text>
                </View>
              ) : filteredAds.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Megaphone size={40} color={colors.textSub} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                    No advertising applications found
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSub, textAlign: "center" }]}>
                    Only genuine applications submitted through the SSM Home Banner Advertising flow appear here
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAds}
                  keyExtractor={(item) => item.id}
                  renderItem={renderAdItem}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl refreshing={refreshingAds} onRefresh={onRefresh} tintColor={colors.accent} />
                  }
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* ===================================================================== */}
      {/* 5. BULK REVIEW CONFIRMATION MODAL                                     */}
      {/* ===================================================================== */}
      {showBulkConfirmModal && (
        <Modal
          visible={showBulkConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBulkConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCardSmall, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <AlertTriangle size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    Confirm Bulk Review
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => setShowBulkConfirmModal(false)}
                >
                  <X size={15} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 18 }}>
                <Text style={[styles.confirmModalBodyText, { color: colors.textMain }]}>
                  Are you sure you want to move{" "}
                  <Text style={{ fontWeight: "800", color: colors.accent }}>
                    {selectAllPendingAcrossAllPages ? pendingApps.length : selectedAppIds.length}
                  </Text>{" "}
                  selected pending applications to <Text style={{ fontWeight: "800" }}>Under Review</Text>?
                </Text>
                <Text style={[styles.confirmModalSubText, { color: colors.textSub, marginTop: 8 }]}>
                  This updates only eligible Pending applications and preserves approved and rejected records.
                </Text>
              </View>

              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowBulkConfirmModal(false)}
                  disabled={bulkProcessing}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSub }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBulkBtn, bulkProcessing && { opacity: 0.5 }]}
                  onPress={handleExecuteBulkUnderReview}
                  disabled={bulkProcessing}
                >
                  {bulkProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.modalConfirmBulkBtnText}>Apply Under Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* 6. INDIVIDUAL REJECTION REASON MODAL                                  */}
      {/* ===================================================================== */}
      {rejectingAd && (
        <Modal
          visible={!!rejectingAd}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectingAd(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCardSmall, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    Reject Advertising Application
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.textSub }]}>
                    Shop: {rejectingAd.shopName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => setRejectingAd(null)}
                >
                  <X size={15} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 18 }}>
                <Text style={[styles.inputLabel, { color: colors.textSub }]}>
                  Rejection Reason / Administrative Remarks:
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                  ]}
                  placeholder="Enter specific reason for declining this banner advertisement..."
                  placeholderTextColor={colors.textSub}
                  value={rejectionNotes}
                  onChangeText={setRejectionNotes}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.confirmModalSubText, { color: colors.textSub, marginTop: 6 }]}>
                  The application record and submitted history will be preserved.
                </Text>
              </View>

              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setRejectingAd(null)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSub }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalRejectBtn}
                  onPress={handleConfirmRejectAd}
                  disabled={processingAdId === rejectingAd.id}
                >
                  <X size={14} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.modalRejectText}>Confirm Rejection</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* 7. FULL BANNER & APPLICATION DETAILS INSPECTION MODAL                 */}
      {/* ===================================================================== */}
      {selectedAd && (
        <Modal
          visible={!!selectedAd}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedAd(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border }
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    Banner Application Review
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.textSub }]}>
                    Application Ref: {selectedAd.id}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => setSelectedAd(null)}
                >
                  <X size={16} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* 1. Banner Image */}
                {selectedAd.bannerUrl ? (
                  <View style={styles.modalBannerWrapper}>
                    <Image
                      source={{ uri: selectedAd.bannerUrl }}
                      style={styles.modalBannerImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.openUrlBtn}
                      onPress={() => Linking.openURL(selectedAd.bannerUrl)}
                    >
                      <ExternalLink size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.openUrlText}>Open Full Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* 2. Shop Name, 3. Owner Name, 4. Duration, 5. Amount, 6. From Date, 7. To Date, 8. Status */}
                <View style={styles.modalDetailsSection}>
                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Shop Name</Text>
                    <Text style={[styles.detailVal, { color: colors.textMain }]}>{selectedAd.shopName}</Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Owner Name</Text>
                    <Text style={[styles.detailVal, { color: colors.textMain }]}>{selectedAd.ownerName}</Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Location</Text>
                    <Text style={[styles.detailVal, { color: colors.textMain }]}>{selectedAd.state}</Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Campaign Headline</Text>
                    <Text style={[styles.detailVal, { color: colors.textMain }]}>{selectedAd.title}</Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Requested Duration</Text>
                    <Text style={[styles.detailVal, { color: colors.textMain }]}>
                      {selectedAd.durationDays} {selectedAd.durationDays === 1 ? "Day" : "Days"}
                    </Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Requested From Date</Text>
                    <Text style={[styles.detailVal, { color: "#2563EB", fontWeight: "800" }]}>
                      {selectedAd.startDate}
                    </Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Requested To Date</Text>
                    <Text style={[styles.detailVal, { color: "#2563EB", fontWeight: "800" }]}>
                      {selectedAd.endDate}
                    </Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Amount Paid</Text>
                    <Text style={[styles.detailVal, { color: "#16A34A", fontWeight: "800" }]}>
                      ₹{selectedAd.totalAmount} (Cashfree Verified)
                    </Text>
                  </View>

                  <View style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Text style={[styles.detailKey, { color: colors.textSub }]}>Application Status</Text>
                    <Text
                      style={[
                        styles.detailVal,
                        {
                          color:
                            selectedAd.uiStatus === "approved"
                              ? "#16A34A"
                              : selectedAd.uiStatus === "rejected"
                              ? "#DC2626"
                              : selectedAd.uiStatus === "under_review"
                              ? "#2563EB"
                              : "#EA580C"
                        }
                      ]}
                    >
                      {selectedAd.uiStatus.toUpperCase()}
                    </Text>
                  </View>

                  {selectedAd.paymentOrderId ? (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Text style={[styles.detailKey, { color: colors.textSub }]}>Payment Order ID</Text>
                      <Text style={[styles.detailVal, { color: colors.textMain }]}>{selectedAd.paymentOrderId}</Text>
                    </View>
                  ) : null}

                  {selectedAd.ctaLink ? (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Text style={[styles.detailKey, { color: colors.textSub }]}>CTA Link</Text>
                      <Text style={[styles.detailVal, { color: "#2563EB" }]}>{selectedAd.ctaLink}</Text>
                    </View>
                  ) : null}

                  {selectedAd.adminNotes ? (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Text style={[styles.detailKey, { color: colors.textSub }]}>Admin Remarks</Text>
                      <Text style={[styles.detailVal, { color: colors.textSub }]}>{selectedAd.adminNotes}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              {/* Modal Actions */}
              {(selectedAd.uiStatus === "pending" || selectedAd.uiStatus === "under_review") && (
                <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.modalRejectBtn}
                    onPress={() => {
                      setRejectingAd(selectedAd);
                      setRejectionNotes("");
                    }}
                    disabled={processingAdId === selectedAd.id}
                  >
                    <X size={15} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.modalRejectText}>Reject Application</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalApproveBtn,
                      (processingAdId === selectedAd.id || slotControls.availableSlots <= 0) && {
                        opacity: 0.5
                      }
                    ]}
                    onPress={() => handleApproveAd(selectedAd)}
                    disabled={processingAdId === selectedAd.id}
                  >
                    <Check size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.modalApproveText}>Approve Banner</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10
  },
  subTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  subTabText: {
    fontSize: 13
  },
  slotPanel: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  slotPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  slotPanelTitle: {
    fontSize: 14,
    fontWeight: "800"
  },
  slotStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  slotStatusPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  slotControlsRow: {
    flexDirection: "row",
    gap: 10
  },
  slotMetricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  slotMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  slotMetricValue: {
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 4
  },
  slotMetricSub: {
    fontSize: 9
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  filterTabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 8,
    flexWrap: "wrap"
  },
  filterTabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  filterTabText: {
    fontSize: 12
  },
  bulkActionBar: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bulkSelectAllBtn: {
    flexDirection: "row",
    alignItems: "center"
  },
  bulkSelectAllText: {
    fontSize: 12,
    fontWeight: "700"
  },
  bulkActionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  bulkSelectedCount: {
    fontSize: 11,
    fontWeight: "600"
  },
  bulkApplyBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  bulkApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8
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
    padding: 12,
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
  checkboxTouchArea: {
    paddingRight: 8,
    paddingVertical: 4
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    fontWeight: "700"
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
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  statScheduleDates: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  statHint: {
    fontSize: 9,
    marginTop: 2
  },
  bannerContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
    height: 140,
    position: "relative",
    backgroundColor: "#000000"
  },
  bannerImage: {
    width: "100%",
    height: "100%"
  },
  bannerOverlayBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center"
  },
  bannerOverlayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  adContent: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 4
  },
  adTitle: {
    fontSize: 14,
    fontWeight: "800"
  },
  adDescription: {
    fontSize: 11,
    marginTop: 2
  },
  adFooter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  inspectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: "700"
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: 6
  },
  underReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  underReviewBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700"
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  rejectBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700"
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  reviewedRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  reviewedText: {
    fontSize: 11
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "90%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  modalCardSmall: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalBody: {
    padding: 16
  },
  modalBannerWrapper: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginBottom: 16,
    position: "relative"
  },
  modalBannerImage: {
    width: "100%",
    height: "100%"
  },
  openUrlBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center"
  },
  openUrlText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  modalDetailsSection: {
    gap: 8
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  detailKey: {
    fontSize: 12,
    fontWeight: "600"
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
    marginLeft: 12
  },
  modalFooterActions: {
    padding: 14,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },
  modalConfirmBulkBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalConfirmBulkBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  modalRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalRejectText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700"
  },
  modalApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalApproveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  confirmModalBodyText: {
    fontSize: 13,
    lineHeight: 18
  },
  confirmModalSubText: {
    fontSize: 11,
    lineHeight: 15
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    textAlignVertical: "top",
    minHeight: 70
  },
  // Applications view mode switcher styles
  viewModeSwitcher: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8
  },
  viewModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "transparent"
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },
  // Calendar card styles
  calendarCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  calendarMonthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  calendarMonthNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  calendarNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  calendarTodayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1
  },
  calendarTodayBtnText: {
    fontSize: 11,
    fontWeight: "700"
  },
  calendarLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 10
  },
  calendarLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  calendarLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  calendarLegendText: {
    fontSize: 10,
    fontWeight: "600"
  },
  calendarWeekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  calendarWeekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  calendarDayCellBlank: {
    width: "14.28%",
    height: 60
  },
  calendarDayCell: {
    width: "14.28%",
    minHeight: 64,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    justifyContent: "space-between"
  },
  calendarDayCellTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: "700"
  },
  todayIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EA580C"
  },
  daySlotBadge: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 2
  },
  daySlotBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center"
  },
  scheduledAdsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    gap: 3
  },
  scheduledAdsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB"
  },
  scheduledAdsText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#2563EB"
  },
  selectedDateSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8
  },
  selectedDateSectionTitle: {
    fontSize: 14,
    fontWeight: "800"
  },
  selectedDateCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  selectedDateCountText: {
    fontSize: 11,
    fontWeight: "700"
  }
});
