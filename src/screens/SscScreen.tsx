import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Info,
  Map,
  Compass,
  Radio,
  FileText
} from "lucide-react-native";
import {
  AdminApi,
  SscConsumer,
  SscBanner,
  SsmMerchant,
  ApprovedSsmBannerItem
} from "../api/adminApi";

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

const TARGET_STATES = [
  "Kerala",
  "Tamil Nadu",
  "Karnataka",
  "Maharashtra",
  "Delhi",
  "Andhra Pradesh",
  "Telangana",
  "All India"
];

// Helper: Format ISO date string into Indian Standard Time (IST) readable format
function formatIST(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "—";
  }
}

// Helper: Format Date for datetime-local input YYYY-MM-DDTHH:mm
function toInputDateTimeString(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    // convert to IST offset +05:30
    const istTime = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
    const yyyy = istTime.getFullYear();
    const mm = String(istTime.getMonth() + 1).padStart(2, "0");
    const dd = String(istTime.getDate()).padStart(2, "0");
    const hh = String(istTime.getHours()).padStart(2, "0");
    const min = String(istTime.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return "";
  }
}

// Helper: Convert IST input YYYY-MM-DDTHH:mm to UTC ISO string
function istInputToUTC(istInput: string): string | null {
  if (!istInput || !istInput.trim()) return null;
  try {
    // Append IST timezone offset +05:30 for parsing
    const normalized = istInput.includes("T") ? `${istInput}:00+05:30` : `${istInput}T00:00:00+05:30`;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export const SscScreen: React.FC<SscScreenProps> = ({ isDark = false }) => {
  // Main Sub-Tab State: 'consumers' vs 'banners'
  const [activeSubTab, setActiveSubTab] = useState<"consumers" | "banners">("consumers");

  // Secondary Sub-tab inside Banner Management:
  // 'all' (All Banners) | 'custom' (Custom Banners) | 'ssm_approved' (Approved SSM Banners)
  const [bannerSection, setBannerSection] = useState<"all" | "custom" | "ssm_approved">("all");

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
  // 2. Banner Management State
  // ============================================================================
  const [banners, setBanners] = useState<SscBanner[]>([]);
  const [approvedSsmBanners, setApprovedSsmBanners] = useState<ApprovedSsmBannerItem[]>([]);
  const [availableStores, setAvailableStores] = useState<SsmMerchant[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [refreshingBanners, setRefreshingBanners] = useState(false);
  const [bannerSearch, setBannerSearch] = useState("");
  const [bannerStatusFilter, setBannerStatusFilter] = useState<
    "all" | "active" | "scheduled" | "expired" | "draft" | "inactive"
  >("all");
  const [bannerSourceFilter, setBannerSourceFilter] = useState<"all" | "custom" | "ssm_approved">("all");
  const [bannerErrorMessage, setBannerErrorMessage] = useState<string | null>(null);

  // Custom Banner Create / Edit Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [bannerForm, setBannerForm] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
    storagePath: string;
    sourceType: "custom" | "ssm_approved";
    sourceRequestId: string;
    merchantId: string;
    merchantName: string;
    redirectType: "none" | "store" | "deal" | "category" | "custom_url";
    redirectTarget: string;
    status: "draft" | "active" | "inactive";
    startAtIST: string;
    endAtIST: string;
    targetingType: "all" | "state" | "district" | "city" | "pincode" | "radius";
    targetState: string;
    targetDistrict: string;
    targetCity: string;
    targetPincodes: string;
    targetLatitude: string;
    targetLongitude: string;
    targetRadiusKm: string;
    displayOrder: string;
  }>({
    title: "",
    subtitle: "",
    imageUrl: "",
    storagePath: "",
    sourceType: "custom",
    sourceRequestId: "",
    merchantId: "",
    merchantName: "",
    redirectType: "none",
    redirectTarget: "",
    status: "active",
    startAtIST: "",
    endAtIST: "",
    targetingType: "all",
    targetState: "Kerala",
    targetDistrict: "",
    targetCity: "",
    targetPincodes: "",
    targetLatitude: "8.736948",
    targetLongitude: "77.050640",
    targetRadiusKm: "10",
    displayOrder: "0"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Publish Approved SSM Banner Modal State
  const [publishingSsmItem, setPublishingSsmItem] = useState<ApprovedSsmBannerItem | null>(null);
  const [ssmPublishPriority, setSsmPublishPriority] = useState("0");
  const [ssmTargetingType, setSsmTargetingType] = useState<"all" | "radius" | "state">("all");
  const [ssmTargetRadiusKm, setSsmTargetRadiusKm] = useState("10");
  const [publishingAction, setPublishingAction] = useState(false);

  // Live Phone Mockup Preview Modal State
  const [previewingBanner, setPreviewingBanner] = useState<SscBanner | null>(null);

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

  // Load SSC Banners and Approved SSM Banners
  const loadBannerManagementData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshingBanners(true);
    } else {
      setLoadingBanners(true);
    }
    setBannerErrorMessage(null);

    try {
      const [allBanners, approvedSsm, storesRes] = await Promise.all([
        AdminApi.getAllSscBanners(),
        AdminApi.getApprovedSsmBanners(),
        AdminApi.getMerchants(1, 100, "")
      ]);
      setBanners(allBanners);
      setApprovedSsmBanners(approvedSsm);
      setAvailableStores(storesRes.merchants || []);
    } catch (err: any) {
      console.error("[SscScreen] Error fetching banner management data:", err);
      setBannerErrorMessage(err?.message || "Unable to load banner data from backend.");
    } finally {
      setLoadingBanners(false);
      setRefreshingBanners(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === "banners") {
      loadBannerManagementData();
    }
  }, [activeSubTab, loadBannerManagementData]);

  const onGlobalRefresh = () => {
    if (activeSubTab === "consumers") {
      loadConsumers(false, true);
    } else {
      loadBannerManagementData(true);
    }
  };

  // ============================================================================
  // Consumers Handlers & Renderers (100% Preserved)
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
  // 3. Banner Management Logic & Filtering
  // ============================================================================
  const nowTime = new Date().getTime();

  // Filter banners for 'All Banners' or 'Custom Banners'
  const filteredBanners = banners.filter((b) => {
    // Subsection filter
    if (bannerSection === "custom" && b.sourceType !== "custom") return false;

    // Source filter in All Banners
    if (bannerSection === "all" && bannerSourceFilter !== "all" && b.sourceType !== bannerSourceFilter) {
      return false;
    }

    // Status filter
    if (bannerStatusFilter !== "all") {
      const startMs = b.startAt ? new Date(b.startAt).getTime() : null;
      const endMs = b.endAt ? new Date(b.endAt).getTime() : null;

      if (bannerStatusFilter === "draft") {
        if (b.status !== "draft") return false;
      } else if (bannerStatusFilter === "inactive") {
        if (b.status !== "inactive") return false;
      } else if (bannerStatusFilter === "scheduled") {
        if (b.status !== "active" || !startMs || startMs <= nowTime) return false;
      } else if (bannerStatusFilter === "expired") {
        if (!endMs || endMs >= nowTime) return false;
      } else if (bannerStatusFilter === "active") {
        if (b.status !== "active") return false;
        if (startMs && startMs > nowTime) return false;
        if (endMs && endMs < nowTime) return false;
      }
    }

    // Search filter
    if (bannerSearch.trim()) {
      const q = bannerSearch.toLowerCase().trim();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchSub = (b.subtitle || "").toLowerCase().includes(q);
      const matchMerchant = (b.merchantName || "").toLowerCase().includes(q);
      const matchTarget = (b.targetName || b.targetId || b.redirectTarget || "").toLowerCase().includes(q);
      return matchTitle || matchSub || matchMerchant || matchTarget;
    }

    return true;
  });

  // Filter approved SSM banners for 'Approved SSM Banners' subsection
  const filteredApprovedSsm = approvedSsmBanners.filter((item) => {
    if (bannerSearch.trim()) {
      const q = bannerSearch.toLowerCase().trim();
      const matchStore = item.storeName.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchOwner = item.ownerName.toLowerCase().includes(q);
      const matchReq = item.requestId.toLowerCase().includes(q);
      return matchStore || matchTitle || matchOwner || matchReq;
    }
    return true;
  });

  // Calculate banner dynamic status badge
  const getBannerStatusBadge = (banner: SscBanner) => {
    const startMs = banner.startAt ? new Date(banner.startAt).getTime() : null;
    const endMs = banner.endAt ? new Date(banner.endAt).getTime() : null;

    if (banner.status === "draft") {
      return { label: "DRAFT", bg: "#F1F5F9", text: "#64748B" };
    }
    if (banner.status === "inactive" || !banner.isActive) {
      return { label: "INACTIVE", bg: "#F1F5F9", text: "#64748B" };
    }
    if (endMs && endMs < nowTime) {
      return { label: "EXPIRED", bg: "#FEF3C7", text: "#D97706" };
    }
    if (startMs && startMs > nowTime) {
      return { label: "SCHEDULED", bg: "#E0F2FE", text: "#0284C7" };
    }
    return { label: "ACTIVE", bg: "#ECFDF5", text: "#059669" };
  };

  // Open modal to create custom banner
  const openCreateCustomBannerModal = () => {
    setEditingBannerId(null);
    setFormErrors({});
    setUploadProgress(null);
    const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.displayOrder)) + 1 : 0;

    // Default start now, default end in 7 days
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setBannerForm({
      title: "",
      subtitle: "",
      imageUrl: "",
      storagePath: "",
      sourceType: "custom",
      sourceRequestId: "",
      merchantId: "",
      merchantName: "",
      redirectType: "none",
      redirectTarget: "",
      status: "active",
      startAtIST: toInputDateTimeString(now.toISOString()),
      endAtIST: toInputDateTimeString(future.toISOString()),
      targetingType: "all",
      targetState: "Kerala",
      targetDistrict: "",
      targetCity: "",
      targetPincodes: "",
      targetLatitude: "8.736948",
      targetLongitude: "77.050640",
      targetRadiusKm: "10",
      displayOrder: String(nextOrder)
    });
    setIsBannerModalOpen(true);
  };

  // Open modal to edit existing banner
  const openEditBannerModal = (banner: SscBanner) => {
    setEditingBannerId(banner.id);
    setFormErrors({});
    setUploadProgress(null);

    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl,
      storagePath: banner.storagePath || "",
      sourceType: banner.sourceType,
      sourceRequestId: banner.sourceRequestId || "",
      merchantId: banner.merchantId || "",
      merchantName: banner.merchantName || "",
      redirectType: banner.redirectType || "none",
      redirectTarget: banner.redirectTarget || banner.targetId || banner.customUrl || "",
      status: (banner.status as any) || (banner.isActive ? "active" : "inactive"),
      startAtIST: toInputDateTimeString(banner.startAt || banner.startDate),
      endAtIST: toInputDateTimeString(banner.endAt || banner.endDate),
      targetingType: banner.targetingType || "all",
      targetState: banner.targetState || "Kerala",
      targetDistrict: banner.targetDistrict || "",
      targetCity: banner.targetCity || "",
      targetPincodes: banner.targetPincodes || "",
      targetLatitude: banner.targetLatitude != null ? String(banner.targetLatitude) : "8.736948",
      targetLongitude: banner.targetLongitude != null ? String(banner.targetLongitude) : "77.050640",
      targetRadiusKm: banner.targetRadiusKm != null ? String(banner.targetRadiusKm) : "10",
      displayOrder: String(banner.displayOrder)
    });
    setIsBannerModalOpen(true);
  };

  // File Upload Handler (Web / Electron)
  const handleFileSelect = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validate mime type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      Alert.alert("Invalid File Type", "Please select a valid image file (JPG, JPEG, PNG, or WebP).");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      Alert.alert("File Too Large", "Banner image size must not exceed 10MB.");
      return;
    }

    setUploadingImage(true);
    setUploadProgress("Uploading to Supabase Storage (ssc-banners)...");

    try {
      const res = await AdminApi.uploadBannerImage(file, file.name, file.type);
      if (res.success && res.publicUrl) {
        setBannerForm((prev) => ({
          ...prev,
          imageUrl: res.publicUrl!,
          storagePath: res.storagePath || ""
        }));
        if (formErrors.imageUrl) setFormErrors((e) => ({ ...e, imageUrl: "" }));
        setUploadProgress("Uploaded successfully!");
      } else {
        Alert.alert("Upload Failed", res.error || "Unable to upload image to Supabase Storage.");
        setUploadProgress(null);
      }
    } catch (err: any) {
      Alert.alert("Upload Error", err?.message || "Failed to upload file.");
      setUploadProgress(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (banner: SscBanner) => {
    const newStatus = banner.status === "active" ? "inactive" : "active";
    setBanners((prev) =>
      prev.map((b) =>
        b.id === banner.id ? { ...b, status: newStatus as any, isActive: newStatus === "active" } : b
      )
    );

    const success = await AdminApi.toggleSscBannerStatus(banner.id, newStatus);
    if (!success) {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id ? { ...b, status: banner.status, isActive: banner.isActive } : b
        )
      );
      Alert.alert("Status Update Failed", "Unable to update banner status in Supabase backend.");
    }
  };

  // Delete banner with confirmation
  const handleDeleteBanner = (banner: SscBanner) => {
    const confirmAction = async () => {
      const prevList = [...banners];
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));

      const success = await AdminApi.deleteSscBanner(banner.id);
      if (!success) {
        setBanners(prevList);
        Alert.alert("Delete Failed", "Unable to delete banner from database.");
      } else {
        // Also refresh approved SSM list if SSM banner was removed
        loadBannerManagementData();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to remove banner "${banner.title}" from SSC?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Confirm Banner Removal",
        `Are you sure you want to remove banner "${banner.title}" from SSC?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmAction }
        ]
      );
    }
  };

  // Save banner (Draft or Published)
  const handleSaveBanner = async (saveStatus: "draft" | "active") => {
    const errors: Record<string, string> = {};
    if (!bannerForm.title.trim()) {
      errors.title = "Banner title is required.";
    }
    if (!bannerForm.imageUrl.trim()) {
      errors.imageUrl = "Banner image is required (upload or provide URL).";
    }

    if (bannerForm.redirectType === "store" && !bannerForm.redirectTarget.trim()) {
      errors.redirectTarget = "Please select or enter a target store.";
    }
    if (bannerForm.redirectType === "custom_url" && !bannerForm.redirectTarget.trim()) {
      errors.redirectTarget = "Please provide an external URL.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingBanner(true);
    try {
      const orderNum = parseInt(bannerForm.displayOrder, 10);
      const startUtc = istInputToUTC(bannerForm.startAtIST);
      const endUtc = istInputToUTC(bannerForm.endAtIST);

      const payload: Partial<SscBanner> = {
        id: editingBannerId || undefined,
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || undefined,
        imageUrl: bannerForm.imageUrl.trim(),
        storagePath: bannerForm.storagePath || undefined,
        sourceType: bannerForm.sourceType,
        sourceRequestId: bannerForm.sourceRequestId || undefined,
        merchantId: bannerForm.merchantId || undefined,
        merchantName: bannerForm.merchantName || undefined,
        redirectType: bannerForm.redirectType,
        redirectTarget: bannerForm.redirectTarget.trim() || undefined,
        status: saveStatus,
        isActive: saveStatus === "active",
        displayOrder: isNaN(orderNum) ? 0 : orderNum,
        startAt: startUtc,
        endAt: endUtc,
        targetingType: bannerForm.targetingType,
        targetState: bannerForm.targetingType === "state" ? bannerForm.targetState : undefined,
        targetDistrict: bannerForm.targetingType === "district" ? bannerForm.targetDistrict : undefined,
        targetCity: bannerForm.targetingType === "city" ? bannerForm.targetCity : undefined,
        targetPincodes: bannerForm.targetingType === "pincode" ? bannerForm.targetPincodes : undefined,
        targetLatitude: bannerForm.targetingType === "radius" ? parseFloat(bannerForm.targetLatitude) : null,
        targetLongitude: bannerForm.targetingType === "radius" ? parseFloat(bannerForm.targetLongitude) : null,
        targetRadiusKm: bannerForm.targetingType === "radius" ? parseFloat(bannerForm.targetRadiusKm) : null
      };

      const res = await AdminApi.saveSscBanner(payload);
      if (res.success) {
        setIsBannerModalOpen(false);
        loadBannerManagementData();
      } else {
        Alert.alert("Save Error", res.error || "Could not save banner.");
      }
    } catch (err: any) {
      Alert.alert("Save Error", err?.message || "An unexpected error occurred.");
    } finally {
      setSavingBanner(false);
    }
  };

  // Open SSM Publish Modal
  const openPublishSsmModal = (item: ApprovedSsmBannerItem) => {
    setPublishingSsmItem(item);
    setSsmPublishPriority(String(item.sscDisplayOrder || 0));
    setSsmTargetingType("all");
    setSsmTargetRadiusKm("10");
  };

  // Submit SSM Publish
  const handleConfirmPublishSsm = async () => {
    if (!publishingSsmItem) return;

    setPublishingAction(true);
    try {
      const priorityNum = parseInt(ssmPublishPriority, 10);
      const targetingPayload: any = {
        targetingType: ssmTargetingType
      };

      if (ssmTargetingType === "radius") {
        targetingPayload.targetLatitude = publishingSsmItem.storeLat;
        targetingPayload.targetLongitude = publishingSsmItem.storeLng;
        targetingPayload.targetRadiusKm = parseFloat(ssmTargetRadiusKm) || 10;
      } else if (ssmTargetingType === "state") {
        targetingPayload.targetState = "Kerala";
      }

      const res = await AdminApi.publishApprovedSsmBanner(
        publishingSsmItem.requestId,
        isNaN(priorityNum) ? 0 : priorityNum,
        targetingPayload
      );

      if (res.success) {
        setPublishingSsmItem(null);
        loadBannerManagementData();
        Alert.alert("Success", `Merchant banner for "${publishingSsmItem.storeName}" is now published to SSC!`);
      } else {
        Alert.alert("Publish Failed", res.error || "Unable to publish SSM banner to SSC.");
      }
    } catch (err: any) {
      Alert.alert("Publish Error", err?.message || "Failed to publish SSM banner.");
    } finally {
      setPublishingAction(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Hidden file input for web image upload */}
      {Platform.OS === "web" && (
        <input
          type="file"
          ref={fileInputRef as any}
          style={{ display: "none" }}
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileSelect}
        />
      )}

      {/* ===================================================================== */}
      {/* 1. TOP HEADER                                                         */}
      {/* ===================================================================== */}
      <View style={[styles.topBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.topBarTitle, { color: colors.textMain }]}>
              {activeSubTab === "consumers" ? "SSC – Consumer Directory" : "SSC – Promotional Banner Management"}
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
              : `Total Managed Banners: ${banners.length} • Approved SSM Requests: ${approvedSsmBanners.length}`}
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
      {/* 2. MAIN SUB-TAB NAVIGATION: Consumers vs Banner Management           */}
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
            Banner Management ({banners.length})
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
      {/* 4. BANNER MANAGEMENT CONTENT (Three Subsections)                     */}
      {/* ===================================================================== */}
      {activeSubTab === "banners" && (
        <View style={{ flex: 1 }}>
          {/* Secondary Subsection Navigation Tabs */}
          <View style={[styles.secondaryTabBar, { backgroundColor: colors.metaBoxBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.secondaryTabBtn,
                bannerSection === "all" && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent
                }
              ]}
              onPress={() => setBannerSection("all")}
              activeOpacity={0.8}
            >
              <Layers size={13} color={bannerSection === "all" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.secondaryTabText,
                  { color: bannerSection === "all" ? "#FFFFFF" : colors.textSub }
                ]}
              >
                All Banners ({banners.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryTabBtn,
                bannerSection === "custom" && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent
                }
              ]}
              onPress={() => setBannerSection("custom")}
              activeOpacity={0.8}
            >
              <Sparkles size={13} color={bannerSection === "custom" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.secondaryTabText,
                  { color: bannerSection === "custom" ? "#FFFFFF" : colors.textSub }
                ]}
              >
                Custom Banners ({banners.filter((b) => b.sourceType === "custom").length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryTabBtn,
                bannerSection === "ssm_approved" && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent
                }
              ]}
              onPress={() => setBannerSection("ssm_approved")}
              activeOpacity={0.8}
            >
              <Store size={13} color={bannerSection === "ssm_approved" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.secondaryTabText,
                  { color: bannerSection === "ssm_approved" ? "#FFFFFF" : colors.textSub }
                ]}
              >
                Approved SSM Banners ({approvedSsmBanners.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subsections: All Banners & Custom Banners */}
          {(bannerSection === "all" || bannerSection === "custom") && (
            <View style={{ flex: 1 }}>
              {/* Controls Bar */}
              <View style={[styles.controlsBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Search size={15} color={colors.textSub} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textMain }]}
                    placeholder="Search by title, subtitle, merchant, or location..."
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

                {/* Filter Pills & Actions */}
                <View style={styles.bannerActionsRow}>
                  <View style={styles.filterPillsRow}>
                    {(["all", "active", "scheduled", "expired", "draft", "inactive"] as const).map((sf) => {
                      const isSel = bannerStatusFilter === sf;
                      return (
                        <TouchableOpacity
                          key={sf}
                          style={[
                            styles.filterPill,
                            { backgroundColor: isSel ? colors.pillActiveBg : colors.pillInactiveBg }
                          ]}
                          onPress={() => setBannerStatusFilter(sf)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              { color: isSel ? colors.pillActiveText : colors.pillInactiveText }
                            ]}
                          >
                            {sf.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.createBannerBtn, { backgroundColor: colors.accent }]}
                    onPress={openCreateCustomBannerModal}
                    activeOpacity={0.8}
                  >
                    <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createBannerBtnText}>New Custom Banner</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Banner List */}
              {loadingBanners ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.statusTitle, { color: colors.textMain, marginTop: 14 }]}>
                    Loading Banners...
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
                    onPress={() => loadBannerManagementData()}
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
                  <Text style={[styles.statusTitle, { color: colors.textMain }]}>No banners found</Text>
                  <Text style={[styles.statusSub, { color: colors.textSub }]}>
                    {bannerSection === "custom"
                      ? "Create your first custom banner using the button above."
                      : "No promotional banners match your selected status or search query."}
                  </Text>
                  <TouchableOpacity
                    style={[styles.createBannerBtn, { backgroundColor: colors.accent, marginTop: 14 }]}
                    onPress={openCreateCustomBannerModal}
                    activeOpacity={0.8}
                  >
                    <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createBannerBtnText}>Create Custom Banner</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.bannerListContainer}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshingBanners}
                      onRefresh={() => loadBannerManagementData(true)}
                      tintColor={colors.accent}
                    />
                  }
                >
                  <View style={styles.bannerGrid}>
                    {filteredBanners.map((item) => {
                      const statusBadge = getBannerStatusBadge(item);
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
                              borderColor: item.status === "active" ? colors.accent : colors.border
                            }
                          ]}
                        >
                          {/* Banner Image Preview Container */}
                          <TouchableOpacity
                            style={styles.bannerImageWrapper}
                            onPress={() => setPreviewingBanner(item)}
                            activeOpacity={0.9}
                          >
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
                                <Text style={styles.orderBadgeText}>Priority #{item.displayOrder}</Text>
                              </View>

                              <View
                                style={[
                                  styles.statusBadgeSmall,
                                  { backgroundColor: statusBadge.bg }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBadgeSmallText,
                                    { color: statusBadge.text }
                                  ]}
                                >
                                  {statusBadge.label}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.previewClickHint}>
                              <Eye size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.previewClickHintText}>Click to Preview</Text>
                            </View>
                          </TouchableOpacity>

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

                            {/* Source & Destination Badges */}
                            <View style={styles.metaBadgesRow}>
                              {item.sourceType === "ssm_approved" ? (
                                <View style={[styles.sourceBadge, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
                                  <Store size={10} color="#EA580C" style={{ marginRight: 4 }} />
                                  <Text style={[styles.sourceBadgeText, { color: "#EA580C" }]} numberOfLines={1}>
                                    SSM: {item.merchantName || "Merchant Banner"}
                                  </Text>
                                </View>
                              ) : (
                                <View style={[styles.sourceBadge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                                  <Sparkles size={10} color="#2563EB" style={{ marginRight: 4 }} />
                                  <Text style={[styles.sourceBadgeText, { color: "#2563EB" }]}>
                                    Admin Custom
                                  </Text>
                                </View>
                              )}

                              {item.redirectType === "store" ? (
                                <View style={[styles.destBadge, { backgroundColor: colors.inputBg }]}>
                                  <Store size={10} color={colors.textSub} style={{ marginRight: 3 }} />
                                  <Text style={[styles.destBadgeText, { color: colors.textSub }]} numberOfLines={1}>
                                    Store: {item.targetName || item.redirectTarget}
                                  </Text>
                                </View>
                              ) : item.redirectType === "category" ? (
                                <View style={[styles.destBadge, { backgroundColor: colors.inputBg }]}>
                                  <Tag size={10} color={colors.textSub} style={{ marginRight: 3 }} />
                                  <Text style={[styles.destBadgeText, { color: colors.textSub }]}>
                                    Category: {item.redirectTarget}
                                  </Text>
                                </View>
                              ) : item.redirectType === "custom_url" ? (
                                <View style={[styles.destBadge, { backgroundColor: colors.inputBg }]}>
                                  <Globe size={10} color={colors.textSub} style={{ marginRight: 3 }} />
                                  <Text style={[styles.destBadgeText, { color: colors.textSub }]} numberOfLines={1}>
                                    URL: {item.redirectTarget}
                                  </Text>
                                </View>
                              ) : (
                                <View style={[styles.destBadge, { backgroundColor: colors.inputBg }]}>
                                  <Info size={10} color={colors.textSub} style={{ marginRight: 3 }} />
                                  <Text style={[styles.destBadgeText, { color: colors.textSub }]}>
                                    Info Only
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Location Targeting Pill */}
                            <View style={styles.targetingRow}>
                              <MapPin size={11} color={colors.accent} style={{ marginRight: 4 }} />
                              <Text style={[styles.targetingText, { color: colors.textMain }]} numberOfLines={1}>
                                {item.targetingType === "all"
                                  ? "All Locations (Ecosystem-wide)"
                                  : item.targetingType === "state"
                                  ? `State: ${item.targetState || "Kerala"}`
                                  : item.targetingType === "city"
                                  ? `City: ${item.targetCity}`
                                  : item.targetingType === "district"
                                  ? `District: ${item.targetDistrict}`
                                  : item.targetingType === "pincode"
                                  ? `PIN: ${item.targetPincodes}`
                                  : `Radius: ${item.targetRadiusKm || 10}km`}
                              </Text>
                            </View>

                            {/* Schedule Window (IST) */}
                            <View style={styles.scheduleRow}>
                              <Clock size={11} color={colors.textSub} style={{ marginRight: 4 }} />
                              <Text style={[styles.scheduleText, { color: colors.textSub }]}>
                                {item.startAt || item.endAt
                                  ? `${formatIST(item.startAt)} → ${formatIST(item.endAt)}`
                                  : "Continuous / Always Active"}
                              </Text>
                            </View>

                            {/* Analytics Row */}
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

                            {/* Action Buttons Row */}
                            <View style={[styles.bannerActionsBottom, { borderTopColor: colors.border }]}>
                              <TouchableOpacity
                                style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                                onPress={() => setPreviewingBanner(item)}
                                activeOpacity={0.7}
                              >
                                <Eye size={12} color={colors.accent} style={{ marginRight: 4 }} />
                                <Text style={[styles.bannerActionBtnText, { color: colors.accent }]}>Preview</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                                onPress={() => handleToggleStatus(item)}
                                activeOpacity={0.7}
                              >
                                {item.status === "active" ? (
                                  <>
                                    <EyeOff size={12} color={colors.textSub} style={{ marginRight: 4 }} />
                                    <Text style={[styles.bannerActionBtnText, { color: colors.textSub }]}>Deactivate</Text>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} color="#059669" style={{ marginRight: 4 }} />
                                    <Text style={[styles.bannerActionBtnText, { color: "#059669" }]}>Activate</Text>
                                  </>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                                onPress={() => openEditBannerModal(item)}
                                activeOpacity={0.7}
                              >
                                <Edit3 size={12} color={colors.textMain} style={{ marginRight: 4 }} />
                                <Text style={[styles.bannerActionBtnText, { color: colors.textMain }]}>Edit</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.bannerActionBtn, { borderColor: colors.border }]}
                                onPress={() => handleDeleteBanner(item)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={12} color="#DC2626" style={{ marginRight: 4 }} />
                                <Text style={[styles.bannerActionBtnText, { color: "#DC2626" }]}>Delete</Text>
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

          {/* Subsection 3: Approved SSM Banners */}
          {bannerSection === "ssm_approved" && (
            <View style={{ flex: 1 }}>
              <View style={[styles.controlsBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Search size={15} color={colors.textSub} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textMain }]}
                    placeholder="Search approved SSM merchant requests..."
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

                <View style={styles.ssmSubHeadingRow}>
                  <Text style={[styles.ssmSubHeadingText, { color: colors.textSub }]}>
                    Retrieve and publish genuine approved merchant advertising requests directly to SSC with zero image re-upload.
                  </Text>
                </View>
              </View>

              {loadingBanners ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.statusTitle, { color: colors.textMain, marginTop: 14 }]}>
                    Loading Approved SSM Banners...
                  </Text>
                </View>
              ) : filteredApprovedSsm.length === 0 ? (
                <View style={styles.centerBox}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                    <Store size={30} color={colors.textSub} />
                  </View>
                  <Text style={[styles.statusTitle, { color: colors.textMain }]}>No approved SSM requests found</Text>
                  <Text style={[styles.statusSub, { color: colors.textSub }]}>
                    Approved home banner advertising applications from SSM will appear here automatically.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.bannerListContainer}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshingBanners}
                      onRefresh={() => loadBannerManagementData(true)}
                      tintColor={colors.accent}
                    />
                  }
                >
                  <View style={styles.bannerGrid}>
                    {filteredApprovedSsm.map((item) => (
                      <View
                        key={item.requestId}
                        style={[
                          styles.bannerCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: item.isPublishedToSsc ? "#059669" : colors.border
                          }
                        ]}
                      >
                        {/* Original Merchant Uploaded Image */}
                        <View style={styles.bannerImageWrapper}>
                          <Image
                            source={{ uri: item.bannerUrl }}
                            style={styles.bannerImage}
                            resizeMode="cover"
                          />
                          <View style={styles.bannerBadgeOverlay}>
                            <View style={[styles.orderBadge, { backgroundColor: "#EA580C" }]}>
                              <Text style={styles.orderBadgeText}>SSM Request</Text>
                            </View>

                            <View
                              style={[
                                styles.statusBadgeSmall,
                                { backgroundColor: item.isPublishedToSsc ? "#059669" : "#2563EB" }
                              ]}
                            >
                              <Text style={styles.statusBadgeSmallText}>
                                {item.isPublishedToSsc ? "PUBLISHED TO SSC" : "READY TO PUBLISH"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Content */}
                        <View style={styles.bannerCardContent}>
                          <Text style={[styles.bannerTitleText, { color: colors.textMain }]} numberOfLines={1}>
                            {item.storeName}
                          </Text>
                          <Text style={[styles.bannerSubtitleText, { color: colors.textSub }]} numberOfLines={1}>
                            Owner: {item.ownerName} • Req ID: {item.requestId.substring(0, 20)}...
                          </Text>

                          {/* Approved Window */}
                          <View style={styles.scheduleRow}>
                            <Calendar size={11} color={colors.accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.scheduleText, { color: colors.textMain, fontWeight: "700" }]}>
                              Approved Window: {formatIST(item.startDate)} → {formatIST(item.endDate)}
                            </Text>
                          </View>

                          {/* Payment & Duration */}
                          <View style={styles.scheduleRow}>
                            <Tag size={11} color={colors.textSub} style={{ marginRight: 4 }} />
                            <Text style={[styles.scheduleText, { color: colors.textSub }]}>
                              Amount Paid: ₹{item.totalAmount} • Duration: {item.durationDays} days
                            </Text>
                          </View>

                          {/* Store Address & Location */}
                          <View style={styles.targetingRow}>
                            <MapPin size={11} color={colors.textSub} style={{ marginRight: 4 }} />
                            <Text style={[styles.targetingText, { color: colors.textSub }]} numberOfLines={1}>
                              Store Location: {item.storeAddress || "Kerala, India"}
                            </Text>
                          </View>

                          {/* Publish Action Button */}
                          <View style={[styles.bannerActionsBottom, { borderTopColor: colors.border }]}>
                            {item.isPublishedToSsc ? (
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                  <CheckCircle2 size={14} color="#059669" style={{ marginRight: 6 }} />
                                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#059669" }}>
                                    Active on SSC Carousel
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={[styles.bannerActionBtn, { borderColor: colors.border, flex: 0, paddingHorizontal: 10 }]}
                                  onPress={() => openPublishSsmModal(item)}
                                >
                                  <Edit3 size={12} color={colors.textMain} style={{ marginRight: 4 }} />
                                  <Text style={[styles.bannerActionBtnText, { color: colors.textMain }]}>Config</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={[styles.publishSsmBtn, { backgroundColor: colors.accent }]}
                                onPress={() => openPublishSsmModal(item)}
                                activeOpacity={0.8}
                              >
                                <Sparkles size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.publishSsmBtnText}>Publish to SSC</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* ===================================================================== */}
      {/* 5. CREATE / EDIT CUSTOM BANNER MODAL                                 */}
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
                  {editingBannerId ? "Edit Custom Promotional Banner" : "Create New Custom Banner"}
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
              {/* Image Upload & Validation Section */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Banner Image <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <Text style={[styles.formHint, { color: colors.textSub, marginBottom: 8 }]}>
                  Supported formats: JPG, JPEG, PNG, WebP (Max 10MB). High resolution ~1200x600 recommended.
                </Text>

                <View style={styles.uploadRow}>
                  {Platform.OS === "web" && (
                    <TouchableOpacity
                      style={[styles.uploadFileBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                      onPress={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />
                      ) : (
                        <Plus size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.uploadFileBtnText, { color: colors.textMain }]}>
                        {uploadingImage ? "Uploading..." : "Choose File to Upload"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: formErrors.imageUrl ? "#DC2626" : colors.border,
                        color: colors.textMain,
                        flex: 1
                      }
                    ]}
                    placeholder="Or paste external image URL..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.imageUrl}
                    onChangeText={(val) => {
                      setBannerForm((prev) => ({ ...prev, imageUrl: val }));
                      if (formErrors.imageUrl) setFormErrors((e) => ({ ...e, imageUrl: "" }));
                    }}
                    autoCapitalize="none"
                  />
                </View>

                {uploadProgress ? (
                  <Text style={[styles.uploadProgressText, { color: colors.accent }]}>{uploadProgress}</Text>
                ) : null}

                {formErrors.imageUrl ? (
                  <Text style={styles.formErrorText}>{formErrors.imageUrl}</Text>
                ) : null}

                {/* Live Image Preview */}
                {bannerForm.imageUrl.trim().length > 5 ? (
                  <View style={styles.formImagePreviewWrapper}>
                    <Text style={[styles.previewHeading, { color: colors.textSub }]}>Live Aspect Preview:</Text>
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
                  placeholder="e.g. Festival Mega Bonanza, 50% Off Top Brands"
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
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Subtitle / Tagline (Optional)</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      color: colors.textMain
                    }
                  ]}
                  placeholder="e.g. Special vouchers redeemable at partner stores near you."
                  placeholderTextColor={colors.textSub}
                  value={bannerForm.subtitle}
                  onChangeText={(val) => setBannerForm((prev) => ({ ...prev, subtitle: val }))}
                />
              </View>

              {/* Click Destination Action */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Click Action / Destination</Text>
                <View style={styles.linkTypeRow}>
                  {[
                    { id: "none", label: "None (Info)", icon: Info },
                    { id: "store", label: "Store", icon: Store },
                    { id: "category", label: "Category", icon: Tag },
                    { id: "custom_url", label: "Web URL", icon: Globe }
                  ].map((lt) => {
                    const isSelected = bannerForm.redirectType === lt.id;
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
                            redirectType: lt.id as any
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

              {/* Contextual Target Selectors */}
              {bannerForm.redirectType === "store" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    Select Target Store <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  {availableStores.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {availableStores.map((s) => {
                        const isPicked = bannerForm.redirectTarget === s.id;
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
                                redirectTarget: s.id
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
                  ) : null}

                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: formErrors.redirectTarget ? "#DC2626" : colors.border,
                        color: colors.textMain,
                        marginTop: 6
                      }
                    ]}
                    placeholder="Or enter store ID directly..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.redirectTarget}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, redirectTarget: val }))}
                  />
                  {formErrors.redirectTarget ? (
                    <Text style={styles.formErrorText}>{formErrors.redirectTarget}</Text>
                  ) : null}
                </View>
              )}

              {bannerForm.redirectType === "category" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Target Category</Text>
                  <View style={styles.categoryChipsWrap}>
                    {PROMO_CATEGORIES.map((cat) => {
                      const isPicked = bannerForm.redirectTarget === cat;
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
                          onPress={() => setBannerForm((prev) => ({ ...prev, redirectTarget: cat }))}
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

              {bannerForm.redirectType === "custom_url" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    Destination URL <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: formErrors.redirectTarget ? "#DC2626" : colors.border,
                        color: colors.textMain
                      }
                    ]}
                    placeholder="https://smartshopper.in/..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.redirectTarget}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, redirectTarget: val }))}
                    autoCapitalize="none"
                  />
                  {formErrors.redirectTarget ? (
                    <Text style={styles.formErrorText}>{formErrors.redirectTarget}</Text>
                  ) : null}
                </View>
              )}

              {/* Administrative Scheduling (IST) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Display Schedule (Asia/Kolkata IST)
                </Text>
                <Text style={[styles.formHint, { color: colors.textSub, marginBottom: 8 }]}>
                  Timestamps are saved with timezone. Display automatically begins at start time and ceases after end time.
                </Text>

                <View style={styles.formRowTwoCol}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>Start Date & Time (IST)</Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                      ]}
                      placeholder="YYYY-MM-DDTHH:mm"
                      placeholderTextColor={colors.textSub}
                      value={bannerForm.startAtIST}
                      onChangeText={(val) => setBannerForm((prev) => ({ ...prev, startAtIST: val }))}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>End Date & Time (IST)</Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                      ]}
                      placeholder="YYYY-MM-DDTHH:mm"
                      placeholderTextColor={colors.textSub}
                      value={bannerForm.endAtIST}
                      onChangeText={(val) => setBannerForm((prev) => ({ ...prev, endAtIST: val }))}
                    />
                  </View>
                </View>
              </View>

              {/* Location Targeting */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Location Targeting</Text>
                <View style={styles.linkTypeRow}>
                  {[
                    { id: "all", label: "All Locations" },
                    { id: "state", label: "State" },
                    { id: "district", label: "District" },
                    { id: "city", label: "City" },
                    { id: "pincode", label: "PIN Code" },
                    { id: "radius", label: "Radius (km)" }
                  ].map((tg) => {
                    const isSelected = bannerForm.targetingType === tg.id;
                    return (
                      <TouchableOpacity
                        key={tg.id}
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
                            targetingType: tg.id as any
                          }))
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.linkTypeOptionText,
                            { color: isSelected ? "#FFFFFF" : colors.textSub }
                          ]}
                        >
                          {tg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Contextual targeting inputs */}
                {bannerForm.targetingType === "state" && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>Select Target State</Text>
                    <View style={styles.categoryChipsWrap}>
                      {TARGET_STATES.map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: bannerForm.targetState === st ? "#EA580C" : colors.inputBg,
                              borderColor: bannerForm.targetState === st ? "#EA580C" : colors.border
                            }
                          ]}
                          onPress={() => setBannerForm((prev) => ({ ...prev, targetState: st }))}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: bannerForm.targetState === st ? "#FFFFFF" : colors.textMain }
                            ]}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {bannerForm.targetingType === "district" && (
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain,
                        marginTop: 8
                      }
                    ]}
                    placeholder="Enter district (e.g. Thiruvananthapuram, Ernakulam)..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.targetDistrict}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetDistrict: val }))}
                  />
                )}

                {bannerForm.targetingType === "city" && (
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain,
                        marginTop: 8
                      }
                    ]}
                    placeholder="Enter city name (e.g. Nedumangad, Kochi)..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.targetCity}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetCity: val }))}
                  />
                )}

                {bannerForm.targetingType === "pincode" && (
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.textMain,
                        marginTop: 8
                      }
                    ]}
                    placeholder="Enter PIN codes separated by commas (e.g. 695563, 695541)..."
                    placeholderTextColor={colors.textSub}
                    value={bannerForm.targetPincodes}
                    onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetPincodes: val }))}
                  />
                )}

                {bannerForm.targetingType === "radius" && (
                  <View style={[styles.formRowTwoCol, { marginTop: 8 }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>Center Latitude</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                        ]}
                        value={bannerForm.targetLatitude}
                        onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetLatitude: val }))}
                        placeholder="8.736948"
                        placeholderTextColor={colors.textSub}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>Center Longitude</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                        ]}
                        value={bannerForm.targetLongitude}
                        onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetLongitude: val }))}
                        placeholder="77.050640"
                        placeholderTextColor={colors.textSub}
                      />
                    </View>

                    <View style={{ flex: 0.8 }}>
                      <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>Radius (km)</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                        ]}
                        value={bannerForm.targetRadiusKm}
                        onChangeText={(val) => setBannerForm((prev) => ({ ...prev, targetRadiusKm: val }))}
                        placeholder="10"
                        placeholderTextColor={colors.textSub}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Display Priority Order */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Display Priority / Order #</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      color: colors.textMain,
                      maxWidth: 200
                    }
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textSub}
                  value={bannerForm.displayOrder}
                  onChangeText={(val) => setBannerForm((prev) => ({ ...prev, displayOrder: val }))}
                  keyboardType="numeric"
                />
                <Text style={[styles.formHint, { color: colors.textSub }]}>
                  Lower numbers appear first on the consumer carousel (0, 1, 2...).
                </Text>
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
                style={[styles.draftModalBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                onPress={() => handleSaveBanner("draft")}
                disabled={savingBanner}
                activeOpacity={0.8}
              >
                <FileText size={14} color={colors.textSub} style={{ marginRight: 6 }} />
                <Text style={[styles.draftModalBtnText, { color: colors.textSub }]}>Save Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.accent }]}
                onPress={() => handleSaveBanner("active")}
                disabled={savingBanner}
                activeOpacity={0.8}
              >
                {savingBanner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.saveModalBtnText}>
                  {savingBanner ? "Saving..." : editingBannerId ? "Update & Publish" : "Publish to SSC"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. PUBLISH APPROVED SSM BANNER CONFIG MODAL                          */}
      {/* ===================================================================== */}
      <Modal
        visible={!!publishingSsmItem}
        transparent
        animationType="fade"
        onRequestClose={() => setPublishingSsmItem(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.bannerModalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Store size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Publish Approved SSM Banner to SSC</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPublishingSsmItem(null)}
              >
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {publishingSsmItem && (
              <ScrollView style={styles.modalScrollContent}>
                <View style={[styles.ssmPublishSummary, { backgroundColor: colors.metaBoxBg, borderColor: colors.border }]}>
                  <Image
                    source={{ uri: publishingSsmItem.bannerUrl }}
                    style={styles.ssmPublishThumb}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.ssmPublishStore, { color: colors.textMain }]}>
                      {publishingSsmItem.storeName}
                    </Text>
                    <Text style={[styles.ssmPublishOwner, { color: colors.textSub }]}>
                      Owner: {publishingSsmItem.ownerName}
                    </Text>
                    <Text style={[styles.ssmPublishWindow, { color: colors.accent }]}>
                      Approved: {formatIST(publishingSsmItem.startDate)} → {formatIST(publishingSsmItem.endDate)}
                    </Text>
                    <Text style={[styles.ssmPublishLoc, { color: colors.textSub }]} numberOfLines={1}>
                      {publishingSsmItem.storeAddress}
                    </Text>
                  </View>
                </View>

                {/* Priority Selection */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Display Priority on SSC</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain, maxWidth: 160 }
                    ]}
                    value={ssmPublishPriority}
                    onChangeText={setSsmPublishPriority}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.formHint, { color: colors.textSub }]}>
                    Lower number appears earlier in the carousel.
                  </Text>
                </View>

                {/* Location Targeting for Merchant Banner */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Targeting Mode</Text>
                  <View style={styles.linkTypeRow}>
                    {[
                      { id: "all", label: "All Kerala / Ecosystem" },
                      { id: "radius", label: "Store Radius (Recommended)" }
                    ].map((tg) => {
                      const isSel = ssmTargetingType === tg.id;
                      return (
                        <TouchableOpacity
                          key={tg.id}
                          style={[
                            styles.linkTypeOption,
                            {
                              backgroundColor: isSel ? colors.accent : colors.inputBg,
                              borderColor: isSel ? colors.accent : colors.border
                            }
                          ]}
                          onPress={() => setSsmTargetingType(tg.id as any)}
                        >
                          <Text style={[styles.linkTypeOptionText, { color: isSel ? "#FFFFFF" : colors.textSub }]}>
                            {tg.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {ssmTargetingType === "radius" && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.subFieldLabel, { color: colors.textSub }]}>
                        Radius around Store Coordinates ({publishingSsmItem.storeLat?.toFixed(4)}, {publishingSsmItem.storeLng?.toFixed(4)})
                      </Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain, maxWidth: 160 }
                        ]}
                        value={ssmTargetRadiusKm}
                        onChangeText={setSsmTargetRadiusKm}
                        placeholder="10"
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { borderColor: colors.border }]}
                onPress={() => setPublishingSsmItem(null)}
                disabled={publishingAction}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.textSub }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.accent }]}
                onPress={handleConfirmPublishSsm}
                disabled={publishingAction}
              >
                {publishingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.saveModalBtnText}>
                  {publishingAction ? "Publishing..." : "Publish to SSC Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 7. LIVE MOBILE CAROUSEL PREVIEW MODAL                                */}
      {/* ===================================================================== */}
      <Modal
        visible={!!previewingBanner}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewingBanner(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
          <View style={styles.mobileMockupContainer}>
            {/* Phone Frame Header */}
            <View style={styles.phoneHeader}>
              <View style={styles.phoneSpeaker} />
              <TouchableOpacity
                style={styles.phoneCloseBtn}
                onPress={() => setPreviewingBanner(null)}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {previewingBanner && (
              <View style={styles.phoneScreenContent}>
                <View style={styles.mockupAppHeader}>
                  <Text style={styles.mockupAppTitle}>SmartShopper Consumer</Text>
                  <Text style={styles.mockupAppSub}>Live Home Carousel Simulation</Text>
                </View>

                {/* Simulated Carousel Slide */}
                <View style={styles.mockupSlideCard}>
                  <Image
                    source={{ uri: previewingBanner.imageUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  {(previewingBanner.title || previewingBanner.subtitle) && (
                    <View style={styles.mockupScrim}>
                      <Text style={styles.mockupBannerTitle} numberOfLines={1}>
                        {previewingBanner.title}
                      </Text>
                      {previewingBanner.subtitle ? (
                        <Text style={styles.mockupBannerSubtitle} numberOfLines={1}>
                          {previewingBanner.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                {/* Mockup Meta Info */}
                <View style={styles.mockupMetaBox}>
                  <Text style={styles.mockupMetaRow}>
                    <Text style={{ fontWeight: "700" }}>Source: </Text>
                    {previewingBanner.sourceType === "ssm_approved" ? `SSM Merchant (${previewingBanner.merchantName})` : "Admin Custom"}
                  </Text>
                  <Text style={styles.mockupMetaRow}>
                    <Text style={{ fontWeight: "700" }}>Destination: </Text>
                    {previewingBanner.redirectType.toUpperCase()} ({previewingBanner.redirectTarget || "None"})
                  </Text>
                  <Text style={styles.mockupMetaRow}>
                    <Text style={{ fontWeight: "700" }}>Targeting: </Text>
                    {previewingBanner.targetingType.toUpperCase()}
                  </Text>
                  <Text style={styles.mockupMetaRow}>
                    <Text style={{ fontWeight: "700" }}>Schedule (IST): </Text>
                    {formatIST(previewingBanner.startAt)} → {formatIST(previewingBanner.endAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 8. CONSUMER PROFILE MODAL (100% Preserved)                           */}
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

  /* Primary sub-tab bar */
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

  /* Secondary subsection tab bar */
  secondaryTabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
    alignItems: "center"
  },
  secondaryTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent"
  },
  secondaryTabText: {
    fontSize: 12,
    fontWeight: "700"
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
    gap: 6,
    flexWrap: "wrap"
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 6
  },
  filterPillText: {
    fontSize: 11,
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

  ssmSubHeadingRow: {
    marginTop: 2
  },
  ssmSubHeadingText: {
    fontSize: 12,
    lineHeight: 16
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
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  previewClickHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  previewClickHintText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700"
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

  metaBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap"
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1
  },
  sourceBadgeText: {
    fontSize: 9.5,
    fontWeight: "800"
  },
  destBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5
  },
  destBadgeText: {
    fontSize: 9.5,
    fontWeight: "600"
  },

  targetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  targetingText: {
    fontSize: 11,
    fontWeight: "600"
  },

  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  scheduleText: {
    fontSize: 10.5,
    fontWeight: "500"
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

  publishSsmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7
  },
  publishSsmBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },

  /* ========================================================================= */
  /* Banner Modal Form Styling                                                 */
  /* ========================================================================= */
  bannerModalCard: {
    width: "92%",
    maxWidth: 680,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"
  },
  formGroup: {
    marginBottom: 14
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4
  },
  subFieldLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    marginBottom: 3
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 13
  },
  formHint: {
    fontSize: 10.5,
    lineHeight: 14
  },
  formErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 3
  },

  uploadRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  uploadFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  uploadFileBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },
  uploadProgressText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4
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
    height: 130,
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
  draftModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  draftModalBtnText: {
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

  /* SSM Publish Summary in Modal */
  ssmPublishSummary: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14
  },
  ssmPublishThumb: {
    width: 90,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#0F172A"
  },
  ssmPublishStore: {
    fontSize: 14,
    fontWeight: "800"
  },
  ssmPublishOwner: {
    fontSize: 11,
    marginTop: 2
  },
  ssmPublishWindow: {
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 2
  },
  ssmPublishLoc: {
    fontSize: 10,
    marginTop: 2
  },

  /* Mobile Mockup Modal */
  mobileMockupContainer: {
    width: 380,
    maxWidth: "95%",
    borderRadius: 32,
    backgroundColor: "#0F172A",
    padding: 16,
    borderWidth: 4,
    borderColor: "#334155",
    elevation: 20
  },
  phoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14
  },
  phoneSpeaker: {
    width: 60,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginLeft: "auto",
    marginRight: "auto"
  },
  phoneCloseBtn: {
    position: "absolute",
    right: 0,
    top: -2,
    padding: 4
  },
  phoneScreenContent: {
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    padding: 12,
    minHeight: 340
  },
  mockupAppHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingBottom: 6
  },
  mockupAppTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A"
  },
  mockupAppSub: {
    fontSize: 9.5,
    color: "#EA580C",
    fontWeight: "700"
  },
  mockupSlideCard: {
    width: "100%",
    height: 168,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.25)",
    backgroundColor: "#0F172A",
    position: "relative"
  },
  mockupScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(15, 23, 42, 0.7)"
  },
  mockupBannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  mockupBannerSubtitle: {
    color: "#FED7AA",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2
  },
  mockupMetaBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginTop: 12,
    gap: 4
  },
  mockupMetaRow: {
    fontSize: 10.5,
    color: "#334155"
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
