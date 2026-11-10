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
  Alert,
  Image
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
  Hash,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Store,
  Tag,
  Globe,
  TrendingUp,
  Layers,
  Sparkles,
  Check,
  Info
} from "lucide-react-native";
import { AdminApi, SscConsumer, SscBanner, SsmMerchant } from "../api/adminApi";

interface SscScreenProps {
  isDark?: boolean;
}

const PAGE_SIZE = 10;

const PROMO_CATEGORIES = [
  "Dining",
  "Grocery",
  "Electronics",
  "Beauty",
  "Wellness",
  "IT & Services",
  "Fashion"
];

export const SscScreen: React.FC<SscScreenProps> = ({ isDark = false }) => {
  // Main Sub-Tab State: 'consumers' vs 'banners'
  const [activeSubTab, setActiveSubTab] = useState<"consumers" | "banners">("consumers");

  // ============================================================================
  // 1. Consumers Sub-Tab State (100% Preserved)
  // ============================================================================
  const [consumers, setConsumers] = useState<SscConsumer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedConsumer, setSelectedConsumer] = useState<SscConsumer | null>(null);

  // ============================================================================
  // 2. Banners Sub-Tab State
  // ============================================================================
  const [banners, setBanners] = useState<SscBanner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [refreshingBanners, setRefreshingBanners] = useState(false);
  const [bannerSearch, setBannerSearch] = useState("");
  const [bannerStatusFilter, setBannerStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [bannerErrorMessage, setBannerErrorMessage] = useState<string | null>(null);

  // Available stores for link type 'store'
  const [availableStores, setAvailableStores] = useState<SsmMerchant[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Banner Create/Edit Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
    linkType: "none" | "store" | "deal" | "category" | "custom_url";
    targetId: string;
    targetName: string;
    customUrl: string;
    displayOrder: string;
    isActive: boolean;
    startDate: string;
    endDate: string;
  }>({
    title: "",
    subtitle: "",
    imageUrl: "",
    linkType: "none",
    targetId: "",
    targetName: "",
    customUrl: "",
    displayOrder: "0",
    isActive: true,
    startDate: "",
    endDate: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
        pillInactiveText: "#94A3B8",
        subTabActiveBg: "#EA580C",
        subTabActiveText: "#FFFFFF",
        subTabInactiveBg: "#1E293B",
        subTabInactiveText: "#94A3B8"
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
        pillInactiveText: "#64748B",
        subTabActiveBg: "#EA580C",
        subTabActiveText: "#FFFFFF",
        subTabInactiveBg: "#F1F5F9",
        subTabInactiveText: "#64748B"
      };

  // Debounce search input by 300ms for Consumers
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
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
    if (activeSubTab === "consumers") {
      loadConsumers();
    }
  }, [loadConsumers, activeSubTab]);

  // Load SSC Banners from Supabase
  const loadBanners = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshingBanners(true);
    } else {
      setLoadingBanners(true);
    }
    setBannerErrorMessage(null);

    try {
      const data = await AdminApi.getAllSscBanners();
      setBanners(data);
    } catch (err: any) {
      console.error("[SscScreen] Error fetching banners:", err);
      setBannerErrorMessage(err?.message || "Unable to load banners from backend.");
      setBanners([]);
    } finally {
      setLoadingBanners(false);
      setRefreshingBanners(false);
    }
  }, []);

  // Load available merchants/stores for linking
  const loadStores = useCallback(async () => {
    if (availableStores.length > 0) return;
    setLoadingStores(true);
    try {
      const res = await AdminApi.getMerchants(1, 100, "");
      setAvailableStores(res.merchants || []);
    } catch (err) {
      console.warn("[SscScreen] Could not load stores for banner dropdown:", err);
    } finally {
      setLoadingStores(false);
    }
  }, [availableStores.length]);

  useEffect(() => {
    if (activeSubTab === "banners") {
      loadBanners();
      loadStores();
    }
  }, [activeSubTab, loadBanners, loadStores]);

  const onGlobalRefresh = () => {
    if (activeSubTab === "consumers") {
      loadConsumers(false, true);
    } else {
      loadBanners(true);
    }
  };

  // ============================================================================
  // Consumers Handlers & Renderers
  // ============================================================================
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

  // ============================================================================
  // Banners Handlers & Operations
  // ============================================================================
  const filteredBanners = banners.filter((b) => {
    if (bannerStatusFilter === "active" && !b.isActive) return false;
    if (bannerStatusFilter === "inactive" && b.isActive) return false;
    if (bannerSearch.trim()) {
      const q = bannerSearch.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchSub = (b.subtitle || "").toLowerCase().includes(q);
      const matchTarget = (b.targetName || b.targetId || "").toLowerCase().includes(q);
      return matchTitle || matchSub || matchTarget;
    }
    return true;
  });

  const openCreateBannerModal = () => {
    setEditingBannerId(null);
    setFormErrors({});
    const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.displayOrder)) + 1 : 0;
    setBannerForm({
      title: "",
      subtitle: "",
      imageUrl: "",
      linkType: "none",
      targetId: "",
      targetName: "",
      customUrl: "",
      displayOrder: String(nextOrder),
      isActive: true,
      startDate: "",
      endDate: ""
    });
    setIsBannerModalOpen(true);
  };

  const openEditBannerModal = (banner: SscBanner) => {
    setEditingBannerId(banner.id);
    setFormErrors({});
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl,
      linkType: banner.linkType || "none",
      targetId: banner.targetId || "",
      targetName: banner.targetName || "",
      customUrl: banner.customUrl || "",
      displayOrder: String(banner.displayOrder),
      isActive: banner.isActive,
      startDate: banner.startDate ? banner.startDate.substring(0, 10) : "",
      endDate: banner.endDate ? banner.endDate.substring(0, 10) : ""
    });
    setIsBannerModalOpen(true);
  };

  const handleToggleBannerStatus = async (banner: SscBanner) => {
    const updatedStatus = !banner.isActive;
    // Optimistic UI update
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, isActive: updatedStatus } : b))
    );

    const success = await AdminApi.toggleSscBannerStatus(banner.id, updatedStatus);
    if (!success) {
      // Revert if error
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: banner.isActive } : b))
      );
      Alert.alert("Status Update Failed", "Unable to update banner status in Supabase.");
    }
  };

  const handleDeleteBanner = (banner: SscBanner) => {
    const confirmAction = async () => {
      const prevList = [...banners];
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));

      const success = await AdminApi.deleteSscBanner(banner.id);
      if (!success) {
        setBanners(prevList);
        Alert.alert("Delete Failed", "Unable to delete banner from database.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete banner "${banner.title}"?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Confirm Banner Deletion",
        `Are you sure you want to delete banner "${banner.title}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmAction }
        ]
      );
    }
  };

  const validateBannerForm = () => {
    const errors: Record<string, string> = {};
    if (!bannerForm.title.trim()) {
      errors.title = "Banner title is required.";
    }
    if (!bannerForm.imageUrl.trim()) {
      errors.imageUrl = "Banner image URL is required.";
    } else if (
      !bannerForm.imageUrl.startsWith("http://") &&
      !bannerForm.imageUrl.startsWith("https://")
    ) {
      errors.imageUrl = "Image URL must start with http:// or https://";
    }

    if (bannerForm.linkType === "store" && !bannerForm.targetId.trim()) {
      errors.targetId = "Please select or specify a target store.";
    }

    if (bannerForm.linkType === "custom_url") {
      if (!bannerForm.customUrl.trim()) {
        errors.customUrl = "Please provide an external URL.";
      } else if (
        !bannerForm.customUrl.startsWith("http://") &&
        !bannerForm.customUrl.startsWith("https://")
      ) {
        errors.customUrl = "URL must start with http:// or https://";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBanner = async () => {
    if (!validateBannerForm()) return;

    setSavingBanner(true);
    try {
      const orderNum = parseInt(bannerForm.displayOrder, 10);
      const payload: Partial<SscBanner> = {
        id: editingBannerId || undefined,
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || undefined,
        imageUrl: bannerForm.imageUrl.trim(),
        linkType: bannerForm.linkType,
        targetId: bannerForm.targetId.trim() || undefined,
        targetName: bannerForm.targetName.trim() || undefined,
        customUrl: bannerForm.customUrl.trim() || undefined,
        displayOrder: isNaN(orderNum) ? 0 : orderNum,
        isActive: bannerForm.isActive,
        startDate: bannerForm.startDate ? new Date(bannerForm.startDate).toISOString() : null,
        endDate: bannerForm.endDate ? new Date(`${bannerForm.endDate}T23:59:59Z`).toISOString() : null
      };

      const res = await AdminApi.saveSscBanner(payload);
      if (res.success) {
        setIsBannerModalOpen(false);
        loadBanners();
      } else {
        Alert.alert("Save Error", res.error || "Could not save banner.");
      }
    } catch (err: any) {
      Alert.alert("Save Error", err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ===================================================================== */}
      {/* 1. TOP HEADER                                                         */}
      {/* ===================================================================== */}
      <View style={[styles.topBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.topBarTitle, { color: colors.textMain }]}>
              {activeSubTab === "consumers" ? "SSC – Consumer Directory" : "SSC – Promotional Banners"}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.greenPulse} />
              <Text style={styles.liveIndicatorText}>LIVE SUPABASE</Text>
            </View>
          </View>
          <Text style={[styles.topBarSub, { color: colors.textSub }]}>
            {activeSubTab === "consumers"
              ? loading
                ? "Querying database..."
                : `Verified database records: ${total} consumers`
              : `Dynamic Carousel & Banner Management • Total: ${banners.length} banners`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={onGlobalRefresh}
          disabled={loading || refreshing || loadingBanners || refreshingBanners}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={colors.accent} />
          <Text style={[styles.refreshBtnText, { color: colors.accent }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================================== */}
      {/* 2. SUB-TAB NAVIGATION (Consumers vs Banners)                         */}
      {/* ===================================================================== */}
      <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.subTabBtn,
            {
              backgroundColor: activeSubTab === "consumers" ? colors.subTabActiveBg : colors.subTabInactiveBg
            }
          ]}
          onPress={() => setActiveSubTab("consumers")}
          activeOpacity={0.8}
        >
          <UserCheck
            size={14}
            color={activeSubTab === "consumers" ? "#FFFFFF" : colors.textSub}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.subTabText,
              {
                color: activeSubTab === "consumers" ? "#FFFFFF" : colors.textSub,
                fontWeight: activeSubTab === "consumers" ? "800" : "600"
              }
            ]}
          >
            Consumers ({total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabBtn,
            {
              backgroundColor: activeSubTab === "banners" ? colors.subTabActiveBg : colors.subTabInactiveBg
            }
          ]}
          onPress={() => setActiveSubTab("banners")}
          activeOpacity={0.8}
        >
          <Sparkles
            size={14}
            color={activeSubTab === "banners" ? "#FFFFFF" : colors.textSub}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.subTabText,
              {
                color: activeSubTab === "banners" ? "#FFFFFF" : colors.textSub,
                fontWeight: activeSubTab === "banners" ? "800" : "600"
              }
            ]}
          >
            Banners ({banners.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================================== */}
      {/* 3. CONSUMERS SUB-TAB CONTENT (100% Preserved)                         */}
      {/* ===================================================================== */}
      {activeSubTab === "consumers" && (
        <View style={{ flex: 1 }}>
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
        </View>
      )}

      {/* ===================================================================== */}
      {/* 4. BANNERS SUB-TAB CONTENT                                            */}
      {/* ===================================================================== */}
      {activeSubTab === "banners" && (
        <View style={{ flex: 1 }}>
          {/* Banner Controls & Actions */}
          <View style={[styles.controlsBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={15} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Search banners by title, subtitle, or target..."
                placeholderTextColor={colors.textSub}
                value={bannerSearch}
                onChangeText={setBannerSearch}
                autoCapitalize="none"
              />
              {bannerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBannerSearch("")} style={{ padding: 4 }}>
                  <X size={14} color={colors.textSub} />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Filter Tabs & Create Button */}
            <View style={styles.bannerActionsRow}>
              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        bannerStatusFilter === "all" ? colors.pillActiveBg : colors.pillInactiveBg
                    }
                  ]}
                  onPress={() => setBannerStatusFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          bannerStatusFilter === "all" ? colors.pillActiveText : colors.pillInactiveText
                      }
                    ]}
                  >
                    All ({banners.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        bannerStatusFilter === "active" ? colors.pillActiveBg : colors.pillInactiveBg
                    }
                  ]}
                  onPress={() => setBannerStatusFilter("active")}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          bannerStatusFilter === "active" ? colors.pillActiveText : colors.pillInactiveText
                      }
                    ]}
                  >
                    Active ({banners.filter((b) => b.isActive).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        bannerStatusFilter === "inactive" ? colors.pillActiveBg : colors.pillInactiveBg
                    }
                  ]}
                  onPress={() => setBannerStatusFilter("inactive")}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          bannerStatusFilter === "inactive" ? colors.pillActiveText : colors.pillInactiveText
                      }
                    ]}
                  >
                    Inactive ({banners.filter((b) => !b.isActive).length})
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.createBannerBtn, { backgroundColor: colors.accent }]}
                onPress={openCreateBannerModal}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createBannerBtnText}>New Banner</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner List */}
          {loadingBanners ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.statusTitle, { color: colors.textMain, marginTop: 14 }]}>
                Loading Promotional Banners...
              </Text>
              <Text style={[styles.statusSub, { color: colors.textSub }]}>
                Connecting to public.ssc_banners table
              </Text>
            </View>
          ) : bannerErrorMessage ? (
            <View style={styles.centerBox}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={32} color="#DC2626" />
              </View>
              <Text style={[styles.statusTitle, { color: colors.textMain }]}>Unable to load banners</Text>
              <Text style={[styles.statusSub, { color: colors.textSub }]}>{bannerErrorMessage}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadBanners()}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : filteredBanners.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                <Sparkles size={30} color={colors.textSub} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.textMain }]}>No promotional banners found</Text>
              <Text style={[styles.statusSub, { color: colors.textSub }]}>
                {banners.length === 0
                  ? "Create your first SSC promotional banner to display in the consumer app top deals carousel."
                  : "No banners match your current search/filter."}
              </Text>
              <TouchableOpacity
                style={[styles.createBannerBtn, { backgroundColor: colors.accent, marginTop: 14 }]}
                onPress={openCreateBannerModal}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createBannerBtnText}>Create First Banner</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.bannerListContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingBanners}
                  onRefresh={() => loadBanners(true)}
                  tintColor={colors.accent}
                />
              }
            >
              <View style={styles.bannerGrid}>
                {filteredBanners.map((item) => {
                  const ctr =
                    item.impressionsCount > 0
                      ? ((item.clicksCount / item.impressionsCount) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.bannerCard,
                        {
                          backgroundColor: colors.cardBg,
                          borderColor: item.isActive ? colors.accent : colors.border
                        }
                      ]}
                    >
                      {/* Banner Image Preview Container */}
                      <View style={styles.bannerImageWrapper}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.bannerImage}
                          resizeMode="cover"
                        />
                        <View style={styles.bannerBadgeOverlay}>
                          <View
                            style={[
                              styles.orderBadge,
                              { backgroundColor: "rgba(15, 23, 42, 0.85)" }
                            ]}
                          >
                            <Text style={styles.orderBadgeText}>Order #{item.displayOrder}</Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadgeSmall,
                              {
                                backgroundColor: item.isActive ? "#059669" : "#64748B"
                              }
                            ]}
                          >
                            <Text style={styles.statusBadgeSmallText}>
                              {item.isActive ? "ACTIVE" : "INACTIVE"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Banner Card Content */}
                      <View style={styles.bannerCardContent}>
                        <View style={styles.bannerHeaderRow}>
                          <Text
                            style={[styles.bannerTitleText, { color: colors.textMain }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                        </View>

                        {item.subtitle ? (
                          <Text
                            style={[styles.bannerSubtitleText, { color: colors.textSub }]}
                            numberOfLines={2}
                          >
                            {item.subtitle}
                          </Text>
                        ) : null}

                        {/* Link Destination Pill */}
                        <View style={styles.bannerDestRow}>
                          {item.linkType === "store" ? (
                            <View style={[styles.destPill, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
                              <Store size={11} color="#EA580C" style={{ marginRight: 4 }} />
                              <Text style={[styles.destPillText, { color: "#EA580C" }]} numberOfLines={1}>
                                Store: {item.targetName || item.targetId || "Store Link"}
                              </Text>
                            </View>
                          ) : item.linkType === "category" ? (
                            <View style={[styles.destPill, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
                              <Tag size={11} color="#2563EB" style={{ marginRight: 4 }} />
                              <Text style={[styles.destPillText, { color: "#2563EB" }]}>
                                Category: {item.targetId || "Featured"}
                              </Text>
                            </View>
                          ) : item.linkType === "custom_url" ? (
                            <View style={[styles.destPill, { backgroundColor: "#F5F3FF", borderColor: "#EDE9FE" }]}>
                              <Globe size={11} color="#7C3AED" style={{ marginRight: 4 }} />
                              <Text style={[styles.destPillText, { color: "#7C3AED" }]} numberOfLines={1}>
                                URL: {item.customUrl}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.destPill, { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}>
                              <Info size={11} color="#64748B" style={{ marginRight: 4 }} />
                              <Text style={[styles.destPillText, { color: "#64748B" }]}>
                                Info Only (No Link)
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Schedule & Analytics Row */}
                        <View style={[styles.analyticsRow, { backgroundColor: colors.metaBoxBg, borderColor: colors.border }]}>
                          <View style={styles.metricCol}>
                            <Text style={[styles.metricLabel, { color: colors.textSub }]}>Clicks</Text>
                            <Text style={[styles.metricValue, { color: colors.textMain }]}>
                              {item.clicksCount}
                            </Text>
                          </View>
                          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                          <View style={styles.metricCol}>
                            <Text style={[styles.metricLabel, { color: colors.textSub }]}>Impressions</Text>
                            <Text style={[styles.metricValue, { color: colors.textMain }]}>
                              {item.impressionsCount}
                            </Text>
                          </View>
                          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                          <View style={styles.metricCol}>
                            <Text style={[styles.metricLabel, { color: colors.textSub }]}>CTR</Text>
                            <Text style={[styles.metricValue, { color: "#EA580C" }]}>{ctr}%</Text>
                          </View>
                        </View>

                        {/* Validity Dates */}
                        <View style={styles.validityRow}>
                          <Calendar size={11} color={colors.textSub} style={{ marginRight: 4 }} />
                          <Text style={[styles.validityText, { color: colors.textSub }]}>
                            {item.startDate || item.endDate
                              ? `${item.startDate ? item.startDate.substring(0, 10) : "Start"} → ${
                                  item.endDate ? item.endDate.substring(0, 10) : "Continuous"
                                }`
                              : "Always Active"}
                          </Text>
                        </View>

                        {/* Action Buttons Row */}
                        <View style={[styles.bannerActionsBottom, { borderTopColor: colors.border }]}>
                          <TouchableOpacity
                            style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                            onPress={() => handleToggleBannerStatus(item)}
                            activeOpacity={0.7}
                          >
                            {item.isActive ? (
                              <>
                                <EyeOff size={13} color={colors.textSub} style={{ marginRight: 4 }} />
                                <Text style={[styles.bannerActionBtnText, { color: colors.textSub }]}>
                                  Deactivate
                                </Text>
                              </>
                            ) : (
                              <>
                                <Eye size={13} color="#059669" style={{ marginRight: 4 }} />
                                <Text style={[styles.bannerActionBtnText, { color: "#059669" }]}>
                                  Activate
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                            onPress={() => openEditBannerModal(item)}
                            activeOpacity={0.7}
                          >
                            <Edit3 size={13} color={colors.accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.bannerActionBtnText, { color: colors.accent }]}>
                              Edit
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                            onPress={() => handleDeleteBanner(item)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={13} color="#DC2626" style={{ marginRight: 4 }} />
                            <Text style={[styles.bannerActionBtnText, { color: "#DC2626" }]}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ===================================================================== */}
      {/* 5. CREATE / EDIT BANNER MODAL                                         */}
      {/* ===================================================================== */}
      <Modal
        visible={isBannerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBannerModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.bannerModalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                  {editingBannerId ? "Edit Promotional Banner" : "Create New Promotional Banner"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsBannerModalOpen(false)}
              >
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Image Preview Box */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Banner Image URL <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: formErrors.imageUrl ? "#DC2626" : colors.border,
                      color: colors.textMain
                    }
                  ]}
                  placeholder="https://images.unsplash.com/... or storage URL"
                  placeholderTextColor={colors.textSub}
                  value={bannerForm.imageUrl}
                  onChangeText={(val) => {
                    setBannerForm((prev) => ({ ...prev, imageUrl: val }));
                    if (formErrors.imageUrl) setFormErrors((e) => ({ ...e, imageUrl: "" }));
                  }}
                  autoCapitalize="none"
                />
                {formErrors.imageUrl ? (
                  <Text style={styles.formErrorText}>{formErrors.imageUrl}</Text>
                ) : null}

                {/* Live Preview */}
                {bannerForm.imageUrl.trim().length > 5 ? (
                  <View style={styles.formImagePreviewWrapper}>
                    <Text style={[styles.previewHeading, { color: colors.textSub }]}>Live Preview:</Text>
                    <Image
                      source={{ uri: bannerForm.imageUrl.trim() }}
                      style={styles.formImagePreview}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>

              {/* Title & Subtitle */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Banner Title <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: formErrors.title ? "#DC2626" : colors.border,
                      color: colors.textMain
                    }
                  ]}
                  placeholder="e.g., Weekend Mega Sale, 50% Off Electronics"
                  placeholderTextColor={colors.textSub}
                  value={bannerForm.title}
                  onChangeText={(val) => {
                    setBannerForm((prev) => ({ ...prev, title: val }));
                    if (formErrors.title) setFormErrors((e) => ({ ...e, title: "" }));
                  }}
                />
                {formErrors.title ? (
                  <Text style={styles.formErrorText}>{formErrors.title}</Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Subtitle / Description</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      color: colors.textMain
                    }
                  ]}
                  placeholder="e.g., Exclusive voucher discounts at your local favorite shops."
                  placeholderTextColor={colors.textSub}
                  value={bannerForm.subtitle}
                  onChangeText={(val) => setBannerForm((prev) => ({ ...prev, subtitle: val }))}
                />
              </View>

              {/* Link Action / Destination Type */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Click Action / Destination</Text>
                <View style={styles.linkTypeRow}>
                  {[
                    { id: "none", label: "None (Info)", icon: Info },
                    { id: "store", label: "Store", icon: Store },
                    { id: "category", label: "Category", icon: Tag },
                    { id: "custom_url", label: "Web URL", icon: Globe }
                  ].map((lt) => {
                    const isSelected = bannerForm.linkType === lt.id;
                    const IconComp = lt.icon;
                    return (
                      <TouchableOpacity
                        key={lt.id}
                        style={[
                          styles.linkTypeOption,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.inputBg,
                            borderColor: isSelected ? colors.accent : colors.border
                          }
                        ]}
                        onPress={() =>
                          setBannerForm((prev) => ({
                            ...prev,
                            linkType: lt.id as any
                          }))
                        }
                        activeOpacity={0.8}
                      >
                        <IconComp size={13} color={isSelected ? "#FFFFFF" : colors.textSub} style={{ marginRight: 5 }} />
                        <Text
                          style={[
                            styles.linkTypeOptionText,
                            { color: isSelected ? "#FFFFFF" : colors.textSub }
                          ]}
                        >
                          {lt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Contextual Target Inputs */}
              {bannerForm.linkType === "store" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    Select Target Store <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  {availableStores.length > 0 ? (
                    <View style={styles.storePickerList}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                      >
                        {availableStores.map((s) => {
                          const isPicked = bannerForm.targetId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[
                                styles.storeChip,
                                {
                                  backgroundColor: isPicked ? "#EA580C" : colors.inputBg,
                                  borderColor: isPicked ? "#EA580C" : colors.border
                                }
                              ]}
                              onPress={() =>
                                setBannerForm((prev) => ({
                                  ...prev,
                                  targetId: s.id,
                                  targetName: s.storeName
                                }))
                              }
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.storeChipText,
                                  { color: isPicked ? "#FFFFFF" : colors.textMain }
                                ]}
                              >
                                {s.storeName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}

                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: formErrors.targetId ? "#DC2626" : colors.border,
                        color: colors.textMain,
                        marginTop: 6
                      }
                    ]}
                    placeholder="Store ID (or click a store above)"
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.targetId}
                    onChangeText={(val) => {
                      setBannerForm((prev) => ({ ...prev, targetId: val, targetName: val }));
                      if (formErrors.targetId) setFormErrors((e) => ({ ...e, targetId: "" }));
                    }}
                  />
                  {formErrors.targetId ? (
                    <Text style={styles.formErrorText}>{formErrors.targetId}</Text>
                  ) : null}
                </View>
              )}

              {bannerForm.linkType === "category" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Target Category</Text>
                  <View style={styles.categoryChipsWrap}>
                    {PROMO_CATEGORIES.map((cat) => {
                      const isPicked = bannerForm.targetId === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: isPicked ? "#EA580C" : colors.inputBg,
                              borderColor: isPicked ? "#EA580C" : colors.border
                            }
                          ]}
                          onPress={() =>
                            setBannerForm((prev) => ({
                              ...prev,
                              targetId: cat,
                              targetName: cat
                            }))
                          }
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: isPicked ? "#FFFFFF" : colors.textMain }
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {bannerForm.linkType === "custom_url" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    External Destination URL <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: formErrors.customUrl ? "#DC2626" : colors.border,
                        color: colors.textMain
                      }
                    ]}
                    placeholder="https://smartshopper.in/promo..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.customUrl}
                    onChangeText={(val) => {
                      setBannerForm((prev) => ({ ...prev, customUrl: val }));
                      if (formErrors.customUrl) setFormErrors((e) => ({ ...e, customUrl: "" }));
                    }}
                    autoCapitalize="none"
                  />
                  {formErrors.customUrl ? (
                    <Text style={styles.formErrorText}>{formErrors.customUrl}</Text>
                  ) : null}
                </View>
              )}

              {/* Display Order & Active Toggle */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Display Order #</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain
                      }
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.displayOrder}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, displayOrder: val }))}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.formHint, { color: colors.textSub }]}>Lower appears first (0, 1, 2...)</Text>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.activeToggleBtn,
                      {
                        backgroundColor: bannerForm.isActive ? "#059669" : colors.inputBg,
                        borderColor: bannerForm.isActive ? "#059669" : colors.border
                      }
                    ]}
                    onPress={() =>
                      setBannerForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                    }
                    activeOpacity={0.8}
                  >
                    {bannerForm.isActive ? (
                      <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    ) : (
                      <X size={14} color={colors.textSub} style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.activeToggleBtnText,
                        { color: bannerForm.isActive ? "#FFFFFF" : colors.textSub }
                      ]}
                    >
                      {bannerForm.isActive ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.formHint, { color: colors.textSub }]}>Live on SSC Carousel</Text>
                </View>
              </View>

              {/* Scheduling Dates (Optional) */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Start Date (Optional)</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain
                      }
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.startDate}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, startDate: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>End Date (Optional)</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain
                      }
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.endDate}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, endDate: val }))}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { borderColor: colors.border }]}
                onPress={() => setIsBannerModalOpen(false)}
                disabled={savingBanner}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.textSub }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveBanner}
                disabled={savingBanner}
                activeOpacity={0.8}
              >
                {savingBanner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.saveModalBtnText}>
                  {savingBanner ? "Saving..." : editingBannerId ? "Update Banner" : "Save Banner"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. CONSUMER PROFILE MODAL (100% Preserved)                           */}
      {/* ===================================================================== */}
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
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginLeft: 10
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 4
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5
  },
  topBarSub: {
    fontSize: 12,
    marginTop: 2
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6
  },

  /* Sub-tab navigation bar */
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10
  },
  subTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  subTabText: {
    fontSize: 13
  },

  controlsBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700"
  },

  /* Banner Controls & Actions */
  bannerActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  createBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  createBannerBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center"
  },
  statusSub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 380
  },
  errorIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },

  /* Consumer List Cards */
  listContainer: {
    padding: 16,
    gap: 12
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  avatarText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800"
  },
  headerTitleCol: {
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
    gap: 6
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center"
  },
  locationText: {
    fontSize: 10,
    fontWeight: "500"
  },
  headerRight: {
    alignItems: "flex-end"
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  divider: {
    height: 1,
    marginVertical: 10
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  contactValue: {
    fontSize: 11,
    fontWeight: "600"
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    padding: 8,
    borderRadius: 8
  },
  dateCol: {
    flex: 1
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: "700"
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "600"
  },

  /* Pagination */
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4
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
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 4
  },
  pageInfoText: {
    fontSize: 11,
    fontWeight: "600"
  },

  /* ========================================================================= */
  /* Banner Cards Grid & List Styling                                          */
  /* ========================================================================= */
  bannerListContainer: {
    padding: 16
  },
  bannerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  bannerCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  bannerImageWrapper: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: "#0F172A"
  },
  bannerImage: {
    width: "100%",
    height: "100%"
  },
  bannerBadgeOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  orderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  orderBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800"
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeSmallText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  bannerCardContent: {
    padding: 14
  },
  bannerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  bannerTitleText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    flex: 1
  },
  bannerSubtitleText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4
  },
  bannerDestRow: {
    marginTop: 8
  },
  destPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  destPillText: {
    fontSize: 10,
    fontWeight: "700"
  },
  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10
  },
  metricCol: {
    alignItems: "center",
    flex: 1
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "700"
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2
  },
  metricDivider: {
    width: 1,
    height: 20
  },
  validityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  validityText: {
    fontSize: 10,
    fontWeight: "600"
  },
  bannerActionsBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 8
  },
  bannerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  bannerActionBtnText: {
    fontSize: 11,
    fontWeight: "700"
  },

  /* ========================================================================= */
  /* Banner Modal Form Styling                                                 */
  /* ========================================================================= */
  bannerModalCard: {
    width: "92%",
    maxWidth: 620,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"
  },
  formGroup: {
    marginBottom: 12
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 13
  },
  formHint: {
    fontSize: 10,
    marginTop: 3
  },
  formErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 3
  },
  formImagePreviewWrapper: {
    marginTop: 8
  },
  previewHeading: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4
  },
  formImagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#0F172A"
  },
  linkTypeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap"
  },
  linkTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  linkTypeOptionText: {
    fontSize: 11,
    fontWeight: "700"
  },
  storePickerList: {
    marginBottom: 4
  },
  storeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1
  },
  storeChipText: {
    fontSize: 11,
    fontWeight: "700"
  },
  categoryChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "700"
  },
  formRowTwoCol: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  activeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 12
  },
  activeToggleBtnText: {
    fontSize: 12,
    fontWeight: "800"
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },
  saveModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8
  },
  saveModalBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },

  /* Consumer Details Modal (Preserved) */
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    width: "92%",
    maxWidth: 580,
    maxHeight: "88%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  modalCloseBtn: {
    padding: 4
  },
  modalScrollContent: {
    padding: 18
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16
  },
  modalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center"
  },
  modalAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  },
  modalName: {
    fontSize: 16,
    fontWeight: "800"
  },
  modalUsername: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2
  },
  modalPassPill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1
  },
  modalPassText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EA580C"
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6
  },
  infoBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  infoKey: {
    fontSize: 9,
    fontWeight: "700"
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1
  },
  systemMetadataBox: {
    padding: 10,
    alignItems: "center",
    marginBottom: 8
  },
  systemMetaText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  },
  closeModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  }
});
