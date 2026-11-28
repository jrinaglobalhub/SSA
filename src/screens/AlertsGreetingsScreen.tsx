import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import {
  Sparkles,
  BellRing,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  Globe,
  Radio,
  ExternalLink,
  ShieldAlert,
  Info,
  RefreshCw,
  Send,
  X,
  ChevronDown,
  Layers,
  ArrowRight,
  Maximize2
} from "lucide-react-native";
import {
  AdminApi,
  FestivalGreeting,
  AlertPopup
} from "../api/adminApi";

interface AlertsGreetingsScreenProps {
  isDark?: boolean;
  defaultTab?: "greetings" | "alerts";
  hideHeaderTabs?: boolean;
  onTabChange?: (tab: "greetings" | "alerts") => void;
}

export const AlertsGreetingsScreen: React.FC<AlertsGreetingsScreenProps> = ({
  isDark = false,
  defaultTab = "greetings",
  hideHeaderTabs = false,
  onTabChange
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 950;

  // Tabs: 'greetings' | 'alerts'
  const [activeTab, setActiveTab] = useState<"greetings" | "alerts">(defaultTab);

  useEffect(() => {
    if (defaultTab && defaultTab !== activeTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabChange = (tab: "greetings" | "alerts") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Data
  const [greetings, setGreetings] = useState<FestivalGreeting[]>([]);
  const [alerts, setAlerts] = useState<AlertPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [greetingSearch, setGreetingSearch] = useState("");
  const [greetingFilter, setGreetingFilter] = useState<"all" | "published" | "scheduled" | "draft" | "disabled" | "expired">("all");
  const [alertSearch, setAlertSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState<"all" | "published" | "scheduled" | "draft" | "disabled" | "expired">("all");
  const [alertPriorityFilter, setAlertPriorityFilter] = useState<"all" | "normal" | "high" | "critical">("all");

  // Greeting Modals & Form
  const [isGreetingModalOpen, setIsGreetingModalOpen] = useState(false);
  const [editingGreetingId, setEditingGreetingId] = useState<string | null>(null);
  const [greetingForm, setGreetingForm] = useState<{
    festivalName: string;
    title: string;
    subtitle: string;
    message: string;
    artworkUrl: string;
    storagePath: string;
    senderText: string;
    supportedLanguages: string[];
    startAtIST: string;
    endAtIST: string;
    buttonText: string;
    status: "draft" | "published";
  }>({
    festivalName: "",
    title: "",
    subtitle: "",
    message: "",
    artworkUrl: "",
    storagePath: "",
    senderText: "SmartShopper by JRINA Private Limited",
    supportedLanguages: ["all"],
    startAtIST: "",
    endAtIST: "",
    buttonText: "Wish You The Same!",
    status: "published"
  });

  // Alert Modals & Form
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState<{
    title: string;
    message: string;
    imageUrl: string;
    storagePath: string;
    popupType: "general" | "important" | "service" | "promotional" | "emergency" | "custom";
    priority: "normal" | "high" | "critical";
    targetAudience: string;
    isDismissible: boolean;
    displayFrequency: "once" | "until_acknowledged" | "every_session";
    buttonText: string;
    buttonActionType: "none" | "screen" | "url";
    buttonActionTarget: string;
    startAtIST: string;
    endAtIST: string;
    status: "draft" | "published";
  }>({
    title: "",
    message: "",
    imageUrl: "",
    storagePath: "",
    popupType: "general",
    priority: "normal",
    targetAudience: "all",
    isDismissible: true,
    displayFrequency: "once",
    buttonText: "Acknowledge",
    buttonActionType: "none",
    buttonActionTarget: "",
    startAtIST: "",
    endAtIST: "",
    status: "published"
  });

  // Live Previews
  const [previewGreeting, setPreviewGreeting] = useState<FestivalGreeting | null>(null);
  const [previewAlert, setPreviewAlert] = useState<AlertPopup | null>(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingAction, setSavingAction] = useState(false);

  const greetingFileInputRef = useRef<HTMLInputElement | null>(null);
  const alertFileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper date conversions
  const getNowIST = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 330); // UTC to IST
    return d.toISOString().slice(0, 16);
  };

  const istToISO = (istString: string) => {
    if (!istString || !istString.trim()) return null;
    try {
      const [datePart, timePart] = istString.split("T");
      if (!datePart || !timePart) return null;
      return `${datePart}T${timePart}:00+05:30`;
    } catch {
      return null;
    }
  };

  const isoToISTInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const istTime = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
      return istTime.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const formatDisplayDate = (isoString?: string | null) => {
    if (!isoString) return "No Expiry (Permanent)";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  // Load Data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [gData, aData] = await Promise.all([
        AdminApi.getAllFestivalGreetings(),
        AdminApi.getAllAlertPopups()
      ]);
      setGreetings(gData);
      setAlerts(aData);
    } catch (err) {
      console.error("[AlertsGreetingsScreen] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = AdminApi.subscribeToPopupsAndGreetings(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Filtered lists
  const filteredGreetings = useMemo(() => {
    return greetings.filter((g) => {
      if (greetingFilter !== "all" && g.status !== greetingFilter) return false;
      if (greetingSearch.trim()) {
        const q = greetingSearch.toLowerCase().trim();
        const matchFest = g.festivalName.toLowerCase().includes(q);
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchMsg = g.message.toLowerCase().includes(q);
        return matchFest || matchTitle || matchMsg;
      }
      return true;
    });
  }, [greetings, greetingFilter, greetingSearch]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter !== "all" && a.status !== alertFilter) return false;
      if (alertPriorityFilter !== "all" && a.priority !== alertPriorityFilter) return false;
      if (alertSearch.trim()) {
        const q = alertSearch.toLowerCase().trim();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchMsg = a.message.toLowerCase().includes(q);
        const matchType = a.popupType.toLowerCase().includes(q);
        return matchTitle || matchMsg || matchType;
      }
      return true;
    });
  }, [alerts, alertFilter, alertPriorityFilter, alertSearch]);

  // Upload handlers
  const handleFileUpload = async (event: any, type: "greetings" | "popups") => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const err = "Please choose a valid image file (JPG, PNG, WebP).";
      setFormErrors((prev) => ({ ...prev, [type === "greetings" ? "artworkUrl" : "imageUrl"]: err }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const err = "File size exceeds 10MB limit.";
      setFormErrors((prev) => ({ ...prev, [type === "greetings" ? "artworkUrl" : "imageUrl"]: err }));
      return;
    }

    setUploadingImage(true);
    setUploadProgress("Uploading artwork to Supabase Storage...");
    try {
      const res = await AdminApi.uploadPopupArtwork(file, file.name, type, file.type);
      if (res.success && res.publicUrl) {
        if (type === "greetings") {
          setGreetingForm((prev) => ({
            ...prev,
            artworkUrl: res.publicUrl!,
            storagePath: res.storagePath || ""
          }));
          setFormErrors((prev) => ({ ...prev, artworkUrl: "" }));
        } else {
          setAlertForm((prev) => ({
            ...prev,
            imageUrl: res.publicUrl!,
            storagePath: res.storagePath || ""
          }));
          setFormErrors((prev) => ({ ...prev, imageUrl: "" }));
        }
        setUploadProgress("Artwork uploaded successfully!");
      } else {
        const err = res.error || "Failed to upload image.";
        setFormErrors((prev) => ({ ...prev, [type === "greetings" ? "artworkUrl" : "imageUrl"]: err }));
        setUploadProgress(null);
      }
    } catch (err: any) {
      setFormErrors((prev) => ({
        ...prev,
        [type === "greetings" ? "artworkUrl" : "imageUrl"]: err?.message || "Upload failed."
      }));
      setUploadProgress(null);
    } finally {
      setUploadingImage(false);
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  // Open Create/Edit Greeting
  const openGreetingForm = (greeting?: FestivalGreeting) => {
    setFormErrors({});
    if (greeting) {
      setEditingGreetingId(greeting.id);
      setGreetingForm({
        festivalName: greeting.festivalName,
        title: greeting.title,
        subtitle: greeting.subtitle || "",
        message: greeting.message,
        artworkUrl: greeting.artworkUrl,
        storagePath: greeting.storagePath || "",
        senderText: greeting.senderText || "SmartShopper by JRINA Private Limited",
        supportedLanguages: greeting.supportedLanguages || ["all"],
        startAtIST: isoToISTInput(greeting.startAt),
        endAtIST: isoToISTInput(greeting.endAt),
        buttonText: greeting.buttonText || "Wish You The Same!",
        status: greeting.status === "draft" ? "draft" : "published"
      });
    } else {
      setEditingGreetingId(null);
      setGreetingForm({
        festivalName: "",
        title: "",
        subtitle: "",
        message: "",
        artworkUrl: "",
        storagePath: "",
        senderText: "SmartShopper by JRINA Private Limited",
        supportedLanguages: ["all"],
        startAtIST: getNowIST(),
        endAtIST: "",
        buttonText: "Wish You The Same!",
        status: "published"
      });
    }
    setIsGreetingModalOpen(true);
  };

  // Save Greeting
  const handleSaveGreeting = async (forcedStatus?: "draft" | "published") => {
    const errors: Record<string, string> = {};
    if (!greetingForm.festivalName.trim()) errors.festivalName = "Festival name is required.";
    if (!greetingForm.title.trim()) errors.title = "Greeting title is required.";
    if (!greetingForm.message.trim()) errors.message = "Greeting message is required.";
    if (!greetingForm.artworkUrl.trim()) errors.artworkUrl = "Artwork image is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingAction(true);
    try {
      const startIso = istToISO(greetingForm.startAtIST) || new Date().toISOString();
      const endIso = istToISO(greetingForm.endAtIST);

      const payload: Partial<FestivalGreeting> = {
        id: editingGreetingId || undefined,
        festivalName: greetingForm.festivalName.trim(),
        title: greetingForm.title.trim(),
        subtitle: greetingForm.subtitle.trim() || undefined,
        message: greetingForm.message.trim(),
        artworkUrl: greetingForm.artworkUrl.trim(),
        storagePath: greetingForm.storagePath || undefined,
        senderText: greetingForm.senderText.trim() || "SmartShopper by JRINA Private Limited",
        supportedLanguages: greetingForm.supportedLanguages,
        startAt: startIso,
        endAt: endIso,
        buttonText: greetingForm.buttonText.trim() || "Wish You The Same!",
        status: forcedStatus || greetingForm.status
      };

      const res = await AdminApi.saveFestivalGreeting(payload);
      if (res.success) {
        setIsGreetingModalOpen(false);
        loadData();
      } else {
        const errorMsg = res.error || "Failed to save festival greeting.";
        setFormErrors({ submit: errorMsg });
        if (Platform.OS === "web") window.alert(`Error: ${errorMsg}`);
        else Alert.alert("Error", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred.";
      setFormErrors({ submit: errorMsg });
    } finally {
      setSavingAction(false);
    }
  };

  // Delete Greeting
  const handleDeleteGreeting = async (greeting: FestivalGreeting) => {
    const confirmAction = async () => {
      setLoading(true);
      const ok = await AdminApi.deleteFestivalGreeting(greeting.id, greeting.storagePath);
      if (ok) {
        loadData();
      } else {
        Alert.alert("Delete Error", "Could not delete greeting card.");
      }
      setLoading(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete festival greeting for "${greeting.festivalName}"?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Confirm Deletion",
        `Are you sure you want to delete greeting for "${greeting.festivalName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmAction }
        ]
      );
    }
  };

  // Toggle Greeting Status
  const handleToggleGreetingStatus = async (greeting: FestivalGreeting) => {
    const isCurrentlyEnabled = greeting.status === "published" || greeting.status === "scheduled";
    const nextStatus = isCurrentlyEnabled ? "disabled" : "published";
    setLoading(true);
    await AdminApi.toggleFestivalGreetingStatus(greeting.id, nextStatus);
    loadData();
  };

  // Open Create/Edit Alert
  const openAlertForm = (alertItem?: AlertPopup) => {
    setFormErrors({});
    if (alertItem) {
      setEditingAlertId(alertItem.id);
      setAlertForm({
        title: alertItem.title,
        message: alertItem.message,
        imageUrl: alertItem.imageUrl || "",
        storagePath: alertItem.storagePath || "",
        popupType: alertItem.popupType,
        priority: alertItem.priority,
        targetAudience: alertItem.targetAudience,
        isDismissible: alertItem.isDismissible,
        displayFrequency: alertItem.displayFrequency,
        buttonText: alertItem.buttonText || "Acknowledge",
        buttonActionType: alertItem.buttonActionType,
        buttonActionTarget: alertItem.buttonActionTarget || "",
        startAtIST: isoToISTInput(alertItem.startAt),
        endAtIST: isoToISTInput(alertItem.endAt),
        status: alertItem.status === "draft" ? "draft" : "published"
      });
    } else {
      setEditingAlertId(null);
      setAlertForm({
        title: "",
        message: "",
        imageUrl: "",
        storagePath: "",
        popupType: "general",
        priority: "normal",
        targetAudience: "all",
        isDismissible: true,
        displayFrequency: "once",
        buttonText: "Acknowledge",
        buttonActionType: "none",
        buttonActionTarget: "",
        startAtIST: getNowIST(),
        endAtIST: "",
        status: "published"
      });
    }
    setIsAlertModalOpen(true);
  };

  // Save Alert
  const handleSaveAlert = async (forcedStatus?: "draft" | "published") => {
    const errors: Record<string, string> = {};
    if (!alertForm.title.trim()) errors.title = "Alert title is required.";
    if (!alertForm.message.trim()) errors.message = "Alert message body is required.";

    if (alertForm.buttonActionType === "url" && !alertForm.buttonActionTarget.trim().startsWith("http")) {
      errors.buttonActionTarget = "Please enter a valid URL starting with http:// or https://";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingAction(true);
    try {
      const startIso = istToISO(alertForm.startAtIST) || new Date().toISOString();
      const endIso = istToISO(alertForm.endAtIST);

      const payload: Partial<AlertPopup> = {
        id: editingAlertId || undefined,
        title: alertForm.title.trim(),
        message: alertForm.message.trim(),
        imageUrl: alertForm.imageUrl.trim() || undefined,
        storagePath: alertForm.storagePath || undefined,
        popupType: alertForm.popupType,
        priority: alertForm.priority,
        targetAudience: alertForm.targetAudience,
        isDismissible: alertForm.isDismissible,
        displayFrequency: alertForm.displayFrequency,
        buttonText: alertForm.buttonText.trim() || "Acknowledge",
        buttonActionType: alertForm.buttonActionType,
        buttonActionTarget: alertForm.buttonActionTarget.trim() || undefined,
        startAt: startIso,
        endAt: endIso,
        status: forcedStatus || alertForm.status
      };

      const res = await AdminApi.saveAlertPopup(payload);
      if (res.success) {
        setIsAlertModalOpen(false);
        loadData();
      } else {
        const errorMsg = res.error || "Failed to save alert popup.";
        setFormErrors({ submit: errorMsg });
        if (Platform.OS === "web") window.alert(`Error: ${errorMsg}`);
        else Alert.alert("Error", errorMsg);
      }
    } catch (err: any) {
      setFormErrors({ submit: err?.message || "An unexpected error occurred." });
    } finally {
      setSavingAction(false);
    }
  };

  // Delete Alert
  const handleDeleteAlert = async (alertItem: AlertPopup) => {
    const confirmAction = async () => {
      setLoading(true);
      const ok = await AdminApi.deleteAlertPopup(alertItem.id, alertItem.storagePath);
      if (ok) {
        loadData();
      } else {
        Alert.alert("Delete Error", "Could not delete alert popup.");
      }
      setLoading(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete alert "${alertItem.title}"?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Confirm Deletion",
        `Are you sure you want to delete alert "${alertItem.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmAction }
        ]
      );
    }
  };

  // Toggle Alert Status
  const handleToggleAlertStatus = async (alertItem: AlertPopup) => {
    const isCurrentlyEnabled = alertItem.status === "published" || alertItem.status === "scheduled";
    const nextStatus = isCurrentlyEnabled ? "disabled" : "published";
    setLoading(true);
    await AdminApi.toggleAlertPopupStatus(alertItem.id, nextStatus);
    loadData();
  };

  // UI Theme styling
  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        border: "#1E293B",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        accent: "#FC4E03",
        inputBg: "#0F172A",
        pillBg: "#1E293B",
        badgePublishedBg: "#064E3B",
        badgePublishedText: "#34D399",
        badgeScheduledBg: "#1E3A8A",
        badgeScheduledText: "#60A5FA",
        badgeDraftBg: "#334155",
        badgeDraftText: "#94A3B8",
        badgeDisabledBg: "#450A0A",
        badgeDisabledText: "#F87171"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        border: "#E2E8F0",
        textMain: "#0F172A",
        textSub: "#64748B",
        accent: "#FC4E03",
        inputBg: "#F8FAFC",
        pillBg: "#F1F5F9",
        badgePublishedBg: "#ECFDF5",
        badgePublishedText: "#059669",
        badgeScheduledBg: "#EFF6FF",
        badgeScheduledText: "#2563EB",
        badgeDraftBg: "#F1F5F9",
        badgeDraftText: "#64748B",
        badgeDisabledBg: "#FEF2F2",
        badgeDisabledText: "#DC2626"
      };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      {/* Hidden Web File Inputs */}
      {Platform.OS === "web" && (
        <>
          <input
            type="file"
            ref={greetingFileInputRef as any}
            style={{ display: "none" }}
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "greetings")}
          />
          <input
            type="file"
            ref={alertFileInputRef as any}
            style={{ display: "none" }}
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "popups")}
          />
        </>
      )}

      {/* Screen Title & Header */}
      <View style={styles.topHeader}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[styles.headerIconBox, { backgroundColor: "#FFF7ED" }]}>
              <BellRing size={22} color="#FC4E03" />
            </View>
            <View>
              <Text style={[styles.screenTitle, { color: colors.textMain }]}>
                Greeting Cards & Alert Popups
              </Text>
              <Text style={[styles.screenSubtitle, { color: colors.textSub }]}>
                Manage consumer festival cards, emergency alerts, service notices, and system announcements
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={loadData}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          <RefreshCw size={15} color={colors.textMain} style={refreshing && { transform: [{ rotate: "45deg" }] }} />
          <Text style={[styles.refreshBtnText, { color: colors.textMain }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Overview Analytics Bar */}
      <View style={[styles.statsRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textSub }]}>Active Festival Greeting</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Sparkles size={16} color="#EA580C" />
            <Text style={[styles.statValue, { color: colors.textMain }]}>
              {greetings.filter((g) => g.status === "published").length > 0 ? "1 Live" : "None Active"}
            </Text>
          </View>
          <Text style={[styles.statCaption, { color: colors.textSub }]}>First-entry seasonal celebration</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textSub }]}>Live Published Alerts</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Radio size={16} color="#16A34A" />
            <Text style={[styles.statValue, { color: colors.textMain }]}>
              {alerts.filter((a) => a.status === "published").length}
            </Text>
          </View>
          <Text style={[styles.statCaption, { color: colors.textSub }]}>
            {alerts.filter((a) => a.priority === "critical" && a.status === "published").length > 0
              ? "Critical Notice Active"
              : "Standard Priority Queue"}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textSub }]}>Target Audience</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Globe size={16} color="#2563EB" />
            <Text style={[styles.statValue, { color: colors.textMain }]}>All SSC Users</Text>
          </View>
          <Text style={[styles.statCaption, { color: colors.textSub }]}>Real-time synchronization</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textSub }]}>Total Views / Deliveries</Text>
          <Text style={[styles.statValue, { color: colors.textMain, marginTop: 4 }]}>
            {alerts.reduce((sum, a) => sum + a.viewedCount, 0) + greetings.reduce((sum, g) => sum + g.viewsCount, 0)}
          </Text>
          <Text style={[styles.statCaption, { color: colors.textSub }]}>Telemetry confirmed</Text>
        </View>
      </View>

      {/* Main Navigation Tabs */}
      {!hideHeaderTabs && (
        <View style={[styles.tabsNav, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "greetings" && [styles.tabItemActive, { borderBottomColor: colors.accent }]
            ]}
            onPress={() => handleTabChange("greetings")}
            activeOpacity={0.8}
          >
            <Sparkles
              size={18}
              color={activeTab === "greetings" ? colors.accent : colors.textSub}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.tabItemText,
                { color: activeTab === "greetings" ? colors.accent : colors.textSub }
              ]}
            >
              Festival Greeting Cards ({greetings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "alerts" && [styles.tabItemActive, { borderBottomColor: colors.accent }]
            ]}
            onPress={() => handleTabChange("alerts")}
            activeOpacity={0.8}
          >
            <AlertCircle
              size={18}
              color={activeTab === "alerts" ? colors.accent : colors.textSub}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.tabItemText,
                { color: activeTab === "alerts" ? colors.accent : colors.textSub }
              ]}
            >
              Alerts & Popup Messages ({alerts.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 1: FESTIVAL GREETING CARDS */}
      {activeTab === "greetings" && (
        <View style={styles.tabContent}>
          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Search festival, title or message..."
                placeholderTextColor={colors.textSub}
                value={greetingSearch}
                onChangeText={setGreetingSearch}
              />
              {greetingSearch ? (
                <TouchableOpacity onPress={() => setGreetingSearch("")}>
                  <X size={15} color={colors.textSub} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterPills}>
              {(["all", "published", "scheduled", "draft", "disabled", "expired"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.filterPill,
                    { borderColor: colors.border },
                    greetingFilter === st && { backgroundColor: "#FFF7ED", borderColor: colors.accent }
                  ]}
                  onPress={() => setGreetingFilter(st)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: greetingFilter === st ? colors.accent : colors.textSub }
                    ]}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.accent }]}
              onPress={() => openGreetingForm()}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>+ Create Festival Greeting</Text>
            </TouchableOpacity>
          </View>

          {/* Cards Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading festival greeting cards...</Text>
            </View>
          ) : filteredGreetings.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Sparkles size={36} color={colors.textSub} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Festival Greeting Cards Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                {greetingSearch ? "Try a different search query or filter" : "Click '+ Create Festival Greeting' to design celebration popups for Onam, Eid, Christmas, New Year, etc."}
              </Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredGreetings.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                >
                  {/* Artwork Banner */}
                  <View style={styles.cardArtworkWrapper}>
                    <Image source={{ uri: item.artworkUrl }} style={styles.cardArtwork} resizeMode="cover" />
                    <View style={styles.cardStatusBadgeRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "published" && { backgroundColor: colors.badgePublishedBg },
                          item.status === "scheduled" && { backgroundColor: colors.badgeScheduledBg },
                          item.status === "draft" && { backgroundColor: colors.badgeDraftBg },
                          (item.status === "disabled" || item.status === "expired") && { backgroundColor: colors.badgeDisabledBg }
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === "published" && { color: colors.badgePublishedText },
                            item.status === "scheduled" && { color: colors.badgeScheduledText },
                            item.status === "draft" && { color: colors.badgeDraftText },
                            (item.status === "disabled" || item.status === "expired") && { color: colors.badgeDisabledText }
                          ]}
                        >
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardFestivalTagRow}>
                      <Sparkles size={13} color="#EA580C" />
                      <Text style={styles.cardFestivalTag}>{item.festivalName.toUpperCase()}</Text>
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={[styles.cardSubtitle, { color: colors.textSub }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}

                    <Text style={[styles.cardMessage, { color: colors.textSub }]} numberOfLines={3}>
                      {item.message}
                    </Text>

                    {/* Sender Branding */}
                    <View style={[styles.senderBox, { backgroundColor: colors.pillBg }]}>
                      <Text style={[styles.senderLabel, { color: colors.textSub }]}>Sender / Branding:</Text>
                      <Text style={[styles.senderValue, { color: colors.textMain }]} numberOfLines={1}>
                        {item.senderText}
                      </Text>
                    </View>

                    {/* Dates */}
                    <View style={styles.dateMetaRow}>
                      <Calendar size={12} color={colors.textSub} style={{ marginRight: 4 }} />
                      <Text style={[styles.dateMetaText, { color: colors.textSub }]} numberOfLines={1}>
                        {formatDisplayDate(item.startAt)} &rarr; {formatDisplayDate(item.endAt)}
                      </Text>
                    </View>

                    {/* Analytics Summary */}
                    <View style={[styles.analyticsMiniRow, { borderColor: colors.border }]}>
                      <Text style={[styles.analyticsMiniText, { color: colors.textSub }]}>
                        Views: <Text style={{ fontWeight: "700", color: colors.textMain }}>{item.viewsCount}</Text>
                      </Text>
                      <Text style={[styles.analyticsMiniText, { color: colors.textSub }]}>
                        Dismissals: <Text style={{ fontWeight: "700", color: colors.textMain }}>{item.dismissalsCount}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.footerActionBtn, { borderColor: colors.border }]}
                      onPress={() => setPreviewGreeting(item)}
                    >
                      <Eye size={14} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={[styles.footerActionText, { color: "#2563EB" }]}>Live Preview</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.footerActionBtn, { borderColor: colors.border }]}
                      onPress={() => handleToggleGreetingStatus(item)}
                    >
                      <Radio
                        size={14}
                        color={(item.status === "published" || item.status === "scheduled") ? "#DC2626" : "#16A34A"}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.footerActionText,
                          { color: (item.status === "published" || item.status === "scheduled") ? "#DC2626" : "#16A34A" }
                        ]}
                      >
                        {(item.status === "published" || item.status === "scheduled") ? "Disable" : "Publish"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.footerActionBtn, { borderColor: colors.border }]}
                      onPress={() => openGreetingForm(item)}
                    >
                      <Edit3 size={14} color={colors.textMain} style={{ marginRight: 4 }} />
                      <Text style={[styles.footerActionText, { color: colors.textMain }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.footerActionBtn, { borderColor: colors.border }]}
                      onPress={() => handleDeleteGreeting(item)}
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 2: MANUAL ALERTS & POPUP MESSAGES */}
      {activeTab === "alerts" && (
        <View style={styles.tabContent}>
          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Search alert title or announcement..."
                placeholderTextColor={colors.textSub}
                value={alertSearch}
                onChangeText={setAlertSearch}
              />
              {alertSearch ? (
                <TouchableOpacity onPress={() => setAlertSearch("")}>
                  <X size={15} color={colors.textSub} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterPills}>
              {(["all", "critical", "high", "normal"] as const).map((pr) => (
                <TouchableOpacity
                  key={pr}
                  style={[
                    styles.filterPill,
                    { borderColor: colors.border },
                    alertPriorityFilter === pr && { backgroundColor: "#FFF7ED", borderColor: colors.accent }
                  ]}
                  onPress={() => setAlertPriorityFilter(pr)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: alertPriorityFilter === pr ? colors.accent : colors.textSub }
                    ]}
                  >
                    {pr === "all" ? "All Priorities" : pr.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.accent }]}
              onPress={() => openAlertForm()}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>+ Create Alert / Popup</Text>
            </TouchableOpacity>
          </View>

          {/* Alerts Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading alert popups...</Text>
            </View>
          ) : filteredAlerts.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <AlertCircle size={36} color={colors.textSub} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Alert Popups Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                {alertSearch ? "Try a different search query" : "Click '+ Create Alert / Popup' to publish custom emergency, service, or promotional messages to all SmartShopper consumers."}
              </Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredAlerts.map((item) => {
                const isCritical = item.priority === "critical";
                const isHigh = item.priority === "high";

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      { backgroundColor: colors.cardBg, borderColor: isCritical ? "#FCA5A5" : colors.border },
                      isCritical && { borderWidth: 2 }
                    ]}
                  >
                    {/* Header Tag with Priority & Type */}
                    <View style={styles.alertCardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View
                          style={[
                            styles.priorityChip,
                            isCritical && { backgroundColor: "#FEF2F2", borderColor: "#DC2626" },
                            isHigh && { backgroundColor: "#FFFBEB", borderColor: "#D97706" },
                            !isCritical && !isHigh && { backgroundColor: "#EFF6FF", borderColor: "#2563EB" }
                          ]}
                        >
                          {isCritical ? (
                            <AlertTriangle size={11} color="#DC2626" />
                          ) : (
                            <Info size={11} color={isHigh ? "#D97706" : "#2563EB"} />
                          )}
                          <Text
                            style={[
                              styles.priorityChipText,
                              { color: isCritical ? "#DC2626" : isHigh ? "#D97706" : "#2563EB" }
                            ]}
                          >
                            {item.priority.toUpperCase()}
                          </Text>
                        </View>

                        <Text style={[styles.alertTypeTag, { color: colors.textSub }]}>
                          {item.popupType.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "published" && { backgroundColor: colors.badgePublishedBg },
                          item.status === "scheduled" && { backgroundColor: colors.badgeScheduledBg },
                          item.status === "draft" && { backgroundColor: colors.badgeDraftBg },
                          (item.status === "disabled" || item.status === "expired") && { backgroundColor: colors.badgeDisabledBg }
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === "published" && { color: colors.badgePublishedText },
                            item.status === "scheduled" && { color: colors.badgeScheduledText },
                            item.status === "draft" && { color: colors.badgeDraftText },
                            (item.status === "disabled" || item.status === "expired") && { color: colors.badgeDisabledText }
                          ]}
                        >
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Image Banner if present */}
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.alertCardImg} resizeMode="cover" />
                    ) : null}

                    {/* Body */}
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <Text style={[styles.cardMessage, { color: colors.textSub }]} numberOfLines={3}>
                        {item.message}
                      </Text>

                      {/* Parameters Grid */}
                      <View style={[styles.alertMetaGrid, { backgroundColor: colors.pillBg }]}>
                        <View style={styles.alertMetaItem}>
                          <Text style={[styles.metaItemLabel, { color: colors.textSub }]}>Frequency:</Text>
                          <Text style={[styles.metaItemValue, { color: colors.textMain }]}>
                            {item.displayFrequency.replace("_", " ")}
                          </Text>
                        </View>
                        <View style={styles.alertMetaItem}>
                          <Text style={[styles.metaItemLabel, { color: colors.textSub }]}>Dismissible:</Text>
                          <Text style={[styles.metaItemValue, { color: item.isDismissible ? "#16A34A" : "#DC2626" }]}>
                            {item.isDismissible ? "Yes" : "Action Required"}
                          </Text>
                        </View>
                        {item.buttonActionType !== "none" ? (
                          <View style={styles.alertMetaItem}>
                            <Text style={[styles.metaItemLabel, { color: colors.textSub }]}>Action:</Text>
                            <Text style={[styles.metaItemValue, { color: "#2563EB" }]} numberOfLines={1}>
                              {item.buttonActionType}: {item.buttonActionTarget || "Target"}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Dates */}
                      <View style={styles.dateMetaRow}>
                        <Calendar size={12} color={colors.textSub} style={{ marginRight: 4 }} />
                        <Text style={[styles.dateMetaText, { color: colors.textSub }]} numberOfLines={1}>
                          {formatDisplayDate(item.startAt)} &rarr; {formatDisplayDate(item.endAt)}
                        </Text>
                      </View>

                      {/* Analytics stats */}
                      <View style={[styles.analyticsMiniRow, { borderColor: colors.border }]}>
                        <Text style={[styles.analyticsMiniText, { color: colors.textSub }]}>
                          Delivered: <Text style={{ fontWeight: "700", color: colors.textMain }}>{item.deliveredCount}</Text>
                        </Text>
                        <Text style={[styles.analyticsMiniText, { color: colors.textSub }]}>
                          Viewed: <Text style={{ fontWeight: "700", color: colors.textMain }}>{item.viewedCount}</Text>
                        </Text>
                        <Text style={[styles.analyticsMiniText, { color: colors.textSub }]}>
                          Acked: <Text style={{ fontWeight: "700", color: colors.textMain }}>{item.acknowledgedCount}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { borderColor: colors.border }]}
                        onPress={() => setPreviewAlert(item)}
                      >
                        <Eye size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={[styles.footerActionText, { color: "#2563EB" }]}>Live Preview</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.footerActionBtn, { borderColor: colors.border }]}
                        onPress={() => handleToggleAlertStatus(item)}
                      >
                        <Radio
                          size={14}
                          color={(item.status === "published" || item.status === "scheduled") ? "#DC2626" : "#16A34A"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.footerActionText,
                            { color: (item.status === "published" || item.status === "scheduled") ? "#DC2626" : "#16A34A" }
                          ]}
                        >
                          {(item.status === "published" || item.status === "scheduled") ? "Disable" : "Publish"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.footerActionBtn, { borderColor: colors.border }]}
                        onPress={() => openAlertForm(item)}
                      >
                        <Edit3 size={14} color={colors.textMain} style={{ marginRight: 4 }} />
                        <Text style={[styles.footerActionText, { color: colors.textMain }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.footerActionBtn, { borderColor: colors.border }]}
                        onPress={() => handleDeleteAlert(item)}
                      >
                        <Trash2 size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* MODAL 1: FESTIVAL GREETING FORM */}
      <Modal
        visible={isGreetingModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsGreetingModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.headerIconBox, { backgroundColor: "#FFF7ED" }]}>
                  <Sparkles size={18} color="#EA580C" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    {editingGreetingId ? "Edit Festival Greeting" : "Create New Festival Greeting"}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
                    Design seasonal celebration cards with artwork, warm wishes, and sender branding
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsGreetingModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView style={styles.modalScrollBody} contentContainerStyle={{ padding: 20 }}>
              {/* Form submit error */}
              {formErrors.submit ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{formErrors.submit}</Text>
                </View>
              ) : null}

              {/* 1. Festival Name & Title */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    Festival Name <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: colors.inputBg, borderColor: formErrors.festivalName ? "#DC2626" : colors.border, color: colors.textMain }
                    ]}
                    placeholder="e.g. Onam, Eid-ul-Fitr, Christmas, New Year, Vishu, Diwali"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.festivalName}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, festivalName: val }))}
                  />
                  {formErrors.festivalName ? <Text style={styles.errorField}>{formErrors.festivalName}</Text> : null}
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>
                    Greeting Title <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: colors.inputBg, borderColor: formErrors.title ? "#DC2626" : colors.border, color: colors.textMain }
                    ]}
                    placeholder="e.g. Happy Onam!, Eid Mubarak!, Merry Christmas!"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.title}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, title: val }))}
                  />
                  {formErrors.title ? <Text style={styles.errorField}>{formErrors.title}</Text> : null}
                </View>
              </View>

              {/* 2. Subtitle & Sender Text */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Subtitle / Tagline (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="e.g. Wishing you prosperity, joy and sweet celebrations"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.subtitle}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, subtitle: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Sender / Branding Text</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="Default: SmartShopper by JRINA Private Limited"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.senderText}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, senderText: val }))}
                  />
                </View>
              </View>

              {/* 3. Greeting Message Body */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Warm Greeting Message <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.formTextArea,
                    { backgroundColor: colors.inputBg, borderColor: formErrors.message ? "#DC2626" : colors.border, color: colors.textMain }
                  ]}
                  placeholder="Enter full warm greeting message to SmartShopper shoppers..."
                  placeholderTextColor={colors.textSub}
                  value={greetingForm.message}
                  onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, message: val }))}
                  multiline
                  numberOfLines={4}
                />
                {formErrors.message ? <Text style={styles.errorField}>{formErrors.message}</Text> : null}
              </View>

              {/* 4. Artwork / Image Upload */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Greeting Artwork Image <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  {Platform.OS === "web" && (
                    <TouchableOpacity
                      style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                      onPress={() => greetingFileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#EA580C" style={{ marginRight: 6 }} />
                      ) : (
                        <Plus size={15} color="#EA580C" style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.uploadBtnText, { color: colors.textMain }]}>Upload Artwork File</Text>
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={[
                      styles.formInput,
                      { flex: 1, backgroundColor: colors.inputBg, borderColor: formErrors.artworkUrl ? "#DC2626" : colors.border, color: colors.textMain }
                    ]}
                    placeholder="Or paste artwork image URL..."
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.artworkUrl}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, artworkUrl: val }))}
                    autoCapitalize="none"
                  />
                </View>
                {uploadProgress ? (
                  <Text style={[styles.uploadProgressMsg, { color: "#EA580C" }]}>{uploadProgress}</Text>
                ) : null}
                {formErrors.artworkUrl ? <Text style={styles.errorField}>{formErrors.artworkUrl}</Text> : null}

                {/* Live image preview */}
                {greetingForm.artworkUrl.trim().length > 5 ? (
                  <View style={styles.previewFrame}>
                    <Text style={[styles.previewFrameLabel, { color: colors.textSub }]}>Artwork Preview:</Text>
                    <Image source={{ uri: greetingForm.artworkUrl }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                ) : null}
              </View>

              {/* 5. Schedule & Button Text */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Activation Date/Time (IST)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.startAtIST}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, startAtIST: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Expiration Date/Time (IST)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="YYYY-MM-DDTHH:mm (Optional)"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.endAtIST}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, endAtIST: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Button Text</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="Default: Wish You The Same!"
                    placeholderTextColor={colors.textSub}
                    value={greetingForm.buttonText}
                    onChangeText={(val) => setGreetingForm((prev) => ({ ...prev, buttonText: val }))}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooterRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsGreetingModalOpen(false)}
                disabled={savingAction}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSub }]}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.saveDraftBtn, { borderColor: colors.border }]}
                  onPress={() => handleSaveGreeting("draft")}
                  disabled={savingAction}
                >
                  <Text style={[styles.saveDraftBtnText, { color: colors.textMain }]}>Save as Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.savePublishBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleSaveGreeting("published")}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.savePublishBtnText}>
                        {editingGreetingId ? "Update & Publish" : "Publish Greeting"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ALERT & POPUP FORM */}
      <Modal
        visible={isAlertModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAlertModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.headerIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <AlertCircle size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    {editingAlertId ? "Edit Alert Popup" : "Create New Alert / Popup Message"}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
                    Publish emergency notices, service alerts, and announcements to SmartShopper consumers
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsAlertModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView style={styles.modalScrollBody} contentContainerStyle={{ padding: 20 }}>
              {/* Form submit error */}
              {formErrors.submit ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{formErrors.submit}</Text>
                </View>
              ) : null}

              {/* 1. Priority & Type Selection */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Priority Level</Text>
                  <View style={styles.chipRow}>
                    {(["normal", "high", "critical"] as const).map((pr) => (
                      <TouchableOpacity
                        key={pr}
                        style={[
                          styles.selectableChip,
                          { borderColor: colors.border },
                          alertForm.priority === pr && {
                            backgroundColor: pr === "critical" ? "#FEF2F2" : pr === "high" ? "#FFFBEB" : "#EFF6FF",
                            borderColor: pr === "critical" ? "#DC2626" : pr === "high" ? "#D97706" : "#2563EB"
                          }
                        ]}
                        onPress={() => setAlertForm((prev) => ({ ...prev, priority: pr }))}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            {
                              color:
                                alertForm.priority === pr
                                  ? pr === "critical"
                                    ? "#DC2626"
                                    : pr === "high"
                                    ? "#D97706"
                                    : "#2563EB"
                                  : colors.textSub
                            }
                          ]}
                        >
                          {pr.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1.5 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Popup Announcement Type</Text>
                  <View style={styles.chipRow}>
                    {(["general", "important", "service", "promotional", "emergency", "custom"] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.selectableChip,
                          { borderColor: colors.border },
                          alertForm.popupType === t && { backgroundColor: "#FFF7ED", borderColor: colors.accent }
                        ]}
                        onPress={() => setAlertForm((prev) => ({ ...prev, popupType: t }))}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            { color: alertForm.popupType === t ? colors.accent : colors.textSub }
                          ]}
                        >
                          {t.replace("_", " ").toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 2. Title & Message */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Alert Title <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: colors.inputBg, borderColor: formErrors.title ? "#DC2626" : colors.border, color: colors.textMain }
                  ]}
                  placeholder="e.g. Kerala Monsoon Service Update, Emergency Weather Alert, System Maintenance"
                  placeholderTextColor={colors.textSub}
                  value={alertForm.title}
                  onChangeText={(val) => setAlertForm((prev) => ({ ...prev, title: val }))}
                />
                {formErrors.title ? <Text style={styles.errorField}>{formErrors.title}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>
                  Message Body <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.formTextArea,
                    { backgroundColor: colors.inputBg, borderColor: formErrors.message ? "#DC2626" : colors.border, color: colors.textMain }
                  ]}
                  placeholder="Enter detailed notice, emergency instructions, or announcement text..."
                  placeholderTextColor={colors.textSub}
                  value={alertForm.message}
                  onChangeText={(val) => setAlertForm((prev) => ({ ...prev, message: val }))}
                  multiline
                  numberOfLines={4}
                />
                {formErrors.message ? <Text style={styles.errorField}>{formErrors.message}</Text> : null}
              </View>

              {/* 3. Image / Banner (Optional) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Optional Image / Banner Header</Text>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  {Platform.OS === "web" && (
                    <TouchableOpacity
                      style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                      onPress={() => alertFileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
                      ) : (
                        <Plus size={15} color="#2563EB" style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.uploadBtnText, { color: colors.textMain }]}>Upload Banner</Text>
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={[
                      styles.formInput,
                      { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }
                    ]}
                    placeholder="Or paste banner image URL..."
                    placeholderTextColor={colors.textSub}
                    value={alertForm.imageUrl}
                    onChangeText={(val) => setAlertForm((prev) => ({ ...prev, imageUrl: val }))}
                    autoCapitalize="none"
                  />
                </View>

                {alertForm.imageUrl.trim().length > 5 ? (
                  <View style={styles.previewFrame}>
                    <Text style={[styles.previewFrameLabel, { color: colors.textSub }]}>Banner Preview:</Text>
                    <Image source={{ uri: alertForm.imageUrl }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                ) : null}
              </View>

              {/* 4. Display Frequency & Dismissibility */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Display Frequency</Text>
                  <View style={styles.chipRow}>
                    {(["once", "until_acknowledged", "every_session"] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.selectableChip,
                          { borderColor: colors.border },
                          alertForm.displayFrequency === freq && { backgroundColor: "#EFF6FF", borderColor: "#2563EB" }
                        ]}
                        onPress={() => setAlertForm((prev) => ({ ...prev, displayFrequency: freq }))}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            { color: alertForm.displayFrequency === freq ? "#2563EB" : colors.textSub }
                          ]}
                        >
                          {freq.replace("_", " ")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Dismissible Outside Tap?</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectableChip,
                        { borderColor: colors.border },
                        alertForm.isDismissible && { backgroundColor: "#ECFDF5", borderColor: "#059669" }
                      ]}
                      onPress={() => setAlertForm((prev) => ({ ...prev, isDismissible: true }))}
                    >
                      <Text
                        style={[
                          styles.selectableChipText,
                          { color: alertForm.isDismissible ? "#059669" : colors.textSub }
                        ]}
                      >
                        Yes (Dismissible)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.selectableChip,
                        { borderColor: colors.border },
                        !alertForm.isDismissible && { backgroundColor: "#FEF2F2", borderColor: "#DC2626" }
                      ]}
                      onPress={() => setAlertForm((prev) => ({ ...prev, isDismissible: false }))}
                    >
                      <Text
                        style={[
                          styles.selectableChipText,
                          { color: !alertForm.isDismissible ? "#DC2626" : colors.textSub }
                        ]}
                      >
                        Non-dismissible (Mandatory Ack)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 5. Action Button Settings */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Button Text</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="Default: Acknowledge"
                    placeholderTextColor={colors.textSub}
                    value={alertForm.buttonText}
                    onChangeText={(val) => setAlertForm((prev) => ({ ...prev, buttonText: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Action Type</Text>
                  <View style={styles.chipRow}>
                    {(["none", "screen", "url"] as const).map((at) => (
                      <TouchableOpacity
                        key={at}
                        style={[
                          styles.selectableChip,
                          { borderColor: colors.border },
                          alertForm.buttonActionType === at && { backgroundColor: "#EFF6FF", borderColor: "#2563EB" }
                        ]}
                        onPress={() => setAlertForm((prev) => ({ ...prev, buttonActionType: at }))}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            { color: alertForm.buttonActionType === at ? "#2563EB" : colors.textSub }
                          ]}
                        >
                          {at.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {alertForm.buttonActionType !== "none" ? (
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { color: colors.textMain }]}>
                      {alertForm.buttonActionType === "screen" ? "Screen Name" : "Target URL"}
                    </Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        { backgroundColor: colors.inputBg, borderColor: formErrors.buttonActionTarget ? "#DC2626" : colors.border, color: colors.textMain }
                      ]}
                      placeholder={alertForm.buttonActionType === "screen" ? "e.g. Deals, Account, Map" : "https://..."}
                      placeholderTextColor={colors.textSub}
                      value={alertForm.buttonActionTarget}
                      onChangeText={(val) => setAlertForm((prev) => ({ ...prev, buttonActionTarget: val }))}
                      autoCapitalize="none"
                    />
                    {formErrors.buttonActionTarget ? (
                      <Text style={styles.errorField}>{formErrors.buttonActionTarget}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* 6. Schedule Start & End */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Activation Date/Time (IST)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor={colors.textSub}
                    value={alertForm.startAtIST}
                    onChangeText={(val) => setAlertForm((prev) => ({ ...prev, startAtIST: val }))}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Expiration Date/Time (IST)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="YYYY-MM-DDTHH:mm (Optional)"
                    placeholderTextColor={colors.textSub}
                    value={alertForm.endAtIST}
                    onChangeText={(val) => setAlertForm((prev) => ({ ...prev, endAtIST: val }))}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooterRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsAlertModalOpen(false)}
                disabled={savingAction}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSub }]}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.saveDraftBtn, { borderColor: colors.border }]}
                  onPress={() => handleSaveAlert("draft")}
                  disabled={savingAction}
                >
                  <Text style={[styles.saveDraftBtnText, { color: colors.textMain }]}>Save as Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.savePublishBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleSaveAlert("published")}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.savePublishBtnText}>
                        {editingAlertId ? "Update & Publish Alert" : "Publish Alert Now"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MOCKUP MODAL: LIVE PREVIEW OF FESTIVAL GREETING CARD */}
      <Modal
        visible={previewGreeting !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewGreeting(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.phoneMockupContainer}>
            <View style={styles.phoneHeaderBar}>
              <Text style={styles.phoneHeaderTitle}>SSC Consumer Preview — Festival Card</Text>
              <TouchableOpacity onPress={() => setPreviewGreeting(null)}>
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.phoneScreen}>
              {previewGreeting && (
                <View style={styles.sscGreetingPopupCard}>
                  {/* Artwork Banner */}
                  <Image
                    source={{ uri: previewGreeting.artworkUrl }}
                    style={styles.sscGreetingArtwork}
                    resizeMode="cover"
                  />

                  {/* Festival Tag */}
                  <View style={styles.sscGreetingBody}>
                    <View style={styles.sscGreetingTagRow}>
                      <Sparkles size={13} color="#FC4E03" />
                      <Text style={styles.sscGreetingTagText}>{previewGreeting.festivalName.toUpperCase()}</Text>
                    </View>

                    <Text style={styles.sscGreetingTitle}>{previewGreeting.title}</Text>
                    {previewGreeting.subtitle ? (
                      <Text style={styles.sscGreetingSubtitle}>{previewGreeting.subtitle}</Text>
                    ) : null}

                    <Text style={styles.sscGreetingMessage}>{previewGreeting.message}</Text>

                    {/* Sender Branding */}
                    <View style={styles.sscSenderBox}>
                      <Text style={styles.sscSenderText}>{previewGreeting.senderText}</Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      style={styles.sscGreetingActionBtn}
                      onPress={() => setPreviewGreeting(null)}
                    >
                      <Text style={styles.sscGreetingActionBtnText}>
                        {previewGreeting.buttonText || "Wish You The Same!"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MOCKUP MODAL: LIVE PREVIEW OF ALERT / POPUP */}
      <Modal
        visible={previewAlert !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewAlert(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.phoneMockupContainer}>
            <View style={styles.phoneHeaderBar}>
              <Text style={styles.phoneHeaderTitle}>SSC Consumer Preview — Alert Popup</Text>
              <TouchableOpacity onPress={() => setPreviewAlert(null)}>
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.phoneScreen}>
              {previewAlert && (
                <View
                  style={[
                    styles.sscAlertPopupCard,
                    previewAlert.priority === "critical" && { borderColor: "#DC2626", borderWidth: 2 }
                  ]}
                >
                  {/* Banner Image if present */}
                  {previewAlert.imageUrl ? (
                    <Image source={{ uri: previewAlert.imageUrl }} style={styles.sscAlertImage} resizeMode="cover" />
                  ) : null}

                  <View style={styles.sscAlertBody}>
                    {/* Header Tag with Priority & Type */}
                    <View style={styles.sscAlertHeaderRow}>
                      <View
                        style={[
                          styles.sscPriorityBadge,
                          previewAlert.priority === "critical" && { backgroundColor: "#FEF2F2", borderColor: "#DC2626" },
                          previewAlert.priority === "high" && { backgroundColor: "#FFFBEB", borderColor: "#D97706" },
                          previewAlert.priority === "normal" && { backgroundColor: "#EFF6FF", borderColor: "#2563EB" }
                        ]}
                      >
                        {previewAlert.priority === "critical" ? (
                          <AlertTriangle size={12} color="#DC2626" />
                        ) : (
                          <Info size={12} color={previewAlert.priority === "high" ? "#D97706" : "#2563EB"} />
                        )}
                        <Text
                          style={[
                            styles.sscPriorityBadgeText,
                            {
                              color:
                                previewAlert.priority === "critical"
                                  ? "#DC2626"
                                  : previewAlert.priority === "high"
                                  ? "#D97706"
                                  : "#2563EB"
                            }
                          ]}
                        >
                          {previewAlert.priority.toUpperCase()} &bull; {previewAlert.popupType.toUpperCase()}
                        </Text>
                      </View>

                      {previewAlert.isDismissible && (
                        <TouchableOpacity
                          style={styles.sscAlertCloseIcon}
                          onPress={() => setPreviewAlert(null)}
                        >
                          <X size={16} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.sscAlertTitle}>{previewAlert.title}</Text>
                    <Text style={styles.sscAlertMessage}>{previewAlert.message}</Text>

                    {/* Action Button */}
                    <TouchableOpacity
                      style={[
                        styles.sscAlertActionBtn,
                        previewAlert.priority === "critical"
                          ? { backgroundColor: "#DC2626" }
                          : { backgroundColor: "#FC4E03" }
                      ]}
                      onPress={() => setPreviewAlert(null)}
                    >
                      <Text style={styles.sscAlertActionBtnText}>
                        {previewAlert.buttonText || "Acknowledge"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 60
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24
  },
  statCol: {
    flex: 1
  },
  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800"
  },
  statCaption: {
    fontSize: 11,
    marginTop: 2
  },
  tabsNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 20
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 3,
    borderBottomColor: "transparent"
  },
  tabItemActive: {
    borderBottomWidth: 3
  },
  tabItemText: {
    fontSize: 14,
    fontWeight: "700"
  },
  tabContent: {
    marginTop: 4
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap"
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    outlineStyle: "none"
  } as any,
  filterPills: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap"
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFFFFF"
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600"
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12
  },
  emptyBox: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  emptySub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 420
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18
  },
  card: {
    width: "31.8%",
    minWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden"
  },
  cardArtworkWrapper: {
    height: 160,
    backgroundColor: "#F1F5F9",
    position: "relative"
  },
  cardArtwork: {
    width: "100%",
    height: "100%"
  },
  cardStatusBadgeRow: {
    position: "absolute",
    top: 10,
    right: 10
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  cardBody: {
    padding: 16
  },
  cardFestivalTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6
  },
  cardFestivalTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 0.5
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6
  },
  cardMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10
  },
  senderBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: "600"
  },
  senderValue: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 1
  },
  dateMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  dateMetaText: {
    fontSize: 11
  },
  analyticsMiniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4
  },
  analyticsMiniText: {
    fontSize: 11
  },
  cardFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: 8,
    gap: 6
  },
  footerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  footerActionText: {
    fontSize: 11.5,
    fontWeight: "700"
  },
  alertCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  priorityChipText: {
    fontSize: 9.5,
    fontWeight: "800"
  },
  alertTypeTag: {
    fontSize: 10,
    fontWeight: "700"
  },
  alertCardImg: {
    height: 120,
    width: "100%",
    backgroundColor: "#F8FAFC"
  },
  alertMetaGrid: {
    borderRadius: 6,
    padding: 10,
    gap: 4,
    marginBottom: 10
  },
  alertMetaItem: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metaItemLabel: {
    fontSize: 11
  },
  metaItemValue: {
    fontSize: 11,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalBox: {
    width: "100%",
    maxWidth: 780,
    maxHeight: "90%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    padding: 6
  },
  modalScrollBody: {
    maxHeight: 520
  },
  formRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12
  },
  formGroup: {
    marginBottom: 14
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    outlineStyle: "none"
  } as any,
  formTextArea: {
    height: 90,
    paddingVertical: 10,
    textAlignVertical: "top"
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  uploadProgressMsg: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4
  },
  errorField: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1
  },
  previewFrame: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  previewFrameLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6
  },
  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 6
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectableChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFFFFF"
  },
  selectableChipText: {
    fontSize: 11.5,
    fontWeight: "700"
  },
  modalFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600"
  },
  saveDraftBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: "700"
  },
  savePublishBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  savePublishBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  phoneMockupContainer: {
    width: 360,
    height: 640,
    backgroundColor: "#0F172A",
    borderRadius: 36,
    borderWidth: 6,
    borderColor: "#334155",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24
  },
  phoneHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1E293B"
  },
  phoneHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  sscGreetingPopupCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  sscGreetingArtwork: {
    width: "100%",
    height: 170
  },
  sscGreetingBody: {
    padding: 18,
    alignItems: "center"
  },
  sscGreetingTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8
  },
  sscGreetingTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FC4E03"
  },
  sscGreetingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4
  },
  sscGreetingSubtitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 8
  },
  sscGreetingMessage: {
    fontSize: 12,
    color: "#334155",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14
  },
  sscSenderBox: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16
  },
  sscSenderText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B"
  },
  sscGreetingActionBtn: {
    width: "100%",
    backgroundColor: "#FC4E03",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  sscGreetingActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  sscAlertPopupCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  sscAlertImage: {
    width: "100%",
    height: 130
  },
  sscAlertBody: {
    padding: 16
  },
  sscAlertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sscPriorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  sscPriorityBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  sscAlertCloseIcon: {
    padding: 4
  },
  sscAlertTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6
  },
  sscAlertMessage: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 16
  },
  sscAlertActionBtn: {
    width: "100%",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center"
  },
  sscAlertActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  }
});
